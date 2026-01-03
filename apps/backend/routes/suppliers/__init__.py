"""
Suppliers Module - Package Initialization
------------------------------------------
This module provides supplier management endpoints with unified access control.

Structure:
    - __init__.py: Blueprint definition and route imports
    - read.py: GET endpoints (list, search, detail, stats)
    - write.py: POST/PUT/DELETE endpoints (CRUD operations)
    - products.py: Product-supplier relationship management
    - suggested.py: Suggested supplier operations
"""

from flask import Blueprint

# Define the blueprint with url_prefix
suppliers_bp = Blueprint('suppliers', __name__, url_prefix='/api')

# Import routes to register them with the blueprint
from . import read
from . import write
from . import products
from . import suggested
