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

# GİB Unit Code Mapping
UNIT_CODE_MAP = {
    'ADET': 'NIU',
    'KG': 'KGM',
    'METRE': 'MTR',
    'METREKARE': 'MTK',
    'METREKUP': 'MTQ',
    'LITRE': 'LTR',
    'PAKET': 'PA',
    'KUTU': 'BX',
    'HIZMET': 'C62',
    'SAAT': 'HUR',
    'GUN': 'DAY',
    'AY': 'MON'
}

def map_unit_code(unit: str) -> str:
    if not unit:
        return 'NIU'
    unit_upper = unit.upper().replace('İ', 'I').replace('Ş', 'S').replace('Ğ', 'G').replace('Ü', 'U').replace('Ö', 'O').replace('Ç', 'C')
    return UNIT_CODE_MAP.get(unit_upper, 'NIU')

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

    # BillingReference (for IADE/Return invoices)
    if itype == 'IADE' and (invoice.get('return_reference_number') or invoice.get('return_invoice_number')):
        bref = ET.SubElement(invoice_root, f"{{{NS['cac']}}}BillingReference")
        inv_ref = ET.SubElement(bref, f"{{{NS['cac']}}}InvoiceDocumentReference")
        cbc('ID', invoice.get('return_reference_number') or invoice.get('return_invoice_number'), parent=inv_ref)
        if invoice.get('return_reference_date') or invoice.get('return_invoice_date'):
            ref_date = invoice.get('return_reference_date') or invoice.get('return_invoice_date')
            if 'T' in str(ref_date):
                ref_date = str(ref_date).split('T')[0]
            cbc('IssueDate', ref_date, parent=inv_ref)

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
        
        # Mandatory references for rendering and integrator tracking
        refs = [
            ('CUST_INV_ID', adr_uuid),
            ('OUTPUT_TYPE', '0100'),
            ('TRANSPORT_TYPE', '99'),
            ('EREPSENDT', 'ELEKTRONIK'),
            ('XSLT', invoice.get('xslt_code', 'default'))
        ]
        
        # Specialized SGK References
        if itype == 'SGK' or invoice.get('sgk_data'):
            sgk = invoice.get('sgk_data') or {}
            if sgk.get('dosya_no'):
                refs.append(('DOSYA_NO', sgk['dosya_no']))
            if sgk.get('mukellef_kodu'):
                refs.append(('MUKELLEF_KODU', sgk['mukellef_kodu']))
            if sgk.get('mukellef_adi'):
                refs.append(('MUKELLEF_ADI', sgk['mukellef_adi']))
            
        for doc_code, doc_id in refs:
            adr = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AdditionalDocumentReference")
            cbc('ID', doc_id, parent=adr)
            cbc('IssueDate', issue, parent=adr)
            cbc('DocumentTypeCode', doc_code, parent=adr)
            
        # Optional sending type and recvpk
        sending_type = invoice.get('sending_type') or (sdata.get('sending_type') if sdata else None)
        if sending_type:
            adr = ET.SubElement(invoice_root, f"{{{NS['cac']}}}AdditionalDocumentReference")
            cbc('ID', str(sending_type), parent=adr)
            cbc('IssueDate', issue, parent=adr)
            cbc('DocumentTypeCode', 'SendingType', parent=adr)
            if invoice.get('sending_type_display'):
                 cbc('DocumentType', invoice.get('sending_type_display'), parent=adr)
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
    taxid = sdata.get('tax_id') or sdata.get('tax_number') or sdata.get('taxNumber') or sdata.get('vkn')
    if taxid:
        party_id = ET.SubElement(party, f"{{{NS['cac']}}}PartyIdentification")
        scheme = 'TCKN' if len(str(taxid)) == 11 else 'VKN'
        id_el = cbc('ID', taxid, parent=party_id, attrs={'schemeID': scheme})
        
    # Tax Scheme & Tax Office
    if sdata.get('tax_office') or sdata.get('taxOffice'):
        ptax = ET.SubElement(party, f"{{{NS['cac']}}}PartyTaxScheme")
        cbc('RegistrationName', sdata.get('name', ''), parent=ptax)
        tscheme = ET.SubElement(ptax, f"{{{NS['cac']}}}TaxScheme")
        cbc('TaxTypeCode', sdata.get('tax_office') or sdata.get('taxOffice'), parent=tscheme)
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
        idc = cbc('ID', cust_taxid, parent=party_id_c, attrs={'schemeID': scheme})
        
    # Customer Tax Office
    if cdata.get('tax_office') or cdata.get('taxOffice'):
        ptax_c = ET.SubElement(party_c, f"{{{NS['cac']}}}PartyTaxScheme")
        tscheme_c = ET.SubElement(ptax_c, f"{{{NS['cac']}}}TaxScheme")
        cbc('TaxTypeCode', cdata.get('tax_office') or cdata.get('taxOffice'), parent=tscheme_c)
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
        # default unitCode with mapping
        unit = ln.get('unitCode') or ln.get('unit') or 'ADET'
        qty_el.set('unitCode', map_unit_code(unit))
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
                
        # Withholding Tax (Tevkifat) per line
        if ln.get('withholding_rate') or ln.get('withholdingRate'):
            w_rate = float(ln.get('withholding_rate') or ln.get('withholdingRate'))
            w_amount = tamount * (w_rate / 100.0)
            
            w_tax = ET.SubElement(il, f"{{{NS['cac']}}}WithholdingTaxTotal")
            cbc('TaxAmount', fmt_amount(w_amount), parent=w_tax, attrs={'currencyID': currency})
            w_sub = ET.SubElement(w_tax, f"{{{NS['cac']}}}TaxSubtotal")
            cbc('TaxableAmount', fmt_amount(tamount), parent=w_sub, attrs={'currencyID': currency})
            cbc('TaxAmount', fmt_amount(w_amount), parent=w_sub, attrs={'currencyID': currency})
            cbc('Percent', fmt_amount(w_rate), parent=w_sub)
            w_cat = ET.SubElement(w_sub, f"{{{NS['cac']}}}TaxCategory")
            w_ts = ET.SubElement(w_cat, f"{{{NS['cac']}}}TaxScheme")
            cbc('Name', 'KDV_TEVKIFAT', parent=w_ts)
            cbc('TaxTypeCode', ln.get('withholding_code') or '9015', parent=w_ts)

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
    Supports both standard e-fatura and SGK invoices.
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()
    nsmap = {'cbc': NS['cbc'], 'cac': NS['cac']}

    def find_text(elem, tag, ns='cbc'):
        t = elem.find(f"{{{NS[ns]}}}{tag}")
        return t.text if t is not None else None

    def find_amount(elem, tag, ns='cbc'):
        """Find amount and return as float"""
        text = find_text(elem, tag, ns)
        if text:
            try:
                return float(text.replace(',', '.'))
            except (ValueError, TypeError):
                return 0
        return 0

    invoice = {}
    
    # Basic fields
    invoice['invoice_number'] = find_text(root, 'ID')
    invoice['issue_date'] = find_text(root, 'IssueDate')
    invoice['uuid'] = find_text(root, 'UUID')
    invoice['invoice_type_code'] = find_text(root, 'InvoiceTypeCode')
    invoice['profile_id'] = find_text(root, 'ProfileID')
    invoice['currency_code'] = find_text(root, 'DocumentCurrencyCode') or 'TRY'
    invoice['accounting_cost'] = find_text(root, 'AccountingCost')
    invoice['line_count'] = find_text(root, 'LineCountNumeric')
    
    # Notes
    notes = []
    for note in root.findall(f"{{{NS['cbc']}}}Note"):
        if note.text:
            notes.append(note.text)
    invoice['notes'] = notes

    # Supplier (for incoming invoices, this is the sender)
    sup = root.find(f"{{{NS['cac']}}}AccountingSupplierParty")
    if sup is not None:
        party = sup.find(f"{{{NS['cac']}}}Party")
        if party is not None:
            supplier = {}
            # Name
            pname = party.find(f"{{{NS['cac']}}}PartyName")
            if pname is not None:
                supplier['name'] = find_text(pname, 'Name')
            # Tax ID
            for pid in party.findall(f"{{{NS['cac']}}}PartyIdentification"):
                pid_id = pid.find(f"{{{NS['cbc']}}}ID")
                if pid_id is not None:
                    scheme = pid_id.get('schemeID', '')
                    if scheme in ('VKN', 'TCKN'):
                        supplier['tax_id'] = pid_id.text
                        supplier['tax_id_type'] = scheme
            # Address
            addr = party.find(f"{{{NS['cac']}}}PostalAddress")
            if addr is not None:
                supplier['city'] = find_text(addr, 'CityName')
                supplier['district'] = find_text(addr, 'CitySubdivisionName')
                supplier['street'] = find_text(addr, 'StreetName')
            invoice['supplier'] = supplier
            invoice['supplier_name'] = supplier.get('name', '')
            invoice['supplier_tax_id'] = supplier.get('tax_id', '')

    # Customer (for incoming invoices, this is us - the receiver)
    cust = root.find(f"{{{NS['cac']}}}AccountingCustomerParty")
    if cust is not None:
        party = cust.find(f"{{{NS['cac']}}}Party")
        if party is not None:
            customer = {}
            # Name
            pname = party.find(f"{{{NS['cac']}}}PartyName")
            if pname is not None:
                customer['name'] = find_text(pname, 'Name')
            # Tax ID
            for pid in party.findall(f"{{{NS['cac']}}}PartyIdentification"):
                pid_id = pid.find(f"{{{NS['cbc']}}}ID")
                if pid_id is not None:
                    scheme = pid_id.get('schemeID', '')
                    if scheme in ('VKN', 'TCKN'):
                        customer['tax_id'] = pid_id.text
                        customer['tax_id_type'] = scheme
            # Address
            addr = party.find(f"{{{NS['cac']}}}PostalAddress")
            if addr is not None:
                customer['city'] = find_text(addr, 'CityName')
                customer['district'] = find_text(addr, 'CitySubdivisionName')
                customer['street'] = find_text(addr, 'StreetName')
            invoice['customer'] = customer
            invoice['customer_name'] = customer.get('name', '')
            invoice['customer_tax_id'] = customer.get('tax_id', '')

    # Tax Total
    tax_total_elem = root.find(f"{{{NS['cac']}}}TaxTotal")
    if tax_total_elem is not None:
        invoice['tax_total'] = find_amount(tax_total_elem, 'TaxAmount')

    # Legal Monetary Total
    lmt = root.find(f"{{{NS['cac']}}}LegalMonetaryTotal")
    if lmt is not None:
        invoice['line_extension_amount'] = find_amount(lmt, 'LineExtensionAmount')
        invoice['tax_exclusive_amount'] = find_amount(lmt, 'TaxExclusiveAmount')
        invoice['tax_inclusive_amount'] = find_amount(lmt, 'TaxInclusiveAmount')
        invoice['allowance_total'] = find_amount(lmt, 'AllowanceTotalAmount')
        invoice['payable_amount'] = find_amount(lmt, 'PayableAmount')

    # Lines
    invoice['lines'] = []
    for il in root.findall(f"{{{NS['cac']}}}InvoiceLine"):
        line = {}
        line['id'] = find_text(il, 'ID')
        line['quantity'] = find_text(il, 'InvoicedQuantity')
        line['line_extension_amount'] = find_amount(il, 'LineExtensionAmount')
        
        # Item details
        item = il.find(f"{{{NS['cac']}}}Item")
        if item is not None:
            line['name'] = find_text(item, 'Name')
            line['description'] = find_text(item, 'Description')
            # Seller item ID (e.g., KPV10, KPV20, TAHSİLEKP for SGK)
            seller_id = item.find(f"{{{NS['cac']}}}SellersItemIdentification")
            if seller_id is not None:
                line['seller_item_id'] = find_text(seller_id, 'ID')
        
        # Price
        price = il.find(f"{{{NS['cac']}}}Price")
        if price is not None:
            line['unit_price'] = find_amount(price, 'PriceAmount')
        
        # Allowance/Charge
        ac = il.find(f"{{{NS['cac']}}}AllowanceCharge")
        if ac is not None:
            line['allowance_amount'] = find_amount(ac, 'Amount')
            line['is_charge'] = find_text(ac, 'ChargeIndicator') == 'true'
        
        # Per-line tax
        l_tax = il.find(f"{{{NS['cac']}}}TaxTotal")
        if l_tax is not None:
            line['tax_amount'] = find_amount(l_tax, 'TaxAmount')
            lt_sub = l_tax.find(f"{{{NS['cac']}}}TaxSubtotal")
            if lt_sub is not None:
                line['tax_rate'] = find_text(lt_sub, 'Percent')
                cat = lt_sub.find(f"{{{NS['cac']}}}TaxCategory")
                if cat is not None:
                    line['tax_exemption_code'] = find_text(cat, 'TaxExemptionReasonCode')
                    line['tax_exemption_reason'] = find_text(cat, 'TaxExemptionReason')
                    ts = cat.find(f"{{{NS['cac']}}}TaxScheme")
                    if ts is not None:
                        line['tax_type_code'] = find_text(ts, 'TaxTypeCode')
        
        invoice['lines'].append(line)

    # Additional Document References (for SGK: DOSYA_NO, MUKELLEF_KODU, etc.)
    invoice['additional_references'] = []
    for adr in root.findall(f"{{{NS['cac']}}}AdditionalDocumentReference"):
        ref = {}
        ref['id'] = find_text(adr, 'ID')
        ref['type_code'] = find_text(adr, 'DocumentTypeCode')
        ref['type'] = find_text(adr, 'DocumentType')
        ref['description'] = find_text(adr, 'DocumentDescription')
        invoice['additional_references'].append(ref)
        
        # Extract specific SGK fields
        type_code = ref.get('type_code', '')
        if type_code == 'DOSYA_NO':
            invoice['dosya_no'] = ref.get('type')
        elif type_code == 'MUKELLEF_KODU':
            invoice['mukellef_kodu'] = ref.get('type')
        elif type_code == 'MUKELLEF_ADI':
            invoice['mukellef_adi'] = ref.get('type')

    return invoice


