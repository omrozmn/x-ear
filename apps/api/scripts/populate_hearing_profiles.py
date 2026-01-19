import sys
import os

# Add parent dir to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import SessionLocal, UnboundSession
from core.models.party import Party
from core.models.hearing_profile import HearingProfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("populate_hearing_profiles")

def populate():
    # Use UnboundSession to bypass tenant filters
    with UnboundSession():
        db = SessionLocal()
        try:
            patients = db.query(Patient).all()
            logger.info(f"Found {len(patients)} patients")
            
            count = 0
            created = 0
            for patient in patients:
                # Check if profile exists
                existing = db.query(HearingProfile).filter_by(party_id=patient.id).first()
                if not existing:
                    # Create profile, copying sgk_info
                    profile = HearingProfile(
                        party_id=patient.id,
                        sgk_info=patient.sgk_info,
                        tenant_id=patient.tenant_id
                    )
                    db.add(profile)
                    created += 1
                count += 1
            
            db.commit()
            logger.info(f"Processed {count} patients. Created {created} new HearingProfile records.")
            
        except Exception as e:
            logger.error(f"Error: {e}")
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    populate()
