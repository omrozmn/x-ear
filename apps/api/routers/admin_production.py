"""Admin Production Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging

from database import get_db
from models.production_order import ProductionOrder
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/production", tags=["Admin Production"])

class OrderStatusUpdate(BaseModel):
    status: str

@router.post("/init-db", operation_id="createAdminProductionInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize Production Orders table"""
    try:
        ProductionOrder.__table__.create(db.get_bind(), checkfirst=True)
        return {"success": True, "message": "Production Orders table initialized"}
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", operation_id="listAdminProductionOrders", response_model=ResponseEnvelope)
async def get_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("production.read", admin_only=True))
):
    """Get production orders"""
    try:
        query = db.query(ProductionOrder)
        if status:
            query = query.filter(ProductionOrder.status == status)
        orders = query.order_by(ProductionOrder.created_at.desc()).all()
        return {"success": True, "data": [o.to_dict() for o in orders]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/orders/{order_id}/status", operation_id="updateAdminProductionOrderStatus", response_model=ResponseEnvelope)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("production.manage", admin_only=True))
):
    """Update order status"""
    try:
        order = db.query(ProductionOrder).filter(ProductionOrder.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if data.status:
            order.status = data.status
            db.commit()
        return {"success": True, "data": order.to_dict(), "message": "Order status updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
