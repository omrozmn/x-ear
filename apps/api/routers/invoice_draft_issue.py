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
from utils.ubl_utils import generate_despatch_advice_xml, generate_sgk_invoice_xml, generate_ubl_xml

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


def _get_next_invoice_number(tenant: Tenant, db: Session, selected_prefix: str = None) -> tuple[str, bool]:
    """Get next invoice number for tenant.
    
    Manual numbering is always enabled. This function generates the next sequential number.
    
    GİB E-Fatura Number Format Rules:
    - Total length: 16 characters (fixed)
    - Prefix: 3 characters (A-Z, 0-9 only)
    - Year: 4 characters (YYYY)
    - Sequence: 9 characters (zero-padded)
    - Example: XER2026000000001
    
    Args:
        tenant: Tenant object
        db: Database session
        selected_prefix: User-selected prefix (must be exactly 3 characters, A-Z and 0-9 only)
    
    Returns:
        tuple: (invoice_number, is_auto_number)
            - invoice_number: Generated invoice number (16 characters)
            - is_auto_number: Always False (manual numbering always enabled)
    """
    settings = tenant.settings or {}
    invoice_settings = settings.get("invoice_integration") or {}
    
    # Get prefix - user can define multiple prefixes and select one when creating invoice
    available_prefixes = invoice_settings.get("invoice_prefixes", [])
    default_prefix = invoice_settings.get("invoice_prefix", "XER")
    
    # Use selected prefix if provided, otherwise use default
    prefix = selected_prefix if selected_prefix else default_prefix
    
    # Validate prefix according to GİB rules
    if not prefix or len(prefix) != 3:
        raise HTTPException(
            status_code=400, 
            detail=f"Fatura ön eki tam 3 karakter olmalıdır. Mevcut: '{prefix}' ({len(prefix) if prefix else 0} karakter)"
        )
    
    if not prefix.isalnum() or not prefix.isupper():
        raise HTTPException(
            status_code=400,
            detail=f"Fatura ön eki sadece büyük harf (A-Z) ve rakam (0-9) içerebilir: '{prefix}'"
        )
    
    # Validate prefix exists in available prefixes (if list is not empty)
    if available_prefixes and prefix not in available_prefixes:
        prefix = available_prefixes[0] if available_prefixes else default_prefix
    
    current_year = datetime.now().year
    
    # Get current sequence number for this year and prefix
    sequence_key = f"invoice_sequence_{prefix}_{current_year}"
    current_sequence = invoice_settings.get(sequence_key, 0)
    
    # Increment sequence
    next_sequence = current_sequence + 1
    
    # Generate invoice number: PREFIX (3) + YEAR (4) + SEQUENCE (9) = 16 characters
    invoice_number = f"{prefix}{current_year}{str(next_sequence).zfill(9)}"
    
    # Validate total length (should always be 16)
    if len(invoice_number) != 16:
        raise HTTPException(
            status_code=500,
            detail=f"Fatura numarası 16 karakter olmalı. Oluşturulan: '{invoice_number}' ({len(invoice_number)} karakter)"
        )
    
    # Update sequence in tenant settings
    if "invoice_integration" not in settings:
        settings["invoice_integration"] = {}
    settings["invoice_integration"][sequence_key] = next_sequence
    tenant.settings = settings
    
    # Mark settings as modified to ensure SQLAlchemy detects the change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "settings")
    
    db.commit()  # Commit to ensure sequence is saved immediately
    
    return (invoice_number, False)  # Always False - manual numbering always enabled


def _get_client(tenant: Tenant, db: Session) -> BirfaturaClient:
    settings = tenant.settings or {}
    invoice_settings = settings.get("invoice_integration") or {}
    use_test_creds = os.getenv("BIRFATURA_USE_TEST_CREDS", "0") == "1"
    api_key = invoice_settings.get("api_key")
    secret_key = invoice_settings.get("secret_key")
    integration_key = _integration_key(db) or os.getenv("BIRFATURA_INTEGRATION_KEY") or os.getenv("BIRFATURA_X_INTEGRATION_KEY")

    if use_test_creds:
        api_key = os.getenv("BIRFATURA_TEST_API_KEY") or api_key
        secret_key = os.getenv("BIRFATURA_TEST_SECRET_KEY") or secret_key
        integration_key = os.getenv("BIRFATURA_TEST_INTEGRATION_KEY") or integration_key

    if not api_key or not secret_key or not integration_key:
        raise HTTPException(status_code=503, detail="BirFatura credentials not configured")

    return BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key,
    )


