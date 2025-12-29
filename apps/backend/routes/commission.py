from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.commission_ledger import CommissionLedger
from services.commission_service import CommissionService
from db import get_db
from typing import List

router = APIRouter(prefix="/commission", tags=["commission"])

@router.post("/create", response_model=None)
def create_commission(affiliate_id: int, tenant_id: int, event: str, amount: float, db: Session = Depends(get_db)):
    try:
        commission = CommissionService.create_commission(db, affiliate_id, tenant_id, event, amount)
        return {"id": commission.id, "status": commission.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/update-status", response_model=None)
def update_commission_status(commission_id: int, status: str, db: Session = Depends(get_db)):
    commission = CommissionService.update_commission_status(db, commission_id, status)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"id": commission.id, "status": commission.status}

@router.get("/by-affiliate", response_model=List[dict])
def get_commissions_by_affiliate(affiliate_id: int, db: Session = Depends(get_db)):
    commissions = CommissionService.get_commissions_by_affiliate(db, affiliate_id)
    return [{"id": c.id, "tenant_id": c.tenant_id, "event": c.event, "amount": float(c.amount), "status": c.status, "created_at": c.created_at} for c in commissions]

@router.get("/audit", response_model=None)
def audit_trail(commission_id: int, db: Session = Depends(get_db)):
    commission = CommissionService.audit_trail(db, commission_id)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"id": commission.id, "status": commission.status, "created_at": commission.created_at, "updated_at": commission.updated_at}
