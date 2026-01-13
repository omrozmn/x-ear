import os
import xml.etree.ElementTree as ET
from xml.dom import minidom


def dict_to_xml(tag, d):
    elem = ET.Element(tag)
    for key, val in d.items():
        child = ET.SubElement(elem, str(key))
        if val is None:
            child.text = ''
        elif isinstance(val, (dict, list)):
            # For nested dicts/lists, stringify as JSON-like text
            try:
                import json
                child.text = json.dumps(val, ensure_ascii=False)
            except Exception:
                child.text = str(val)
        else:
            child.text = str(val)
    return elem


def prettify_xml(elem: ET.Element) -> bytes:
    rough = ET.tostring(elem, encoding='utf-8')
    reparsed = minidom.parseString(rough)
    return reparsed.toprettyxml(encoding='utf-8')


def save_invoice_xml(invoice_obj, invoice_dict=None, base_instance_dir=None):
    """
    Save an invoice's dict representation as XML under instance/invoice_xml.

    File names tried (first existing or created):
      - {invoice_number}_{id}.xml
      - {invoice_number}.xml
      - {id}.xml

    Returns the path written.
    """
    if invoice_dict is None:
        if hasattr(invoice_obj, 'to_dict'):
            invoice_dict = invoice_obj.to_dict()
        else:
            invoice_dict = {}

    if base_instance_dir is None:
        base_instance_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))

    os.makedirs(base_instance_dir, exist_ok=True)

    candidates = []
    inv_num = getattr(invoice_obj, 'invoice_number', None)
    inv_id = getattr(invoice_obj, 'id', None)
    if inv_num:
        candidates.append(f"{inv_num}_{inv_id}.xml")
        candidates.append(f"{inv_num}.xml")
    candidates.append(f"{inv_id}.xml")

    # Choose the first candidate filename (we always create/overwrite)
    chosen = candidates[0]
    path = os.path.join(base_instance_dir, chosen)

    root = dict_to_xml('Invoice', invoice_dict)
    xml_bytes = prettify_xml(root)

    with open(path, 'wb') as f:
        f.write(xml_bytes)

    return path
