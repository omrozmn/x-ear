"""Admin Scan Queue Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from models.scan_queue import ScanQueue
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/scan-queue", tags=["Admin Scan Queue"])

@router.post("/init-db", operation_id="createAdminScanQueueInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize Scan Queue table"""
    try:
        ScanQueue.__table__.create(db.get_bind(), checkfirst=True)
        return {"success": True, "message": "Scan Queue table initialized"}
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=ResponseEnvelope)
async def get_scan_queue(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.read", admin_only=True))
):
    """Get scan queue items"""
    try:
        query = db.query(ScanQueue)
        if status:
            query = query.filter(ScanQueue.status == status)
        items = query.order_by(ScanQueue.created_at.desc()).all()
        return {"success": True, "data": [i.to_dict() for i in items]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{scan_id}/retry", operation_id="createAdminScanQueueRetry", response_model=ResponseEnvelope)
async def retry_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.manage", admin_only=True))
):
    """Retry a failed scan"""
    try:
        scan = db.query(ScanQueue).filter(ScanQueue.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        scan.status = "pending"
        scan.error_message = None
        scan.started_at = None
        scan.completed_at = None
        db.commit()
        
        return {"success": True, "data": scan.to_dict(), "message": "Scan queued for retry"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
