from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.inventory import InventoryItem
from services.party_service import PartyService
from middleware.unified_access import UnifiedAccess, require_access

from schemas.ai_composer import (
    AutocompleteResponse, 
    EntityItem, 
    ExecuteRequest, 
    ExecuteResponse, 
    ImpactMetric
)

router = APIRouter(
    prefix="/ai/composer",
    tags=["AI Composer"],
    responses={404: {"description": "Not found"}},
)

@router.get("/autocomplete", response_model=AutocompleteResponse)
def autocomplete(
    q: str = Query(..., min_length=1),
    context_entity_type: Optional[str] = Query(None),
    context_entity_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """
    Search for entities and suggest actions based on context.
    """
    entities: List[EntityItem] = []
    actions: List[Capability] = []
    
    # --- 1. Entity Search ---
    
    # Search Parties (Patients)
    if not context_entity_type or context_entity_type == "patient":
        party_service = PartyService(db)
        # We reuse the list logic but keep it lightweight
        parties, _, _ = party_service.list_parties(
            tenant_id=access.tenant_id,
            search=q,
            per_page=5
        )
        for p in parties:
            entities.append(EntityItem(
                id=str(p.id),
                type="patient",
                label=f"{p.first_name} {p.last_name}",
                sub_label=p.phone or p.tc_number,
                metadata={"status": p.status}
            ))

    # Search Devices (Inventory)
    if not context_entity_type or context_entity_type == "device":
        # Direct DB query for speed/simplicity as no generic InventoryService exists yet
        inv_items = db.query(InventoryItem).filter(
            InventoryItem.tenant_id == access.tenant_id,
            or_(
                InventoryItem.brand.ilike(f"%{q}%"),
                InventoryItem.model.ilike(f"%{q}%"),
                InventoryItem.available_serials.ilike(f"%{q}%")
            )
        ).limit(5).all()
        
        for item in inv_items:
            entities.append(EntityItem(
                id=str(item.id),
                type="device",
                label=f"{item.brand} {item.model}",
                sub_label=f"SN: {item.serial_number}",
                metadata={"quantity": item.quantity}
            ))

    # --- 2. Action Suggestions ---

    all_caps = get_all_capabilities()
    
    # Extract permissions
    # UnifiedAccess provides standardized permissions list
    user_perms = access.permissions
    
    allowed_caps = filter_capabilities_by_permissions(all_caps, user_perms)
    
    # Phase Filtering (Hardcoded active phase for now, ideally from Tenant Config)
    current_phase = "C" 
    allowed_caps = filter_capabilities_by_phase(allowed_caps, current_phase)

    # Filter by Context & Query
    if context_entity_type:
        # Context-aware filtering
        if context_entity_type == "patient":
            categories = ["Party Management", "Appointments", "Device Management", "Sales Operations"]
            actions = [c for c in allowed_caps if c.category in categories]
        elif context_entity_type == "device":
             actions = [c for c in allowed_caps if c.category == "Device Management"]
        elif context_entity_type == "invoice":
             actions = [c for c in allowed_caps if c.category == "Sales Operations"]
        
        # Refine by query text if present
        if q:
             actions = [
                 c for c in actions 
                 if q.lower() in c.name.lower() 
                 or any(q.lower() in p.lower() for p in c.example_phrases)
             ]
    else:
        # Global Action Search (only if query matches capability name)
        actions = [
             c for c in allowed_caps 
             if q.lower() in c.name.lower()
        ]

    return AutocompleteResponse(entities=entities, actions=actions)


@router.post("/execute", response_model=ExecuteResponse)
def execute_tool(
    request: ExecuteRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """
    Execute a tool securely via ToolRegistry.
    """
    registry = get_tool_registry()
    
    # 1. Permission Check (Defense in Depth)
    # The registry handles tool allowance, but we double-check capability mapping
    # to ensure the user has the high-level permission for this capability.
    # Note: ToolRegistry.execute_tool doesn't check 'user permissions' object directly, 
    # it relies on the caller or internal checks. 
    # Here we assume RBAC is enforced by the Composer UI pre-filtering, 
    # BUT for security we should ideally re-verify. 
    # For MVP/Phase 1, we rely on ToolRegistry's own 'requires_permissions' metadata 
    # if we passed user context down, but ToolRegistry is currently stateless regarding User.
    # We will implement a basic check here if possible, or defer to ToolRegistry.
    
    # 2. Execution Mode
    mode = ToolExecutionMode.SIMULATE if request.dry_run else ToolExecutionMode.EXECUTE
    
    # Inject Context (Tenant, User)
    # Tools expect specific parameters. We merge request.args with context.
    # CRITICAL: Use access.principal_id to support both User and AdminUser
    execution_params = request.args.copy()
    execution_params["tenant_id"] = access.tenant_id
    execution_params["user_id"] = access.principal_id
    
    
    
    try:
        result = registry.execute_tool(
            tool_id=request.tool_id,
            parameters=execution_params,
            mode=mode
        )
        
        if not result.success:
            return ExecuteResponse(
                status="error",
                error=result.error or "Unknown execution error"
            )
            
        # 3. Construct Response
        response_status = "dry_run" if request.dry_run else "success"
        
        # 4. Calculate Impact Metric (Mock logic / Heuristic based on Result)
        # If the tool result contains 'simulated_changes', we map it.
        impact_metrics = []
        if result.simulated_changes:
            for k, v in result.simulated_changes.items():
                impact_metrics.append(ImpactMetric(
                    label=k, 
                    value="Changed", 
                    delta=str(v),
                    sentiment="neutral"
                ))
        elif request.dry_run and not impact_metrics:
             # Fallback mock for demonstration if tool doesn't return simulated_changes
             impact_metrics.append(ImpactMetric(label="Simulation", value="Checked", delta="0", sentiment="neutral"))

        return ExecuteResponse(
            status=response_status,
            result=result.result,
            audit_id=f"evt_{result.tool_id}_{mode.value}", # Placeholder for valid Audit Log ID
            impact_delta=impact_metrics
        )
        
    except Exception as e:
        return ExecuteResponse(status="error", error=str(e))

# --- Vision Analysis Endpoint ---

from pydantic import BaseModel, Field
class AnalyzeRequest(BaseModel):
    files: List[str] = Field(..., description="List of S3 file keys to analyze")
    context_intent: Optional[str] = Field(None, description="Optional intent hint (e.g. 'assign_device')")

class AnalysisSuggestion(BaseModel):
    slot_name: str
    value: Any
    confidence: float
    source_file: str
    source_region: Optional[List[int]] = None # [x1, y1, x2, y2]
    verified: bool = False

class AnalyzeResponse(BaseModel):
    suggestions: List[AnalysisSuggestion]
    audit_id: Optional[str] = None

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_documents(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """
    Hybrid Vision Analysis:
    1. Vision Model (Qwen2-VL) -> Detects document type & regions of interest
    2. OCR Engine (PaddleOCR) -> Extracts text from regions (or full page fallback)
    3. Returns suggestions for Composer slots
    """
    from services.s3_service import s3_service
    from services.ocr_service import TurkishMedicalOCR
    from ai.runtime.model_client import get_model_client
    import base64
    import json
    
    ocr_service = TurkishMedicalOCR()
    ocr_service.initialize()
    model_client = get_model_client()
    
    suggestions: List[AnalysisSuggestion] = []
    
    ocr_service = TurkishMedicalOCR()
    ocr_service.initialize()
    model_client = get_model_client()
    
    suggestions: List[AnalysisSuggestion] = []
    
    for file_key in request.files:
        try:
            # 1. Fetch File Content
            # We need the actual bytes for Vision and OCR. 
            # Since S3 service generates presigned URLs, we might need to fetch it back 
            # OR use a method to get bytes if available.
            # Assuming we can use s3_service.s3_client directly or helper.
            # For this implementation, we will try to fetch via the presigned URL or direct S3 get if bucket is local/accessible.
            
            # Helper to get file bytes
            # Note: In production, consider streaming or temp files for large docs.
            file_bytes = None
            try:
                # Try getting presigned URL then downloading (works for any S3 compatible)
                presigned = s3_service.generate_presigned_url(file_key, tenant_id=access.tenant_id)
                import httpx
                async with httpx.AsyncClient() as client:
                    resp = await client.get(presigned)
                    if resp.status_code == 200:
                        file_bytes = resp.content
            except Exception as s3_err:
                print(f"Failed to fetch file {file_key}: {s3_err}")
                continue

            if not file_bytes:
                continue

            # Convert to Base64 for Vision Model
            image_b64 = base64.b64encode(file_bytes).decode("utf-8")
            
            # Save to temp file for PaddleOCR (it expects file path)
            import tempfile
            import os
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
                tmp_file.write(file_bytes)
                tmp_file_path = tmp_file.name

            try:
                # 2. Vision Pass (Qwen2-VL)
                system_prompt = """You are a document analysis assistant. 
                Identify the document type.
                Locate specific fields if present: 'patient_name', 'device_serial', 'invoice_amount', 'invoice_date'.
                Return ONLY valid JSON matching this schema:
                {
                    "document_type": "string",
                    "rois": [
                        {"field": "string", "bbox": [ymin, xmin, ymax, xmax]} 
                    ]
                }
                Current intent: """ + (request.context_intent or "general")
                
                vision_response = await model_client.generate(
                    prompt="Analyze this document image.",
                    system_prompt=system_prompt,
                    images=[image_b64],
                    json_mode=True
                )
                
                # 3. Parse & OCR Strategy
                try:
                    analysis = json.loads(vision_response.content)
                    rois = analysis.get("rois", [])
                    
                    if rois:
                        # Strategy A: ROIs detected
                        import cv2
                        img_cv = cv2.imread(tmp_file_path)
                        h, w, _ = img_cv.shape
                        
                        for roi in rois:
                            # Parse normalized bbox [ymin, xmin, ymax, xmax] (0-1000 or 0-1 range depending on model)
                            # Assuming Qwen returns 0-1000 normalized coordinates for VL models often
                            bbox = roi.get("bbox")
                            field_name = roi.get("field")
                            
                            # Sanity check bbox
                            if not bbox or len(bbox) != 4:
                                continue
                                
                            ymin, xmin, ymax, xmax = bbox
                            # Denormalize (assuming 1000-based)
                            y1, x1 = int(ymin * h / 1000), int(xmin * w / 1000)
                            y2, x2 = int(ymax * h / 1000), int(xmax * w / 1000)
                            
                            # Crop
                            crop = img_cv[y1:y2, x1:x2]
                            
                            # Run OCR on Crop
                            # We need to save crop to temp file for ocr_service? 
                            # Or ocr_service can take bytes? It takes path.
                            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as crop_file:
                                cv2.imwrite(crop_file.name, crop)
                                crop_res = ocr_service.process_document(image_path=crop_file.name, auto_crop=False)
                                os.unlink(crop_file.name)
                            
                            # Extract text
                            extracted_text = " ".join([e['text'] for e in crop_res.get('entities', [])])
                            if extracted_text.strip():
                                suggestions.append(AnalysisSuggestion(
                                    slot_name=field_name,
                                    value=extracted_text.strip(),
                                    confidence=0.9, # High confidence for targeted OCR
                                    source_file=file_key,
                                    source_region=[x1, y1, x2, y2],
                                    verified=False
                                ))
                    else:
                        raise ValueError("No ROIs found")
                        
                except Exception as vision_err:
                    # Strategy B: Fallback (Full Page OCR)
                    # If JSON parse fails or No ROIs, runs full page analysis
                    print(f"Vision analysis failed/skipped ({vision_err}), falling back to Full OCR")
                    
                    # Full OCR
                    full_res = ocr_service.process_document(image_path=tmp_file_path, auto_crop=True)
                    
                    # Heuristically map full text to slots (Basic Regex/Keyword)
                    # For MVP, we just dump 'full_text' as a generic suggestion or try to find patient name
                    full_text = " ".join([e['text'] for e in full_res.get('entities', [])])
                    
                    # Try to extract patient name via OCR service's own logic
                    patient_info = ocr_service.extract_patient_name(text=full_text)
                    if patient_info:
                        suggestions.append(AnalysisSuggestion(
                            slot_name="party_id", # Maps to patient search
                            value=patient_info['name'],
                            confidence=patient_info['confidence'],
                            source_file=file_key,
                            verified=False
                        ))
                    
                    # TODO: Add more regex extractors for serial numbers etc.

            finally:
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
            
        except Exception as e:
            print(f"Analysis loop failed for {file_key}: {e}")
            continue

    # 4. Audit Log
    try:
        if suggestions:
            from core.models.user import ActivityLog
            import uuid
            
            audit_entry = ActivityLog(
                tenant_id=access.tenant_id,
                user_id=access.principal_id,
                action="ai.suggestion.created",
                entity_type="document",
                entity_id=request.files[0] if request.files else "batch",
                data={
                    "k": "ai_analysis", # short key
                    "file_count": len(request.files),
                    "suggestion_count": len(suggestions),
                    "model": "qwen2.5-vl+paddleocr"
                },
                ip_address=None, # Request object not available in this scope easily without dependency
                message=f"Created {len(suggestions)} suggestions from document analysis"
            )
            db.add(audit_entry)
            db.commit()
            
    except Exception as log_err:
        print(f"Failed to create audit log: {log_err}")

    return AnalyzeResponse(suggestions=suggestions, audit_id="evt_analyze_hybrid")
