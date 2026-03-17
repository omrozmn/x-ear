#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')
from datetime import datetime, timezone
import sqlalchemy as sa
from apps.api.core.database import engine

# Execute migration directly
with engine.begin() as conn:
    # Check if columns exist
    result = conn.execute(sa.text("PRAGMA table_info(deliverability_metrics)"))
    columns = [row[1] for row in result]
    
    if 'created_at' not in columns:
        print("Adding created_at column...")
        conn.execute(sa.text("ALTER TABLE deliverability_metrics ADD COLUMN created_at DATETIME"))
        conn.execute(sa.text(f"UPDATE deliverability_metrics SET created_at = '{datetime.now(timezone.utc).isoformat()}'"))
        print("✓ created_at added")
    else:
        print("✓ created_at already exists")
    
    if 'updated_at' not in columns:
        print("Adding updated_at column...")
        conn.execute(sa.text("ALTER TABLE deliverability_metrics ADD COLUMN updated_at DATETIME"))
        conn.execute(sa.text(f"UPDATE deliverability_metrics SET updated_at = '{datetime.now(timezone.utc).isoformat()}'"))
        print("✓ updated_at added")
    else:
        print("✓ updated_at already exists")

print("\n✅ Migration completed!")
