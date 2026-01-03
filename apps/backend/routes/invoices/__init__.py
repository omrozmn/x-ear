"""
Invoices Module - Package Initialization
----------------------------------------
This module provides invoice and proforma management endpoints with unified access control.

Structure:
    - __init__.py: Blueprint definitions and route imports
    - read.py: GET endpoints (list, detail, patient invoices)
    - write.py: POST/PUT/DELETE endpoints (CRUD operations)
    - bulk.py: Bulk operations (batch generate, bulk upload)
    - templates.py: Invoice template management
    - print_queue.py: Print queue operations
    - sales.py: Sale-invoice integration endpoints
"""

from flask import Blueprint

# Define the blueprints
invoices_bp = Blueprint('invoices', __name__, url_prefix='/api')
proformas_bp = Blueprint('proformas', __name__, url_prefix='/api')

# Import routes to register them with the blueprint
from . import read
from . import write
from . import bulk
from . import templates
from . import print_queue
from . import sales
