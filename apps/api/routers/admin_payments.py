"""Admin Payments Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime
import logging

from database import get_db
from core.database import unbound_session
from models.sales import PaymentRecord
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope
from schemas.sales import PaymentRecordRead
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/payments", tags=["Admin Payments"])

@router.get("/pos/transactions", operation_id="listAdminPaymentPoTransactions")
async def get_pos_transactions(
    provider: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("payments.read", admin_only=True))
):
    """Get all POS transactions for admin panel with optional search"""
    try:
        with unbound_session(reason="admin-cross-tenant"):
            query = db.query(PaymentRecord)

            if provider:
                query = query.filter(PaymentRecord.pos_provider == provider)

            if start_date:
                try:
                    s_dt = datetime.fromisoformat(start_date)
                    query = query.filter(PaymentRecord.payment_date >= s_dt)
                except (ValueError, TypeError):
                    pass

            if end_date:
                try:
                    e_dt = datetime.fromisoformat(end_date)
                    query = query.filter(PaymentRecord.payment_date <= e_dt)
                except (ValueError, TypeError):
                    pass

            if search:
                search_term = f"%{search}%"
                from core.models.party import Party
                query = query.outerjoin(Party, PaymentRecord.party_id == Party.id).filter(
                    or_(
                        PaymentRecord.pos_transaction_id.ilike(search_term),
                        PaymentRecord.reference_number.ilike(search_term),
                        Party.first_name.ilike(search_term),
                        Party.last_name.ilike(search_term),
                    )
                )

            records = query.order_by(PaymentRecord.payment_date.desc()).limit(limit).all()

        return ResponseEnvelope(data=[
            PaymentRecordRead.model_validate(p)
            for p in records
        ])
    except Exception as e:
        logger.error(f"Admin get POS transactions error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
