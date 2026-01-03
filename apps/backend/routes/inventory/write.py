"""Inventory Write Operations - Create, Update, Delete"""
from flask import request, jsonify
from models.base import db
from models.inventory import InventoryItem as Inventory
from . import inventory_bp
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
import logging

logger = logging.getLogger(__name__)

@inventory_bp.route('', methods=['POST'])
@unified_access(resource='inventory', action='create')
@idempotent(methods=['POST'])
def create_inventory_item(ctx):
    """Create a new inventory item"""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return error_response("Name is required", status_code=400)
        
        item = Inventory.from_dict(data)
        item.tenant_id = ctx.tenant_id
        
        db.session.add(item)
        db.session.commit()
        
        return success_response(data=item.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create inventory error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/<item_id>', methods=['PUT', 'PATCH'])
@unified_access(resource='inventory', action='edit')
def update_inventory_item(ctx, item_id):
    """Update an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        if not item or (ctx.tenant_id and item.tenant_id != ctx.tenant_id):
            return error_response("Item not found", status_code=404)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)
        
        # Map camelCase to snake_case for known fields
        camel_to_snake = {
            'priceIncludesKdv': 'price_includes_kdv',
            'costIncludesKdv': 'cost_includes_kdv',
            'availableInventory': 'available_inventory',
            'totalInventory': 'total_inventory',
            'usedInventory': 'used_inventory',
            'reorderLevel': 'reorder_level',
            'minInventory': 'reorder_level',
            'stockCode': 'stock_code',
            'vatRate': 'kdv_rate',
            'kdv': 'kdv_rate',
        }
        
        # Update fields with proper mapping
        for key, value in data.items():
            db_key = camel_to_snake.get(key, key)  # Use mapped key or original
            if hasattr(item, db_key) and db_key not in ['id', 'tenant_id', 'created_at']:
                setattr(item, db_key, value)
        
        db.session.commit()
        return success_response(data=item.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update inventory error: {str(e)}")
        return error_response(str(e), status_code=500)



@inventory_bp.route('/<item_id>', methods=['DELETE'])
@unified_access(resource='inventory', action='delete')
def delete_inventory_item(ctx, item_id):
    """Delete an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        if not item or (ctx.tenant_id and item.tenant_id != ctx.tenant_id):
            return error_response("Item not found", status_code=404)
        
        db.session.delete(item)
        db.session.commit()
        
        return success_response(data={'message': 'Item deleted successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete inventory error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/<item_id>/serials', methods=['POST'])
@unified_access(resource='inventory', action='manage')
def add_serial_numbers(ctx, item_id):
    """Add serial numbers to an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        if not item or (ctx.tenant_id and item.tenant_id != ctx.tenant_id):
            return error_response("Item not found", status_code=404)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)
        
        serials = data.get('serials', [])
        if not isinstance(serials, list):
            return error_response("serials must be an array", status_code=400)
        
        # Add serials using the model method
        added_count = 0
        for serial in serials:
            if serial and isinstance(serial, str) and serial.strip():
                if item.add_serial_number(serial.strip()):
                    added_count += 1
        
        db.session.commit()
        
        logger.info(f"Added {added_count} serial numbers to inventory item {item_id}")
        
        return success_response(data={
            'message': f'{added_count} serial numbers added',
            'item': item.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add serials error: {str(e)}")
        return error_response(str(e), status_code=500)

