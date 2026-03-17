import os
import sys
from jinja2 import Environment, FileSystemLoader, select_autoescape

# MacOS Homebrew Fix: Ensure Pango/Cairo are found
if sys.platform == 'darwin':
    import subprocess as _subprocess
    try:
        _brew_prefix = _subprocess.check_output(['brew', '--prefix'], text=True).strip()
    except Exception:
        _brew_prefix = '/opt/homebrew'
    paths = [
        os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', ''),
        os.path.join(_brew_prefix, 'lib'),
        '/opt/homebrew/lib',
        '/usr/local/lib',
        os.path.join(os.environ.get('HOME', ''), 'lib')
    ]
    os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = ':'.join(filter(None, paths))

try:
    from weasyprint import HTML
    import logging as _pdf_logging
    _pdf_logging.getLogger(__name__).info("WeasyPrint loaded successfully")
except Exception as _wp_err:
    HTML = None
    import logging as _pdf_logging
    _pdf_logging.getLogger(__name__).warning("WeasyPrint import failed: %s", _wp_err)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates', 'invoices')

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(['html', 'xml']),
)

def _choose_template(invoice_data: dict) -> str:
    """Choose a template file name based on invoice_data contents.

    Priority:
      - invoice_data['invoice_type'] or invoice_data['invoiceTypeCode'] if present
      - invoice_data['document_title'] heuristics
      - fallback to 'sale.html'
    """
    t = invoice_data.get('invoice_type') or invoice_data.get('invoiceTypeCode') or invoice_data.get('invoiceType') or invoice_data.get('type') or ''
    if isinstance(t, str):
        t = t.lower()
        if 'sgk' in t:
            return 'sgk.html'
        if 'iade' in t or 'return' in t:
            return 'iade.html'
        if 'kargo' in t or 'shipping' in t:
            return 'kargo.html'
        if 'mustahsilmakbuz' in t or 'müstahsil' in t:
            return 'emm.html'
        if 'serbestmeslekmakbuz' in t or 'serbest' in t:
            return 'esmm.html'
        if 'irsaliye' in t or 'eirsaliye' in t:
            return 'eirsaliye.html'

    # Check document_type / profileId for e-İrsaliye, EMM, ESMM
    doc_type = (invoice_data.get('document_type') or invoice_data.get('documentType') or '').upper()
    profile = (invoice_data.get('profile_id') or invoice_data.get('profileId') or '').upper()
    if doc_type == 'EIRSALIYE' or profile == 'TEMELIRSALIYE':
        return 'eirsaliye.html'
    if doc_type == 'EMM':
        return 'emm.html'
    if doc_type == 'ESMM':
        return 'esmm.html'

    title = (invoice_data.get('document_title') or invoice_data.get('invoiceTitle') or '')
    if isinstance(title, str):
        tl = title.lower()
        if 'sgk' in tl:
            return 'sgk.html'
        if 'iade' in tl or 'return' in tl:
            return 'iade.html'
        if 'kargo' in tl or 'shipping' in tl:
            return 'kargo.html'
        if 'irsaliye' in tl or 'İrsaliye' in title:
            return 'eirsaliye.html'
        if 'müstahsil' in tl:
            return 'emm.html'
        if 'serbest meslek' in tl:
            return 'esmm.html'

    return 'sale.html'


