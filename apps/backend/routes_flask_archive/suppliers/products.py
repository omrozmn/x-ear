"""
Product-Supplier Relationship Operations
-----------------------------------------
Manages the many-to-many relationship between products and suppliers.
"""

from flask import request, jsonify
from models.base import db
from models.suppliers import Supplier, ProductSupplier
from models.inventory import InventoryItem as Inventory
from . import suppliers_bp
from utils.decorators import unified_access
from utils.query_policy import get_or_404_scoped
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
import logging

logger = logging.getLogger(__name__)


@suppliers_bp.route('/products/<product_id>/suppliers', methods=['GET'])
@unified_access(resource='inventory', action='read')
def get_product_suppliers(ctx, product_id):
    """Get all suppliers for a specific product - Unified Access"""
    try:
        # Verify product exists with tenant scoping
        product = get_or_404_scoped(ctx, Inventory, product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Get product-supplier relationships
        product_suppliers = ProductSupplier.query.filter_by(
            product_id=product_id,
            is_active=True
        ).order_by(ProductSupplier.priority.asc()).all()
        
        return jsonify({
            'product_id': product_id,
            'product_name': product.name,
            'suppliers': [ps.to_dict(include_supplier=True) for ps in product_suppliers]
        }), 200
        
    except Exception as e:
        logger.error(f"Get product suppliers error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/suppliers/<int:supplier_id>/products', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_products(ctx, supplier_id):
    """Get all products for a specific supplier - Unified Access"""
    try:
        # Verify supplier exists with tenant scoping
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        # Get product-supplier relationships
        product_suppliers = ProductSupplier.query.filter_by(
            supplier_id=supplier_id,
            is_active=True
        ).all()
        
        return jsonify({
            'supplier_id': supplier_id,
            'supplier_name': supplier.company_name,
            'products': [ps.to_dict(include_product=True) for ps in product_suppliers]
        }), 200
        
    except Exception as e:
        logger.error(f"Get supplier products error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/products/<product_id>/suppliers', methods=['POST'])
@unified_access(resource='inventory', action='write')
def add_product_supplier(ctx, product_id):
    """Add a supplier to a product - Unified Access"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('supplier_id'):
            return jsonify({'error': 'Supplier ID is required'}), 400
        
        supplier_id = data['supplier_id']
        
        # Verify product and supplier exist with tenant scoping
        product = get_or_404_scoped(ctx, Inventory, product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
            
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        # Check if relationship already exists
        existing = ProductSupplier.query.filter_by(
            product_id=product_id,
            supplier_id=supplier_id
        ).first()
        
        if existing:
            if existing.is_active:
                return jsonify({'error': 'This supplier is already linked to this product'}), 409
            else:
                # Reactivate existing relationship
                existing.is_active = True
                ps = existing
        else:
            # Create new relationship
            ps = ProductSupplier(
                product_id=product_id,
                supplier_id=supplier_id
            )
            db.session.add(ps)
        
        # Update fields
        ps.supplier_product_code = data.get('supplier_product_code')
        ps.supplier_product_name = data.get('supplier_product_name')
        ps.unit_cost = data.get('unit_cost')
        ps.currency = data.get('currency', 'TRY')
        ps.minimum_order_quantity = data.get('minimum_order_quantity', 1)
        ps.lead_time_days = data.get('lead_time_days')
        ps.is_primary = data.get('is_primary', False)
        ps.priority = data.get('priority', 1)
        ps.notes = data.get('notes')
        
        # If this is marked as primary, unmark others
        if ps.is_primary:
            ProductSupplier.query.filter_by(
                product_id=product_id,
                is_primary=True
            ).filter(ProductSupplier.id != ps.id).update({'is_primary': False})
        
        db.session.commit()
        
        logger.info(f"Product-supplier link created: product={product_id}, supplier={supplier_id}")
        
        return jsonify(ps.to_dict(include_supplier=True)), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add product supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/product-suppliers/<int:ps_id>', methods=['PUT'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['PUT'])
@optimistic_lock(ProductSupplier, id_param='ps_id')
@with_transaction
def update_product_supplier(ctx, ps_id):
    """Update a product-supplier relationship - Unified Access"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
            return jsonify({'error': 'Product-supplier relationship not found'}), 404
        
        # Verify access through supplier tenant check
        supplier = get_or_404_scoped(ctx, Supplier, ps.supplier_id)
        if not supplier:
            return jsonify({'error': 'Product-supplier relationship not found'}), 404
            
        data = request.get_json()
        
        # Update fields
        updatable_fields = [
            'supplier_product_code', 'supplier_product_name', 'unit_cost',
            'currency', 'minimum_order_quantity', 'lead_time_days',
            'is_primary', 'priority', 'notes', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(ps, field, data[field])
        
        # If this is marked as primary, unmark others
        if data.get('is_primary') and ps.is_primary:
            ProductSupplier.query.filter_by(
                product_id=ps.product_id,
                is_primary=True
            ).filter(ProductSupplier.id != ps.id).update({'is_primary': False})
        
        db.session.commit()
        
        return jsonify(ps.to_dict(include_supplier=True)), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update product supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/product-suppliers/<int:ps_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='delete')
def delete_product_supplier(ctx, ps_id):
    """Delete a product-supplier relationship - Unified Access"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
            return jsonify({'error': 'Product-supplier relationship not found'}), 404
        
        # Verify access through supplier tenant check
        supplier = get_or_404_scoped(ctx, Supplier, ps.supplier_id)
        if not supplier:
            return jsonify({'error': 'Product-supplier relationship not found'}), 404
        
        # Soft delete
        ps.is_active = False
        
        db.session.commit()
        
        logger.info(f"Product-supplier link deleted: ps_id={ps_id}")
        
        return jsonify({'message': 'Product-supplier relationship removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete product supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
