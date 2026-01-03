from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.marketplace import MarketplaceIntegration, MarketplaceProduct
from models.tenant import Tenant
from utils.tenant_security import UnboundSession
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

admin_marketplaces_bp = Blueprint('admin_marketplaces', __name__, url_prefix='/api/admin/marketplaces')

@admin_marketplaces_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize Marketplace tables"""
    try:
        engine = db.engine
        MarketplaceIntegration.__table__.create(engine, checkfirst=True)
        MarketplaceProduct.__table__.create(engine, checkfirst=True)
        return success_response(message='Marketplace tables initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_marketplaces_bp.route('/integrations', methods=['GET'])
@unified_access(permission=AdminPermissions.MARKETPLACES_READ)
def get_integrations(ctx):
    """Get list of marketplace integrations"""
    try:
        tenant_id = request.args.get('tenant_id')
        
        with UnboundSession():
            query = MarketplaceIntegration.query
            if tenant_id:
                query = query.filter(MarketplaceIntegration.tenant_id == tenant_id)
                
            integrations = query.all()
        
        return success_response(data=[i.to_dict() for i in integrations])
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_marketplaces_bp.route('/integrations', methods=['POST'])
@unified_access(permission=AdminPermissions.MARKETPLACES_MANAGE)
def create_integration(ctx):
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
        
        return success_response(data=integration.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='CREATE_FAILED', status_code=500)

@admin_marketplaces_bp.route('/integrations/<id>/sync', methods=['POST'])
@unified_access(permission=AdminPermissions.MARKETPLACES_MANAGE)
def sync_integration(ctx, id):
    """Trigger sync for an integration (Mock)"""
    try:
        integration = MarketplaceIntegration.query.get(id)
        if not integration:
            return error_response('Integration not found', code='NOT_FOUND', status_code=404)
            
        # Mock sync logic
        integration.last_sync_at = datetime.utcnow()
        integration.status = 'connected'
        db.session.commit()
        
        return success_response(message='Sync triggered successfully')
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
