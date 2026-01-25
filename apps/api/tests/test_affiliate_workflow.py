
import pytest
import uuid
from core.models.plan import Plan
from core.models.affiliate_user import AffiliateUser
from core.models.tenant import Tenant
from core.models.commission_ledger import CommissionLedger

def test_full_affiliate_workflow(client, db_session):
    # 1. Register Affiliate
    affiliate_email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    aff_resp = client.post('/api/affiliates/register', json={
        'email': affiliate_email, 
        'password': 'password123',
        'iban': 'TR260006100000000000000000'
    })
    assert aff_resp.status_code == 201
    
    affiliate = db_session.query(AffiliateUser).filter_by(email=affiliate_email).first()
    referral_code = affiliate.code
    affiliate_id = affiliate.id

    # 2. Create Plan
    plan = Plan(
        id=f"plan_{uuid.uuid4().hex[:8]}",
        name="Pro Plan", 
        slug=f"pro-plan-{uuid.uuid4().hex[:4]}", 
        price=1000.0, 
        plan_type="PRO",
        billing_interval="YEARLY",
        is_active=True,
        is_public=True
    )
    db_session.add(plan)
    db_session.commit()
    plan_id = plan.id

    # 3. Register Tenant with Referral Code
    tenant_email = f'test_{uuid.uuid4().hex[:8]}@example.com'
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
    
    assert sub_resp.status_code == 201
    
    # 4. Verify Tenant Setup
    tenant = db_session.query(Tenant).filter_by(owner_email=tenant_email).first()
    assert tenant is not None
    assert tenant.affiliate_id == affiliate_id
    
    # 5. Verify Commission Ledger
    commission = db_session.query(CommissionLedger).filter_by(
        affiliate_id=affiliate_id,
        tenant_id=tenant.id,
        event='signup_subscription'
    ).first()
    
    assert commission is not None
    assert float(commission.amount) == 100.0
