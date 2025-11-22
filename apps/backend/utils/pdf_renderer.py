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
      - invoice_data['invoice_type'] if present (values: 'sgk', 'iade', 'kargo', 'sale')
      - invoice_data['document_title'] heuristics
      - fallback to 'sale.html'
    """
    t = invoice_data.get('invoice_type') or invoice_data.get('type') or ''
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


def render_invoice_to_pdf(invoice_data: dict, template_name: str = None) -> bytes:
    """
    Render invoice dict to PDF bytes using Jinja2 template selected by data or explicit template_name.
    """
    if template_name is None:
        template_name = _choose_template(invoice_data or {})

    template = env.get_template(template_name)
    html = template.render(invoice=invoice_data)

    if HTML is None:
        raise RuntimeError('WeasyPrint is not available. Install it with `pip install weasyprint` and system deps.')

    # base_url ensures relative asset paths (like logos) are resolved correctly
    base_url = os.path.join(BASE_DIR, '')
    pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
    return pdf_bytes
