"""
Suppliers Read Operations
-------------------------
GET endpoints for supplier listing, searching, and retrieval.
All endpoints use @unified_access for tenant scoping.
"""

from flask import request, jsonify
from sqlalchemy import or_, func
from models.base import db
from models.suppliers import Supplier, ProductSupplier
from models.purchase_invoice import PurchaseInvoice
from . import suppliers_bp
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query, get_or_404_scoped
import logging

logger = logging.getLogger(__name__)


@suppliers_bp.route('/suppliers', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_suppliers(ctx):
    """Get all suppliers with optional filtering and pagination - Unified Access"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        is_active_param = request.args.get('is_active', None)
        city = request.args.get('city', '')
        sort_by = request.args.get('sort_by', 'company_name')
        sort_order = request.args.get('sort_order', 'asc')
        
        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Supplier)
        
        # Filter by active status (only if specified)
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'
            query = query.filter(Supplier.is_active == is_active)
        
        # City filter
        if city:
            query = query.filter(Supplier.city.ilike(f'%{city}%'))
        
        # Search filter - enhanced for autocomplete
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Supplier.company_name.ilike(search_term),
                    Supplier.company_code.ilike(search_term),
                    Supplier.contact_person.ilike(search_term),
                    Supplier.email.ilike(search_term),
                    Supplier.phone.ilike(search_term)
                )
            )
            
            # For autocomplete, use simple ordering by company name
            query = query.order_by(Supplier.company_name.asc())
        else:
            # Default sorting when no search
            if hasattr(Supplier, sort_by):
                order_column = getattr(Supplier, sort_by)
                if sort_order == 'desc':
                    query = query.order_by(order_column.desc())
                else:
                    query = query.order_by(order_column.asc())
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in pagination.items],
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': pagination.total,
                'totalPages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get suppliers error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/search', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def search_suppliers(ctx):
    """Fast supplier search for autocomplete - Unified Access"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        if not query_param or len(query_param) < 2:
            return jsonify({'suppliers': []}), 200
        
        # Use tenant-scoped query
        search_term = f'%{query_param}%'
        query = tenant_scoped_query(ctx, Supplier).filter(
            Supplier.is_active == True,
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.company_code.ilike(search_term),
                Supplier.contact_person.ilike(search_term)
            )
        ).order_by(Supplier.company_name.asc()).limit(limit)
        
        suppliers = query.all()
        
        return jsonify({
            'suppliers': [s.to_dict() for s in suppliers]
        }), 200
        
    except Exception as e:
        logger.error(f"Search suppliers error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier(ctx, supplier_id):
    """Get a single supplier by ID - Unified Access"""
    try:
        # Get supplier with tenant scoping
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        # Include product relationships
        supplier_dict = supplier.to_dict()
        supplier_dict['products'] = [
            ps.to_dict(include_product=True) 
            for ps in supplier.products 
            if ps.is_active
        ]
        
        return jsonify(supplier_dict), 200
        
    except Exception as e:
        logger.error(f"Get supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/suppliers/stats', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_stats(ctx):
    """Get supplier statistics - Unified Access"""
    try:
        # Base query with tenant scoping
        base_query = tenant_scoped_query(ctx, Supplier)
        
        total_suppliers = base_query.count()
        active_suppliers = base_query.filter_by(is_active=True).count()
        inactive_suppliers = total_suppliers - active_suppliers
        
        # Total product relationships (tenant-scoped through supplier)
        if ctx.tenant_id:
            supplier_ids = [s.id for s in base_query.all()]
            total_relationships = ProductSupplier.query.filter(
                ProductSupplier.supplier_id.in_(supplier_ids),
                ProductSupplier.is_active == True
            ).count() if supplier_ids else 0
        else:
            total_relationships = ProductSupplier.query.filter_by(is_active=True).count()
        
        # Top suppliers by product count
        if ctx.tenant_id:
            top_suppliers = db.session.query(
                Supplier.id,
                Supplier.company_name,
                func.count(ProductSupplier.id).label('product_count')
            ).join(ProductSupplier).filter(
                Supplier.tenant_id == ctx.tenant_id,
                Supplier.is_active == True,
                ProductSupplier.is_active == True
            ).group_by(Supplier.id).order_by(
                func.count(ProductSupplier.id).desc()
            ).limit(5).all()
        else:
            top_suppliers = db.session.query(
                Supplier.id,
                Supplier.company_name,
                func.count(ProductSupplier.id).label('product_count')
            ).join(ProductSupplier).filter(
                Supplier.is_active == True,
                ProductSupplier.is_active == True
            ).group_by(Supplier.id).order_by(
                func.count(ProductSupplier.id).desc()
            ).limit(5).all()
        
        # Calculate average rating
        avg_rating_result = base_query.filter(
            Supplier.is_active == True,
            Supplier.rating.isnot(None)
        ).with_entities(func.avg(Supplier.rating)).scalar()
        
        avg_rating = float(avg_rating_result) if avg_rating_result else 0.0
        
        return jsonify({
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers,
            'inactive_suppliers': inactive_suppliers,
            'total_product_relationships': total_relationships,
            'average_rating': round(avg_rating, 1),
            'top_suppliers': [
                {
                    'id': s.id,
                    'name': s.company_name,
                    'product_count': s.product_count
                } for s in top_suppliers
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Get supplier stats error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/<int:supplier_id>/invoices', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_invoices(ctx, supplier_id):
    """Get all purchase invoices for a specific supplier - Unified Access"""
    try:
        # Verify supplier exists and is accessible
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'success': False, 'error': 'Supplier not found'}), 404
        
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        invoice_type = request.args.get('type', 'all')  # 'incoming', 'outgoing', or 'all'
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Base query
        query = db.session.query(PurchaseInvoice).filter_by(supplier_id=supplier_id)
        
        # Filter by type
        if invoice_type != 'all':
            query = query.filter(PurchaseInvoice.invoice_type == invoice_type.upper())
        
        # Date filters
        if start_date:
            try:
                from datetime import datetime
                start = datetime.fromisoformat(start_date)
                query = query.filter(PurchaseInvoice.invoice_date >= start)
            except (ValueError, TypeError):
                pass
        
        if end_date:
            try:
                from datetime import datetime
                end = datetime.fromisoformat(end_date)
                query = query.filter(PurchaseInvoice.invoice_date <= end)
            except (ValueError, TypeError):
                pass
        
        # Order by date desc
        query = query.order_by(PurchaseInvoice.invoice_date.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'invoices': [inv.to_dict() for inv in pagination.items],
            'pagination': {
                'page': page,
                'perPage': per_page,
                'total': pagination.total,
                'totalPages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get supplier invoices error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
