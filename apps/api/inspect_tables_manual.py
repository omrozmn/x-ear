from core.database import engine
from sqlalchemy import inspect

insp = inspect(engine)
tables = insp.get_table_names()
print(f"Tables found: {len(tables)}")
if 'admin_users' in tables:
    print("admin_users EXISTS")
else:
    print("admin_users MISSING")

print("All tables:", tables)
