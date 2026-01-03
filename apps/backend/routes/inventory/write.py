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
        
        # Update fields
        for key, value in data.items():
            if hasattr(item, key) and key not in ['id', 'tenant_id', 'created_at']:
                setattr(item, key, value)
        
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
