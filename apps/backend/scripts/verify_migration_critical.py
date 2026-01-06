
import sys
import os
import logging
from fastapi.testclient import TestClient

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base, init_db
# Import all models to ensure metadata is populated for init_db
from models import * 
from utils.tenant_security import set_current_tenant_id
from main import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verification")

client = TestClient(app)

def setup_database():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized.")

def verify_health():
    logger.info("Verifying /health endpoint...")
    response = client.get("/health")
    if response.status_code != 200:
        logger.error(f"Health check failed: {response.status_code} - {response.text}")
        return False
    logger.info("Health check PASSED")
    return True

def verify_readiness():
    logger.info("Verifying /readiness endpoint...")
    response = client.get("/readiness")
    if response.status_code != 200:
        logger.error(f"Readiness check failed: {response.status_code} - {response.text}")
        return False
    logger.info("Readiness check PASSED")
    return True

def verify_tenant_isolation():
    logger.info("Verifying Tenant Isolation...")
    db = SessionLocal()
    try:
        # Create two tenants
        t1 = Tenant(name="VerifyT1", slug="v_t1", owner_email="v_t1@test.com", billing_email="v_t1@test.com")
        t2 = Tenant(name="VerifyT2", slug="v_t2", owner_email="v_t2@test.com", billing_email="v_t2@test.com")
        db.add_all([t1, t2])
        db.commit()
        db.refresh(t1)
        db.refresh(t2)

        # Create patients
        p1 = Patient(first_name="P1", last_name="T1", phone="11111", tenant_id=t1.id)
        p2 = Patient(first_name="P2", last_name="T2", phone="22222", tenant_id=t2.id)
        db.add_all([p1, p2])
        db.commit()

        # Check isolation via DB query directly (mocking request context)
        set_current_tenant_id(t1.id)
        patients_t1 = db.query(Patient).all()
        ids_t1 = [p.id for p in patients_t1]
        
        if p1.id not in ids_t1:
            logger.error("Tenant 1 cannot see its own data")
            return False
        if p2.id in ids_t1:
             logger.error("Tenant 1 CAN SEE Tenant 2 data! ISOLATION FAILURE")
             return False
        
        logger.info("Tenant Isolation (DB Layer) PASSED")
        return True
    except Exception as e:
        logger.exception("Tenant isolation verification failed with exception:")
        return False
    finally:
        db.close()

def main():
    logger.info("Starting Critical Migration Verification...")
    setup_database()
    
    results = {
        "health": verify_health(),
        "readiness": verify_readiness(),
        "tenant_isolation": verify_tenant_isolation()
    }
    
    if all(results.values()):
        logger.info("ALL CRITICAL CHECKS PASSED ✅")
        sys.exit(0)
    else:
        logger.error("VERIFICATION FAILED ❌")
        sys.exit(1)

if __name__ == "__main__":
    main()
