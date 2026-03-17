#!/usr/bin/env python3

import requests
import json

def test_down_payment_sync_direct():
    """Test down payment sync with direct assignment ID"""
    print("🧪 Testing Down Payment Sync - Direct Assignment ID")
    
    # Get token via login
    login_response = requests.post(
        'http://localhost:5003/api/auth/login',
        headers={'Content-Type': 'application/json'},
        json={'email': 'apitest@xear.com', 'password': 'test123'}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json().get('data', {}).get('accessToken')
    if not token:
        print("❌ No access token in login response")
        return False
    
    print(f"✅ Got API token: {token[:30]}...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': f'test-downpayment-{int(__import__("time").time())}'
    }
    
    base_url = 'http://localhost:5003'
    
    # Use known assignment and sale IDs from database
    test_assignment_id = "assign_5c1aaaf7"
    test_sale_id = "2602270101"
    
    print(f"✅ Using test assignment: {test_assignment_id} in sale: {test_sale_id}")
    
    try:
        # Get initial sale state
        print("📊 Getting initial sale state...")
        sale_response = requests.get(f'{base_url}/api/sales/{test_sale_id}', headers=headers)
        if sale_response.status_code == 200:
            initial_paid_amount = sale_response.json().get('data', {}).get('paidAmount')
            print(f"Initial paid_amount: {initial_paid_amount}")
        else:
            print(f"❌ Failed to get initial sale: {sale_response.status_code}")
            print(f"Response: {sale_response.text}")
            return False
        
        # Test down payment update
        test_down_payment = 9999
        print(f"🔄 Updating down payment to {test_down_payment} via API...")
        
        update_data = {
            "downPayment": test_down_payment,
            "notes": f"Direct API test - down payment sync to {test_down_payment}"
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
            
            if float(updated_paid_amount) == float(test_down_payment):
                print("✅ DOWN PAYMENT SYNC SUCCESSFUL!")
                print(f"   Expected: {test_down_payment}")
                print(f"   Actual: {updated_paid_amount}")
                return True
            else:
                print("❌ DOWN PAYMENT SYNC FAILED!")
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
    success = test_down_payment_sync_direct()
    
    if success:
        print("\n🎉 Direct API down payment sync test PASSED!")
    else:
        print("\n❌ Direct API down payment sync test FAILED!")
        exit(1)