#!/usr/bin/env python3
"""
Fetch detailed incoming invoices from BirFatura and display them.
Uses GetInBoxDocumentsWithDetail for full invoice data.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

os.environ['FLASK_ENV'] = 'production'
os.environ['BIRFATURA_MOCK'] = '0'

from services.birfatura.service import BirfaturaClient
from datetime import datetime, timedelta, timezone

API_KEY = "d500f61b-2104-4a59-b306-71cf72dd52d1"
SECRET_KEY = "b72389be-6285-4ec6-9128-c162e43f19c2"
INTEGRATION_KEY = "865c3848-fda5-48f8-aeb6-9ae58abbb3bf"

client = BirfaturaClient(
    api_key=API_KEY,
    secret_key=SECRET_KEY,
    integration_key=INTEGRATION_KEY
)

end_date = datetime.now(timezone.utc)
start_date = end_date - timedelta(days=90)

# First get basic list to inspect ALL available fields
params = {
    'systemType': 'EFATURA',
    'startDateTime': start_date.strftime('%Y-%m-%dT00:00:00'),
    'endDateTime': end_date.strftime('%Y-%m-%dT23:59:59'),
    'documentType': 'INVOICE',
    'pageNumber': 1,
    'pageSize': 5,
}

print("=== Sample Raw Invoice Data (first 2 invoices) ===")
response = client.get_inbox_documents(params)
if response.get('Success'):
    result = response.get('Result', {})
    inbox = result.get('InBoxInvoices', {})
    invoices = inbox.get('objects', [])
    
    # Print raw structure of first 2 invoices to understand field names
    for i, inv in enumerate(invoices[:2]):
        print(f"\n--- Invoice {i+1} Raw Data ---")
        print(json.dumps(inv, indent=2, default=str)[:3000])

    total = inbox.get('total', 0)
    print(f"\n\nTotal invoices: {total}")
else:
    print(f"Error: {response.get('Message')}")
    print(json.dumps(response, indent=2, default=str)[:2000])

# Now try WithDetail to get full XML/data
print("\n\n=== Trying GetInBoxDocumentsWithDetail ===")
try:
    detail_response = client.get_inbox_documents_with_detail(params)
    if detail_response.get('Success'):
        result = detail_response.get('Result', {})
        inbox = result.get('InBoxInvoices', {})
        invoices = inbox.get('objects', [])
        
        print(f"Total with detail: {inbox.get('total', 0)}")
        
        for i, inv in enumerate(invoices[:3]):
            print(f"\n--- Detailed Invoice {i+1} ---")
            # Print all keys excluding jsonData (too large)
            inv_copy = {k: v for k, v in inv.items() if k != 'jsonData'}
            print(json.dumps(inv_copy, indent=2, default=str)[:2000])
            if 'jsonData' in inv:
                print(f"  [jsonData present: {len(str(inv['jsonData']))} chars]")
    else:
        print(f"Detail Error: {detail_response.get('Message')}")
        print(json.dumps(detail_response, indent=2, default=str)[:2000])
except Exception as e:
    print(f"Detail request failed: {e}")
    import traceback
    traceback.print_exc()
