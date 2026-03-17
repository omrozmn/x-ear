"""BirFatura Integration Router - FastAPI"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, Callable
from datetime import datetime
import os
import logging
import json
import uuid
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from database import get_db
from models.tenant import Tenant
from models.integration_config import IntegrationConfig
from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64
from services.birfatura.invoice_sync import InvoiceSyncService
from middleware.unified_access import UnifiedAccess, require_access
from core.database import unbound_session

logger = logging.getLogger(__name__)

from schemas.base import ResponseEnvelope
from schemas.birfatura import (
    InvoiceSyncRequest, BirfaturaResponse, InvoiceSyncResponse,
    MockSearchRequest, MockDetailRequest,
    GetOutBoxDocumentsRequest, GetPDFLinkRequest,
    GetEnvelopeStatusRequest, ReEnvelopeAndSendRequest,
    GetCodeListByTypeRequest, GetUserTagRequest, GibUserListRequest,
    UpdateUnreadedStatusRequest, GetOutBoxDocumentByUUIDRequest,
    PreviewDocumentRequest,
)


router = APIRouter(tags=["BirFatura"])
_REFERENCE_CACHE_TTL_SECONDS = 60 * 60 * 12
_reference_cache: dict[str, tuple[datetime, Any]] = {}


def _cached_value(cache_key: str) -> Any | None:
    cached = _reference_cache.get(cache_key)
    if not cached:
        return None
    created_at, payload = cached
    if (datetime.utcnow() - created_at).total_seconds() > _REFERENCE_CACHE_TTL_SECONDS:
        _reference_cache.pop(cache_key, None)
        return None
    return payload


def _set_cached_value(cache_key: str, payload: Any) -> None:
    _reference_cache[cache_key] = (datetime.utcnow(), payload)


def _provider_proxy(
    tenant_id: str,
    db: Session,
    payload: dict[str, Any],
    action: Callable[[BirfaturaClient, dict[str, Any]], dict[str, Any]],
) -> ResponseEnvelope[BirfaturaResponse]:
    try:
        client = get_configured_client(tenant_id, db)
        resp = action(client, payload)
        return ResponseEnvelope(data=BirfaturaResponse(success=bool(resp.get("Success", True)), message=resp.get("Message"), data=resp))
    except Exception as e:
        logger.error("BirFatura proxy error: %s", e)
        return ResponseEnvelope(data=BirfaturaResponse(success=False, message=str(e)))

def get_configured_client(tenant_id: str, db: Session):
    """Get BirFatura client configured for the specific tenant."""
    if not tenant_id:
        raise ValueError("Tenant context required")
    
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")
    
    tenant_settings = tenant.settings or {}
    tenant_invoice_settings = (
        tenant_settings.get("invoice_integration")
        or tenant_settings.get("invoiceIntegration")
        or {}
    )
    tenant_api_key = tenant_invoice_settings.get("api_key") or tenant_invoice_settings.get("apiKey")
    tenant_secret_key = tenant_invoice_settings.get("secret_key") or tenant_invoice_settings.get("secretKey")

    with unbound_session(reason="reading BirFatura credentials"):
        def _get_config(key: str, tenant_scope: str | None = None):
            query = db.query(IntegrationConfig).filter_by(
                integration_type="birfatura",
                config_key=key,
            )
            if tenant_scope is not None:
                query = query.filter_by(tenant_id=tenant_scope)
            return query.first()

        tenant_integration_key_cfg = _get_config("integration_key", tenant_id)
        system_integration_key_cfg = _get_config("integration_key", "system")
        tenant_app_api_key_cfg = _get_config("app_api_key", tenant_id)
        system_app_api_key_cfg = _get_config("app_api_key", "system")
        tenant_app_secret_key_cfg = _get_config("app_secret_key", tenant_id)
        system_app_secret_key_cfg = _get_config("app_secret_key", "system")

    tenant_api_key = tenant_api_key or (
        tenant_app_api_key_cfg.config_value if tenant_app_api_key_cfg else None
    ) or (
        system_app_api_key_cfg.config_value if system_app_api_key_cfg else None
    )
    tenant_secret_key = tenant_secret_key or (
        tenant_app_secret_key_cfg.config_value if tenant_app_secret_key_cfg else None
    ) or (
        system_app_secret_key_cfg.config_value if system_app_secret_key_cfg else None
    )
    global_integration_key = (
        (tenant_integration_key_cfg.config_value if tenant_integration_key_cfg else None)
        or (system_integration_key_cfg.config_value if system_integration_key_cfg else None)
        or os.getenv("BIRFATURA_INTEGRATION_KEY")
        or os.getenv("BIRFATURA_X_INTEGRATION_KEY")
    )

    use_test_creds = os.getenv("BIRFATURA_USE_TEST_CREDS", "0") == "1"
    if use_test_creds:
        tenant_api_key = os.getenv("BIRFATURA_TEST_API_KEY") or tenant_api_key
        tenant_secret_key = os.getenv("BIRFATURA_TEST_SECRET_KEY") or tenant_secret_key
        global_integration_key = os.getenv("BIRFATURA_TEST_INTEGRATION_KEY") or global_integration_key
    
    mock_env = os.getenv("BIRFATURA_MOCK")
    if mock_env == "1":
        using_mock = True
    elif mock_env == "0":
        using_mock = False
    else:
        using_mock = os.getenv("ENVIRONMENT", "production") != "production"
    if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_integration_key):
        raise ValueError("Missing BirFatura credentials")
    
    return BirfaturaClient(api_key=tenant_api_key, secret_key=tenant_secret_key, integration_key=global_integration_key)


def _get_identity_lookup_credentials(tenant_id: str, db: Session) -> tuple[str | None, str | None]:
    username = None
    password = None

    with unbound_session(reason="reading identity lookup credentials"):
        def _get_config(key: str, tenant_scope: str | None = None):
            query = db.query(IntegrationConfig).filter_by(
                integration_type="birfatura",
                config_key=key,
            )
            if tenant_scope is not None:
                query = query.filter_by(tenant_id=tenant_scope)
            return query.first()

        username = username or (
            (_get_config("identity_lookup_username", tenant_id) or _get_config("gib_username", tenant_id))
        )
        password = password or (
            (_get_config("identity_lookup_password", tenant_id) or _get_config("gib_password", tenant_id))
        )
        if isinstance(username, IntegrationConfig):
            username = username.config_value
        if isinstance(password, IntegrationConfig):
            password = password.config_value

        if not username:
            system_username_cfg = _get_config("identity_lookup_username", "system") or _get_config("gib_username", "system")
            username = system_username_cfg.config_value if system_username_cfg else None
        if not password:
            system_password_cfg = _get_config("identity_lookup_password", "system") or _get_config("gib_password", "system")
            password = system_password_cfg.config_value if system_password_cfg else None

    username = username or os.getenv("IDENTITY_LOOKUP_USERNAME") or os.getenv("GIB_IDENTITY_LOOKUP_USERNAME") or os.getenv("EARSIV_PORTAL_USERNAME")
    password = password or os.getenv("IDENTITY_LOOKUP_PASSWORD") or os.getenv("GIB_IDENTITY_LOOKUP_PASSWORD") or os.getenv("EARSIV_PORTAL_PASSWORD")

    return (str(username).strip() or None, str(password).strip() or None)


def _portal_form_post(url: str, payload: dict[str, str], timeout: int = 15) -> Any:
    request = urllib_request.Request(
        url,
        data=urllib_parse.urlencode(payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib_request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="ignore")
    return json.loads(body) if body else {}


def _lookup_identity_from_portal(tenant_id: str, db: Session, tax_id: str) -> dict[str, str] | None:
    username, password = _get_identity_lookup_credentials(tenant_id, db)
    if not username or not password:
        return None

    login_payload = {
        "assoscmd": "anologin",
        "rtype": "json",
        "userid": username,
        "sifre": password,
        "sifre2": password,
        "parola": "1",
    }
    login_response = _portal_form_post("https://earsivportal.efatura.gov.tr/earsiv-services/assos-login", login_payload)
    token = str((login_response or {}).get("token") or "").strip()
    if not token:
        raise ValueError("Identity lookup login failed")

    try:
        lookup_payload = {
            "cmd": "SICIL_VEYA_MERNISTEN_BILGILERI_GETIR",
            "callid": str(uuid.uuid4()),
            "pageName": "RG_BASITFATURA",
            "token": token,
            "jp": json.dumps({"vknTcknn": tax_id}, separators=(",", ":")),
        }
        lookup_response = _portal_form_post("https://earsivportal.efatura.gov.tr/earsiv-services/dispatch", lookup_payload)
        data = (lookup_response or {}).get("data") or {}
        if not isinstance(data, dict):
            return None
        return {
            "firstName": str(data.get("adi") or "").strip(),
            "lastName": str(data.get("soyadi") or "").strip(),
            "companyTitle": str(data.get("unvan") or "").strip(),
            "taxOffice": str(data.get("vergiDairesi") or "").strip(),
        }
    finally:
        try:
            _portal_form_post(
                "https://earsivportal.efatura.gov.tr/earsiv-services/assos-login",
                {"assoscmd": "logout", "rtype": "json", "token": token},
                timeout=10,
            )
        except Exception:
            logger.debug("Identity lookup logout failed for tenant %s", tenant_id)


def _meaningful_lookup_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text or text.lower().startswith("urn:"):
        return ""
    return text

@router.post("/EFatura/sendDocument", operation_id="createEfaturaSenddocument")
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

@router.post("/EFatura/sendBasicInvoice", operation_id="createEfaturaSendbasicinvoice")
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

@router.post("/EFatura/Create", operation_id="createEfaturaCreate")
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
        return ResponseEnvelope(data=resp)
    except Exception as e:
        return ResponseEnvelope(data={"Success": False, "Message": str(e)})

@router.post("/EFatura/Retry/{invoice_id}", operation_id="createEfaturaRetry")
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
        return ResponseEnvelope(data=resp)
    except Exception as e:
        return ResponseEnvelope(data={"Success": False, "Message": str(e)})

@router.post("/EFatura/Cancel/{invoice_id}", operation_id="createEfaturaCancel")
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
        return ResponseEnvelope(data=resp)
    except Exception as e:
        return ResponseEnvelope(data={"Success": False, "Message": str(e)})

@router.post("/birfatura/sync-invoices", operation_id="createBirfaturaSyncInvoices")
async def sync_invoices(
    data: InvoiceSyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Sync invoices from BirFatura API (runs in background)"""
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
    
    def _run_sync(tenant_id: str, sd, ed):
        from core.database import SessionLocal, set_tenant_context, reset_tenant_context
        token = set_tenant_context(tenant_id)
        sync_db = SessionLocal()
        try:
            svc = InvoiceSyncService(sync_db)
            stats = svc.sync_invoices(tenant_id, sd, ed)
            logger.info(f"[sync] tenant={tenant_id} incoming={stats.get('incoming')} outgoing={stats.get('outgoing')}")
        except Exception as e:
            logger.error(f"[sync] tenant={tenant_id} error: {e}")
        finally:
            sync_db.close()
            reset_tenant_context(token)

    background_tasks.add_task(_run_sync, access.tenant_id, start_date, end_date)
    return ResponseEnvelope(
        data={"message": "Senkronizasyon arka planda başlatıldı"},
        message="Senkronizasyon başlatıldı. Faturalar birkaç dakika içinde görünecektir."
    )

