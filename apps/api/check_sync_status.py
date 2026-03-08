#!/usr/bin/env python3
"""Quick check of BirFatura sync status"""
import os
import sys
sys.path.insert(0, '.')
os.environ['BIRFATURA_MOCK'] = '0'
from dotenv import load_dotenv
load_dotenv()
from services.birfatura.service import BirfaturaClient

c = BirfaturaClient(
    api_key=os.getenv('BIRFATURA_API_KEY'),
    secret_key=os.getenv('BIRFATURA_SECRET_KEY'),
    integration_key=os.getenv('BIRFATURA_INTEGRATION_KEY')
)
print(f'Mock mode: {c._use_mock}')

params = {
    'systemType': 'EFATURA',
    'startDateTime': '2024-01-01T00:00:00',
    'endDateTime': '2026-03-06T00:00:00',
    'documentType': 'INVOICE',
    'pageNumber': 1,
    'pageSize': 50,
}

# Outgoing
print('\n--- OUTGOING INVOICES ---')
r = c.get_outbox_documents(params)
print(f'Success: {r.get("Success")}')
res = r.get('Result', {})
out = res.get('OutBoxEDocuments', {})
total_out = out.get('total', 0)
objects_out = out.get('objects', [])
print(f'Total: {total_out}, This page: {len(objects_out)}')
for inv in objects_out[:5]:
    print(f'  {inv.get("InvoiceNo")} -> {inv.get("ReceiverName")} = {inv.get("PayableAmount")}')

# Incoming
print('\n--- INCOMING INVOICES ---')
r2 = c.get_inbox_documents(params)
res2 = r2.get('Result', {})
inb = res2.get('InBoxInvoices', {})
total_in = inb.get('total', 0)
print(f'Total: {total_in}')

# DB status
import sqlite3
conn = sqlite3.connect('instance/xear_crm.db')
cur = conn.cursor()
cur.execute("SELECT invoice_type, COUNT(*) FROM purchase_invoices GROUP BY invoice_type")
for row in cur.fetchall():
    print(f'\nDB {row[0]}: {row[1]}')
conn.close()
