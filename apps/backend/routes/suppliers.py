"""
Suppliers API Routes
Manages supplier and product-supplier relationship endpoints
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func, case
import sys
from pathlib import Path
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.base import db
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction

# Import models from new structure
from models.suppliers import Supplier, ProductSupplier
from models.inventory import InventoryItem
from models.purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem, SuggestedSupplier
from models.user import User

suppliers_bp = Blueprint('suppliers', __name__)


# ============================================================================
# SUPPLIER CRUD OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers', methods=['GET'])
@jwt_required()
def get_suppliers():
    """Get all suppliers with optional filtering and pagination"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        is_active_param = request.args.get('is_active', None)
        city = request.args.get('city', '')
        sort_by = request.args.get('sort_by', 'company_name')
        sort_order = request.args.get('sort_order', 'asc')
        
        # Base query
        query = Supplier.query
        
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
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/search', methods=['GET'])
@jwt_required()
def search_suppliers():
    """Fast supplier search for autocomplete"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        if not query_param or len(query_param) < 2:
            return jsonify({'suppliers': []}), 200
        
        # Fast search query - simplified for debugging
        search_term = f'%{query_param}%'
        suppliers = Supplier.query.filter(
            Supplier.is_active == True,
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.company_code.ilike(search_term),
                Supplier.contact_person.ilike(search_term)
            )
        ).order_by(Supplier.company_name.asc()).limit(limit).all()
        
        return jsonify({
            'suppliers': [s.to_dict() for s in suppliers]
        }), 200
        
    except Exception as e:
        print(f"Search error: {str(e)}")  # Debug print
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['GET'])
@jwt_required()
def get_supplier(supplier_id):
    """Get a single supplier by ID"""
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        
        # Include product relationships
        supplier_dict = supplier.to_dict()
        supplier_dict['products'] = [
            ps.to_dict(include_product=True) 
            for ps in supplier.products 
            if ps.is_active
        ]
        
        return jsonify(supplier_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/api/suppliers', methods=['POST'])
@jwt_required()
@idempotent(methods=['POST'])
def create_supplier():
    """Create a new supplier"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401

        data = request.get_json()
        
        # Support both camelCase and snake_case for critical fields
        company_name = data.get('companyName') or data.get('company_name')
        
        # Validate required fields
        if not company_name:
            return jsonify({'error': 'Company name is required'}), 400
        
        # Check for duplicate company name within the same tenant
        existing = Supplier.query.filter_by(tenant_id=user.tenant_id, company_name=company_name).first()
        if existing:
            return jsonify({'error': 'Supplier with this company name already exists'}), 409
        
        # Create supplier
        supplier = Supplier(
            tenant_id=user.tenant_id,
            company_name=company_name,
            company_code=data.get('companyCode') or data.get('company_code'),
            tax_number=data.get('taxNumber') or data.get('tax_number'),
            tax_office=data.get('taxOffice') or data.get('tax_office'),
            contact_person=data.get('contactPerson') or data.get('contact_person'),
            email=data.get('email'),
            phone=data.get('phone'),
            mobile=data.get('mobile'),
            fax=data.get('fax'),
            website=data.get('website'),
            address=data.get('address'),
            city=data.get('city'),
            country=data.get('country', 'Türkiye'),
            postal_code=data.get('postalCode') or data.get('postal_code'),
            payment_terms=data.get('paymentTerms') or data.get('payment_terms'),
            currency=data.get('currency', 'TRY'),
            rating=data.get('rating'),
            notes=data.get('notes'),
            is_active=data.get('isActive') if 'isActive' in data else data.get('is_active', True)
        )
        
        db.session.add(supplier)
        db.session.commit()
        
        return jsonify(supplier.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['PUT'])
