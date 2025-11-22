import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Minimal UBL helper: generate and parse simple UBL-like Invoice XML.
# NOTE: This is a simplified UBL producer/parser for rendering purposes.

NS = {
    'ubl': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix if prefix != 'ubl' else '', uri)


def prettify(elem):
    rough = ET.tostring(elem, encoding='utf-8')
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(encoding='utf-8')


def generate_ubl_xml(invoice: dict, output_path: str, currency: str = 'TRY'):
    """
    Generate a more complete (but still simplified) UBL Invoice XML from invoice dict and write to output_path.

    Adds common UBL elements useful for GİB/birfatura integration:
      - cbc:ID, cbc:IssueDate, cbc:UUID, cbc:DocumentCurrencyCode
      - cac:AccountingSupplierParty (with TaxScheme/TaxID when available)
      - cac:AccountingCustomerParty (with TaxScheme/TaxID when available)
      - cac:TaxTotal with TaxAmount and TaxSubtotal
      - cac:InvoiceLine items with AllowanceCharge if present
      - cac:LegalMonetaryTotal with PayableAmount and LineExtensionAmount
      - Optional cac:DespatchDocumentReference and cac:InvoicePeriod

    This function still produces a simplified UBL and is NOT a replacement for
    a full UBL library. For production, use a verified UBL generator or XSLT.
    """
    invoice_root = ET.Element(f"{{{NS['ubl']}}}Invoice")

    def cbc(tag, text=None, parent=invoice_root):
        el = ET.SubElement(parent, f"{{{NS['cbc']}}}{tag}")
        if text is not None:
            el.text = str(text)
        return el

    # Basic identifiers
    cbc('ID', invoice.get('invoiceNumber') or invoice.get('id'))
    cbc('IssueDate', invoice.get('createdAt') or invoice.get('issue_date'))
    if invoice.get('uuid'):
        cbc('UUID', invoice.get('uuid'))
    cbc('DocumentCurrencyCode', currency)

    # Optional InvoicePeriod
    if invoice.get('invoicePeriod') or invoice.get('invoice_period'):
        period = ET.SubElement(invoice_root, f"{{{NS['cac']}}}InvoicePeriod")
        start = invoice.get('invoicePeriod', {}).get('start') if isinstance(invoice.get('invoicePeriod'), dict) else None
        end = invoice.get('invoicePeriod', {}).get('end') if isinstance(invoice.get('invoicePeriod'), dict) else None
        if start:
            cbc('StartDate', start, parent=period)
        if end:
            cbc('EndDate', end, parent=period)

    # DespatchDocumentReference (optional)
    if invoice.get('despatch_document_reference') or invoice.get('despatchDocumentReference'):
        dref = ET.SubElement(invoice_root, f"{{{NS['cac']}}}DespatchDocumentReference")
        cbc('ID', invoice.get('despatch_document_reference') or invoice.get('despatchDocumentReference'), parent=dref)

    # Supplier
    supplier = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AccountingSupplierParty")
    party = ET.SubElement(supplier, f"{{{NS['cac']}}}Party")
    pname = ET.SubElement(party, f"{{{NS['cac']}}}PartyName")
    cbc('Name', invoice.get('supplier', {}).get('name', ''), parent=pname)
    # Supplier tax ID (if available)
    taxid = invoice.get('supplier', {}).get('tax_id') or invoice.get('supplier', {}).get('taxNumber')
    if taxid:
        party_tax = ET.SubElement(party, f"{{{NS['cac']}}}PartyTaxScheme")
        cbc('CompanyID', taxid, parent=party_tax)

    # Customer
    customer = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AccountingCustomerParty")
    party_c = ET.SubElement(customer, f"{{{NS['cac']}}}Party")
    pname_c = ET.SubElement(party_c, f"{{{NS['cac']}}}PartyName")
    cbc('Name', invoice.get('customer', {}).get('name', ''), parent=pname_c)
    cust_taxid = invoice.get('customer', {}).get('tax_id') or invoice.get('customer', {}).get('taxNumber')
    if cust_taxid:
        party_tax_c = ET.SubElement(party_c, f"{{{NS['cac']}}}PartyTaxScheme")
        cbc('CompanyID', cust_taxid, parent=party_tax_c)

    # Invoice lines and line totals
    lines = invoice.get('lines') or []
    line_extension_total = 0.0
    tax_total_amount = 0.0
    # accumulate tax subtotals by rate (as percent label)
    tax_breakdown = {}
    for i, ln in enumerate(lines, start=1):
        try:
            amount = float(ln.get('line_extension_amount') or ln.get('lineExtensionAmount') or ln.get('line_extension') or 0)
        except Exception:
            amount = 0.0
        line_extension_total += amount

        il = ET.SubElement(invoice_root, f"{{{NS['cac']}}}InvoiceLine")
        cbc('ID', str(i), parent=il)
        cbc('InvoicedQuantity', ln.get('quantity', 1), parent=il)
        cbc('LineExtensionAmount', f"{amount:.2f}", parent=il)
        item = ET.SubElement(il, f"{{{NS['cac']}}}Item")
        cbc('Name', ln.get('description', ln.get('name', '')), parent=item)

        # AllowanceCharge per line
        allowance = ln.get('allowance_charge') or ln.get('allowanceCharge')
        if allowance is not None:
            try:
                allowance_val = float(allowance)
            except Exception:
                allowance_val = 0.0
            ac = ET.SubElement(il, f"{{{NS['cac']}}}AllowanceCharge")
            cbc('Amount', f"{allowance_val:.2f}", parent=ac)

        # Per-line tax (if provided). Expect ln.tax_rate or ln.tax_amount
        tax_amount = 0.0
        tax_rate_pct = None
        if ln.get('tax_amount') is not None:
            try:
                tax_amount = float(ln.get('tax_amount'))
            except Exception:
                tax_amount = 0.0
        elif ln.get('tax_rate') is not None:
            try:
                tax_rate_pct = float(ln.get('tax_rate'))
                tax_amount = amount * (tax_rate_pct / 100.0)
            except Exception:
                tax_amount = 0.0
        else:
            # default tax rate if not provided (assume 18%)
            tax_rate_pct = 18.0
            tax_amount = amount * (tax_rate_pct / 100.0)

        # prefer explicit percent if available
        if tax_rate_pct is None and ln.get('tax_rate') is not None:
            try:
                tax_rate_pct = float(ln.get('tax_rate'))
            except Exception:
                tax_rate_pct = 0.0

        key = f"{tax_rate_pct:.2f}" if tax_rate_pct is not None else '0.00'
        tax_breakdown.setdefault(key, {'rate': tax_rate_pct or 0.0, 'taxable': 0.0, 'tax': 0.0})
        tax_breakdown[key]['taxable'] += amount
        tax_breakdown[key]['tax'] += tax_amount

        tax_total_amount += tax_amount

    # TaxTotal element (with subtotals per rate)
    tax_total = ET.SubElement(invoice_root, f"{{{NS['cac']}}}TaxTotal")
    cbc('TaxAmount', f"{tax_total_amount:.2f}", parent=tax_total)
    # Create TaxSubtotal entries per distinct tax rate
    for key, vals in tax_breakdown.items():
        tax_sub = ET.SubElement(tax_total, f"{{{NS['cac']}}}TaxSubtotal")
        cbc('TaxableAmount', f"{vals['taxable']:.2f}", parent=tax_sub)
        cbc('TaxAmount', f"{vals['tax']:.2f}", parent=tax_sub)
        # percent (optional)
        if vals.get('rate') is not None:
            try:
                cbc('Percent', f"{vals['rate']:.2f}", parent=tax_sub)
            except Exception:
                pass
        tax_category = ET.SubElement(tax_sub, f"{{{NS['cac']}}}TaxCategory")
        tax_scheme = ET.SubElement(tax_category, f"{{{NS['cac']}}}TaxScheme")
        cbc('Name', invoice.get('tax_name', 'KDV'), parent=tax_scheme)

    # LegalMonetaryTotal
    legal = ET.SubElement(invoice_root, f"{{{NS['cac']}}}LegalMonetaryTotal")
    cbc('LineExtensionAmount', f"{line_extension_total:.2f}", parent=legal)
    cbc('TaxExclusiveAmount', f"{line_extension_total:.2f}", parent=legal)
    cbc('TaxInclusiveAmount', f"{(line_extension_total + tax_total_amount):.2f}", parent=legal)
    cbc('PayableAmount', f"{(line_extension_total + tax_total_amount):.2f}", parent=legal)

    xml_bytes = prettify(invoice_root)
    with open(output_path, 'wb') as f:
        f.write(xml_bytes)
    return output_path


