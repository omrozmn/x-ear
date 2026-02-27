#!/usr/bin/env python3
"""Check sequences table schema"""
import sys
sys.path.insert(0, 'apps/api')

from sqlalchemy import create_engine, inspect
import os

# Use the actual database path
db_url = 'sqlite:////Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/instance/xear_crm.db'
print(f"Checking database: {db_url}\n")

engine = create_engine(db_url)
inspector = inspect(engine)

tables = inspector.get_table_names()
print(f"Total tables: {len(tables)}")

if 'sequences' in tables:
    print("\n✓ sequences table exists")
    columns = inspector.get_columns('sequences')
    for col in columns:
        print(f"  {col['name']}: {col['type']} (nullable={col['nullable']})")
        if col['name'] == 'year':
            print(f"\n🔍 year column type: {type(col['type']).__name__}")
            print(f"   Type string: {str(col['type'])}")
            print(f"   Is INTEGER: {str(col['type']).upper() == 'INTEGER'}")
else:
    print('\n❌ sequences table does not exist')
    print(f"Available tables: {', '.join(sorted(tables)[:10])}...")

