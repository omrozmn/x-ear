from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.production_order import ProductionOrder
from utils.tenant_security import UnboundSession
import logging

logger = logging.getLogger(__name__)

admin_production_bp = Blueprint('admin_production', __name__, url_prefix='/api/admin/production')

@admin_production_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize Production Orders table"""
    try:
        engine = db.engine
        ProductionOrder.__table__.create(engine, checkfirst=True)
        return success_response(message='Production Orders table initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_production_bp.route('/orders', methods=['GET'])
@unified_access(permission=AdminPermissions.PRODUCTION_READ)
def get_orders(ctx):
    """Get production orders"""
    try:
        status = request.args.get('status')
        
        with UnboundSession():
            query = ProductionOrder.query
            if status:
                query = query.filter(ProductionOrder.status == status)
                
            orders = query.order_by(ProductionOrder.created_at.desc()).all()
        
        return success_response(data=[o.to_dict() for o in orders])
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_production_bp.route('/orders/<id>/status', methods=['PUT'])
@unified_access(permission=AdminPermissions.PRODUCTION_MANAGE)
def update_order_status(ctx, id):
    """Update order status"""
    try:
        order = ProductionOrder.query.get(id)
        if not order:
            return error_response('Order not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status:
            order.status = new_status
            db.session.commit()
            
        return success_response(data=order.to_dict(), message='Order status updated')
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
