"""BirFatura Integration Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import logging

from database import get_db
from models.tenant import Tenant
from models.integration_config import IntegrationConfig
from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64
from services.birfatura.invoice_sync import InvoiceSyncService
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["BirFatura"])

sync_service = InvoiceSyncService()

class InvoiceSyncRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None

def get_configured_client(tenant_id: str, db: Session):
    """Get BirFatura client configured for the specific tenant."""
    if not tenant_id:
        raise ValueError("Tenant context required")
    
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")
    
    tenant_invoice_settings = (tenant.settings or {}).get("invoice_integration", {})
    tenant_api_key = tenant_invoice_settings.get("api_key")
    tenant_secret_key = tenant_invoice_settings.get("secret_key")
    
    integration_key_config = db.query(IntegrationConfig).filter_by(
        integration_type="birfatura", config_key="integration_key"
    ).first()
    global_integration_key = integration_key_config.config_value if integration_key_config else None
    
    using_mock = os.getenv("BIRFATURA_MOCK", "0") == "1" or os.getenv("FLASK_ENV", "production") != "production"
    if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_integration_key):
        raise ValueError("Missing BirFatura credentials")
    
    return BirfaturaClient(api_key=tenant_api_key, secret_key=tenant_secret_key, integration_key=global_integration_key)

@router.post("/EFatura/sendDocument")
async def send_document(
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send document to BirFatura"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    payload = await request.json()
    
    if "xml" in payload:
        content_b64 = invoice_xml_to_base64(payload["xml"])
        body = {"fileName": payload.get("filename", "document.xml"), "documentBase64": content_b64}
    elif "base64" in payload:
        body = {"fileName": payload.get("filename", "document.xml"), "documentBase64": payload["base64"]}
    else:
        raise HTTPException(status_code=400, detail="Missing xml or base64 field")
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.send_document(body)
        return {"success": True, "data": resp}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/EFatura/sendBasicInvoice")
async def send_basic_invoice(
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send basic invoice to BirFatura"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    invoice = await request.json()
    body = invoice_to_basic_model(invoice)
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.send_basic_invoice(body)
        return {"success": True, "data": resp}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/EFatura/Create")
async def create_invoice(
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create invoice (draft mode)"""
    if not access.tenant_id:
        return {"Success": False, "Message": "Tenant context required"}
    
    payload = await request.json()
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.create_invoice(payload)
        return resp
    except Exception as e:
        return {"Success": False, "Message": str(e)}

@router.post("/EFatura/Retry/{invoice_id}")
async def retry_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Retry sending a failed invoice"""
    if not access.tenant_id:
        return {"Success": False, "Message": "Tenant context required"}
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.retry_invoice(invoice_id)
        return resp
    except Exception as e:
        return {"Success": False, "Message": str(e)}

@router.post("/EFatura/Cancel/{invoice_id}")
async def cancel_invoice(
    invoice_id: str,
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Cancel an invoice"""
    if not access.tenant_id:
        return {"Success": False, "Message": "Tenant context required"}
    
    payload = await request.json()
    reason = payload.get("reason")
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.cancel_invoice(invoice_id, reason)
        return resp
    except Exception as e:
        return {"Success": False, "Message": str(e)}

@router.post("/birfatura/sync-invoices")
async def sync_invoices(
    data: InvoiceSyncRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Sync invoices from BirFatura API"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    start_date = None
    end_date = None
    
    if data.start_date:
        try:
            start_date = datetime.fromisoformat(data.start_date)
        except (ValueError, TypeError):
            pass
    
    if data.end_date:
        try:
            end_date = datetime.fromisoformat(data.end_date)
        except (ValueError, TypeError):
            pass
    
    try:
        stats = sync_service.sync_invoices(access.tenant_id, start_date, end_date)
        return {"success": True, "data": {"imported": stats}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- OutEBelgeV2 Endpoints (Migrated from Flask) ---

@router.post("/OutEBelgeV2/SendDocument")
async def send_document_v2(
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send document via OutEBelgeV2 API"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    payload = await request.json()
    
    if "xml" in payload:
        content_b64 = invoice_xml_to_base64(payload["xml"])
        body = {"fileName": payload.get("filename", "document.xml"), "documentBase64": content_b64}
    elif "base64" in payload:
        body = {"fileName": payload.get("filename", "document.xml"), "documentBase64": payload["base64"]}
    else:
        raise HTTPException(status_code=400, detail="Missing xml or base64 field")
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.send_document_v2(body) if hasattr(client, 'send_document_v2') else client.send_document(body)
        return {"success": True, "data": resp}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/OutEBelgeV2/SendBasicInvoiceFromModel")
async def send_basic_invoice_from_model(
    request: Request,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send basic invoice from model via OutEBelgeV2 API"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    invoice = await request.json()
    body = invoice_to_basic_model(invoice)
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.send_basic_invoice_v2(body) if hasattr(client, 'send_basic_invoice_v2') else client.send_basic_invoice(body)
        return {"success": True, "data": resp}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# --- Mock Endpoints for Frontend Development ---
# These endpoints mimic BirFatura functionality for customer selection.
# TODO: Implement actual proxy logic to BirFatura API.

class MockSearchRequest(BaseModel):
    search: Optional[str] = None

class MockDetailRequest(BaseModel):
    customer_id: Optional[str] = None

@router.post("/Musteri/FirmaMusteriGetir")
async def search_firm_customers_mock(
    payload: MockSearchRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock customer search endpoint"""
    return {
        "success": True,
        "data": [
             {
                "id": "1",
                "name": "Örnek Müşteri A.Ş." + (f" ({payload.search})" if payload.search else ""),
                "taxNumber": "1234567890",
                "isEInvoiceUser": True,
                "tcNumber": None
            }
        ]
    }

@router.post("/Firma/FirmaPKBilgisiGetir")
async def get_firm_pk_info_mock(
    payload: MockDetailRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock PK info endpoint"""
    return {
        "success": True,
        "data": [
             { "value": "TICARIFATURA", "label": "Ticari Fatura" },
             { "value": "TEMELFATURA", "label": "Temel Fatura" }
        ]
    }

@router.post("/Firma/FirmaAdresBilgisiGetir")
async def get_firm_address_info_mock(
    payload: MockDetailRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock Address info endpoint"""

    return {
        "success": True,
        "data": [
            {
                "id": "1",
                "name": "Merkez Ofis",
                "address": "Atatürk Cad. No:123",
                "city": "İstanbul",
                "district": "Kadıköy",
                "postalCode": "34710"
            }
        ]
    }
