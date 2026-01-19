import sys
import os

# Add parent dir to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import SessionLocal, UnboundSession
from core.models.party import Party
from core.models.party_role import PartyRole
from core.models.hearing_profile import HearingProfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_party_migration")

def verify():
    with UnboundSession():
        db = SessionLocal()
        try:
            patient_count = db.query(Patient).count()
            role_count = db.query(PartyRole).filter_by(role_code='PATIENT').count()
            profile_count = db.query(HearingProfile).count()
            
            logger.info(f"Patients: {patient_count}")
            logger.info(f"Party Roles (PATIENT): {role_count}")
            logger.info(f"Hearing Profiles: {profile_count}")
            
            if patient_count == role_count == profile_count:
                logger.info("✅ SUCCESS: Counts match!")
            else:
                logger.error("❌ FAILURE: Counts do not match!")
                if role_count != patient_count:
                    logger.error(f"Missing Roles: {patient_count - role_count}")
                if profile_count != patient_count:
                    logger.error(f"Missing Profiles: {patient_count - profile_count}")
            
        except Exception as e:
            logger.error(f"Error: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    verify()
