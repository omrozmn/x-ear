import os
from jinja2 import Environment, FileSystemLoader, select_autoescape

try:
    from weasyprint import HTML
except Exception:
    HTML = None

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
    t = invoice_data.get('invoice_type') or invoice_data.get('invoiceTypeCode') or invoice_data.get('type') or ''
    if isinstance(t, str):
        t = t.lower()
        if 'sgk' in t:
            return 'sgk.html'
        if 'iade' in t or 'return' in t:
            return 'iade.html'
        if 'kargo' in t or 'shipping' in t:
            return 'kargo.html'

    title = (invoice_data.get('document_title') or invoice_data.get('invoiceTitle') or '')
    if isinstance(title, str):
        tl = title.lower()
        if 'sgk' in tl:
            return 'sgk.html'
        if 'iade' in tl or 'return' in tl:
            return 'iade.html'
        if 'kargo' in tl or 'shipping' in tl:
            return 'kargo.html'

    return 'sale.html'


def _enrich_invoice_with_tenant_assets(invoice_data: dict, tenant_id: str = None) -> dict:
    """
    Enrich invoice data with tenant's logo, stamp, and signature URLs.
    This function fetches the tenant's company_info and adds asset URLs to supplier.
    """
    if not tenant_id:
        return invoice_data
    
    try:
        from models.tenant import Tenant
        from models.base import db
        
        tenant = db.session.get(Tenant, tenant_id)
        if tenant and tenant.company_info:
            company_info = tenant.company_info
            
            # Ensure supplier dict exists
            if 'supplier' not in invoice_data or not invoice_data['supplier']:
                invoice_data['supplier'] = {}
            
            # Add tenant assets to supplier if not already set
            supplier = invoice_data['supplier']
            
            # Logo
            if company_info.get('logoUrl') and not supplier.get('logo'):
                supplier['logo'] = _get_full_asset_path(company_info['logoUrl'])
            
            # Stamp
            if company_info.get('stampUrl') and not supplier.get('stamp'):
                supplier['stamp'] = _get_full_asset_path(company_info['stampUrl'])
            
            # Signature
            if company_info.get('signatureUrl') and not supplier.get('signature'):
                supplier['signature'] = _get_full_asset_path(company_info['signatureUrl'])
            
            # Also fill in supplier details from company_info if missing
            if company_info.get('name') and not supplier.get('name'):
                supplier['name'] = company_info['name']
            if company_info.get('taxId') and not supplier.get('tax_id'):
                supplier['tax_id'] = company_info['taxId']
            if company_info.get('taxOffice') and not supplier.get('tax_office'):
                supplier['tax_office'] = company_info['taxOffice']
            if company_info.get('address') and not supplier.get('address'):
                address_parts = [company_info.get('address', '')]
                if company_info.get('district'):
                    address_parts.append(company_info['district'])
                if company_info.get('city'):
                    address_parts.append(company_info['city'])
                supplier['address'] = ', '.join(filter(None, address_parts))
            if company_info.get('phone') and not supplier.get('phone'):
                supplier['phone'] = company_info['phone']
            if company_info.get('email') and not supplier.get('email'):
                supplier['email'] = company_info['email']
                
    except Exception as e:
        # Log but don't fail - assets are optional
        print(f"Warning: Could not enrich invoice with tenant assets: {e}")
    
    return invoice_data


def _get_full_asset_path(url: str) -> str:
    """
    Convert API URL to full file path for WeasyPrint.
    /api/tenant/assets/<tenant_id>/<filename> -> /path/to/uploads/tenant_assets/<tenant_id>/<filename>
    """
    if not url:
        return url
    
    # If it's already a file path, return as-is
    if url.startswith('/') and not url.startswith('/api/'):
        return url
    
    # Convert API URL to file path
    # URL format: /api/tenant/assets/<tenant_id>/<filename>
    if '/api/tenant/assets/' in url:
        try:
            parts = url.split('/api/tenant/assets/')[1]
            tenant_assets_dir = os.path.join(BASE_DIR, 'instance', 'uploads', 'tenant_assets')
            return os.path.join(tenant_assets_dir, parts)
        except:
            pass
    
    return url


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
