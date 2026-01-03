"""
Sales Helper Utilities - Inventory Operations

Provides inventory management functions for sales operations.
"""
from models.base import db
from models.sales import DeviceAssignment
from services.stock_service import create_stock_movement
from sqlalchemy import text
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def update_product_inventory(product, transaction_id=None, created_by=None):
    """Update product inventory quantity."""
    # Check if product is ORM instance or has update_inventory method
    if hasattr(product, 'update_inventory'):
        if product.update_inventory(-1, allow_negative=True):
            create_stock_movement(
                inventory_id=product.id,
                movement_type="sale",
                quantity=-1,
                tenant_id=product.tenant_id,
                serial_number=None,
                transaction_id=transaction_id,
                created_by=created_by,
                session=db.session
            )
    else:
        # Fallback for raw object
        product.available_inventory -= 1
        # Try raw SQL update
        try:
            db.session.execute(
                text("UPDATE inventory SET available_inventory = available_inventory - 1, used_inventory = used_inventory + 1 WHERE id = :id"),
                {'id': product.id}
            )
            create_stock_movement(
                inventory_id=product.id,
                movement_type="sale",
                quantity=-1,
                tenant_id=product.tenant_id,
                serial_number=None,
                transaction_id=transaction_id,
                created_by=created_by,
                session=db.session
            )
        except Exception as e:
            logger.error(f"Failed to update inventory for raw product {product.id}: {e}")


def restore_serial_numbers(inventory_item, serial_number):
    """Restore serial numbers to inventory."""
    if ',' in serial_number:
        serials = [s.strip() for s in serial_number.split(',') if s.strip() and s.strip() != '-']
        for serial in serials:
            if hasattr(inventory_item, 'add_serial_number'):
                inventory_item.add_serial_number(serial)
    else:
        if serial_number != '-' and hasattr(inventory_item, 'add_serial_number'):
            inventory_item.add_serial_number(serial_number)


def process_inventory_restoration(assignment, sale_id):
    """Process inventory restoration for a single assignment."""
    if not assignment.inventory_id:
        return

    from models.inventory import InventoryItem
    inventory_item = db.session.get(InventoryItem, assignment.inventory_id)
    if not inventory_item:
        return

    quantity_to_restore = 1 if assignment.ear != 'both' else 2

    if assignment.serial_number and assignment.serial_number != 'null':
        restore_serial_numbers(inventory_item, assignment.serial_number)
    else:
        inventory_item.update_inventory(quantity_to_restore)

    inventory_item.updated_at = datetime.now()
    db.session.add(inventory_item)

    logger.info(f'Restored {quantity_to_restore} units to inventory {assignment.inventory_id} for cancelled sale {sale_id}')


def restore_inventory_for_cancelled_sale(sale_id):
    """Restore inventory when a sale is cancelled."""
    try:
        device_assignments = DeviceAssignment.query.filter_by(sale_id=sale_id).all()
        for assignment in device_assignments:
            process_inventory_restoration(assignment, sale_id)
    except Exception as e:
        logger.error(f'Failed to restore inventory for cancelled sale {sale_id}: {str(e)}')
