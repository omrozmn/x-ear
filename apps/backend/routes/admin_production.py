from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.production_order import ProductionOrder
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging

logger = logging.getLogger(__name__)

admin_production_bp = Blueprint('admin_production', __name__, url_prefix='/api/admin/production')

@admin_production_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize Production Orders table"""
    try:
        engine = db.engine
        ProductionOrder.__table__.create(engine, checkfirst=True)
        return jsonify({'success': True, 'message': 'Production Orders table initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_production_bp.route('/orders', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.PRODUCTION_READ)
def get_orders():
    """Get production orders"""
    try:
        status = request.args.get('status')
        
        query = ProductionOrder.query
        if status:
            query = query.filter(ProductionOrder.status == status)
            
        orders = query.order_by(ProductionOrder.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [o.to_dict() for o in orders]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_production_bp.route('/orders/<id>/status', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.PRODUCTION_MANAGE)
def update_order_status(id):
    """Update order status"""
    try:
        order = ProductionOrder.query.get(id)
        if not order:
            return jsonify({'success': False, 'error': {'message': 'Order not found'}}), 404
            
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status:
            order.status = new_status
            db.session.commit()
            
        return jsonify({
            'success': True,
            'message': 'Order status updated',
            'data': order.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

