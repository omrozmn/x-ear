"""
FastAPI Plans Router - Migrated from Flask routes/plans.py
Handles subscription plans management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
# Use Pydantic schema for type-safe serialization (NO to_dict())
from schemas.plans import DetailedPlanRead, PlanCreate, PlanUpdate
from middleware.unified_access import UnifiedAccess, require_access, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plans", tags=["Plans"])

# --- Routes ---

@router.get("", operation_id="listPlans", response_model=ResponseEnvelope[List[DetailedPlanRead]])
def get_plans(db: Session = Depends(get_db)):
    """Get all active plans (Public)"""
    try:
        from models.plan import Plan
        
        plans = db.query(Plan).filter_by(is_active=True, is_public=True).all()
        
        results = []
        for plan in plans:
            # Use Pydantic schema for type-safe serialization (NO to_dict())
            plan_data = DetailedPlanRead.model_validate(plan)
            plan_dict = plan_data.model_dump(by_alias=True)
            # Filter features if they are a list of dicts
            if isinstance(plan_dict.get('features'), list):
                plan_dict['features'] = [f for f in plan_dict['features'] if f.get('is_visible', True)]
            results.append(plan_dict)
        
        return ResponseEnvelope(data=results)
        
    except Exception as e:
        logger.error(f"Error getting plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin", operation_id="listPlanAdmin", response_model=ResponseEnvelope[List[DetailedPlanRead]])
def get_admin_plans(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all plans for admin (including inactive/private)"""
    try:
        from models.plan import Plan
        
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        plans = db.query(Plan).all()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=[
            DetailedPlanRead.model_validate(p).model_dump(by_alias=True)
            for p in plans
        ])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="createPlan", status_code=201, response_model=ResponseEnvelope[DetailedPlanRead])
def create_plan(
    request_data: PlanCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new plan (Super Admin only)"""
    try:
        from models.plan import Plan, PlanType, BillingInterval
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        plan = Plan(
            name=request_data.name,
            description=request_data.description,
            plan_type=PlanType(request_data.plan_type),
            price=request_data.price,
            billing_interval=BillingInterval(request_data.billing_interval),
            features=request_data.features or [],
            max_users=request_data.max_users,
            max_storage_gb=request_data.max_storage_gb,
            is_active=request_data.is_active,
            is_public=request_data.is_public
        )
        
        db.add(plan)
        db.commit()
        db.refresh(plan)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=DetailedPlanRead.model_validate(plan).model_dump(by_alias=True))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating plan: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{plan_id}", operation_id="updatePlan", response_model=ResponseEnvelope[DetailedPlanRead])
def update_plan(
    plan_id: str,
    request_data: PlanUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a plan (Super Admin only)"""
    try:
        from models.plan import Plan
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        plan = db.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        if request_data.name is not None:
            plan.name = request_data.name
        if request_data.description is not None:
            plan.description = request_data.description
        if request_data.price is not None:
            plan.price = request_data.price
        if request_data.features is not None:
            plan.features = request_data.features
        if request_data.is_active is not None:
            plan.is_active = request_data.is_active
        if request_data.is_public is not None:
            plan.is_public = request_data.is_public
        if request_data.max_users is not None:
            plan.max_users = request_data.max_users
        
        db.commit()
        db.refresh(plan)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=DetailedPlanRead.model_validate(plan).model_dump(by_alias=True))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating plan: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{plan_id}", operation_id="deletePlan")
def delete_plan(
    plan_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a plan (Super Admin only)"""
    try:
        from models.plan import Plan
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        plan = db.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Soft delete - just deactivate
        plan.is_active = False
        db.commit()
        
        return ResponseEnvelope(message="Plan deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))
