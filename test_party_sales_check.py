#!/usr/bin/env python3
import requests

BASE_URL = "http://localhost:5003"

def main():
    # Login as super admin
    print("🔐 Logging in as super admin...")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        headers={"Content-Type": "application/json", "Idempotency-Key": "test-sales-1"},
        json={"identifier": "admin@xear.com", "password": "Admin123!"}
    )
    
    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.text[:200]}")
        return
    
    admin_token = login_resp.json()["data"]["accessToken"]
    print("✅ Logged in")
    
    # Impersonate tenant
    print("\n🎭 Impersonating tenant...")
    imp_resp = requests.post(
        f"{BASE_URL}/api/admin/impersonate",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
            "Idempotency-Key": "test-sales-2"
        },
        json={"tenant_id": "95625589-a4ad-41ff-a99e-4955943bb421"}
    )
    
    if imp_resp.status_code != 200:
        print(f"❌ Impersonate failed: {imp_resp.text[:200]}")
        return
    
    tenant_token = imp_resp.json()["data"]["token"]
    print("✅ Impersonated")
    
    # Test party sales endpoint
    print("\n" + "="*60)
    print("TESTING: GET /api/parties/pat_01464a2b/sales")
    print("="*60)
    
    sales_resp = requests.get(
        f"{BASE_URL}/api/parties/pat_01464a2b/sales",
        headers={"Authorization": f"Bearer {tenant_token}"}
    )
    
    print(f"\nStatus: {sales_resp.status_code}")
    
    if sales_resp.status_code == 200:
        data = sales_resp.json()
        sales = data.get('data', [])
        print(f"✅ SUCCESS! Retrieved {len(sales)} sales\n")
        
        if sales:
            sale = sales[0]
            print("First Sale:")
            print(f"  ID: {sale.get('id')}")
            print(f"  Date: {sale.get('saleDate')}")
            
            devices = sale.get('devices', [])
            print(f"  Devices: {len(devices)}")
            
            if devices:
                device = devices[0]
                has_party_id = 'partyId' in device
                print(f"\n{'✅' if has_party_id else '❌'} Device partyId field: {has_party_id}")
                if has_party_id:
                    print(f"  partyId: {device['partyId']}")
                    print(f"  name: {device.get('name')}")
                    print(f"  ear: {device.get('ear')}")
                    print("\n🎉 FIX VERIFIED! Backend returns partyId in devices")
                else:
                    print("  ❌ partyId still missing!")
                    print(f"  Available fields: {list(device.keys())}")
    else:
        print(f"❌ ERROR: {sales_resp.text[:500]}")

if __name__ == "__main__":
    main()
