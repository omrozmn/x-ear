#!/usr/bin/env python3
"""
Full sync of incoming invoices from BirFatura API to local database.
Handles PascalCase field mapping and creates purchase_invoice + suggested_supplier records.
"""
import json
import os
import sys
import sqlite3
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid as uuid_lib

sys.path.insert(0, os.path.dirname(__file__))

os.environ['FLASK_ENV'] = 'production'
os.environ['BIRFATURA_MOCK'] = '0'

from services.birfatura.service import BirfaturaClient

# Configuration
DB_PATH = "instance/xear_crm.db"
TENANT_ID = "95625589-a4ad-41ff-a99e-4955943bb421"
API_KEY = "d500f61b-2104-4a59-b306-71cf72dd52d1"
SECRET_KEY = "b72389be-6285-4ec6-9128-c162e43f19c2"
INTEGRATION_KEY = "865c3848-fda5-48f8-aeb6-9ae58abbb3bf"


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d']:
        try:
            return datetime.strptime(date_str.split('.')[0] if '.' in date_str and 'T' in date_str else date_str, fmt)
        except (ValueError, TypeError):
            continue
    return None


def generate_id(prefix="pinv"):
    """Not used - tables use INTEGER autoincrement"""
    return None


def fetch_all_incoming_invoices():
    """Fetch all incoming invoices from BirFatura API"""
    client = BirfaturaClient(
        api_key=API_KEY,
        secret_key=SECRET_KEY,
        integration_key=INTEGRATION_KEY
    )
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=90)
    
    all_invoices = []
    page = 1
    page_size = 100
    
    while True:
        params = {
            'systemType': 'EFATURA',
            'startDateTime': start_date.strftime('%Y-%m-%dT00:00:00'),
            'endDateTime': end_date.strftime('%Y-%m-%dT23:59:59'),
            'documentType': 'INVOICE',
            'pageNumber': page,
            'pageSize': page_size,
        }
        
        print(f"  Fetching page {page}...")
        response = client.get_inbox_documents(params)
        
        if not response.get('Success'):
            print(f"  API Error: {response.get('Message')}")
            break
        
        result = response.get('Result', {})
        inbox = result.get('InBoxInvoices', {})
        invoices = inbox.get('objects', [])
        total = inbox.get('total', 0)
        
        if not invoices:
            break
        
        all_invoices.extend(invoices)
        print(f"  Got {len(invoices)} invoices (total on API: {total})")
        
        if page * page_size >= total:
            break
        page += 1
    
    return all_invoices


