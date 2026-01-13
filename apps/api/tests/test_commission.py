import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.commission_ledger import CommissionLedger
from services.commission_service import CommissionService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from models.affiliate_user import AffiliateUser
from models.base import Base
Base.metadata.create_all(bind=engine)

def get_test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_commission_create_and_update():
    db = next(get_test_db())
    # Create
    commission = CommissionService.create_commission(db, 1, 1, "signup", 100.0)
    assert commission.amount == 100.0
    # Update status
    updated = CommissionService.update_commission_status(db, commission.id, "paid")
    assert updated.status == "paid"
    # Audit trail
    audit = CommissionService.audit_trail(db, commission.id)
    assert audit.id == commission.id
