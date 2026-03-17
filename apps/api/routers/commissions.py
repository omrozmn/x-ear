"""
Commissions Router - FastAPI
Handles affiliate commission ledger operations (migrated from routes_flask_archive/commission.py)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import logging

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from services.commission_service import CommissionService
# Assuming dependencies like user/admin might be needed in future, but Flask legacy didn't show explicit auth decorators
# We will just port the logic as-is, maybe adding basic auth if needed.
# Flask code: @router.post, no unified_access visible in snippet for commission.py but likely safe to Assume auth.

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/commissions", tags=["Commission Ledger"])

class CommissionCreate(BaseModel):
    affiliate_id: int
    tenant_id: int
    event: str
    amount: float

class CommissionStatusUpdate(BaseModel):
    status: str

@router.post("/create", operation_id="createCommissionCreate")
def create_commission(
    data: CommissionCreate,
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
):
    """Create a new commission entry"""
    try:
        commission = CommissionService.create_commission(
            db, 
            data.affiliate_id, 
            data.tenant_id, 
            data.event, 
            data.amount
        )
        return {"id": commission.id, "status": commission.status}
    except Exception as e:
        logger.error(f"Create commission error: {e}")
        raise HTTPException(status_code=400, detail="Internal server error")

@router.post("/update-status", operation_id="createCommissionUpdateStatus")
def update_commission_status(
    commission_id: int = Query(..., description="ID of commission to update"),
    status: str = Query(..., description="New status"),
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
):
    """Update commission status"""
    # Note: Flask version used query params or body? 
    # Flask snippet: def update_commission_status(commission_id: int, status: str, ...)
    # Usually implies query params if not using Pydantic model. 
    # But clean API design prefers Body. Let's support Query for parity with 'commission_id: int' arg pattern.
    try:
        commission = CommissionService.update_commission_status(db, commission_id, status)
        if not commission:
            raise HTTPException(status_code=404, detail="Commission not found")
        return {"id": commission.id, "status": commission.status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update commission status error: {e}")
        raise HTTPException(status_code=400, detail="Internal server error")

@router.get("/by-affiliate", operation_id="listCommissionByAffiliate")
def get_commissions_by_affiliate(
    affiliate_id: Optional[int] = Query(None),
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
):
    """Get commissions for an affiliate"""
    try:
        if not affiliate_id:
            # Return empty list if no affiliate_id provided
            return []
        commissions = CommissionService.get_commissions_by_affiliate(db, affiliate_id)
        return [{
            "id": c.id, 
            "tenant_id": c.tenant_id, 
            "event": c.event, 
            "amount": float(c.amount), 
            "status": c.status, 
            "created_at": c.created_at
        } for c in commissions]
    except Exception as e:
        logger.error(f"Get commissions by affiliate error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/audit", operation_id="listCommissionAudit")
def audit_trail(
    commission_id: Optional[int] = Query(None),
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
):
    """Get audit trail for a commission"""
    try:
        if not commission_id:
            raise HTTPException(status_code=400, detail="commission_id is required")
        commission = CommissionService.audit_trail(db, commission_id)
        if not commission:
            raise HTTPException(status_code=404, detail="Commission not found")
        
        return {
            "id": commission.id, 
            "status": commission.status, 
            "created_at": commission.created_at, 
            "updated_at": commission.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Commission audit error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
