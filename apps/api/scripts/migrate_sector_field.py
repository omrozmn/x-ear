"""
Migration Script: Assign sector to all existing tenants.

This script is IDEMPOTENT — safe to run multiple times.
All existing tenants get sector='hearing' (preserving backward compatibility).
Tenants with a known product_code are mapped to the correct sector.

Usage:
    cd apps/api
    python scripts/migrate_sector_field.py

Environment:
    DATABASE_URL must be set, or the default dev database will be used.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal, engine
from models.tenant import Tenant
from schemas.enums import SectorCode
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Product code → sector mapping
PRODUCT_TO_SECTOR = {
    "xear_hearing": "hearing",
    "xear_pharmacy": "pharmacy",
    "xear_hospital": "hospital",
    "xear_hotel": "hotel",
    "xear_general": "general",
}


def migrate():
    """Set sector field for all tenants based on their product_code."""
    session = SessionLocal()
    try:
        tenants = session.query(Tenant).all()
        updated = 0
        skipped = 0

        for tenant in tenants:
            current_sector = getattr(tenant, 'sector', None)

            # Derive sector from product_code
            product_code = getattr(tenant, 'product_code', None) or 'xear_hearing'
            target_sector = PRODUCT_TO_SECTOR.get(product_code, 'hearing')

            if current_sector == target_sector:
                skipped += 1
                continue

            tenant.sector = target_sector
            updated += 1
            logger.info(
                f"Tenant '{tenant.name}' (id={tenant.id}): "
                f"sector {current_sector!r} → {target_sector!r} "
                f"(product_code={product_code})"
            )

        session.commit()
        logger.info(f"Migration complete: {updated} updated, {skipped} already correct, {len(tenants)} total")

    except Exception as e:
        session.rollback()
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    migrate()
