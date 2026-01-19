from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from models.order import Order, OrderItem
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])


from schemas.orders import CreateOrderRequest, OrderRead


@router.post("/init-db", operation_id="createOrderInitDb", response_model=dict)
def init_db(access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True)), db: Session = Depends(get_db)):
    try:
        Order.__table__.create(db.get_bind(), checkfirst=True)
        OrderItem.__table__.create(db.get_bind(), checkfirst=True)
        return {"success": True}
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201, operation_id="createOrder", response_model=ResponseEnvelope[OrderRead])
def create_order(req: CreateOrderRequest, access: UnifiedAccess = Depends(require_access()), db: Session = Depends(get_db)):
    try:
        tenant_id = access.tenant_id or None
        order = Order(
            tenant_id=tenant_id,
            customer_id=req.customer_id,
            order_number=f"ORD-{int(__import__('time').time())}",
            total_amount=sum(i.quantity * i.unit_price for i in req.items),
            status='new'
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        for it in req.items:
            item = OrderItem(order_id=order.id, product_type=it.product_type, product_id=it.product_id, quantity=it.quantity, unit_price=it.unit_price)
            db.add(item)
        db.commit()

        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=OrderRead.model_validate(order))
    except Exception as e:
        db.rollback()
        logger.error(f"Create order failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}", operation_id="getOrder", response_model=ResponseEnvelope[OrderRead])
def get_order(order_id: str, access: UnifiedAccess = Depends(require_access()), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data=OrderRead.model_validate(order))
