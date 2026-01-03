"""
Suppliers Write Operations
--------------------------
POST/PUT/DELETE endpoints for supplier CRUD operations.
All endpoints use @unified_access for tenant scoping and permission checks.
"""

from flask import request, jsonify
from models.base import db
from models.suppliers import Supplier
from models.user import User
from . import suppliers_bp
from utils.decorators import unified_access
from utils.query_policy import get_or_404_scoped
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
import logging

logger = logging.getLogger(__name__)


@suppliers_bp.route('/suppliers', methods=['POST'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['POST'])
def create_supplier(ctx):
    """Create a new supplier - Unified Access"""
    try:
        data = request.get_json()
        
        # Support both camelCase and snake_case for critical fields
        company_name = data.get('companyName') or data.get('company_name')
        
        # Validate required fields
        if not company_name:
            return jsonify({'error': 'Company name is required'}), 400
        
        # Determine tenant_id
        # For tenant users: use their tenant
        # For super admins: use provided tenant_id or fallback
        tenant_id = ctx.tenant_id
        
        if not tenant_id:
            # Try to get from data
            tenant_id = data.get('tenant_id')
            
        if not tenant_id:
            # Fallback: get first tenant
            from models.tenant import Tenant
            tenant = Tenant.query.first()
            if tenant:
                tenant_id = tenant.id
                logger.warning(f"Using first tenant for supplier: {tenant.id}")
        
        if not tenant_id:
            # Last resort: create a default tenant
            from models.tenant import Tenant
            default_tenant = Tenant(
                id='default-tenant',
                name='Default Tenant',
                is_active=True
            )
            db.session.add(default_tenant)
            db.session.flush()
            tenant_id = default_tenant.id
            logger.warning(f"Created default tenant: {tenant_id}")
        
        # Check for duplicate company name within the same tenant
        existing = Supplier.query.filter_by(tenant_id=tenant_id, company_name=company_name).first()
        if existing:
            return jsonify({'error': 'Supplier with this company name already exists'}), 409
        
        # Create supplier
        supplier = Supplier(
            tenant_id=tenant_id,
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
        
        logger.info(f"Supplier created: {supplier.id} by {ctx.principal_id}")
        
        return jsonify(supplier.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['PUT'])
@optimistic_lock(Supplier, id_param='supplier_id')
@with_transaction
def update_supplier(ctx, supplier_id):
    """Update an existing supplier - Unified Access"""
    try:
        # Get supplier with tenant scoping
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        data = request.get_json()
        
        # Check for duplicate company name (excluding current supplier)
        new_name = data.get('company_name') or data.get('companyName')
        if new_name and new_name != supplier.company_name:
            existing = Supplier.query.filter_by(
                tenant_id=supplier.tenant_id, 
                company_name=new_name
            ).first()
            if existing:
                return jsonify({'error': 'Supplier with this company name already exists'}), 409
        
        # Update fields - support both camelCase and snake_case
        field_map = {
            'companyName': 'company_name',
            'companyCode': 'company_code',
            'taxNumber': 'tax_number',
            'taxOffice': 'tax_office',
            'contactPerson': 'contact_person',
            'postalCode': 'postal_code',
            'paymentTerms': 'payment_terms',
            'isActive': 'is_active'
        }
        
        updatable_fields = [
            'company_name', 'company_code', 'tax_number', 'tax_office',
            'contact_person', 'email', 'phone', 'mobile', 'fax', 'website',
            'address', 'city', 'country', 'postal_code', 'payment_terms',
            'currency', 'rating', 'notes', 'is_active'
        ]
        
        for key, value in data.items():
            # Convert camelCase to snake_case if needed
            field_name = field_map.get(key, key)
            if field_name in updatable_fields:
                setattr(supplier, field_name, value)
        
        db.session.commit()
        
        logger.info(f"Supplier updated: {supplier.id} by {ctx.principal_id}")
        
        return jsonify(supplier.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='delete')
def delete_supplier(ctx, supplier_id):
    """Delete a supplier (soft delete by setting is_active=False) - Unified Access"""
    try:
        # Get supplier with tenant scoping
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            return jsonify({'error': 'Supplier not found'}), 404
        
        # Soft delete
        supplier.is_active = False
        
        # Also deactivate all product relationships
        for ps in supplier.products:
            ps.is_active = False
        
        db.session.commit()
        
        logger.info(f"Supplier deleted (soft): {supplier.id} by {ctx.principal_id}")
        
        return jsonify({'message': 'Supplier deactivated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
