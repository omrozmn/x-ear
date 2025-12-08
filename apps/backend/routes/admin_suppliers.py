from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.suppliers import Supplier
from utils.admin_permissions import require_admin_permission, AdminPermissions
from sqlalchemy import or_
from datetime import datetime

admin_suppliers_bp = Blueprint('admin_suppliers', __name__, url_prefix='/api/admin/suppliers')

@admin_suppliers_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.SUPPLIERS_READ)
def get_suppliers():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status')

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

        return jsonify({
            'success': True,
            'data': {
                'suppliers': [s.to_dict() for s in suppliers],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_suppliers_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SUPPLIERS_MANAGE)
def create_supplier():
    try:
        data = request.get_json()
        
        # Basic validation
        if not data.get('company_name'):
            return jsonify({'success': False, 'error': {'message': 'Company name is required'}}), 400

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

        return jsonify({
            'success': True,
            'data': {'supplier': new_supplier.to_dict()}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_suppliers_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.SUPPLIERS_READ)
def get_supplier(id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return jsonify({'success': False, 'error': {'message': 'Supplier not found'}}), 404

        return jsonify({
            'success': True,
            'data': {'supplier': supplier.to_dict()}
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_suppliers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.SUPPLIERS_MANAGE)
def update_supplier(id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return jsonify({'success': False, 'error': {'message': 'Supplier not found'}}), 404

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

        return jsonify({
            'success': True,
            'data': {'supplier': supplier.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_suppliers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@require_admin_permission(AdminPermissions.SUPPLIERS_MANAGE)
def delete_supplier(id):
    try:
        supplier = db.session.get(Supplier, id)
        if not supplier:
            return jsonify({'success': False, 'error': {'message': 'Supplier not found'}}), 404

        # Hard delete or Soft delete? Usually soft delete is better but for now hard delete
        db.session.delete(supplier)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Supplier deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
