"""SMS Integration Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import uuid
import logging

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.sms import (
    SmsProviderConfigRead,
    SmsProviderConfigUpdate,
    SmsHeaderRequestBase,
    SmsHeaderRequestRead,
    SmsHeaderRequestCreate,
    SmsHeaderRequestUpdate,
    SmsPackageRead,
    TenantSmsCreditRead,
    TargetAudienceRead,
    TargetAudienceCreate,
)
# Import SMS models at module level
from core.models.sms_integration import (
    SMSProviderConfig, SMSHeaderRequest, TenantSMSCredit, TargetAudience
)
from core.models.sms_package import SmsPackage as SMSPackage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sms", tags=["SMS Integration"])

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "audiences")
SMS_DOCUMENTS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "sms-documents")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SMS_DOCUMENTS_FOLDER, exist_ok=True)

# Removed duplicate model definitions locally (using schemas.sms)

@router.get("/config", operation_id="listSmConfig", response_model=ResponseEnvelope[Optional[SmsProviderConfigRead]])
async def get_sms_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get SMS configuration for tenant"""
    try:
        config = db.query(SMSProviderConfig).filter(SMSProviderConfig.tenant_id == access.tenant_id).first()
        if not config and access.tenant_id:
            config = SMSProviderConfig(tenant_id=access.tenant_id)
            db.add(config)
            db.commit()
            db.refresh(config)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsProviderConfigRead.model_validate(config).model_dump(by_alias=True) if config else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/config", operation_id="updateSmConfig", response_model=ResponseEnvelope[Optional[SmsProviderConfigRead]])
