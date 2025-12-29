import os
import sys
import requests
import json
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models.sales import DeviceAssignment, Sale
from models.user import User
from models.patient import Patient

BASE_URL = "http://localhost:5001/api"
ADMIN_EMAIL = "admin@x-ear.com"
ADMIN_PASSWORD = "admin123"

def get_auth_token():
    print(f"🔐 Logging in as {ADMIN_EMAIL}...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get('token') or data.get('access_token')
        print(f"✅ Login successful")
        return token
    print(f"❌ Login failed: {response.text}")
    return None

def test_device_assignment_with_discount():
    """Test device assignment with amount-based discount"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    with app.app_context():
        # Get patient and admin info
        admin = User.query.filter_by(email=ADMIN_EMAIL).first()
        patient = Patient.query.filter_by(tenant_id=admin.tenant_id).first()
        
        if not patient:
            print("❌ No patient found")
            return
            
        print(f"\n📋 Testing with patient: {patient.id}")
        print(f"   Tenant: {admin.tenant_id}")
        
        # Find an inventory item
        from models.inventory import Inventory
        item = Inventory.query.filter_by(tenant_id=admin.tenant_id).first()
        
        if not item:
            print("❌ No inventory item found")
            return
            
        print(f"   Inventory: {item.id} - {item.brand} {item.model} (₺{item.price})")
    
    # Create device assignment via inventory assign endpoint
    print(f"\n🔧 Creating device assignment...")
    assign_payload = {
        "patientId": patient.id,
        "reason": "Sale",
        "ear": "R",
        "basePrice": 20000,
        "sgkScheme": "over18_working",
        "discountType": "amount",
        "discountValue": 2000,
        "downPayment": 5000,
        "paymentMethod": "cash"
    }
    
    print(f"   Payload: {json.dumps(assign_payload, indent=2)}")
    
    assign_resp = requests.post(
        f"{BASE_URL}/inventory/{item.id}/assign",
        json=assign_payload,
        headers=headers
    )
    
    print(f"\n📤 Response Status: {assign_resp.status_code}")
    
    if assign_resp.status_code in [200, 201]:
        data = assign_resp.json()
        print(f"✅ Assignment created successfully")
        print(f"   Response: {json.dumps(data, indent=2)[:500]}")
        
        # Check DB
        with app.app_context():
            # Get latest assignment
            assignment = DeviceAssignment.query.filter_by(
                patient_id=patient.id,
                inventory_id=item.id
            ).order_by(DeviceAssignment.created_at.desc()).first()
            
            if assignment:
                print(f"\n🗄️  DB Check - Device Assignment:")
                print(f"   ID: {assignment.id}")
                print(f"   List Price: ₺{assignment.list_price}")
                print(f"   SGK Support (per ear): ₺{assignment.sgk_support}")
                print(f"   Sale Price (per ear): ₺{assignment.sale_price}")
                print(f"   Net Payable (total): ₺{assignment.net_payable}")
                print(f"   Discount Type: {assignment.discount_type}")
                print(f"   Discount Value: {assignment.discount_value}")
                print(f"   Sale ID: {assignment.sale_id}")
                
                # Test calculations
                expected_sgk = 3391.36  # over18_working
                expected_price_after_sgk = 20000 - expected_sgk
                expected_price_after_discount = expected_price_after_sgk - 2000
                
                print(f"\n🧮 Calculation Verification:")
                print(f"   Expected SGK: ₺{expected_sgk}")
                print(f"   Actual SGK: ₺{float(assignment.sgk_support)}")
                print(f"   ✅ Match" if abs(float(assignment.sgk_support) - expected_sgk) < 1 else "❌ Mismatch")
                
                print(f"\n   Expected Sale Price: ₺{expected_price_after_discount}")
                print(f"   Actual Sale Price: ₺{float(assignment.sale_price)}")
                print(f"   ✅ Match" if abs(float(assignment.sale_price) - expected_price_after_discount) < 1 else "❌ Mismatch")
                
                # Check sale record
                if assignment.sale_id:
                    sale = Sale.query.get(assignment.sale_id)
                    if sale:
                        print(f"\n💰 Sale Record:")
                        print(f"   ID: {sale.id}")
                        print(f"   Paid Amount (from down_payment): ₺{float(sale.paid_amount)}")
                        print(f"   Expected: ₺5000")
                        print(f"   ✅ Match" if abs(float(sale.paid_amount) - 5000) < 1 else "❌ Mismatch")
                        print(f"   Notes (contains KDV): {sale.notes[:100] if sale.notes else 'N/A'}")
                        print(f"   Payment Method: {sale.payment_method}")
                else:
                    print(f"\n⚠️  No sale record linked")
            else:
                print(f"\n❌ No assignment found in DB")
    else:
        print(f"❌ Assignment failed: {assign_resp.text}")

def test_bilateral_sgk():
    """Test bilateral device with SGK to verify SGK amount is per-ear"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    with app.app_context():
        admin = User.query.filter_by(email=ADMIN_EMAIL).first()
        patient = Patient.query.filter_by(tenant_id=admin.tenant_id).first()
        from models.inventory import Inventory
        item = Inventory.query.filter_by(tenant_id=admin.tenant_id).first()
        
        if not patient or not item:
            print("❌ Missing patient or inventory")
            return
    
    print(f"\n\n🔧 Testing Bilateral Device Assignment...")
    assign_payload = {
        "patientId": patient.id,
        "reason": "Sale",
        "ear": "B",  # Bilateral
        "basePrice": 15000,
        "sgkScheme": "under4_parent_working",
        "discountType": "percentage",
        "discountValue": 10,
        "paymentMethod": "installment"
    }
    
    assign_resp = requests.post(
        f"{BASE_URL}/inventory/{item.id}/assign",
        json=assign_payload,
        headers=headers
    )
    
    print(f"📤 Response Status: {assign_resp.status_code}")
    
    if assign_resp.status_code in [200, 201]:
        with app.app_context():
            assignment = DeviceAssignment.query.filter_by(
                patient_id=patient.id,
                inventory_id=item.id,
                ear='B'
            ).order_by(DeviceAssignment.created_at.desc()).first()
            
            if assignment:
                print(f"\n🗄️  DB Check - Bilateral Assignment:")
                print(f"   Ear: {assignment.ear}")
                print(f"   SGK Support (should be PER EAR): ₺{assignment.sgk_support}")
                print(f"   Sale Price (per ear): ₺{assignment.sale_price}")
                print(f"   Net Payable (x2 for bilateral): ₺{assignment.net_payable}")
                
                expected_sgk_per_ear = 6104.44
                print(f"\n   Expected SGK per ear: ₺{expected_sgk_per_ear}")
                print(f"   ✅ SGK is per-ear" if abs(float(assignment.sgk_support) - expected_sgk_per_ear) < 1 else "❌ SGK is doubled!")
    else:
        print(f"❌ Assignment failed: {assign_resp.text}")

if __name__ == "__main__":
    print("="*60)
    print("Testing Device Assignment Fixes")
    print("="*60)
    
    test_device_assignment_with_discount()
    test_bilateral_sgk()
    
    print("\n" + "="*60)
    print("Tests Completed")
    print("="*60)
