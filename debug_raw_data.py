import json
from sqlalchemy import create_engine, text
from apps.api.core.config import settings

engine = create_engine(settings.DATABASE_URL)
conn = engine.connect()

# Get SGK invoice raw_data
rows = conn.execute(text(
    "SELECT id, raw_data FROM purchase_invoices "
    "WHERE tenant_id = '95625589-a4ad-41ff-a99e-4955943bb421' "
    "AND direction = 'OUTGOING' "
    "AND raw_data::text LIKE '%%SGK%%' LIMIT 1"
)).fetchall()

for row in rows:
    rd = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}
    print(f"=== SGK Invoice ID={row[0]} ===")
    for k, v in rd.items():
        print(f"  {k}: {repr(v)[:200]}")

# Get IADE invoice raw_data
rows2 = conn.execute(text(
    "SELECT id, raw_data FROM purchase_invoices "
    "WHERE tenant_id = '95625589-a4ad-41ff-a99e-4955943bb421' "
    "AND direction = 'OUTGOING' "
    "AND raw_data::text LIKE '%%IADE%%' LIMIT 1"
)).fetchall()

for row in rows2:
    rd = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}
    print(f"\n=== IADE Invoice ID={row[0]} ===")
    for k, v in rd.items():
        print(f"  {k}: {repr(v)[:200]}")

# Get a form-created draft to see structure
rows3 = conn.execute(text(
    "SELECT id, raw_data FROM purchase_invoices "
    "WHERE tenant_id = '95625589-a4ad-41ff-a99e-4955943bb421' "
    "AND direction = 'OUTGOING' "
    "AND status = 'DRAFT' "
    "AND raw_data::text LIKE '%%_is_form_draft%%' LIMIT 1"
)).fetchall()

for row in rows3:
    rd = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}
    print(f"\n=== Form Draft ID={row[0]} ===")
    for k, v in rd.items():
        print(f"  {k}: {repr(v)[:200]}")

# Get a _source_form_data draft to see structure
rows4 = conn.execute(text(
    "SELECT id, raw_data FROM purchase_invoices "
    "WHERE tenant_id = '95625589-a4ad-41ff-a99e-4955943bb421' "
    "AND direction = 'OUTGOING' "
    "AND status = 'DRAFT' "
    "AND raw_data::text LIKE '%%_source_form_data%%' LIMIT 1"
)).fetchall()

for row in rows4:
    rd = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}
    print(f"\n=== Copy Draft ID={row[0]} ===")
    for k, v in rd.items():
        print(f"  {k}: {repr(v)[:200]}")

conn.close()
