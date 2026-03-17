"""
FastAPI Upload Router - Migrated from Flask routes/upload.py
Handles file uploads via S3 presigned URLs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
from pydantic import BaseModel
import logging
from urllib.parse import quote

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])

# --- Schemas ---

class PresignedUploadRequest(BaseModel):
    filename: str
    folder: str = "uploads"
    content_type: Optional[str] = None

from schemas.upload import PresignedUploadResponse, FileListResponse


def _build_fallback_files(db: Session, tenant_id: str):
    """Use OCR jobs and upload activity as a fallback listing source in dev."""
    try:
        from models.ocr_job import OCRJob
        from models.user import ActivityLog
    except Exception:
        return []

    files_by_key = {}

    ocr_jobs = (
        db.query(OCRJob)
        .filter(OCRJob.tenant_id == tenant_id)
        .order_by(OCRJob.created_at.desc())
        .limit(200)
        .all()
    )
    for job in ocr_jobs:
        key = job.file_path
        if not key or key in files_by_key:
            continue
        filename = key.split("/")[-1]
        files_by_key[key] = {
            "key": key,
            "filename": filename,
            "size": 0,
            "last_modified": job.created_at.isoformat() if job.created_at else None,
            "url": f"/api/ocr/jobs/{quote(str(job.id))}",
        }

    upload_logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.tenant_id == tenant_id, ActivityLog.action == "file_upload_init")
        .order_by(ActivityLog.created_at.desc())
        .limit(200)
        .all()
    )
    for log in upload_logs:
        key = log.entity_id
        if not key or key in files_by_key:
            continue
        files_by_key[key] = {
            "key": key,
            "filename": str(key).split("/")[-1],
            "size": 0,
            "last_modified": log.created_at.isoformat() if log.created_at else None,
            "url": str(key),
        }

    return list(files_by_key.values())

# --- Routes ---

@router.post("/presigned", operation_id="createUploadPresigned", response_model=ResponseEnvelope[PresignedUploadResponse])
def get_presigned_upload_url(
    request_data: PresignedUploadRequest,
    request: Request,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """
    Get a presigned URL for direct S3 upload
    
    Request Body:
        filename (str): Original filename
        folder (str): Target folder (e.g., 'sms_documents', 'invoices')
        content_type (str): File content type (optional)
        
    Returns:
        JSON: {
            'url': str,
            'fields': dict,
            'key': str
        }
    """
    try:
        from services.s3_service import s3_service
        from models.user import ActivityLog
        
        filename = request_data.filename
        folder = request_data.folder
        content_type = request_data.content_type
        
        if not filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Determine access.tenant_id for file path
        if access.tenant_id:
            access.tenant_id = access.tenant_id
        elif access.is_super_admin:
            access.tenant_id = 'admin'
        else:
            access.tenant_id = 'public'
        
        # Generate presigned URL
        presigned_data = s3_service.generate_presigned_upload_url(
            folder=folder,
            tenant_id=str(access.tenant_id),
            filename=filename,
            content_type=content_type
        )
        
        # Create Activity Log for upload attempt
        try:
            user_id = access.user.id if access.user else 'system'
            activity_log = ActivityLog(
                user_id=user_id,
                action='file_upload_init',
                entity_type='file',
                entity_id=filename,
                details=f"File upload initiated: {filename} to {folder}",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get('User-Agent', ''),
                tenant_id=access.tenant_id
            )
            db.add(activity_log)
            db.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log for file upload: {log_error}")
        
        return ResponseEnvelope(data=PresignedUploadResponse(
            url=presigned_data.get('url'),
            fields=presigned_data.get('fields'),
            key=presigned_data.get('key')
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/files", operation_id="listUploadFiles", response_model=ResponseEnvelope[FileListResponse])
def list_files(
    folder: str = Query("uploads"),
    tenant_id: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """
    List files in a folder
    
    Query Params:
        folder (str): Folder name (default: 'uploads')
    """
    try:
        # Determine effective tenant scope for file listing.
        if access.is_super_admin:
            # Legacy admin uploads commonly live under "admin"; keep that as the
            # default fallback instead of the JWT tenant_id ("system").
            effective_tenant_id = tenant_id or (
                access.tenant_id if access.tenant_id not in {None, "", "system"} else 'admin'
            )
        elif access.tenant_id:
            effective_tenant_id = access.tenant_id
        else:
            effective_tenant_id = 'public'

        files = []
        try:
            from services.s3_service import s3_service
            files = s3_service.list_files(folder, str(effective_tenant_id))
        except ImportError as e:
            logger.warning(f"S3 service not available, using fallback files: {e}")
        except Exception as e:
            logger.warning(f"S3 file listing failed, using fallback files: {e}")

        if not files:
            files = _build_fallback_files(db, str(effective_tenant_id))
        
        return ResponseEnvelope(data=FileListResponse(files=files))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/files", operation_id="deleteUploadFiles")
def delete_file(
    key: str = Query(...),
    request: Request = None,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """
    Delete a file
    
    Query Params:
        key (str): S3 key of the file to delete
    """
    try:
        from services.s3_service import s3_service
        from models.user import ActivityLog
        
        # Determine access.tenant_id for security check
        if access.tenant_id:
            access.tenant_id = access.tenant_id
        elif access.is_super_admin:
            access.tenant_id = None  # Super Admin can delete any file
        else:
            access.tenant_id = 'public'
        
        # Security check: Ensure the key belongs to the tenant
        # Super Admin (tenant_id=None) can delete any file
        if access.tenant_id and str(access.tenant_id) not in key:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this file")
        
        success = s3_service.delete_file(key)
        
        if success:
            # Create Activity Log
            try:
                user_id = access.user.id if access.user else 'system'
                activity_log = ActivityLog(
                    user_id=user_id,
                    action='file_delete',
                    entity_type='file',
                    entity_id=key,
                    details=f"File deleted: {key}",
                    ip_address=request.client.host if request and request.client else None,
                    user_agent=request.headers.get('User-Agent', '') if request else '',
                    tenant_id=access.tenant_id
                )
                db.add(activity_log)
                db.commit()
            except Exception as log_error:
                logger.error(f"Failed to create activity log for file deletion: {log_error}")
            
            return ResponseEnvelope(message='File deleted successfully')
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
