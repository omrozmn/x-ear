from typing import List, Optional, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from core.database import get_db
from models.inventory import InventoryItem
from services.party_service import PartyService
from middleware.unified_access import UnifiedAccess, require_access
from ai.capability_registry import (
    get_all_capabilities,
    filter_capabilities_by_permissions,
    filter_capabilities_by_phase,
    Capability
)
from ai.tools import get_tool_registry, ToolExecutionMode
from ai.services.sector_context import get_sector_context, is_capability_available_for_sector

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
    q: str = Query("", min_length=0),
    context_entity_type: Optional[str] = Query(None),
    context_entity_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """
    Search for entities and suggest actions based on context.
    Supports: patients, devices, invoices. Sector-aware terminology.
    """
    if not q or len(q) == 0:
        return AutocompleteResponse(entities=[], actions=[], intent_type="search")

    entities: List[EntityItem] = []
    actions: List[Capability] = []

    # Get sector context for terminology
    sector_ctx = get_sector_context(db, access.tenant_id or "")
    sector = sector_ctx.get("sector", "hearing")
    party_label = sector_ctx.get("party_term", "hasta").capitalize()
    device_label = sector_ctx.get("device_term", "cihaz").capitalize()

    # --- 1. Entity Search (Patients, Devices, Invoices) ---

    # Search Parties
    party_service = PartyService(db)
    search_tenant = access.tenant_id
    if not search_tenant and access.is_super_admin:
        search_tenant = 'system'

    if search_tenant:
        party_search_done = False

        # Try AI Entity Resolver first (FTS + trigram)
        try:
            from ai.services.entity_resolver import get_entity_resolver
            resolver = get_entity_resolver(db)
            resolution = resolver.resolve_party(q, search_tenant, limit=5)
            for candidate in resolution.candidates:
                entities.append(EntityItem(
                    id=candidate.entity_id,
                    type="patient",
                    label=candidate.display_name,
                    sub_label=candidate.metadata.get("phone") or candidate.metadata.get("tc"),
                    metadata={"score": candidate.score, "entity_label": party_label}
                ))
            party_search_done = True
        except Exception as resolver_err:
            import traceback
            print(f"[Spotlight] Entity resolver failed: {resolver_err}")
            traceback.print_exc()

        # Fallback to direct ILIKE search if resolver failed or returned nothing
        if not party_search_done or not any(e.type == "patient" for e in entities):
            try:
                parties, _, _ = party_service.list_parties(
                    tenant_id=search_tenant, search=q, per_page=5
                )
                for p in parties:
                    # Skip if already added by resolver
                    if any(e.id == str(p.id) for e in entities):
                        continue
                    tags = []
                    if p.tags_json:
                        import json
                        try:
                            loaded = json.loads(p.tags_json) if isinstance(p.tags_json, str) else p.tags_json
                            if isinstance(loaded, list):
                                tags = loaded
                        except Exception:
                            pass
                    entities.append(EntityItem(
                        id=str(p.id), type="patient",
                        label=f"{p.first_name} {p.last_name}",
                        sub_label=p.phone or p.tc_number,
                        metadata={"status": p.status, "tags": tags, "entity_label": party_label}
                    ))
            except Exception as fallback_err:
                import traceback
                print(f"[Spotlight] Party ILIKE fallback also failed: {fallback_err}")
                traceback.print_exc()

    # Search Devices (Inventory)
    if access.tenant_id:
        inv_items = db.query(InventoryItem).filter(
            InventoryItem.tenant_id == access.tenant_id,
            or_(
                InventoryItem.brand.ilike(f"%{q}%"),
                InventoryItem.model.ilike(f"%{q}%"),
                InventoryItem.available_serials.ilike(f"%{q}%"),
                InventoryItem.name.ilike(f"%{q}%"),
                InventoryItem.barcode.ilike(f"%{q}%"),
            )
        ).limit(5).all()

        for item in inv_items:
            entities.append(EntityItem(
                id=str(item.id), type="device",
                label=f"{item.brand} {item.model}",
                sub_label=f"Stok: {item.available_inventory or 0} | {item.stock_code or item.barcode or ''}",
                metadata={"quantity": item.available_inventory, "entity_label": device_label}
            ))

    # Search Suppliers
    if access.tenant_id:
        try:
            from core.models.suppliers import Supplier
            suppliers = db.query(Supplier).filter(
                Supplier.tenant_id == access.tenant_id,
                or_(
                    Supplier.company_name.ilike(f"%{q}%"),
                    Supplier.contact_person.ilike(f"%{q}%"),
                    Supplier.company_code.ilike(f"%{q}%"),
                    Supplier.tax_number.ilike(f"%{q}%"),
                )
            ).limit(5).all()
            for sup in suppliers:
                entities.append(EntityItem(
                    id=str(sup.id), type="supplier",
                    label=sup.company_name,
                    sub_label=sup.contact_person or sup.phone or "",
                    metadata={"entity_label": "Tedarikçi"}
                ))
        except Exception as sup_err:
            print(f"[Spotlight] Supplier search failed: {sup_err}")

    # Search Invoices
    if access.tenant_id:
        try:
            from core.models.invoice import Invoice
            invoices = db.query(Invoice).filter(
                Invoice.tenant_id == access.tenant_id,
                or_(
                    Invoice.invoice_number.ilike(f"%{q}%"),
                    Invoice.patient_name.ilike(f"%{q}%"),
                    Invoice.device_name.ilike(f"%{q}%"),
                )
            ).limit(5).all()
            for inv in invoices:
                entities.append(EntityItem(
                    id=str(inv.id), type="invoice",
                    label=f"Fatura {inv.invoice_number}",
                    sub_label=inv.patient_name or "",
                    metadata={"status": inv.status, "entity_label": "Fatura"}
                ))
        except Exception as inv_err:
            print(f"[Spotlight] Invoice search failed: {inv_err}")

    # Search Appointments
    if access.tenant_id:
        try:
            from core.models.appointment import Appointment
            from core.models.party import Party
            appts = (
                db.query(Appointment, Party)
                .outerjoin(Party, Appointment.party_id == Party.id)
                .filter(
                    Appointment.tenant_id == access.tenant_id,
                    or_(
                        Party.first_name.ilike(f"%{q}%"),
                        Party.last_name.ilike(f"%{q}%"),
                        Appointment.notes.ilike(f"%{q}%"),
                        Appointment.appointment_type.ilike(f"%{q}%"),
                    )
                )
                .order_by(Appointment.date.desc())
                .limit(5)
                .all()
            )
            for appt, party in appts:
                party_name = f"{party.first_name} {party.last_name}" if party else "—"
                date_str = appt.date.strftime("%d.%m.%Y") if appt.date else ""
                time_str = str(appt.time)[:5] if appt.time else ""
                entities.append(EntityItem(
                    id=str(appt.id), type="appointment",
                    label=f"{date_str} {time_str} — {party_name}",
                    sub_label=f"{appt.appointment_type or ''} • {appt.status or ''}",
                    metadata={"entity_label": "Randevu"}
                ))
        except Exception as appt_err:
            print(f"[Spotlight] Appointment search failed: {appt_err}")

    # Search Sales
    if access.tenant_id:
        try:
            from core.models.sales import Sale
            sales = db.query(Sale).filter(
                Sale.tenant_id == access.tenant_id,
                or_(
                    Sale.id.ilike(f"%{q}%"),
                    Sale.notes.ilike(f"%{q}%"),
                )
            ).order_by(Sale.sale_date.desc()).limit(5).all()
            for s in sales:
                entities.append(EntityItem(
                    id=str(s.id), type="sale",
                    label=f"Satış {s.id}",
                    sub_label=f"{s.sale_date or ''} • {s.status or ''} • {s.payment_method or ''}",
                    metadata={"entity_label": "Satış"}
                ))
        except Exception as sale_err:
            print(f"[Spotlight] Sale search failed: {sale_err}")

    # Search Orders
    if access.tenant_id:
        try:
            from core.models.order import Order
            orders = db.query(Order).filter(
                Order.tenant_id == access.tenant_id,
                or_(
                    Order.order_number.ilike(f"%{q}%"),
                )
            ).order_by(Order.created_at.desc()).limit(5).all()
            for o in orders:
                entities.append(EntityItem(
                    id=str(o.id), type="order",
                    label=f"Sipariş {o.order_number}",
                    sub_label=f"{o.status or ''}",
                    metadata={"entity_label": "Sipariş"}
                ))
        except Exception as order_err:
            print(f"[Spotlight] Order search failed: {order_err}")

    # Search Promissory Notes (Senetler)
    if access.tenant_id:
        try:
            from core.models.promissory_note import PromissoryNote
            notes = db.query(PromissoryNote).filter(
                PromissoryNote.tenant_id == access.tenant_id,
                or_(
                    PromissoryNote.note_number.ilike(f"%{q}%"),
                    PromissoryNote.debtor_name.ilike(f"%{q}%"),
                    PromissoryNote.debtor_tc.ilike(f"%{q}%"),
                )
            ).limit(5).all()
            for pn in notes:
                entities.append(EntityItem(
                    id=str(pn.id), type="promissory_note",
                    label=f"Senet {pn.note_number}",
                    sub_label=f"{pn.debtor_name or ''} • {pn.amount or ''} ₺",
                    metadata={"status": pn.status, "entity_label": "Senet"}
                ))
        except Exception as pn_err:
            print(f"[Spotlight] Promissory note search failed: {pn_err}")

    # Search Support Tickets
    if access.tenant_id:
        try:
            from core.models.ticket import Ticket
            tickets = db.query(Ticket).filter(
                Ticket.tenant_id == access.tenant_id,
                or_(
                    Ticket.title.ilike(f"%{q}%"),
                    Ticket.description.ilike(f"%{q}%"),
                )
            ).limit(5).all()
            for t in tickets:
                entities.append(EntityItem(
                    id=str(t.id), type="ticket",
                    label=t.title,
                    sub_label=f"{t.priority or ''} • {t.status or ''}",
                    metadata={"entity_label": "Destek"}
                ))
        except Exception as ticket_err:
            print(f"[Spotlight] Ticket search failed: {ticket_err}")

    # Search Purchase Invoices (Alış Faturaları)
    if access.tenant_id:
        try:
            from core.models.purchase_invoice import PurchaseInvoice
            p_invoices = db.query(PurchaseInvoice).filter(
                PurchaseInvoice.tenant_id == access.tenant_id,
                or_(
                    PurchaseInvoice.invoice_number.ilike(f"%{q}%"),
                    PurchaseInvoice.sender_name.ilike(f"%{q}%"),
                )
            ).limit(5).all()
            for pi in p_invoices:
                entities.append(EntityItem(
                    id=str(pi.id), type="purchase_invoice",
                    label=f"Alış Faturası {pi.invoice_number}",
                    sub_label=pi.sender_name or "",
                    metadata={"entity_label": "Alış Faturası"}
                ))
        except Exception as pi_err:
            print(f"[Spotlight] Purchase invoice search failed: {pi_err}")

    # Search Campaigns
    if access.tenant_id:
        try:
            from core.models.campaign import Campaign
            campaigns = db.query(Campaign).filter(
                Campaign.tenant_id == access.tenant_id,
                or_(
                    Campaign.name.ilike(f"%{q}%"),
                    Campaign.description.ilike(f"%{q}%"),
                )
            ).limit(3).all()
            for c in campaigns:
                entities.append(EntityItem(
                    id=str(c.id), type="campaign",
                    label=c.name,
                    sub_label=f"{c.campaign_type or ''} • {c.status or ''}",
                    metadata={"entity_label": "Kampanya"}
                ))
        except Exception as camp_err:
            print(f"[Spotlight] Campaign search failed: {camp_err}")

    # --- 2. Action Suggestions (sector + phase aware) ---

    all_caps = get_all_capabilities()
    user_perms = access.permissions
    allowed_caps = filter_capabilities_by_permissions(all_caps, user_perms)

    # Phase from tenant config (not hardcoded)
    try:
        from ai.config import get_ai_config
        current_phase = get_ai_config().phase.value
    except Exception:
        current_phase = "A"
    allowed_caps = filter_capabilities_by_phase(allowed_caps, current_phase)

    # Sector filtering — hide irrelevant capabilities
    allowed_caps = [
        c for c in allowed_caps
        if is_capability_available_for_sector(c.name, sector)
    ]

    # Filter by Context & Query
    if context_entity_type:
        if context_entity_type == "patient":
            categories = ["Party Management", "Appointments", "Device Management", "Sales Operations"]
            actions = [c for c in allowed_caps if c.category in categories]
        elif context_entity_type == "device":
             actions = [c for c in allowed_caps if c.category == "Device Management"]
        elif context_entity_type == "invoice":
             actions = [c for c in allowed_caps if c.category == "Sales Operations"]

        if q:
             actions = [
                 c for c in actions
                 if q.lower() in c.name.lower()
                 or any(q.lower() in p.lower() for p in c.example_phrases)
             ]
    else:
        # Global search — match capability name or example phrases
        actions = [
             c for c in allowed_caps
             if q.lower() in c.name.lower()
             or any(q.lower() in p.lower() for p in c.example_phrases)
        ]

    intent_type = "action" if actions else "search"
    return AutocompleteResponse(entities=entities, actions=actions, intent_type=intent_type)


