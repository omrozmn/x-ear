"""
Sales Helper Utilities - Input Validation

Provides input validation functions for sales operations.
"""
from flask import jsonify
from models.base import db
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

# Error constants
ERROR_NO_DATA_PROVIDED = "No data provided"
ERROR_SALE_NOT_FOUND = "Sale not found"
ERROR_PATIENT_NOT_FOUND = "Patient not found"


def validate_assignment_input(data):
    """Validate input data for device assignment."""
    if not data:
        return None, jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

    device_assignments = data.get('device_assignments', [])
    if not device_assignments:
        return None, jsonify({"success": False, "error": "At least one device assignment required"}), 400

    return data, None, None


def validate_product_sale_input(data):
    """Validate input data for product sale."""
    if not data:
        return None, jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

    product_id = data.get('product_id')
    if not product_id:
        return None, jsonify({"success": False, "error": "Product ID required"}), 400

    return data, None, None


def validate_product_availability(product):
    """Validate product availability."""
    if not product:
        return jsonify({"success": False, "error": "Product not found"}), 404

    if product.available_inventory <= 0:
        return jsonify({"success": False, "error": "Product out of stock"}), 400

    return None, None


def validate_status_value(status):
    """Validate sale status value."""
    valid_statuses = ['pending', 'completed', 'cancelled', 'returned', 'partial']
    if status and status not in valid_statuses:
        return False
    return True


def load_product_from_inventory(product_id):
    """Load product from inventory with ORM fallback to raw SQL."""
    product = None
    try:
        from models.inventory import InventoryItem
        product = db.session.get(InventoryItem, product_id)
    except Exception as orm_err:
        logger.warning('ORM Inventory lookup failed, falling back to raw SQL: %s', orm_err)
        try:
            row = db.session.execute(
                text('SELECT id, available_inventory, price, name, tenant_id, brand, model FROM inventory WHERE id = :id'), 
                {'id': product_id}
            ).fetchone()
            if row:
                class _P:
                    pass
                p = _P()
                p.id = row[0]
                p.available_inventory = row[1]
                p.price = row[2]
                p.name = row[3]
                p.tenant_id = row[4]
                p.brand = row[5]
                p.model = row[6]
                product = p
        except Exception as sql_err:
            logger.error('Raw SQL inventory lookup failed: %s', sql_err)

    return product
