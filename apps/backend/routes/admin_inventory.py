from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.device import Device
from models.tenant import Tenant
from sqlalchemy import or_
import logging

logger = logging.getLogger(__name__)

admin_inventory_bp = Blueprint('admin_inventory', __name__, url_prefix='/api/admin/inventory')

@admin_inventory_bp.route('', methods=['GET'])
@jwt_required()
def get_all_inventory():
    """Get list of ALL devices/inventory from ALL tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        tenant_id = request.args.get('tenant_id')
        status = request.args.get('status')
        category = request.args.get('category')
        
        query = Device.query
        
        if search:
            query = query.filter(
                (Device.brand.ilike(f'%{search}%')) |
                (Device.model.ilike(f'%{search}%')) |
                (Device.serial_number.ilike(f'%{search}%')) |
                (Device.serial_number_left.ilike(f'%{search}%')) |
                (Device.serial_number_right.ilike(f'%{search}%'))
            )
            
        if tenant_id:
            query = query.filter(Device.tenant_id == tenant_id)
            
        if status:
            query = query.filter(Device.status == status)
            
        if category:
            query = query.filter(Device.category == category)
            
        total = query.count()
        devices = query.order_by(Device.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        devices_list = []
        for dev in devices:
            dev_dict = dev.to_dict()
            
            # Add tenant info
            if dev.tenant_id:
                tenant = db.session.get(Tenant, dev.tenant_id)
                if tenant:
                    dev_dict['tenantName'] = tenant.name
                    
            devices_list.append(dev_dict)
            
        return jsonify({
            'success': True,
            'data': {
                'inventory': devices_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get all inventory error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
