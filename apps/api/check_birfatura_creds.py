#!/usr/bin/env python3
"""Quick check of BirFatura credentials for deneme tenant"""
import sqlite3
import json

conn = sqlite3.connect("instance/xear_crm.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check tenant settings
cur.execute("SELECT id, name, settings FROM tenants WHERE id = ?", 
            ("95625589-a4ad-41ff-a99e-4955943bb421",))
row = cur.fetchone()
if row:
    settings = json.loads(row["settings"]) if row["settings"] else {}
    inv = settings.get("invoice_integration", {})
    print(f"=== Tenant: {row['name']} ===")
    print(f"API Key: {inv.get('api_key', 'NOT SET')}")
    print(f"Secret Key: {'SET (' + inv.get('secret_key','')[:10] + '...)' if inv.get('secret_key') else 'NOT SET'}")
    print(f"Settings keys: {list(inv.keys())}")
else:
    print("Tenant not found")

# Check integration configs
print("\n=== Integration Configs ===")
try:
    cur.execute("SELECT * FROM integration_configs WHERE integration_type = 'birfatura'")
    rows = cur.fetchall()
    for r in rows:
        val = str(dict(r))
        print(val[:200])
    if not rows:
        print("No birfatura integration configs found")
except Exception as e:
    print(f"Error: {e}")
    # check if table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r["name"] for r in cur.fetchall()]
    integration_tables = [t for t in tables if "integ" in t.lower() or "config" in t.lower()]
    print(f"Related tables: {integration_tables}")

# Check env mode
print("\n=== Environment ===")
import os
print(f"BIRFATURA_MOCK: {os.getenv('BIRFATURA_MOCK', 'not set')}")
print(f"FLASK_ENV: {os.getenv('FLASK_ENV', 'not set')}")

conn.close()
