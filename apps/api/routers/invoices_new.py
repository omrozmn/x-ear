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
import uuid
import zipfile
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from core.database import get_db, unbound_session
from middleware.unified_access import UnifiedAccess, require_access
from schemas.response import ResponseEnvelope
from schemas.invoices_new import (
    IncomingInvoiceListResponse,
    OutgoingInvoiceListResponse,
    ConvertToPurchaseRequest, ConvertToPurchaseResponse,
    InvoiceStatus, InvoiceSummaryStats,
    InvoiceActionResponse, InvoiceRejectRequest, InvoiceCancelRequest,
    InvoiceDraftRequest, InvoiceDraftResponse
)
from core.models.purchase_invoice import PurchaseInvoice
from core.models.tenant import Tenant
from core.models.integration_config import IntegrationConfig
from core.models.purchase import Purchase
from services.birfatura.service import BirfaturaClient
from services.invoice_service_new import InvoiceServiceNew

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


def _resolve_tenant(access: UnifiedAccess) -> str:
    """Return the effective tenant_id for a request, supporting super-admin impersonation."""
    tid = access.effective_tenant_id or access.tenant_id
    if not tid:
        raise HTTPException(
            status_code=401,
            detail={"message": "Tenant context required", "code": "TENANT_REQUIRED"}
        )
    return tid


@router.get("/incoming", 
            operation_id="listIncomingInvoices",
            response_model=ResponseEnvelope[IncomingInvoiceListResponse])
