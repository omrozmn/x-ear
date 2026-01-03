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
        # Get categories from both Category table and Inventory items
        categories_set = set()
        
        # From Category table
        category_models = Category.query.all()
        for cat in category_models:
            if cat.name:
                categories_set.add(cat.name)
        
        # From Inventory items (for backward compatibility)
        query = db.session.query(Inventory.category).distinct().filter(
            Inventory.category.isnot(None),
            Inventory.category != ''
        )
        if ctx.tenant_id:
            query = query.filter(Inventory.tenant_id == ctx.tenant_id)
        
        for cat in query.all():
            if cat[0]:
                categories_set.add(cat[0])
        
        categories = sorted(list(categories_set))
        return success_response(data={'categories': categories})
    except Exception as e:
        logger.error(f"Get categories error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/categories', methods=['POST'])
@unified_access(resource='inventory', action='write')
@idempotent(methods=['POST'])
def create_category(ctx):
    """Create a new category"""
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return error_response("Category name required", status_code=400)
        
        # Category model doesn't have tenant_id, it's global
        # Check if category already exists
        existing = Category.query.filter_by(name=name).first()
        if existing:
            return success_response(data={'category': name, 'id': existing.id}, status_code=200)
        
        category = Category(name=name)
        db.session.add(category)
        db.session.commit()
        
        logger.info(f"Category created: {category.id} - {name}")
        
        return success_response(data={'category': name, 'id': category.id}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create category error: {str(e)}", exc_info=True)
        return error_response(str(e), status_code=500)


@inventory_bp.route('/brands', methods=['GET'])
@unified_access(resource='inventory', action='read')
def get_brands(ctx):
    """Get all brands"""
    try:
        # Get brands from both Brand table and Inventory items
        brands_set = set()
        
        # From Brand table
        brand_models = Brand.query.all()
        for brand in brand_models:
            if brand.name:
                brands_set.add(brand.name)
        
        # From Inventory items (for backward compatibility)
        query = db.session.query(Inventory.brand).distinct().filter(
            Inventory.brand.isnot(None)
        )
        if ctx.tenant_id:
            query = query.filter(Inventory.tenant_id == ctx.tenant_id)
        
        for brand in query.all():
            if brand[0]:
                brands_set.add(brand[0])
        
        brands = sorted(list(brands_set))
        return success_response(data={'brands': brands})
    except Exception as e:
        logger.error(f"Get brands error: {str(e)}")
        return error_response(str(e), status_code=500)


@inventory_bp.route('/brands', methods=['POST'])
@unified_access(resource='inventory', action='write')
@idempotent(methods=['POST'])
def create_brand(ctx):
    """Create a new brand"""
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return error_response("Brand name required", status_code=400)
        
        # Check if brand already exists
        existing = Brand.query.filter_by(name=name).first()
        if existing:
            return success_response(data={'brand': name, 'id': existing.id}, status_code=200)
        
        brand = Brand(name=name)
        db.session.add(brand)
        db.session.commit()
        
        logger.info(f"Brand created: {brand.id} - {name}")
        
        return success_response(data={'brand': name, 'id': brand.id}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create brand error: {str(e)}", exc_info=True)
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
