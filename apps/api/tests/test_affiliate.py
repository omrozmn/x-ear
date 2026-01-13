import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import models.affiliate_user
import models.commission_ledger
models.affiliate_user.Base.metadata.create_all(bind=engine)

def get_test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_affiliate_register_and_login():
    db = next(get_test_db())
    # Registration without IBAN should succeed and generate a referral code
    affiliate = AffiliateService.create_affiliate(db, "test@example.com", "password123")
    assert affiliate.email == "test@example.com"
    assert hasattr(affiliate, 'code') and affiliate.code
    # Login
    user = AffiliateService.authenticate(db, "test@example.com", "password123")
    assert user is not None
    # Invalid IBAN when provided should raise
    with pytest.raises(ValueError):
        AffiliateService.create_affiliate(db, "badiban@example.com", "pw", "INVALIDIBAN")

def test_commission_flow_for_tenant_signup():
    db = next(get_test_db())
    # ensure tables exist in this test run
    models.affiliate_user.Base.metadata.create_all(bind=engine)
    # create affiliate
    affiliate = AffiliateService.create_affiliate(db, "aff2@example.com", "password")
    # simulate tenant signing up via affiliate code
    from services.commission_service import CommissionService
    tenant_id = 1  # in this unit test we don't need a real tenant record
    amount = 1000 * 0.10
    commission = CommissionService.create_commission(db, affiliate.id, tenant_id, 'signup', amount)
    assert commission.affiliate_id == affiliate.id
    assert float(commission.amount) == float(amount)
    # affiliate should see commission in ledger
    commissions = CommissionService.get_commissions_by_affiliate(db, affiliate.id)
    assert len(commissions) == 1
