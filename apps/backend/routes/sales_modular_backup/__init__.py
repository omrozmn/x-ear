"""
Sales Module - Unified Access Architecture
-------------------------------------------
Modular structure for sales management endpoints following the
RBAC + ABAC Hybrid Model.

Modules:
- read.py: GET endpoints for sales data retrieval
- write.py: POST/PUT/PATCH endpoints for sale creation/updates
- payments.py: Payment-related operations
- devices.py: Device assignment operations
- pricing.py: Pricing preview and calculations
"""

from flask import Blueprint

sales_bp = Blueprint('sales', __name__)

# Import all modules to register routes
from . import read
from . import write
from . import payments
from . import devices
from . import pricing

__all__ = ['sales_bp']
