"""
New invoices router for incoming/outgoing invoice management.
Separate from existing invoices.py to avoid conflicts.
MAX 500 LOC per project rules.
"""
import base64
import gzip
import io
import logging
import os
import re
import ast
import requests
import uuid
import zipfile
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from core.database import get_db, unbound_session
from middleware.unified_access import UnifiedAccess, require_access
from schemas.response import ResponseEnvelope
from schemas.invoices_new import (
    IncomingInvoiceListResponse,
    OutgoingInvoiceListResponse,
    ConvertToPurchaseRequest, ConvertToPurchaseResponse,
    InvoiceStatus, InvoiceSummaryStats,
    InvoiceActionResponse, InvoiceRejectRequest, InvoiceCancelRequest,
    InvoiceDraftRequest, InvoiceDraftResponse,
    SupplierInvoiceItemResponse, SupplierInvoiceItemsListResponse,
    InvoiceProviderStatusResponse, InvoiceProviderActionResponse,
    ReferenceCodeItemResponse, TaxOfficeItemResponse, RecipientCheckResponse,
    SupplierSuggestionResponse, SupplierSuggestionItem,
    ProductSearchMatchedItem, ProductSearchInvoiceResult, ProductSearchResponse,
)
from core.models.purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem
from core.models.tenant import Tenant
from core.models.integration_config import IntegrationConfig
from core.models.purchase import Purchase
from core.models.suppliers import Supplier
from services.birfatura.service import BirfaturaClient
from services.invoice_service_new import InvoiceServiceNew

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


def _resolve_tenant(access: UnifiedAccess) -> str:
    tenant_id = access.effective_tenant_id or access.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    return tenant_id
_REFERENCE_CACHE_TTL_SECONDS = 60 * 60 * 12
_reference_cache: dict[str, tuple[datetime, object]] = {}

# ── PDF cache helpers ──────────────────────────────────────────────────────────
_PDF_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "pdf_cache"))

def _validate_birfatura_uuid(birfatura_uuid: str) -> None:
    """Validate birfatura_uuid to prevent path traversal attacks."""
    if not re.match(r'^[a-zA-Z0-9_-]+$', birfatura_uuid):
        raise HTTPException(status_code=400, detail="Invalid UUID format")


def _get_cached_pdf(invoice_id: int, birfatura_uuid: str | None) -> bytes | None:
    """Return cached PDF bytes if available, else None."""
    if not birfatura_uuid:
        return None
    _validate_birfatura_uuid(birfatura_uuid)
    path = os.path.join(_PDF_CACHE_DIR, f"{birfatura_uuid}.pdf")
    if os.path.isfile(path):
        try:
            with open(path, "rb") as f:
                data = f.read()
            if data[:4] == b"%PDF":
                return data
        except Exception:
            pass
    return None

def _save_pdf_cache(birfatura_uuid: str, pdf_bytes: bytes) -> None:
    """Persist PDF bytes to disk cache."""
    try:
        _validate_birfatura_uuid(birfatura_uuid)
        os.makedirs(_PDF_CACHE_DIR, exist_ok=True)
        path = os.path.join(_PDF_CACHE_DIR, f"{birfatura_uuid}.pdf")
        with open(path, "wb") as f:
            f.write(pdf_bytes)
    except Exception as e:
        logger.debug("Failed to cache PDF for %s: %s", birfatura_uuid, e)

# ── Invoice type / UBL helpers for copy/draft ──────────────────────────────────
_DOC_TYPE_TO_FORM = {
    "SATIS": "0", "IADE": "50", "ISTISNA": "13",
    "TEVKIFAT": "11", "OZELMATRAH": "12", "IHRAC": "27",
    "IHRACKAYITLI": "27", "SGK": "14", "TEVKIFAT_IADE": "15",
    "KOMISYONCU": "16", "HKSSATIS": "17", "HKSKOMISYONCU": "18",
    "KONAKLAMAVERGI": "19",
}
_PROFILE_TO_SCENARIO = {
    "TEMELFATURA": "other", "TICARIFATURA": "other",
    "IHRACFATURA": "export", "KAMUFATURA": "government",
    "EARSIVFATURA": "other",
}

_LINE_EXT_KEYS = (
    "discount", "discountType",
    "taxExemptionCode", "tax_exemption_code",
    "taxExemptionReason", "tax_exemption_reason",
    "withholdingData", "withholding_rate", "withholding_code",
    "medicalDeviceData", "medical_device_data",
    "lineWithholding",
    "specialBaseData", "specialTaxBase",
    "sgkCode", "serviceCode", "aliciStokKodu",
    "description", "gtipCode",
)

# UBL unit codes → form unit values (Turkish)
_UBL_UNIT_TO_FORM: dict[str, str] = {
    "MON": "Ay", "ANN": "Yıl", "DAY": "Gün", "HUR": "Saat",
    "NIU": "Adet", "C62": "Adet", "EA": "Adet",
    "KGM": "Kg", "TNE": "Ton", "LTR": "Lt",
    "MTR": "M", "MTK": "M2", "MTQ": "M3",
    "XPK": "Paket", "BX": "Kutu", "KT": "Takım", "XCS": "Koli",
    "PR": "Kişi",
    # Uppercase/lowercase variants
    "ADET": "Adet", "AY": "Ay",
}

def _normalize_unit(unit: str) -> str:
    """Map UBL unit codes to form-friendly Turkish unit names."""
    if not unit:
        return "Adet"
    return _UBL_UNIT_TO_FORM.get(unit, unit)


def _ubl_val(obj, default=""):
    """Get plain value from UBL {'Value': x} wrapper or return as-is."""
    if isinstance(obj, dict):
        return obj.get("Value", default)
    return obj if obj is not None else default


def _resolve_invoice_type_code(raw: dict) -> str:
    """Extract form invoiceType code from any raw_data format."""
    # Rich format (X-EAR invoice_dict)
    it = raw.get("invoiceType")
    if it and isinstance(it, str) and it in _DOC_TYPE_TO_FORM.values():
        return it

    # BirFatura flat API
    dtc = raw.get("DocumentTypeCode") or raw.get("InvoiceTypeCode") or ""
    if isinstance(dtc, dict):
        dtc = dtc.get("Value", "")
    if isinstance(dtc, str):
        dtc = dtc.strip()
    if dtc in _DOC_TYPE_TO_FORM:
        return _DOC_TYPE_TO_FORM[dtc]
    # Already a form code
    if dtc in _DOC_TYPE_TO_FORM.values():
        return dtc
    return "0"


def _resolve_scenario(raw: dict) -> str:
    """Extract form scenario from any raw_data format."""
    sc = raw.get("scenario")
    if sc and isinstance(sc, str) and sc != "other":
        return sc
    pid = raw.get("ProfileID") or raw.get("profileId") or ""
    if isinstance(pid, dict):
        pid = pid.get("Value", "")
    return _PROFILE_TO_SCENARIO.get(pid, "other")


def _extract_customer_from_raw(raw: dict, original) -> dict:
    """Extract customer fields from any raw_data format."""
    # Rich format (X-EAR invoice_dict)
    customer = raw.get("customer") or {}
    if customer:
        addr = customer.get("address") or {}
        return {
            "customerFirstName": customer.get("name") or original.sender_name or "",
            "customerTaxNumber": customer.get("tax_id") or original.sender_tax_number or "",
            "customerTaxId": customer.get("tax_id") or original.sender_tax_number or "",
            "customerTaxOffice": customer.get("tax_office") or original.sender_tax_office or "",
            "customerAddress": addr.get("street") or original.sender_address or "",
            "customerCity": addr.get("city") or original.sender_city or "",
        }
    # UBL format (AccountingCustomerParty)
    acp = raw.get("AccountingCustomerParty") or {}
    party = acp.get("Party") or {}
    if party:
        pn = party.get("PartyName") or {}
        tax_scheme = party.get("PartyTaxScheme") or {}
        postal = party.get("PostalAddress") or {}
        return {
            "customerFirstName": _ubl_val(pn.get("Name")) or original.sender_name or "",
            "customerTaxNumber": _ubl_val(tax_scheme.get("ID")) or original.sender_tax_number or "",
            "customerTaxId": _ubl_val(tax_scheme.get("ID")) or original.sender_tax_number or "",
            "customerTaxOffice": _ubl_val((tax_scheme.get("TaxScheme") or {}).get("Name")) or original.sender_tax_office or "",
            "customerAddress": _ubl_val(postal.get("StreetName")) or original.sender_address or "",
            "customerCity": _ubl_val(postal.get("CityName")) or original.sender_city or "",
        }
    # Flat BirFatura API
    return {
        "customerFirstName": original.sender_name or raw.get("ReceiverName") or raw.get("receiverName", ""),
        "customerTaxNumber": original.sender_tax_number or raw.get("ReceiverKN") or raw.get("receiverKN", ""),
        "customerTaxId": original.sender_tax_number or raw.get("ReceiverKN") or raw.get("receiverKN", ""),
        "customerTaxOffice": original.sender_tax_office or "",
        "customerAddress": original.sender_address or "",
        "customerCity": original.sender_city or "",
    }


