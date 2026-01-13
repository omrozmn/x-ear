import uuid
from datetime import datetime
import os


def generate_simple_ettn():
    # lightweight ETTN generator for outbox usage
    return f"ETTN-{uuid.uuid4().hex[:12]}"


def generate_uuid():
    return str(uuid.uuid4())


def build_return_invoice_xml(replacement, invoice_meta=None):
    """
    Build a minimal UBL-like return invoice XML using replacement and optional invoice_meta dict.
    This mirrors legacy behaviour: generate an XML artifact for integrator handoff and return
    (file_name, ettn, uuid, xml_content).
    """
    now = datetime.utcnow()
    ettn = generate_simple_ettn()
    uid = generate_uuid()
    inv_id = invoice_meta.get('invoiceNumber') if isinstance(invoice_meta, dict) else (replacement.return_invoice_id or f"retinv-{int(now.timestamp())}")
    file_name = f"{inv_id}_{now.strftime('%Y%m%d')}_{ettn[:8]}.xml"

    # Construct a very small XML containing the key metadata. Integrator expects full UBL XML
    # in production; we replicate a minimal structure for migration and outbox processing.
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">',
        f'  <cbc:ID>{inv_id}</cbc:ID>',
        f'  <cbc:UUID>{uid}</cbc:UUID>',
        f'  <cbc:ETTN>{ettn}</cbc:ETTN>',
        f'  <cbc:IssueDate>{now.date().isoformat()}</cbc:IssueDate>',
        f'  <cbc:Note>Return invoice for replacement {replacement.id}</cbc:Note>',
    ]

    # Optionally include supplier invoice number and simple itemization if provided
    if isinstance(invoice_meta, dict):
        supplier_no = invoice_meta.get('supplierInvoiceNumber') or invoice_meta.get('invoiceNumber')
        if supplier_no:
            xml_lines.append(f'  <cbc:SupplierInvoiceNumber>{supplier_no}</cbc:SupplierInvoiceNumber>')
        items = invoice_meta.get('items') if isinstance(invoice_meta.get('items'), list) else None
        if items:
            xml_lines.append('  <cac:InvoiceLines>')
            for idx, it in enumerate(items, start=1):
                name = it.get('name') or it.get('malHizmet') or it.get('description') or f'item-{idx}'
                qty = it.get('quantity') or it.get('miktar') or 1
                xml_lines.append(f'    <cac:InvoiceLine><cbc:ID>{idx}</cbc:ID><cbc:InvoicedQuantity>{qty}</cbc:InvoicedQuantity><cac:Item><cbc:Name>{name}</cbc:Name></cac:Item></cac:InvoiceLine>')
            xml_lines.append('  </cac:InvoiceLines>')

    xml_lines.append('</Invoice>')
    xml_content = "\n".join(xml_lines)

    return file_name, ettn, uid, xml_content


def write_outbox_file(folder_path, file_name, content):
    os.makedirs(folder_path, exist_ok=True)
    path = os.path.join(folder_path, file_name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return path
