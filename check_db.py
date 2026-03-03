import sqlite3

conn = sqlite3.connect('apps/api/instance/xear_crm.db')
cursor = conn.cursor()

print("=== Sales Table ===")
cursor.execute("""
    SELECT id, list_price_total, discount_amount, total_amount, paid_amount
    FROM sales 
    WHERE id IN ('2603020114', '2603020113', '2603020112')
""")
for row in cursor.fetchall():
    print(f"Sale {row[0]}: list={row[1]}, discount={row[2]}, total={row[3]}, paid={row[4]}")

print("\n=== Device Assignments ===")
cursor.execute("""
    SELECT assignment_uid, sale_id, list_price, sale_price, discount_type, discount_value, sgk_support, net_payable
    FROM device_assignments 
    WHERE sale_id IN ('2603020114', '2603020113', '2603020112')
    ORDER BY sale_id
""")
for row in cursor.fetchall():
    print(f"{row[0]}: sale={row[1]}, list={row[2]}, sale={row[3]}, disc_type={row[4]}, disc_val={row[5]}, sgk={row[6]}, net={row[7]}")

conn.close()
