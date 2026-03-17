import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import gen_id
from core.models.purchase import Purchase
from core.models.sales import PaymentRecord
from core.models.suppliers import Supplier
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Purchases"])


class ManualPurchaseCreate(BaseModel):
    supplierId: str
    totalAmount: float
    purchaseDate: Optional[str] = None
    paymentMethod: Optional[str] = None
    paidAmount: float = 0
    notes: Optional[str] = None
    referenceNumber: Optional[str] = None
    productName: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ManualPurchasePaymentCreate(BaseModel):
    purchaseIds: list[str]
    paymentMethod: str
    paymentDate: Optional[str] = None
    amount: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)


def _parse_date(value: Optional[str]) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def _get_paid_amounts(db: Session, tenant_id: Optional[str], purchase_ids: list[str]) -> dict[str, float]:
    if not purchase_ids:
        return {}

    query = (
        db.query(
            PaymentRecord.reference_number,
            func.coalesce(func.sum(func.abs(PaymentRecord.amount)), 0),
        )
        .filter(PaymentRecord.reference_number.in_(purchase_ids))
        .filter(PaymentRecord.payment_type == "purchase_payment")
    )
    if tenant_id:
        query = query.filter(PaymentRecord.tenant_id == tenant_id)

    rows = query.group_by(PaymentRecord.reference_number).all()
    return {str(reference): float(amount or 0) for reference, amount in rows if reference}


def _serialize_purchase(purchase: Purchase, paid_amount: float) -> dict[str, Any]:
    total_amount = float(purchase.total_amount or 0)
    remaining_amount = max(0.0, total_amount - paid_amount)

    if remaining_amount <= 0:
        payment_status = "PAID"
    elif paid_amount > 0:
        payment_status = "PARTIAL"
    else:
        payment_status = "APPROVED"

    return {
        "id": purchase.id,
        "supplierId": str(purchase.supplier_id),
        "supplierName": purchase.supplier.company_name if purchase.supplier else "-",
        "purchaseDate": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
        "totalAmount": total_amount,
        "paidAmount": paid_amount,
        "remainingAmount": remaining_amount,
        "currency": purchase.currency or "TRY",
        "status": payment_status,
        "paymentMethod": None,
        "notes": purchase.notes,
        "referenceNumber": purchase.reference_number,
        "createdAt": purchase.created_at.isoformat() if purchase.created_at else None,
        "productName": None,
    }


def _create_purchase_payment(
    db: Session,
    *,
    purchase: Purchase,
    tenant_id: Optional[str],
    amount: float,
    payment_method: str,
    payment_date: datetime,
) -> None:
    if amount <= 0:
        return

    payment = PaymentRecord(
        id=gen_id("payment"),
        tenant_id=tenant_id,
        amount=Decimal(str(-abs(amount))),
        payment_date=payment_date,
        payment_method=payment_method,
        payment_type="purchase_payment",
        status="paid",
        reference_number=purchase.id,
        notes=f"Manuel alış ödemesi - {purchase.supplier.company_name if purchase.supplier else purchase.id}",
    )
    db.add(payment)


@router.get("/purchases/manual", operation_id="listManualPurchases")
def list_manual_purchases(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("purchases.view")),
):
    query = db.query(Purchase).filter(Purchase.created_from_invoice.is_(False))
    if access.tenant_id:
        query = query.filter(Purchase.tenant_id == access.tenant_id)

    purchases = query.order_by(Purchase.purchase_date.desc()).all()
    paid_amounts = _get_paid_amounts(db, access.tenant_id, [purchase.id for purchase in purchases])

    data = [_serialize_purchase(purchase, paid_amounts.get(purchase.id, 0.0)) for purchase in purchases]
    return ResponseEnvelope(data=data, meta={"count": len(data)})


@router.post("/purchases/manual", operation_id="createManualPurchase")
def create_manual_purchase(
    payload: ManualPurchaseCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("purchases.create")),
):
    supplier = db.get(Supplier, int(payload.supplierId))
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if access.tenant_id and supplier.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    purchase = Purchase(
        id=gen_id("purch"),
        tenant_id=access.tenant_id,
        supplier_id=str(supplier.id),
        purchase_date=_parse_date(payload.purchaseDate),
        total_amount=Decimal(str(payload.totalAmount)),
        currency="TRY",
        status="approved",
        created_from_invoice=False,
        created_by=access.user_id,
        notes=payload.notes,
        reference_number=payload.referenceNumber,
    )
    db.add(purchase)
    db.flush()

    paid_amount = max(0.0, float(payload.paidAmount or 0))
    if paid_amount > 0:
        _create_purchase_payment(
            db,
            purchase=purchase,
            tenant_id=access.tenant_id,
            amount=min(paid_amount, float(payload.totalAmount)),
            payment_method=payload.paymentMethod or "cash",
            payment_date=_parse_date(payload.purchaseDate),
        )

    db.commit()
    db.refresh(purchase)

    return ResponseEnvelope(
        data=_serialize_purchase(purchase, min(paid_amount, float(payload.totalAmount))),
        message="Manual purchase created successfully",
    )


@router.post("/purchases/manual/record-payment", operation_id="recordManualPurchasePayment")
def record_manual_purchase_payment(
    payload: ManualPurchasePaymentCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("purchases.edit")),
):
    if not payload.purchaseIds:
        raise HTTPException(status_code=400, detail="purchaseIds is required")

    query = db.query(Purchase).filter(
        Purchase.id.in_(payload.purchaseIds),
        Purchase.created_from_invoice.is_(False),
    )
    if access.tenant_id:
        query = query.filter(Purchase.tenant_id == access.tenant_id)

    purchases = query.all()
    if len(purchases) != len(payload.purchaseIds):
        raise HTTPException(status_code=404, detail="Purchase not found")

    paid_amounts = _get_paid_amounts(db, access.tenant_id, [purchase.id for purchase in purchases])
    payment_date = _parse_date(payload.paymentDate)

    if len(purchases) > 1 and payload.amount is not None:
        raise HTTPException(status_code=400, detail="Bulk payments only support full remaining amount")

    for purchase in purchases:
        total_amount = float(purchase.total_amount or 0)
        paid_amount = paid_amounts.get(purchase.id, 0.0)
        remaining_amount = max(0.0, total_amount - paid_amount)
        amount = remaining_amount if payload.amount is None else min(float(payload.amount), remaining_amount)

        if amount <= 0:
            continue

        _create_purchase_payment(
            db,
            purchase=purchase,
            tenant_id=access.tenant_id,
            amount=amount,
            payment_method=payload.paymentMethod,
            payment_date=payment_date,
        )

    db.commit()

    refreshed = query.all()
    refreshed_paid_amounts = _get_paid_amounts(db, access.tenant_id, [purchase.id for purchase in refreshed])
    return ResponseEnvelope(
        data=[_serialize_purchase(purchase, refreshed_paid_amounts.get(purchase.id, 0.0)) for purchase in refreshed],
        message="Purchase payment recorded successfully",
    )
