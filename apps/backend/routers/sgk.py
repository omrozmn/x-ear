"""
FastAPI SGK Router - Migrated from Flask routes/sgk.py
Handles SGK document management and OCR processing
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import logging
import os
import tempfile

from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from dependencies import get_db, get_current_user
from schemas.base import ResponseEnvelope
from models.user import User
from models.patient import Patient
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["SGK"])

MAX_UPLOAD_FILES = 50
ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp'}

# --- Request Schemas ---

class UploadSGKDocumentRequest(BaseModel):
    patientId: str
    filename: str
    documentType: str
    content: Optional[str] = None

class ProcessOCRRequest(BaseModel):
    image_path: str

# --- Helper Functions ---

def _is_allowed_image(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_IMAGE_EXTENSIONS

def get_nlp_service():
    """Get NLP/OCR service instance"""
    try:
        from services.ocr_service import get_nlp_service as _get_nlp_service
        return _get_nlp_service()
    except Exception:
        return None

# --- Routes ---

@router.get("/sgk/documents")
def list_sgk_documents(
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List SGK documents"""
    try:
        docs = []
        # Try to get from SGKDocument model if available
        try:
            from models.sgk import SGKDocument
            docs = db_session.query(SGKDocument).filter(
                SGKDocument.tenant_id == current_user.tenant_id
            ).all()
            docs = [d.to_dict() for d in docs]
        except Exception:
            pass
        
        return ResponseEnvelope(data={
            "documents": docs,
            "count": len(docs),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"List SGK docs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sgk/documents")
def upload_sgk_document(
    request_data: UploadSGKDocumentRequest,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload SGK document"""
    try:
        doc_data = request_data.model_dump()
        doc_data['tenant_id'] = current_user.tenant_id
        doc_data['created_at'] = datetime.now().isoformat()
        
        try:
            from models.sgk import SGKDocument
            doc = SGKDocument.from_dict(doc_data)
            db_session.add(doc)
            db_session.commit()
            return ResponseEnvelope(data={"document": doc.to_dict()})
        except Exception:
            return ResponseEnvelope(data={"document": doc_data})
    except Exception as e:
        logger.error(f"Upload SGK doc error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sgk/documents/{document_id}")
def get_sgk_document(
    document_id: str,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get SGK document"""
    try:
        from models.sgk import SGKDocument
        doc = db_session.get(SGKDocument, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail={"message": "Document not found", "code": "NOT_FOUND"})
        return ResponseEnvelope(data={"document": doc.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get SGK doc error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sgk/documents/{document_id}")
def delete_sgk_document(
    document_id: str,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete SGK document"""
    try:
        from models.sgk import SGKDocument
        doc = db_session.get(SGKDocument, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail={"message": "Document not found", "code": "NOT_FOUND"})
        db_session.delete(doc)
        db_session.commit()
        return ResponseEnvelope(message="Document deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete SGK doc error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ocr/process")
def process_ocr(
    request_data: ProcessOCRRequest,
    current_user: User = Depends(get_current_user)
):
    """Process OCR on image"""
    try:
        svc = get_nlp_service()
        if svc is None:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        try:
            svc.initialize()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"OCR init failed: {e}")
        
        result = svc.process_document(request_data.image_path)
        return ResponseEnvelope(data={"result": result, "timestamp": datetime.now().isoformat()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sgk/upload")
async def upload_and_process_files(
    files: List[UploadFile] = File(...),
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process SGK files with OCR"""
    try:
        if len(files) > MAX_UPLOAD_FILES:
            raise HTTPException(status_code=400, detail=f"Too many files. Max allowed is {MAX_UPLOAD_FILES}.")
        
        svc = get_nlp_service()
        if svc is None:
            raise HTTPException(status_code=503, detail="OCR service not available")
        
        try:
            svc.initialize()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"OCR init failed: {e}")
        
        results = []
        for f in files:
            original_name = f.filename or 'unknown'
            
            if not _is_allowed_image(original_name):
                results.append({
                    "fileName": original_name,
                    "status": "error",
                    "error": "Unsupported file type"
                })
                continue
            
            # Save to temp file
            suffix = os.path.splitext(original_name)[1] or '.jpg'
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix='sgk_upload_')
            try:
                content = await f.read()
                tmp.write(content)
                tmp.flush()
                tmp.close()
                
                # Process OCR
                proc_result = svc.process_document(image_path=tmp.name, auto_crop=True)
                
                # Extract patient info
                patient_info = None
                try:
                    ents = proc_result.get('entities') or []
                    texts = [(e.get('text') if isinstance(e, dict) else str(e)) for e in ents]
                    for idx, txt in enumerate(texts):
                        low = (txt or '').lower()
                        if 'hasta' in low and ('ad' in low or 'adı' in low or 'soyad' in low):
                            for j in range(idx+1, min(idx+4, len(texts))):
                                cand = (texts[j] or '').strip()
                                cand_clean = ''.join([c for c in cand if c.isalpha() or c.isspace() or c == '-']).strip()
                                if len(cand_clean.split()) >= 2:
                                    patient_info = {"name": cand_clean, "confidence": 0.9}
                                    break
                        if patient_info:
                            break
                except Exception:
                    pass
                
                proc_result['patient_info'] = patient_info
                
                # Try to match patient in DB
                matched_patient = None
                if patient_info and patient_info.get('name'):
                    try:
                        name_parts = patient_info['name'].split()
                        if len(name_parts) >= 2:
                            first_token = name_parts[0]
                            last_token = name_parts[-1]
                            candidates = db_session.query(Patient).filter(
                                Patient.tenant_id == current_user.tenant_id,
                                Patient.first_name.ilike(f"{first_token}%"),
                                Patient.last_name.ilike(f"%{last_token}%")
                            ).limit(5).all()
                            
                            if len(candidates) == 1:
                                matched_patient = candidates[0]
                    except Exception:
                        pass
                
                if matched_patient:
                    proc_result['matched_patient'] = {
                        'patient': matched_patient.to_dict(),
                        'match_details': {"method": "name_match", "confidence": 0.85}
                    }
                else:
                    proc_result['matched_patient'] = None
                
                results.append({
                    "fileName": original_name,
                    "status": "success",
                    "result": proc_result
                })
            except Exception as e:
                results.append({
                    "fileName": original_name,
                    "status": "error",
                    "error": str(e)
                })
            finally:
                try:
                    os.unlink(tmp.name)
                except Exception:
                    pass
        
        return ResponseEnvelope(data={"results": results, "timestamp": datetime.now().isoformat()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload and process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
