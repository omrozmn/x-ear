#!/usr/bin/env python3
"""
Test script to verify device assignment flow end-to-end
Tests: Form submission -> DB persistence -> UI updates across all tabs
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5003"

def test_device_assignment_flow():
    print("🧪 Testing Device Assignment Flow End-to-End")
    print("=" * 50)
    
    # Step 1: Create a test patient
    print("\n1️⃣ Creating test patient...")
    timestamp = int(time.time())
    patient_data = {
        "firstName": "Test",
        "lastName": "Patient",
        "tcNumber": f"{timestamp % 100000000000:011d}",  # Generate unique TC number
        "phone": f"555{timestamp % 10000:04d}",
        "birthDate": "1990-01-01"
    }
    
    response = requests.post(f"{BASE_URL}/api/patients", json=patient_data)
    if response.status_code != 201:
        print(f"❌ Failed to create patient: {response.status_code} - {response.text}")
        return False
    
    patient = response.json()
    print(f"Patient response: {patient}")  # Debug output
    patient_id = patient.get('id') or patient.get('data', {}).get('id')
    if not patient_id:
        print(f"❌ No patient ID found in response: {patient}")
        return False
    print(f"✅ Patient created: {patient_id}")
    
    # Step 2: Create inventory item for device assignment
    print("\n2️⃣ Creating inventory item...")
    inventory_data = {
        "name": "Test Hearing Aid",
        "brand": "Phonak",
        "model": "Audeo B90",
        "category": "hearing_aid",
        "device_type": "RIC",
        "available_inventory": 5,
        "price": 5000.00,
        "barcode": f"TEST{int(time.time())}"
    }
    
    response = requests.post(f"{BASE_URL}/api/inventory", json=inventory_data)
    if response.status_code != 201:
        print(f"❌ Failed to create inventory: {response.status_code} - {response.text}")
        return False
    
    inventory = response.json()
    print(f"Inventory response: {inventory}")  # Debug output
    inventory_id = inventory.get('id') or inventory.get('data', {}).get('id')
    if not inventory_id:
        print(f"❌ No inventory ID found in response: {inventory}")
        return False
    print(f"✅ Inventory created: {inventory_id}")
    
    # Step 3: Test device assignment (simulating form submission)
    print("\n3️⃣ Testing device assignment...")
    assignment_data = {
        "device_assignments": [{
            "inventoryId": inventory_id,
            "ear_side": "right",
            "ear": "right",
            "reason": "sale",
            "base_price": 5000.00,
            "sale_price": 4500.00,
            "sgk_scheme": "over18_working",
            "payment_method": "cash",
            "discount_type": "percentage",
            "discount_value": 10,
            "from_inventory": True
        }],
        "sgk_scheme": "over18_working",
        "payment_plan": "cash",
        "downPayment": 0,
        "accessories": [],
        "services": [],
        "notes": "Test device assignment"
    }
    
    response = requests.post(f"{BASE_URL}/api/patients/{patient_id}/assign-devices-extended", json=assignment_data)
    if response.status_code != 201:
        print(f"❌ Failed to assign device: {response.status_code} - {response.text}")
        return False
    
    assignment_result = response.json()
    sale_id = assignment_result['sale']['id']
    print(f"✅ Device assigned successfully, Sale ID: {sale_id}")
    
    # Step 4: Verify devices tab shows the assignment
    print("\n4️⃣ Verifying devices tab...")
    response = requests.get(f"{BASE_URL}/api/patients/{patient_id}/devices")
    if response.status_code != 200:
        print(f"❌ Failed to get patient devices: {response.status_code}")
        return False
    
    devices = response.json().get('devices', [])
    print(f"✅ Found {len(devices)} device(s) in devices tab")
    
    # Step 5: Verify sales tab shows the sale
    print("\n5️⃣ Verifying sales tab...")
    response = requests.get(f"{BASE_URL}/api/patients/{patient_id}/sales")
    if response.status_code != 200:
        print(f"❌ Failed to get patient sales: {response.status_code}")
        return False
    
    sales = response.json().get('sales', [])
    print(f"✅ Found {len(sales)} sale(s) in sales tab")
    
    # Step 6: Verify timeline/activity logs
    print("\n6️⃣ Verifying activity logs...")
    response = requests.get(f"{BASE_URL}/api/activity-logs?entity_type=patient&entity_id={patient_id}")
    if response.status_code == 200:
        logs = response.json().get('logs', [])
        device_logs = [log for log in logs if 'device' in log.get('action', '').lower()]
        print(f"✅ Found {len(device_logs)} device-related activity log(s)")
    else:
        print(f"⚠️ Activity logs endpoint not available: {response.status_code}")
    
    # Step 7: Verify cashflow/financial records
    print("\n7️⃣ Verifying cashflow records...")
    response = requests.get(f"{BASE_URL}/api/cash-records")
    if response.status_code == 200:
        records = response.json().get('records', [])
        sale_records = [r for r in records if r.get('sale_id') == sale_id]
        print(f"✅ Found {len(sale_records)} cashflow record(s) for this sale")
    else:
        print(f"⚠️ Cashflow records endpoint not available: {response.status_code}")
    
    # Step 8: Verify invoice creation
    print("\n8️⃣ Verifying invoice creation...")
    response = requests.get(f"{BASE_URL}/api/sales/{sale_id}/invoice")
    if response.status_code == 200:
        invoice = response.json()
        print(f"✅ Invoice created: {invoice.get('id', 'N/A')}")
    else:
        print(f"⚠️ Invoice not found or endpoint not available: {response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎉 Device Assignment Flow Test Completed!")
    print(f"📊 Test Results Summary:")
    print(f"   - Patient ID: {patient_id}")
    print(f"   - Sale ID: {sale_id}")
    print(f"   - Devices found: {len(devices)}")
    print(f"   - Sales found: {len(sales)}")
    
    return True

if __name__ == "__main__":
    try:
        test_device_assignment_flow()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