def validate_ubl_xml(xml_path: str) -> (bool, list):
    """
    Basic sanity-check for required UBL elements. Returns (is_valid, missing_fields_list).
    This is not a schema (XSD) validation, but a quick check to help debugging.
    """
    missing = []
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()

        def has(tag, ns='cbc'):
            return root.find(f"{{{NS[ns]}}}{tag}") is not None

        if not has('ID'):
            missing.append('cbc:ID')
        if not has('IssueDate'):
            missing.append('cbc:IssueDate')
        if not has('DocumentCurrencyCode'):
            missing.append('cbc:DocumentCurrencyCode')
        if root.find(f"{{{NS['cac']}}}AccountingSupplierParty") is None:
            missing.append('cac:AccountingSupplierParty')
        if root.find(f"{{{NS['cac']}}}AccountingCustomerParty") is None:
            missing.append('cac:AccountingCustomerParty')
        if root.find(f"{{{NS['cac']}}}InvoiceLine") is None:
            missing.append('cac:InvoiceLine')
        if root.find(f"{{{NS['cac']}}}LegalMonetaryTotal") is None:
            missing.append('cac:LegalMonetaryTotal')

        return (len(missing) == 0, missing)
    except Exception as e:
        return (False, [f'parse-error: {e}'])


def parse_ubl_xml_to_dict(xml_path: str) -> dict:
    """
    Parse a simplified UBL invoice XML into a plain dict suitable for templates.
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()
    nsmap = {'cbc': NS['cbc'], 'cac': NS['cac']}

    def find_text(elem, tag, ns='cbc'):
        t = elem.find(f"{{{NS[ns]}}}{tag}")
        return t.text if t is not None else None

    invoice = {}
    invoice['invoiceNumber'] = find_text(root, 'ID')
    invoice['issue_date'] = find_text(root, 'IssueDate')
    invoice['uuid'] = find_text(root, 'UUID')

    # Supplier
    sup = root.find(f"{{{NS['cac']}}}AccountingSupplierParty")
    if sup is not None:
        party = sup.find(f"{{{NS['cac']}}}Party")
        if party is not None:
            pname = party.find(f"{{{NS['cac']}}}PartyName")
            if pname is not None:
                invoice['supplier'] = {'name': find_text(pname, 'Name')}

    # Customer
    cust = root.find(f"{{{NS['cac']}}}AccountingCustomerParty")
    if cust is not None:
        party = cust.find(f"{{{NS['cac']}}}Party")
        if party is not None:
            pname = party.find(f"{{{NS['cac']}}}PartyName")
            if pname is not None:
                invoice['customer'] = {'name': find_text(pname, 'Name')}

    # Lines
    invoice['lines'] = []
    for il in root.findall(f"{{{NS['cac']}}}InvoiceLine"):
        desc = None
        item = il.find(f"{{{NS['cac']}}}Item")
        if item is not None:
            desc = find_text(item, 'Name')
        qty = find_text(il, 'InvoicedQuantity')
        amount = find_text(il, 'LineExtensionAmount')
        allowance = None
        ac = il.find(f"{{{NS['cac']}}}AllowanceCharge")
        if ac is not None:
            allowance = find_text(ac, 'Amount')
        invoice['lines'].append({
            'description': desc,
            'quantity': qty,
            'line_extension_amount': amount,
            'allowance_charge': allowance
        })

    # Totals
    pay = root.find(f"{{{NS['cbc']}}}LegalMonetaryTotal")
    if pay is not None:
        invoice['payable_amount'] = find_text(pay, 'PayableAmount', ns='cbc')

    return invoice


def is_ubl_file(xml_path: str) -> bool:
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        return 'Invoice' in root.tag
    except Exception:
        return False
