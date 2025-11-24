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
    
    # Fallback to top-level fields
    if not sender_info['name']:
        sender_info['name'] = invoice_data.get('supplierName', invoice_data.get('senderName', ''))
    if not sender_info['tax_number']:
        sender_info['tax_number'] = invoice_data.get('supplierTaxNumber', invoice_data.get('senderVKN', ''))
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
    
    # Fallback to top-level fields
    if amounts['total_amount'] == 0 and 'payableAmount' in invoice_data:
        amounts['total_amount'] = Decimal(str(invoice_data['payableAmount']))
    
    return amounts


def extract_invoice_items(invoice_data: Dict[str, Any]) -> list:
    """Extract invoice line items"""
    items = []
    
    invoice_lines = invoice_data.get('invoiceLines', invoice_data.get('invoiceLine', []))
    
    if not invoice_lines:
        return items
    
    for line in invoice_lines:
        # Extract item data
        item = {
            'product_code': line.get('sellersItemIdentification', line.get('itemCode', '')),
            'product_name': line.get('itemName', line.get('name', '')),
            'product_description': line.get('itemDescription', line.get('description', '')),
            'quantity': Decimal(str(line.get('quantity', 1))),
            'unit': line.get('unitCode', 'Adet'),
            'unit_price': Decimal(str(line.get('priceAmount', line.get('unitPrice', 0)))),
            'line_total': Decimal(str(line.get('lineExtensionAmount', line.get('lineTotal', 0)))),
            'tax_rate': 18,  # Default
            'tax_amount': Decimal('0'),
        }
        
        # Extract tax info
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
        
        items.append(item)
    
    return items


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
