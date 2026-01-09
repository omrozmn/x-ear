"""
FastAPI OCR Router - Migrated from Flask routes/ocr.py
Handles OCR processing, NLP entity extraction, and document analysis
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import os
import uuid
import tempfile

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope, ApiError
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# --- Schemas ---

class OCRProcessRequest(BaseModel):
    image_path: Optional[str] = None
    text: Optional[str] = None
    ocr_text: Optional[str] = None
    type: str = "medical"
    auto_crop: bool = True

class SimilarityRequest(BaseModel):
    image_path1: Optional[str] = None
    image_path2: Optional[str] = None
    text1: Optional[str] = None
    text2: Optional[str] = None
    textA: Optional[str] = None
    textB: Optional[str] = None

class EntityExtractionRequest(BaseModel):
    image_path: Optional[str] = None
    text: Optional[str] = None
    ocr_text: Optional[str] = None
    auto_crop: bool = False

class PatientExtractionRequest(BaseModel):
    image_path: Optional[str] = None
    text: Optional[str] = None
    auto_crop: bool = False

class DebugNERRequest(BaseModel):
    text: str

class CreateJobRequest(BaseModel):
    file_path: str
    type: str = "medical"

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

@router.get("/health", operation_id="listOcrHealth")
def health_check():
    """Health check endpoint (Public)"""
    try:
        svc = get_nlp_service()
        ocr_available = svc.paddleocr_available if svc and hasattr(svc, 'paddleocr_available') else False
        spacy_available = bool(getattr(svc, 'nlp', None)) if svc else False
        hf_ner_available = bool(getattr(svc, 'hf_ner', None)) if svc else False
        
        return ResponseEnvelope(data={
            "status": "healthy",
            "ocr_available": ocr_available,
            "spacy_available": spacy_available,
            "hf_ner_available": hf_ner_available,
            "database_connected": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/init-db", operation_id="createOcrInitDb")
def init_database(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Initialize database and create tables (System Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admin can initialize database")
        
        from database import Base, engine
        Base.metadata.create_all(bind=engine)
        
        return ResponseEnvelope(data={
            "message": "Database initialized successfully",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize", operation_id="createOcrInitialize")
def initialize_nlp_endpoint(
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access())
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
        
        return ResponseEnvelope(data={
            "message": "NLP service initialization started (background)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Initialize NLP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", operation_id="createOcrProcess")
def process_document(
    request_data: OCRProcessRequest,
    access: UnifiedAccess = Depends(require_access())
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
            
            return ResponseEnvelope(data={
                "result": result,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
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

@router.post("/similarity", operation_id="createOcrSimilarity")
def calculate_similarity(
    request_data: SimilarityRequest,
    access: UnifiedAccess = Depends(require_access())
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
        
        return ResponseEnvelope(data={
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similarity calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entities", operation_id="createOcrEntities")
def extract_entities(
    request_data: EntityExtractionRequest,
    access: UnifiedAccess = Depends(require_access())
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
        
        return ResponseEnvelope(data={
            "entities": result.get("entities", []),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract_patient", operation_id="createOcrExtractPatient")
def extract_patient_name(
    request_data: PatientExtractionRequest,
    access: UnifiedAccess = Depends(require_access())
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
        
        return ResponseEnvelope(data={
            "patient_info": patient_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Patient extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/debug_ner", operation_id="createOcrDebugNer")
def debug_ner(
    request_data: DebugNERRequest,
    access: UnifiedAccess = Depends(require_access())
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
        
        return ResponseEnvelope(data={
            "result": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"debug_ner error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- OCR Job Management ---

@router.get("/jobs", operation_id="listOcrJobs")
def list_jobs(
    status: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """List OCR jobs"""
    try:
        from models.ocr_job import OCRJob, OCRJobStatus
        
        access.tenant_id = access.tenant_id
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        query = db.query(OCRJob).filter_by(tenant_id=access.tenant_id)
        if status:
            try:
                query = query.filter_by(status=OCRJobStatus(status))
            except ValueError:
                pass
        
        jobs = query.order_by(OCRJob.created_at.desc()).limit(100).all()
        
        return ResponseEnvelope(data=[
            job.to_dict() if hasattr(job, 'to_dict') else {'id': job.id}
            for job in jobs
        ])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs", operation_id="createOcrJobs", status_code=201)
def create_job(
    request_data: CreateJobRequest,
    background_tasks: BackgroundTasks,
    access: UnifiedAccess = Depends(require_access()),
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
                    job.patient_name = result['patient_info'].get('name')
                    
            except Exception as e:
                logger.error(f"Job processing failed: {e}")
                job.status = OCRJobStatus.FAILED
                job.error_message = str(e)
            finally:
                session.commit()
                session.close()
        
        background_tasks.add_task(process_job, job.id)
        
        return ResponseEnvelope(data=job.to_dict() if hasattr(job, 'to_dict') else {'id': job.id})
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}", operation_id="getOcrJob")
def get_job(
    job_id: str,
    access: UnifiedAccess = Depends(require_access()),
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
        
        return ResponseEnvelope(data=job.to_dict() if hasattr(job, 'to_dict') else {'id': job.id})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