@router.post("/execute", response_model=ExecuteResponse)
def execute_tool(
    request: ExecuteRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """Execute a tool securely via ToolRegistry."""
    registry = get_tool_registry()
    mode = ToolExecutionMode.SIMULATE if request.dry_run else ToolExecutionMode.EXECUTE

    # Inject tenant/user context
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
            return ExecuteResponse(status="error", error=result.error or "Unknown execution error")

        response_status = "dry_run" if request.dry_run else "success"

        # Impact metrics from simulated changes
        impact_metrics = []
        if result.simulated_changes:
            for k, v in result.simulated_changes.items():
                impact_metrics.append(ImpactMetric(
                    label=k, value="Changed", delta=str(v), sentiment="neutral"
                ))
        elif request.dry_run and not impact_metrics:
             impact_metrics.append(ImpactMetric(label="Simulation", value="Checked", delta="0", sentiment="neutral"))

        # Create real audit log entry
        audit_id = f"evt_{result.tool_id}_{mode.value}"
        try:
            from core.models.user import ActivityLog
            audit_entry = ActivityLog(
                tenant_id=access.tenant_id,
                user_id=access.principal_id,
                action=f"ai.composer.{request.tool_id}",
                entity_type="tool_execution",
                entity_id=request.tool_id,
                data={"mode": mode.value, "success": result.success, "params_keys": list(request.args.keys())},
                message=f"Composer executed {request.tool_id} in {mode.value} mode"
            )
            db.add(audit_entry)
            db.commit()
            audit_id = str(audit_entry.id) if hasattr(audit_entry, 'id') else audit_id
        except Exception:
            pass

        return ExecuteResponse(
            status=response_status, result=result.result,
            audit_id=audit_id, impact_delta=impact_metrics
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
    source_region: Optional[List[int]] = None
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

    for file_key in request.files:
        try:
            file_bytes = None
            try:
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

            image_b64 = base64.b64encode(file_bytes).decode("utf-8")

            import tempfile
            import os
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
                tmp_file.write(file_bytes)
                tmp_file_path = tmp_file.name

            try:
                system_prompt = """You are a document analysis assistant.
                Identify the document type.
                Locate specific fields if present: 'party_name', 'device_serial', 'invoice_amount', 'invoice_date'.
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

                try:
                    analysis = json.loads(vision_response.content)
                    rois = analysis.get("rois", [])

                    if rois:
                        import cv2
                        img_cv = cv2.imread(tmp_file_path)
                        h, w, _ = img_cv.shape

                        for roi in rois:
                            bbox = roi.get("bbox")
                            field_name = roi.get("field")

                            if not bbox or len(bbox) != 4:
                                continue

                            ymin, xmin, ymax, xmax = bbox
                            y1, x1 = int(ymin * h / 1000), int(xmin * w / 1000)
                            y2, x2 = int(ymax * h / 1000), int(xmax * w / 1000)

                            crop = img_cv[y1:y2, x1:x2]

                            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as crop_file:
                                cv2.imwrite(crop_file.name, crop)
                                crop_res = ocr_service.process_document(image_path=crop_file.name, auto_crop=False)
                                os.unlink(crop_file.name)

                            extracted_text = " ".join([e['text'] for e in crop_res.get('entities', [])])
                            if extracted_text.strip():
                                suggestions.append(AnalysisSuggestion(
                                    slot_name=field_name,
                                    value=extracted_text.strip(),
                                    confidence=0.9,
                                    source_file=file_key,
                                    source_region=[x1, y1, x2, y2],
                                    verified=False
                                ))
                    else:
                        raise ValueError("No ROIs found")

                except Exception as vision_err:
                    print(f"Vision analysis failed/skipped ({vision_err}), falling back to Full OCR")

                    full_res = ocr_service.process_document(image_path=tmp_file_path, auto_crop=True)
                    full_text = " ".join([e['text'] for e in full_res.get('entities', [])])

                    patient_info = ocr_service.extract_patient_name(text=full_text)
                    if patient_info:
                        suggestions.append(AnalysisSuggestion(
                            slot_name="party_id",
                            value=patient_info['name'],
                            confidence=patient_info['confidence'],
                            source_file=file_key,
                            verified=False
                        ))

            finally:
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)

        except Exception as e:
            print(f"Analysis loop failed for {file_key}: {e}")
            continue

    # Audit Log
    try:
        if suggestions:
            from core.models.user import ActivityLog

            audit_entry = ActivityLog(
                tenant_id=access.tenant_id,
                user_id=access.principal_id,
                action="ai.suggestion.created",
                entity_type="document",
                entity_id=request.files[0] if request.files else "batch",
                data={
                    "k": "ai_analysis",
                    "file_count": len(request.files),
                    "suggestion_count": len(suggestions),
                    "model": "qwen2.5-vl+paddleocr"
                },
                message=f"Created {len(suggestions)} suggestions from document analysis"
            )
            db.add(audit_entry)
            db.commit()

    except Exception as log_err:
        print(f"Failed to create audit log: {log_err}")

    return AnalyzeResponse(suggestions=suggestions, audit_id="evt_analyze_hybrid")