def _extract_items_from_raw(raw: dict) -> list[dict]:
    """Extract form items from any raw_data format (rich, UBL, flat)."""
    # Rich format (X-EAR invoice_dict)
    rich_lines = raw.get("lines") or []
    if rich_lines:
        items = []
        for line in rich_lines:
            item = {
                "id": str(uuid.uuid4()),
                "name": line.get("name") or line.get("description") or "",
                "description": line.get("description") or "",
                "quantity": float(line.get("quantity", 1)),
                "unit": line.get("unit") or "Adet",
                "unitPrice": float(line.get("unitPrice") or line.get("price", 0)),
                "taxRate": float(line.get("tax_rate") or line.get("taxRate", 0)),
                "taxAmount": float(line.get("tax_amount") or line.get("taxAmount", 0)),
                "total": float(line.get("line_extension_amount") or line.get("total", 0)),
            }
            for ext_key in _LINE_EXT_KEYS:
                val = line.get(ext_key)
                if val is not None:
                    item[ext_key] = val
            items.append(item)
        return items

    # UBL format (InvoiceLine)
    ubl_lines = raw.get("InvoiceLine") or []
    if isinstance(ubl_lines, dict):
        ubl_lines = [ubl_lines]
    if ubl_lines:
        unit_map = _UBL_UNIT_TO_FORM
        items = []
        for line in ubl_lines:
            item_obj = line.get("Item") or {}
            qty_obj = line.get("InvoicedQuantity") or {}
            price_obj = line.get("Price") or {}
            tax_total = line.get("TaxTotal") or {}
            # Extract tax rate/amount
            tax_rate = 0.0
            tax_amount = 0.0
            if isinstance(tax_total, dict):
                tax_amount = float(_ubl_val(tax_total.get("TaxAmount", {}), 0))
                tax_subtotals = tax_total.get("TaxSubtotal", [])
                if isinstance(tax_subtotals, dict):
                    tax_subtotals = [tax_subtotals]
                if tax_subtotals:
                    tax_rate = float(_ubl_val(tax_subtotals[0].get("Percent", {}), 0))
            # Withholding tax
            wh_total = line.get("WithholdingTaxTotal") or {}
            wh_data = {}
            if isinstance(wh_total, dict) and wh_total:
                wh_subtotals = wh_total.get("TaxSubtotal", [])
                if isinstance(wh_subtotals, dict):
                    wh_subtotals = [wh_subtotals]
                if wh_subtotals:
                    wh_sub = wh_subtotals[0]
                    wh_data = {
                        "rate": float(_ubl_val(wh_sub.get("Percent", {}), 0)),
                        "code": _ubl_val((wh_sub.get("TaxCategory", {}).get("TaxScheme", {}) or {}).get("TaxTypeCode", {}), ""),
                    }
            elif isinstance(wh_total, list):
                for wht in wh_total:
                    wh_subtotals = (wht or {}).get("TaxSubtotal", [])
                    if isinstance(wh_subtotals, dict):
                        wh_subtotals = [wh_subtotals]
                    if wh_subtotals:
                        wh_sub = wh_subtotals[0]
                        wh_data = {
                            "rate": float(_ubl_val(wh_sub.get("Percent", {}), 0)),
                            "code": _ubl_val((wh_sub.get("TaxCategory", {}).get("TaxScheme", {}) or {}).get("TaxTypeCode", {}), ""),
                        }
                        break
            # Tax exemption
            tax_exemption_code = ""
            tax_exemption_reason = ""
            if isinstance(tax_total, dict):
                ts = tax_total.get("TaxSubtotal", [])
                if isinstance(ts, dict):
                    ts = [ts]
                if ts:
                    tc = ts[0].get("TaxCategory", {}) or {}
                    tax_exemption_code = _ubl_val(tc.get("TaxExemptionReasonCode", {}), "")
                    tax_exemption_reason = _ubl_val(tc.get("TaxExemptionReason", {}), "")

            uc = qty_obj.get("unitCode", "C62") if isinstance(qty_obj, dict) else "C62"
            item = {
                "id": str(uuid.uuid4()),
                "name": _ubl_val(item_obj.get("Name", {})),
                "description": _ubl_val(item_obj.get("Description", {})),
                "quantity": float(_ubl_val(qty_obj, 1)),
                "unit": unit_map.get(uc, uc),
                "unitPrice": float(_ubl_val((price_obj.get("PriceAmount") or {}), 0)),
                "taxRate": tax_rate,
                "taxAmount": tax_amount,
                "total": float(_ubl_val(line.get("LineExtensionAmount", {}), 0)),
            }
            if tax_exemption_code:
                item["taxExemptionCode"] = tax_exemption_code
            if tax_exemption_reason:
                item["taxExemptionReason"] = tax_exemption_reason
            if wh_data:
                item["withholdingData"] = wh_data
            # Seller item code
            seller_id = (item_obj.get("SellersItemIdentification") or {}).get("ID")
            if seller_id:
                item["serviceCode"] = _ubl_val(seller_id)
            buyer_id = (item_obj.get("BuyersItemIdentification") or {}).get("ID")
            if buyer_id:
                item["aliciStokKodu"] = _ubl_val(buyer_id)
            items.append(item)
        return items

    # Flat BirFatura API format (invoiceLines)
    flat_lines = raw.get("invoiceLines") or raw.get("invoiceLine") or []
    if flat_lines:
        items = []
        for line in flat_lines:
            item = {
                "id": str(uuid.uuid4()),
                "name": line.get("itemName") or line.get("name", ""),
                "description": line.get("itemDescription") or line.get("description", ""),
                "quantity": float(line.get("quantity", 1)),
                "unit": line.get("unitCode") or line.get("unit", "Adet"),
                "unitPrice": float(line.get("priceAmount") or line.get("unitPrice", 0)),
                "taxRate": float(line.get("taxRate") or line.get("tax_rate", 20)),
                "taxAmount": float(line.get("taxAmount") or line.get("tax_amount", 0)),
                "total": float(line.get("lineExtensionAmount") or line.get("lineTotal", 0)),
            }
            for ext_key in _LINE_EXT_KEYS:
                val = line.get(ext_key)
                if val is not None:
                    item[ext_key] = val
            items.append(item)
        return items

    return []


def _extract_type_specific_data(raw: dict) -> dict:
    """Extract SGK, withholding, export, special tax base etc. from any raw_data format."""
    extra: dict = {}

    # SGK data
    sgk = raw.get("sgk_data") or raw.get("sgkData")
    if isinstance(sgk, dict) and sgk:
        extra["sgkData"] = sgk

    # Export details
    export = raw.get("exportDetails") or raw.get("export_details")
    if isinstance(export, dict) and export:
        extra["exportDetails"] = export

    # Withholding data (document-level)
    withholding = raw.get("withholdingData") or raw.get("withholding_data")
    if isinstance(withholding, dict) and withholding:
        extra["withholdingData"] = withholding
    # UBL WithholdingTaxTotal (document-level fallback)
    if not withholding:
        wh_total = raw.get("WithholdingTaxTotal")
        if wh_total:
            if isinstance(wh_total, dict):
                wh_total = [wh_total]
            if isinstance(wh_total, list) and wh_total:
                wh_sub_list = (wh_total[0] or {}).get("TaxSubtotal", [])
                if isinstance(wh_sub_list, dict):
                    wh_sub_list = [wh_sub_list]
                if wh_sub_list:
                    wh_sub = wh_sub_list[0]
                    tc = (wh_sub.get("TaxCategory") or {})
                    ts = (tc.get("TaxScheme") or {})
                    extra["withholdingData"] = {
                        "rate": float(_ubl_val(wh_sub.get("Percent", {}), 0)),
                        "code": _ubl_val(ts.get("TaxTypeCode", {}), ""),
                        "name": _ubl_val(ts.get("Name", {}), ""),
                    }

    # Government fields
    for gk in ("governmentPayingCustomer", "governmentExemptionReason", "governmentExportRegisteredReason"):
        if raw.get(gk) is not None:
            extra[gk] = raw[gk]

    # Profile details
    profile = raw.get("profileDetails") or raw.get("profile_details")
    if isinstance(profile, dict) and profile:
        extra["profileDetails"] = profile

    # Return invoice details
    ret = raw.get("returnInvoiceDetails") or raw.get("return_invoice_details")
    if isinstance(ret, dict) and ret:
        extra["returnInvoiceDetails"] = ret
    # UBL BillingReference (can be a dict or a list of dicts)
    billing_ref = raw.get("BillingReference")
    if billing_ref and not ret:
        # Normalize to single dict (take first element if list)
        if isinstance(billing_ref, list):
            billing_ref = billing_ref[0] if billing_ref else {}
        if isinstance(billing_ref, dict):
            inv_ref = billing_ref.get("InvoiceDocumentReference") or {}
            ref_id = _ubl_val(inv_ref.get("ID", {}))
            ref_date = _ubl_val(inv_ref.get("IssueDate", {}))
            if ref_id:
                extra["returnInvoiceDetails"] = {
                    "returnInvoiceNumber": ref_id,
                    "returnInvoiceDate": ref_date,
                }

    # Special tax base
    stb = raw.get("specialTaxBase") or raw.get("special_tax_base")
    if isinstance(stb, dict) and stb:
        extra["specialTaxBase"] = stb

    # Medical device data
    med = raw.get("medicalDeviceData") or raw.get("medical_device_data")
    if isinstance(med, dict) and med:
        extra["medicalDeviceData"] = med

    # Notes
    notes_val = raw.get("notes") or raw.get("Note")
    if notes_val:
        if isinstance(notes_val, list):
            parts = []
            for n in notes_val:
                parts.append(_ubl_val(n) if isinstance(n, dict) else str(n))
            extra["notes"] = " ".join(p for p in parts if p)
        elif isinstance(notes_val, dict):
            extra["notes"] = _ubl_val(notes_val)
        elif isinstance(notes_val, str):
            extra["notes"] = notes_val

    # UBL AdditionalDocumentReference — may contain SGK dosya no, referans no etc.
    add_refs = raw.get("AdditionalDocumentReference") or []
    if isinstance(add_refs, dict):
        add_refs = [add_refs]
    for ref in add_refs:
        if not isinstance(ref, dict):
            continue
        doc_type = _ubl_val(ref.get("DocumentType", {}))
        ref_id = _ubl_val(ref.get("ID", {}))
        # DocumentDescription holds the field label, DocumentType holds the value
        doc_desc_raw = ref.get("DocumentDescription", [])
        if isinstance(doc_desc_raw, dict):
            doc_desc_raw = [doc_desc_raw]
        desc_label = ""
        for dd in (doc_desc_raw if isinstance(doc_desc_raw, list) else []):
            desc_label = (_ubl_val(dd) if isinstance(dd, dict) else str(dd)).lower()
            if desc_label:
                break
        if not doc_type:
            continue
        dt_lower = doc_type.lower()
        if "dosya" in dt_lower and ref_id:
            extra.setdefault("sgkData", {})["dosyaNo"] = ref_id
        elif "abone" in dt_lower and ref_id:
            extra.setdefault("sgkData", {})["aboneNo"] = ref_id
        # SGK pattern: desc_label is field name, doc_type is field value
        if desc_label:
            if "evrak" in desc_label or "dosya" in desc_label:
                extra.setdefault("sgkData", {})["dosyaNo"] = doc_type
            elif "mükellef" in desc_label and "kod" in desc_label:
                extra.setdefault("sgkData", {})["mukellefKodu"] = doc_type
            elif "mükellef" in desc_label and "ad" in desc_label:
                extra.setdefault("sgkData", {})["mukellefAdi"] = doc_type
            elif "satış merkezi kod" in desc_label:
                extra.setdefault("sgkData", {})["mukellefKodu"] = doc_type
            elif "satış merkezi ad" in desc_label:
                extra.setdefault("sgkData", {})["mukellefAdi"] = doc_type

    # UBL InvoicePeriod → SGK period dates
    inv_period = raw.get("InvoicePeriod")
    if isinstance(inv_period, dict):
        start_d = _ubl_val(inv_period.get("StartDate", {}))
        end_d = _ubl_val(inv_period.get("EndDate", {}))
        if start_d or end_d:
            sgk_d = extra.setdefault("sgkData", {})
            if start_d:
                dt_str = start_d[:10] if isinstance(start_d, str) else str(start_d)
                sgk_d["periodStartDate"] = dt_str
                parts = dt_str.split("-")
                if len(parts) >= 2:
                    sgk_d.setdefault("periodYear", parts[0])
                    sgk_d.setdefault("periodMonth", str(int(parts[1])))
            if end_d:
                dt_str = end_d[:10] if isinstance(end_d, str) else str(end_d)
                sgk_d["periodEndDate"] = dt_str

    return extra


def _build_form_data_from_raw(raw: dict, original) -> dict:
    """Build complete form_data from any raw_data format (rich, UBL, flat BirFatura API).
    Also checks _source_form_data embedded in raw as a high-fidelity source."""
    # If _source_form_data exists inside raw, prefer it for type-specific data
    src = raw.get("_source_form_data") if isinstance(raw.get("_source_form_data"), dict) else None

    form_data = {
        "invoiceType": _resolve_invoice_type_code(src or raw),
        "scenario": _resolve_scenario(src or raw),
        "currency": (
            (src or raw).get("currency")
            or _ubl_val(raw.get("DocumentCurrencyCode", {}))
            or original.currency
            or "TRY"
        ),
        **_extract_customer_from_raw(src or raw, original),
    }

    # Items: prefer _source_form_data items, then extract from raw
    if src and src.get("items"):
        form_data["items"] = src["items"]
    else:
        items = _extract_items_from_raw(raw)
        if items:
            form_data["items"] = items

    # Type-specific data: merge from both _source_form_data and raw
    if src:
        form_data.update(_extract_type_specific_data(src))
    form_data.update(_extract_type_specific_data(raw))

    # Normalize UBL unit codes → form values
    if form_data.get("items"):
        for fi in form_data["items"]:
            if fi.get("unit"):
                fi["unit"] = _normalize_unit(fi["unit"])

    # Ensure SGK additionalInfo default
    if form_data.get("sgkData") and isinstance(form_data["sgkData"], dict):
        form_data["sgkData"].setdefault("additionalInfo", "E")

    return form_data


def _reference_cache_get(key: str) -> object | None:
    cached = _reference_cache.get(key)
    if not cached:
        return None
    created_at, payload = cached
    if (datetime.utcnow() - created_at).total_seconds() > _REFERENCE_CACHE_TTL_SECONDS:
        _reference_cache.pop(key, None)
        return None
    return payload


def _reference_cache_set(key: str, payload: object) -> None:
    _reference_cache[key] = (datetime.utcnow(), payload)