def sync_to_database(invoices):
    """Save invoices to database as purchase records"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Check if purchase_invoices table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r['name'] for r in cur.fetchall()]
    
    has_purchase_invoices = 'purchase_invoices' in tables
    has_suggested_suppliers = 'suggested_suppliers' in tables
    has_invoices = 'invoices' in tables
    
    print(f"\n  Tables available: purchase_invoices={has_purchase_invoices}, suggested_suppliers={has_suggested_suppliers}, invoices={has_invoices}")
    
    # Get existing suppliers for matching
    cur.execute("SELECT id, company_name, tax_number FROM suppliers WHERE tenant_id = ?", (TENANT_ID,))
    existing_suppliers = {r['tax_number']: dict(r) for r in cur.fetchall() if r['tax_number']}
    print(f"  Existing suppliers: {len(existing_suppliers)}")
    
    stats = {
        'imported': 0,
        'duplicates': 0,
        'errors': 0,
        'suggested_suppliers_added': 0,
        'suggested_suppliers_updated': 0,
    }
    
    # Track unique senders for suggested suppliers
    sender_groups = {}
    
    for inv in invoices:
        birfatura_uuid = inv.get('UUID') or inv.get('uuid')
        if not birfatura_uuid:
            stats['errors'] += 1
            continue
        
        sender_name = inv.get('SenderName') or inv.get('senderName') or ''
        sender_vkn = inv.get('SenderKN') or inv.get('senderKN') or ''
        invoice_no = inv.get('InvoiceNo') or inv.get('invoiceNo') or ''
        issue_date = inv.get('IssueDate') or inv.get('issueDate')
        payable_amount = float(inv.get('PayableAmount') or inv.get('payableAmount') or 0)
        tax_exclusive = float(inv.get('TaxExclusiveAmount') or inv.get('taxExclusiveAmount') or 0)
        tax_inclusive = float(inv.get('TaxInclusiveAmount') or inv.get('taxInclusiveAmount') or 0)
        tax_amount = tax_inclusive - tax_exclusive if tax_inclusive > 0 and tax_exclusive > 0 else 0
        currency = inv.get('DocumentCurrencyCode') or inv.get('documentCurrencyCode') or 'TRY'
        invoice_type_code = inv.get('InvoiceTypeCode') or inv.get('invoiceTypeCode') or ''
        profile_id = inv.get('ProfileId') or inv.get('profileId') or ''
        note = inv.get('Note') or ''
        
        parsed_date = parse_date(issue_date)
        
        # Check for supplier match
        matched_supplier_id = None
        if sender_vkn and sender_vkn in existing_suppliers:
            matched_supplier_id = existing_suppliers[sender_vkn]['id']
        
        # Track for suggested suppliers
        if sender_vkn and sender_vkn not in existing_suppliers:
            key = sender_vkn
            if key not in sender_groups:
                sender_groups[key] = {
                    'name': sender_name,
                    'tax_number': sender_vkn,
                    'invoices': [],
                    'total_amount': 0,
                }
            sender_groups[key]['invoices'].append(inv)
            sender_groups[key]['total_amount'] += payable_amount
        
        # Insert to purchase_invoices if table exists
        if has_purchase_invoices:
            # Check duplicate
            cur.execute("SELECT id FROM purchase_invoices WHERE birfatura_uuid = ? AND tenant_id = ?",
                       (birfatura_uuid, TENANT_ID))
            if cur.fetchone():
                stats['duplicates'] += 1
                continue
            
            inv_id = generate_id("pinv")
            now = datetime.now(timezone.utc).isoformat()
            
            try:
                cur.execute("""
                    INSERT INTO purchase_invoices (
                        tenant_id, birfatura_uuid, invoice_number, invoice_date,
                        invoice_type, sender_name, sender_tax_number, sender_tax_office,
                        supplier_id, currency, subtotal, tax_amount, total_amount,
                        raw_data, is_matched, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    TENANT_ID, birfatura_uuid, invoice_no,
                    parsed_date.isoformat() if parsed_date else datetime.now(timezone.utc).isoformat(),
                    'INCOMING', sender_name, sender_vkn or 'UNKNOWN', '',
                    matched_supplier_id, currency, tax_exclusive, tax_amount, payable_amount,
                    json.dumps(inv, default=str), True if matched_supplier_id else False,
                    'RECEIVED', now, now
                ))
                stats['imported'] += 1
            except Exception as e:
                print(f"  Error inserting invoice {invoice_no}: {e}")
                stats['errors'] += 1
        elif has_invoices:
            # Fallback: insert to invoices table
            cur.execute("SELECT id FROM invoices WHERE birfatura_uuid = ? AND tenant_id = ?",
                       (birfatura_uuid, TENANT_ID))
            if cur.fetchone():
                stats['duplicates'] += 1
                continue
            
            now = datetime.now(timezone.utc).isoformat()
            
            try:
                cur.execute("""
                    INSERT INTO invoices (
                        id, tenant_id, invoice_number, party_name, party_id,
                        device_price, status, tax_office, created_at, updated_at,
                        birfatura_uuid
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    inv_id, TENANT_ID, invoice_no, sender_name,
                    matched_supplier_id, payable_amount, 'received', '',
                    now, now, birfatura_uuid
                ))
                stats['imported'] += 1
            except Exception as e:
                print(f"  Error inserting invoice {invoice_no}: {e}")
                stats['errors'] += 1
    
    # Create/update suggested suppliers
    if has_suggested_suppliers:
        for vkn, group in sender_groups.items():
            cur.execute("SELECT id, invoice_count, total_amount FROM suggested_suppliers WHERE tax_number = ? AND tenant_id = ?",
                       (vkn, TENANT_ID))
            existing = cur.fetchone()
            
            dates = sorted([parse_date(i.get('IssueDate') or i.get('issueDate')) for i in group['invoices'] if parse_date(i.get('IssueDate') or i.get('issueDate'))])
            
            if existing:
                new_count = existing['invoice_count'] + len(group['invoices'])
                new_total = float(existing['total_amount'] or 0) + group['total_amount']
                cur.execute("""
                    UPDATE suggested_suppliers 
                    SET invoice_count = ?, total_amount = ?, last_invoice_date = ?
                    WHERE id = ?
                """, (new_count, new_total, dates[-1].isoformat() if dates else None, existing['id']))
                stats['suggested_suppliers_updated'] += 1
            else:
                now = datetime.now(timezone.utc).isoformat()
                try:
                    cur.execute("""
                        INSERT INTO suggested_suppliers (
                            tenant_id, company_name, tax_number, invoice_count,
                            total_amount, first_invoice_date, last_invoice_date,
                            status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        TENANT_ID, group['name'], vkn, len(group['invoices']),
                        group['total_amount'],
                        dates[0].isoformat() if dates else None,
                        dates[-1].isoformat() if dates else None,
                        'PENDING', now, now
                    ))
                    stats['suggested_suppliers_added'] += 1
                except Exception as e:
                    print(f"  Error creating suggested supplier {group['name']}: {e}")
    
    conn.commit()
    conn.close()
    return stats, sender_groups


