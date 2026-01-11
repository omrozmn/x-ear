"""Audit Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from models.user import ActivityLog
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["Audit"])

@router.get("", operation_id="listAudit")
async def list_audit(
    entity_type: Optional[str] = None,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("audit.read", admin_only=True))
):
    """List audit logs with optional filters"""
    try:
        query = db.query(ActivityLog).order_by(ActivityLog.created_at.desc())
        
        if entity_type:
            query = query.filter(ActivityLog.entity_type == entity_type)
        
        items = query.limit(limit).all()
        return {"success": True, "data": [i.to_dict() for i in items]}
    except Exception as e:
        logger.error(f"List audit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
