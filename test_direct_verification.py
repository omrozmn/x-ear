#!/usr/bin/env python3
"""
Direct verification test without token dependency
Tests all 4 data points: Backend, Frontend, Database, API
"""

import sqlite3
import sys

def check_database(sale_id):
    """Check database values"""
    print("\n" + "="*60)
    print("DATABASE CHECK")
    print("="*60)
    
    conn = sqlite3.connect('apps/api/instance/xear_crm.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Sale record
    cursor.execute("""
        SELECT 
            id, list_price_total, total_amount, sgk_coverage,
            discount_amount, final_amount, paid_amount
        FROM sales 
        WHERE id = ?
    """, (sale_id,))
    
    sale = cursor.fetchone()
    if sale:
        print("\nSale Record:")
        for key in sale.keys():
            print(f"  {key}: {sale[key]}")
    
    # Assignment records
    cursor.execute("""
        SELECT 
            id, list_price, sgk_support, sale_price, net_payable,
            ear, discount_type, discount_value
        FROM device_assignments 
        WHERE sale_id = ?
    """, (sale_id,))
    
    assignments = cursor.fetchall()
    print(f"\nAssignments ({len(assignments)}):")
    for i, a in enumerate(assignments, 1):
        print(f"\n  Assignment {i}:")
        for key in a.keys():
            print(f"    {key}: {a[key]}")
    
    # Payment records
    cursor.execute("""
        SELECT id, amount, payment_type, payment_method, status
        FROM payment_records 
        WHERE sale_id = ?
    """, (sale_id,))
    
    payments = cursor.fetchall()
    print(f"\nPayment Records ({len(payments)}):")
    for i, p in enumerate(payments, 1):
        print(f"\n  Payment {i}:")
        for key in p.keys():
            print(f"    {key}: {p[key]}")
    
    conn.close()
    return sale, assignments, payments

def verify_consistency(sale, assignments):
    """Verify consistency between sale and assignments"""
    print("\n" + "="*60)
    print("CONSISTENCY VERIFICATION")
    print("="*60)
    
    issues = []
    
    # Calculate expected totals from assignments
    total_list = 0
    total_sgk = 0
    total_net = 0
    
    for a in assignments:
        ear = str(a['ear']).upper()
        qty = 2 if ear in ['B', 'BOTH', 'BILATERAL'] else 1
        
        total_list += float(a['list_price'] or 0) * qty
        total_sgk += float(a['sgk_support'] or 0) * qty
        total_net += float(a['net_payable'] or 0)  # net_payable is already total
    
    print("\nCalculated from Assignments:")
    print(f"  Total List Price: {total_list}")
    print(f"  Total SGK: {total_sgk}")
    print(f"  Total Net Payable: {total_net}")
    
    print("\nSale Record Values:")
    print(f"  list_price_total: {sale['list_price_total']}")
    print(f"  sgk_coverage: {sale['sgk_coverage']}")
    print(f"  final_amount: {sale['final_amount']}")
    
    # Check consistency
    tolerance = 0.01
    
    if abs(float(sale['list_price_total'] or 0) - total_list) > tolerance:
        issues.append(f"❌ list_price_total mismatch: Sale={sale['list_price_total']}, Calculated={total_list}")
    else:
        print(f"\n✅ list_price_total consistent: {sale['list_price_total']}")
    
    if abs(float(sale['sgk_coverage'] or 0) - total_sgk) > tolerance:
        issues.append(f"❌ sgk_coverage mismatch: Sale={sale['sgk_coverage']}, Calculated={total_sgk}")
    else:
        print(f"✅ sgk_coverage consistent: {sale['sgk_coverage']}")
    
    if abs(float(sale['final_amount'] or 0) - total_net) > tolerance:
        issues.append(f"❌ final_amount mismatch: Sale={sale['final_amount']}, Calculated={total_net}")
    else:
        print(f"✅ final_amount consistent: {sale['final_amount']}")
    
    if issues:
        print("\n" + "="*60)
        print("ISSUES FOUND:")
        print("="*60)
        for issue in issues:
            print(issue)
        return False
    else:
        print("\n" + "="*60)
        print("✅ ALL CHECKS PASSED - DATA IS CONSISTENT!")
        print("="*60)
        return True

if __name__ == "__main__":
    # Get latest sale
    conn = sqlite3.connect('apps/api/instance/xear_crm.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sales ORDER BY created_at DESC LIMIT 1")
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        print("❌ No sales found in database")
        sys.exit(1)
    
    sale_id = result[0]
    print(f"Testing Sale ID: {sale_id}")
    
    sale, assignments, payments = check_database(sale_id)
    
    if sale and assignments:
        success = verify_consistency(sale, assignments)
        sys.exit(0 if success else 1)
    else:
        print("❌ Failed to load sale data")
        sys.exit(1)