@router.post("/birfatura/backfill-invoice-items", operation_id="createBirfaturaBackfillInvoiceItems")
async def backfill_invoice_items(
    data: InvoiceSyncRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Backfill invoice line items for existing invoices that were synced without detail.
    Re-fetches invoices from BirFatura with detail endpoint and extracts line items."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    sync_service = InvoiceSyncService(db)
    
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
        stats = sync_service.backfill_invoice_items(access.tenant_id, start_date, end_date)
        return ResponseEnvelope(data={
            "updated": stats.get("updated", 0),
            "skipped": stats.get("skipped", 0),
            "errors": stats.get("errors", 0),
            "message": f"{stats.get('updated', 0)} faturanın kalemleri güncellendi"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/birfatura/backfill-outgoing-detail", operation_id="createBirfaturaBackfillOutgoingDetail")
async def backfill_outgoing_detail(
    data: InvoiceSyncRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Backfill outgoing invoices with UBL detail for flat-synced records.
    Populates line items and reconstructs _source_form_data from UBL."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    sync_service = InvoiceSyncService(db)

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
        stats = sync_service.backfill_outgoing_detail(access.tenant_id, start_date, end_date)
        return ResponseEnvelope(data={
            "updated": stats.get("updated", 0),
            "skipped": stats.get("skipped", 0),
            "errors": stats.get("errors", 0),
            "message": f"{stats.get('updated', 0)} giden faturanın detayı güncellendi"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- OutEBelgeV2 Endpoints (Migrated from Flask) ---

@router.post("/OutEBelgeV2/SendDocument", operation_id="createOutebelgev2Senddocument")
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
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=resp))
    except Exception as e:
        logger.error(f"Send document v2 error: {e}")
        return ResponseEnvelope(data=BirfaturaResponse(success=False, message=str(e)))

@router.post("/OutEBelgeV2/SendBasicInvoiceFromModel", operation_id="createOutebelgev2Sendbasicinvoicefrommodel")
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
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=resp))
    except Exception as e:
        logger.error(f"Send basic invoice v2 error: {e}")
        return ResponseEnvelope(data=BirfaturaResponse(success=False, message=str(e)))

@router.post("/OutEBelgeV2/GetOutBoxDocuments", operation_id="createOutebelgev2Getoutboxdocuments")
async def get_outbox_documents(
    payload: GetOutBoxDocumentsRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get outgoing documents from BirFatura"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.get_outbox_documents(payload.model_dump(by_alias=True))
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=resp))
    except Exception as e:
        logger.error(f"Get outbox documents error: {e}")
        return ResponseEnvelope(data=BirfaturaResponse(success=False, message=str(e)))

@router.post("/OutEBelgeV2/GetPDFLinkByUUID", operation_id="createOutebelgev2Getpdflinkbyuuid")
async def get_pdf_link_by_uuid(
    payload: GetPDFLinkRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get PDF link for documents"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    try:
        client = get_configured_client(access.tenant_id, db)
        resp = client.get_pdf_link_by_uuid(payload.model_dump(by_alias=True))
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=resp))
    except Exception as e:
        logger.error(f"Get PDF link error: {e}")
        return ResponseEnvelope(data=BirfaturaResponse(success=False, message=str(e)))

