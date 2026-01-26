import pytest
import uuid
from datetime import datetime
from unittest.mock import patch
import hmac
import hashlib
import base64

from core.models.tenant import Tenant
from core.models.user import User
from core.models.party import Party
from core.models.sales import Sale, PaymentRecord

def test_pos_integration(client, db_session, auth_headers):
    # Setup Tenant and User are already handled by conftest or we can do it here
    suffix = str(uuid.uuid4())[:8]
    tenant = db_session.get(Tenant, 'tenant-1')
    if not tenant:
        tenant = Tenant(id='tenant-1', name="Test Tenant", slug=f"test-tenant-{suffix}", owner_email="o@x.com", billing_email="b@x.com")
        db_session.add(tenant)
    
    tenant.settings_json = {
        "pos_integration": {
            "enabled": True,
            "provider": "paytr",
            "merchant_id": "test_merchant",
            "merchant_key": "test_key",
            "merchant_salt": "test_salt",
            "test_mode": True
        }
    }
    db_session.commit()
    
    # Create Patient
    patient = Party(
        id=f"pat_{suffix}",
        tenant_id=tenant.id,
        first_name="Test",
        last_name="Patient",
        phone=f"555{suffix}"
    )
    db_session.add(patient)
    db_session.commit()

    # Create a Sale
    sale = Sale(
        id=f"sale_{suffix}", 
        tenant_id=tenant.id, 
        patient_id=patient.id, 
        total_amount=1000.00, 
        final_amount=1000.00,
        sale_date=datetime.utcnow()
    )
    db_session.add(sale)
    db_session.commit()
    
    # Mock PayTR Service
    with patch('services.paytr_service.PayTRService.generate_token_request') as mock_gen:
        mock_gen.return_value = {
            'iframe_url': 'https://www.paytr.com/iframe/xyz'
        }
        
        response = client.post('/api/payments/pos/paytr/initiate', json={
            'sale_id': sale.id,
            'amount': 1000,
            'installment_count': 1
        }, headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json()['success'] is True
        
        # Check if pending payment record created
        payment_record = db_session.query(PaymentRecord).filter_by(sale_id=sale.id, status='pending').first()
        assert payment_record is not None
        pending_oid = payment_record.pos_transaction_id

    # POS Success Callback
    merchant_oid = pending_oid
    salt = "test_salt"
    merchant_key = "test_key"
    status = "success"
    total_amount = "100000" # 1000.00 TL in pennies
    
    hash_str = f"{merchant_oid}{salt}{status}{total_amount}"
    token = hmac.new(merchant_key.encode(), hash_str.encode(), hashlib.sha256).digest()
    received_hash = base64.b64encode(token).decode()
    
    callback_data = {
        'merchant_oid': merchant_oid,
        'status': status,
        'total_amount': total_amount,
        'hash': received_hash
    }
    
    response = client.post('/api/payments/pos/paytr/callback', data=callback_data)
    assert response.status_code == 200
    assert response.text == "OK"
    
    # Verify Payment Record Status
    db_session.refresh(payment_record)
    assert payment_record.status == 'paid'
