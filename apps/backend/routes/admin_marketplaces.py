from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.marketplace import MarketplaceIntegration, MarketplaceProduct
from models.tenant import Tenant
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

admin_marketplaces_bp = Blueprint('admin_marketplaces', __name__, url_prefix='/api/admin/marketplaces')

@admin_marketplaces_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize Marketplace tables"""
    try:
        engine = db.engine
        MarketplaceIntegration.__table__.create(engine, checkfirst=True)
        MarketplaceProduct.__table__.create(engine, checkfirst=True)
        return jsonify({'success': True, 'message': 'Marketplace tables initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_marketplaces_bp.route('/integrations', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.MARKETPLACES_READ)
def get_integrations():
    """Get list of marketplace integrations"""
    try:
        tenant_id = request.args.get('tenant_id')
        
        query = MarketplaceIntegration.query
        if tenant_id:
            query = query.filter(MarketplaceIntegration.tenant_id == tenant_id)
            
        integrations = query.all()
        
        return jsonify({
            'success': True,
            'data': [i.to_dict() for i in integrations]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_marketplaces_bp.route('/integrations', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.MARKETPLACES_MANAGE)
def create_integration():
    """Create a new marketplace integration"""
    try:
        data = request.get_json()
        
        integration = MarketplaceIntegration(
            tenant_id=data.get('tenantId'),
            platform=data.get('platform'),
            name=data.get('name'),
            api_key=data.get('apiKey'),
            api_secret=data.get('apiSecret'),
            seller_id=data.get('sellerId'),
            sync_stock=data.get('syncStock', True),
            sync_prices=data.get('syncPrices', True),
            sync_orders=data.get('syncOrders', True)
        )
        
        db.session.add(integration)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': integration.to_dict()
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_marketplaces_bp.route('/integrations/<id>/sync', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.MARKETPLACES_MANAGE)
def sync_integration(id):
    """Trigger sync for an integration (Mock)"""
    try:
        integration = MarketplaceIntegration.query.get(id)
        if not integration:
            return jsonify({'success': False, 'error': {'message': 'Integration not found'}}), 404
            
        # Mock sync logic
        integration.last_sync_at = datetime.utcnow()
        integration.status = 'connected'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sync triggered successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