@jwt_required()
@idempotent(methods=['PUT'])
@optimistic_lock(Supplier, id_param='supplier_id')
@with_transaction
def update_supplier(supplier_id):
    """Update an existing supplier"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        data = request.get_json()
        
        # Check for duplicate company name (excluding current supplier)
        if 'company_name' in data and data['company_name'] != supplier.company_name:
            existing = Supplier.query.filter_by(company_name=data['company_name']).first()
            if existing:
                return jsonify({'error': 'Supplier with this company name already exists'}), 409
        
        # Update fields
        updatable_fields = [
            'company_name', 'company_code', 'tax_number', 'tax_office',
            'contact_person', 'email', 'phone', 'mobile', 'fax', 'website',
            'address', 'city', 'country', 'postal_code', 'payment_terms',
            'currency', 'rating', 'notes', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(supplier, field, data[field])
        
        db.session.commit()
        
        return jsonify(supplier.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['DELETE'])
@jwt_required()
def delete_supplier(supplier_id):
    """Delete a supplier (soft delete by setting is_active=False)"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        # Soft delete
        supplier.is_active = False
        
        # Also deactivate all product relationships
        for ps in supplier.products:
            ps.is_active = False
        
        db.session.commit()
        
        return jsonify({'message': 'Supplier deactivated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# PRODUCT-SUPPLIER RELATIONSHIP OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/products/<product_id>/suppliers', methods=['GET'])
@jwt_required()
def get_product_suppliers(product_id):
    """Get all suppliers for a specific product"""
    try:
        # Verify product exists
        product = Inventory.query.get_or_404(product_id)
        
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
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/api/suppliers/<int:supplier_id>/products', methods=['GET'])
@jwt_required()
def get_supplier_products(supplier_id):
    """Get all products for a specific supplier"""
    try:
        # Verify supplier exists
        supplier = Supplier.query.get_or_404(supplier_id)
        
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
        return jsonify({'error': str(e)}), 404


@suppliers_bp.route('/api/products/<product_id>/suppliers', methods=['POST'])
@jwt_required()
def add_product_supplier(product_id):
    """Add a supplier to a product"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('supplier_id'):
            return jsonify({'error': 'Supplier ID is required'}), 400
        
        supplier_id = data['supplier_id']
        
        # Verify product and supplier exist
        product = Inventory.query.get_or_404(product_id)
        supplier = Supplier.query.get_or_404(supplier_id)
        
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
        
        return jsonify(ps.to_dict(include_supplier=True)), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/product-suppliers/<int:ps_id>', methods=['PUT'])
@jwt_required()
@idempotent(methods=['PUT'])
@optimistic_lock(ProductSupplier, id_param='ps_id')
@with_transaction
def update_product_supplier(ps_id):
    """Update a product-supplier relationship"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
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
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/product-suppliers/<int:ps_id>', methods=['DELETE'])
@jwt_required()
def delete_product_supplier(ps_id):
    """Delete a product-supplier relationship"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
            return jsonify({'error': 'Product-supplier relationship not found'}), 404
        
        # Soft delete
        ps.is_active = False
        
        db.session.commit()
        
        return jsonify({'message': 'Product-supplier relationship removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# STATISTICS & REPORTS
# ============================================================================

@suppliers_bp.route('/api/suppliers/stats', methods=['GET'])
@jwt_required()
def get_supplier_stats():
    """Get supplier statistics"""
    try:
        total_suppliers = Supplier.query.count()
        active_suppliers = Supplier.query.filter_by(is_active=True).count()
        inactive_suppliers = total_suppliers - active_suppliers
        
        # Total product relationships
        total_relationships = ProductSupplier.query.filter_by(is_active=True).count()
        
        # Top suppliers by product count
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
        avg_rating_result = db.session.query(
            func.avg(Supplier.rating)
        ).filter(
            Supplier.is_active == True,
            Supplier.rating.isnot(None)
        ).scalar()
        
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
        return jsonify({'error': str(e)}), 500

# ============================================================================
# SUPPLIER INVOICE OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers/<int:supplier_id>/invoices', methods=['GET'])
@jwt_required()
def get_supplier_invoices(supplier_id):
    """Get all purchase invoices for a specific supplier"""
    try:
        # Verify supplier exists
        supplier = db.session.get(Supplier, supplier_id)
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
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SUGGESTED SUPPLIERS OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers/suggested', methods=['GET'])
@jwt_required()
def get_suggested_suppliers():
    """Get all suggested suppliers (pending approval)"""
    try:
        # Only get pending suggestions
        suggested = SuggestedSupplier.query.filter_by(status='PENDING').order_by(
            SuggestedSupplier.last_invoice_date.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'suggestedSuppliers': [s.to_dict() for s in suggested]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/suggested/<int:suggested_id>/accept', methods=['POST'])
@idempotent(methods=['POST'])
@with_transaction
@jwt_required()
def accept_suggested_supplier(suggested_id):
    """Accept a suggested supplier and create a new supplier record"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401

        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested:
            return jsonify({'success': False, 'error': 'Suggested supplier not found'}), 404
        
        # Check if already accepted
        if suggested.status == 'ACCEPTED':
            return jsonify({
                'success': False,
                'error': 'Supplier already accepted',
                'supplier': suggested.supplier.to_dict() if suggested.supplier else None
            }), 400
        
        # Check if a supplier with this tax number already exists
        existing = db.session.query(Supplier).filter_by(tax_number=suggested.tax_number).first()
        if existing:
            # Link to existing supplier
            suggested.status = 'ACCEPTED'
            suggested.supplier_id = existing.id
            suggested.accepted_at = datetime.now()
            
            # Update all invoices
            PurchaseInvoice.query.filter_by(
                sender_tax_number=suggested.tax_number
            ).update({
                'supplier_id': existing.id,
                'is_matched': True
            })
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'supplier': existing.to_dict(),
                'note': 'Linked to existing supplier'
            }), 200
        
        # Create new supplier
        supplier = Supplier(
            tenant_id=user.tenant_id,
            company_name=suggested.company_name,
            tax_number=suggested.tax_number,
            tax_office=suggested.tax_office,
            address=suggested.address,
            city=suggested.city,
            is_active=True
        )
        db.session.add(supplier)
        db.session.flush()  # Get ID
        
        # Update suggested supplier
        suggested.status = 'ACCEPTED'
        suggested.supplier_id = supplier.id
        suggested.accepted_at = datetime.now()
        
        # Update all related invoices
        PurchaseInvoice.query.filter_by(
            sender_tax_number=suggested.tax_number
        ).update({
            'supplier_id': supplier.id,
            'is_matched': True
        })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'supplier': supplier.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/api/suppliers/suggested/<int:suggested_id>', methods=['DELETE'])
def reject_suggested_supplier(suggested_id):
    """Reject/delete a suggested supplier"""
    try:
        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested:
            return jsonify({'error': 'Suggested supplier not found'}), 404
        
        # Mark as rejected instead of deleting (for audit trail)
        suggested.status = 'REJECTED'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Suggested supplier rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