@router.get("/incoming", 
            operation_id="listIncomingInvoices",
            response_model=ResponseEnvelope[IncomingInvoiceListResponse])
def list_incoming_invoices(
    status: Optional[InvoiceStatus] = Query(None, description="Filter by status"),
    supplier_name: Optional[str] = Query(None, description="Filter by supplier name"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=500, description="Items per page"),
    sort_field: Optional[str] = Query(None, description="Sort field: invoiceDate, supplier, invoiceNumber, totalAmount, status"),
    sort_dir: Optional[str] = Query(None, description="Sort direction: asc or desc"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    List incoming invoices (gelen faturalar) with filtering and pagination.
    Tenant isolation enforced.
    """
    try:
        service = InvoiceServiceNew(db)
        result = service.list_incoming_invoices(
            tenant_id=_resolve_tenant(access),
            status=status,
            supplier_name=supplier_name,
            date_from=date_from,
            date_to=date_to,
            page=page,
            per_page=per_page,
            sort_field=sort_field,
            sort_dir=sort_dir,
        )
        
        return ResponseEnvelope(
            success=True,
            data=result,
            message="Incoming invoices retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error listing incoming invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve incoming invoices")


@router.get("/incoming/suggest-supplier",
            operation_id="suggestSupplierMatch",
            response_model=ResponseEnvelope[SupplierSuggestionResponse])
def suggest_supplier_match(
    sender_name: str = Query(..., description="Invoice sender name from OCR or e-fatura"),
    sender_tax_number: Optional[str] = Query(None, description="Invoice sender tax number"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("purchases.view"))
):
    """
    Auto-suggest matching suppliers for an invoice sender using fuzzy matching.
    Returns ranked list of potential supplier matches with confidence scores.
    """
    from utils.turkish_fuzzy_match import fuzzy_match_supplier
    tenant_id = _resolve_tenant(access)
    
    try:
        suppliers = db.query(Supplier).filter(
            and_(
                Supplier.tenant_id == tenant_id,
                Supplier.is_active == True
            )
        ).all()
        
        supplier_dicts = [
            {
                'id': s.id,
                'company_name': s.company_name,
                'tax_number': s.tax_number,
                'tax_office': s.tax_office,
                'city': s.city,
            }
            for s in suppliers
        ]
        
        matches = fuzzy_match_supplier(
            name=sender_name,
            tax_number=sender_tax_number,
            suppliers=supplier_dicts,
            threshold=0.4
        )
        
        suggestions = [
            SupplierSuggestionItem(
                supplier_id=match[0]['id'],
                company_name=match[0]['company_name'],
                tax_number=match[0].get('tax_number'),
                score=round(match[1], 3),
                match_reason=match[2],
            )
            for match in matches[:5]
        ]
        
        return ResponseEnvelope(
            success=True,
            data=SupplierSuggestionResponse(suggestions=suggestions, query=sender_name)
        )
        
    except Exception as e:
        logger.error(f"Error suggesting supplier match: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to suggest supplier match")


@router.get("/incoming/search-by-product",
            operation_id="searchIncomingInvoicesByProduct",
            response_model=ResponseEnvelope[ProductSearchResponse])
def search_incoming_invoices_by_product(
    q: str = Query(..., min_length=2, description="Product name keyword (case-insensitive, partial match)"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    Search all incoming invoices for line items whose product_name contains the
    given keyword. Used by the device-replacement modal to pre-fill return invoice
    data from an existing purchase invoice.

    Returns invoices grouped with their matching line items.
    """
    try:
        tenant_id = _resolve_tenant(access)
        q_lower = q.strip().lower()

        # Find invoices that have at least one matching item
        matching_items = (
            db.query(PurchaseInvoiceItem)
            .join(PurchaseInvoice, PurchaseInvoiceItem.purchase_invoice_id == PurchaseInvoice.id)
            .filter(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.invoice_type == "INCOMING",
                PurchaseInvoiceItem.product_name.ilike(f"%{q_lower}%"),
            )
            .all()
        )

        # Group by invoice
        invoice_map: dict[int, tuple[PurchaseInvoice, list[PurchaseInvoiceItem]]] = {}
        for item in matching_items:
            inv = item.purchase_invoice
            if inv is None:
                continue
            if inv.id not in invoice_map:
                invoice_map[inv.id] = (inv, [])
            invoice_map[inv.id][1].append(item)

        results: list[ProductSearchInvoiceResult] = []
        for inv, items in invoice_map.values():
            matched = [
                ProductSearchMatchedItem(
                    product_name=it.product_name or "",
                    quantity=float(it.quantity or 1),
                    unit_price=float(it.unit_price or 0),
                    line_total=float(it.line_total or 0),
                    unit=it.unit,
                )
                for it in items
            ]
            inv_date = None
            if inv.invoice_date:
                inv_date = inv.invoice_date[:10] if isinstance(inv.invoice_date, str) else str(inv.invoice_date)[:10]

            # Resolve address/city: prefer purchase_invoice fields, fallback to suppliers table
            s_address = getattr(inv, 'sender_address', None) or ""
            s_city = getattr(inv, 'sender_city', None) or ""
            s_district = getattr(inv, 'sender_district', None) or ""
            s_tax = getattr(inv, 'sender_tax_number', None) or ""
            if (not s_address or not s_city or not s_district) and s_tax:
                from core.models.suppliers import Supplier
                supplier = db.query(Supplier).filter(
                    Supplier.tenant_id == tenant_id,
                    Supplier.tax_number == s_tax,
                ).first()
                if supplier:
                    if not s_address and supplier.address:
                        s_address = supplier.address
                    if not s_city and supplier.city:
                        s_city = supplier.city
                    if not s_district and getattr(supplier, 'district', None):
                        s_district = supplier.district

            results.append(
                ProductSearchInvoiceResult(
                    invoice_id=inv.id,
                    invoice_number=inv.invoice_number or f"INV-{inv.id}",
                    invoice_date=inv_date,
                    sender_name=inv.sender_name or "",
                    sender_tax_number=s_tax or None,
                    sender_address=s_address or None,
                    sender_city=s_city or None,
                    sender_district=s_district or None,
                    matched_items=matched,
                )
            )

        # Sort: most recent first
        results.sort(key=lambda r: r.invoice_date or "", reverse=True)

        return ResponseEnvelope(
            success=True,
            data=ProductSearchResponse(invoices=results, total=len(results)),
        )

    except Exception as e:
        logger.error(f"Error searching invoices by product: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search invoices by product")


@router.get("/incoming/supplier-items",
            operation_id="listSupplierInvoiceItems",
            response_model=ResponseEnvelope[SupplierInvoiceItemsListResponse])
def list_supplier_invoice_items(
    supplier_name: str = Query(..., description="Supplier name to filter by"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    List all invoice items (ürünler) from a specific supplier's incoming invoices.
    Returns individual line items with their parent invoice number.
    """
    try:
        tenant_id = _resolve_tenant(access)

        invoices = db.query(PurchaseInvoice).filter(
            PurchaseInvoice.tenant_id == tenant_id,
            PurchaseInvoice.invoice_type == 'INCOMING',
            PurchaseInvoice.sender_name.ilike(f"%{supplier_name}%")
        ).all()

        # Build a set of inventory product names for quick lookup
        from core.models.inventory import InventoryItem
        inv_by_name = {}
        inv_items = db.query(InventoryItem.id, InventoryItem.name).filter(
            InventoryItem.tenant_id == tenant_id
        ).all()
        for inv in inv_items:
            inv_by_name[inv.name.lower().strip()] = inv.id

        items = []
        for invoice in invoices:
            for item in (invoice.items or []):
                # Resolve inventory_id: use direct link or match by name
                resolved_inv_id = item.inventory_id
                if not resolved_inv_id and item.product_name:
                    resolved_inv_id = inv_by_name.get(item.product_name.lower().strip())
                    if resolved_inv_id and not item.inventory_id:
                        item.inventory_id = resolved_inv_id

                items.append(SupplierInvoiceItemResponse(
                    id=item.id,
                    purchase_invoice_id=invoice.id,
                    invoice_number=invoice.invoice_number or f"INV-{invoice.id}",
                    invoice_date=invoice.invoice_date,
                    product_code=item.product_code,
                    product_name=item.product_name,
                    product_description=item.product_description,
                    quantity=item.quantity,
                    unit=item.unit,
                    unit_price=item.unit_price,
                    tax_rate=item.tax_rate or 18,
                    tax_amount=item.tax_amount,
                    line_total=item.line_total,
                    inventory_id=resolved_inv_id,
                ))

        # Persist any newly resolved inventory_id links
        try:
            db.commit()
        except Exception:
            db.rollback()

        return ResponseEnvelope(
            success=True,
            data=SupplierInvoiceItemsListResponse(
                items=items,
                total=len(items),
                supplier_name=supplier_name
            ),
            message="Supplier invoice items retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error listing supplier invoice items: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve supplier invoice items")


@router.get("/outgoing",
            operation_id="listOutgoingInvoices", 
            response_model=ResponseEnvelope[OutgoingInvoiceListResponse])
def list_outgoing_invoices(
    status: Optional[InvoiceStatus] = Query(None, description="Filter by status"),
    party_name: Optional[str] = Query(None, description="Filter by party name"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_field: Optional[str] = Query(None, description="Sort field: invoiceDate, party, invoiceNumber, totalAmount, status"),
    sort_dir: Optional[str] = Query(None, description="Sort direction: asc or desc"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    List outgoing invoices (giden faturalar) with filtering and pagination.
    Tenant isolation enforced.
    """
    try:
        service = InvoiceServiceNew(db)
        result = service.list_outgoing_invoices(
            tenant_id=_resolve_tenant(access),
            status=status,
            party_name=party_name,
            date_from=date_from,
            date_to=date_to,
            page=page,
            per_page=per_page,
            sort_field=sort_field,
            sort_dir=sort_dir,
        )
        
        return ResponseEnvelope(
            success=True,
            data=result,
            message="Outgoing invoices retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error listing outgoing invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve outgoing invoices")


@router.post("/convert-to-purchases",
             operation_id="convertInvoicesToPurchases",
             response_model=ResponseEnvelope[ConvertToPurchaseResponse])
def convert_invoices_to_purchases(
    request: ConvertToPurchaseRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("purchases.create"))
):
    """
    Convert incoming invoices to purchase records.
    Bulk operation with supplier mapping.
    """
    try:
        service = InvoiceServiceNew(db)
        result = service.convert_invoices_to_purchases(
            tenant_id=_resolve_tenant(access),
            invoice_ids=request.invoice_ids,
            supplier_mappings=request.supplier_mappings,
            user_id=access.user_id
        )
        
        return ResponseEnvelope(
            success=True,
            data=result,
            message=f"Converted {result.success_count} invoices to purchases"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting invoices to purchases: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to convert invoices")


# Note: ProformaFromInvoice endpoint removed - incorrect business logic
# Proformas should be created BEFORE invoices, not from them


@router.get("/summary",
            operation_id="getInvoiceSummary",
            response_model=ResponseEnvelope[InvoiceSummaryStats])
def get_invoice_summary(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    Get invoice summary statistics for dashboard.
    """
    try:
        service = InvoiceServiceNew(db)
        result = service.get_invoice_summary(tenant_id=_resolve_tenant(access))
        
        return ResponseEnvelope(
            success=True,
            data=result,
            message="Invoice summary retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting invoice summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice summary")


def _get_birfatura_client(tenant_id: str, db: Session) -> BirfaturaClient:
    """Get BirFatura client configured with tenant credentials."""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant_settings = (tenant.settings or {}).get("invoice_integration", {})
    tenant_api_key = tenant_settings.get("api_key")
    tenant_secret_key = tenant_settings.get("secret_key")
    # IntegrationConfig is tenant-scoped, but global integration keys have tenant_id='system'.
    # Use unbound_session to bypass the automatic tenant filter.
    with unbound_session(reason="reading global BirFatura integration key"):
        integration_cfg = db.query(IntegrationConfig).filter_by(
            integration_type="birfatura", config_key="integration_key"
        ).first()
    global_key = integration_cfg.config_value if integration_cfg else (
        os.getenv("BIRFATURA_INTEGRATION_KEY")
        or os.getenv("BIRFATURA_X_INTEGRATION_KEY")
    )
    # Test credentials must be explicitly enabled; merely defining test env vars
    # should not override tenant credentials for normal runtime.
    use_test_creds = os.getenv("BIRFATURA_USE_TEST_CREDS", "0") == "1"
    if use_test_creds:
        tenant_api_key = os.getenv("BIRFATURA_TEST_API_KEY") or tenant_api_key
        tenant_secret_key = os.getenv("BIRFATURA_TEST_SECRET_KEY") or tenant_secret_key
        global_key = os.getenv("BIRFATURA_TEST_INTEGRATION_KEY") or global_key
    mock_env = os.getenv("BIRFATURA_MOCK")
    using_mock = mock_env == "1" or (mock_env != "0" and os.getenv("ENVIRONMENT", "production") != "production")
    if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_key):
        raise HTTPException(status_code=503, detail="BirFatura credentials not configured")
    return BirfaturaClient(api_key=tenant_api_key, secret_key=tenant_secret_key, integration_key=global_key)


def _decode_birfatura_content(content_b64: str) -> bytes:
    """Decode BirFatura's base64-encoded ZIP or gzip response content."""
    raw = base64.b64decode(content_b64)
    # ZIP archive (PK magic bytes 50 4B)
    if raw[:2] == b'PK':
        try:
            zf = zipfile.ZipFile(io.BytesIO(raw))
            names = zf.namelist()
            if names:
                return zf.read(names[0])
        except Exception:
            pass
    # gzip
    try:
        return gzip.decompress(raw)
    except Exception:
        return raw  # Return as-is


def _extract_provider_payload(response: dict) -> dict:
    result = response.get("Result")
    if isinstance(result, dict):
        return result
    if isinstance(response.get("Data"), dict):
        return response["Data"]
    return {}


def _stringify_status(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _is_retryable_status(status: str) -> bool:
    normalized = status.upper()
    retryable_tokens = ("REJECT", "ERROR", "FAIL", "RETURN", "IPTAL", "RED")
    return any(token in normalized for token in retryable_tokens)


def _normalize_provider_status(response: dict, fallback_status: str) -> tuple[str, str | None, str | None]:
    result = _extract_provider_payload(response)
    provider_status = (
        _stringify_status(result.get("status"))
        or _stringify_status(result.get("Status"))
        or _stringify_status(result.get("durum"))
        or _stringify_status(response.get("Result"))
        or fallback_status
    )
    provider_code = (
        _stringify_status(result.get("code"))
        or _stringify_status(result.get("Code"))
        or _stringify_status(result.get("statusCode"))
        or _stringify_status(response.get("Code"))
        or None
    )
    provider_message = (
        _stringify_status(result.get("description"))
        or _stringify_status(result.get("Description"))
        or _stringify_status(response.get("Message"))
        or None
    )
    return provider_status or fallback_status, provider_code, provider_message


import json as _json


def _pdf_escape(text: str) -> str:
    return re.sub(r"([()\\\\])", r"\\\1", text or "")


def _normalize_invoice_type_code(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("Value") or value.get("value") or value.get("name") or value.get("code") or "").strip() or "SATIS"
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return "SATIS"
        if stripped.startswith("{") and "Value" in stripped:
            try:
                parsed = ast.literal_eval(stripped)
            except Exception:
                parsed = None
            if isinstance(parsed, dict):
                return _normalize_invoice_type_code(parsed)
        return stripped
    return str(value or "SATIS").strip() or "SATIS"


def _get_provider_pdf_link_for_invoice(invoice: "PurchaseInvoice", tenant_id: str, db: Session, raw_data: dict[str, object] | None = None) -> str | None:
    def _extract_http_link(candidate: object) -> str | None:
        if isinstance(candidate, str):
            value = candidate.strip()
            if value.startswith("http://") or value.startswith("https://"):
                return value
            return None
        if isinstance(candidate, dict):
            for key in ("pdfLink", "url", "link", "downloadUrl", "downloadURL"):
                extracted = _extract_http_link(candidate.get(key))
                if extracted:
                    return extracted
            return None
        if isinstance(candidate, list):
            for item in candidate:
                extracted = _extract_http_link(item)
                if extracted:
                    return extracted
        return None

    raw_data = raw_data or {}
    # Check cached _provider_response (outgoing invoices)
    provider_response = raw_data.get("_provider_response") if isinstance(raw_data, dict) else None
    if isinstance(provider_response, dict):
        cached_link = _extract_http_link(provider_response.get("pdfLink"))
        if cached_link:
            return cached_link

    # Check previously cached PDF link (incoming invoices, saved after first API call)
    cached_pdf_link = raw_data.get("_cached_pdf_link") if isinstance(raw_data, dict) else None
    if isinstance(cached_pdf_link, str) and cached_pdf_link.startswith("http"):
        return cached_pdf_link

    is_real_birfatura_uuid = (
        invoice.birfatura_uuid
        and not str(invoice.birfatura_uuid).startswith("local-")
        and not str(invoice.birfatura_uuid).startswith("draft-")
    )
    if not is_real_birfatura_uuid:
        return None

    client = _get_birfatura_client(tenant_id, db)
    system_type_code = str(raw_data.get("systemType") or raw_data.get("systemTypeCode") or "EFATURA")
    pdf_link_resp = client.get_pdf_link_by_uuid({
        "uuids": [invoice.birfatura_uuid],
        "systemType": system_type_code,
    })
    if not pdf_link_resp.get("Success"):
        return None
    link = _extract_http_link(pdf_link_resp.get("Result"))

    # Cache the link in raw_data so subsequent calls skip the API
    if link:
        try:
            current_raw = invoice.raw_data if isinstance(invoice.raw_data, dict) else {}
            current_raw["_cached_pdf_link"] = link
            invoice.raw_data = current_raw
            db.add(invoice)
            db.commit()
        except Exception:
            db.rollback()

    return link


def _render_minimal_pdf(invoice: "PurchaseInvoice") -> bytes:
    raw = {}
    if invoice.raw_data:
        try:
            raw = _json.loads(invoice.raw_data) if isinstance(invoice.raw_data, str) else invoice.raw_data
        except Exception:
            raw = {}

    source_form = raw.get("_source_form_data") if isinstance(raw.get("_source_form_data"), dict) else {}
    customer_name = (
        raw.get("ReceiverName")
        or (raw.get("customer") or {}).get("name")
        or source_form.get("customerName")
        or " ".join(filter(None, [source_form.get("customerFirstName"), source_form.get("customerLastName")])).strip()
        or ""
    )
    lines = raw.get("lines") if isinstance(raw.get("lines"), list) else (source_form.get("items") or [])
    first_line = ""
    if lines and isinstance(lines[0], dict):
        first_line = str(lines[0].get("name") or lines[0].get("description") or "")

    text_lines = [
        "E-FATURA",
        f"Invoice No: {raw.get('InvoiceNo') or invoice.invoice_number or invoice.id}",
        f"Issue Date: {(raw.get('IssueDate') or str(invoice.invoice_date or ''))[:10]}",
        f"Customer: {customer_name}",
        f"Type: {_normalize_invoice_type_code(raw.get('InvoiceTypeCode') or raw.get('invoiceTypeCode') or '')}",
    ]
    if first_line:
        text_lines.append(f"Item: {first_line}")

    y = 780
    content_parts = ["BT", "/F1 12 Tf"]
    for line in text_lines:
        content_parts.append(f"1 0 0 1 50 {y} Tm ({_pdf_escape(line)}) Tj")
        y -= 20
    content_parts.append("ET")
    content_stream = "\n".join(content_parts).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        f"5 0 obj << /Length {len(content_stream)} >> stream\n".encode("latin-1") + content_stream + b"\nendstream endobj\n",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode("latin-1")
    )
    return bytes(pdf)


def _render_invoice_pdf(invoice: "PurchaseInvoice", tenant_id: str = None) -> bytes:
    """Render a PDF from stored raw_data using WeasyPrint + Jinja2 templates."""
    from utils.pdf_renderer import render_invoice_to_pdf
    raw = {}
    if invoice.raw_data:
        try:
            raw = _json.loads(invoice.raw_data) if isinstance(invoice.raw_data, str) else invoice.raw_data
        except Exception:
            raw = {}

    inv_type = _normalize_invoice_type_code(
        raw.get("InvoiceTypeCode")
        or raw.get("invoiceTypeCode")
        or raw.get("invoiceType")
        or raw.get("invoice_type_code")
        or raw.get("invoice_type")
        or invoice.invoice_type
        or "SATIS"
    )
    profile_id = raw.get("ProfileId") or raw.get("profileId") or raw.get("profile_id") or ""
    document_type = raw.get("DocumentType") or raw.get("documentType") or raw.get("document_type") or ""
    document_title = (
        raw.get("DocumentTitle")
        or raw.get("documentTitle")
        or raw.get("invoiceTitle")
        or raw.get("document_title")
        or (
            "e-İrsaliye" if (document_type == "EIRSALIYE" or profile_id == "TEMELIRSALIYE") else
            "e-Müstahsil Makbuzu" if document_type == "EMM" or str(inv_type).upper() == "MUSTAHSILMAKBUZ" else
            "e-Serbest Meslek Makbuzu" if document_type == "ESMM" or str(inv_type).upper() == "SERBESTMESLEKMAKBUZ" else
            "e-Fatura"
        )
    )

    supplier = raw.get("supplier") if isinstance(raw.get("supplier"), dict) else {}
    customer = raw.get("customer") if isinstance(raw.get("customer"), dict) else {}

    supplier_name = raw.get("SenderName") or supplier.get("name") or invoice.sender_name or ""
    supplier_vkn = raw.get("SenderKN") or supplier.get("tax_id") or invoice.sender_tax_number or ""
    supplier_tax_office = invoice.sender_tax_office or ""

    supplier_address = supplier.get("address") or invoice.sender_address or ""
    if isinstance(supplier_address, dict):
        supplier_address = ", ".join(
            str(part).strip()
            for part in (
                supplier_address.get("street"),
                supplier_address.get("district"),
                supplier_address.get("city"),
                supplier_address.get("postalZone"),
                supplier_address.get("country"),
            )
            if part
        )

    supplier_addr_parts = [supplier_address, invoice.sender_city or ""]
    supplier_addr = ", ".join(p for p in supplier_addr_parts if p)

    source_form = raw.get("_source_form_data") if isinstance(raw.get("_source_form_data"), dict) else {}
    profile_details = raw.get("profile_details") if isinstance(raw.get("profile_details"), dict) else {}
    if not profile_details:
        profile_details = raw.get("profileDetails") if isinstance(raw.get("profileDetails"), dict) else {}
    if not profile_details:
        profile_details = source_form.get("profileDetails") if isinstance(source_form.get("profileDetails"), dict) else {}

    buyer_customer = raw.get("buyer_customer") if isinstance(raw.get("buyer_customer"), dict) else {}
    if not buyer_customer:
        buyer_customer = raw.get("buyerCustomer") if isinstance(raw.get("buyerCustomer"), dict) else {}
    if not buyer_customer and profile_details:
        buyer_customer = {
            "name": (
                profile_details.get("passengerName")
                or profile_details.get("patientName")
                or ""
            ),
            "tax_id": (
                profile_details.get("patientTaxId")
                or ""
            ),
            "passport_no": profile_details.get("passengerPassportNo") or "",
            "nationality": profile_details.get("passengerNationality") or "",
        }

    customer_name = (
        raw.get("ReceiverName")
        or customer.get("name")
        or source_form.get("customerName")
        or " ".join(filter(None, [source_form.get("customerFirstName"), source_form.get("customerLastName")])).strip()
    )
    customer_vkn = (
        raw.get("ReceiverKN")
        or customer.get("tax_id")
        or source_form.get("customerTaxId")
        or source_form.get("customerTaxNumber")
        or source_form.get("customerTcNumber")
        or ""
    )

    subtotal = float(raw.get("LineExtensionAmount") or raw.get("lineExtensionAmount") or raw.get("subtotal") or invoice.subtotal or 0)
    tax_inclusive = float(raw.get("TaxInclusiveAmount") or raw.get("taxInclusiveAmount") or 0)
    tax_exclusive = float(raw.get("TaxExclusiveAmount") or raw.get("taxExclusiveAmount") or 0)
    tax_total = (tax_inclusive - tax_exclusive) if tax_inclusive else float(invoice.tax_amount or 0)
    if not tax_total:
        tax_total = float(raw.get("TaxAmount") or raw.get("taxAmount") or 0)
    payable = float(raw.get("PayableAmount") or raw.get("payableAmount") or raw.get("totalAmount") or invoice.total_amount or 0)
    currency = raw.get("DocumentCurrencyCode") or raw.get("currency") or invoice.currency or "TRY"

    raw_lines = (
        raw.get("lines") if isinstance(raw.get("lines"), list)
        else raw.get("invoiceLines") if isinstance(raw.get("invoiceLines"), list)
        else raw.get("InvoiceLines") if isinstance(raw.get("InvoiceLines"), list)
        else (source_form.get("items") or [])
    )
    normalized_lines = []
    for line in raw_lines:
        if not isinstance(line, dict):
            continue
        quantity = line.get("quantity") or 0
        unit_price = line.get("unit_price") or line.get("unitPrice") or line.get("price") or 0
        line_total = (
            line.get("line_total")
            or line.get("lineTotal")
            or line.get("line_extension_amount")
            or line.get("total")
            or 0
        )
        normalized_lines.append({
            **line,
            "name": line.get("name") or line.get("description") or "",
            "quantity": quantity,
            "unit_price": unit_price,
            "line_total": line_total,
        })

    invoice_data = {
        "invoice_id": raw.get("InvoiceNo") or raw.get("invoiceNumber") or invoice.invoice_number or "",
        "uuid": raw.get("uuid") or invoice.birfatura_uuid or "",
        "issue_date": (raw.get("IssueDate") or raw.get("issueDate") or str(invoice.invoice_date or ""))[:10],
        "invoice_type": inv_type,
        "invoiceType": inv_type,
        "invoiceTypeCode": inv_type,
        "profile_id": profile_id,
        "profileId": profile_id,
        "document_type": document_type,
        "documentType": document_type,
        "document_title": document_title,
        "currency": currency,
        "supplier": {
            "name": supplier_name,
            "tax_id": supplier_vkn,
            "tax_office": supplier_tax_office,
            "address": supplier_addr,
        },
        "customer": {
            "name": customer_name,
            "tax_id": customer_vkn,
        },
        "buyer_customer": buyer_customer,
        "profile_details": profile_details,
        "lines": normalized_lines,
        "line_extension_amount": subtotal,
        "tax_total": tax_total,
        "payable_amount": payable,
        "notes": raw.get("Note") or raw.get("notes") or "",
    }
    try:
        return render_invoice_to_pdf(invoice_data, tenant_id=tenant_id)
    except Exception as e:
        logger.warning(
            "Local invoice PDF renderer failed for invoice %s: %s. Falling back to minimal PDF.",
            invoice.id,
            e,
        )
        return _render_minimal_pdf(invoice)


def _render_invoice_html(invoice: "PurchaseInvoice") -> bytes:
    """Render an HTML invoice view from the stored raw_data + DB fields."""
    raw = {}
    if invoice.raw_data:
        try:
            raw = _json.loads(invoice.raw_data) if isinstance(invoice.raw_data, str) else invoice.raw_data
        except Exception:
            raw = {}

    inv_no = raw.get("InvoiceNo") or invoice.invoice_number or ""
    issue_date = (raw.get("IssueDate") or str(invoice.invoice_date or ""))[:10]
    inv_type = _normalize_invoice_type_code(
        raw.get("InvoiceTypeCode")
        or raw.get("invoiceTypeCode")
        or raw.get("invoiceType")
        or invoice.invoice_type
        or ""
    )
    profile = raw.get("ProfileId") or ""
    currency = raw.get("DocumentCurrencyCode") or invoice.currency or "TRY"
    note = (raw.get("Note") or "").replace("\n", "<br>")

    sender = raw.get("SenderName") or invoice.sender_name or ""
    sender_vkn = raw.get("SenderKN") or invoice.sender_tax_number or ""
    sender_tax_office = invoice.sender_tax_office or ""
    sender_addr = invoice.sender_address or ""
    sender_city = invoice.sender_city or ""

    source_form = raw.get("_source_form_data") if isinstance(raw.get("_source_form_data"), dict) else {}
    receiver = (
        raw.get("ReceiverName")
        or (raw.get("customer") or {}).get("name")
        or source_form.get("customerName")
        or " ".join(filter(None, [source_form.get("customerFirstName"), source_form.get("customerLastName")])).strip()
    )
    receiver_vkn = (
        raw.get("ReceiverKN")
        or (raw.get("customer") or {}).get("tax_id")
        or source_form.get("customerTaxId")
        or source_form.get("customerTaxNumber")
        or source_form.get("customerTcNumber")
        or ""
    )

    subtotal = raw.get("LineExtensionAmount") or invoice.subtotal or 0
    tax_amount = (raw.get("TaxInclusiveAmount", 0) or 0) - (raw.get("TaxExclusiveAmount", 0) or 0)
    if not tax_amount and invoice.tax_amount:
        tax_amount = invoice.tax_amount
    total = raw.get("PayableAmount") or invoice.total_amount or 0

    def fmt(v):
        try:
            return f"{float(v):,.2f}"
        except (TypeError, ValueError):
            return str(v)

    lines = raw.get("lines") if isinstance(raw.get("lines"), list) else []
    if not lines and isinstance(source_form.get("items"), list):
        lines = source_form.get("items") or []
    line_rows = "".join(
        f"<tr><td>{line.get('name') or line.get('description') or ''}</td>"
        f"<td>{fmt(line.get('quantity') or 0)}</td>"
        f"<td>{fmt(line.get('unitPrice') or line.get('price') or 0)} {currency}</td>"
        f"<td>{fmt(line.get('line_extension_amount') or line.get('total') or 0)} {currency}</td></tr>"
        for line in lines
        if isinstance(line, dict)
    )

    html = f"""<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>e-Fatura {inv_no}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:24px}}
  .invoice{{max-width:800px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.06)}}
  .header{{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3b82f6;padding-bottom:16px;margin-bottom:24px}}
  .header h1{{font-size:22px;color:#1e40af;font-weight:700}}
  .badge{{display:inline-block;background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;margin-top:4px}}
  .meta{{text-align:right;font-size:13px;color:#64748b}}
  .meta strong{{color:#1e293b;display:block;font-size:15px}}
  .parties{{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}}
  .party{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px}}
  .party h3{{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:8px}}
  .party .name{{font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px}}
  .party .detail{{font-size:12px;color:#475569;line-height:1.5}}
  .lines{{margin:24px 0}}
  .lines table{{width:100%;border-collapse:collapse;font-size:13px}}
  .lines th,.lines td{{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left}}
  .lines th:last-child,.lines td:last-child{{text-align:right}}
  .totals{{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px}}
  .totals table{{width:300px;margin-left:auto;font-size:14px}}
  .totals td{{padding:4px 0}}
  .totals td:last-child{{text-align:right;font-weight:500}}
  .totals tr.grand{{border-top:2px solid #1e40af;font-size:16px;font-weight:700;color:#1e40af}}
  .totals tr.grand td{{padding-top:8px}}
  .note{{margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px;font-size:12px;color:#92400e;line-height:1.5}}
  .footer{{margin-top:24px;text-align:center;font-size:11px;color:#94a3b8}}
</style></head><body>
<div class="invoice">
  <div class="header">
    <div>
      <h1>e-Fatura</h1>
      <span class="badge">{profile} — {inv_type}</span>
    </div>
    <div class="meta">
      <strong>{inv_no}</strong>
      Tarih: {issue_date}<br>
      UUID: {invoice.birfatura_uuid}
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>Gönderen (Satıcı)</h3>
      <div class="name">{sender}</div>
      <div class="detail">
        VKN/TCKN: {sender_vkn}<br>
        {"Vergi Dairesi: " + sender_tax_office + "<br>" if sender_tax_office else ""}
        {sender_addr + "<br>" if sender_addr else ""}
        {sender_city if sender_city else ""}
      </div>
    </div>
    <div class="party">
      <h3>Alıcı</h3>
      <div class="name">{receiver}</div>
      <div class="detail">VKN/TCKN: {receiver_vkn}</div>
    </div>
  </div>
  {"<div class='lines'><table><thead><tr><th>Kalem</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th></tr></thead><tbody>" + line_rows + "</tbody></table></div>" if line_rows else ""}
  <div class="totals">
    <table>
      <tr><td>Ara Toplam</td><td>{fmt(subtotal)} {currency}</td></tr>
      <tr><td>KDV</td><td>{fmt(tax_amount)} {currency}</td></tr>
      <tr class="grand"><td>Toplam</td><td>{fmt(total)} {currency}</td></tr>
    </table>
  </div>
  {"<div class='note'>" + note + "</div>" if note else ""}
  <div class="footer">Bu belge X-Ear CRM sistemi tarafından oluşturulmuştur.</div>
</div>
</body></html>"""
    return html.encode("utf-8")


@router.get("/{invoice_id}/document",
            operation_id="getInvoiceDocument")
def get_invoice_document(
    invoice_id: int,
    format: Literal["pdf", "html", "xml"] = Query("pdf", description="Document format"),
    render_mode: Literal["auto", "local", "remote", "direct"] = Query("auto", description="PDF rendering mode"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    Download invoice document (PDF, HTML or XML) via BirFatura.
    Returns raw bytes with appropriate content-type header.
    """
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    raw_data = {}
    if invoice.raw_data:
        try:
            raw_data = invoice.raw_data if isinstance(invoice.raw_data, dict) else _json.loads(invoice.raw_data)
        except Exception:
            raw_data = {}

    local_xml = raw_data.get("_local_document_xml") if isinstance(raw_data, dict) else None

    in_out_code = "IN" if invoice.invoice_type == "INCOMING" else "OUT"
    ext_map = {"pdf": "PDF", "html": "HTML", "xml": "XML"}
    mime_map = {"pdf": "application/pdf", "html": "text/html", "xml": "application/xml"}
    _is_real_birfatura_uuid = (
        invoice.birfatura_uuid
        and not str(invoice.birfatura_uuid).startswith("local-")
        and not str(invoice.birfatura_uuid).startswith("draft-")
    )

    # HTML format: render locally by default, provider-side when explicitly requested.
    if format == "html":
        if render_mode == "remote":
            try:
                client = _get_birfatura_client(tenant_id, db)
                xml_b64 = None
                if _is_real_birfatura_uuid:
                    xml_resp = client.document_download_by_uuid({
                        "documentUUID": invoice.birfatura_uuid,
                        "inOutCode": in_out_code,
                        "systemTypeCodes": "EFATURA",
                        "fileExtension": "XML"
                    })
                    xml_b64 = (xml_resp.get("Result") or {}).get("content")
                elif local_xml:
                    xml_b64 = base64.b64encode(local_xml.encode("utf-8")).decode("utf-8")

                if xml_b64:
                    preview_resp = client.preview_document_html({
                        "documentBytes": xml_b64,
                        "systemTypeCodes": "EFATURA"
                    })
                    html_zip_b64 = (preview_resp.get("Result") or {}).get("zipped")
                    if html_zip_b64:
                        content = _decode_birfatura_content(html_zip_b64)
                        filename = f"{invoice.invoice_number or invoice_id}.html"
                        return Response(content=content, media_type="text/html",
                                        headers={"Content-Disposition": f'inline; filename="{filename}"'})
            except Exception as e:
                logger.warning("Remote HTML preview failed for invoice %s: %s", invoice_id, e)
        content = _render_invoice_html(invoice)
        filename = f"{invoice.invoice_number or invoice_id}.html"
        return Response(content=content, media_type="text/html",
                        headers={"Content-Disposition": f'inline; filename="{filename}"'})

    if format == "pdf":
        # Check filesystem cache first (instant)
        cached_pdf = _get_cached_pdf(invoice_id, invoice.birfatura_uuid)
        if cached_pdf and render_mode not in ("direct",):
            filename = f"{invoice.invoice_number or invoice_id}.pdf"
            return Response(content=cached_pdf, media_type="application/pdf",
                            headers={"Content-Disposition": f'inline; filename="{filename}"'})

        provider_pdf_link = _get_provider_pdf_link_for_invoice(invoice, tenant_id, db, raw_data if isinstance(raw_data, dict) else {})
        system_type_code = str(raw_data.get("systemType") or raw_data.get("systemTypeCode") or "EFATURA")

        if render_mode == "direct" and _is_real_birfatura_uuid:
            try:
                if provider_pdf_link:
                    return RedirectResponse(url=provider_pdf_link, status_code=307)
            except Exception as e:
                logger.warning("Direct PDF redirect failed for invoice %s: %s", invoice_id, e)

        if render_mode == "local":
            try:
                content = _render_invoice_pdf(invoice, tenant_id)
            except Exception as e:
                logger.warning(
                    "Local PDF route failed for invoice %s: %s. Falling back to minimal PDF.",
                    invoice_id,
                    e,
                )
                content = _render_minimal_pdf(invoice)
            filename = f"{invoice.invoice_number or invoice_id}.pdf"
            return Response(content=content, media_type="application/pdf",
                            headers={"Content-Disposition": f'inline; filename="{filename}"'})

        # 2-step: Download XML from BirFatura then convert to PDF via PreviewDocumentReturnPDF
        pdf_bytes = None
        # -- Step A: For local/draft invoices, use stored XML + PreviewDocumentReturnPDF --
        if not _is_real_birfatura_uuid and local_xml:
            try:
                client = _get_birfatura_client(tenant_id, db)
                xml_b64 = base64.b64encode(local_xml.encode("utf-8")).decode("utf-8")
                preview_resp = client.preview_document_pdf({
                    "documentBytes": xml_b64,
                    "systemTypeCodes": "EFATURA"
                })
                if preview_resp.get("Success") and preview_resp.get("Result", {}).get("zipped"):
                    pdf_raw = base64.b64decode(preview_resp["Result"]["zipped"])
                    if pdf_raw[:4] == b'%PDF':
                        pdf_bytes = pdf_raw
                    elif pdf_raw[:2] == b'PK':
                        zf = zipfile.ZipFile(io.BytesIO(pdf_raw))
                        names = zf.namelist()
                        if names:
                            pdf_bytes = zf.read(names[0])
                else:
                    logger.warning(f"PreviewDocumentReturnPDF (local XML) failed for invoice {invoice_id}: {preview_resp.get('Message')}")
            except Exception as e:
                logger.warning(f"BirFatura preview from local XML failed for invoice {invoice_id}: {e}")

            # If PreviewDocumentReturnPDF failed, try outbox XML file on disk
            if not pdf_bytes:
                outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "efatura_outbox"))
                draft_id = invoice.draft_id if hasattr(invoice, "draft_id") else invoice.id
                import glob as _glob
                pattern = os.path.join(outbox_dir, f"DRAFT_{draft_id}_*.xml")
                matches = sorted(_glob.glob(pattern), reverse=True)
                if matches:
                    try:
                        with open(matches[0], "rb") as f:
                            outbox_xml = f.read()
                        client = _get_birfatura_client(tenant_id, db)
                        xml_b64 = base64.b64encode(outbox_xml).decode("utf-8")
                        preview_resp = client.preview_document_pdf({
                            "documentBytes": xml_b64,
                            "systemTypeCodes": "EFATURA"
                        })
                        if preview_resp.get("Success") and preview_resp.get("Result", {}).get("zipped"):
                            pdf_raw = base64.b64decode(preview_resp["Result"]["zipped"])
                            if pdf_raw[:4] == b'%PDF':
                                pdf_bytes = pdf_raw
                            elif pdf_raw[:2] == b'PK':
                                zf = zipfile.ZipFile(io.BytesIO(pdf_raw))
                                names = zf.namelist()
                                if names:
                                    pdf_bytes = zf.read(names[0])
                    except Exception as e:
                        logger.warning(f"BirFatura preview from outbox XML failed for invoice {invoice_id}: {e}")

        # -- Step B: For real BirFatura invoices, download PDF via link --
        if _is_real_birfatura_uuid:
            # Reuse provider_pdf_link already fetched above (avoid duplicate API call)
            if provider_pdf_link:
                try:
                    pdf_link_response = requests.get(provider_pdf_link, timeout=30)
                    pdf_link_response.raise_for_status()
                    if pdf_link_response.content[:4] == b"%PDF":
                        pdf_bytes = pdf_link_response.content
                except Exception as e:
                    logger.warning(f"BirFatura direct PDF link download failed for invoice {invoice_id}: {e}")

        # -- Step B2: Try direct PDF download via DocumentDownloadByUUID (single API call) --
        if _is_real_birfatura_uuid and not pdf_bytes:
            try:
                client = _get_birfatura_client(tenant_id, db)
                pdf_resp = client.document_download_by_uuid({
                    "documentUUID": invoice.birfatura_uuid,
                    "inOutCode": in_out_code,
                    "systemTypeCodes": system_type_code,
                    "fileExtension": "PDF"
                })
                if pdf_resp.get("Success") and pdf_resp.get("Result", {}).get("content"):
                    pdf_raw = base64.b64decode(pdf_resp["Result"]["content"])
                    if pdf_raw[:4] == b"%PDF":
                        pdf_bytes = pdf_raw
                    elif pdf_raw[:2] == b"PK":
                        zf = zipfile.ZipFile(io.BytesIO(pdf_raw))
                        names = zf.namelist()
                        if names:
                            pdf_bytes = zf.read(names[0])
                    elif len(pdf_raw) > 10:
                        # Might be gzipped
                        try:
                            pdf_bytes = gzip.decompress(pdf_raw)
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"Direct PDF download failed for invoice {invoice_id}: {e}")

        # -- Step B3 (fallback): Download XML then render to PDF via PreviewDocumentReturnPDF --
        if _is_real_birfatura_uuid and not pdf_bytes:
            try:
                client = _get_birfatura_client(tenant_id, db)
                xml_resp = client.document_download_by_uuid({
                    "documentUUID": invoice.birfatura_uuid,
                    "inOutCode": in_out_code,
                    "systemTypeCodes": system_type_code,
                    "fileExtension": "XML"
                })
                if xml_resp.get("Success") and xml_resp.get("Result", {}).get("content"):
                    xml_b64 = xml_resp["Result"]["content"]
                    preview_resp = client.preview_document_pdf({
                        "documentBytes": xml_b64,
                        "systemTypeCodes": system_type_code
                    })
                    if preview_resp.get("Success") and preview_resp.get("Result", {}).get("zipped"):
                        pdf_raw = base64.b64decode(preview_resp["Result"]["zipped"])
                        if pdf_raw[:4] == b'%PDF':
                            pdf_bytes = pdf_raw
                        elif pdf_raw[:2] == b'PK':
                            zf = zipfile.ZipFile(io.BytesIO(pdf_raw))
                            names = zf.namelist()
                            if names:
                                pdf_bytes = zf.read(names[0])
                    else:
                        logger.warning(f"PreviewDocumentReturnPDF failed for invoice {invoice_id}: {preview_resp.get('Message')}")
                else:
                    logger.warning(f"XML download failed for invoice {invoice_id}: {xml_resp.get('Message')}")
            except Exception as e:
                logger.warning(f"BirFatura PDF generation failed for invoice {invoice_id}: {e}")

            # Step B fallback: if BirFatura API failed but we have local XML, try that
            if not pdf_bytes and local_xml:
                try:
                    client = _get_birfatura_client(tenant_id, db)
                    xml_b64 = base64.b64encode(local_xml.encode("utf-8")).decode("utf-8")
                    preview_resp = client.preview_document_pdf({
                        "documentBytes": xml_b64,
                        "systemTypeCodes": "EFATURA"
                    })
                    if preview_resp.get("Success") and preview_resp.get("Result", {}).get("zipped"):
                        pdf_raw = base64.b64decode(preview_resp["Result"]["zipped"])
                        if pdf_raw[:4] == b'%PDF':
                            pdf_bytes = pdf_raw
                        elif pdf_raw[:2] == b'PK':
                            zf = zipfile.ZipFile(io.BytesIO(pdf_raw))
                            names = zf.namelist()
                            if names:
                                pdf_bytes = zf.read(names[0])
                except Exception as e:
                    logger.warning(f"BirFatura preview from local XML (fallback) failed for invoice {invoice_id}: {e}")

        if pdf_bytes:
            # Cache for instant access next time
            if invoice.birfatura_uuid:
                _save_pdf_cache(invoice.birfatura_uuid, pdf_bytes)
            filename = f"{invoice.invoice_number or invoice_id}.pdf"
            return Response(content=pdf_bytes, media_type="application/pdf",
                            headers={"Content-Disposition": f'inline; filename="{filename}"'})
        else:
            # Fallback: render PDF locally via WeasyPrint or return HTML
            logger.info(f"Rendering local PDF for invoice {invoice_id} via WeasyPrint")
            try:
                content = _render_invoice_pdf(invoice, tenant_id)
                filename = f"{invoice.invoice_number or invoice_id}.pdf"
                return Response(content=content, media_type="application/pdf",
                                headers={"Content-Disposition": f'inline; filename="{filename}"'})
            except Exception as e:
                logger.warning(f"WeasyPrint unavailable for invoice {invoice_id}: {e} — falling back to minimal PDF")
                content = _render_minimal_pdf(invoice)
                filename = f"{invoice.invoice_number or invoice_id}.pdf"
                return Response(content=content, media_type="application/pdf",
                                headers={"Content-Disposition": f'inline; filename="{filename}"'})

    # XML download
    try:
        if local_xml:
            raise RuntimeError("use-local-xml")
        client = _get_birfatura_client(tenant_id, db)
        resp = client.document_download_by_uuid({
            "documentUUID": invoice.birfatura_uuid,
            "inOutCode": in_out_code,
            "systemTypeCodes": "EFATURA",
            "fileExtension": ext_map[format]
        })
        if not resp.get("Success"):
            raise HTTPException(status_code=502, detail=resp.get("Message", "BirFatura error"))
        content = _decode_birfatura_content(resp["Result"]["content"])
    except RuntimeError as e:
        if str(e) != "use-local-xml" or not local_xml:
            raise
        content = local_xml.encode("utf-8")
    except HTTPException:
        raise
    except Exception as e:
        if local_xml:
            logger.warning(f"Falling back to locally stored XML for invoice {invoice_id}: {e}")
            content = local_xml.encode("utf-8")
        else:
            logger.error(f"Error downloading document {invoice_id}: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch document from BirFatura")

    filename = f"{invoice.invoice_number or invoice_id}.{format}"
    headers = {"Content-Disposition": f'inline; filename="{filename}"'}
    return Response(content=content, media_type=mime_map[format], headers=headers)


@router.get("/{invoice_id}/document-url", operation_id="getInvoiceDocumentUrl")
def get_invoice_document_url(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    raw_data = {}
    if invoice.raw_data:
        try:
            raw_data = invoice.raw_data if isinstance(invoice.raw_data, dict) else _json.loads(invoice.raw_data)
        except Exception:
            raw_data = {}

    try:
        pdf_url = _get_provider_pdf_link_for_invoice(invoice, tenant_id, db, raw_data if isinstance(raw_data, dict) else {})
    except Exception as exc:
        logger.warning("Provider PDF URL lookup failed for invoice %s: %s", invoice_id, exc)
        pdf_url = None

    return ResponseEnvelope(data={
        "invoiceId": invoice_id,
        "pdfUrl": pdf_url,
        "hasDirectUrl": bool(pdf_url),
    })


@router.post("/{invoice_id}/accept",
             operation_id="acceptInvoice",
             response_model=ResponseEnvelope[InvoiceActionResponse])
def accept_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Accept an incoming invoice via BirFatura."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "INCOMING"
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        client = _get_birfatura_client(tenant_id, db)
        resp = client.accept_reject_inbox(document_uuid=invoice.birfatura_uuid, accept=True)
        if not resp.get("Success"):
            raise HTTPException(status_code=502, detail=resp.get("Message", "BirFatura error"))
        invoice.status = "PROCESSED"
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invoice {invoice_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=502, detail="Failed to accept invoice")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=invoice_id, success=True, message="Fatura kabul edildi"),
        message="Invoice accepted"
    )


@router.post("/{invoice_id}/reject",
             operation_id="rejectInvoice",
             response_model=ResponseEnvelope[InvoiceActionResponse])
def reject_invoice(
    invoice_id: int,
    body: InvoiceRejectRequest = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Reject an incoming invoice via BirFatura."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "INCOMING"
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    reason = (body.reason if body else None) or "Reddedildi"
    try:
        client = _get_birfatura_client(tenant_id, db)
        resp = client.accept_reject_inbox(document_uuid=invoice.birfatura_uuid, accept=False, reason=reason)
        if not resp.get("Success"):
            raise HTTPException(status_code=502, detail=resp.get("Message", "BirFatura error"))
        invoice.status = "rejected"
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting invoice {invoice_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=502, detail="Failed to reject invoice")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=invoice_id, success=True, message="Fatura reddedildi"),
        message="Invoice rejected"
    )


@router.post("/{invoice_id}/cancel",
             operation_id="cancelInvoice",
             response_model=ResponseEnvelope[InvoiceActionResponse])
def cancel_invoice(
    invoice_id: int,
    body: InvoiceCancelRequest = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Cancel an outgoing invoice via BirFatura."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "OUTGOING"
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    reason = (body.reason if body else None) or "İptal edildi"
    try:
        client = _get_birfatura_client(tenant_id, db)
        resp = client.cancel_invoice(invoice_id=invoice.birfatura_uuid, reason=reason)
        if not resp.get("Success"):
            raise HTTPException(status_code=502, detail=resp.get("Message", "BirFatura error"))
        invoice.status = "CANCELLED"
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling invoice {invoice_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=502, detail="Failed to cancel invoice")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=invoice_id, success=True, message="Fatura iptal edildi"),
        message="Invoice cancelled"
    )


@router.get("/{invoice_id}/logs",
            operation_id="getInvoiceLogs")
def get_invoice_logs(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Get BirFatura document lifecycle logs for an invoice."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.birfatura_uuid:
        return ResponseEnvelope(success=True, data=[], message="No BirFatura UUID")
    try:
        client = _get_birfatura_client(tenant_id, db)
        resp = client.get_document_logs({"documentUUID": invoice.birfatura_uuid})
        logs = resp.get("Result") or resp.get("Data") or []
        # Reverse to chronological order (oldest first)
        if isinstance(logs, list):
            logs = list(reversed(logs))
        return ResponseEnvelope(success=True, data=logs, message="Logs retrieved")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching logs for invoice {invoice_id}: {e}")
        return ResponseEnvelope(success=True, data=[], message="Could not fetch logs")


@router.get("/{invoice_id}/status",
            operation_id="getInvoiceProviderStatus",
            response_model=ResponseEnvelope[InvoiceProviderStatusResponse])
def get_invoice_provider_status(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Get the latest BirFatura/GIB status for an invoice."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.birfatura_uuid:
        raise HTTPException(status_code=400, detail="Invoice has no BirFatura UUID")

    raw = {}
    if invoice.raw_data:
        try:
            raw = invoice.raw_data if isinstance(invoice.raw_data, dict) else _json.loads(invoice.raw_data)
        except Exception:
            raw = {}

    fallback_status = str(invoice.status or raw.get("Status") or "UNKNOWN")
    in_out_code = "IN" if invoice.invoice_type == "INCOMING" else "OUT"
    provider_status = fallback_status
    provider_code = None
    provider_message = None
    provider_result = {}

    try:
        client = _get_birfatura_client(tenant_id, db)
        response = client.get_envelope_status_from_gib({
            "envelopeID": invoice.birfatura_uuid,
            "inOutCode": in_out_code,
        })
        provider_result = _extract_provider_payload(response)
        provider_status, provider_code, provider_message = _normalize_provider_status(response, fallback_status)
    except Exception as e:
        logger.warning("Failed to fetch provider status for invoice %s: %s", invoice_id, e)
        provider_message = str(e)

    current_status = provider_status or fallback_status
    retryable = _is_retryable_status(current_status)

    return ResponseEnvelope(
        success=True,
        data=InvoiceProviderStatusResponse(
            invoiceId=invoice.id,
            birfaturaUuid=invoice.birfatura_uuid,
            envelopeId=invoice.birfatura_uuid,
            inOutCode=in_out_code,
            currentStatus=current_status,
            providerStatusCode=provider_code,
            providerMessage=provider_message,
            retryable=retryable,
            rawResult=provider_result or None,
        ),
        message="Provider status retrieved",
    )


@router.post("/{invoice_id}/retry-send",
             operation_id="retryInvoiceProviderSend",
             response_model=ResponseEnvelope[InvoiceProviderActionResponse])
def retry_invoice_provider_send(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integration.birfatura.edit"))
):
    """Retry sending/re-enveloping an outgoing invoice on BirFatura."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "OUTGOING",
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Outgoing invoice not found")
    if not invoice.birfatura_uuid:
        raise HTTPException(status_code=400, detail="Invoice has no BirFatura UUID")

    try:
        client = _get_birfatura_client(tenant_id, db)
        response = client.re_envelope_and_send({"uuid": invoice.birfatura_uuid})
        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura retry failed"))
        return ResponseEnvelope(
            success=True,
            data=InvoiceProviderActionResponse(
                invoiceId=invoice.id,
                success=True,
                message=response.get("Message") or "Belge yeniden gönderim kuyruğuna alındı",
                providerResult=_extract_provider_payload(response) or response,
            ),
            message="Retry send queued",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrying invoice %s via BirFatura: %s", invoice_id, e)
        raise HTTPException(status_code=502, detail="Failed to retry invoice via BirFatura")


@router.get("/{invoice_id}/provider-detail",
            operation_id="getInvoiceProviderDetail")
def get_invoice_provider_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Return provider-side outbox detail for an outgoing invoice."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "OUTGOING",
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Outgoing invoice not found")
    if not invoice.birfatura_uuid:
        raise HTTPException(status_code=400, detail="Invoice has no BirFatura UUID")

    raw = {}
    if invoice.raw_data:
        try:
            raw = invoice.raw_data if isinstance(invoice.raw_data, dict) else _json.loads(invoice.raw_data)
        except Exception:
            raw = {}
    system_type = str(raw.get("systemType") or raw.get("systemTypeCode") or "EFATURA")

    try:
        client = _get_birfatura_client(tenant_id, db)
        response = client.get_outbox_document_by_uuid({
            "uuid": invoice.birfatura_uuid,
            "systemType": system_type,
        })
        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura outbox detail error"))
        detail = response.get("Result") or []
        return ResponseEnvelope(success=True, data=detail, message="Provider detail retrieved")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching provider detail for invoice %s: %s", invoice_id, e)
        raise HTTPException(status_code=502, detail="Failed to fetch provider detail")


@router.post("/{invoice_id}/mark-read",
             operation_id="markIncomingInvoiceRead",
             response_model=ResponseEnvelope[InvoiceProviderActionResponse])
def mark_incoming_invoice_read(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Mark an incoming BirFatura invoice as read."""
    tenant_id = _resolve_tenant(access)
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.invoice_type == "INCOMING",
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Incoming invoice not found")
    if not invoice.birfatura_uuid:
        raise HTTPException(status_code=400, detail="Invoice has no BirFatura UUID")

    raw = {}
    if invoice.raw_data:
        try:
            raw = invoice.raw_data if isinstance(invoice.raw_data, dict) else _json.loads(invoice.raw_data)
        except Exception:
            raw = {}
    system_type = str(raw.get("systemType") or raw.get("systemTypeCode") or "EFATURA")
    document_type = "DESPATCHADVICE" if system_type == "EIRSALIYE" else "INVOICE"

    try:
        client = _get_birfatura_client(tenant_id, db)
        response = client.update_unreaded_status({
            "uuid": invoice.birfatura_uuid,
            "systemType": system_type,
            "documentType": document_type,
            "inOutCode": "IN",
        })
        if not response.get("Success"):
            raise HTTPException(status_code=502, detail=response.get("Message", "BirFatura update unread status failed"))
        return ResponseEnvelope(
            success=True,
            data=InvoiceProviderActionResponse(
                invoiceId=invoice.id,
                success=True,
                message=response.get("Message") or "Belge okundu olarak işaretlendi",
                providerResult=_extract_provider_payload(response) or response,
            ),
            message="Invoice marked as read",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error marking invoice %s as read: %s", invoice_id, e)
        raise HTTPException(status_code=502, detail="Failed to update read status")


@router.post("/draft",
             operation_id="createInvoiceDraft",
             response_model=ResponseEnvelope[InvoiceActionResponse],
             status_code=201)
def create_invoice_draft(
    payload: InvoiceDraftRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Save a new invoice draft created from the new invoice form."""
    tenant_id = _resolve_tenant(access)
    form = dict(payload.form_data)
    form["_is_form_draft"] = True

    raw_total = form.get("totalAmount")
    try:
        total = Decimal(str(raw_total)) if raw_total is not None else Decimal("0")
    except (ValueError, TypeError):
        total = Decimal("0")

    customer_tax_id = form.get("customerTaxId") or form.get("customerTaxNumber") or form.get("customerTcNumber") or ""

    draft = PurchaseInvoice(
        tenant_id=tenant_id,
        birfatura_uuid=f"draft-{uuid.uuid4()}",
        invoice_number=None,
        invoice_date=datetime.utcnow(),
        invoice_type="OUTGOING",
        sender_name=form.get("customerFirstName") or form.get("customerName") or "",
        sender_tax_number=customer_tax_id,
        currency=form.get("currency") or "TRY",
        subtotal=Decimal("0"),
        tax_amount=Decimal("0"),
        total_amount=total,
        raw_data=form,
        status="DRAFT",
        is_matched=False,
        notes="Taslak fatura (form)",
    )
    db.add(draft)
    try:
        db.commit()
        db.refresh(draft)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating invoice draft: {e}")
        raise HTTPException(status_code=500, detail="Failed to create draft")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=draft.id, success=True, message="Taslak oluşturuldu"),
        message="Draft created"
    )


@router.put("/draft/{draft_id}",
            operation_id="updateInvoiceDraft",
            response_model=ResponseEnvelope[InvoiceActionResponse])
def update_invoice_draft(
    draft_id: int,
    payload: InvoiceDraftRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Update an existing invoice draft."""
    tenant_id = _resolve_tenant(access)
    draft = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == draft_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.status == "DRAFT"
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    form = dict(payload.form_data)
    form["_is_form_draft"] = True
    draft.raw_data = form
    draft.sender_name = form.get("customerFirstName") or form.get("customerName") or draft.sender_name or ""
    draft.sender_tax_number = form.get("customerTaxId") or form.get("customerTaxNumber") or form.get("customerTcNumber") or draft.sender_tax_number or ""
    draft.currency = form.get("currency") or draft.currency or "TRY"
    raw_total = form.get("totalAmount")
    if raw_total is not None:
        try:
            draft.total_amount = Decimal(str(raw_total))
        except (ValueError, TypeError):
            pass

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating invoice draft {draft_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update draft")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=draft.id, success=True, message="Taslak güncellendi"),
        message="Draft updated"
    )


@router.delete("/draft/{draft_id}",
               operation_id="deleteInvoiceDraft",
               response_model=ResponseEnvelope[InvoiceActionResponse])
def delete_invoice_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Delete an invoice draft."""
    tenant_id = _resolve_tenant(access)
    draft = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == draft_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.status == "DRAFT"
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    try:
        # Delete associated items first
        db.query(PurchaseInvoiceItem).filter_by(purchase_invoice_id=draft.id).delete()
        db.delete(draft)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting invoice draft {draft_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete draft")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=draft_id, success=True, message="Taslak silindi"),
        message="Draft deleted"
    )


@router.get("/draft/{draft_id}",
            operation_id="getInvoiceDraft",
            response_model=ResponseEnvelope[InvoiceDraftResponse])
def get_invoice_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Get invoice draft data for editing in the new invoice form."""
    tenant_id = _resolve_tenant(access)
    draft = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == draft_id,
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.status == "DRAFT"
    ).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    raw = draft.raw_data or {}

    if raw.get("_source_form_data") and isinstance(raw.get("_source_form_data"), dict):
        form_data = dict(raw["_source_form_data"])
    elif raw.get("_is_form_draft"):
        # User-created draft: raw_data IS the serialized form state
        form_data = {k: v for k, v in raw.items() if k != "_is_form_draft"}
    else:
        # BirFatura-sourced draft: use unified extraction from any raw_data format
        form_data = _build_form_data_from_raw(raw, draft)

    # Normalize UBL unit codes → form values (MON→Ay, NIU→Adet, etc.)
    if form_data.get("items"):
        for fi in form_data["items"]:
            if isinstance(fi, dict) and fi.get("unit"):
                fi["unit"] = _normalize_unit(fi["unit"])

    # Ensure SGK additionalInfo has a default value
    if form_data.get("sgkData") and isinstance(form_data["sgkData"], dict):
        form_data["sgkData"].setdefault("additionalInfo", "E")

    return ResponseEnvelope(
        success=True,
        data=InvoiceDraftResponse(draft_id=draft.id, form_data=form_data)
    )


@router.post("/{invoice_id}/copy",
             operation_id="copyInvoice",
             response_model=ResponseEnvelope[InvoiceActionResponse])
def copy_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Copy an invoice as a new DRAFT in the system."""
    tenant_id = _resolve_tenant(access)
    original = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.id == invoice_id,
        PurchaseInvoice.tenant_id == tenant_id
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Invoice not found")

    raw = original.raw_data if isinstance(original.raw_data, dict) else (original.raw_data or {})
    # If raw_data is a JSON string, parse it
    if isinstance(raw, str):
        try:
            import json as _json_mod
            raw = _json_mod.loads(raw)
        except Exception:
            raw = {}

    # --- Build form_data for the draft ---
    # Priority: existing form data > BirFatura raw_data mapping > DB fields
    if raw.get("_source_form_data") and isinstance(raw["_source_form_data"], dict):
        # Original was itself a copy with form data — deep copy to avoid reference issues
        import copy as _copy_mod
        form_data = _copy_mod.deepcopy(raw["_source_form_data"])
    elif raw.get("_is_form_draft"):
        # Original was a form-created draft
        form_data = {k: v for k, v in raw.items() if k != "_is_form_draft"}
    else:
        # BirFatura-synced or any other format: unified extraction
        form_data = _build_form_data_from_raw(raw, original)

    # Always extract type-specific data (SGK, withholding, export, etc.) from raw
    # and merge into form_data — ensures sgkData, period info, etc. are never lost
    # Check both top-level raw AND _source_form_data (sgkData lives inside _source_form_data)
    type_data = _extract_type_specific_data(raw)
    src_fd = raw.get("_source_form_data")
    if isinstance(src_fd, dict):
        src_type_data = _extract_type_specific_data(src_fd)
        for key, val in src_type_data.items():
            if key not in type_data or not type_data[key]:
                type_data[key] = val
            elif key == "sgkData" and isinstance(val, dict) and isinstance(type_data.get(key), dict):
                for sk, sv in val.items():
                    type_data[key].setdefault(sk, sv)
    for key, val in type_data.items():
        if key not in form_data or not form_data[key]:
            form_data[key] = val
        elif key == "sgkData" and isinstance(val, dict) and isinstance(form_data.get(key), dict):
            # Merge sgkData fields without overwriting existing ones
            for sk, sv in val.items():
                form_data[key].setdefault(sk, sv)

    # Build items from PurchaseInvoiceItem records (if any and form_data has none)
    original_items = db.query(PurchaseInvoiceItem).filter_by(purchase_invoice_id=original.id).all()
    if original_items and not form_data.get("items"):
        # Try to get extended per-line data from raw_data lines/items
        raw_lines = _extract_items_from_raw(raw)
        form_items = []
        for idx, item in enumerate(original_items):
            fi = {
                "id": str(uuid.uuid4()),
                "name": item.product_name or "",
                "description": item.product_description or "",
                "quantity": float(item.quantity or 1),
                "unit": item.unit or "Adet",
                "unitPrice": float(item.unit_price or 0),
                "taxRate": float(item.tax_rate or 0),
                "taxAmount": float(item.tax_amount or 0),
                "total": float(item.line_total or 0),
            }
            # Merge extended fields from raw_data line if available
            if idx < len(raw_lines) and isinstance(raw_lines[idx], dict):
                rl = raw_lines[idx]
                for ext_key in _LINE_EXT_KEYS:
                    val = rl.get(ext_key)
                    if val is not None:
                        fi[ext_key] = val
            form_items.append(fi)
        form_data["items"] = form_items
    elif "items" not in form_data:
        # No DB items and no items in form_data → create a default line from totals
        form_data["items"] = [{
            "id": str(uuid.uuid4()),
            "name": "",
            "description": "",
            "quantity": 1,
            "unit": "Adet",
            "unitPrice": float(original.subtotal or original.total_amount or 0),
            "taxRate": 0,
            "taxAmount": float(original.tax_amount or 0),
            "total": float(original.total_amount or 0),
        }]

    # Enrich form_data items from PurchaseInvoiceItem records if names/units are empty
    if original_items and form_data.get("items"):
        form_items = form_data["items"]
        for idx, fi in enumerate(form_items):
            if idx < len(original_items):
                db_item = original_items[idx]
                if not fi.get("name") and db_item.product_name:
                    fi["name"] = db_item.product_name
                if fi.get("unit") == "Adet" and db_item.unit and db_item.unit != "Adet":
                    fi["unit"] = db_item.unit
                if not fi.get("description") and db_item.product_description:
                    fi["description"] = db_item.product_description

    # Normalize UBL unit codes to form-friendly Turkish values (MON→Ay, NIU→Adet, etc.)
    if form_data.get("items"):
        for fi in form_data["items"]:
            if fi.get("unit"):
                fi["unit"] = _normalize_unit(fi["unit"])

    # Ensure SGK additionalInfo has a default value
    if form_data.get("sgkData") and isinstance(form_data["sgkData"], dict):
        form_data["sgkData"].setdefault("additionalInfo", "E")

    # Store totals in form_data
    form_data.setdefault("totalAmount", float(original.total_amount or 0))
    form_data.setdefault("subTotal", float(original.subtotal or 0))
    form_data.setdefault("taxAmount", float(original.tax_amount or 0))

    # Create the draft PurchaseInvoice
    copy = PurchaseInvoice(
        tenant_id=tenant_id,
        branch_id=original.branch_id,
        birfatura_uuid=f"draft-{uuid.uuid4()}",
        invoice_number=None,
        invoice_date=datetime.utcnow(),
        invoice_type=original.invoice_type,
        sender_name=original.sender_name,
        sender_tax_number=original.sender_tax_number,
        sender_tax_office=original.sender_tax_office,
        sender_address=original.sender_address,
        sender_city=original.sender_city,
        supplier_id=original.supplier_id,
        currency=original.currency,
        subtotal=original.subtotal,
        tax_amount=original.tax_amount,
        total_amount=original.total_amount,
        raw_data={"_source_form_data": form_data},
        status="DRAFT",
        is_matched=False,
        notes=f"Fatura #{original.id} kopyası",
    )
    db.add(copy)
    db.flush()

    # Copy invoice items to DB as well
    for item in original_items:
        new_item = PurchaseInvoiceItem(
            tenant_id=tenant_id,
            purchase_invoice_id=copy.id,
            branch_id=item.branch_id,
            product_code=item.product_code,
            product_name=item.product_name,
            product_description=item.product_description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            tax_amount=item.tax_amount,
            line_total=item.line_total,
        )
        db.add(new_item)

    try:
        db.commit()
        db.refresh(copy)
    except Exception as e:
        db.rollback()
        logger.error(f"Error copying invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to copy invoice")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=copy.id, success=True, message="Fatura kopyalandı"),
        message="Invoice copied as draft"
    )


@router.delete("/purchases/{purchase_id}",
               operation_id="deletePurchase",
               response_model=ResponseEnvelope[InvoiceActionResponse])
def delete_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """
    Delete a purchase record created from an invoice.
    The linked invoice is reverted to RECEIVED / unprocessed state
    so it can be re-converted later.
    """
    tenant_id = _resolve_tenant(access)
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id,
        Purchase.tenant_id == tenant_id
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # Revert the linked invoice back to unprocessed
    if purchase.invoice_id:
        invoice = db.query(PurchaseInvoice).filter(
            PurchaseInvoice.id == int(purchase.invoice_id),
            PurchaseInvoice.tenant_id == tenant_id
        ).first()
        if invoice:
            invoice.status = 'RECEIVED'
            invoice.is_matched = False
            invoice.purchase_id = None

    db.delete(purchase)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting purchase {purchase_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete purchase")

    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=0, success=True, message="Alış kaydı silindi"),
        message="Purchase deleted"
    )


@router.post("/repair-form-data",
             operation_id="repairFormData",
             response_model=ResponseEnvelope[InvoiceActionResponse])
def repair_form_data(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("invoices.view"))
):
    """Reconstruct _source_form_data for all invoices that are missing it.
    Safe to run multiple times — skips invoices that already have it."""
    tenant_id = _resolve_tenant(access)
    invoices = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.tenant_id == tenant_id,
    ).all()

    repaired = 0
    skipped = 0
    errors = 0
    for inv in invoices:
        raw = inv.raw_data if isinstance(inv.raw_data, dict) else {}
        if not raw:
            skipped += 1
            continue
        # Already has _source_form_data
        if isinstance(raw.get("_source_form_data"), dict) and raw["_source_form_data"]:
            skipped += 1
            continue
        # Draft — its own raw IS the form data
        if raw.get("_is_form_draft"):
            skipped += 1
            continue
        try:
            fd = _build_form_data_from_raw(raw, inv)
            if fd and fd.get("invoiceType"):
                raw["_source_form_data"] = fd
                inv.raw_data = raw
                # Force SQLAlchemy to detect the change
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(inv, "raw_data")
                repaired += 1
            else:
                skipped += 1
        except Exception as e:
            logger.warning(f"Repair form_data error for invoice {inv.id}: {e}")
            errors += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Repair commit failed: {e}")

    msg = f"{repaired} fatura onarıldı, {skipped} atlandı, {errors} hata"
    return ResponseEnvelope(
        success=True,
        data=InvoiceActionResponse(invoice_id=repaired, success=True, message=msg),
        message=msg
    )
