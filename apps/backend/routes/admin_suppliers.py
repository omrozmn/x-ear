from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.suppliers import Supplier
from sqlalchemy import or_
from datetime import datetime
from utils.tenant_security import UnboundSession

admin_suppliers_bp = Blueprint('admin_suppliers', __name__, url_prefix='/api/admin/suppliers')

@admin_suppliers_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.SUPPLIERS_READ)
def get_suppliers(ctx):
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status')

        with UnboundSession():
            query = Supplier.query

            if search:
                query = query.filter(
                    or_(
                        Supplier.company_name.ilike(f'%{search}%'),
                        Supplier.contact_name.ilike(f'%{search}%'),
                        Supplier.email.ilike(f'%{search}%')
                    )
                )
            
            if status:
                query = query.filter(Supplier.status == status)

            total = query.count()
            suppliers = query.order_by(Supplier.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

            return success_response(data={
                'suppliers': [s.to_dict() for s in suppliers],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            })

    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_suppliers_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.SUPPLIERS_MANAGE)
def create_supplier(ctx):
    try:
        data = request.get_json()
        
        # Basic validation
        if not data.get('company_name'):
            return error_response('Company name is required', code='MISSING_FIELD', status_code=400)

        new_supplier = Supplier(
            company_name=data['company_name'],
            contact_name=data.get('contact_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            tax_id=data.get('tax_id'),
            tax_office=data.get('tax_office'),
            status=data.get('status', 'active'),
            created_at=datetime.utcnow()
        )

        db.session.add(new_supplier)
        db.session.commit()

        return success_response(data={'supplier': new_supplier.to_dict()}, status_code=201)

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='CREATE_FAILED', status_code=500)

@admin_suppliers_bp.route('/<int:id>', methods=['GET'])
@unified_access(permission=AdminPermissions.SUPPLIERS_READ)
def get_supplier(ctx, id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return error_response('Supplier not found', code='NOT_FOUND', status_code=404)

        return success_response(data={'supplier': supplier.to_dict()})

    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_suppliers_bp.route('/<int:id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.SUPPLIERS_MANAGE)
def update_supplier(ctx, id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return error_response('Supplier not found', code='NOT_FOUND', status_code=404)

        data = request.get_json()
        
        if 'company_name' in data:
            supplier.company_name = data['company_name']
        if 'contact_name' in data:
            supplier.contact_name = data['contact_name']
        if 'email' in data:
            supplier.email = data['email']
        if 'phone' in data:
            supplier.phone = data['phone']
        if 'address' in data:
            supplier.address = data['address']
        if 'tax_id' in data:
            supplier.tax_id = data['tax_id']
        if 'tax_office' in data:
            supplier.tax_office = data['tax_office']
        if 'status' in data:
            supplier.status = data['status']

        supplier.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response(data={'supplier': supplier.to_dict()})

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='UPDATE_FAILED', status_code=500)

@admin_suppliers_bp.route('/<int:id>', methods=['DELETE'])
@unified_access(permission=AdminPermissions.SUPPLIERS_MANAGE)
def delete_supplier(ctx, id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return error_response('Supplier not found', code='NOT_FOUND', status_code=404)

        # Hard delete or Soft delete? Usually soft delete is better but for now hard delete
        db.session.delete(supplier)
        db.session.commit()

        return success_response(message='Supplier deleted successfully')

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='DELETE_FAILED', status_code=500)
