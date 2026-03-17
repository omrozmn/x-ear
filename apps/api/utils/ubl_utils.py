import os
import uuid
import json
from datetime import datetime
from datetime import timedelta
import xml.etree.ElementTree as ET
from xml.dom import minidom
from xml.sax.saxutils import escape

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

WITHHOLDING_CODE_MAP = {
    '601': {'name': 'Yapim Isleri Ile Bu Islerle Birlikte Ifa Edilen Muhendislik Mimarlik Ve Etut Proje Hizmetleri', 'rate': 40.0},
    '602': {'name': 'Etut Plan Proje Danismanlik Denetim Ve Benzeri Hizmetler', 'rate': 90.0},
    '603': {'name': 'Makine Techizat Demirbas Ve Tasitlara Ait Tadil Bakim Ve Onarim Hizmetleri', 'rate': 70.0},
    '604': {'name': 'Yemek Servis Ve Organizasyon Hizmeti', 'rate': 50.0},
    '605': {'name': 'Organizasyon Hizmeti', 'rate': 50.0},
    '606': {'name': 'Is Gucu Temin Hizmeti', 'rate': 90.0},
    '607': {'name': 'Ozel Guvenlik Hizmeti', 'rate': 90.0},
    '608': {'name': 'Yapi Denetim Hizmeti', 'rate': 90.0},
    '609': {'name': 'Fason Tekstil Ve Konfeksiyon Hizmeti', 'rate': 70.0},
    '610': {'name': 'Turistik Magazalara Verilen Musteri Bulma Hizmeti', 'rate': 90.0},
    '611': {'name': 'Spor Kuluplerinin Yayin Reklam Ve Isim Hakki Gelirleri', 'rate': 90.0},
    '612': {'name': 'Temizlik Cevre Ve Bahce Bakim Hizmeti', 'rate': 90.0},
    '613': {'name': 'Cevre Ve Bahce Bakim Hizmeti', 'rate': 90.0},
    '614': {'name': 'Servis Tasimaciligi Hizmeti', 'rate': 50.0},
    '615': {'name': 'Baski Ve Basim Hizmeti', 'rate': 70.0},
    '616': {'name': '5018 Sayili Kanuna Ekli Cetvellerde Yer Alan Idare Kurum Ve Kuruluslara Ifa Edilen Diger Hizmetler', 'rate': 50.0},
    '617': {'name': 'Hurda Metalden Elde Edilen Kulce Teslimi', 'rate': 70.0},
    '618': {'name': 'Bakir Cinko Aluminyum Ve Kursun Urunleri Teslimi', 'rate': 70.0},
    '619': {'name': 'Bakir Cinko Aluminyum Ve Kursun Urunleri Teslimi', 'rate': 70.0},
    '620': {'name': 'Istisnadan Vazgecenlerin Hurda Ve Atik Teslimi', 'rate': 70.0},
    '621': {'name': 'Hurda Ve Atiktan Elde Edilen Hammadde Teslimi', 'rate': 90.0},
    '622': {'name': 'Pamuk Tiftik Yun Ve Yapag Ile Ham Post Ve Deri Teslimleri', 'rate': 90.0},
    '623': {'name': 'Agac Ve Orman Urunleri Teslimi', 'rate': 50.0},
    '624': {'name': 'Yuk Tasimaciligi Hizmeti [Kdvgut-(I/C-2.1.3.2.11)]', 'rate': 20.0},
    '625': {'name': 'Ticari Reklam Hizmeti', 'rate': 30.0},
    '626': {'name': 'Diger Teslimler', 'rate': 20.0},
    '627': {'name': 'Demir Celik Urunleri Teslimi', 'rate': 50.0},
    '801': {'name': 'Yapim Isleri (Tam Tevkifat)', 'rate': 100.0},
    '802': {'name': 'Etut Plan Proje Danismanlik Denetim Ve Benzeri Hizmetler (Tam Tevkifat)', 'rate': 100.0},
    '803': {'name': 'Makine Techizat Demirbas Ve Tasitlara Ait Tadil Bakim Ve Onarim Hizmetleri (Tam Tevkifat)', 'rate': 100.0},
    '804': {'name': 'Yemek Servis Ve Organizasyon Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '805': {'name': 'Organizasyon Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '806': {'name': 'Is Gucu Temin Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '807': {'name': 'Ozel Guvenlik Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '808': {'name': 'Yapi Denetim Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '809': {'name': 'Fason Tekstil Ve Konfeksiyon Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '810': {'name': 'Musteri Bulma Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '811': {'name': 'Spor Kuluplerinin Yayin Reklam Ve Isim Hakki Gelirleri (Tam Tevkifat)', 'rate': 100.0},
    '812': {'name': 'Temizlik Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '813': {'name': 'Cevre Ve Bahce Bakim Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '814': {'name': 'Servis Tasimaciligi Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '815': {'name': 'Baski Ve Basim Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '816': {'name': 'Hurda Metalden Elde Edilen Kulce Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '817': {'name': 'Bakir Cinko Aluminyum Ve Kursun Urunleri Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '818': {'name': 'Bakir Cinko Aluminyum Ve Kursun Urunleri Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '819': {'name': 'Hurda Ve Atik Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '820': {'name': 'Hurda Ve Atiktan Elde Edilen Hammadde Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '821': {'name': 'Pamuk Tiftik Yun Ve Yapag Ile Ham Post Ve Deri Teslimleri (Tam Tevkifat)', 'rate': 100.0},
    '822': {'name': 'Agac Ve Orman Urunleri Teslimi (Tam Tevkifat)', 'rate': 100.0},
    '823': {'name': 'Yuk Tasimaciligi Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '824': {'name': 'Ticari Reklam Hizmeti (Tam Tevkifat)', 'rate': 100.0},
    '825': {'name': 'Demir Celik Urunleri Teslimi (Tam Tevkifat)', 'rate': 100.0},
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


def _normalize_address(raw):
    if isinstance(raw, str):
        return {'street': raw}
    if isinstance(raw, dict):
        return raw
    return {}


def _append_postal_address(parent, cbc, addr, element_name='PostalAddress'):
    address = _normalize_address(addr)
    if not address:
        return None

    postal = ET.SubElement(parent, f"{{{NS['cac']}}}{element_name}")
    street = address.get('street')
    if street:
        cbc('StreetName', street, parent=postal)

    building_name = address.get('buildingName')
    if building_name:
        cbc('BuildingName', building_name, parent=postal)

    building_number = address.get('buildingNumber')
    if building_number:
        cbc('BuildingNumber', building_number, parent=postal)

    district = address.get('district') or address.get('citySubdivisionName') or ('MERKEZ' if address.get('city') else '')
    if district:
        cbc('CitySubdivisionName', district, parent=postal)

    city = address.get('city')
    if city:
        cbc('CityName', city, parent=postal)

    postal_zone = address.get('postalZone')
    if postal_zone:
        cbc('PostalZone', postal_zone, parent=postal)

    country = ET.SubElement(postal, f"{{{NS['cac']}}}Country")
    cbc('IdentificationCode', 'TR', parent=country)
    cbc('Name', address.get('country') or 'TÜRKİYE', parent=country)
    return postal


def resolve_withholding(code, rate):
    code_str = str(code or '').strip() or '624'
    meta = WITHHOLDING_CODE_MAP.get(code_str, {})
    canonical_rate = meta.get('rate')
    try:
        parsed_rate = float(rate) if rate is not None else None
    except Exception:
        parsed_rate = None
    if parsed_rate in (None, 0.0) and canonical_rate is not None:
        parsed_rate = canonical_rate
    return {
        'code': code_str,
        'rate': parsed_rate if parsed_rate is not None else 0.0,
        'name': meta.get('name', 'KDV_TEVKIFAT'),
    }


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

    # --- InvoiceTypeCode & ProfileID resolution ---
    itype_raw = invoice.get('invoiceType') or invoice.get('type') or invoice.get('invoice_type') or ''
    scenario = invoice.get('scenario') or invoice.get('profile_scenario') or ''

    INVOICE_TYPE_MAP = {
        'standard': 'SATIS', '0': 'SATIS', '8': 'SATIS', '16': 'SATIS', '21': 'SATIS', '30': 'SATIS',
        'ihracat': 'IHRACAT', 'export': 'IHRACAT', '5': 'IHRACAT', '27': 'IHRACAT',
        'return': 'IADE', 'iade': 'IADE', '9': 'IADE', '50': 'IADE', '49': 'IADE', '15': 'IADE',
        'istisna': 'ISTISNA', '10': 'ISTISNA', '13': 'ISTISNA', '17': 'ISTISNA', '23': 'ISTISNA', '29': 'ISTISNA', '31': 'ISTISNA',
        'tevkifat': 'TEVKIFAT', '11': 'TEVKIFAT', '18': 'TEVKIFAT', '24': 'TEVKIFAT', '32': 'TEVKIFAT',
        'ozelmatrah': 'OZELMATRAH', '12': 'OZELMATRAH', '19': 'OZELMATRAH', '25': 'OZELMATRAH', '33': 'OZELMATRAH',
        '14': 'SATIS',  # SGK uses SATIS with special profile
        '35': 'SATIS',  # Teknoloji destek
        'sgk': 'SATIS',
        'hks': 'SATIS',
        'sarj': 'SARJ',
        'sarjanlik': 'SARJANLIK',
        'earsiv': 'SATIS',
        'yolcu': 'SATIS',
        'otv': 'SATIS',
        'hastane': 'SATIS',
        'sevk': 'SEVK',
    }
    itype_key = str(itype_raw).lower().strip()
    resolved_type_code = INVOICE_TYPE_MAP.get(itype_key, str(itype_raw).upper() if itype_raw else 'SATIS')
    invoice_type_code_for_xml = resolved_type_code
    # ProfileID resolution based on scenario + type
    PROFILE_MAP = {
        'export': 'IHRACAT',
        'ihracat': 'IHRACAT',
    }
    if invoice.get('profile'):
        profile = invoice['profile']
    elif str(scenario).lower() in PROFILE_MAP:
        profile = PROFILE_MAP[str(scenario).lower()]
    elif itype_key in ('14', 'sgk'):
        profile = 'TEMELFATURA'
    elif itype_key in ('earsiv',):
        profile = 'EARSIVFATURA'
    elif itype_key in ('hks',):
        profile = 'HKS'
    elif itype_key in ('sarj', 'sarjanlik'):
        profile = 'ENERJI'
    elif itype_key in ('yolcu',):
        profile = 'YOLCUBERABERFATURA'
    elif itype_key in ('sevk',):
        profile = 'TEMELIRSALIYE'
    elif itype_key in ('35',):
        profile = 'TEMELFATURA'
    elif itype_key in ('15', '49', '50'):
        profile = 'TEMELFATURA'  # return invoices default to temel
    else:
        # Default: TICARIFATURA for non-basic, TEMELFATURA otherwise
        scenario_lower = str(scenario).lower()
        if scenario_lower == 'government':
            profile = 'TEMELFATURA'
        else:
            profile = invoice.get('profileId') or 'TICARIFATURA'

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
    # InvoiceTypeCode — resolved above
    cbc('InvoiceTypeCode', invoice_type_code_for_xml)
    cbc('DocumentCurrencyCode', currency)
    exchange_rate = invoice.get('exchangeRate') or invoice.get('exchange_rate')
    if currency and str(currency).upper() != 'TRY':
        per = ET.SubElement(invoice_root, f"{{{NS['cac']}}}PricingExchangeRate")
        cbc('SourceCurrencyCode', currency, parent=per)
        cbc('TargetCurrencyCode', 'TRY', parent=per)
        cbc('CalculationRate', exchange_rate or 1, parent=per)

    # BillingReference (for ALL return-type invoices: IADE, 50, 49, 15, 9)
    _return_types = {'iade', 'return', '50', '49', '15', '9'}
    if itype_key in _return_types or resolved_type_code == 'IADE':
        ref_no = (invoice.get('return_reference_number') or invoice.get('return_invoice_number')
                  or (invoice.get('return_invoice_details') or {}).get('returnInvoiceNumber'))
        ref_date = (invoice.get('return_reference_date') or invoice.get('return_invoice_date')
                    or (invoice.get('return_invoice_details') or {}).get('returnInvoiceDate'))
        if ref_no:
            bref = ET.SubElement(invoice_root, f"{{{NS['cac']}}}BillingReference")
            inv_ref = ET.SubElement(bref, f"{{{NS['cac']}}}InvoiceDocumentReference")
            cbc('ID', ref_no, parent=inv_ref)
            if ref_date:
                if 'T' in str(ref_date):
                    ref_date = str(ref_date).split('T')[0]
                cbc('IssueDate', ref_date, parent=inv_ref)
            cbc('DocumentTypeCode', 'IADE', parent=inv_ref)
            cbc('DocumentType', 'FATURA', parent=inv_ref)

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

    # PaymentMeans (if provided — needed for ISTISNA, IHRACAT)
    payment_means = invoice.get('payment_means') or invoice.get('paymentMeans')
    if payment_means:
        pm = ET.SubElement(invoice_root, f"{{{NS['cac']}}}PaymentMeans")
        cbc('PaymentMeansCode', payment_means.get('code', '1'), parent=pm)
        if payment_means.get('channelCode'):
            cbc('PaymentChannelCode', payment_means['channelCode'], parent=pm)
        if payment_means.get('dueDate'):
            cbc('PaymentDueDate', payment_means['dueDate'], parent=pm)
        if payment_means.get('accountId') or payment_means.get('accountHolder'):
            pfa = ET.SubElement(pm, f"{{{NS['cac']}}}PayeeFinancialAccount")
            if payment_means.get('ID'):
                cbc('ID', payment_means['ID'], parent=pfa)
            elif payment_means.get('accountId'):
                cbc('ID', payment_means['accountId'], parent=pfa)
            if payment_means.get('accountHolder'):
                cbc('Name', payment_means['accountHolder'], parent=pfa)
            if payment_means.get('bankName'):
                branch = ET.SubElement(pfa, f"{{{NS['cac']}}}FinancialInstitutionBranch")
                fin = ET.SubElement(branch, f"{{{NS['cac']}}}FinancialInstitution")
                cbc('Name', payment_means['bankName'], parent=fin)

    payment_terms = invoice.get('payment_terms') or invoice.get('paymentTerms')
    if payment_terms:
        pt = ET.SubElement(invoice_root, f"{{{NS['cac']}}}PaymentTerms")
        note_parts = []
        payment_term_text = payment_terms.get('paymentTerm') or payment_terms.get('note')
        if payment_term_text:
            note_parts.append(str(payment_term_text))
        payment_days = payment_terms.get('paymentDays')
        if payment_days not in (None, ''):
            note_parts.append(f"Odeme vadesi: {payment_days} gun")
            if not payment_means:
                try:
                    pm = ET.SubElement(invoice_root, f"{{{NS['cac']}}}PaymentMeans")
                    cbc('PaymentMeansCode', '1', parent=pm)
                    if issue:
                        due_date = (datetime.strptime(str(issue), "%Y-%m-%d") + timedelta(days=int(payment_days))).strftime("%Y-%m-%d")
                        cbc('PaymentDueDate', due_date, parent=pm)
                except Exception:
                    pass
        if payment_terms.get('earlyPaymentDiscount') not in (None, ''):
            note_parts.append(f"Erken odeme indirimi %{payment_terms.get('earlyPaymentDiscount')}")
        if payment_terms.get('latePaymentPenalty') not in (None, ''):
            note_parts.append(f"Gec odeme cezasi %{payment_terms.get('latePaymentPenalty')}")
        if note_parts:
            cbc('Note', ' | '.join(note_parts), parent=pt)

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
        if itype_key in ('14', 'sgk') or invoice.get('sgk_data'):
            sgk = invoice.get('sgk_data') or {}
            if sgk.get('dosya_no'):
                refs.append(('DOSYA_NO', sgk['dosya_no']))
            if sgk.get('mukellef_kodu'):
                refs.append(('MUKELLEF_KODU', sgk['mukellef_kodu']))
            if sgk.get('mukellef_adi'):
                refs.append(('MUKELLEF_ADI', sgk['mukellef_adi']))

        medical_refs = []
        profile_details = invoice.get('profile_details') or invoice.get('profileDetails') or {}
        doc_medical = invoice.get('medical_device_data') or invoice.get('medicalDeviceData') or {}
        if isinstance(doc_medical, dict) and doc_medical:
            medical_refs.append(doc_medical)
        for line in invoice.get('lines') or []:
            if not isinstance(line, dict):
                continue
            line_medical = line.get('medical_device_data') or line.get('medicalDeviceData') or {}
            if isinstance(line_medical, dict) and line_medical:
                medical_refs.append(line_medical)
        for medical in medical_refs:
            license_number = medical.get('licenseNumber') or medical.get('license_number')
            serial_number = medical.get('serialNumber') or medical.get('serial_number')
            lot_number = medical.get('lotNumber') or medical.get('lot_number')
            if license_number:
                refs.append(('LICENSE_NO', license_number))
            if serial_number:
                refs.append(('SERIAL_NO', serial_number))
            if lot_number:
                refs.append(('LOT_NO', lot_number))
        if isinstance(profile_details, dict):
            if profile_details.get('hotelRegistrationNo'):
                refs.append(('HOTEL_REG_NO', profile_details['hotelRegistrationNo']))
            if profile_details.get('stationCode'):
                refs.append(('STATION_CODE', profile_details['stationCode']))
            if profile_details.get('plateNumber'):
                refs.append(('PLATE_NO', profile_details['plateNumber']))
            if profile_details.get('passengerPassportNo'):
                refs.append(('PASSPORT_NO', profile_details['passengerPassportNo']))
            if profile_details.get('passengerNationality'):
                refs.append(('NATIONALITY', profile_details['passengerNationality']))
            if profile_details.get('taxRepresentativeTaxId'):
                refs.append(('TAX_REP_ID', profile_details['taxRepresentativeTaxId']))
            if profile_details.get('refundBankIban'):
                refs.append(('REFUND_IBAN', profile_details['refundBankIban']))
            
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
        cbc('Name', sdata.get('tax_office') or sdata.get('taxOffice'), parent=tscheme)
    # PostalAddress
    addr = sdata.get('address') or {}
    if addr:
        _append_postal_address(party, cbc, addr)

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
        cbc('Name', cdata.get('tax_office') or cdata.get('taxOffice'), parent=tscheme_c)
    # Customer postal address
    caddr = cdata.get('address') or {}
    if caddr:
        _append_postal_address(party_c, cbc, caddr)
    # BuyerCustomerParty (required for IHRACAT, HASTANE)
    buyer = invoice.get('buyer_customer') or invoice.get('buyerCustomer')
    profile_details = invoice.get('profile_details') or invoice.get('profileDetails') or {}
    if not buyer and (resolved_type_code in ('IHRACAT', 'IHRACKAYITLI') or str(scenario).lower() == 'medical'):
        fallback_tax_id = cdata.get('tax_id') or cdata.get('taxNumber') or cdata.get('tc')
        fallback_name = cdata.get('name')
        if fallback_name or fallback_tax_id:
            buyer = {
                'name': fallback_name or '',
                'tax_id': fallback_tax_id or '',
            }
    if not buyer and itype_key in ('yolcu', 'hastane'):
        buyer = {
            'name': profile_details.get('passengerName') or profile_details.get('patientName') or cdata.get('name') or '',
            'tax_id': profile_details.get('patientTaxId') or cdata.get('tax_id') or cdata.get('taxNumber') or cdata.get('tc') or '',
            'passport_no': profile_details.get('passengerPassportNo') or '',
            'nationality': profile_details.get('passengerNationality') or '',
            'address': cdata.get('address') or {},
        }
    if buyer:
        bcp = ET.SubElement(invoice_root, f"{{{NS['cac']}}}BuyerCustomerParty")
        bp = ET.SubElement(bcp, f"{{{NS['cac']}}}Party")
        if resolved_type_code in ('IHRACAT', 'IHRACKAYITLI') or str(scenario).lower() == 'export':
            buyer_party_type = ET.SubElement(bp, f"{{{NS['cac']}}}PartyIdentification")
            cbc('ID', 'EXPORT', parent=buyer_party_type, attrs={'schemeID': 'PARTYTYPE'})
        if itype_key == 'yolcu':
            buyer_party_type = ET.SubElement(bp, f"{{{NS['cac']}}}PartyIdentification")
            cbc('ID', 'TAXFREE', parent=buyer_party_type, attrs={'schemeID': 'PARTYTYPE'})
        buyer_tax_id = buyer.get('tax_id')
        if buyer_tax_id:
            bpid = ET.SubElement(bp, f"{{{NS['cac']}}}PartyIdentification")
            scheme = 'TCKN' if len(str(buyer_tax_id)) == 11 else 'VKN'
            cbc('ID', buyer_tax_id, parent=bpid, attrs={'schemeID': scheme})
        if buyer.get('passport_no'):
            passport_id = ET.SubElement(bp, f"{{{NS['cac']}}}PartyIdentification")
            cbc('ID', buyer.get('passport_no'), parent=passport_id, attrs={'schemeID': 'PASSPORTNO'})
        bpn = ET.SubElement(bp, f"{{{NS['cac']}}}PartyName")
        cbc('Name', buyer.get('name', ''), parent=bpn)
        if resolved_type_code in ('IHRACAT', 'IHRACKAYITLI') or str(scenario).lower() == 'export':
            bple = ET.SubElement(bp, f"{{{NS['cac']}}}PartyLegalEntity")
            cbc('RegistrationName', buyer.get('name', ''), parent=bple)
        baddr = buyer.get('address') or cdata.get('address') or {}
        if baddr:
            _append_postal_address(bp, cbc, baddr)
        if itype_key == 'yolcu':
            first_name, family_name = '', ''
            full_name = buyer.get('name', '')
            if full_name:
                name_parts = [part for part in str(full_name).split(' ') if part]
                if name_parts:
                    first_name = name_parts[0]
                    family_name = ' '.join(name_parts[1:])
            person = ET.SubElement(bp, f"{{{NS['cac']}}}Person")
            if first_name:
                cbc('FirstName', first_name, parent=person)
            if family_name:
                cbc('FamilyName', family_name, parent=person)
            if buyer.get('nationality'):
                cbc('NationalityID', buyer.get('nationality'), parent=person)
            if buyer.get('passport_no'):
                identity_document = ET.SubElement(person, f"{{{NS['cac']}}}IdentityDocumentReference")
                cbc('ID', buyer.get('passport_no'), parent=identity_document)
                cbc('IssueDate', invoice.get('createdAt', datetime.now().strftime('%Y-%m-%d'))[:10], parent=identity_document)

    if itype_key == 'yolcu' and isinstance(profile_details, dict) and profile_details.get('taxRepresentativeTaxId'):
        tax_rep = ET.SubElement(invoice_root, f"{{{NS['cac']}}}TaxRepresentativeParty")
        tax_rep_id = ET.SubElement(tax_rep, f"{{{NS['cac']}}}PartyIdentification")
        cbc('ID', profile_details.get('taxRepresentativeTaxId'), parent=tax_rep_id, attrs={'schemeID': 'ARACIKURUMVKN'})
        tax_rep_label = profile_details.get('taxRepresentativeLabel') or f"urn:mail:{profile_details.get('taxRepresentativeTaxId')}@x-ear.local"
        tax_rep_label_id = ET.SubElement(tax_rep, f"{{{NS['cac']}}}PartyIdentification")
        cbc('ID', tax_rep_label, parent=tax_rep_label_id, attrs={'schemeID': 'ARACIKURUMETIKET'})
        tax_rep_name = profile_details.get('taxRepresentativeName') or invoice.get('supplier', {}).get('name') or ''
        if tax_rep_name:
            tax_rep_party_name = ET.SubElement(tax_rep, f"{{{NS['cac']}}}PartyName")
            cbc('Name', tax_rep_name, parent=tax_rep_party_name)
        tax_rep_address = invoice.get('supplier', {}).get('address') or {}
        if tax_rep_address:
            _append_postal_address(tax_rep, cbc, tax_rep_address)
        if profile_details.get('refundBankIban'):
            financial_account = ET.SubElement(tax_rep, f"{{{NS['cac']}}}FinancialAccount")
            cbc('ID', profile_details.get('refundBankIban'), parent=financial_account)

    # Delivery (for IHRACAT / export invoices)
    export_details = invoice.get('export_details') or invoice.get('exportDetails') or {}
    if export_details or resolved_type_code in ('IHRACAT', 'IHRACKAYITLI'):
        delivery = ET.SubElement(invoice_root, f"{{{NS['cac']}}}Delivery")
        delivery_addr = export_details.get('deliveryAddress') if isinstance(export_details, dict) else None
        if not isinstance(delivery_addr, dict):
            delivery_addr = buyer.get('address') if isinstance(buyer, dict) else None
        if not isinstance(delivery_addr, dict):
            delivery_addr = cdata.get('address') if isinstance(cdata, dict) else None
        if delivery_addr:
            _append_postal_address(delivery, cbc, delivery_addr, element_name='DeliveryAddress')
        # DeliveryTerms (INCOTERMS)
        terms_code = export_details.get('deliveryTerms') or export_details.get('incoterm')
        if terms_code:
            dt = ET.SubElement(delivery, f"{{{NS['cac']}}}DeliveryTerms")
            cbc('ID', terms_code, parent=dt, attrs={'schemeID': 'INCOTERMS'})
        # Shipment
        shipment = ET.SubElement(delivery, f"{{{NS['cac']}}}Shipment")
        cbc('ID', '1', parent=shipment)
        # TransportHandlingUnit
        thu = ET.SubElement(shipment, f"{{{NS['cac']}}}TransportHandlingUnit")
        ap = ET.SubElement(thu, f"{{{NS['cac']}}}ActualPackage")
        cbc('ID', '1', parent=ap)
        cbc('PackagingTypeCode', export_details.get('packagingType', 'AF'), parent=ap)
        # ShipmentStage
        transport_mode = export_details.get('transportMode') or export_details.get('transportModeCode')
        if transport_mode:
            ss = ET.SubElement(shipment, f"{{{NS['cac']}}}ShipmentStage")
            cbc('TransportModeCode', transport_mode, parent=ss)
        # GoodsItem (GTİP code)
        gtip = export_details.get('gtipCode') or export_details.get('customsId')
        if gtip:
            gi = ET.SubElement(shipment, f"{{{NS['cac']}}}GoodsItem")
            cbc('RequiredCustomsID', gtip, parent=gi)

    # TaxExemption at document level (for ISTISNA, OZELMATRAH)
    tax_exemption_code = invoice.get('tax_exemption_code') or invoice.get('taxExemptionReasonCode')
    tax_exemption_reason = invoice.get('tax_exemption_reason') or invoice.get('taxExemptionReason')
    # Auto-set exemption code based on invoice type if not explicitly provided
    if not tax_exemption_code:
        if resolved_type_code == 'ISTISNA':
            tax_exemption_code = invoice.get('governmentExemptionReason') or '301'
        elif resolved_type_code == 'OZELMATRAH':
            tax_exemption_code = '806'
            if not tax_exemption_reason:
                tax_exemption_reason = 'Özel matrah'

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
    withholding_total_amount = 0.0
    # accumulate tax subtotals by rate (as percent label)
    tax_breakdown = {}
    withholding_breakdown = {}
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
        if itype_key == 'hks':
            raw_kunye = str(
                ln.get('kunye_no')
                or ln.get('kunyeNo')
                or profile_details.get('hotelRegistrationNo')
                or invoice.get('invoiceNumber')
                or ''
            )
            sanitized_kunye = ''.join(ch for ch in raw_kunye if ch.isalnum())
            kunye_no = sanitized_kunye[:19].ljust(19, '0')
            additional_item_id = ET.SubElement(item, f"{{{NS['cac']}}}AdditionalItemIdentification")
            cbc('ID', kunye_no, parent=additional_item_id, attrs={'schemeID': 'KUNYENO'})

        if export_details or resolved_type_code in ('IHRACAT', 'IHRACKAYITLI'):
            line_delivery = ET.SubElement(il, f"{{{NS['cac']}}}Delivery")
            line_delivery_addr = export_details.get('deliveryAddress') if isinstance(export_details, dict) else None
            if not isinstance(line_delivery_addr, dict):
                line_delivery_addr = buyer.get('address') if isinstance(buyer, dict) else None
            if not isinstance(line_delivery_addr, dict):
                line_delivery_addr = cdata.get('address') if isinstance(cdata, dict) else None
            if line_delivery_addr:
                _append_postal_address(line_delivery, cbc, line_delivery_addr, element_name='DeliveryAddress')
            line_shipment = ET.SubElement(line_delivery, f"{{{NS['cac']}}}Shipment")
            cbc('ID', str(i), parent=line_shipment)
            line_gtip = None
            if isinstance(export_details, dict):
                line_gtip = export_details.get('gtipCode') or export_details.get('customsId')
            line_gtip = line_gtip or ln.get('gtipCode') or ln.get('gtip_code')
            if line_gtip:
                line_goods_item = ET.SubElement(line_shipment, f"{{{NS['cac']}}}GoodsItem")
                cbc('RequiredCustomsID', line_gtip, parent=line_goods_item)

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
        # include tax exemption fields if present (per-line or document-level)
        line_exemption_code = ln.get('tax_exemption_code') or tax_exemption_code
        line_exemption_reason = ln.get('tax_exemption_reason') or tax_exemption_reason
        if line_exemption_code:
            try:
                cbc('TaxExemptionReasonCode', str(line_exemption_code), parent=tax_cat)
            except Exception:
                pass
        if line_exemption_reason:
            try:
                cbc('TaxExemptionReason', str(line_exemption_reason), parent=tax_cat)
            except Exception:
                pass
        tax_scheme = ET.SubElement(tax_cat, f"{{{NS['cac']}}}TaxScheme")
        default_tax_name = 'GERCEK USULDE KDV' if resolved_type_code == 'TEVKIFAT' else ('OTV' if itype_key == 'otv' else 'KDV')
        cbc('Name', invoice.get('tax_name', default_tax_name), parent=tax_scheme)
        # TaxTypeCode (optional)
        ttype = ln.get('tax_type_code') or invoice.get('tax_type_code')
        if not ttype and resolved_type_code == 'TEVKIFAT' and float(ln.get('tax_rate') or 0) > 0:
            ttype = '0015'
        if not ttype and itype_key == 'otv':
            ttype = '9021'
        if ttype:
            try:
                cbc('TaxTypeCode', str(ttype), parent=tax_scheme)
            except Exception:
                pass
                
        # Withholding Tax (Tevkifat) per line
        if ln.get('withholding_rate') or ln.get('withholdingRate'):
            withholding_meta = resolve_withholding(
                ln.get('withholding_code') or ln.get('withholdingCode'),
                ln.get('withholding_rate') or ln.get('withholdingRate'),
            )
            w_rate = withholding_meta['rate']
            w_amount = tamount * (w_rate / 100.0)
            w_code = withholding_meta['code']
            
            w_tax = ET.SubElement(il, f"{{{NS['cac']}}}WithholdingTaxTotal")
            cbc('TaxAmount', fmt_amount(w_amount), parent=w_tax, attrs={'currencyID': currency})
            w_sub = ET.SubElement(w_tax, f"{{{NS['cac']}}}TaxSubtotal")
            cbc('TaxableAmount', fmt_amount(tamount), parent=w_sub, attrs={'currencyID': currency})
            cbc('TaxAmount', fmt_amount(w_amount), parent=w_sub, attrs={'currencyID': currency})
            cbc('CalculationSequenceNumeric', str(i), parent=w_sub)
            cbc('Percent', fmt_amount(w_rate), parent=w_sub)
            w_cat = ET.SubElement(w_sub, f"{{{NS['cac']}}}TaxCategory")
            w_ts = ET.SubElement(w_cat, f"{{{NS['cac']}}}TaxScheme")
            cbc('Name', withholding_meta['name'], parent=w_ts)
            cbc('TaxTypeCode', w_code, parent=w_ts)
            withholding_key = (w_code, fmt_amount(w_rate))
            withholding_breakdown.setdefault(withholding_key, {
                'code': w_code,
                'name': withholding_meta['name'],
                'rate': w_rate,
                'taxable': 0.0,
                'tax': 0.0,
            })
            withholding_breakdown[withholding_key]['taxable'] += tamount
            withholding_breakdown[withholding_key]['tax'] += w_amount
            withholding_total_amount += w_amount

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
        # Document-level TaxExemption (ISTISNA, OZELMATRAH)
        if tax_exemption_code:
            try:
                cbc('TaxExemptionReasonCode', str(tax_exemption_code), parent=tax_category)
            except Exception:
                pass
        if tax_exemption_reason:
            try:
                cbc('TaxExemptionReason', str(tax_exemption_reason), parent=tax_category)
            except Exception:
                pass
        tax_scheme = ET.SubElement(tax_category, f"{{{NS['cac']}}}TaxScheme")
        default_tax_name = 'GERCEK USULDE KDV' if resolved_type_code == 'TEVKIFAT' else ('OTV' if itype_key == 'otv' else 'KDV')
        cbc('Name', invoice.get('tax_name', default_tax_name), parent=tax_scheme)
        # include TaxTypeCode at subtotal level if provided
        invoice_tax_type_code = invoice.get('tax_type_code')
        if not invoice_tax_type_code and resolved_type_code == 'TEVKIFAT' and (vals.get('rate') or 0.0) > 0:
            invoice_tax_type_code = '0015'
        if not invoice_tax_type_code and itype_key == 'otv':
            invoice_tax_type_code = '9021'
        if invoice_tax_type_code:
            try:
                cbc('TaxTypeCode', str(invoice_tax_type_code), parent=tax_scheme)
            except Exception:
                pass

    if withholding_breakdown:
        withholding_total = ET.SubElement(invoice_root, f"{{{NS['cac']}}}WithholdingTaxTotal")
        cbc('TaxAmount', fmt_amount(withholding_total_amount), parent=withholding_total, attrs={'currencyID': currency})
        for vals in withholding_breakdown.values():
            withholding_sub = ET.SubElement(withholding_total, f"{{{NS['cac']}}}TaxSubtotal")
            cbc('TaxableAmount', fmt_amount(vals['taxable']), parent=withholding_sub, attrs={'currencyID': currency})
            cbc('TaxAmount', fmt_amount(vals['tax']), parent=withholding_sub, attrs={'currencyID': currency})
            cbc('CalculationSequenceNumeric', '1', parent=withholding_sub)
            cbc('Percent', fmt_amount(vals['rate']), parent=withholding_sub)
            withholding_cat = ET.SubElement(withholding_sub, f"{{{NS['cac']}}}TaxCategory")
            withholding_scheme = ET.SubElement(withholding_cat, f"{{{NS['cac']}}}TaxScheme")
            cbc('Name', vals.get('name') or 'KDV_TEVKIFAT', parent=withholding_scheme)
            cbc('TaxTypeCode', vals['code'], parent=withholding_scheme)

    # LegalMonetaryTotal
    legal = ET.SubElement(invoice_root, f"{{{NS['cac']}}}LegalMonetaryTotal")
    cbc('LineExtensionAmount', fmt_amount(line_extension_total), parent=legal, attrs={'currencyID': currency})
    cbc('TaxExclusiveAmount', fmt_amount(line_extension_total), parent=legal, attrs={'currencyID': currency})
    cbc('TaxInclusiveAmount', fmt_amount(line_extension_total + tax_total_amount), parent=legal, attrs={'currencyID': currency})
    cbc('PayableAmount', fmt_amount(line_extension_total + tax_total_amount - withholding_total_amount), parent=legal, attrs={'currencyID': currency})

    xml_bytes = prettify(invoice_root)
    with open(output_path, 'wb') as f:
        f.write(xml_bytes)
    return output_path


def generate_despatch_advice_xml(invoice: dict, output_path: str) -> str:
    despatch_uuid = escape(str(invoice.get('uuid') or uuid.uuid4()))
    despatch_number = escape(str(invoice.get('invoiceNumber') or invoice.get('despatchNumber') or f"IRS{datetime.now().strftime('%Y')}{str(uuid.uuid4().int % 10**9).zfill(9)}"))
    issue_date = escape(str(invoice.get('createdAt') or datetime.now().strftime('%Y-%m-%d'))[:10])
    issue_time = escape(str(invoice.get('issueTime') or datetime.now().strftime('%H:%M:%S')))
    profile_id = escape(str(invoice.get('profileId') or 'TEMELIRSALIYE'))
    despatch_type = escape(str(invoice.get('invoiceTypeCode') or invoice.get('invoiceType') or 'SEVK').upper())

    supplier = invoice.get('supplier') or {}
    customer = invoice.get('customer') or {}
    supplier_address = supplier.get('address') if isinstance(supplier.get('address'), dict) else {}
    customer_address = customer.get('address') if isinstance(customer.get('address'), dict) else {}
    lines = invoice.get('lines') or []
    if not lines:
        lines = [{
            'description': invoice.get('invoiceNumber') or 'Sevk Kalemi',
            'quantity': 1,
            'unit': 'ADET',
        }]

    def party_block(party: dict, role_tag: str) -> str:
        party_name = escape(str(party.get('name') or ''))
        tax_id = escape(str(party.get('tax_id') or party.get('taxNumber') or party.get('vkn') or ''))
        scheme = 'TCKN' if len(tax_id) == 11 else 'VKN'
        address = party.get('address') if isinstance(party.get('address'), dict) else {}
        street = escape(str(address.get('street') or ''))
        district = escape(str(address.get('district') or address.get('citySubdivisionName') or ''))
        city = escape(str(address.get('city') or ''))
        postal_zone = escape(str(address.get('postalZone') or ''))
        country = escape(str(address.get('country') or 'TÜRKİYE'))

        return f"""
  <cac:{role_tag}>
    <cac:Party>
      <cac:PartyName><cbc:Name>{party_name}</cbc:Name></cac:PartyName>
      {f'<cac:PartyIdentification><cbc:ID schemeID="{scheme}">{tax_id}</cbc:ID></cac:PartyIdentification>' if tax_id else ''}
      <cac:PostalAddress>
        {f'<cbc:StreetName>{street}</cbc:StreetName>' if street else ''}
        {f'<cbc:CitySubdivisionName>{district}</cbc:CitySubdivisionName>' if district else ''}
        {f'<cbc:CityName>{city}</cbc:CityName>' if city else ''}
        {f'<cbc:PostalZone>{postal_zone}</cbc:PostalZone>' if postal_zone else ''}
        <cac:Country>
          <cbc:IdentificationCode>TR</cbc:IdentificationCode>
          <cbc:Name>{country}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:{role_tag}>"""

    line_blocks: list[str] = []
    for index, line in enumerate(lines, start=1):
        quantity = escape(str(line.get('quantity') or 1))
        unit = escape(map_unit_code(str(line.get('unit') or line.get('unitCode') or 'ADET')))
        description = escape(str(line.get('description') or line.get('name') or f'Sevk Kalemi {index}'))
        line_blocks.append(f"""
  <cac:DespatchLine>
    <cbc:ID>{index}</cbc:ID>
    <cbc:DeliveredQuantity unitCode="{unit}">{quantity}</cbc:DeliveredQuantity>
    <cac:OrderLineReference>
      <cbc:LineID>{index}</cbc:LineID>
    </cac:OrderLineReference>
    <cac:Item>
      <cbc:Name>{description}</cbc:Name>
    </cac:Item>
  </cac:DespatchLine>""")

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>{profile_id}</cbc:ProfileID>
  <cbc:ID>{despatch_number}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>{despatch_uuid}</cbc:UUID>
  <cbc:IssueDate>{issue_date}</cbc:IssueDate>
  <cbc:IssueTime>{issue_time}</cbc:IssueTime>
  <cbc:ActualDespatchDate>{issue_date}</cbc:ActualDespatchDate>
  <cbc:DespatchAdviceTypeCode>{despatch_type}</cbc:DespatchAdviceTypeCode>
  <cbc:LineCountNumeric>{len(lines)}</cbc:LineCountNumeric>
  <cac:AdditionalDocumentReference>
    <cbc:ID>{despatch_uuid}</cbc:ID>
    <cbc:IssueDate>{issue_date}</cbc:IssueDate>
    <cbc:DocumentTypeCode>CUST_INV_ID</cbc:DocumentTypeCode>
  </cac:AdditionalDocumentReference>
{party_block(supplier, 'DespatchSupplierParty')}
{party_block(customer, 'DeliveryCustomerParty')}
  <cac:Shipment>
    <cbc:ID>1</cbc:ID>
    <cac:Delivery>
      <cac:Despatch>
        <cbc:ActualDespatchDate>{issue_date}</cbc:ActualDespatchDate>
        <cbc:ActualDespatchTime>{issue_time}</cbc:ActualDespatchTime>
      </cac:Despatch>
      <cac:DeliveryAddress>
        {f'<cbc:StreetName>{escape(str(customer_address.get("street") or ""))}</cbc:StreetName>' if customer_address.get('street') else ''}
        <cbc:CitySubdivisionName>{escape(str(customer_address.get('district') or customer_address.get('citySubdivisionName') or 'MERKEZ'))}</cbc:CitySubdivisionName>
        <cbc:CityName>{escape(str(customer_address.get('city') or ''))}</cbc:CityName>
        {f'<cbc:PostalZone>{escape(str(customer_address.get("postalZone") or ""))}</cbc:PostalZone>' if customer_address.get('postalZone') else ''}
        <cac:Country>
          <cbc:IdentificationCode>TR</cbc:IdentificationCode>
          <cbc:Name>{escape(str(customer_address.get('country') or 'TÜRKİYE'))}</cbc:Name>
        </cac:Country>
      </cac:DeliveryAddress>
      <cac:CarrierParty>
        <cac:PartyName>
          <cbc:Name>{escape(str(supplier.get('name') or ''))}</cbc:Name>
        </cac:PartyName>
        {f'<cac:PartyIdentification><cbc:ID schemeID="{"TCKN" if len(str(supplier.get("tax_id") or supplier.get("taxNumber") or supplier.get("vkn") or "")) == 11 else "VKN"}">{escape(str(supplier.get("tax_id") or supplier.get("taxNumber") or supplier.get("vkn") or ""))}</cbc:ID></cac:PartyIdentification>' if (supplier.get('tax_id') or supplier.get('taxNumber') or supplier.get('vkn')) else ''}
        <cac:PostalAddress>
          {f'<cbc:StreetName>{escape(str(supplier_address.get("street") or ""))}</cbc:StreetName>' if supplier_address.get('street') else ''}
          <cbc:CitySubdivisionName>{escape(str(supplier_address.get('district') or supplier_address.get('citySubdivisionName') or 'MERKEZ'))}</cbc:CitySubdivisionName>
          <cbc:CityName>{escape(str(supplier_address.get('city') or ''))}</cbc:CityName>
          {f'<cbc:PostalZone>{escape(str(supplier_address.get("postalZone") or ""))}</cbc:PostalZone>' if supplier_address.get('postalZone') else ''}
          <cac:Country>
            <cbc:IdentificationCode>TR</cbc:IdentificationCode>
            <cbc:Name>{escape(str(supplier_address.get('country') or 'TÜRKİYE'))}</cbc:Name>
          </cac:Country>
        </cac:PostalAddress>
      </cac:CarrierParty>
    </cac:Delivery>
    <cac:ShipmentStage>
      <cbc:ActualDespatchDate>{issue_date}</cbc:ActualDespatchDate>
      <cbc:ActualDespatchTime>{issue_time}</cbc:ActualDespatchTime>
    </cac:ShipmentStage>
  </cac:Shipment>
{''.join(line_blocks)}
</DespatchAdvice>
"""

    with open(output_path, 'w', encoding='utf-8') as handle:
        handle.write(xml_content)
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

        if root.tag.endswith('DespatchAdvice'):
            if root.find('.//{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}DespatchLine') is None:
                missing.append('cac:DespatchLine')
            if root.find('.//{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}DespatchSupplierParty') is None:
                missing.append('cac:DespatchSupplierParty')
            if root.find('.//{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}DeliveryCustomerParty') is None:
                missing.append('cac:DeliveryCustomerParty')
            return len(missing) == 0, missing

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
    supplier_tax_id = (
        supplier.get('vkn')
        or supplier.get('tax_id')
        or supplier.get('taxNumber')
        or supplier.get('tax_number')
        or ''
    )
    
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
<cbc:AccountingCost>{invoice_data.get('accounting_cost', 'SAGLIK_OPT')}</cbc:AccountingCost>
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
<cbc:ID schemeID="VKN">{supplier_tax_id}</cbc:ID>
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
