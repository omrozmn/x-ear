#!/usr/bin/env python3

import requests
import json

def test_new_bilateral_sale():
    """Test creating a new bilateral sale to verify the pricing fix works for new sales"""
    
    base_url = 'http://localhost:5003'
    
    # Use pre-generated token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzI1NTQ2NjksImlhdCI6MTc3MjUyNTg2OSwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.1NjhOuDYmsKxvdqbzc9sjOZmnyFFttKZwmXJIVTSbFA"
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🧪 TESTING NEW BILATERAL SALE CREATION")
    print("=" * 60)
    
    try:
        # First, get a party and product to use
        parties_response = requests.get(f'{base_url}/api/parties', headers=headers)
        if parties_response.status_code != 200:
            print(f"❌ Failed to get parties: {parties_response.status_code}")
            return False
            
        parties = parties_response.json().get('data', [])
        if not parties:
            print("❌ No parties found")
            return False
            
        party_id = parties[0]['id']
        print(f"✅ Using party: {party_id}")
        
        # Get inventory items
        inventory_response = requests.get(f'{base_url}/api/inventory', headers=headers)
        if inventory_response.status_code != 200:
            print(f"❌ Failed to get inventory: {inventory_response.status_code}")
            return False
            
        inventory = inventory_response.json().get('data', [])
        if not inventory:
            print("❌ No inventory items found")
            return False
            
        # Find an item with price >= 10000
        product = None
        for item in inventory:
            if item.get('price', 0) >= 10000:
                product = item
                break
                
        if not product:
            print("❌ No suitable product found (price >= 10000)")
            return False
            
        product_id = product['id']
        unit_price = product['price']
        print(f"✅ Using product: {product_id} (price: {unit_price})")
        
        # Create bilateral sale
        sale_data = {
            "partyId": party_id,
            "productId": product_id,
            "salesPrice": unit_price,
            "earSide": "both",  # This should trigger bilateral logic
            "paymentMethod": "cash",
            "sgkScheme": "over18_working",
            "notes": "Test bilateral sale for pricing fix verification"
        }
        
        # Add Idempotency-Key header
        import uuid
        import time
        idempotency_key = f"test-{int(time.time())}-{uuid.uuid4().hex[:8]}"
        create_headers = {**headers, 'Idempotency-Key': idempotency_key}
        
        print(f"\n📝 Creating bilateral sale...")
        create_response = requests.post(f'{base_url}/api/sales', json=sale_data, headers=create_headers)
        
        if create_response.status_code not in [200, 201]:
            print(f"❌ Failed to create sale: {create_response.status_code}")
            print(create_response.text)
            return False
            
        created_sale = create_response.json().get('data', {})
        new_sale_id = created_sale.get('id')
        print(f"✅ Created sale: {new_sale_id}")
        
        # Verify the created sale has correct pricing
        print(f"\n🔍 Verifying created sale pricing...")
        sale_response = requests.get(f'{base_url}/api/sales/{new_sale_id}', headers=headers)
        
        if sale_response.status_code != 200:
            print(f"❌ Failed to get created sale: {sale_response.status_code}")
            return False
            
        sale_data = sale_response.json().get('data', {})
        
        print(f"Sale-level pricing:")
        print(f"   - unitListPrice: {sale_data.get('unitListPrice')}")
        print(f"   - listPriceTotal: {sale_data.get('listPriceTotal')}")
        print(f"   - actualListPriceTotal: {sale_data.get('actualListPriceTotal')}")
        print(f"   - totalAmount: {sale_data.get('totalAmount')}")
        
        devices = sale_data.get('devices', [])
        print(f"\nDevice-level pricing ({len(devices)} devices):")
        for i, device in enumerate(devices):
            print(f"   Device {i+1} ({device.get('ear')}):")
            print(f"     - listPrice: {device.get('listPrice')}")
            print(f"     - salePrice: {device.get('salePrice')}")
        
        # Verify correctness
        expected_unit_price = float(unit_price)
        expected_total_price = expected_unit_price * 2
        expected_device_count = 2
        
        success = True
        
        # Check sale-level prices
        if sale_data.get('unitListPrice') != expected_unit_price:
            print(f"❌ Sale unitListPrice wrong: {sale_data.get('unitListPrice')} != {expected_unit_price}")
            success = False
        else:
            print(f"✅ Sale unitListPrice correct: {expected_unit_price}")
        
        if sale_data.get('actualListPriceTotal') != expected_total_price:
            print(f"❌ Sale actualListPriceTotal wrong: {sale_data.get('actualListPriceTotal')} != {expected_total_price}")
            success = False
        else:
            print(f"✅ Sale actualListPriceTotal correct: {expected_total_price}")
        
        # Check device count
        if len(devices) != expected_device_count:
            print(f"❌ Expected {expected_device_count} devices, found {len(devices)}")
            success = False
        else:
            print(f"✅ Correct number of devices: {expected_device_count}")
        
        # Check device-level prices
        for i, device in enumerate(devices):
            device_list_price = device.get('listPrice')
            if device_list_price != expected_unit_price:
                print(f"❌ Device {i+1} listPrice wrong: {device_list_price} != {expected_unit_price}")
                success = False
            else:
                print(f"✅ Device {i+1} listPrice correct: {expected_unit_price}")
        
        print(f"\n{'✅ NEW BILATERAL SALE PRICING CORRECT!' if success else '❌ NEW BILATERAL SALE PRICING FAILED!'}")
        
        # Clean up - delete the test sale
        print(f"\n🧹 Cleaning up test sale...")
        delete_response = requests.delete(f'{base_url}/api/sales/{new_sale_id}', headers=headers)
        if delete_response.status_code in [200, 204]:
            print(f"✅ Test sale deleted")
        else:
            print(f"⚠️ Could not delete test sale: {delete_response.status_code}")
        
        return success
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_new_bilateral_sale()
    exit(0 if success else 1)