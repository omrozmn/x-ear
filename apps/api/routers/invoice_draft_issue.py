import base64
import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db, unbound_session
from core.models.integration_config import IntegrationConfig
from core.models.purchase_invoice import PurchaseInvoice
from core.models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access
from schemas.invoices_new import InvoiceActionResponse
from schemas.response import ResponseEnvelope
from services.birfatura.service import BirfaturaClient
from utils.draft_to_invoice import build_invoice_dict_from_form, build_sgk_invoice_data
from utils.ubl_utils import generate_sgk_invoice_xml, generate_ubl_xml

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


def _resolve_tenant(access: UnifiedAccess) -> str:
    tenant_id = access.effective_tenant_id or access.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    return tenant_id


def _integration_key(db: Session) -> str | None:
    with unbound_session(reason="reading global BirFatura integration key for draft issue"):
        config = db.query(IntegrationConfig).filter_by(
            integration_type="birfatura",
            config_key="integration_key",
        ).first()
    return config.config_value if config else None


def _get_client(tenant: Tenant, db: Session) -> BirfaturaClient:
    settings = tenant.settings or {}
    invoice_settings = settings.get("invoice_integration") or {}
    api_key = invoice_settings.get("api_key")
    secret_key = invoice_settings.get("secret_key")
    integration_key = _integration_key(db)

    if not api_key or not secret_key or not integration_key:
        raise HTTPException(status_code=503, detail="BirFatura credentials not configured")

    return BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key,
    )


@router.post(
    "/draft/{draft_id}/issue",
    operation_id="issueInvoiceDraft",
    response_model=ResponseEnvelope[InvoiceActionResponse],
)
def issue_invoice_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view")),
):
    tenant_id = _resolve_tenant(access)
    draft = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == draft_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.status == "DRAFT",
        PurchaseInvoice.invoice_type == "OUTGOING",
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    form_data = draft.raw_data or {}
    if not isinstance(form_data, dict):
        raise HTTPException(status_code=400, detail="Draft form data is invalid")

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    invoice_dict = build_invoice_dict_from_form(form_data, tenant, draft_id=draft.id)
    issue_uuid = invoice_dict["uuid"]

    outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "efatura_outbox"))
    os.makedirs(outbox_dir, exist_ok=True)
    xml_filename = f"DRAFT_{draft.id}_{int(datetime.utcnow().timestamp())}.xml"
    xml_path = os.path.join(outbox_dir, xml_filename)

    try:
        if str(invoice_dict.get("invoiceType")) == "14":
            sgk_payload = build_sgk_invoice_data(invoice_dict)
            generate_sgk_invoice_xml(sgk_payload, xml_path)
        else:
            generate_ubl_xml(invoice_dict, xml_path, currency=invoice_dict.get("currency", "TRY"))

        with open(xml_path, "rb") as f:
            xml_content = f.read()

        client = _get_client(tenant, db)
        response = client.send_document({
            "fileName": xml_filename,
            "documentBytes": base64.b64encode(xml_content).decode("utf-8"),
            "systemTypeCodes": "EFATURA",
            "isDocumentNoAuto": True,
        })

        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura send failed"))

        result = response.get("Result") or {}
        draft.status = "SENT"
        draft.invoice_number = result.get("invoiceNo") or invoice_dict.get("invoiceNumber")
        draft.birfatura_uuid = (
            result.get("ettn")
            or result.get("documentUUID")
            or result.get("uuid")
            or issue_uuid
            or f"sent-{uuid.uuid4()}"
        )
        draft.invoice_date = datetime.utcnow()
        draft.sender_name = invoice_dict.get("customer", {}).get("name") or draft.sender_name
        draft.sender_tax_number = invoice_dict.get("customer", {}).get("tax_id") or draft.sender_tax_number
        draft.sender_address = (invoice_dict.get("customer", {}).get("address") or {}).get("street") or draft.sender_address
        draft.sender_city = (invoice_dict.get("customer", {}).get("address") or {}).get("city") or draft.sender_city
        draft.currency = invoice_dict.get("currency") or draft.currency
        draft.subtotal = invoice_dict.get("subtotal") or draft.subtotal
        draft.tax_amount = invoice_dict.get("taxAmount") or draft.tax_amount
        draft.total_amount = invoice_dict.get("totalAmount") or draft.total_amount
        draft.notes = response.get("Message") or draft.notes
        draft.raw_data = {
            **invoice_dict,
            "_source_form_data": form_data,
            "_issued_at": datetime.utcnow().isoformat(),
            "_provider_response": {
                "message": response.get("Message"),
                "invoiceNo": result.get("invoiceNo"),
                "pdfLink": result.get("pdfLink"),
            },
        }
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Error issuing invoice draft %s: %s", draft_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to issue draft: {exc}")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(
            invoice_id=draft.id,
            success=True,
            message="Taslak BirFatura'ya gönderildi",
        ),
        message="Draft issued successfully",
    )
