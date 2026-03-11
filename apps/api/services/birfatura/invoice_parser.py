"""
Invoice Parser Helpers
Parse BirFatura API responses and extract invoice data
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string from BirFatura API"""
    if not date_str:
        return None
    
    # Try different date formats
    formats = [
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except (ValueError, TypeError):
            continue
    
    return None


def extract_sender_info(invoice_data: Dict[str, Any]) -> Dict[str, str]:
    """Extract sender information from invoice data"""
    # The structure varies based on invoice type and API version
    # This is a best-effort extraction
    
    sender_info = {
        'name': '',
        'tax_number': '',
        'tax_office': '',
        'address': '',
        'city': '',
    }
    
    # Try to extract from different possible locations
    if 'supplierParty' in invoice_data:
        party = invoice_data['supplierParty']
        sender_info['name'] = party.get('partyName', {}).get('name', '')
        
        # Tax info
        tax_scheme = party.get('partyTaxScheme', {})
        sender_info['tax_number'] = tax_scheme.get('taxIdentificationNumber', '')
        sender_info['tax_office'] = tax_scheme.get('taxOffice', {}).get('name', '')
        
        # Address
        address = party.get('postalAddress', {})
        sender_info['address'] = address.get('streetName', '')
        sender_info['city'] = address.get('cityName', '')
    
    # Fallback to top-level fields (API returns PascalCase: SenderName, SenderKN)
    if not sender_info['name']:
        sender_info['name'] = (
            invoice_data.get('SenderName') or
            invoice_data.get('senderName') or
            invoice_data.get('supplierName', '')
        )
    if not sender_info['tax_number']:
        sender_info['tax_number'] = (
            invoice_data.get('SenderKN') or
            invoice_data.get('senderKN') or
            invoice_data.get('senderVKN') or
            invoice_data.get('supplierTaxNumber', '')
        )
    if not sender_info['tax_office']:
        sender_info['tax_office'] = invoice_data.get('supplierTaxOffice', '')
    
    return sender_info


def extract_invoice_amounts(invoice_data: Dict[str, Any]) -> Dict[str, Decimal]:
    """Extract invoice amounts (subtotal, tax, total)"""
    amounts = {
        'subtotal': Decimal('0'),
        'tax_amount': Decimal('0'),
        'total_amount': Decimal('0'),
        'currency': 'TRY',
    }
    
    # Try to extract from monetary totals
    if 'legalMonetaryTotal' in invoice_data:
        monetary = invoice_data['legalMonetaryTotal']
        amounts['subtotal'] = Decimal(str(monetary.get('taxExclusiveAmount', 0)))
        amounts['total_amount'] = Decimal(str(monetary.get('payableAmount', 0)))
        amounts['currency'] = monetary.get('documentCurrencyCode', 'TRY')
    
    # Calculate tax amount if not provided
    if 'taxTotal' in invoice_data:
        tax_total = invoice_data['taxTotal']
        if isinstance(tax_total, list) and len(tax_total) > 0:
            amounts['tax_amount'] = Decimal(str(tax_total[0].get('taxAmount', 0)))
        elif isinstance(tax_total, dict):
            amounts['tax_amount'] = Decimal(str(tax_total.get('taxAmount', 0)))
    
    if amounts['tax_amount'] == 0:
        amounts['tax_amount'] = amounts['total_amount'] - amounts['subtotal']
    
    # Fallback to top-level fields (API returns PascalCase)
    if amounts['total_amount'] == 0:
        amounts['total_amount'] = Decimal(str(
            invoice_data.get('PayableAmount') or
            invoice_data.get('payableAmount') or 0
        ))
    if amounts['subtotal'] == 0:
        amounts['subtotal'] = Decimal(str(
            invoice_data.get('TaxExclusiveAmount') or
            invoice_data.get('taxExclusiveAmount') or
            invoice_data.get('LineExtensionAmount') or
            invoice_data.get('lineExtensionAmount') or 0
        ))
    if amounts['currency'] == 'TRY':
        amounts['currency'] = (
            invoice_data.get('DocumentCurrencyCode') or
            invoice_data.get('documentCurrencyCode') or 'TRY'
        )
    if amounts['tax_amount'] == 0 and amounts['total_amount'] > 0 and amounts['subtotal'] > 0:
        amounts['tax_amount'] = amounts['total_amount'] - amounts['subtotal']
    
    return amounts


def _get_ubl_value(obj: Any, default: Any = '') -> Any:
    """Extract value from UBL-style nested object like {"Value": x} or return plain value."""
    if isinstance(obj, dict):
        return obj.get('Value', default)
    return obj if obj is not None else default


def extract_invoice_items(invoice_data: Dict[str, Any]) -> list:
    """Extract invoice line items from both flat (camelCase) and UBL (PascalCase) formats."""
    items = []
    
    # Try flat format first (from get_inbox_documents summary)
    invoice_lines = invoice_data.get('invoiceLines', invoice_data.get('invoiceLine', []))
    
    # Try UBL format (from get_inbox_documents_with_detail jsonData)
    if not invoice_lines:
        invoice_lines = invoice_data.get('InvoiceLine', [])
    
    if not invoice_lines:
        return items
    
    for line in invoice_lines:
        # Detect format: UBL has nested objects with "Value" keys
        is_ubl = isinstance(line.get('Item'), dict) or isinstance(line.get('InvoicedQuantity'), dict)
        
        if is_ubl:
            item = _extract_ubl_line_item(line)
        else:
            item = _extract_flat_line_item(line)
        
        if item.get('product_name'):
            items.append(item)
    
    return items


def _extract_ubl_line_item(line: Dict[str, Any]) -> Dict[str, Any]:
    """Extract item data from UBL/e-fatura format (PascalCase with nested Value objects)."""
    item_obj = line.get('Item', {}) or {}
    
    # Product name from Item.Name.Value
    name = _get_ubl_value(item_obj.get('Name'), '')
    
    # Product description from Item.Description.Value
    description = _get_ubl_value(item_obj.get('Description'), '')
    
    # Product code from Item.SellersItemIdentification.ID.Value
    seller_id = item_obj.get('SellersItemIdentification', {}) or {}
    product_code = _get_ubl_value(seller_id.get('ID'), '')
    
    # Quantity from InvoicedQuantity.Value, unit from InvoicedQuantity.unitCode
    qty_obj = line.get('InvoicedQuantity', {}) or {}
    quantity = Decimal(str(_get_ubl_value(qty_obj, 1)))
    unit_code = qty_obj.get('unitCode', 'C62') if isinstance(qty_obj, dict) else 'C62'
    # Map UBL unit codes to Turkish
    unit_map = {'C62': 'Adet', 'KGM': 'Kg', 'LTR': 'Litre', 'MTR': 'Metre', 'BX': 'Kutu', 'PR': 'Çift'}
    unit = unit_map.get(unit_code, unit_code)
    
    # Price from Price.PriceAmount.Value
    price_obj = line.get('Price', {}) or {}
    price_amount = Decimal(str(_get_ubl_value((price_obj.get('PriceAmount') or {}), 0)))
    
    # Line total from LineExtensionAmount.Value
    line_total = Decimal(str(_get_ubl_value(line.get('LineExtensionAmount', {}), 0)))
    
    # Tax info from TaxTotal
    tax_rate = 18
    tax_amount = Decimal('0')
    tax_total = line.get('TaxTotal', {}) or {}
    if isinstance(tax_total, dict):
        tax_amount = Decimal(str(_get_ubl_value(tax_total.get('TaxAmount', {}), 0)))
        tax_subtotals = tax_total.get('TaxSubtotal', [])
        if isinstance(tax_subtotals, list) and tax_subtotals:
            percent_val = _get_ubl_value(tax_subtotals[0].get('Percent', {}), 18)
            tax_rate = int(float(percent_val)) if percent_val else 18
    
    return {
        'product_code': product_code,
        'product_name': name,
        'product_description': description,
        'quantity': quantity,
        'unit': unit,
        'unit_price': price_amount,
        'line_total': line_total,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
    }


def _extract_flat_line_item(line: Dict[str, Any]) -> Dict[str, Any]:
    """Extract item data from flat/camelCase format."""
    item = {
        'product_code': line.get('sellersItemIdentification', line.get('itemCode', '')),
        'product_name': line.get('itemName', line.get('name', '')),
        'product_description': line.get('itemDescription', line.get('description', '')),
        'quantity': Decimal(str(line.get('quantity', 1))),
        'unit': line.get('unitCode', 'Adet'),
        'unit_price': Decimal(str(line.get('priceAmount', line.get('unitPrice', 0)))),
        'line_total': Decimal(str(line.get('lineExtensionAmount', line.get('lineTotal', 0)))),
        'tax_rate': 18,
        'tax_amount': Decimal('0'),
    }
    
    if 'taxTotal' in line:
        tax_info = line['taxTotal']
        if isinstance(tax_info, list) and len(tax_info) > 0:
            tax_subtotal = tax_info[0]
        elif isinstance(tax_info, dict):
            tax_subtotal = tax_info
        else:
            tax_subtotal = {}
        
        if 'taxSubtotal' in tax_subtotal:
            subtotal = tax_subtotal['taxSubtotal']
            if isinstance(subtotal, list) and len(subtotal) > 0:
                subtotal = subtotal[0]
            
            item['tax_rate'] = int(subtotal.get('percent', 18))
            item['tax_amount'] = Decimal(str(subtotal.get('taxAmount', 0)))
    
    return item


def create_invoice_summary(invoice_data: Dict[str, Any]) -> str:
    """Create a human-readable summary of the invoice"""
    sender_info = extract_sender_info(invoice_data)
    amounts = extract_invoice_amounts(invoice_data)
    invoice_number = invoice_data.get('invoiceId', invoice_data.get('invoiceNumber', 'N/A'))
    invoice_date = invoice_data.get('issueDate', invoice_data.get('invoiceDate', ''))
    
    items = extract_invoice_items(invoice_data)
    item_count = len(items)
    
    summary = f"""
    Fatura No: {invoice_number}
    Tarih: {invoice_date}
    Gönderen: {sender_info['name']} (VKN: {sender_info['tax_number']})
    Kalem Sayısı: {item_count}
    Tutar: {amounts['total_amount']} {amounts['currency']}
    """
    
    return summary.strip()
