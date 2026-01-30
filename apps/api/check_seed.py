#!/usr/bin/env python3
import sys
import os

# Add backend to path
backend_dir = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api"
sys.path.insert(0, backend_dir)

from database import SessionLocal
from core.models.party import Party
import json

def check_seed():
    db = SessionLocal()
    tenant_id = "tenant-1"
    
    try:
        party = db.query(Party).filter_by(first_name="QA_TEST_SEED", tenant_id=tenant_id).first()
        result = {
            "found": party is not None,
            "details": party.to_dict() if party else None
        }
        with open("seed_check_result.json", "w") as f:
            json.dump(result, f, indent=2)
        print("Done check.")
    except Exception as e:
        with open("seed_check_result.json", "w") as f:
            f.write(f"Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_seed()
