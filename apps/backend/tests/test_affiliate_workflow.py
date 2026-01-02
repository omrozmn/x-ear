
from app import app
from models.base import db
from models.plan import Plan
from models.affiliate_user import AffiliateUser
from models.tenant import Tenant
from models.commission_ledger import CommissionLedger
from models.user import User
import pytest
import uuid
import json

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    # Disable global query filter for tests
    from utils.tenant_security import _skip_filter
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            _skip_filter.set(True)  # Skip tenant filter for setup/verification
            yield client
            db.session.remove()
            db.drop_all()

def generate_email():
    return f'test_{uuid.uuid4().hex[:8]}@example.com'

def test_full_affiliate_workflow(client):
    """
    Test the complete affiliate workflow:
    1. Register Affiliate
    2. Create Plan
    3. Register Tenant with Referral Code
    4. Verify Commission Generated
    """
    
    # 1. Register Affiliate
    affiliate_email = generate_email()
    print(f"DEBUG: Registering affiliate {affiliate_email}")
    aff_resp = client.post('/api/affiliate/register', json={
        'email': affiliate_email, 
        'password': 'password123',
        'iban': 'TR260006100000000000000000'
    })
    assert aff_resp.status_code == 201, f"Affiliate register failed: {aff_resp.get_json()}"
    
    # Get affiliate code from DB directly or login
    with app.app_context():
        affiliate = AffiliateUser.query.filter_by(email=affiliate_email).first()
        assert affiliate is not None
        referral_code = affiliate.code
        affiliate_id = affiliate.id
        print(f"DEBUG: Affiliate registered with code: {referral_code}")

    # 2. Create Plan (Direct DB insertion)
    with app.app_context():
        # Ensure we don't have existing plan
        plan = Plan(
            name="Pro Plan", 
            slug="pro-plan", 
            price=1000.0, 
            plan_type="PRO",
            billing_interval="YEARLY",
            is_active=True,
            is_public=True
        )
        db.session.add(plan)
        db.session.commit()
        plan_id = plan.id
        print(f"DEBUG: Created plan with ID: {plan_id}")

    # 3. Register Tenant with Referral Code
    tenant_email = generate_email()
    print(f"DEBUG: Registering tenant {tenant_email} with referral code {referral_code}")
    
    sub_resp = client.post('/api/subscriptions/register-and-subscribe', json={
        'company_name': 'Test Company',
        'email': tenant_email,
        'phone': '5551234567',
        'password': 'password123',
        'plan_id': plan_id,
        'billing_interval': 'YEARLY',
        'referral_code': referral_code,
        'card_number': '1234567812345678'
    })
    
    assert sub_resp.status_code == 201, f"Subscription failed: {sub_resp.get_json()}"
    
    # 4. Verify Tenant Setup
    with app.app_context():
        tenant = Tenant.query.filter_by(owner_email=tenant_email).first()
        assert tenant is not None
        assert tenant.affiliate_id == affiliate_id
        assert tenant.referral_code == referral_code
        print("DEBUG: Tenant correctly linked to affiliate")
        
        # 5. Verify Commission Ledger
        # Expected commission: 10% of 1000 = 100.0
        commission = CommissionLedger.query.filter_by(
            affiliate_id=affiliate_id,
            tenant_id=tenant.id,
            event='signup_subscription'
        ).first()
        
        assert commission is not None, "Commission record not found"
        assert float(commission.amount) == 100.0
        assert commission.status == 'pending'
        print(f"DEBUG: Commission verified: {commission.amount} for affiliate {affiliate_id}")
