"""
Suppliers API Routes - Unified Architecture
Manages supplier and product-supplier relationship endpoints
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func
from datetime import datetime
from models.base import db
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.decorators import unified_access
from utils.response import success_response, error_response
from models.suppliers import Supplier, ProductSupplier
from models.inventory import InventoryItem
from models.purchase_invoice import PurchaseInvoice, SuggestedSupplier
import logging

logger = logging.getLogger(__name__)

suppliers_bp = Blueprint('suppliers', __name__)

# ============================================================================
# SUPPLIER CRUD OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_suppliers(ctx):
    """Get all suppliers with optional filtering and pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        is_active_param = request.args.get('is_active', None)
        city = request.args.get('city', '')
        sort_by = request.args.get('sort_by', 'company_name')
        sort_order = request.args.get('sort_order', 'asc')
        
        query = Supplier.query
        
        # Apply tenant scope - CRITICAL SECURITY
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'
            query = query.filter(Supplier.is_active == is_active)
        
        if city:
            query = query.filter(Supplier.city.ilike(f'%{city}%'))
        
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
            query = query.order_by(Supplier.company_name.asc())
        else:
            if hasattr(Supplier, sort_by):
                order_column = getattr(Supplier, sort_by)
                query = query.order_by(order_column.desc() if sort_order == 'desc' else order_column.asc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response(
            data=[s.to_dict() for s in pagination.items],
            meta={
                'page': page,
                'perPage': per_page,
                'total': pagination.total,
                'totalPages': pagination.pages,
                'tenant_scope': ctx.tenant_id
            }
        )
    except Exception as e:
        logger.error(f"Get suppliers error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/search', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def search_suppliers(ctx):
    """Fast supplier search for autocomplete"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10, type=int)
        
        if not query_param or len(query_param) < 2:
            return success_response(data={'suppliers': []})
        
        search_term = f'%{query_param}%'
        query = Supplier.query.filter(Supplier.is_active == True)
        
        # Apply tenant scope
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        suppliers = query.filter(
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.company_code.ilike(search_term),
                Supplier.contact_person.ilike(search_term)
            )
        ).order_by(Supplier.company_name.asc()).limit(limit).all()
        
        return success_response(data={'suppliers': [s.to_dict() for s in suppliers]})
    except Exception as e:
        logger.error(f"Search suppliers error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier(ctx, supplier_id):
    """Get a single supplier by ID"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        supplier_dict = supplier.to_dict()
        supplier_dict['products'] = [
            ps.to_dict(include_product=True) 
            for ps in supplier.products 
            if ps.is_active
        ]
        
        return success_response(data=supplier_dict)
    except Exception as e:
        logger.error(f"Get supplier error: {str(e)}")
        return error_response(str(e), status_code=404)


@suppliers_bp.route('/api/suppliers', methods=['POST'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['POST'])
def create_supplier(ctx):
    """Create a new supplier"""
    try:
        data = request.get_json()
        
        company_name = data.get('companyName') or data.get('company_name')
        if not company_name:
            return error_response("Company name is required", status_code=400)
        
        # Check for duplicate within tenant
        query = Supplier.query.filter_by(company_name=company_name)
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        existing = query.first()
        
        if existing:
            return error_response("Supplier with this company name already exists", status_code=409)
        
        supplier = Supplier(
            tenant_id=ctx.tenant_id,
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
        
        return success_response(data=supplier.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['PUT'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['PUT'])
@optimistic_lock(Supplier, id_param='supplier_id')
@with_transaction
def update_supplier(ctx, supplier_id):
    """Update an existing supplier"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        data = request.get_json()
        
        if 'company_name' in data and data['company_name'] != supplier.company_name:
            query = Supplier.query.filter_by(company_name=data['company_name'])
            if ctx.tenant_id:
                query = query.filter_by(tenant_id=ctx.tenant_id)
            existing = query.first()
            if existing:
                return error_response("Supplier with this company name already exists", status_code=409)
        
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
        return success_response(data=supplier.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/<int:supplier_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='write')
def delete_supplier(ctx, supplier_id):
    """Delete a supplier (soft delete)"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        supplier.is_active = False
        for ps in supplier.products:
            ps.is_active = False
        
        db.session.commit()
        return success_response(data={'message': 'Supplier deactivated successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


# ============================================================================
# PRODUCT-SUPPLIER RELATIONSHIP OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/products/<product_id>/suppliers', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_product_suppliers(ctx, product_id):
    """Get all suppliers for a specific product"""
    try:
        product = InventoryItem.query.get(product_id)
        if not product or (ctx.tenant_id and product.tenant_id != ctx.tenant_id):
            return error_response("Product not found", status_code=404)
        
        product_suppliers = ProductSupplier.query.filter_by(
            product_id=product_id,
            is_active=True
        ).order_by(ProductSupplier.priority.asc()).all()
        
        return success_response(data={
            'product_id': product_id,
            'product_name': product.name,
            'suppliers': [ps.to_dict(include_supplier=True) for ps in product_suppliers]
        })
    except Exception as e:
        logger.error(f"Get product suppliers error: {str(e)}")
        return error_response(str(e), status_code=404)


@suppliers_bp.route('/api/suppliers/<int:supplier_id>/products', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_products(ctx, supplier_id):
    """Get all products for a specific supplier"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        product_suppliers = ProductSupplier.query.filter_by(
            supplier_id=supplier_id,
            is_active=True
        ).all()
        
        return success_response(data={
            'supplier_id': supplier_id,
            'supplier_name': supplier.company_name,
            'products': [ps.to_dict(include_product=True) for ps in product_suppliers]
        })
    except Exception as e:
        logger.error(f"Get supplier products error: {str(e)}")
        return error_response(str(e), status_code=404)


@suppliers_bp.route('/api/products/<product_id>/suppliers', methods=['POST'])
@unified_access(resource='suppliers', action='write')
def add_product_supplier(ctx, product_id):
    """Add a supplier to a product"""
    try:
        data = request.get_json()
        if not data.get('supplier_id'):
            return error_response("Supplier ID is required", status_code=400)
        
        supplier_id = data['supplier_id']
        
        product = InventoryItem.query.get(product_id)
        if not product or (ctx.tenant_id and product.tenant_id != ctx.tenant_id):
            return error_response("Product not found", status_code=404)
        
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        existing = ProductSupplier.query.filter_by(
            product_id=product_id,
            supplier_id=supplier_id
        ).first()
        
        if existing:
            if existing.is_active:
                return error_response("This supplier is already linked to this product", status_code=409)
            else:
                existing.is_active = True
                ps = existing
        else:
            ps = ProductSupplier(
                product_id=product_id,
                supplier_id=supplier_id
            )
            db.session.add(ps)
        
        ps.supplier_product_code = data.get('supplier_product_code')
        ps.supplier_product_name = data.get('supplier_product_name')
        ps.unit_cost = data.get('unit_cost')
        ps.currency = data.get('currency', 'TRY')
        ps.minimum_order_quantity = data.get('minimum_order_quantity', 1)
        ps.lead_time_days = data.get('lead_time_days')
        ps.is_primary = data.get('is_primary', False)
        ps.priority = data.get('priority', 1)
        ps.notes = data.get('notes')
        
        if ps.is_primary:
            ProductSupplier.query.filter_by(
                product_id=product_id,
                is_primary=True
            ).filter(ProductSupplier.id != ps.id).update({'is_primary': False})
        
        db.session.commit()
        return success_response(data=ps.to_dict(include_supplier=True), status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add product supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/product-suppliers/<int:ps_id>', methods=['PUT'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['PUT'])
@optimistic_lock(ProductSupplier, id_param='ps_id')
@with_transaction
def update_product_supplier(ctx, ps_id):
    """Update a product-supplier relationship"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
            return error_response("Product-supplier relationship not found", status_code=404)
        
        # Verify tenant access through product
        product = InventoryItem.query.get(ps.product_id)
        if product and ctx.tenant_id and product.tenant_id != ctx.tenant_id:
            return error_response("Product-supplier relationship not found", status_code=404)
        
        data = request.get_json()
        
        updatable_fields = [
            'supplier_product_code', 'supplier_product_name', 'unit_cost',
            'currency', 'minimum_order_quantity', 'lead_time_days',
            'is_primary', 'priority', 'notes', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(ps, field, data[field])
        
        if data.get('is_primary') and ps.is_primary:
            ProductSupplier.query.filter_by(
                product_id=ps.product_id,
                is_primary=True
            ).filter(ProductSupplier.id != ps.id).update({'is_primary': False})
        
        db.session.commit()
        return success_response(data=ps.to_dict(include_supplier=True))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update product supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/product-suppliers/<int:ps_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='write')
def delete_product_supplier(ctx, ps_id):
    """Delete a product-supplier relationship"""
    try:
        ps = db.session.get(ProductSupplier, ps_id)
        if not ps:
            return error_response("Product-supplier relationship not found", status_code=404)
        
        product = InventoryItem.query.get(ps.product_id)
        if product and ctx.tenant_id and product.tenant_id != ctx.tenant_id:
            return error_response("Product-supplier relationship not found", status_code=404)
        
        ps.is_active = False
        db.session.commit()
        return success_response(data={'message': 'Product-supplier relationship removed successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete product supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


# ============================================================================
# STATISTICS & REPORTS
# ============================================================================

@suppliers_bp.route('/api/suppliers/stats', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_stats(ctx):
    """Get supplier statistics"""
    try:
        query = Supplier.query
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        total_suppliers = query.count()
        active_suppliers = query.filter_by(is_active=True).count()
        inactive_suppliers = total_suppliers - active_suppliers
        
        total_relationships = ProductSupplier.query.filter_by(is_active=True).count()
        
        top_suppliers_query = db.session.query(
            Supplier.id,
            Supplier.company_name,
            func.count(ProductSupplier.id).label('product_count')
        ).join(ProductSupplier).filter(
            Supplier.is_active == True,
            ProductSupplier.is_active == True
        )
        
        if ctx.tenant_id:
            top_suppliers_query = top_suppliers_query.filter(Supplier.tenant_id == ctx.tenant_id)
        
        top_suppliers = top_suppliers_query.group_by(Supplier.id).order_by(
            func.count(ProductSupplier.id).desc()
        ).limit(5).all()
        
        avg_rating_query = db.session.query(func.avg(Supplier.rating)).filter(
            Supplier.is_active == True,
            Supplier.rating.isnot(None)
        )
        if ctx.tenant_id:
            avg_rating_query = avg_rating_query.filter(Supplier.tenant_id == ctx.tenant_id)
        
        avg_rating_result = avg_rating_query.scalar()
        avg_rating = float(avg_rating_result) if avg_rating_result else 0.0
        
        return success_response(data={
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
        })
    except Exception as e:
        logger.error(f"Get supplier stats error: {str(e)}")
        return error_response(str(e), status_code=500)


# ============================================================================
# SUPPLIER INVOICE OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers/<int:supplier_id>/invoices', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_supplier_invoices(ctx, supplier_id):
    """Get all purchase invoices for a specific supplier"""
    try:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier or (ctx.tenant_id and supplier.tenant_id != ctx.tenant_id):
            return error_response("Supplier not found", status_code=404)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        invoice_type = request.args.get('type', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = db.session.query(PurchaseInvoice).filter_by(supplier_id=supplier_id)
        
        if invoice_type != 'all':
            query = query.filter(PurchaseInvoice.invoice_type == invoice_type.upper())
        
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                query = query.filter(PurchaseInvoice.invoice_date >= start)
            except (ValueError, TypeError):
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
                query = query.filter(PurchaseInvoice.invoice_date <= end)
            except (ValueError, TypeError):
                pass
        
        query = query.order_by(PurchaseInvoice.invoice_date.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response(
            data={
                'invoices': [inv.to_dict() for inv in pagination.items],
                'pagination': {
                    'page': page,
                    'perPage': per_page,
                    'total': pagination.total,
                    'totalPages': pagination.pages
                }
            }
        )
    except Exception as e:
        logger.error(f"Get supplier invoices error: {str(e)}")
        return error_response(str(e), status_code=500)


# ============================================================================
# SUGGESTED SUPPLIERS OPERATIONS
# ============================================================================

@suppliers_bp.route('/api/suppliers/suggested', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_suggested_suppliers(ctx):
    """Get all suggested suppliers (pending approval)"""
    try:
        query = SuggestedSupplier.query.filter_by(status='PENDING')
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        suggested = query.order_by(SuggestedSupplier.last_invoice_date.desc()).all()
        
        return success_response(data={'suggestedSuppliers': [s.to_dict() for s in suggested]})
    except Exception as e:
        logger.error(f"Get suggested suppliers error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/suggested/<int:suggested_id>/accept', methods=['POST'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['POST'])
@with_transaction
def accept_suggested_supplier(ctx, suggested_id):
    """Accept a suggested supplier and create a new supplier record"""
    try:
        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested or (ctx.tenant_id and suggested.tenant_id != ctx.tenant_id):
            return error_response("Suggested supplier not found", status_code=404)
        
        if suggested.status == 'ACCEPTED':
            return error_response("Supplier already accepted", status_code=400)
        
        query = db.session.query(Supplier).filter_by(tax_number=suggested.tax_number)
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        existing = query.first()
        
        if existing:
            suggested.status = 'ACCEPTED'
            suggested.supplier_id = existing.id
            suggested.accepted_at = datetime.now()
            
            PurchaseInvoice.query.filter_by(
                sender_tax_number=suggested.tax_number
            ).update({
                'supplier_id': existing.id,
                'is_matched': True
            })
            
            db.session.commit()
            
            return success_response(
                data={
                    'supplier': existing.to_dict(),
                    'note': 'Linked to existing supplier'
                }
            )
        
        supplier = Supplier(
            tenant_id=ctx.tenant_id,
            company_name=suggested.company_name,
            tax_number=suggested.tax_number,
            tax_office=suggested.tax_office,
            address=suggested.address,
            city=suggested.city,
            is_active=True
        )
        db.session.add(supplier)
        db.session.flush()
        
        suggested.status = 'ACCEPTED'
        suggested.supplier_id = supplier.id
        suggested.accepted_at = datetime.now()
        
        PurchaseInvoice.query.filter_by(
            sender_tax_number=suggested.tax_number
        ).update({
            'supplier_id': supplier.id,
            'is_matched': True
        })
        
        db.session.commit()
        
        return success_response(data={'supplier': supplier.to_dict()}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Accept suggested supplier error: {str(e)}")
        return error_response(str(e), status_code=500)


@suppliers_bp.route('/api/suppliers/suggested/<int:suggested_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='write')
def reject_suggested_supplier(ctx, suggested_id):
    """Reject/delete a suggested supplier"""
    try:
        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested or (ctx.tenant_id and suggested.tenant_id != ctx.tenant_id):
            return error_response("Suggested supplier not found", status_code=404)
        
        suggested.status = 'REJECTED'
        db.session.commit()
        
        return success_response(data={'message': 'Suggested supplier rejected'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reject suggested supplier error: {str(e)}")
        return error_response(str(e), status_code=500)
