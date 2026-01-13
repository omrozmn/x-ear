from sqlalchemy.orm import Session
from models.commission_ledger import CommissionLedger
from typing import Optional, List
from datetime import datetime

class CommissionService:
    @staticmethod
    def create_commission(db: Session, affiliate_id: int, tenant_id: int, event: str, amount: float, status: str = 'pending') -> CommissionLedger:
        commission = CommissionLedger(
            affiliate_id=affiliate_id,
            tenant_id=tenant_id,
            event=event,
            amount=amount,
            status=status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(commission)
        db.commit()
        db.refresh(commission)
        return commission

    @staticmethod
    def update_commission_status(db: Session, commission_id: int, status: str) -> Optional[CommissionLedger]:
        commission = db.query(CommissionLedger).filter_by(id=commission_id).first()
        if commission:
            commission.status = status
            commission.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(commission)
        return commission

    @staticmethod
    def get_commissions_by_affiliate(db: Session, affiliate_id: int) -> List[CommissionLedger]:
        return db.query(CommissionLedger).filter_by(affiliate_id=affiliate_id).all()

    @staticmethod
    def audit_trail(db: Session, commission_id: int) -> Optional[CommissionLedger]:
        # For now, just return the commission. Extend for full audit logging.
        return db.query(CommissionLedger).filter_by(id=commission_id).first()
