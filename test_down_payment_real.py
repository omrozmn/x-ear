#!/usr/bin/env python3

import requests
import json
import subprocess

def get_token():
    """Get clean token"""
    result = subprocess.run(['python3', 'get_token_final.py'], 
                          capture_output=True, text=True, cwd='.')
    output = result.stdout.strip()
    # Get the last line which should be the token
    lines = output.split('\n')
    for line in reversed(lines):
        line = line.strip()
        if line.startswith('eyJ'):
            return line
    return None

def test_down_payment_sync():
    """Test down payment sync with real API"""
    print("🧪 Testing Down Payment Sync - Real API Test")
    
    token = get_token()
    if not token:
        print("❌ Failed to get token")
        return False
    
    print(f"✅ Got token: {token[:30]}...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    base_url = 'http://localhost:5003'
    
    try:
        # Get existing sales
        print("📊 Getting existing sales...")
        response = requests.get(f'{base_url}/api/sales', headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to get sales: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        sales_data = response.json()
        sales = sales_data.get('data', [])
        
        if not sales:
            print("❌ No sales found")
            return False
        
        # Find a sale with device assignments
        test_assignment_id = None
        test_sale_id = None
        
        for sale in sales:
            device_assignments = sale.get('deviceAssignments', [])
            if device_assignments:
                test_assignment_id = device_assignments[0]['id']
                test_sale_id = sale['id']
                print(f"✅ Found test assignment: {test_assignment_id} in sale: {test_sale_id}")
                break
        
        if not test_assignment_id:
            print("❌ No device assignments found")
            return False
        
        # Get initial state
        print("📊 Getting initial sale state...")
        sale_response = requests.get(f'{base_url}/api/sales/{test_sale_id}', headers=headers)
        if sale_response.status_code == 200:
            initial_paid_amount = sale_response.json().get('data', {}).get('paidAmount')
            print(f"Initial paid_amount: {initial_paid_amount}")
        else:
            print(f"❌ Failed to get initial sale: {sale_response.status_code}")
            return False
        
        # Test down payment update
        test_down_payment = 9999
        print(f"🔄 Updating down payment to {test_down_payment}...")
        
        update_data = {
            "downPayment": test_down_payment,
            "notes": f"Real API test - down payment sync to {test_down_payment}"
        }
        
        print(f"📤 Sending update: {json.dumps(update_data, indent=2)}")
        
        update_response = requests.patch(
            f'{base_url}/api/device-assignments/{test_assignment_id}',
            headers=headers,
            json=update_data
        )
        
        print(f"📥 Update response status: {update_response.status_code}")
        
        if update_response.status_code != 200:
            print(f"❌ Update failed: {update_response.text}")
            return False
        
        update_result = update_response.json()
        print(f"✅ Update successful: {update_result.get('message', 'No message')}")
        
        # Check if sale was updated
        print("📊 Checking updated sale state...")
        updated_sale_response = requests.get(f'{base_url}/api/sales/{test_sale_id}', headers=headers)
        
        if updated_sale_response.status_code == 200:
            updated_paid_amount = updated_sale_response.json().get('data', {}).get('paidAmount')
            print(f"Updated paid_amount: {updated_paid_amount}")
            
            if str(updated_paid_amount) == str(test_down_payment):
                print(f"✅ DOWN PAYMENT SYNC SUCCESSFUL!")
                print(f"   Expected: {test_down_payment}")
                print(f"   Actual: {updated_paid_amount}")
                return True
            else:
                print(f"❌ DOWN PAYMENT SYNC FAILED!")
                print(f"   Expected: {test_down_payment}")
                print(f"   Actual: {updated_paid_amount}")
                
                # Debug: Check payment records
                print("🔍 Checking payment records...")
                payments_response = requests.get(f'{base_url}/api/sales/{test_sale_id}/payments', headers=headers)
                if payments_response.status_code == 200:
                    payments = payments_response.json().get('data', [])
                    print(f"Payment records: {json.dumps(payments, indent=2)}")
                else:
                    print(f"Failed to get payment records: {payments_response.status_code}")
                
                return False
        else:
            print(f"❌ Failed to get updated sale: {updated_sale_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_down_payment_sync()
    
    if success:
        print("\n🎉 Down payment sync test PASSED!")
    else:
        print("\n❌ Down payment sync test FAILED!")
        exit(1)