"""Mapping helpers for invoice -> provider payloads.

These map a generic application invoice dict to the provider shapes used in the
adapter. They are intentionally conservative; adjust field names to match your
domain `Invoice` model where necessary.
"""

import base64
from decimal import Decimal
from typing import Dict, Any, List


def _safe_decimal(v):
    try:
        return Decimal(v)
    except Exception:
        return Decimal('0')


def invoice_to_basic_model(invoice: Dict[str, Any]) -> Dict[str, Any]:
    """Map application invoice dict to provider's `SendBasicInvoiceFromModel`.

    The returned shape contains typical fields: header, parties, lines and
    totals. Extend to match `entegrasyon/openapi.json` as needed.
    """
    lines: List[Dict[str, Any]] = []
    for it in invoice.get('items', []):
        qty = _safe_decimal(it.get('quantity', 1))
        unit = _safe_decimal(it.get('unit_price', it.get('price', 0)))
        line_total = qty * unit
        lines.append({
            'Description': it.get('description') or it.get('name'),
            'Quantity': float(qty),
            'UnitPrice': float(unit),
            'LineTotal': float(line_total),
            'TaxPercent': float(it.get('tax_percent', 0)),
        })

    total = _safe_decimal(invoice.get('total_amount', invoice.get('amount', 0)))
    tax = _safe_decimal(invoice.get('tax_amount', invoice.get('vat', 0)))

    result = {
        'InvoiceNumber': invoice.get('invoice_number') or str(invoice.get('id')),
        'IssueDate': invoice.get('issue_date'),
        'Currency': invoice.get('currency', 'TRY'),
        'Seller': {
            'Name': invoice.get('seller_name') or invoice.get('company_name'),
            'TaxNumber': invoice.get('seller_tax_number') or invoice.get('company_tax_number'),
            'Address': invoice.get('seller_address'),
        },
        'Buyer': {
            'Name': invoice.get('buyer_name'),
            'TaxNumber': invoice.get('buyer_tax_number'),
            'Address': invoice.get('buyer_address'),
        },
        'Lines': lines,
        'TotalAmount': float(total),
        'TaxAmount': float(tax),
    }

    # Backwards-compatible aliases: some providers or tests expect lower-case
    # keys like `invoiceNumber` and `items`. Include these so the adapter can
    # interoperate with differing provider expectations during integration.
    result['invoiceNumber'] = result.get('InvoiceNumber')
    # If the original invoice already had `items`, include them under `items`.
    result['items'] = invoice.get('items', [])
    # Also provide `lines` alias for `Lines` to cover variations
    result['lines'] = result.get('Lines')

    return result


def invoice_xml_to_base64(xml_str: str) -> str:
    """Convert UBL/XML string to base64 payload expected by `SendDocument`.

    Provider may expect additional envelope fields — consult `openapi.json`.
    """
    if isinstance(xml_str, str):
        return base64.b64encode(xml_str.encode('utf-8')).decode('ascii')
    raise TypeError('xml_str must be a string')
