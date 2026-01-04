"""
FastAPI Branches Router - Migrated from Flask routes/branches.py
Branch CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.branch import Branch
from models.tenant import Tenant
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Branches"])

# --- Request Schemas ---

class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# --- Helper Functions ---

def tenant_scoped_query(ctx: AccessContext, model):
    """Apply tenant scoping to query"""
    query = model.query
    if ctx.tenant_id:
        query = query.filter_by(tenant_id=ctx.tenant_id)
    return query

def get_branch_or_404(db_session: Session, branch_id: str, ctx: AccessContext) -> Branch:
    """Get branch or raise 404"""
    branch = db_session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Branch not found", code="BRANCH_NOT_FOUND").model_dump(mode="json")
        )
    if ctx.tenant_id and branch.tenant_id != ctx.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Branch not found", code="BRANCH_NOT_FOUND").model_dump(mode="json")
        )
    return branch

# --- Routes ---

@router.get("/branches")
def get_branches(
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get all branches for the current tenant"""
    try:
        query = tenant_scoped_query(ctx, Branch)
        
        # Branch filtering for tenant admins
        if ctx.is_tenant_admin and ctx.user and hasattr(ctx.user, 'branches'):
            user_branch_ids = [b.id for b in ctx.user.branches]
            if user_branch_ids:
                query = query.filter(Branch.id.in_(user_branch_ids))
        
        branches = query.all()
        return ResponseEnvelope(data=[b.to_dict() for b in branches])
    except Exception as e:
        logger.error(f"Get branches error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/branches", status_code=201)
def create_branch(
    branch_in: BranchCreate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Create a new branch"""
    try:
        # Only tenant admins or super admins can create branches
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can create branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        # Determine tenant_id
        tenant_id = ctx.tenant_id
        if not tenant_id:
            tenant_id = branch_in.tenant_id
            if not tenant_id:
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message="tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
                )
        
        # Check branch limits
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Tenant not found", code="TENANT_NOT_FOUND").model_dump(mode="json")
            )
        
        existing_branch_count = Branch.query.filter_by(tenant_id=tenant_id).count()
        max_branches = tenant.max_branches or 1
        
        if existing_branch_count >= max_branches:
            raise HTTPException(
                status_code=403,
                detail=ApiError(
                    message=f"Branch limit reached. Your plan allows {max_branches} branches.",
                    code="BRANCH_LIMIT_REACHED"
                ).model_dump(mode="json")
            )
        
        if not branch_in.name:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Branch name is required", code="NAME_REQUIRED").model_dump(mode="json")
            )
        
        branch = Branch(
            tenant_id=tenant_id,
            name=branch_in.name,
            address=branch_in.address,
            phone=branch_in.phone,
            email=branch_in.email
        )
        
        db_session.add(branch)
        
        # Update counter
        tenant.current_branches = existing_branch_count + 1
        
        db_session.commit()
        
        logger.info(f"Branch created: {branch.id} by {ctx.principal_id}")
        return ResponseEnvelope(data=branch.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: str,
    branch_in: BranchUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Update a branch"""
    try:
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can update branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        branch = get_branch_or_404(db_session, branch_id, ctx)
        data = branch_in.model_dump(exclude_unset=True)
        
        if 'name' in data:
            branch.name = data['name']
        if 'address' in data:
            branch.address = data['address']
        if 'phone' in data:
            branch.phone = data['phone']
        if 'email' in data:
            branch.email = data['email']
        
        db_session.commit()
        
        logger.info(f"Branch updated: {branch.id} by {ctx.principal_id}")
        return ResponseEnvelope(data=branch.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Delete a branch"""
    try:
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can delete branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        branch = get_branch_or_404(db_session, branch_id, ctx)
        
        db_session.delete(branch)
        db_session.commit()
        
        logger.info(f"Branch deleted: {branch_id} by {ctx.principal_id}")
        return ResponseEnvelope(message="Branch deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