# --- Mock Endpoints for Frontend Development ---
# These endpoints mimic BirFatura functionality for customer selection.
# TODO: Implement actual proxy logic to BirFatura API.

class MockSearchRequest(BaseModel):
    search: Optional[str] = None

class MockDetailRequest(BaseModel):
    customer_id: Optional[str] = None


@router.post("/OutEBelgeV2/GetEnvelopeStatusFromGIB", operation_id="createOutebelgev2Getenvelopestatusfromgib")
async def get_envelope_status_from_gib(
    payload: GetEnvelopeStatusRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_envelope_status_from_gib(body),
    )


@router.post("/OutEBelgeV2/ReEnvelopeAndSend", operation_id="createOutebelgev2Reenvelopeandsend")
async def re_envelope_and_send(
    payload: ReEnvelopeAndSendRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.re_envelope_and_send(body),
    )


@router.post("/OutEBelgeV2/GetCodeListByType", operation_id="createOutebelgev2Getcodelistbytype")
async def get_code_list_by_type(
    payload: GetCodeListByTypeRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    cache_key = f"code-list:{payload.code_type}"
    cached = _cached_value(cache_key)
    if cached is not None:
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=cached))

    response = _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_code_list_by_type(body),
    )
    provider_data = response.data.data if response.data else None
    if isinstance(provider_data, dict) and provider_data.get("Success"):
        _set_cached_value(cache_key, provider_data)
    return response


