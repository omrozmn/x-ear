import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.path.abspath(os.path.join('apps', 'backend', 'instance', 'xear_crm.db'))

def fix_data():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Ensure Tenant Exists
    tenant_id = 'seed-tenant-1'
    cur.execute("SELECT id FROM tenants WHERE id = ?", (tenant_id,))
    if not cur.fetchone():
        print(f"🔹 Creating tenant {tenant_id}...")
        cur.execute("""
            INSERT INTO tenants (id, name, slug, owner_email, billing_email, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (tenant_id, 'Seed Tenant', 'seed-tenant', 'seed-admin@example.com', 'seed-admin@example.com', 'active', datetime.utcnow(), datetime.utcnow()))
    else:
        print(f"✅ Tenant {tenant_id} exists.")

    # 2. Update Users to belong to Tenant
    print("🔹 Updating seed-admin and seed-demo tenant_id...")
    cur.execute("UPDATE users SET tenant_id = ?, is_active = 1 WHERE username = 'seed-admin'", (tenant_id,))
    cur.execute("UPDATE users SET tenant_id = ?, is_active = 1 WHERE username = 'seed-demo'", (tenant_id,))

    # 3. Ensure Inventory Item exists for this tenant
    # We need a hearing aid device in inventory
    cur.execute("SELECT id FROM inventory WHERE tenant_id = ? AND category = 'hearing_aid'", (tenant_id,))
    if not cur.fetchone():
        print("🔹 Creating dummy inventory item...")
        inv_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO inventory (id, tenant_id, name, brand, model, category, total_inventory, available_inventory, used_inventory, on_trial, reorder_level, price, kdv_rate, price_includes_kdv, unit, cost, warranty, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (inv_id, tenant_id, 'Test Hearing Aid', 'Oticon', 'Opn S 1', 'hearing_aid', 10, 10, 0, 0, 0, 15000, 18.0, 0, 'adet', 0, 24, datetime.utcnow(), datetime.utcnow()))
        print(f"✅ Created inventory item {inv_id}")
    else:
        print("✅ Inventory item exists. Updating missing fields (unit, cost, warranty, KDV)...")
        cur.execute("UPDATE inventory SET kdv_rate = 18.0 WHERE kdv_rate IS NULL")
        cur.execute("UPDATE inventory SET price_includes_kdv = 0 WHERE price_includes_kdv IS NULL")
        cur.execute("UPDATE inventory SET unit = 'adet' WHERE unit IS NULL")
        cur.execute("UPDATE inventory SET cost = 0 WHERE cost IS NULL")
        cur.execute("UPDATE inventory SET warranty = 24 WHERE warranty IS NULL")

    # 4. Ensure Patient exists for this tenant
    cur.execute("SELECT id FROM patients WHERE tenant_id = ?", (tenant_id,))
    if not cur.fetchone():
        print("🔹 Creating dummy patient...")
        pat_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO patients (id, tenant_id, first_name, last_name, phone, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (pat_id, tenant_id, 'Ali', 'Veli', '+905551112233', 'active', datetime.utcnow(), datetime.utcnow()))
        print(f"✅ Created patient {pat_id}")
    else:
        print("✅ Patient exists.")

    conn.commit()
    conn.close()
    print("✅ Seed data fixed successfully.")

if __name__ == '__main__':
    fix_data()
