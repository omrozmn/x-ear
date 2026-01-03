"""Inventory Metadata - Categories, Brands, Features"""
from flask import request, jsonify
from models.base import db
from models.inventory import InventoryItem as Inventory
from models.brand import Brand
from models.category import Category
from . import inventory_bp
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
import logging

logger = logging.getLogger(__name__)

@inventory_bp.route('/categories', methods=['GET'])
@unified_access(resource='inventory', action='read')
def get_categories(ctx):
    """Get all categories"""
    try:
        query = db.session.query(Inventory.category).distinct().filter(
            Inventory.category.isnot(None),
            Inventory.category != ''
        )
        if ctx.tenant_id:
            query = query.filter(Inventory.tenant_id == ctx.tenant_id)
        
        categories = [cat[0] for cat in query.all() if cat[0]]
        return success_response(data={'categories': categories})
    except Exception as e:
        logger.error(f"Get categories error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/categories', methods=['POST'])
@unified_access(permission='inventory.manage')
@idempotent(methods=['POST'])
def create_category(ctx):
    """Create a new category"""
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return error_response("Category name required", status_code=400)
        
        category = Category(name=name, tenant_id=ctx.tenant_id)
        db.session.add(category)
        db.session.commit()
        
        return success_response(data={'category': name}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create category error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/brands', methods=['GET'])
@unified_access(resource='inventory', action='read')
def get_brands(ctx):
    """Get all brands"""
    try:
        query = db.session.query(Inventory.brand).distinct().filter(
            Inventory.brand.isnot(None)
        )
        if ctx.tenant_id:
            query = query.filter(Inventory.tenant_id == ctx.tenant_id)
        
        brands = [brand[0] for brand in query.all() if brand[0]]
        return success_response(data={'brands': brands})
    except Exception as e:
        logger.error(f"Get brands error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/brands', methods=['POST'])
@unified_access(permission='inventory.manage')
@idempotent(methods=['POST'])
def create_brand(ctx):
    """Create a new brand"""
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return error_response("Brand name required", status_code=400)
        
        brand = Brand(name=name)
        db.session.add(brand)
        db.session.commit()
        
        return success_response(data={'brand': name}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create brand error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/units', methods=['GET'])
@unified_access(resource='inventory', action='read')
def get_units(ctx):
    """Get available units"""
    try:
        from models.inventory import UNIT_TYPES
        return success_response(data={'units': UNIT_TYPES})
    except Exception as e:
        logger.error(f"Get units error: {str(e)}")
        return error_response(str(e), status_code=500)
