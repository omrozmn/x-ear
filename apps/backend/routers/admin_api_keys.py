"""Admin API Keys Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models.api_key import ApiKey
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.api_keys import ApiKeyCreate, ApiKeyRead
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/api-keys", tags=["Admin API Keys"])

# Response models
class ApiKeyListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class ApiKeyDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.post("/init-db", operation_id="createAdminApiKeyInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize API Key table"""
    try:
        ApiKey.__table__.create(db.get_bind(), checkfirst=True)
        return {"success": True, "message": "API Key table initialized"}
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=ApiKeyListResponse)
async def get_api_keys(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.read", admin_only=True))
):
    """Get list of API keys"""
    try:
        query = db.query(ApiKey)
        
        if access.tenant_id:
            query = query.filter(ApiKey.tenant_id == access.tenant_id)
        
        total = query.count()
        keys = query.order_by(ApiKey.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return {
            "success": True,
            "data": {
                "keys": [k.to_dict() for k in keys],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) // limit
                }
            }
        }
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=ApiKeyDetailResponse)
async def create_api_key(
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
    """Create a new API key"""
    try:
        if not data.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant ID is required")
        
        api_key = ApiKey(
            name=data.name,
            tenant_id=data.tenant_id,
            created_by=access.user.get("id"),
            scopes=",".join(data.scopes) if data.scopes else "",
            rate_limit=data.rate_limit
        )
        
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        return {"success": True, "data": api_key.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create API key error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{key_id}", operation_id="deleteAdminApiKey", response_model=ResponseEnvelope)
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
    """Revoke (delete) an API key"""
    try:
        key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if not key:
            raise HTTPException(status_code=404, detail="API Key not found")
        
        db.delete(key)
        db.commit()
        
        return {"success": True, "message": "API Key revoked"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Revoke API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
