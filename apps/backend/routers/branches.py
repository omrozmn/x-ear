"""
FastAPI Branches Router - Migrated from Flask routes/branches.py
Branch CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope, ApiError
from schemas.branches import BranchRead
from models.branch import Branch
from models.tenant import Tenant

from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

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

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def get_branch_or_404(db_session: Session, branch_id: str, access: UnifiedAccess) -> Branch:
    """Get branch or raise 404"""
    branch = db_session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Branch not found", code="BRANCH_NOT_FOUND").model_dump(mode="json")
        )
    if access.tenant_id and branch.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Branch not found", code="BRANCH_NOT_FOUND").model_dump(mode="json")
        )
    return branch

# --- Routes ---

@router.get("/branches", operation_id="listBranches", response_model=ResponseEnvelope[List[BranchRead]])
def get_branches(
    tenant_id: Optional[str] = Query(None, alias="tenantId"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get all branches for the current tenant"""
    try:
        query = db_session.query(Branch)
        
        # Determine which tenant to filter by
        effective_tenant_id = access.tenant_id
        
        # Super admin can optionally filter by tenant_id query param
        if access.is_super_admin and tenant_id:
            effective_tenant_id = tenant_id
        
        # Always filter by tenant for non-super admins, or when tenant_id is specified
        if effective_tenant_id:
            query = query.filter(Branch.tenant_id == effective_tenant_id)
        elif not access.is_super_admin:
            # Non-super admin without tenant_id should see nothing
            return ResponseEnvelope(data=[])
        
        # Branch filtering for tenant admins
        if access.is_tenant_admin and access.user and hasattr(access.user, 'branches'):
            user_branch_ids = [b.id for b in access.user.branches]
            if user_branch_ids:
                query = query.filter(Branch.id.in_(user_branch_ids))
        
        branches = query.all()
        return ResponseEnvelope(data=[b.to_dict() for b in branches])
    except Exception as e:
        logger.error(f"Get branches error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/branches", operation_id="createBranches", status_code=201, response_model=ResponseEnvelope[BranchRead])
def create_branch(
    branch_in: BranchCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new branch"""
    try:
        # Only tenant admins or super admins can create branches
        if not access.is_super_admin and not access.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can create branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        # Determine access.tenant_id
        access.tenant_id = access.tenant_id
        if not access.tenant_id:
            access.tenant_id = branch_in.tenant_id
            if not access.tenant_id:
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message="access.tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
                )
        
        # Check branch limits
        tenant = db_session.get(Tenant, access.tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Tenant not found", code="TENANT_NOT_FOUND").model_dump(mode="json")
            )
        
        existing_branch_count = db_session.query(Branch).filter_by(tenant_id=access.tenant_id).count()
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
            tenant_id=access.tenant_id,
            name=branch_in.name,
            address=branch_in.address,
            phone=branch_in.phone,
            email=branch_in.email
        )
        
        db_session.add(branch)
        
        # Update counter
        tenant.current_branches = existing_branch_count + 1
        
        db_session.commit()
        
        logger.info(f"Branch created: {branch.id} by {access.user_id}")
        return ResponseEnvelope(data=branch.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/branches/{branch_id}", operation_id="updateBranch", response_model=ResponseEnvelope[BranchRead])
def update_branch(
    branch_id: str,
    branch_in: BranchUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a branch"""
    try:
        if not access.is_super_admin and not access.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can update branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        branch = get_branch_or_404(db_session, branch_id, access)
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
        
        logger.info(f"Branch updated: {branch.id} by {access.user_id}")
        return ResponseEnvelope(data=branch.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/branches/{branch_id}", operation_id="deleteBranch")
def delete_branch(
    branch_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Delete a branch"""
    try:
        if not access.is_super_admin and not access.is_tenant_admin:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only tenant admins can delete branches", code="FORBIDDEN").model_dump(mode="json")
            )
        
        branch = get_branch_or_404(db_session, branch_id, access)
        
        db_session.delete(branch)
        db_session.commit()
        
        logger.info(f"Branch deleted: {branch_id} by {access.user_id}")
        return ResponseEnvelope(message="Branch deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete branch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
