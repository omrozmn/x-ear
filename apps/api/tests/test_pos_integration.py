
from app import app, db
from models.base import gen_id
from models.user import User
from models.sales import Sale, PaymentRecord
from models.tenant import Tenant
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch
import json
import base64
import hmac
import hashlib

def test_pos_integration():
    with app.app_context():
        # Ensure PaymentRecord table schema is up to date
        PaymentRecord.__table__.drop(db.engine, checkfirst=True)
        db.create_all()
        
        # Setup Tenant and User
        suffix = str(uuid.uuid4())[:8]
        tenant_id = f"tenant_{suffix}"
        
        # Create Tenant with Settings
        tenant = Tenant(
            id=tenant_id, 
            name="Test Tenant", 
            slug=f"test-tenant-{suffix}",
            owner_email=f"owner_{suffix}@x.com",
            billing_email=f"billing_{suffix}@x.com"
        )
        tenant.settings = {
            "pos_integration": {
                "enabled": True,
                "provider": "paytr",
                "merchant_id": "test_merchant",
                "merchant_key": "test_key",
                "merchant_salt": "test_salt",
                "test_mode": True
            }
        }
        db.session.add(tenant)
        
        user = User(username=f"tester_{suffix}", email=f"test_{suffix}@x.com")
        user.tenant_id = tenant_id
        user.set_password("testpass123")
        user.role = "admin" # Grant admin Role
        db.session.add(user)
        db.session.commit()
        
        # Login (Simulate Access Token)
        from flask_jwt_extended import create_access_token
        access_token = create_access_token(identity=user.id, additional_claims={"role": user.role, "tenant_id": tenant_id})
        headers = {'Authorization': f'Bearer {access_token}'}
        
        
        # Create Patient
        from models.patient import Patient
        patient_id = gen_id("pat")
        patient = Patient(
            id=patient_id,
            tenant_id=tenant_id,
            first_name="Test",
            last_name="Patient",
            email=f"test.patient.{suffix}@example.com",
            phone=f"555{suffix}", # Unique phone
            address_full="Test Address 123",
            address_city="Istanbul",
            address_district="Kadikoy"
        )
        db.session.add(patient)
        db.session.commit()

        # Create a Sale
        sale = Sale(
            id=gen_id("sale"), 
            tenant_id=tenant_id, 
            patient_id=patient_id, 
            total_amount=1000.00, 
            final_amount=1000.00,
            sale_date=datetime.utcnow()
        )
        db.session.add(sale)
        db.session.commit()
        
        print("\n=== Test 1: POS Initiation ===")
        
        # Mock PayTR Service
        with patch('routes.payment_integrations.PayTRService') as MockPayTR:
            mock_instance = MockPayTR.return_value
            mock_instance.generate_token_request.return_value = {
                'iframe_url': 'https://www.paytr.com/iframe/xyz'
            }
            mock_instance.get_token.return_value = {
                'success': True,
                'token': 'test_token_xyz'
            }
            
            client = app.test_client()
            response = client.post('/api/payments/pos/paytr/initiate', json={
                'sale_id': sale.id,
                'amount': 1000,
                'installment_count': 1
            }, headers=headers)
            
            print(f"Initiate Response: {response.json}")
            if response.status_code != 200:
                print(f"Error Message: {response.json.get('error')}")
            assert response.status_code == 200
            assert response.json['success'] is True
            # Response does not wrap in data in current implementation
            assert response.json['iframe_url'] == 'https://www.paytr.com/odeme/guvenli/test_token_xyz'
            
            # Check if pending payment record created
            payment_record = PaymentRecord.query.filter_by(sale_id=sale.id, status='pending').first()
            assert payment_record is not None
            assert payment_record.pos_provider == 'paytr'
            assert payment_record.amount == 1000.00
            
            pending_oid = payment_record.pos_transaction_id
            print(f"Pending OID: {pending_oid}")

        print("\n=== Test 2: POS Success Callback ===")
        
        # Calculate Hash for Callback
        # hash_str = merchant_oid + salt + status + total_amount
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
        
        # We need to mock PayTRService validate_callback to return True because inside the route it reconstructs the service
        # Alternatively, we can rely on real logic if our duplicate test code matches the route logic.
        # But inside route, it fetches settings from DB.
        
        response = client.post('/api/payments/pos/paytr/callback', data=callback_data)
        
        print(f"Callback Response: {response.data}")
        assert response.status_code == 200
        assert response.data == b"OK"
        
        # Verify Payment Record Status
        db.session.expire_all()
        payment_record = db.session.get(PaymentRecord, payment_record.id)
        print(f"Payment Status: {payment_record.status}")
        assert payment_record.status == 'paid'
        assert payment_record.pos_status == 'success'
        assert float(payment_record.gross_amount) == 1000.00
        
        # Verify Sale Paid Amount
        sale = db.session.get(Sale, sale.id)
        print(f"Sale Paid Amount: {sale.paid_amount}")
        assert float(sale.paid_amount) == 1000.00
        assert sale.status == 'paid'
        
        print("✅ Success Callback Passed")

        print("\n=== Test 3: POS Fail Callback ===")
        
        # Create another flow for failure
        sale2 = Sale(id=gen_id("sale"), tenant_id=tenant_id, patient_id=patient_id, total_amount=500.00, final_amount=500.00, sale_date=datetime.utcnow())
        db.session.add(sale2)
        db.session.commit()
        
        # Manually create pending record
        fail_oid = "ptr_" + str(uuid.uuid4())
        fail_payment = PaymentRecord(
            id=gen_id("pay"),
            tenant_id=tenant_id,
            sale_id=sale2.id,
            amount=500.00,
            pos_transaction_id=fail_oid,
            status='pending',
            payment_method='card',
            pos_provider='paytr',
            payment_date=datetime.utcnow()
        )
        db.session.add(fail_payment)
        db.session.commit()
        
        # Failed Callback
        status_fail = "failed"
        amount_fail = "50000"
        hash_str_fail = f"{fail_oid}{salt}{status_fail}{amount_fail}"
        token_fail = hmac.new(merchant_key.encode(), hash_str_fail.encode(), hashlib.sha256).digest()
        received_hash_fail = base64.b64encode(token_fail).decode()
        
        callback_fail_data = {
            'merchant_oid': fail_oid,
            'status': status_fail,
            'total_amount': amount_fail,
            'hash': received_hash_fail,
            'failed_reason_msg': 'Insufficient Funds'
        }
        
        response = client.post('/api/payments/pos/paytr/callback', data=callback_fail_data)
        
        assert response.status_code == 200
        assert response.data == b"OK"
        
        db.session.expire_all()
        fail_payment = db.session.get(PaymentRecord, fail_payment.id)
        assert fail_payment.status == 'failed'
        assert fail_payment.error_message == 'Insufficient Funds'
        
        print("✅ Fail Callback Passed")
        
        print("\n=== Test 4: POS Reporting ===")
        
        response = client.get('/api/reports/pos-movements', headers=headers)
        print(f"Report Response Status: {response.status_code}")
        data = response.json
        
        assert response.status_code == 200
        assert data['success'] is True
        # Should have 2 transactions (1 paid, 1 failed)
        movements = data['data']
        print(f"Reported Movements: {len(movements)}")
        assert len(movements) >= 2
        
        summary = data['summary']
        print(f"Summary: {summary}")
        assert summary['success_count'] >= 1
        assert summary['fail_count'] >= 1
        assert summary['total_volume'] >= 1000.00
        
        print("✅ Reporting Passed")

if __name__ == "__main__":
    try:
        test_pos_integration()
        print("\n🎉 ALL POS TESTS PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
