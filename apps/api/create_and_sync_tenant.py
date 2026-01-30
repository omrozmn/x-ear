"""
Script to create the specific tenant 'efatura test tenant' and test Birfatura API integration.
"""
import sys
import os
import json
import logging
from datetime import datetime, timedelta

# Add the current directory to sys.path to import modules
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
from core.models.tenant import Tenant
from services.birfatura.service import BirfaturaClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tenant Details
TENANT_NAME = "efatura test tenant"
TENANT_SLUG = "efatura-test-tenant"
OWNER_EMAIL = "test@efatura.com" 
BILLING_EMAIL = "test@efatura.com" 

COMPANY_INFO = {
    "tax_id": "1234567801", # Test VKN for GIB
    "branch_name": "Test Şubesi",
    "phone": "05555555555"
}

# Birfatura Credentials (Test Environment)
API_KEY = "61c1c7a1-5f6c-4cd8-888d-c69eb46cabcb"
SECRET_KEY = "f60462d2-c721-4724-802e-6e4663a88e72"
INTEGRATION_KEY = "acfe249d-41ce-44c3-ab70-ae570a5f6ac6"

def create_and_test_tenant():
    db = SessionLocal()
    try:
        # 1. Create or Update Tenant
        tenant = db.query(Tenant).filter_by(slug=TENANT_SLUG).first()
        if not tenant:
            logger.info(f"Creating new tenant: {TENANT_NAME}")
            tenant = Tenant(
                name=TENANT_NAME,
                slug=TENANT_SLUG,
                owner_email=OWNER_EMAIL,
                billing_email=BILLING_EMAIL,
                status="active"
            )
            db.add(tenant)
        else:
            logger.info(f"Updating existing tenant: {TENANT_NAME}")

        # Update Settings and Info
        tenant.company_info = COMPANY_INFO
        
        # Configure Birfatura settings
        current_settings = tenant.settings or {}
        current_settings["invoice_integration"] = {
            "provider": "birfatura",
            "api_key": API_KEY,
            "secret_key": SECRET_KEY,
            "integration_key": INTEGRATION_KEY
        }
        tenant.settings = current_settings
        
        db.commit()
        logger.info(f"Tenant configured. ID: {tenant.id}")

        # 2. Test Birfatura API
        logger.info("Initializing Birfatura Client...")
        
        # IMPORTANT: Force mock to False to hit real API
        os.environ['FLASK_ENV'] = 'production'
        os.environ['BIRFATURA_MOCK'] = '0'
        
        client = BirfaturaClient(
            api_key=API_KEY,
            secret_key=SECRET_KEY,
            integration_key=INTEGRATION_KEY
        )

        # 2a. Test Connection (Credits)
        logger.info("Checking connection with GetNumberOfCredits...")
        try:
            credits_resp = client.get_number_of_credits({})
            logger.info(f"Credits Response: {json.dumps(credits_resp, indent=2, ensure_ascii=False)}")
        except Exception as e:
            logger.error(f"Failed to get credits: {e}")

        # 3. Fetch Invoices (Last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90) # Last 90 days to be sure
        
        # Format dates as ISO 8601 string with milliseconds and Z (UTC)
        start_str = start_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        end_str = end_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        logger.info(f"Fetching Outbox Documents (Sent Invoices) from {start_str} to {end_str}...")
        
        payload_out = {
            "systemType": "EARSIV", # Or EFATURA
            "documentType": "INVOICE",
            "startDateTime": start_str,
            "endDateTime": end_str,
            "readUnReadStatus": "ALL",
            "pageNumber": 0,
            "pageSize": 10 
        }
        
        # Try E-Arsiv first
        try:
            resp_out = client.get_outbox_documents(payload_out)
            if resp_out.get('data') and len(resp_out['data']) > 0:
                 logger.info(f"SUCCESS! Found {len(resp_out['data'])} E-Arsiv invoices.")
                 logger.info(f"Sample Invoice: {resp_out['data'][0].get('documentUUID')}")
            else:
                 logger.info("E-Arsiv Outbox is empty or returned no data.")

        except Exception as e:
            logger.error(f"Failed to fetch E-Arsiv Outbox: {e}")

        # Try E-Fatura next
        payload_out["systemType"] = "EFATURA"
        try:
            resp_out_ef = client.get_outbox_documents(payload_out)
            if resp_out_ef.get('data') and len(resp_out_ef['data']) > 0:
                 logger.info(f"SUCCESS! Found {len(resp_out_ef['data'])} E-Fatura invoices.")
            else:
                 logger.info("E-Fatura Outbox is empty or returned no data.")
        except Exception as e:
            logger.error(f"Failed to fetch E-Fatura Outbox: {e}")
            
        
        # Fetch Inbox (Received)
        logger.info("Fetching Inbox Documents (Received Invoices)...")
        payload_in = {
             "systemType": "EFATURA",
             "documentType": "INVOICE",
             "startDateTime": start_str,
             "endDateTime": end_str,
             "readUnReadStatus": "ALL",
             "pageNumber": 0,
             "pageSize": 10
        }
        try:
            resp_in = client.get_inbox_documents(payload_in)
            if resp_in.get('data') and len(resp_in['data']) > 0:
                 logger.info(f"SUCCESS! Found {len(resp_in['data'])} received invoices.")
            else:
                 logger.info("Inbox is empty or returned no data.")
        except Exception as e:
            logger.error(f"Failed to fetch Inbox: {e}")


    except Exception as e:
        logger.error(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_and_test_tenant()
