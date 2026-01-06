"""Admin Marketplaces Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models.marketplace import MarketplaceIntegration, MarketplaceProduct
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/marketplaces", tags=["Admin Marketplaces"])

# Response models
class MarketplaceListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class MarketplaceDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

class IntegrationCreate(BaseModel):
    tenantId: Optional[str] = None
    platform: Optional[str] = None
    name: Optional[str] = None
    apiKey: Optional[str] = None
    apiSecret: Optional[str] = None
    sellerId: Optional[str] = None
    syncStock: Optional[bool] = True
    syncPrices: Optional[bool] = True
    syncOrders: Optional[bool] = True

@router.post("/init-db", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize Marketplace tables"""
    try:
        MarketplaceIntegration.__table__.create(db.get_bind(), checkfirst=True)
        MarketplaceProduct.__table__.create(db.get_bind(), checkfirst=True)
        return {"success": True, "message": "Marketplace tables initialized"}
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations", response_model=MarketplaceListResponse)
async def get_integrations(
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.read", admin_only=True))
):
    """Get list of marketplace integrations"""
    try:
        query = db.query(MarketplaceIntegration)
        if access.tenant_id:
            query = query.filter(MarketplaceIntegration.tenant_id == access.tenant_id)
        integrations = query.all()
        return {"success": True, "data": [i.to_dict() for i in integrations]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrations", response_model=MarketplaceDetailResponse)
async def create_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.manage", admin_only=True))
):
    """Create a new marketplace integration"""
    try:
        integration = MarketplaceIntegration(
            tenant_id=data.tenantId,
            platform=data.platform,
            name=data.name,
            api_key=data.apiKey,
            api_secret=data.apiSecret,
            seller_id=data.sellerId,
            sync_stock=data.syncStock,
            sync_prices=data.syncPrices,
            sync_orders=data.syncOrders
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return {"success": True, "data": integration.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/integrations/{integration_id}/sync", response_model=ResponseEnvelope)
async def sync_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("marketplaces.manage", admin_only=True))
):
    """Trigger sync for an integration"""
    try:
        integration = db.query(MarketplaceIntegration).filter(
            MarketplaceIntegration.id == integration_id
        ).first()
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        integration.last_sync_at = datetime.utcnow()
        integration.status = "connected"
        db.commit()
        return {"success": True, "message": "Sync triggered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
