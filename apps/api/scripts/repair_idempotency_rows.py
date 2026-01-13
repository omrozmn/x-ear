#!/usr/bin/env python3
"""
Repair idempotency store DB rows that were persisted with the legacy malformed
shape [payload, status] in `response_json` while `status_code` remained 200.

This script runs inside the Flask app context so SQLAlchemy models and the
DB session are available. By default it performs a dry-run and prints what it
would change. Use --apply to perform the changes.

Usage:
  python3 backend/scripts/repair_idempotency_rows.py [--endpoint ENDPOINT] [--apply] [--backup]

Options:
  --endpoint ENDPOINT   Only repair rows for this endpoint (e.g. 'sales.create_product_sale')
  --apply               Actually perform DB updates (default: dry-run)
  --backup              When using a sqlite DB, create a timestamped backup of the file before applying

"""
import argparse
import json
import os
import shutil
import sys
import time
from datetime import datetime

# Ensure project root is on sys.path so imports like `from models.idempotency import IdempotencyKey` work
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Parse command-line options
parser = argparse.ArgumentParser(description='Repair idempotency rows with malformed response_json')
parser.add_argument('--endpoint', help='If set, only repair rows for this endpoint')
parser.add_argument('--apply', action='store_true', help='Apply changes to the DB instead of dry-run')
parser.add_argument('--backup', action='store_true', help='Backup sqlite DB file before applying')
args = parser.parse_args()

# Import Flask app and DB models
try:
    # Ensure backend/ directory is on sys.path so imports like `routes` resolve
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Import the app module from backend/ as a top-level module so its
    # internal relative imports (e.g., `from routes.patients import ...`) work.
    import app as backend_app_mod
    app = getattr(backend_app_mod, 'app')
    from models.idempotency import IdempotencyKey
    from models.base import db
    import logging
except Exception as e:
    print(f"Failed to import application context or models: {e}")
    sys.exit(2)

with app.app_context():
    logger = logging.getLogger('repair_idempotency_rows')

    engine_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    db_path = None
    if engine_uri and engine_uri.startswith('sqlite:///'):
        db_path = engine_uri[len('sqlite:///'):] if engine_uri.startswith('sqlite:///') else None

    if args.backup and args.apply and db_path and os.path.exists(db_path):
        ts = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{db_path}.bak.{ts}"
        print(f"Creating sqlite backup: {backup_path}")
        shutil.copyfile(db_path, backup_path)

    # Narrow query: rows with a non-null response_json that starts with '[' (JSON array)
    q = IdempotencyKey.query.filter(IdempotencyKey.response_json != None)
    # We try to be conservative: only rows that start with '[' are likely arrays
    q = q.filter(IdempotencyKey.response_json.like('[%'))
    if args.endpoint:
        q = q.filter_by(endpoint=args.endpoint)

    rows = q.all()

    print(f"Found {len(rows)} candidate idempotency rows with array-shaped response_json (endpoint filter={args.endpoint})")

    repaired = 0
    skipped = 0
    errors = 0
    for row in rows:
        try:
            raw = row.response_json
            parsed = json.loads(raw) if raw else None
        except Exception as e:
            print(f"[ERROR] Failed to parse response_json for row id={row.id} key={row.idempotency_key}: {e}")
            errors += 1
            continue

        if isinstance(parsed, list) and len(parsed) >= 2 and isinstance(parsed[-1], int):
            corrected_payload = parsed[0]
            corrected_status = int(parsed[-1])

            print(f"Row id={row.id} key={row.idempotency_key} endpoint={row.endpoint} => would set status {row.status_code} -> {corrected_status}")

            if args.apply:
                try:
                    row.response_json = json.dumps(corrected_payload)
                    row.status_code = corrected_status
                    db.session.add(row)
                    # Commit in batches to avoid long transactions
                    db.session.commit()
                    repaired += 1
                    print(f"[APPLIED] Repaired id={row.id}")

                    # Try to update Redis cache as well to keep stores consistent
                    try:
                        from extensions import redis_client
                        if redis_client:
                            cache_key_parts = [row.idempotency_key, row.endpoint]
                            if row.user_id:
                                cache_key_parts.append(row.user_id)
                            cache_key = f"idempotency:{':'.join(cache_key_parts)}"
                            redis_value = {
                                'response': corrected_payload,
                                'status_code': int(corrected_status),
                                'headers': json.loads(row.headers_json) if row.headers_json else None,
                                'timestamp': time.time()
                            }
                            try:
                                redis_client.setex(cache_key, 3600, json.dumps(redis_value))
                                print(f"[APPLIED] Updated Redis cache for {cache_key}")
                            except Exception as _e:
                                print(f"[WARN] Failed to set Redis cache for {cache_key}: {_e}")
                    except Exception as _e:
                        print(f"[WARN] Redis update skipped: {_e}")
                except Exception as e:
                    print(f"[ERROR] Failed to apply repair for id={row.id}: {e}")
                    try:
                        db.session.rollback()
                    except Exception:
                        pass
                    errors += 1
            else:
                repaired += 1
        else:
            # Row does not match expected broken shape; skip
            print(f"Row id={row.id} key={row.idempotency_key} endpoint={row.endpoint} -> not matching broken array shape; skipping")
            skipped += 1

    print('\nSummary:')
    print(f'  candidates: {len(rows)}')
    print(f'  repaired (or to-be-repaired in dry-run): {repaired}')
    print(f'  skipped: {skipped}')
    print(f'  errors: {errors}')

    if args.apply:
        print('Repair completed. It is recommended to re-run tests now to verify behavior.')
    else:
        print('Dry-run completed. Rerun with --apply to perform changes.')
