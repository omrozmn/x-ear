#!/usr/bin/env python3
"""Diagnose and fix sync - fetch all pages, count issues"""
import os
import sys
import sqlite3
sys.path.insert(0, '.')
os.environ['BIRFATURA_MOCK'] = '0'
from dotenv import load_dotenv
load_dotenv()
from services.birfatura.service import BirfaturaClient
from services.birfatura.invoice_parser import extract_sender_info, parse_date, extract_invoice_amounts

c = BirfaturaClient(
    api_key=os.getenv('BIRFATURA_API_KEY'),
    secret_key=os.getenv('BIRFATURA_SECRET_KEY'),
    integration_key=os.getenv('BIRFATURA_INTEGRATION_KEY')
)

p = {
    'systemType': 'EFATURA',
    'startDateTime': '2024-01-01T00:00:00',
    'endDateTime': '2026-03-06T00:00:00',
    'documentType': 'INVOICE',
    'pageNumber': 1,
    'pageSize': 50,
}

# Get existing UUIDs from DB
conn = sqlite3.connect('instance/xear_crm.db')
cur = conn.cursor()
cur.execute("SELECT birfatura_uuid FROM purchase_invoices WHERE invoice_type='INCOMING'")
existing_uuids = set(r[0] for r in cur.fetchall())
print(f"Existing incoming in DB: {len(existing_uuids)}")

# Fetch all pages from API
total_api = 0
no_uuid = 0
no_tax = 0
good = 0
already_in_db = 0
missing_date = 0
all_uuids = []
page = 1

while True:
    p['pageNumber'] = page
    r = c.get_inbox_documents(p)
    if not r.get('Success'):
        print(f"API error on page {page}: {r.get('Message')}")
        break
    res = r.get('Result', {}).get('InBoxInvoices', {})
    objs = res.get('objects', [])
    total_api = res.get('total', total_api)
    
    if not objs:
        print(f"No objects on page {page}")
        break
    
    for inv in objs:
        uuid = inv.get('UUID') or inv.get('uuid') or inv.get('documentUUID')
        if not uuid:
            no_uuid += 1
            continue
        
        all_uuids.append(uuid)
        
        if uuid in existing_uuids:
            already_in_db += 1
            continue
        
        info = extract_sender_info(inv)
        if not info['tax_number']:
            no_tax += 1
            print(f"  MISSING TAX: {inv.get('SenderName', 'unknown')} UUID={uuid[:20]}")
            continue
        
        dt = inv.get('IssueDate') or inv.get('issueDate') or inv.get('invoiceDate')
        if not dt:
            missing_date += 1
            print(f"  MISSING DATE: {info['name']} UUID={uuid[:20]}")
        
        good += 1
    
    print(f"  Page {page}: {len(objs)} items")
    
    if page * 50 >= total_api:
        break
    page += 1

print("\n=== RESULTS ===")
print(f"Total from API: {total_api}")
print(f"Total fetched: {len(all_uuids) + no_uuid}")
print(f"Pages: {page}")
print(f"Already in DB: {already_in_db}")
print(f"Good (new): {good}")
print(f"Missing UUID: {no_uuid}")
print(f"Missing tax number: {no_tax}")
print(f"Missing date: {missing_date}")
print(f"Need to sync: {good}")

# Now actually insert the missing ones
if good > 0:
    print(f"\n--- SYNCING {good} missing invoices ---")
    from datetime import datetime, timezone
    inserted = 0
    errors = 0
    page = 1
    
    while True:
        p['pageNumber'] = page
        r = c.get_inbox_documents(p)
        res = r.get('Result', {}).get('InBoxInvoices', {})
        objs = res.get('objects', [])
        if not objs:
            break
        
        for inv in objs:
            uuid = inv.get('UUID') or inv.get('uuid') or inv.get('documentUUID')
            if not uuid or uuid in existing_uuids:
                continue
            
            info = extract_sender_info(inv)
            if not info['tax_number']:
                continue
            
            amounts = extract_invoice_amounts(inv)
            inv_no = inv.get('InvoiceNo') or inv.get('invoiceId') or inv.get('invoiceNumber') or ''
            issue_date = parse_date(inv.get('IssueDate') or inv.get('issueDate') or inv.get('invoiceDate'))
            if not issue_date:
                issue_date = datetime.now(timezone.utc).isoformat()
            
            now = datetime.now(timezone.utc).isoformat()
            
            try:
                cur.execute("""
                    INSERT INTO purchase_invoices (
                        tenant_id, birfatura_uuid, invoice_number, invoice_date,
                        invoice_type, sender_name, sender_tax_number, sender_tax_office,
                        sender_city, currency, subtotal, tax_amount, total_amount,
                        raw_data, is_matched, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    '95625589-a4ad-41ff-a99e-4955943bb421',
                    uuid, inv_no, issue_date,
                    'INCOMING', info['name'], info['tax_number'], info.get('tax_office', ''),
                    info.get('city', ''), amounts['currency'],
                    float(amounts.get('subtotal', 0) or 0),
                    float(amounts.get('tax_amount', 0) or 0),
                    float(amounts.get('total_amount', 0) or 0),
                    None, 0, 'RECEIVED', now, now
                ))
                existing_uuids.add(uuid)
                inserted += 1
            except Exception as e:
                errors += 1
                print(f"  ERROR inserting {uuid[:20]}: {e}")
        
        if page * 50 >= total_api:
            break
        page += 1
    
    conn.commit()
    print(f"Inserted: {inserted}, Errors: {errors}")

# Also update suggested suppliers
cur.execute("""
    SELECT sender_tax_number, sender_name, COUNT(*) as cnt, SUM(total_amount) as total
    FROM purchase_invoices 
    WHERE tenant_id='95625589-a4ad-41ff-a99e-4955943bb421' AND invoice_type='INCOMING'
    GROUP BY sender_tax_number
    ORDER BY cnt DESC
""")
print("\n=== SUPPLIERS ===")
for row in cur.fetchall():
    print(f"  {row[1]} (VKN:{row[0]}) - {row[2]} fatura, {row[3]:.2f} TRY")

# Final counts
cur.execute("SELECT invoice_type, COUNT(*) FROM purchase_invoices WHERE tenant_id='95625589-a4ad-41ff-a99e-4955943bb421' GROUP BY invoice_type")
print("\n=== FINAL DB COUNTS ===")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
