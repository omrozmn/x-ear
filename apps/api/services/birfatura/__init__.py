"""Birfatura service package"""

from .service import BirfaturaClient
from .mappers import invoice_to_basic_model, invoice_xml_to_base64

# Backwards-compatible alias: some modules expect `invoice_to_ubl_base64`
# while the mapper implements `invoice_xml_to_base64`. Expose the old
# name to avoid import errors during startup.
invoice_to_ubl_base64 = invoice_xml_to_base64

__all__ = [
    'BirfaturaClient',
    'invoice_to_basic_model',
    'invoice_to_ubl_base64',
]
