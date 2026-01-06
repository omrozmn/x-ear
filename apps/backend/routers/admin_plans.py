"""
FastAPI Admin Plans Router - Migrated from Flask routes/admin_plans.py
Handles subscription plan management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import uuid

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope
from schemas.plans import PlanCreate, PlanUpdate, PlanRead
from models.admin_user import AdminUser
from models.plan import Plan, PlanType, BillingInterval
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/plans", tags=["Admin Plans"])

# Response models
class PlanListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class PlanDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", response_model=PlanListResponse)
def list_plans(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    is_public: Optional[str] = Query(None),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all plans"""
    try:
        query = db_session.query(Plan)
        
        if type:
            query = query.filter_by(plan_type=PlanType[type.upper()])
        if is_active:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        if is_public:
            query = query.filter_by(is_public=is_public.lower() == 'true')
        
        query = query.order_by(Plan.created_at.desc())
        total = query.count()
        plans = query.offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(data={
            "plans": [p.to_dict() for p in plans],
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"List plans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=PlanDetailResponse)
def create_plan(
    request_data: PlanCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Create a new plan"""
    try:
        plan = Plan(
            id=str(uuid.uuid4()),
            name=request_data.name,
            slug=request_data.slug or Plan.generate_slug(request_data.name),
            description=request_data.description,
            plan_type=PlanType[request_data.plan_type.upper()],
            price=request_data.price,
            billing_interval=BillingInterval[request_data.billing_interval.upper()],
            features=request_data.features,
            max_users=request_data.max_users,
            max_storage_gb=request_data.max_storage_gb,
            is_active=request_data.is_active,
            is_public=request_data.is_public
        )
        db_session.add(plan)
        db_session.commit()
        return ResponseEnvelope(data={"plan": plan.to_dict()})
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create plan error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{plan_id}", response_model=PlanDetailResponse)
def get_plan(
    plan_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get plan details"""
    plan = db_session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail={"message": "Plan not found", "code": "NOT_FOUND"})
    return ResponseEnvelope(data={"plan": plan.to_dict(include_relationships=True)})

@router.put("/{plan_id}", response_model=PlanDetailResponse)
def update_plan(
    plan_id: str,
    request_data: PlanUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update plan"""
    try:
        plan = db_session.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail={"message": "Plan not found", "code": "NOT_FOUND"})
        
        update_data = request_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if key == 'plan_type':
                    setattr(plan, key, PlanType[value.upper()])
                elif key == 'billing_interval':
                    setattr(plan, key, BillingInterval[value.upper()])
                else:
                    setattr(plan, key, value)
        
        plan.updated_at = datetime.utcnow()
        db_session.commit()
        return ResponseEnvelope(data={"plan": plan.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update plan error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{plan_id}", response_model=ResponseEnvelope)
def delete_plan(
    plan_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Delete plan (soft delete)"""
    try:
        plan = db_session.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail={"message": "Plan not found", "code": "NOT_FOUND"})
        
        plan.is_active = False
        plan.updated_at = datetime.utcnow()
        db_session.commit()
        return ResponseEnvelope(message="Plan deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete plan error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
