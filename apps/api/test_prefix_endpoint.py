#!/usr/bin/env python3
"""Test invoice prefix API endpoints"""
import os
import sys
import requests
import uuid
from dotenv import load_dotenv

# Load environment
api_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(api_dir, '.env'))

API_BASE = "http://localhost:5003/api"

def test_prefix_api():
    print("=== Testing Invoice Prefix API ===\n")
    
    # Step 1: Login as tenant admin
    print("1. Logging in as tenant admin...")
    login_data = {
        "username": "admin@x-ear.com",  # Tenant admin
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        response.raise_for_status()
        token = response.json()["data"]["accessToken"]
        print("✅ Login successful\n")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4())
    }
    
    # Step 2: Get current settings
    print("2. Getting current tenant settings...")
    try:
        response = requests.get(f"{API_BASE}/tenants/current", headers=headers)
        response.raise_for_status()
        current = response.json()
        print(f"✅ Current settings retrieved")
        print(f"   Tenant: {current.get('data', {}).get('name')}")
        print(f"   Settings: {current.get('data', {}).get('settings', {}).get('invoiceIntegration', {})}")
        print(f"   CompanyInfo: {current.get('data', {}).get('companyInfo', {})}\n")
    except Exception as e:
        print(f"❌ Get failed: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}\n")
    
    # Step 3: Update prefix settings
    print("3. Updating invoice prefix and exemption code...")
    update_data = {
        "settings": {
            "invoice_integration": {
                "use_manual_numbering": True,
                "invoice_prefix": "XER",
                "invoice_prefixes": ["XER", "TST", "ABC"]
            }
        },
        "companyInfo": {
            "defaultExemptionCode": "350"
        }
    }
    
    try:
        # Generate new idempotency key for this request
        headers["Idempotency-Key"] = str(uuid.uuid4())
        response = requests.patch(f"{API_BASE}/tenants/current", json=update_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        print("✅ Update successful")
        print(f"   Updated invoiceIntegration: {result.get('data', {}).get('settings', {}).get('invoiceIntegration', {})}")
        print(f"   Updated companyInfo: {result.get('data', {}).get('companyInfo', {})}\n")
    except Exception as e:
        print(f"❌ Update failed: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}\n")
        return False
    
    # Step 4: Verify
    print("4. Verifying the update (simulating page refresh)...")
    try:
        response = requests.get(f"{API_BASE}/tenants/current", headers=headers)
        response.raise_for_status()
        verified = response.json()
        settings = verified.get('data', {}).get('settings', {})
        invoice_settings = settings.get('invoiceIntegration', {})
        company_info = verified.get('data', {}).get('companyInfo', {})
        
        print("✅ Verification successful")
        print(f"   invoice_prefix: {invoice_settings.get('invoicePrefix')}")
        print(f"   invoice_prefixes: {invoice_settings.get('invoicePrefixes')}")
        print(f"   use_manual_numbering: {invoice_settings.get('useManualNumbering')}")
        print(f"   defaultExemptionCode: {company_info.get('defaultExemptionCode')}\n")
        
        # Validate
        assert invoice_settings.get('invoicePrefix') == 'XER', f"Default prefix mismatch: {invoice_settings.get('invoicePrefix')}"
        assert invoice_settings.get('invoicePrefixes') == ['XER', 'TST', 'ABC'], f"Prefixes list mismatch: {invoice_settings.get('invoicePrefixes')}"
        assert invoice_settings.get('useManualNumbering') == True, "Manual numbering not enabled"
        assert company_info.get('defaultExemptionCode') == '350', f"Exemption code mismatch: {company_info.get('defaultExemptionCode')}"
        
        print("✅ All validations passed!")
        print("✅ Data persists correctly (no hard refresh needed)!")
        return True
        
    except AssertionError as e:
        print(f"❌ Validation failed: {e}\n")
        return False
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'No response'}\n")
        return False

if __name__ == "__main__":
    success = test_prefix_api()
    sys.exit(0 if success else 1)
