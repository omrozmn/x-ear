import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import models.affiliate_user
models.affiliate_user.Base.metadata.create_all(bind=engine)

def get_test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_affiliate_register_and_login():
    db = next(get_test_db())
    # Valid IBAN
    affiliate = AffiliateService.create_affiliate(db, "test@example.com", "password123", "TR330006100519786457841326")
    assert affiliate.email == "test@example.com"
    # Login
    user = AffiliateService.authenticate(db, "test@example.com", "password123")
    assert user is not None
    # Invalid IBAN
    with pytest.raises(ValueError):
        AffiliateService.create_affiliate(db, "badiban@example.com", "pw", "INVALIDIBAN")