def main():
    print("=" * 60)
    print("BirFatura Gelen Fatura Senkronizasyonu")
    print("Tenant: deneme (Özmen Tıbbi Cihazlar)")
    print("=" * 60)
    
    print("\n1. Fetching incoming invoices from BirFatura API...")
    invoices = fetch_all_incoming_invoices()
    print(f"   Total invoices fetched: {len(invoices)}")
    
    if not invoices:
        print("No invoices found!")
        return
    
    # Show summary of senders
    senders = {}
    for inv in invoices:
        name = inv.get('SenderName') or inv.get('senderName', 'Unknown')
        vkn = inv.get('SenderKN') or inv.get('senderKN', '')
        amt = float(inv.get('PayableAmount') or inv.get('payableAmount') or 0)
        key = vkn or name
        if key not in senders:
            senders[key] = {'name': name, 'vkn': vkn, 'count': 0, 'total': 0}
        senders[key]['count'] += 1
        senders[key]['total'] += amt
    
    print(f"\n2. Gönderici Özeti ({len(senders)} farklı gönderici):")
    print("-" * 70)
    for key, s in sorted(senders.items(), key=lambda x: x[1]['count'], reverse=True):
        print(f"   {s['name']}")
        print(f"   VKN: {s['vkn']} | Fatura: {s['count']} adet | Toplam: {s['total']:,.2f} TRY")
        print()
    
    print("\n3. Veritabanına kaydediliyor (alış faturaları olarak)...")
    stats, sender_groups = sync_to_database(invoices)
    
    print(f"\n{'=' * 60}")
    print("SONUÇLAR:")
    print(f"{'=' * 60}")
    print(f"  Yeni kaydedilen fatura: {stats['imported']}")
    print(f"  Zaten mevcut (tekrar): {stats['duplicates']}")
    print(f"  Hata: {stats['errors']}")
    print(f"  Yeni önerilen tedarikçi: {stats['suggested_suppliers_added']}")
    print(f"  Güncellenen teridarikçi: {stats['suggested_suppliers_updated']}")
    
    if sender_groups:
        print(f"\n{'=' * 60}")
        print("ÖNERİLEN TEDARİKÇİLER (Mevcut tedarikçilerinizde olmayan göndericiler):")
        print(f"{'=' * 60}")
        for vkn, g in sorted(sender_groups.items(), key=lambda x: x[1]['total_amount'], reverse=True):
            print(f"  - {g['name']} (VKN: {vkn})")
            print(f"    Fatura: {len(g['invoices'])} adet | Toplam: {g['total_amount']:,.2f} TRY")
    
    print(f"\nTamamlandı!")


if __name__ == "__main__":
    main()
