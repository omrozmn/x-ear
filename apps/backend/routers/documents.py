"""
FastAPI Documents Router - Migrated from Flask routes/documents.py
Handles patient document storage and retrieval
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import logging
import uuid
import os
import base64
from pathlib import Path

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])

# Document storage configuration
STORAGE_BASE_PATH = os.getenv('DOCUMENT_STORAGE_PATH', './storage/documents')
# Ensure storage directory exists
Path(STORAGE_BASE_PATH).mkdir(parents=True, exist_ok=True)

# --- Schemas ---

class DocumentCreate(BaseModel):
    id: Optional[str] = None
    fileName: str
    originalName: Optional[str] = None
    type: str
    content: str  # Base64 encoded
    metadata: Optional[dict] = None
    mimeType: Optional[str] = "application/octet-stream"
    uploadedAt: Optional[str] = None
    createdBy: Optional[str] = "system"
    status: Optional[str] = "completed"

class DocumentResponse(BaseModel):
    id: str
    patientId: str
    fileName: str
    originalName: Optional[str] = None
    type: str
    filePath: str
    metadata: Optional[dict] = None
    mimeType: str
    size: int
    uploadedAt: str
    createdBy: str
    status: str

# --- Routes ---

@router.get("/patients/{patient_id}/documents", operation_id="listPatientDocuments")
def get_patient_documents(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all documents for a patient"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents from patient's custom data field
        documents = []
        try:
            custom_data = patient.custom_data_json or {}
            documents = custom_data.get('documents', [])
        except Exception as e:
            logger.error(f"Error parsing patient custom data: {e}")
        
        return ResponseEnvelope(
            data=documents,
            meta={
                'total': len(documents),
                'patient_id': patient_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/documents", operation_id="createPatientDocuments", status_code=201)
def add_patient_document(
    patient_id: str,
    request_data: DocumentCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Add a new document to patient - stores file locally"""
    try:
        from models.patient import Patient
        from models.user import ActivityLog
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate document ID
        doc_id = request_data.id or str(uuid.uuid4())
        
        # Create patient-specific directory
        patient_dir = Path(STORAGE_BASE_PATH) / patient.tenant_id / patient_id
        patient_dir.mkdir(parents=True, exist_ok=True)
        
        # Decode base64 content and save to file
        try:
            file_content = base64.b64decode(request_data.content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 content: {str(e)}")
        
        # Use original filename or generate safe filename
        file_name = request_data.fileName or f'document_{doc_id}'
        file_path = patient_dir / f"{doc_id}_{file_name}"
        
        # Write file to disk
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Create document metadata (no base64 content stored in DB)
        document = {
            'id': doc_id,
            'patientId': patient_id,
            'fileName': request_data.fileName,
            'originalName': request_data.originalName or request_data.fileName,
            'type': request_data.type,
            'filePath': str(file_path.relative_to(STORAGE_BASE_PATH)),
            'metadata': request_data.metadata or {},
            'mimeType': request_data.mimeType,
            'size': len(file_content),
            'uploadedAt': request_data.uploadedAt or datetime.now(timezone.utc).isoformat(),
            'createdBy': request_data.createdBy,
            'status': request_data.status
        }
        
        # Get or initialize custom_data
        custom_data = patient.custom_data_json or {}
        
        # Add document to documents array
        if 'documents' not in custom_data:
            custom_data['documents'] = []
        custom_data['documents'].append(document)
        
        # Save back to patient
        patient.custom_data_json = custom_data
        db.commit()
        
        # Create Activity Log
        try:
            activity_log = ActivityLog(
                user_id=request_data.createdBy,
                action='document_upload',
                entity_type='patient',
                entity_id=patient_id,
                details=f"Document uploaded: {document['fileName']}",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get('User-Agent', ''),
                tenant_id=access.tenant_id
            )
            db.add(activity_log)
            db.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log for document upload: {log_error}")
        
        logger.info(f"✅ Document saved to disk: {file_path}")
        
        return ResponseEnvelope(data=document)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding patient document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/documents/{document_id}", operation_id="getPatientDocument")
def get_patient_document(
    patient_id: str,
    document_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get a specific document - returns file for download"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents from custom_data
        custom_data = patient.custom_data_json or {}
        documents = custom_data.get('documents', [])
        
        # Find specific document
        document = next((d for d in documents if d.get('id') == document_id), None)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if file exists on disk
        file_path = Path(STORAGE_BASE_PATH) / document.get('filePath', '')
        if not file_path.exists():
            logger.error(f"Document file not found on disk: {file_path}")
            raise HTTPException(status_code=404, detail="Document file not found")
        
        # Return file for download
        return FileResponse(
            path=str(file_path),
            media_type=document.get('mimeType', 'application/octet-stream'),
            filename=document.get('fileName', 'document')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}/documents/{document_id}", operation_id="deletePatientDocument")
def delete_patient_document(
    patient_id: str,
    document_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a document - removes file from disk and DB"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents from custom_data
        custom_data = patient.custom_data_json or {}
        documents = custom_data.get('documents', [])
        
        # Find the document to delete
        document = next((d for d in documents if d.get('id') == document_id), None)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file from disk
        file_path = Path(STORAGE_BASE_PATH) / document.get('filePath', '')
        if file_path.exists():
            try:
                os.remove(file_path)
                logger.info(f"✅ Deleted document file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete file from disk: {e}")
        
        # Remove from documents list
        documents = [d for d in documents if d.get('id') != document_id]
        custom_data['documents'] = documents
        patient.custom_data_json = custom_data
        db.commit()
        
        logger.info(f"✅ Document deleted: {document_id}")
        
        return ResponseEnvelope(message='Document deleted successfully')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting patient document: {e}")
        raise HTTPException(status_code=500, detail=str(e))