def is_ubl_file(xml_path: str) -> bool:
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        return 'Invoice' in root.tag
    except Exception:
        return False


# =============================================================================
# SGK FATURASI XML URETICI - Birfatura ornegine birebir uyumlu
# =============================================================================

# SGK sabit alici bilgileri
SGK_CUSTOMER = {
    'vkn': '7750409379',
    'name': 'Sosyal Güvenlik Kurumu',
    'city': 'ANKARA',
    'district': 'Çankaya',
    'country': 'TÜRKİYE',
    'tax_office': 'ÇANKAYA VERGİ DAİRESİ (6257)'
}

def generate_sgk_invoice_xml(invoice_data: dict, output_path: str = None) -> str:
    """
    SGK faturası XML'i üretir - Birfatura örneğine birebir uyumlu.
    
    invoice_data yapısı:
    {
        'invoice_number': 'EFA2025000000001',
        'uuid': '6074eb85-1afb-4ea8-9f92-e250f3f56967',  # opsiyonel, yoksa üretilir
        'issue_date': '2025-12-01',
        'issue_time': '10:49:24',  # opsiyonel
        
        # SGK-spesifik
        'dosya_no': '1225324',
        'mukellef_kodu': '11111111',  # Optisyenlik Müessesesi Tesis Kodu
        'mukellef_adi': 'TEST OPTİK CENGİZ ERDEM',
        'period_start': '2025-12-01',
        'period_end': '2025-12-01',
        
        # Tedarikçi bilgileri (faturayı kesen firma)
        'supplier': {
            'vkn': '1234567801',
            'name': 'Test Firma',
            'street': 'Kuşkavağı, Belediye Cd. No:78',
            'district': 'Maltepe',
            'city': 'İstanbul',
            'country': 'Türkiye',
            'tax_office': 'Antalya',
            'phone': '05555555555',
            'email': 'info@firma.com'
        },
        
        # Katılım payı kalemleri
        'kpv10_amount': 1379.00,  # %10 katılım paylı verilen tutar (KDV hariç)
        'kpv20_amount': 2270.50,  # %20 katılım paylı verilen tutar (KDV hariç)
        'tahsil_edilen_kp': 592.00,  # Tahsil edilen katılım payı (AllowanceCharge)
        
        # Opsiyonel notlar
        'notes': []
    }
    """
    
    # UUID yoksa üret
    inv_uuid = invoice_data.get('uuid') or str(uuid.uuid4())
    issue_date = invoice_data.get('issue_date') or datetime.now().strftime('%Y-%m-%d')
    issue_time = invoice_data.get('issue_time') or datetime.now().strftime('%H:%M:%S')
    invoice_number = invoice_data.get('invoice_number') or f"EFA{datetime.now().strftime('%Y')}000000001"
    
    # Tutarlar
    kpv10 = float(invoice_data.get('kpv10_amount', 0))
    kpv20 = float(invoice_data.get('kpv20_amount', 0))
    tahsil_kp = float(invoice_data.get('tahsil_edilen_kp', 0))
    
    # KDV hesaplama (%10)
    kdv_rate = 10.0
    kpv10_kdv = round(kpv10 * (kdv_rate / 100), 2)
    kpv20_kdv = round(kpv20 * (kdv_rate / 100), 2)
    
    # Toplamlar
    line_extension_total = kpv10 + kpv20  # Tahsil edilen KP'nin line extension'ı 0
    tax_exclusive_amount = line_extension_total - tahsil_kp  # İndirim sonrası
    total_tax = round(kpv10_kdv + kpv20_kdv, 2)
    tax_inclusive_amount = round(tax_exclusive_amount + total_tax, 2)
    
    # Tedarikçi bilgileri
    supplier = invoice_data.get('supplier', {})
    
    # XML oluştur
    xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ubltr="urn:oasis:names:specification:ubl:schema:xsd:TurkishCustomizationExtensionComponents" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