def list_incoming_invoices(
    status: Optional[InvoiceStatus] = Query(None, description="Filter by status"),
    supplier_name: Optional[str] = Query(None, description="Filter by supplier name"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
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
            per_page=per_page
        )
        
        return ResponseEnvelope(
            success=True,
            data=result,
            message="Incoming invoices retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error listing incoming invoices: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve incoming invoices")


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
            per_page=per_page
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
    global_key = integration_cfg.config_value if integration_cfg else None
    use_test_creds = bool(
        os.getenv("BIRFATURA_TEST_API_KEY")
        and os.getenv("BIRFATURA_TEST_SECRET_KEY")
        and os.getenv("BIRFATURA_TEST_INTEGRATION_KEY")
    )
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


import json as _json


def _pdf_escape(text: str) -> str:
    return re.sub(r"([()\\\\])", r"\\\1", text or "")


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
        f"Type: {raw.get('InvoiceTypeCode') or raw.get('invoiceTypeCode') or ''}",
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

    inv_type = raw.get("InvoiceTypeCode") or invoice.invoice_type or "SATIS"

    supplier_name = raw.get("SenderName") or invoice.sender_name or ""
    supplier_vkn = raw.get("SenderKN") or invoice.sender_tax_number or ""
    supplier_tax_office = invoice.sender_tax_office or ""
    supplier_addr_parts = [invoice.sender_address or "", invoice.sender_city or ""]
    supplier_addr = ", ".join(p for p in supplier_addr_parts if p)

    source_form = raw.get("_source_form_data") if isinstance(raw.get("_source_form_data"), dict) else {}
    customer_name = (
        raw.get("ReceiverName")
        or (raw.get("customer") or {}).get("name")
        or source_form.get("customerName")
        or " ".join(filter(None, [source_form.get("customerFirstName"), source_form.get("customerLastName")])).strip()
    )
    customer_vkn = (
        raw.get("ReceiverKN")
        or (raw.get("customer") or {}).get("tax_id")
        or source_form.get("customerTaxId")
        or source_form.get("customerTaxNumber")
        or source_form.get("customerTcNumber")
        or ""
    )

    subtotal = float(raw.get("LineExtensionAmount") or invoice.subtotal or 0)
    tax_inclusive = float(raw.get("TaxInclusiveAmount") or 0)
    tax_exclusive = float(raw.get("TaxExclusiveAmount") or 0)
    tax_total = (tax_inclusive - tax_exclusive) if tax_inclusive else float(invoice.tax_amount or 0)
    payable = float(raw.get("PayableAmount") or invoice.total_amount or 0)
    currency = raw.get("DocumentCurrencyCode") or invoice.currency or "TRY"

    raw_lines = raw.get("lines") if isinstance(raw.get("lines"), list) else (source_form.get("items") or [])
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
        "invoice_id": raw.get("InvoiceNo") or invoice.invoice_number or "",
        "uuid": invoice.birfatura_uuid or "",
        "issue_date": (raw.get("IssueDate") or str(invoice.invoice_date or ""))[:10],
        "invoice_type": inv_type,
        "document_title": "E-FATURA",
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
        "lines": normalized_lines,
        "line_extension_amount": subtotal,
        "tax_total": tax_total,
        "payable_amount": payable,
        "note": raw.get("Note") or raw.get("notes") or "",
    }
    return render_invoice_to_pdf(invoice_data, tenant_id=tenant_id)


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
    inv_type = raw.get("InvoiceTypeCode") or invoice.invoice_type or ""
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

    # HTML format: always render from stored raw_data (fast, no BirFatura round-trip)
    if format == "html":
        content = _render_invoice_html(invoice)
        filename = f"{invoice.invoice_number or invoice_id}.html"
        return Response(content=content, media_type="text/html",
                        headers={"Content-Disposition": f'inline; filename="{filename}"'})

    if format == "pdf":
        # 2-step: Download XML from BirFatura then convert to PDF via PreviewDocumentReturnPDF
        pdf_bytes = None
        if invoice.birfatura_uuid:
            try:
                client = _get_birfatura_client(tenant_id, db)
                xml_resp = client.document_download_by_uuid({
                    "documentUUID": invoice.birfatura_uuid,
                    "inOutCode": in_out_code,
                    "systemTypeCodes": "EFATURA",
                    "fileExtension": "XML"
                })
                if xml_resp.get("Success") and xml_resp.get("Result", {}).get("content"):
                    xml_b64 = xml_resp["Result"]["content"]
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
                        logger.warning(f"PreviewDocumentReturnPDF failed for invoice {invoice_id}: {preview_resp.get('Message')}")
                else:
                    logger.warning(f"XML download failed for invoice {invoice_id}: {xml_resp.get('Message')}")
            except Exception as e:
                logger.warning(f"BirFatura PDF generation failed for invoice {invoice_id}: {e}")

        if pdf_bytes:
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
        # BirFatura-sourced draft (copy): map XML fields to form state
        items = []
        for line in (raw.get("invoiceLines") or raw.get("invoiceLine") or []):
            items.append({
                "id": str(uuid.uuid4()),
                "name": line.get("itemName") or line.get("name", ""),
                "description": line.get("itemDescription") or line.get("description", ""),
                "quantity": float(line.get("quantity", 1)),
                "unit": line.get("unitCode", "Adet"),
                "unitPrice": float(line.get("priceAmount") or line.get("unitPrice", 0)),
                "taxRate": 20,
                "taxAmount": 0,
                "total": float(line.get("lineExtensionAmount") or line.get("lineTotal", 0)),
            })

        form_data = {
            "customerFirstName": (
                raw.get("ReceiverName") or raw.get("receiverName") or draft.sender_name or ""
            ),
            "customerTaxNumber": (
                raw.get("ReceiverKN") or raw.get("receiverTaxNumber") or draft.sender_tax_number or ""
            ),
            "customerTaxId": (
                raw.get("ReceiverKN") or raw.get("receiverTaxNumber") or draft.sender_tax_number or ""
            ),
            "invoiceType": raw.get("InvoiceTypeCode", ""),
            "currency": raw.get("DocumentCurrencyCode") or draft.currency or "TRY",
            "invoiceDate": draft.invoice_date.isoformat() if draft.invoice_date else None,
            "items": items,
        }

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
        raw_data=dict(original.raw_data) if isinstance(original.raw_data, dict) else original.raw_data,
        status="DRAFT",
        is_matched=False,
        notes=f"Fatura #{original.id} kopyası",
    )
    db.add(copy)
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
