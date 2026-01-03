"""
Sales Module Package

This module provides all sales-related endpoints including:
- Sales CRUD operations
- Payment tracking
- Device assignments
- Pricing calculations

The module is organized into submodules for better maintainability.
Legacy endpoints are imported from sales_monolithic_backup.py.
"""
from flask import Blueprint

# Import endpoint functions from submodules
from .payments import (
    get_sale_payments,
    record_sale_payment,
    pay_installment,
    get_sale_payment_plan,
    create_sale_payment_plan
)
from .pricing import (
    pricing_preview,
    recalc_sales
)
from .read import (
    get_sales,
    get_patient_sales
)

# Import remaining functions from the monolithic backup
from routes.sales_monolithic_backup import (
    # Write operations
    create_sale,
    update_sale,
    update_sale_partial,
    create_sales_log,
    # Device operations
    update_device_assignment,
    assign_devices_extended,
    create_product_sale,
    return_loaner_to_stock,
)

# Create main sales blueprint
sales_bp = Blueprint('sales', __name__)


# ============= REGISTER PAYMENTS ENDPOINTS =============
sales_bp.add_url_rule('/sales/<sale_id>/payments', 'get_sale_payments', get_sale_payments, methods=['GET'])
sales_bp.add_url_rule('/sales/<sale_id>/payments', 'record_sale_payment', record_sale_payment, methods=['POST'])
sales_bp.add_url_rule('/sales/<sale_id>/installments/<installment_id>/pay', 'pay_installment', pay_installment, methods=['POST'])
sales_bp.add_url_rule('/sales/<sale_id>/payment-plan', 'get_sale_payment_plan', get_sale_payment_plan, methods=['GET'])
sales_bp.add_url_rule('/sales/<sale_id>/payment-plan', 'create_sale_payment_plan', create_sale_payment_plan, methods=['POST'])

# ============= REGISTER PRICING ENDPOINTS =============
sales_bp.add_url_rule('/pricing-preview', 'pricing_preview', pricing_preview, methods=['POST'])
sales_bp.add_url_rule('/sales/recalc', 'recalc_sales', recalc_sales, methods=['POST'])

# ============= REGISTER READ ENDPOINTS =============
sales_bp.add_url_rule('/sales', 'get_sales', get_sales, methods=['GET'])
sales_bp.add_url_rule('/patients/<patient_id>/sales', 'get_patient_sales', get_patient_sales, methods=['GET'])

# ============= REGISTER WRITE ENDPOINTS FROM LEGACY =============
sales_bp.add_url_rule('/sales', 'create_sale', create_sale, methods=['POST'])
sales_bp.add_url_rule('/sales/<sale_id>', 'update_sale', update_sale, methods=['PUT', 'PATCH'])
sales_bp.add_url_rule('/patients/<patient_id>/sales/<sale_id>', 'update_sale_partial', update_sale_partial, methods=['PATCH'])
sales_bp.add_url_rule('/sales/logs', 'create_sales_log', create_sales_log, methods=['POST'])

# ============= REGISTER DEVICE ENDPOINTS FROM LEGACY =============
sales_bp.add_url_rule('/device-assignments/<assignment_id>', 'update_device_assignment', update_device_assignment, methods=['PATCH'])
sales_bp.add_url_rule('/patients/<patient_id>/assign-devices-extended', 'assign_devices_extended', assign_devices_extended, methods=['POST'])
sales_bp.add_url_rule('/patients/<patient_id>/product-sales', 'create_product_sale', create_product_sale, methods=['POST'])
sales_bp.add_url_rule('/device-assignments/<assignment_id>/return-loaner', 'return_loaner_to_stock', return_loaner_to_stock, methods=['POST'])

# Export the main blueprint
__all__ = ['sales_bp']