<ext:UBLExtensions>
<ext:UBLExtension>
<ext:ExtensionContent>

</ext:ExtensionContent>
</ext:UBLExtension>
</ext:UBLExtensions>
<cbc:UBLVersionID>2.1</cbc:UBLVersionID>
<cbc:CustomizationID>TR1.2</cbc:CustomizationID>
<cbc:ProfileID>TEMELFATURA</cbc:ProfileID>
<cbc:ID>{invoice_number}</cbc:ID>
<cbc:CopyIndicator>false</cbc:CopyIndicator>
<cbc:UUID>{inv_uuid}</cbc:UUID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:IssueTime>{issue_time}</cbc:IssueTime>
<cbc:InvoiceTypeCode>SGK</cbc:InvoiceTypeCode>
<cbc:Note>Yalnız {_amount_to_words(tax_inclusive_amount)}</cbc:Note>
<cbc:Note>E-Fatura izni kapsamında elektronik ortamda iletilmiştir.</cbc:Note>
<cbc:Note>% 10 KATILIM PAYLI VERİLEN TUTAR : {_format_amount_tr(kpv10 + kpv10_kdv)}-TL (%10 KDV DAHİLDİR)</cbc:Note>
<cbc:Note>% 20 KATILIM PAYLI VERİLEN TUTAR : {_format_amount_tr(kpv20 + kpv20_kdv)}-TL (%10 KDV DAHİLDİR)</cbc:Note>
<cbc:Note>TAHSİL EDİLEN KATILIM PAYI TOPLAM : {_format_amount_tr(tahsil_kp * 1.1)}-TL (%10 KDV DAHİLDİR)</cbc:Note>
<cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
<cbc:AccountingCost>SAGLIK_OPT</cbc:AccountingCost>
<cbc:LineCountNumeric>3</cbc:LineCountNumeric>
<cac:InvoicePeriod>
<cbc:StartDate>{invoice_data.get('period_start', issue_date)}</cbc:StartDate>
<cbc:EndDate>{invoice_data.get('period_end', issue_date)}</cbc:EndDate>
</cac:InvoicePeriod>
<cac:AdditionalDocumentReference>
<cbc:ID>{inv_uuid}</cbc:ID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:DocumentTypeCode>CUST_INV_ID</cbc:DocumentTypeCode>
</cac:AdditionalDocumentReference>
<cac:AdditionalDocumentReference>
<cbc:ID>1</cbc:ID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:DocumentTypeCode>DOSYA_NO</cbc:DocumentTypeCode>
<cbc:DocumentType>{invoice_data.get('dosya_no', '')}</cbc:DocumentType>
<cbc:DocumentDescription>Evrak No</cbc:DocumentDescription>
</cac:AdditionalDocumentReference>
<cac:AdditionalDocumentReference>
<cbc:ID>1</cbc:ID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:DocumentTypeCode>MUKELLEF_KODU</cbc:DocumentTypeCode>
<cbc:DocumentType>{invoice_data.get('mukellef_kodu', '')}</cbc:DocumentType>
<cbc:DocumentDescription>Optisyenlik Müessesesi Tesis Kodu</cbc:DocumentDescription>
</cac:AdditionalDocumentReference>
<cac:AdditionalDocumentReference>
<cbc:ID>1</cbc:ID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:DocumentTypeCode>MUKELLEF_ADI</cbc:DocumentTypeCode>
<cbc:DocumentType>{invoice_data.get('mukellef_adi', '')}</cbc:DocumentType>
<cbc:DocumentDescription>Optisyenlik Müessesesi Adı</cbc:DocumentDescription>
</cac:AdditionalDocumentReference>
<cac:AdditionalDocumentReference>
<cbc:ID>{invoice_number.replace('EFA', 'FIT')}</cbc:ID>
<cbc:IssueDate>{issue_date}</cbc:IssueDate>
<cbc:DocumentType>XSLT</cbc:DocumentType>
</cac:AdditionalDocumentReference>
<cac:AccountingSupplierParty>
<cac:Party>
<cbc:WebsiteURI/>
<cac:PartyIdentification>
<cbc:ID schemeID="VKN">{supplier.get('vkn', '')}</cbc:ID>
</cac:PartyIdentification>
<cac:PartyIdentification>
<cbc:ID schemeID="TICARETSICILNO"/>
</cac:PartyIdentification>
<cac:PartyIdentification>
<cbc:ID schemeID="MERSISNO"/>
</cac:PartyIdentification>
<cac:PartyName>
<cbc:Name>{supplier.get('name', '')}</cbc:Name>
</cac:PartyName>
<cac:PostalAddress>
<cbc:StreetName>{supplier.get('street', '')}</cbc:StreetName>
<cbc:CitySubdivisionName>{supplier.get('district', '')}</cbc:CitySubdivisionName>
<cbc:CityName>{supplier.get('city', '')}</cbc:CityName>
<cac:Country>
<cbc:Name>{supplier.get('country', 'Türkiye')}</cbc:Name>
</cac:Country>
</cac:PostalAddress>
<cac:PartyTaxScheme>
<cac:TaxScheme>
<cbc:Name>{supplier.get('tax_office', '')}</cbc:Name>
</cac:TaxScheme>
</cac:PartyTaxScheme>
<cac:Contact>
<cbc:Telephone>{supplier.get('phone', '')}</cbc:Telephone>
<cbc:ElectronicMail>{supplier.get('email', '')}</cbc:ElectronicMail>
</cac:Contact>
</cac:Party>
</cac:AccountingSupplierParty>
<cac:AccountingCustomerParty>
<cac:Party>
<cbc:WebsiteURI/>
<cac:PartyIdentification>
<cbc:ID schemeID="VKN">{SGK_CUSTOMER['vkn']}</cbc:ID>
</cac:PartyIdentification>
<cac:PartyName>
<cbc:Name>{SGK_CUSTOMER['name']}</cbc:Name>
</cac:PartyName>
<cac:PostalAddress>
<cbc:Room/>
<cbc:StreetName/>
<cbc:BuildingName/>
<cbc:BuildingNumber/>
<cbc:CitySubdivisionName>{SGK_CUSTOMER['district']}</cbc:CitySubdivisionName>
<cbc:CityName>{SGK_CUSTOMER['city']}</cbc:CityName>
<cbc:PostalZone/>
<cbc:Region/>
<cbc:District/>
<cac:Country>
<cbc:Name>{SGK_CUSTOMER['country']}</cbc:Name>
</cac:Country>
</cac:PostalAddress>
<cac:PartyTaxScheme>
<cac:TaxScheme>
<cbc:Name>{SGK_CUSTOMER['tax_office']}</cbc:Name>
<cbc:TaxTypeCode/>
</cac:TaxScheme>
</cac:PartyTaxScheme>
<cac:Contact>
<cbc:Telephone/>
<cbc:Telefax/>
<cbc:ElectronicMail/>
</cac:Contact>
</cac:Party>
</cac:AccountingCustomerParty>
<cac:TaxTotal>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(total_tax)}</cbc:TaxAmount>
<cac:TaxSubtotal>
<cbc:TaxableAmount currencyID="TRY">{fmt_amount(tax_exclusive_amount)}</cbc:TaxableAmount>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(total_tax)}</cbc:TaxAmount>
<cbc:Percent>10</cbc:Percent>
<cac:TaxCategory>
<cac:TaxScheme>
<cbc:Name>KDV</cbc:Name>
<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
</cac:TaxScheme>
</cac:TaxCategory>
</cac:TaxSubtotal>
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
<cbc:LineExtensionAmount currencyID="TRY">{fmt_amount(line_extension_total)}</cbc:LineExtensionAmount>
<cbc:TaxExclusiveAmount currencyID="TRY">{fmt_amount(tax_exclusive_amount)}</cbc:TaxExclusiveAmount>
<cbc:TaxInclusiveAmount currencyID="TRY">{fmt_amount(tax_inclusive_amount)}</cbc:TaxInclusiveAmount>
<cbc:AllowanceTotalAmount currencyID="TRY">{fmt_amount(tahsil_kp)}</cbc:AllowanceTotalAmount>
<cbc:PayableAmount currencyID="TRY">{fmt_amount(tax_inclusive_amount)}</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
<cac:InvoiceLine>
<cbc:ID>1</cbc:ID>
<cbc:InvoicedQuantity unitCode="NIU">1.0000</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="TRY">{fmt_amount(kpv10)}</cbc:LineExtensionAmount>
<cac:TaxTotal>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(kpv10_kdv)}</cbc:TaxAmount>
<cac:TaxSubtotal>
<cbc:TaxableAmount currencyID="TRY">{fmt_amount(kpv10)}</cbc:TaxableAmount>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(kpv10_kdv)}</cbc:TaxAmount>
<cbc:Percent>10</cbc:Percent>
<cac:TaxCategory>
<cac:TaxScheme>
<cbc:Name>KDV</cbc:Name>
<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
</cac:TaxScheme>
</cac:TaxCategory>
</cac:TaxSubtotal>
</cac:TaxTotal>
<cac:Item>
<cbc:Description/>
<cbc:Name>% 10 KATILIM PAYLI VERİLEN</cbc:Name>
<cac:BuyersItemIdentification>
<cbc:ID/>
</cac:BuyersItemIdentification>
<cac:SellersItemIdentification>
<cbc:ID>KPV10</cbc:ID>
</cac:SellersItemIdentification>
<cac:AdditionalItemIdentification>
<cbc:ID/>
</cac:AdditionalItemIdentification>
</cac:Item>
<cac:Price>
<cbc:PriceAmount currencyID="TRY">{fmt_amount(kpv10, 6)}</cbc:PriceAmount>
</cac:Price>
</cac:InvoiceLine>
<cac:InvoiceLine>
<cbc:ID>2</cbc:ID>
<cbc:InvoicedQuantity unitCode="NIU">1.0000</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="TRY">{fmt_amount(kpv20)}</cbc:LineExtensionAmount>
<cac:TaxTotal>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(kpv20_kdv)}</cbc:TaxAmount>
<cac:TaxSubtotal>
<cbc:TaxableAmount currencyID="TRY">{fmt_amount(kpv20)}</cbc:TaxableAmount>
<cbc:TaxAmount currencyID="TRY">{fmt_amount(kpv20_kdv)}</cbc:TaxAmount>
<cbc:Percent>10</cbc:Percent>
<cac:TaxCategory>
<cac:TaxScheme>
<cbc:Name>KDV</cbc:Name>
<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
</cac:TaxScheme>
</cac:TaxCategory>
</cac:TaxSubtotal>
</cac:TaxTotal>
<cac:Item>
<cbc:Description/>
<cbc:Name>% 20 KATILIM PAYLI VERİLEN</cbc:Name>
<cac:BuyersItemIdentification>
<cbc:ID/>
</cac:BuyersItemIdentification>
<cac:SellersItemIdentification>
<cbc:ID>KPV20</cbc:ID>
</cac:SellersItemIdentification>
<cac:AdditionalItemIdentification>
<cbc:ID/>
</cac:AdditionalItemIdentification>
</cac:Item>
<cac:Price>
<cbc:PriceAmount currencyID="TRY">{fmt_amount(kpv20, 6)}</cbc:PriceAmount>
</cac:Price>
</cac:InvoiceLine>
<cac:InvoiceLine>
<cbc:ID>3</cbc:ID>
<cbc:InvoicedQuantity unitCode="NIU">1.0000</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="TRY">0.00</cbc:LineExtensionAmount>
<cac:AllowanceCharge>
<cbc:ChargeIndicator>false</cbc:ChargeIndicator>
<cbc:AllowanceChargeReason/>
<cbc:Amount currencyID="TRY">{fmt_amount(tahsil_kp, 10)}</cbc:Amount>
</cac:AllowanceCharge>
<cac:TaxTotal>
<cbc:TaxAmount currencyID="TRY">0.00</cbc:TaxAmount>
<cac:TaxSubtotal>
<cbc:TaxableAmount currencyID="TRY">0.00</cbc:TaxableAmount>
<cbc:TaxAmount currencyID="TRY">0.00</cbc:TaxAmount>
<cbc:Percent>10</cbc:Percent>
<cac:TaxCategory>
<cac:TaxScheme>
<cbc:Name>KDV</cbc:Name>
<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
</cac:TaxScheme>
</cac:TaxCategory>
</cac:TaxSubtotal>
</cac:TaxTotal>
<cac:Item>
<cbc:Description/>
<cbc:Name>TAHSİL EDİLEN KATILIM PAYI</cbc:Name>
<cac:BuyersItemIdentification>
<cbc:ID/>
</cac:BuyersItemIdentification>
<cac:SellersItemIdentification>
<cbc:ID>TAHSİLEKP</cbc:ID>
</cac:SellersItemIdentification>
<cac:AdditionalItemIdentification>
<cbc:ID/>
</cac:AdditionalItemIdentification>
</cac:Item>
<cac:Price>
<cbc:PriceAmount currencyID="TRY">{fmt_amount(tahsil_kp, 6)}</cbc:PriceAmount>
</cac:Price>
</cac:InvoiceLine>
</Invoice>'''

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(xml_content)
    
    return xml_content


def _format_amount_tr(amount: float) -> str:
    """Türkçe format: 1.516,90"""
    return f"{amount:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def _amount_to_words(amount: float) -> str:
    """Tutarı yazıya çevirir (basit versiyon)"""
    # Basit implementasyon - gerçek projede daha kapsamlı olmalı
    lira = int(amount)
    kurus = int(round((amount - lira) * 100))
    
    birler = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz']
    onlar = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan']
    
    def iki_basamak(n):
        if n == 0:
            return ''
        if n < 10:
            return birler[n]
        return onlar[n // 10] + birler[n % 10]
    
    def uc_basamak(n):
        if n == 0:
            return ''
        if n < 100:
            return iki_basamak(n)
        yuz = n // 100
        kalan = n % 100
        if yuz == 1:
            return 'Yüz' + iki_basamak(kalan)
        return birler[yuz] + 'Yüz' + iki_basamak(kalan)
    
    result = ''
    if lira >= 1000:
        bin_kismim = lira // 1000
        lira = lira % 1000
        if bin_kismim == 1:
            result += 'Bin'
        else:
            result += uc_basamak(bin_kismim) + 'Bin'
    
    result += uc_basamak(lira)
    result += 'TürkLirası'
    
    if kurus > 0:
        result += iki_basamak(kurus) + 'Kuruş'
    
    return result