def _enrich_invoice_with_tenant_assets(invoice_data: dict, tenant_id: str = None) -> dict:
    """
    Enrich invoice data with tenant's logo, stamp, and signature URLs.
    Also normalizes camelCase fields to snake_case for templates,
    resolves GIB logo and generates QR code.
    """
    # Normalize camelCase -> snake_case for template compatibility
    _field_map = {
        'invoiceNumber': 'invoice_id',
        'issueDate': 'issue_date',
        'issueTime': 'issue_time',
        'invoiceType': 'invoice_type',
        'invoiceTypeCode': 'invoice_type_code',
        'profileId': 'profile_id',
        'systemType': 'system_type',
        'exchangeRate': 'exchange_rate',
        'taxAmount': 'tax_total',
        'totalAmount': 'payable_amount',
        'buyer_customer': 'customer',
    }
    for camel, snake in _field_map.items():
        if camel in invoice_data and snake not in invoice_data:
            invoice_data[snake] = invoice_data[camel]

    # Always set GIB logo path
    gib_logo = os.path.join(TEMPLATES_DIR, 'assets', 'gib_logo.png')
    if os.path.exists(gib_logo):
        invoice_data['gib_logo_path'] = gib_logo

    # Generate QR code from invoice number
    invoice_id = invoice_data.get('invoice_id') or invoice_data.get('invoice_number') or ''
    if invoice_id:
        invoice_data['qr_code_data_uri'] = _generate_qr_data_uri(invoice_id)

    if not tenant_id:
        return invoice_data
    
    try:
        from core.models.tenant import Tenant
        from core.database import SessionLocal
        
        session = SessionLocal()
        try:
            tenant = session.get(Tenant, tenant_id)
            if not tenant:
                return invoice_data

            company_info = tenant.company_info or {}
            settings = tenant.settings or {}
            company_settings = settings.get('company') or {}
            invoice_settings = settings.get('invoice_integration') or {}
            
            # Ensure supplier dict exists
            if 'supplier' not in invoice_data or not invoice_data['supplier']:
                invoice_data['supplier'] = {}
            
            supplier = invoice_data['supplier']
            
            # Resolve asset file paths from storage/company_assets/<tenant_id>/
            supplier['logo'] = supplier.get('logo') or _get_full_asset_path(company_info.get('logoUrl'), tenant_id)
            supplier['stamp'] = supplier.get('stamp') or _get_full_asset_path(company_info.get('stampUrl'), tenant_id)
            supplier['signature'] = supplier.get('signature') or _get_full_asset_path(company_info.get('signatureUrl'), tenant_id)
            
            # Also try to find assets by convention if URLs not in company_info
            if not supplier['logo']:
                supplier['logo'] = _find_asset_file(tenant_id, 'logo')
            if not supplier['stamp']:
                supplier['stamp'] = _find_asset_file(tenant_id, 'stamp')
            if not supplier['signature']:
                supplier['signature'] = _find_asset_file(tenant_id, 'signature')
            
            # Fill in supplier details from company_info / settings if missing
            if not supplier.get('name'):
                supplier['name'] = (
                    company_info.get('companyName') or company_info.get('name')
                    or company_info.get('legalName') or company_settings.get('name')
                    or tenant.name or ''
                )
            if not supplier.get('tax_id'):
                supplier['tax_id'] = (
                    invoice_settings.get('vkn') or invoice_settings.get('tckn')
                    or company_info.get('taxNumber') or company_info.get('taxId')
                    or company_info.get('vkn') or company_info.get('tckn') or ''
                )
            if not supplier.get('tax_office'):
                supplier['tax_office'] = (
                    invoice_settings.get('tax_office')
                    or company_info.get('taxOffice')
                    or company_settings.get('taxOffice') or ''
                )
            if not supplier.get('address'):
                addr = company_info.get('address') or company_settings.get('address') or ''
                parts = [addr]
                if company_info.get('district') or company_settings.get('district'):
                    parts.append(company_info.get('district') or company_settings.get('district'))
                if company_info.get('city') or company_settings.get('city'):
                    parts.append(company_info.get('city') or company_settings.get('city'))
                supplier['address'] = ', '.join(filter(None, parts))
            if not supplier.get('phone'):
                supplier['phone'] = company_info.get('phone') or company_settings.get('phone') or ''
            if not supplier.get('email'):
                supplier['email'] = (
                    company_info.get('email') or getattr(tenant, 'billing_email', '')
                    or getattr(tenant, 'owner_email', '') or ''
                )
        finally:
            session.close()
                
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Could not enrich invoice with tenant assets: {e}")
    
    return invoice_data


def _get_full_asset_path(url: str, tenant_id: str = None) -> str:
    """
    Convert API URL to full file path for WeasyPrint.
    /api/tenant/company/assets/<filename> -> /path/to/storage/company_assets/<tenant_id>/<filename>
    """
    if not url:
        return None
    
    # If it's already a file path that exists, return as-is
    if os.path.isabs(url) and os.path.exists(url):
        return url
    
    # Convert API URL to file path
    # URL format: /api/tenant/company/assets/<filename>
    if '/api/tenant/company/assets/' in url and tenant_id:
        try:
            filename = url.split('/api/tenant/company/assets/')[1]
            file_path = os.path.join(BASE_DIR, 'storage', 'company_assets', tenant_id, filename)
            if os.path.exists(file_path):
                return file_path
        except Exception:
            pass
    
    return None


def _find_asset_file(tenant_id: str, asset_type: str) -> str | None:
    """
    Find asset file by convention: storage/company_assets/<tenant_id>/<asset_type>.*
    """
    assets_dir = os.path.join(BASE_DIR, 'storage', 'company_assets', tenant_id)
    if not os.path.isdir(assets_dir):
        return None
    for ext in ('.png', '.jpg', '.jpeg', '.gif', '.svg'):
        path = os.path.join(assets_dir, f"{asset_type}{ext}")
        if os.path.exists(path):
            return path
    return None


def _generate_qr_data_uri(text: str) -> str:
    """
    Generate a QR code image as a base64 data URI.
    """
    try:
        import qrcode
        import io
        import base64
        qr = qrcode.QRCode(version=1, box_size=4, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode('ascii')
        return f"data:image/png;base64,{b64}"
    except Exception:
        return ""


def render_invoice_to_pdf(invoice_data: dict, template_name: str = None, tenant_id: str = None) -> bytes:
    """
    Render invoice dict to PDF bytes using Jinja2 template selected by data or explicit template_name.
    
    Args:
        invoice_data: Dictionary containing invoice data
        template_name: Optional explicit template name (e.g., 'sgk.html')
        tenant_id: Optional tenant ID to fetch logo/stamp/signature from tenant settings
    
    Returns:
        PDF as bytes
    """
    if template_name is None:
        template_name = _choose_template(invoice_data or {})

    # Enrich with tenant assets (logo, stamp, signature)
    invoice_data = _enrich_invoice_with_tenant_assets(invoice_data, tenant_id)

    template = env.get_template(template_name)
    html = template.render(invoice=invoice_data)

    if HTML is None:
        raise RuntimeError('WeasyPrint is not available. Install it with `pip install weasyprint` and system deps.')

    # base_url ensures relative asset paths (like logos) are resolved correctly
    base_url = os.path.join(BASE_DIR, '')
    pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
    return pdf_bytes
