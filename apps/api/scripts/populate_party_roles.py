import sys
import os

# Add parent dir to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import SessionLocal, UnboundSession
from core.models.party import Party
from core.models.party_role import PartyRole
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("populate_party_roles")

def populate():
    # Use UnboundSession to bypass tenant filters and see all global data
    with UnboundSession():
        db = SessionLocal()
        try:
            patients = db.query(Patient).all()
            logger.info(f"Found {len(patients)} patients")
            
            count = 0
            created = 0
            for patient in patients:
                # Check if role exists
                existing = db.query(PartyRole).filter_by(party_id=patient.id, role_code='PATIENT').first()
                if not existing:
                    role = PartyRole(
                        party_id=patient.id,
                        role_code='PATIENT',
                        tenant_id=patient.tenant_id
                    )
                    db.add(role)
                    created += 1
                count += 1
            
            db.commit()
            logger.info(f"Processed {count} patients. Created {created} new PartyRole records.")
            
        except Exception as e:
            logger.error(f"Error: {e}")
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    populate()