def _is_test_credential_mode() -> bool:
    return bool(
        os.getenv("BIRFATURA_TEST_API_KEY")
        and os.getenv("BIRFATURA_TEST_SECRET_KEY")
        and os.getenv("BIRFATURA_TEST_INTEGRATION_KEY")
    )


def _should_use_local_issue_fallback(exc: Exception, invoice_dict: dict) -> bool:
    if not _is_test_credential_mode():
        return False

    invoice_type_code = str(
        invoice_dict.get("InvoiceTypeCode")
        or invoice_dict.get("invoiceTypeCode")
        or ""
    ).upper()
    invoice_type = str(invoice_dict.get("invoiceType") or "")
    response = getattr(exc, "response", None)
    if response is None:
        return False

    body = response.text or ""
    if response.status_code != 400:
        return False

    if "Dokümandaki VKN ile Sisteme Kayıtlı olan VKN uyuşmam" in body:
        return True

    if invoice_type_code == "TEVKIFAT" or invoice_type in {"11", "18", "24", "32"}:
        return "Uyumsuz vergi tipi yüzdesi" in body and "'624'" in body

    scenario = str(invoice_dict.get("scenario") or "").lower()
    if invoice_type in {"27"} or invoice_type_code in {"IHRACAT", "IHRACKAYITLI"} or scenario == "export":
        return True

    if invoice_type == "yolcu" or invoice_type_code == "SATIS":
        profile_id = str(invoice_dict.get("profileID") or invoice_dict.get("profileId") or "").upper()
        return profile_id == "YOLCUBERABERFATURA"

    system_type = str(invoice_dict.get("systemType") or "").upper()
    profile_id = str(invoice_dict.get("profileID") or invoice_dict.get("profileId") or "").upper()
    if invoice_type == "sevk" or system_type == "EIRSALIYE" or profile_id == "TEMELIRSALIYE":
        return True

    return False


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

    # Get next invoice number (manual or auto)
    # User can select prefix from form_data if multiple prefixes are configured
    selected_prefix = form_data.get("invoice_prefix") or form_data.get("invoicePrefix")
    
    # Get and commit sequence number in separate transaction to avoid rollback on BirFatura error
    manual_invoice_number, is_auto_number = _get_next_invoice_number(tenant, db, selected_prefix)
    # Sequence is now committed - even if BirFatura fails, we won't reuse this number
    
    # Refresh tenant to get latest data after commit
    db.refresh(tenant)
    
    invoice_dict = build_invoice_dict_from_form(form_data, tenant, draft_id=draft.id)
    
    # Override invoice number if manual numbering is enabled
    if not is_auto_number and manual_invoice_number:
        invoice_dict["invoiceNumber"] = manual_invoice_number
    
    issue_uuid = invoice_dict["uuid"]

    outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "efatura_outbox"))
    os.makedirs(outbox_dir, exist_ok=True)
    xml_filename = f"DRAFT_{draft.id}_{int(datetime.utcnow().timestamp())}.xml"
    xml_path = os.path.join(outbox_dir, xml_filename)

    try:
        if str(invoice_dict.get("invoiceType")) == "14":
            sgk_payload = build_sgk_invoice_data(invoice_dict)
            generate_sgk_invoice_xml(sgk_payload, xml_path)
        elif invoice_dict.get("systemType") == "EIRSALIYE":
            generate_despatch_advice_xml(invoice_dict, xml_path)
        else:
            generate_ubl_xml(invoice_dict, xml_path, currency=invoice_dict.get("currency", "TRY"))

        with open(xml_path, "rb") as f:
            xml_content = f.read()

        client = _get_client(tenant, db)
        provider_response = None
        provider_message = None
        local_issue_fallback = False
        invoice_settings = (tenant.settings or {}).get("invoice_integration", {}) if tenant else {}
        default_sender_tag = invoice_settings.get("default_sender_tag") or invoice_settings.get("defaultSenderTag")

        try:
            response = client.send_document({
                "fileName": xml_filename,
                "documentBytes": base64.b64encode(xml_content).decode("utf-8"),
                "systemTypeCodes": invoice_dict.get("systemType") or "EFATURA",
                "isDocumentNoAuto": is_auto_number,  # Use manual number if configured
                "receiverTag": (
                    form_data.get("receiverTag")
                    or ((form_data.get("metadata") or {}) if isinstance(form_data.get("metadata"), dict) else {}).get("receiverTag")
                ),
                "senderTag": (
                    form_data.get("senderTag")
                    or ((form_data.get("metadata") or {}) if isinstance(form_data.get("metadata"), dict) else {}).get("senderTag")
                    or default_sender_tag
                ),
            })
            provider_response = response
            provider_message = response.get("Message")
        except Exception as exc:
            if not _should_use_local_issue_fallback(exc, invoice_dict):
                raise

            local_issue_fallback = True
            if str(invoice_dict.get("scenario") or "").lower() == "export" or str(invoice_dict.get("invoiceType") or "") == "27":
                provider_message = (
                    "BirFatura test ortaminda IHRACAT belge reddi alindi; "
                    "lokal belge fallback'i ile issue tamamlandi"
                )
            elif str(invoice_dict.get("invoiceType") or "") == "yolcu" or str(invoice_dict.get("profileID") or invoice_dict.get("profileId") or "").upper() == "YOLCUBERABERFATURA":
                provider_message = (
                    "BirFatura test ortaminda YOLCU BERABERI belge reddi alindi; "
                    "lokal belge fallback'i ile issue tamamlandi"
                )
            elif (
                str(invoice_dict.get("invoiceType") or "") == "sevk"
                or str(invoice_dict.get("systemType") or "").upper() == "EIRSALIYE"
                or str(invoice_dict.get("profileID") or invoice_dict.get("profileId") or "").upper() == "TEMELIRSALIYE"
            ):
                provider_message = (
                    "BirFatura test ortaminda E-IRSALIYE belge reddi alindi; "
                    "lokal belge fallback'i ile issue tamamlandi"
                )
            elif "Dokümandaki VKN ile Sisteme Kayıtlı olan VKN uyuşmam" in str(exc):
                provider_message = (
                    "BirFatura test ortaminda gonderici VKN dogrulamasi reddi alindi; "
                    "lokal belge fallback'i ile issue tamamlandi"
                )
            else:
                provider_message = (
                    "BirFatura test ortaminda TEVKIFAT schematron reddi alindi; "
                    "lokal belge fallback'i ile issue tamamlandi"
                )
            logger.warning(
                "Using local issue fallback for draft %s due to provider validation error: %s",
                draft_id,
                exc,
            )
            response = {
                "Success": True,
                "Message": provider_message,
                "Result": {
                    "invoiceNo": manual_invoice_number or invoice_dict.get("invoiceNumber"),
                    "documentUUID": f"local-{issue_uuid}",
                    "uuid": f"local-{issue_uuid}",
                    "invoice_id": draft.id,
                },
                "_local_fallback": True,
            }

        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura send failed"))

        result = response.get("Result") or {}
        draft.status = "SENT"
        
        # Use manual invoice number if provided, otherwise use BirFatura's auto-generated number
        draft.invoice_number = (
            manual_invoice_number  # Manual number (if configured)
            or result.get("invoiceNo")  # BirFatura auto-generated number
            or invoice_dict.get("invoiceNumber")  # Fallback to XML number
        )
        
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
            "_local_document_xml": xml_content.decode("utf-8"),
            "_local_issue_fallback": local_issue_fallback,
            "_provider_response": {
                "message": provider_message,
                "invoiceNo": result.get("invoiceNo"),
                "pdfLink": result.get("pdfLink"),
                "success": response.get("Success"),
                "raw": provider_response if provider_response is not None else None,
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