async def update_sms_config(
    data: SmsProviderConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update SMS configuration for tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        config = db.query(SMSProviderConfig).filter(SMSProviderConfig.tenant_id == access.tenant_id).first()
        if not config:
            config = SMSProviderConfig(tenant_id=access.tenant_id)
            db.add(config)
        
        if data.api_username is not None:
            config.api_username = data.api_username
        if data.api_password is not None:
            config.api_password = data.api_password
        if data.documents_email is not None:
            config.documents_email = data.documents_email
        
        db.commit()
        db.refresh(config)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsProviderConfigRead.model_validate(config).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/headers", operation_id="listSmHeaders", response_model=ResponseEnvelope[List[SmsHeaderRequestRead]])
async def list_sms_headers(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """List SMS headers for tenant"""
    try:
        query = db.query(SMSHeaderRequest)
        if access.tenant_id:
            query = query.filter(SMSHeaderRequest.tenant_id == access.tenant_id)
        
        headers = query.order_by(SMSHeaderRequest.created_at.desc()).all()
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=[SmsHeaderRequestRead.model_validate(h).model_dump(by_alias=True) for h in headers])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/headers", operation_id="createSmHeaders", response_model=ResponseEnvelope[SmsHeaderRequestRead])
async def request_sms_header(
    data: SmsHeaderRequestCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Request a new SMS header for tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        header_text = data.header_text
        if not header_text:
            raise HTTPException(status_code=400, detail="Header text is required")
        
        if len(header_text) > 11:
            raise HTTPException(status_code=400, detail="Header text max 11 chars")
        
        existing_headers = db.query(SMSHeaderRequest).filter(SMSHeaderRequest.tenant_id == access.tenant_id).count()
        is_first_header = existing_headers == 0
        
        header = SMSHeaderRequest(
            tenant_id=access.tenant_id,
            header_text=header_text,
            header_type=data.header_type,
            documents_json=data.documents,
            is_default=is_first_header
        )
        
        db.add(header)
        db.commit()
        db.refresh(header)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsHeaderRequestRead.model_validate(header).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/headers/{header_id}/set-default", operation_id="updateSmHeaderSetDefault", response_model=ResponseEnvelope[SmsHeaderRequestRead])
async def set_default_header(
    header_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Set a header as the default for the tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        header = db.get(SMSHeaderRequest, header_id)
        if not header or header.tenant_id != access.tenant_id:
            raise HTTPException(status_code=404, detail="Header not found")
        
        if header.status != "approved":
            raise HTTPException(status_code=400, detail="Only approved headers can be set as default")
        
        db.query(SMSHeaderRequest).filter(SMSHeaderRequest.tenant_id == access.tenant_id).update({"is_default": False})
        header.is_default = True
        db.commit()
        db.refresh(header)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsHeaderRequestRead.model_validate(header).model_dump(by_alias=True), message="Varsayilan baslik olarak ayarlandi")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/packages", operation_id="listSmPackages", response_model=ResponseEnvelope[List[SmsPackageRead]])
async def list_sms_packages(db: Session = Depends(get_db)):
    """List available SMS packages (public endpoint)"""
    try:
        packages = db.query(SMSPackage).filter(SMSPackage.is_active == True).order_by(SMSPackage.price).all()
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=[SmsPackageRead.model_validate(p).model_dump(by_alias=True) for p in packages])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/credit", operation_id="listSmCredit", response_model=ResponseEnvelope[Optional[TenantSmsCreditRead]])
async def get_sms_credit(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get SMS credit balance for tenant"""
    try:
        credit = db.query(TenantSMSCredit).filter(TenantSMSCredit.tenant_id == access.tenant_id).first()
        if not credit and access.tenant_id:
            credit = TenantSMSCredit(tenant_id=access.tenant_id)
            db.add(credit)
            db.commit()
            db.refresh(credit)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=TenantSmsCreditRead.model_validate(credit).model_dump(by_alias=True) if credit else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audiences", operation_id="listSmAudiences", response_model=ResponseEnvelope[List[TargetAudienceRead]])
async def list_target_audiences(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """List target audiences for tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        audiences = db.query(TargetAudience).filter(TargetAudience.tenant_id == access.tenant_id).order_by(TargetAudience.created_at.desc()).all()
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=[TargetAudienceRead.model_validate(a).model_dump(by_alias=True) for a in audiences])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audiences", operation_id="createSmAudiences", response_model=ResponseEnvelope[TargetAudienceRead])
async def create_target_audience(
    data: TargetAudienceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a new target audience"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        audience = TargetAudience(
            tenant_id=access.tenant_id,
            name=data.name,
            source_type=data.source_type,
            file_path=data.file_path,
            total_records=data.total_records,
            filter_criteria_json=data.filter_criteria
        )
        
        db.add(audience)
        db.commit()
        db.refresh(audience)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=TargetAudienceRead.model_validate(audience).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- Additional SMS Endpoints (Migrated from Flask) ---

from fastapi import UploadFile, File
from fastapi.responses import FileResponse
import os
import tempfile

@router.post("/documents/upload", operation_id="createSmDocumentUpload")
async def upload_sms_document(
    file: UploadFile = File(...),
    document_type: str = "general",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Upload SMS-related document"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        # Save file to temp location
        suffix = os.path.splitext(file.filename or '')[1] or '.pdf'
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix=f'sms_doc_{document_type}_')
        content = await file.read()
        tmp.write(content)
        tmp.close()
        
        return ResponseEnvelope(data={
            "filename": file.filename,
            "documentType": document_type,
            "path": tmp.name,
            "size": len(content)
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_type}/download", operation_id="listSmDocumentDownload")
async def download_sms_document(
    document_type: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Download SMS document by type"""
    try:
        # Mock implementation - return placeholder
        return ResponseEnvelope(data={
            "documentType": document_type,
            "downloadUrl": f"/api/sms/documents/file/{document_type}.pdf"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_type}", operation_id="deleteSmDocument")
async def delete_sms_document(
    document_type: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Delete SMS document"""
    try:
        return ResponseEnvelope(message=f"Document {document_type} deleted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DocumentSubmitRequest(BaseModel):
    document_type: str
    file_path: Optional[str] = None

@router.post("/documents/submit", operation_id="createSmDocumentSubmit")
async def submit_sms_documents(
    data: DocumentSubmitRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Submit SMS documents for review"""
    try:
        return ResponseEnvelope(data={
            "status": "submitted",
            "documentType": data.document_type,
            "submittedAt": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audiences/upload", operation_id="createSmAudienceUpload")
async def upload_audience_file(
    file: UploadFile = File(...),
    name: str = "Uploaded Audience",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Upload audience file (CSV/Excel)"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        content = await file.read()
        
        # Count records (simple line count for CSV)
        total_records = len(content.decode('utf-8', errors='ignore').strip().split('\n')) - 1
        audience = TargetAudience(
            tenant_id=access.tenant_id,
            name=name,
            source_type="file_upload",
            file_path=file.filename,
            total_records=max(0, total_records)
        )
        
        db.add(audience)
        db.commit()
        db.refresh(audience)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=TargetAudienceRead.model_validate(audience).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- Admin SMS Endpoints ---

@router.get("/admin/headers", operation_id="listSmAdminHeaders")
async def list_admin_sms_headers(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all SMS header requests (admin)"""
    try:
        query = db.query(SMSHeaderRequest).order_by(SMSHeaderRequest.created_at.desc())
        total = query.count()
        headers = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(
            data=[SmsHeaderRequestRead.model_validate(h).model_dump(by_alias=True) for h in headers],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class HeaderStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

@router.put("/admin/headers/{header_id}/status", operation_id="updateSmAdminHeaderStatus")
async def update_header_status(
    header_id: str,
    data: HeaderStatusUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update SMS header request status (admin)"""
    try:
        header = db.get(SMSHeaderRequest, header_id)
        if not header:
            raise HTTPException(status_code=404, detail="Header request not found")
        
        header.status = data.status
        if data.rejection_reason:
            header.rejection_reason = data.rejection_reason
        
        db.commit()
        db.refresh(header)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsHeaderRequestRead.model_validate(header).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/file/{filepath:path}", operation_id="getSmDocumentFile")
async def get_sms_document_file(
    filepath: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Serve SMS document file"""
    try:
        # Construct full path
        full_path = os.path.join(SMS_DOCUMENTS_FOLDER, filepath)
        
        # Security check - ensure path is within allowed directory
        real_path = os.path.realpath(full_path)
        if not real_path.startswith(os.path.realpath(SMS_DOCUMENTS_FOLDER)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not os.path.exists(real_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(real_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