@router.post("/OutEBelgeV2/GetTaxOfficesAndCodes", operation_id="createOutebelgev2Gettaxofficesandcodes")
async def get_tax_offices_and_codes(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    cache_key = "tax-offices"
    cached = _cached_value(cache_key)
    if cached is not None:
        return ResponseEnvelope(data=BirfaturaResponse(success=True, data=cached))

    response = _provider_proxy(
        access.tenant_id,
        db,
        {},
        lambda client, body: client.get_tax_offices_and_codes(body),
    )
    provider_data = response.data.data if response.data else None
    if isinstance(provider_data, dict) and provider_data.get("Success"):
        _set_cached_value(cache_key, provider_data)
    return response


@router.post("/OutEBelgeV2/GetUserPK", operation_id="createOutebelgev2Getuserpk")
async def get_user_pk(
    payload: GetUserTagRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_user_pk(body),
    )


@router.post("/OutEBelgeV2/GetUserGB", operation_id="createOutebelgev2Getusergb")
async def get_user_gb(
    payload: GetUserTagRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_user_gb(body),
    )


@router.post("/OutEBelgeV2/GibUserList", operation_id="createOutebelgev2Gibuserlist")
async def gib_user_list(
    payload: GibUserListRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.gib_user_list(body),
    )


@router.post("/OutEBelgeV2/PreviewDocumentReturnHTML", operation_id="createOutebelgev2Previewdocumentreturnhtml")
async def preview_document_return_html(
    payload: PreviewDocumentRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.preview_document_html(body),
    )


@router.post("/OutEBelgeV2/GetOutBoxDocumentsWithDetail", operation_id="createOutebelgev2Getoutboxdocumentswithdetail")
async def get_outbox_documents_with_detail(
    payload: GetOutBoxDocumentsRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_outbox_documents_with_detail(body),
    )


@router.post("/OutEBelgeV2/UpdateUnreadedStatus", operation_id="createOutebelgev2Updateunreadedstatus")
async def update_unreaded_status(
    payload: UpdateUnreadedStatusRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.update_unreaded_status(body),
    )


@router.post("/OutEBelgeV2/GetOutBoxDocumentByUUID", operation_id="createOutebelgev2Getoutboxdocumentbyuuid")
async def get_outbox_document_by_uuid(
    payload: GetOutBoxDocumentByUUIDRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return _provider_proxy(
        access.tenant_id,
        db,
        payload.model_dump(by_alias=True, exclude_none=True),
        lambda client, body: client.get_outbox_document_by_uuid(body),
    )


@router.get("/birfatura/reference/code-lists", operation_id="listBirfaturaReferenceCodes")
async def list_reference_codes(
    code_type: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Return normalized BirFatura code lists with caching."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    cache_key = f"normalized-code-list:{code_type}"
    cached = _cached_value(cache_key)
    if cached is not None:
        return ResponseEnvelope(success=True, data=cached, message="Reference codes retrieved from cache")

    client = get_configured_client(access.tenant_id, db)
    response = client.get_code_list_by_type({"CodeType": code_type})
    if not response.get("Success"):
        raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura code list error"))

    items = [
        {
            "code": str(item.get("code") or ""),
            "name": str(item.get("name") or item.get("title") or item.get("code") or ""),
        }
        for item in (response.get("Result") or [])
        if item
    ]
    _set_cached_value(cache_key, items)
    return ResponseEnvelope(success=True, data=items, message="Reference codes retrieved")


@router.get("/birfatura/reference/tax-offices", operation_id="listBirfaturaTaxOffices")
async def list_tax_offices(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Return normalized tax office list with optional filtering."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    cache_key = "normalized-tax-offices"
    offices = _cached_value(cache_key)
    if offices is None:
        client = get_configured_client(access.tenant_id, db)
        response = client.get_tax_offices_and_codes({})
        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura tax office error"))
        offices = [
            {
                "code": str(item.get("TaxOfficeCode") or ""),
                "name": str(item.get("TaxOfficeName") or ""),
            }
            for item in (response.get("Result") or [])
            if item
        ]
        _set_cached_value(cache_key, offices)

    if q:
        needle = q.strip().lower()
        offices = [
            office for office in offices
            if needle in office["name"].lower() or needle in office["code"].lower()
        ]
    return ResponseEnvelope(success=True, data=offices, message="Tax offices retrieved")


@router.get("/birfatura/recipients/check", operation_id="checkBirfaturaRecipient")
async def check_recipient(
    tax_id: str,
    manual_entry: bool = False,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Check whether a taxpayer has BirFatura receiver tags."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    normalized_tax_id = "".join(ch for ch in str(tax_id or "") if ch.isdigit())
    if not normalized_tax_id:
        raise HTTPException(status_code=400, detail="tax_id is required")

    def _normalize_lookup_items(items: list[dict[str, Any]] | None, default_type: str = "PK") -> list[dict[str, str]]:
        normalized: list[dict[str, str]] = []
        seen_values: set[str] = set()
        for item in items or []:
            if not item:
                continue
            identifier = str(item.get("identifier") or "").strip()
            if not identifier:
                continue
            raw_type = str(item.get("pkGbTurKod") or item.get("type2") or default_type).strip().upper() or default_type
            email = identifier if identifier.lower().startswith("urn:mail:") else ""
            type_code = "MAIL" if email and raw_type == default_type else raw_type
            display_name = (
                _meaningful_lookup_text(item.get("title"))
                or _meaningful_lookup_text(item.get("name"))
            )
            label = display_name or email or identifier
            if display_name and email:
                label = f"{display_name} — {email}"
            if identifier in seen_values:
                continue
            seen_values.add(identifier)
            normalized.append({
                "value": identifier,
                "label": label,
                "type": type_code,
                "email": email,
            })

        normalized.sort(key=lambda item: (0 if item.get("type") == "PK" else 1, item.get("label", "")))
        return normalized

    def _extract_recipient_name(items: list[dict[str, Any]] | None) -> str | None:
        for item in items or []:
            if not item:
                continue
            candidate = (
                _meaningful_lookup_text(item.get("title"))
                or _meaningful_lookup_text(item.get("name"))
            )
            if candidate:
                return candidate
        return None

    def _digits(value: Any) -> str:
        return "".join(ch for ch in str(value or "") if ch.isdigit())

    try:
        client = get_configured_client(access.tenant_id, db)

        items: list[dict[str, Any]] = []
        tags: list[dict[str, str]] = []
        recipient_name: str | None = None
        provider_message: str | None = None
        identity_type = "company" if len(normalized_tax_id) == 10 else "person" if len(normalized_tax_id) == 11 else None
        identity_source: str | None = None
        identity_first_name: str | None = None
        identity_last_name: str | None = None
        identity_company_title: str | None = None
        identity_tax_office: str | None = None

        try:
            response = client.get_user_pk({"kn": normalized_tax_id})
            if response.get("Success"):
                items = response.get("Result") or []
                tags = _normalize_lookup_items(items)
                recipient_name = _extract_recipient_name(items)
                provider_message = response.get("Message")
            else:
                provider_message = response.get("Message") or "BirFatura recipient lookup failed"
        except Exception as lookup_error:
            provider_message = str(lookup_error)
            logger.warning("BirFatura recipient lookup failed for %s: %s", normalized_tax_id, lookup_error)

        if not tags:
            try:
                gib_response = client.gib_user_list({
                    "pkGbTypeCode": "PK",
                    "pageNumber": 1,
                    "pageSize": 200,
                })
                gib_items = gib_response.get("Result") or []
                matched_items = [
                    item for item in gib_items
                    if normalized_tax_id in {
                        _digits(item.get("identifier")),
                        _digits(item.get("title")),
                        _digits(item.get("name")),
                    }
                ]
                if matched_items:
                    tags = _normalize_lookup_items(matched_items)
                    recipient_name = recipient_name or _extract_recipient_name(matched_items)
                    provider_message = gib_response.get("Message") or provider_message
                elif not provider_message:
                    provider_message = gib_response.get("Message")
            except Exception as fallback_error:
                logger.warning("BirFatura GIB user fallback failed for %s: %s", normalized_tax_id, fallback_error)
                if not provider_message:
                    provider_message = str(fallback_error)

        if manual_entry and identity_type:
            if identity_type == "company" and recipient_name:
                identity_company_title = recipient_name
                identity_source = "provider"

            needs_portal_lookup = identity_type == "person" or not identity_company_title
            if needs_portal_lookup:
                try:
                    portal_identity = _lookup_identity_from_portal(access.tenant_id, db, normalized_tax_id)
                    if portal_identity:
                        identity_first_name = portal_identity.get("firstName") or identity_first_name
                        identity_last_name = portal_identity.get("lastName") or identity_last_name
                        identity_company_title = portal_identity.get("companyTitle") or identity_company_title
                        identity_tax_office = portal_identity.get("taxOffice") or identity_tax_office
                        if any([identity_first_name, identity_last_name, identity_company_title, identity_tax_office]):
                            identity_source = "portal"
                except Exception as lookup_error:
                    logger.warning("Identity lookup fallback failed for %s: %s", normalized_tax_id, lookup_error)

        default_receiver_tag = next((tag["value"] for tag in tags if tag.get("type") == "PK"), None) or (tags[0]["value"] if tags else None)

        return ResponseEnvelope(
            success=True,
            data={
                "taxId": normalized_tax_id,
                "isEfaturaUser": len(tags) > 0,
                "matchesFound": len(tags),
                "defaultReceiverTag": default_receiver_tag,
                "receiverTags": tags,
                "recipientName": recipient_name,
                "identityType": identity_type,
                "companyTitle": identity_company_title,
                "firstName": identity_first_name,
                "lastName": identity_last_name,
                "taxOffice": identity_tax_office,
                "identitySource": identity_source,
                "message": provider_message or ("BirFatura etiketi bulunamadi" if not tags else None),
            },
            message="Recipient check completed",
        )
    except Exception as route_error:
        logger.error("BirFatura recipient route failed for %s: %s", normalized_tax_id, route_error)
        return ResponseEnvelope(
            success=True,
            data={
                "taxId": normalized_tax_id,
                "isEfaturaUser": False,
                "matchesFound": 0,
                "defaultReceiverTag": None,
                "receiverTags": [],
                "recipientName": None,
                "identityType": "company" if len(normalized_tax_id) == 10 else "person" if len(normalized_tax_id) == 11 else None,
                "companyTitle": None,
                "firstName": None,
                "lastName": None,
                "taxOffice": None,
                "identitySource": None,
                "message": str(route_error),
            },
            message="Recipient check completed with provider error",
        )


@router.get("/birfatura/recipients/tags", operation_id="listBirfaturaRecipientTags")
async def list_recipient_tags(
    tax_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """List normalized recipient tags."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    client = get_configured_client(access.tenant_id, db)
    response = client.get_user_pk({"kn": tax_id})
    if not response.get("Success"):
        raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura recipient tag error"))

    tags = [
        {
            "value": str(item.get("identifier") or ""),
            "label": str(item.get("title") or item.get("name") or item.get("identifier") or ""),
            "type": str(item.get("pkGbTurKod") or item.get("type2") or "PK"),
        }
        for item in (response.get("Result") or [])
        if item
    ]
    return ResponseEnvelope(success=True, data=tags, message="Recipient tags retrieved")


@router.get("/birfatura/sender-tags", operation_id="listBirfaturaSenderTags")
async def list_sender_tags(
    kn: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integration.birfatura.read"))
):
    """List sender tags for the current tenant."""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    tenant = db.get(Tenant, access.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant_settings = tenant.settings or {}
    tenant_invoice_settings = (
        tenant_settings.get("invoice_integration")
        or tenant_settings.get("invoiceIntegration")
        or {}
    )
    company_info = tenant.company_info or {}
    lookup_kn = (
        kn
        or tenant_invoice_settings.get("vkn")
        or tenant_invoice_settings.get("tckn")
        or tenant_invoice_settings.get("tax_id")
        or tenant_invoice_settings.get("taxId")
        or company_info.get("tax_id")
        or company_info.get("taxId")
        or company_info.get("vkn")
        or company_info.get("tckn")
    )
    if not lookup_kn:
        raise HTTPException(status_code=400, detail="Tenant tax identity is not configured")

    client = get_configured_client(access.tenant_id, db)
    response = client.get_user_gb({"kn": lookup_kn})
    if not response.get("Success"):
        raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura sender tag error"))

    tags = []
    for item in (response.get("Result") or []):
        if not item:
            continue
        identifier = str(item.get("identifier") or "").strip()
        if not identifier:
            continue
        display_name = (
            _meaningful_lookup_text(item.get("title"))
            or _meaningful_lookup_text(item.get("name"))
        )
        email = identifier if identifier.lower().startswith("urn:mail:") else ""
        label = display_name or email or identifier
        if display_name and email:
            label = f"{display_name} — {email}"
        tags.append({
            "value": identifier,
            "label": label,
            "type": str(item.get("pkGbTurKod") or item.get("type2") or "GB"),
        })
    return ResponseEnvelope(success=True, data=tags, message="Sender tags retrieved")

@router.post("/Musteri/FirmaMusteriGetir", operation_id="createMusteriFirmamusterigetir")
async def search_firm_customers_mock(
    payload: MockSearchRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock customer search endpoint"""
    return ResponseEnvelope(data=BirfaturaResponse(
        success=True,
        data=[
             {
                "id": "1",
                "name": "Örnek Müşteri A.Ş." + (f" ({payload.search})" if payload.search else ""),
                "taxNumber": "1234567890",
                "isEInvoiceUser": True,
                "tcNumber": None
            }
        ]
    ))

@router.post("/Firma/FirmaPKBilgisiGetir", operation_id="createFirmaFirmapkbilgisigetir")
async def get_firm_pk_info_mock(
    payload: MockDetailRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock PK info endpoint"""
    return ResponseEnvelope(data=BirfaturaResponse(
        success=True,
        data=[
             { "value": "TICARIFATURA", "label": "Ticari Fatura" },
             { "value": "TEMELFATURA", "label": "Temel Fatura" }
        ]
    ))

@router.post("/Firma/FirmaAdresBilgisiGetir", operation_id="createFirmaFirmaadresbilgisigetir")
async def get_firm_address_info_mock(
    payload: MockDetailRequest,
    access: UnifiedAccess = Depends(require_access())
):
    """Mock Address info endpoint"""

    return ResponseEnvelope(data=BirfaturaResponse(
        success=True,
        data=[
            {
                "id": "1",
                "name": "Merkez Ofis",
                "address": "Atatürk Cad. No:123",
                "city": "İstanbul",
                "district": "Kadıköy",
                "postalCode": "34710"
            }
        ]
    ))
