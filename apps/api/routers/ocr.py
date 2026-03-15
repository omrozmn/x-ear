"""
FastAPI OCR Router - Migrated from Flask routes/ocr.py
Handles OCR processing, NLP entity extraction, and document analysis
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from typing import Optional, List
from datetime import datetime, timezone
import logging
import os
import uuid
import tempfile

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access
from schemas.ocr import (
    OcrJobRead, OcrProcessRequest, SimilarityRequest, EntityExtractionRequest,
    PatientExtractionRequest, DebugNERRequest, CreateJobRequest,
    OcrHealthResponse, OcrInitResponse, OcrProcessResponse, OcrSimilarityResponse,
    OcrEntitiesResponse, OcrPatientResponse, OcrDebugResponse,
    AudiogramThresholdResponse, AudiogramDetectionDetails,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# --- Schemas ---



# --- Helper Functions ---

def get_nlp_service():
    """Get NLP service instance"""
    try:
        from services.ocr_service import get_nlp_service as _get_nlp_service
        return _get_nlp_service()
    except Exception as e:
        logger.error(f"Failed to get NLP service: {e}")
        return None

def download_image_from_url(url: str) -> Optional[str]:
    """Download image from URL to temp file"""
    try:
        import requests
        
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        path_part = url.split('?')[0]
        suffix = os.path.splitext(path_part)[1] or '.jpg'
        
        fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        
        with open(temp_file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return temp_file_path
    except Exception as e:
        logger.error(f"Failed to download image from URL: {e}")
        return None

# --- Routes ---

@router.post("/upload", operation_id="uploadOcrDocument", response_model=ResponseEnvelope[OcrProcessResponse])
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "medical",
    auto_crop: bool = True,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Upload and process a document (PDF/Image) for OCR"""
    temp_file_path = None
    try:
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="OCR service not available")
            
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OCR service init failed: {e}")
                
        # Save uploaded file to temp file
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
        fd, temp_file_path = tempfile.mkstemp(suffix=file_ext)
        os.close(fd)
        
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Check if file is tabular data
        if file_ext.lower() in [".csv", ".xls", ".xlsx"]:
            import pandas as pd
            import json
            try:
                if file_ext.lower() == ".csv":
                    df = pd.read_csv(temp_file_path)
                else:
                    df = pd.read_excel(temp_file_path)
                
                # Convert up to 5 rows to JSON string
                records = df.head(5).to_dict(orient="records")
                extracted_text = f"Tabular Data from {file.filename} (showing up to 5 rows). To process the entire file of {len(df)} rows, use the execute_smart_bulk_import tool and provide this file path: {temp_file_path}\n"
                extracted_text += json.dumps(records, ensure_ascii=False, indent=2)
                
                result = {
                    "text": extracted_text,
                    "entities": [],
                    "classification": {"type": "tabular_data", "confidence": 1.0},
                    "patient_info": None
                }
                
                return ResponseEnvelope(data=OcrProcessResponse(
                    result=result,
                    timestamp=datetime.now(timezone.utc).isoformat()
                ))
            except Exception as e:
                logger.error(f"Failed to parse tabular data: {e}")
                raise HTTPException(status_code=400, detail=f"Tabular veri ayrıştırma hatası: {str(e)}")

        # Process as image/PDF with OCR
        result = svc.process_document(
            image_path=temp_file_path,
            doc_type=doc_type,
            auto_crop=auto_crop
        )
        
        # Extract patient info if possible
        try:
            patient_info = svc.extract_patient_name(image_path=temp_file_path)
            result['patient_info'] = patient_info
        except Exception:
            result['patient_info'] = None
            
        return ResponseEnvelope(data=OcrProcessResponse(
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

@router.get("/health", operation_id="listOcrHealth", response_model=ResponseEnvelope[OcrHealthResponse])
def health_check():
    """Health check endpoint (Public)"""
    try:
        svc = get_nlp_service()
        ocr_available = svc.paddleocr_available if svc and hasattr(svc, 'paddleocr_available') else False
        spacy_available = bool(getattr(svc, 'nlp', None)) if svc else False
        hf_ner_available = bool(getattr(svc, 'hf_ner', None)) if svc else False
        
        return ResponseEnvelope(data=OcrHealthResponse(
            status="healthy",
            ocr_available=ocr_available,
            spacy_available=spacy_available,
            hf_ner_available=hf_ner_available,
            database_connected=True,
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/init-db", operation_id="createOcrInitDb", response_model=ResponseEnvelope[OcrInitResponse])
def init_database(
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Initialize database and create tables (System Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admin can initialize database")
        
        from core.database import engine
        # Only create OCR-related tables, not AI tables
        from core.models.ocr_job import OCRJob
        
        # Create only OCR tables
        OCRJob.__table__.create(bind=engine, checkfirst=True)
        
        return ResponseEnvelope(data=OcrInitResponse(
            message="OCR database tables initialized successfully",
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize", operation_id="createOcrInitialize", response_model=ResponseEnvelope[OcrInitResponse])
def initialize_nlp_endpoint(
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Initialize NLP/OCR service (System Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admin can initialize NLP service")
        
        def init_background():
            try:
                from services.ocr_service import initialize_nlp_service
                svc = initialize_nlp_service()
                logger.info("NLP service initialized in background")
            except Exception as e:
                logger.exception(f'Background NLP initialization failed: {e}')
        
        background_tasks.add_task(init_background)
        
        return ResponseEnvelope(data=OcrInitResponse(
            message="NLP service initialization started (background)",
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Initialize NLP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", operation_id="createOcrProcess", response_model=ResponseEnvelope[OcrProcessResponse])
def process_document(
    request_data: OcrProcessRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Process document with OCR"""
    try:
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OCR service not available: {e}")
        
        image_path = request_data.image_path
        text = request_data.text or request_data.ocr_text
        doc_type = request_data.type
        auto_crop = request_data.auto_crop
        
        if not image_path and not text:
            raise HTTPException(status_code=400, detail="No image path or text provided")
        
        temp_file_path = None
        try:
            # Handle URL
            image_path_to_process = image_path
            if image_path and (image_path.startswith('http://') or image_path.startswith('https://')):
                temp_file_path = download_image_from_url(image_path)
                if not temp_file_path:
                    raise HTTPException(status_code=400, detail="Failed to download image")
                image_path_to_process = temp_file_path
            
            result = svc.process_document(
                image_path=image_path_to_process or None,
                doc_type=doc_type,
                text=text,
                auto_crop=auto_crop
            )
            
            # Extract patient info
            try:
                patient_info = svc.extract_patient_name(
                    image_path=image_path_to_process or None,
                    text=text
                )
                result['patient_info'] = patient_info
            except Exception:
                result['patient_info'] = None
            
            return ResponseEnvelope(data=OcrProcessResponse(
                result=result,
                timestamp=datetime.now(timezone.utc).isoformat()
            ))
            
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass
                    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/similarity", operation_id="createOcrSimilarity", response_model=ResponseEnvelope[OcrSimilarityResponse])
def calculate_similarity(
    request_data: SimilarityRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Calculate similarity between documents"""
    try:
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OCR service not available: {e}")
        
        text1 = request_data.text1 or request_data.textA
        text2 = request_data.text2 or request_data.textB
        
        if not ((request_data.image_path1 and request_data.image_path2) or (text1 and text2)):
            raise HTTPException(
                status_code=400,
                detail="Provide either both image paths or both text1 and text2"
            )
        
        result = svc.calculate_similarity(
            image_path1=request_data.image_path1,
            image_path2=request_data.image_path2,
            text1=text1,
            text2=text2
        )
        
        return ResponseEnvelope(data=OcrSimilarityResponse(
            result=result,
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similarity calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entities", operation_id="createOcrEntities", response_model=ResponseEnvelope[OcrEntitiesResponse])
def extract_entities(
    request_data: EntityExtractionRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Extract entities from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OCR service not available: {e}")
        
        image_path = request_data.image_path
        text = request_data.text or request_data.ocr_text
        auto_crop = request_data.auto_crop
        
        if not image_path and not text:
            raise HTTPException(status_code=400, detail="No image path or text provided")
        
        result = svc.process_document(
            image_path=image_path or None,
            text=text,
            auto_crop=auto_crop
        )
        
        return ResponseEnvelope(data=OcrEntitiesResponse(
            entities=result.get("entities", []),
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract_patient", operation_id="createOcrExtractPatient", response_model=ResponseEnvelope[OcrPatientResponse])
def extract_patient_name(
    request_data: PatientExtractionRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Extract patient name from image using OCR"""
    try:
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OCR service not available: {e}")
        
        image_path = request_data.image_path
        text = request_data.text
        auto_crop = request_data.auto_crop
        
        if not image_path and not text:
            raise HTTPException(status_code=400, detail="No image path or text provided")
        
        patient_info = None
        if text:
            res = svc.process_document(text=text, auto_crop=auto_crop)
            custom = res.get('custom_entities') or []
            patient_matches = [e for e in custom if e.get('label') == 'PATIENT_NAME']
            if patient_matches:
                patient_info = {
                    "name": patient_matches[0]['text'],
                    "confidence": patient_matches[0].get('confidence', 0.9)
                }
            elif hasattr(svc, 'extract_patient_name'):
                patient_info = svc.extract_patient_name(image_path)
        else:
            if hasattr(svc, 'extract_patient_name'):
                patient_info = svc.extract_patient_name(image_path)
        
        return ResponseEnvelope(data=OcrPatientResponse(
            patient_info=patient_info,
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Patient extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/debug_ner", operation_id="createOcrDebugNer", response_model=ResponseEnvelope[OcrDebugResponse])
def debug_ner(
    request_data: DebugNERRequest,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False))
):
    """Debug endpoint for NER (System Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admin can access debug endpoints")
        
        svc = get_nlp_service()
        if not svc:
            raise HTTPException(status_code=503, detail="NLP service not available")
        
        if not svc.initialized:
            try:
                svc.initialize()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"NLP init failed: {e}")
        
        text = request_data.text
        response = {"hf_ner": None, "spacy_entities": None, "tokens": None}
        
        # HF NER
        try:
            if getattr(svc, 'hf_ner', None):
                hf_out = svc.hf_ner(text)
                if hf_out:
                    for item in hf_out:
                        if 'score' in item:
                            item['score'] = float(item['score'])
                response['hf_ner'] = hf_out
        except Exception as e:
            response['hf_ner_error'] = str(e)
        
        # spaCy
        try:
            if getattr(svc, 'nlp', None):
                doc = svc.nlp(text)
                sp_entities = []
                for ent in getattr(doc, 'ents', []):
                    sp_entities.append({
                        "text": ent.text,
                        "label": ent.label_,
                        "start": ent.start_char,
                        "end": ent.end_char
                    })
                response['spacy_entities'] = sp_entities
                tokens = []
                for t in list(doc)[:500]:
                    tokens.append({
                        "text": t.text,
                        "pos": t.pos_,
                        "tag": t.tag_,
                        "lemma": t.lemma_
                    })
                response['tokens'] = tokens
        except Exception as e:
            response['spacy_error'] = str(e)
        
        return ResponseEnvelope(data=OcrDebugResponse(
            result=response,
            timestamp=datetime.now(timezone.utc).isoformat()
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"debug_ner error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- OCR Job Management ---

@router.get("/jobs", operation_id="listOcrJobs", response_model=ResponseEnvelope[List[OcrJobRead]])
def list_jobs(
    status: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """List OCR jobs"""
    try:
        from models.ocr_job import OCRJob, OCRJobStatus
        
        query = db.query(OCRJob)
        if not access.is_super_admin:
            if not access.tenant_id:
                raise HTTPException(status_code=400, detail="Tenant context required")
            query = query.filter_by(tenant_id=access.tenant_id)

        if status:
            try:
                query = query.filter_by(status=OCRJobStatus(status))
            except ValueError:
                pass
        
        jobs = query.order_by(OCRJob.created_at.desc()).limit(100).all()
        
        return ResponseEnvelope(data=[
            OcrJobRead.model_validate(job)
            for job in jobs
        ])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs", operation_id="createOcrJobs", status_code=201, response_model=ResponseEnvelope[OcrJobRead])
def create_job(
    request_data: CreateJobRequest,
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Create a new OCR job"""
    try:
        from models.ocr_job import OCRJob, OCRJobStatus
        
        access.tenant_id = access.tenant_id
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        job = OCRJob(
            id=str(uuid.uuid4()),
            tenant_id=access.tenant_id,
            file_path=request_data.file_path,
            document_type=request_data.type,
            status=OCRJobStatus.PENDING
        )
        db.add(job)
        db.commit()
        
        # Process job in background
        def process_job(job_id: str):
            from database import SessionLocal
            session = SessionLocal()
            try:
                job = session.get(OCRJob, job_id)
                if not job:
                    return
                
                job.status = OCRJobStatus.PROCESSING
                session.commit()
                
                svc = get_nlp_service()
                if not svc or not svc.initialized:
                    if svc:
                        svc.initialize()
                
                result = svc.process_document(
                    image_path=job.file_path,
                    doc_type=job.document_type
                )
                
                job.result = result
                job.status = OCRJobStatus.COMPLETED
                
                if 'patient_info' in result and result['patient_info']:
                    job.party_name = result['patient_info'].get('name')
                    
            except Exception as e:
                logger.error(f"Job processing failed: {e}")
                job.status = OCRJobStatus.FAILED
                job.error_message = str(e)
            finally:
                session.commit()
                session.close()
        
        background_tasks.add_task(process_job, job.id)
        
        return ResponseEnvelope(data=OcrJobRead.model_validate(job))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}", operation_id="getOcrJob", response_model=ResponseEnvelope[OcrJobRead])
def get_job(
    job_id: str,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Get OCR job status"""
    try:
        from models.ocr_job import OCRJob
        
        job = db.get(OCRJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Tenant check
        if access.tenant_id and job.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return ResponseEnvelope(data=OcrJobRead.model_validate(job))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audiogram", operation_id="extractAudiogramThresholds", response_model=ResponseEnvelope[AudiogramThresholdResponse])
async def extract_audiogram(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access("parties.view")),
):
    """
    Extract hearing thresholds from an audiogram image.
    Detects red (right ear) and blue (left ear) markers at standard frequencies
    (125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000 Hz).
    """
    from services.audiogram_ocr_service import extract_audiogram_thresholds
    
    temp_path = None
    try:
        # Save uploaded file to temp
        suffix = os.path.splitext(file.filename or '.jpg')[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_path = tmp.name
        
        # Extract thresholds
        result = extract_audiogram_thresholds(temp_path)
        
        response_data = AudiogramThresholdResponse(
            right_ear={str(k): v for k, v in result['right_ear'].items()},
            left_ear={str(k): v for k, v in result['left_ear'].items()},
            confidence=result['confidence'],
            detection_details=AudiogramDetectionDetails(**result['detection_details']),
        )
        
        return ResponseEnvelope(data=response_data)
    except Exception as e:
        logger.error(f"Audiogram extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Audiogram extraction failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
