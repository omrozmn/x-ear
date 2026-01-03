"""
Sales Helpers Package

Exports all helper functions from submodules.
"""

from .context import (
    now_utc,
    get_tenant_context,
    check_sale_access,
    check_branch_access,
    get_user_branch_ids
)

from .builders import (
    build_installment_data,
    build_payment_plan_data,
    build_device_info,
    create_device_name,
    build_sale_financial_data,
    build_sale_metadata,
    build_sale_data
)

from .validation import (
    ERROR_NO_DATA_PROVIDED,
    ERROR_SALE_NOT_FOUND,
    ERROR_PATIENT_NOT_FOUND,
    validate_assignment_input,
    validate_product_sale_input,
    validate_product_availability,
    validate_status_value,
    load_product_from_inventory
)

from .inventory import (
    update_product_inventory,
    restore_serial_numbers,
    process_inventory_restoration,
    restore_inventory_for_cancelled_sale
)

__all__ = [
    # Context
    'now_utc',
    'get_tenant_context',
    'check_sale_access',
    'check_branch_access',
    'get_user_branch_ids',
    # Builders
    'build_installment_data',
    'build_payment_plan_data',
    'build_device_info',
    'create_device_name',
    'build_sale_financial_data',
    'build_sale_metadata',
    'build_sale_data',
    # Validation
    'ERROR_NO_DATA_PROVIDED',
    'ERROR_SALE_NOT_FOUND',
    'ERROR_PATIENT_NOT_FOUND',
    'validate_assignment_input',
    'validate_product_sale_input',
    'validate_product_availability',
    'validate_status_value',
    'load_product_from_inventory',
    # Inventory
    'update_product_inventory',
    'restore_serial_numbers',
    'process_inventory_restoration',
    'restore_inventory_for_cancelled_sale',
]
