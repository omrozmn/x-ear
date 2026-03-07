#!/usr/bin/env python3
"""
Set BirFatura credentials for deneme tenant and sync incoming invoices.
"""
import sqlite3
import json
import os
import sys

# Add api path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

DB_PATH = "instance/xear_crm.db"
TENANT_ID = "95625589-a4ad-41ff-a99e-4955943bb421"

# BirFatura credentials from .env
API_KEY = "d500f61b-2104-4a59-b306-71cf72dd52d1"
SECRET_KEY = "b72389be-6285-4ec6-9128-c162e43f19c2"
INTEGRATION_KEY = "865c3848-fda5-48f8-aeb6-9ae58abbb3bf"

def update_tenant_credentials():
    """Store BirFatura API credentials in tenant settings"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Get current settings
    cur.execute("SELECT settings FROM tenants WHERE id = ?", (TENANT_ID,))
    row = cur.fetchone()
    if not row:
        print("ERROR: Tenant not found!")
        conn.close()
        return False
    
    settings = json.loads(row["settings"]) if row["settings"] else {}
    
    # Update invoice_integration settings
    settings["invoice_integration"] = {
        "api_key": API_KEY,
        "secret_key": SECRET_KEY,
        "provider": "birfatura"
    }
    
    cur.execute("UPDATE tenants SET settings = ? WHERE id = ?", 
                (json.dumps(settings), TENANT_ID))
    conn.commit()
    print("OK: Tenant BirFatura credentials updated!")
    
    # Also update integration_configs for global integration_key
    cur.execute("UPDATE integration_configs SET config_value = ? WHERE config_key = 'integration_key' AND integration_type = 'birfatura'",
                (INTEGRATION_KEY,))
    cur.execute("UPDATE integration_configs SET config_value = ? WHERE config_key = 'app_api_key' AND integration_type = 'birfatura'",
                (API_KEY,))
    cur.execute("UPDATE integration_configs SET config_value = ? WHERE config_key = 'app_secret_key' AND integration_type = 'birfatura'",
                (SECRET_KEY,))
    conn.commit()
    print("OK: Global integration configs updated!")
    
    conn.close()
    return True

def test_birfatura_connection():
    """Test BirFatura API connection by fetching incoming invoices"""
    from services.birfatura.service import BirfaturaClient
    
    # Force production mode for real API call
    os.environ['FLASK_ENV'] = 'production'
    os.environ['BIRFATURA_MOCK'] = '0'
    
    client = BirfaturaClient(
        api_key=API_KEY,
        secret_key=SECRET_KEY,
        integration_key=INTEGRATION_KEY
    )
    
    print("\n=== Testing BirFatura Connection ===")
    print(f"Base URL: {client.base_url}")
    print(f"Mock mode: {client._use_mock}")
    
    # Fetch incoming invoices (last 30 days)
    from datetime import datetime, timedelta
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=90)
    
    params = {
        'systemType': 'EFATURA',
        'startDateTime': start_date.strftime('%Y-%m-%dT00:00:00'),
        'endDateTime': end_date.strftime('%Y-%m-%dT23:59:59'),
        'documentType': 'INVOICE',
        'pageNumber': 1,
        'pageSize': 50,
    }
    
    print(f"\nFetching invoices from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
    
    try:
        response = client.get_inbox_documents(params)
        print(f"\nAPI Response Success: {response.get('Success')}")
        print(f"API Message: {response.get('Message', 'N/A')}")
        
        result = response.get('Result', {})
        inbox = result.get('InBoxInvoices', {})
        total = inbox.get('total', 0)
        invoices = inbox.get('objects', [])
        
        print(f"\nTotal incoming invoices: {total}")
        print(f"Invoices on this page: {len(invoices)}")
        
        if invoices:
            print("\n=== Incoming Invoices (Gelen Faturalar) ===")
            for i, inv in enumerate(invoices[:20], 1):
                sender = inv.get('senderName', inv.get('SenderName', 'Unknown'))
                inv_no = inv.get('invoiceNo', inv.get('InvoiceNo', 'N/A'))
                inv_date = inv.get('invoiceDate', inv.get('InvoiceDate', 'N/A'))
                total_amt = inv.get('totalAmount', inv.get('TotalAmount', 0))
                currency = inv.get('currency', inv.get('Currency', 'TRY'))
                sender_tax = inv.get('senderTaxNo', inv.get('SenderTaxNo', 'N/A'))
                
                print(f"\n  {i}. {sender}")
                print(f"     Fatura No: {inv_no}")
                print(f"     Tarih: {inv_date}")
                print(f"     Tutar: {total_amt} {currency}")
                print(f"     VKN: {sender_tax}")
        else:
            print("\nNo invoices found in this date range.")
            # Print raw response for debugging
            print(f"\nRaw response: {json.dumps(response, indent=2, default=str)[:2000]}")
            
        return response
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("Step 1: Updating tenant credentials...")
    if update_tenant_credentials():
        print("\nStep 2: Testing BirFatura API connection...")
        test_birfatura_connection()
