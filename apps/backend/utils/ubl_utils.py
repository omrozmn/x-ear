import os
import uuid
import json
from datetime import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Minimal UBL helper: generate and parse simple UBL-like Invoice XML.
# NOTE: This is a simplified UBL producer/parser for rendering purposes.

NS = {
    'ubl': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    'ds': 'http://www.w3.org/2000/09/xmldsig#',
    'xades': 'http://uri.etsi.org/01903/v1.3.2#',
    'qdt': 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
    'udt': 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
    'ccts': 'urn:un:unece:uncefact:documentation:2'
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix if prefix != 'ubl' else '', uri)

# Try load app settings (company info) to populate supplier when invoice doesn't include it
SETTINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'current_settings.json')
def load_app_settings():
    try:
        with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def prettify(elem):
    rough = ET.tostring(elem, encoding='utf-8')
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(encoding='utf-8')


def fmt_amount(v, precision=2):
    try:
        if v is None:
            return f"{0:.{precision}f}"
        return f"{float(v):.{precision}f}"
    except Exception:
        try:
            # attempt to sanitize strings with commas
            return f"{float(str(v).replace(',', '').strip()):.{precision}f}"
        except Exception:
            return f"{0:.{precision}f}"


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

    # UBLExtensions placeholder (common in samples)
    ublexts = ET.SubElement(invoice_root, f"{{{NS['ext'] if 'ext' in NS else 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'}}}UBLExtensions")
    ublext = ET.SubElement(ublexts, f"{{{NS['ext'] if 'ext' in NS else 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'}}}UBLExtension")
    ET.SubElement(ublext, f"{{{NS['ext'] if 'ext' in NS else 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'}}}ExtensionContent")

    def cbc(tag, text=None, parent=invoice_root, attrs: dict = None):
        el = ET.SubElement(parent, f"{{{NS['cbc']}}}{tag}")
        if attrs:
            for k, v in attrs.items():
                if v is not None:
                    el.set(k, str(v))
        if text is not None:
            el.text = str(text)
        return el

    # Basic identifiers
    # UBL and customization metadata
    cbc('UBLVersionID', '2.1')
    cbc('CustomizationID', 'TR1.2')
    profile = invoice.get('profile') or ( 'TEMELFATURA' if invoice.get('invoiceType') == 'standard' or not invoice.get('invoiceType') else invoice.get('invoiceType').upper() )
    cbc('ProfileID', profile)
    cbc('ID', invoice.get('invoiceNumber') or invoice.get('id'))
    # Line count (helpful for parity with samples)
    # will be set later once lines are known; placeholder for now
    # we add after lines are constructed
    # IssueDate should be date-only (YYYY-MM-DD)
    issue = invoice.get('createdAt') or invoice.get('issue_date') or invoice.get('issueDate')
    if issue and 'T' in str(issue):
        issue = str(issue).split('T')[0]
    cbc('IssueDate', issue)
    # UUID: prefer provided, otherwise generate one
    if invoice.get('uuid'):
        cbc('UUID', invoice.get('uuid'))
    else:
        cbc('UUID', str(uuid.uuid4()))
    # IssueTime: include time if available
    itime = invoice.get('issueTime') or invoice.get('issue_time')
    if not itime:
        try:
            created = invoice.get('createdAt') or invoice.get('issue_date') or invoice.get('issueDate')
            if created and 'T' in str(created):
                itime = str(created).split('T')[1]
            else:
                itime = datetime.utcnow().isoformat()
        except Exception:
            itime = None
    if itime:
        cbc('IssueTime', itime)
    cbc('CopyIndicator', 'false')
    # InvoiceTypeCode mapping (basic)
    itype = invoice.get('invoiceType') or invoice.get('type') or invoice.get('invoice_type')
    if itype:
        mapping = {
            'standard': 'SATIS',
            'ihracat': 'IHRACAT',
            'export': 'IHRACAT',
            'return': 'IADE',
            'istisna': 'ISTISNA',
            'tevkifat': 'TEVKIFAT'
        }
        cbc('InvoiceTypeCode', mapping.get(str(itype).lower(), str(itype).upper()))
    cbc('DocumentCurrencyCode', currency)

    # Notes (sample files often include multiple cbc:Note entries)
    notes = invoice.get('notes') or invoice.get('notes_list')
    if notes:
        if isinstance(notes, str):
            cbc('Note', notes)
        elif isinstance(notes, (list, tuple)):
            for n in notes:
                cbc('Note', n)

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

    # AdditionalDocumentReference entries commonly expected by integrator
    try:
        adr_uuid = invoice.get('uuid') or invoice.get('invoiceNumber') or str(uuid.uuid4())
        for doc_code, doc_id in (
            ('CUST_INV_ID', adr_uuid),
            ('OUTPUT_TYPE', '0100'),
            ('TRANSPORT_TYPE', '99'),
            ('EREPSENDT', 'ELEKTRONIK')
        ):
            adr = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AdditionalDocumentReference")
            cbc('ID', doc_id, parent=adr)
            cbc('IssueDate', issue, parent=adr)
            cbc('DocumentTypeCode', doc_code, parent=adr)
        # optional sending type and recvpk (if provided in invoice/supplier settings)
        sending_type = invoice.get('sending_type') or (sdata.get('sending_type') if sdata else None)
        if sending_type:
            adr = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AdditionalDocumentReference")
            cbc('ID', str(sending_type), parent=adr)
            cbc('IssueDate', issue, parent=adr)
            cbc('DocumentTypeCode', 'SendingType', parent=adr)
            cbc('DocumentType', invoice.get('sending_type_display') or '')
        recvpk = invoice.get('recvpk') or (sdata.get('recvpk') if sdata else None)
        if recvpk:
            adr = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AdditionalDocumentReference")
            cbc('ID', str(recvpk), parent=adr)
            cbc('IssueDate', issue, parent=adr)
            cbc('DocumentTypeCode', 'recvpk', parent=adr)
    except Exception:
        pass

    # Supplier
    supplier = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AccountingSupplierParty")
    party = ET.SubElement(supplier, f"{{{NS['cac']}}}Party")
    sdata = invoice.get('supplier', {}) or {}
    if not sdata:
        app_settings = load_app_settings()
        sdata = (app_settings.get('settings') or {}).get('company', {}) or {}
    pname = ET.SubElement(party, f"{{{NS['cac']}}}PartyName")
    cbc('Name', sdata.get('name', ''), parent=pname)
    # Supplier tax ID (if available)
    taxid = sdata.get('tax_id') or sdata.get('taxNumber') or sdata.get('vkn')
    if taxid:
        party_id = ET.SubElement(party, f"{{{NS['cac']}}}PartyIdentification")
        # guess scheme by length: TCKN == 11, else VKN
        scheme = 'TCKN' if len(str(taxid)) == 11 else 'VKN'
        id_el = ET.SubElement(party_id, f"{{{NS['cbc']}}}ID")
        id_el.set('schemeID', scheme)
        id_el.text = str(taxid)
        # Do NOT add a Signature placeholder — integrator (birfatura) will apply e-imza/mali mühür.
    # PostalAddress
    addr = sdata.get('address') or {}
    # support address as string or dict
    if isinstance(addr, str):
        addr = {'street': addr}
    if addr:
        paddr = ET.SubElement(party, f"{{{NS['cac']}}}PostalAddress")
        if addr.get('street'):
            cbc('StreetName', addr.get('street'), parent=paddr)
        if addr.get('buildingNumber'):
            cbc('BuildingNumber', addr.get('buildingNumber'), parent=paddr)
        if addr.get('city'):
            cbc('CityName', addr.get('city'), parent=paddr)
        if addr.get('postalZone'):
            cbc('PostalZone', addr.get('postalZone'), parent=paddr)
        if addr.get('country'):
            cc = ET.SubElement(paddr, f"{{{NS['cac']}}}Country")
            cbc('Name', addr.get('country'), parent=cc)

    # Customer
    customer = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AccountingCustomerParty")
    party_c = ET.SubElement(customer, f"{{{NS['cac']}}}Party")
    cdata = invoice.get('customer', {}) or {}
    pname_c = ET.SubElement(party_c, f"{{{NS['cac']}}}PartyName")
    cbc('Name', cdata.get('name', ''), parent=pname_c)
    cust_taxid = cdata.get('tax_id') or cdata.get('taxNumber') or cdata.get('tc')
    if cust_taxid:
        party_id_c = ET.SubElement(party_c, f"{{{NS['cac']}}}PartyIdentification")
        scheme = 'TCKN' if len(str(cust_taxid)) == 11 else 'VKN'
        idc = ET.SubElement(party_id_c, f"{{{NS['cbc']}}}ID")
        idc.set('schemeID', scheme)
        idc.text = str(cust_taxid)
    # Customer postal address
    caddr = cdata.get('address') or {}
    if isinstance(caddr, str):
        caddr = {'street': caddr}
    if caddr:
        paddrc = ET.SubElement(party_c, f"{{{NS['cac']}}}PostalAddress")
        if caddr.get('street'):
            cbc('StreetName', caddr.get('street'), parent=paddrc)
        if caddr.get('buildingNumber'):
            cbc('BuildingNumber', caddr.get('buildingNumber'), parent=paddrc)
        if caddr.get('city'):
            cbc('CityName', caddr.get('city'), parent=paddrc)
        if caddr.get('postalZone'):
            cbc('PostalZone', caddr.get('postalZone'), parent=paddrc)
        if caddr.get('country'):
            cc = ET.SubElement(paddrc, f"{{{NS['cac']}}}Country")
            cbc('Name', caddr.get('country'), parent=cc)

    # Invoice lines and line totals
    lines = invoice.get('lines') or []
    # If no explicit lines provided, try to synthesize one from invoice fields
    if not lines:
        # handle device sales and simple invoices
        device_price = None
        for k in ('devicePrice', 'device_price', 'devicePrice', 'devicePrice'):
            if invoice.get(k) is not None:
                try:
                    device_price = float(invoice.get(k))
                    break
                except Exception:
                    device_price = None
        if device_price is None:
            # try legacy 'grand_total' or 'amount' keys
            for k in ('grandTotal', 'grand_total', 'amount', 'totalAmount'):
                if invoice.get(k) is not None:
                    try:
                        device_price = float(invoice.get(k))
                        break
                    except Exception:
                        device_price = None

        if device_price is not None:
            lines = [{
                'description': invoice.get('deviceName') or invoice.get('device_name') or invoice.get('notes') or 'Item',
                'quantity': 1,
                'line_extension_amount': device_price,
                'tax_rate': invoice.get('tax_rate', 18.0)
            }]
    # If still no lines, create a minimal synthetic line so files contain InvoiceLine and Price
    if not lines:
        lines = [{
            'description': invoice.get('invoiceNumber') or invoice.get('id') or profile or 'Item',
            'quantity': 1,
            'line_extension_amount': 0.00,
            'tax_rate': invoice.get('tax_rate', 0.0),
            'price': 0.00
        }]
    # after we have lines, set LineCountNumeric
    try:
        ET.SubElement(invoice_root, f"{{{NS['cbc']}}}LineCountNumeric").text = str(len(lines))
    except Exception:
        pass
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
        qty_el = cbc('InvoicedQuantity', ln.get('quantity', 1), parent=il)
        # default unitCode
        qty_el.set('unitCode', str(ln.get('unitCode') or 'EA'))
        cbc('LineExtensionAmount', fmt_amount(amount), parent=il, attrs={'currencyID': currency})
        item = ET.SubElement(il, f"{{{NS['cac']}}}Item")
        cbc('Name', ln.get('description', ln.get('name', '')), parent=item)

        # Add Price element to match integrator samples (cbc:PriceAmount under cac:Price)
        try:
            price_val = None
            if ln.get('price') is not None:
                price_val = float(ln.get('price'))
            else:
                price_val = float(amount)
        except Exception:
            price_val = float(amount)
        price = ET.SubElement(il, f"{{{NS['cac']}}}Price")
        cbc('PriceAmount', fmt_amount(price_val), parent=price, attrs={'currencyID': currency})

        # Per-line TaxTotal
        l_tax = ET.SubElement(il, f"{{{NS['cac']}}}TaxTotal")
        cbc('TaxAmount', fmt_amount(ln.get('tax_amount') or (amount * (ln.get('tax_rate', 18)/100.0))), parent=l_tax, attrs={'currencyID': currency})
        lt_sub = ET.SubElement(l_tax, f"{{{NS['cac']}}}TaxSubtotal")
        cbc('TaxableAmount', fmt_amount(amount), parent=lt_sub, attrs={'currencyID': currency})
        tamount = ln.get('tax_amount') if ln.get('tax_amount') is not None else (amount * (ln.get('tax_rate', 18)/100.0))
        cbc('TaxAmount', fmt_amount(tamount), parent=lt_sub, attrs={'currencyID': currency})
        # Percent
        if ln.get('tax_rate') is not None:
            try:
                cbc('Percent', f"{float(ln.get('tax_rate'))}", parent=lt_sub)
            except Exception:
                pass
        # Calculation sequence (use line index to mimic sample's CalculationSequenceNumeric)
        try:
            cbc('CalculationSequenceNumeric', str(i), parent=lt_sub)
        except Exception:
            pass
        tax_cat = ET.SubElement(lt_sub, f"{{{NS['cac']}}}TaxCategory")
        # include tax exemption fields if present
        if ln.get('tax_exemption_code'):
            try:
                cbc('TaxExemptionReasonCode', str(ln.get('tax_exemption_code')), parent=tax_cat)
            except Exception:
                pass
        if ln.get('tax_exemption_reason'):
            try:
                cbc('TaxExemptionReason', str(ln.get('tax_exemption_reason')), parent=tax_cat)
            except Exception:
                pass
        tax_scheme = ET.SubElement(tax_cat, f"{{{NS['cac']}}}TaxScheme")
        cbc('Name', invoice.get('tax_name', 'KDV'), parent=tax_scheme)
        # TaxTypeCode (optional)
        ttype = ln.get('tax_type_code') or invoice.get('tax_type_code')
        if ttype:
            try:
                cbc('TaxTypeCode', str(ttype), parent=tax_scheme)
            except Exception:
                pass

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
    cbc('TaxAmount', f"{tax_total_amount:.2f}", parent=tax_total, attrs={'currencyID': currency})
    # Create TaxSubtotal entries per distinct tax rate
    for key, vals in tax_breakdown.items():
        tax_sub = ET.SubElement(tax_total, f"{{{NS['cac']}}}TaxSubtotal")
        cbc('TaxableAmount', fmt_amount(vals['taxable']), parent=tax_sub, attrs={'currencyID': currency})
        cbc('TaxAmount', fmt_amount(vals['tax']), parent=tax_sub, attrs={'currencyID': currency})
        # percent (optional)
        if vals.get('rate') is not None:
            try:
                cbc('Percent', f"{vals['rate']}", parent=tax_sub)
            except Exception:
                pass
        tax_category = ET.SubElement(tax_sub, f"{{{NS['cac']}}}TaxCategory")
        tax_scheme = ET.SubElement(tax_category, f"{{{NS['cac']}}}TaxScheme")
        cbc('Name', invoice.get('tax_name', 'KDV'), parent=tax_scheme)
        # include TaxTypeCode at subtotal level if provided
        if invoice.get('tax_type_code'):
            try:
                cbc('TaxTypeCode', str(invoice.get('tax_type_code')), parent=tax_scheme)
            except Exception:
                pass

    # LegalMonetaryTotal
    legal = ET.SubElement(invoice_root, f"{{{NS['cac']}}}LegalMonetaryTotal")
    cbc('LineExtensionAmount', fmt_amount(line_extension_total), parent=legal, attrs={'currencyID': currency})
    cbc('TaxExclusiveAmount', fmt_amount(line_extension_total), parent=legal, attrs={'currencyID': currency})
    cbc('TaxInclusiveAmount', fmt_amount(line_extension_total + tax_total_amount), parent=legal, attrs={'currencyID': currency})
    cbc('PayableAmount', fmt_amount(line_extension_total + tax_total_amount), parent=legal, attrs={'currencyID': currency})

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
        # per-line tax details
        tax_amount = None
        tax_rate = None
        tax_exemption_code = None
        tax_exemption_reason = None
        tax_type_code = None
        calc_seq = None
        l_tax = il.find(f"{{{NS['cac']}}}TaxTotal")
        if l_tax is not None:
            lt_sub = l_tax.find(f"{{{NS['cac']}}}TaxSubtotal")
            if lt_sub is not None:
                tax_amount = find_text(lt_sub, 'TaxAmount')
                tax_rate = find_text(lt_sub, 'Percent')
                calc_seq = find_text(lt_sub, 'CalculationSequenceNumeric')
                cat = lt_sub.find(f"{{{NS['cac']}}}TaxCategory")
                if cat is not None:
                    tax_exemption_code = find_text(cat, 'TaxExemptionReasonCode')
                    tax_exemption_reason = find_text(cat, 'TaxExemptionReason')
                    ts = cat.find(f"{{{NS['cac']}}}TaxScheme")
                    if ts is not None:
                        tax_type_code = find_text(ts, 'TaxTypeCode')
        invoice['lines'].append({
            'description': desc,
            'quantity': qty,
            'line_extension_amount': amount,
            'allowance_charge': allowance,
            'tax_amount': tax_amount,
            'tax_rate': tax_rate,
            'tax_exemption_code': tax_exemption_code,
            'tax_exemption_reason': tax_exemption_reason,
            'tax_type_code': tax_type_code,
            'calculation_sequence': calc_seq
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
