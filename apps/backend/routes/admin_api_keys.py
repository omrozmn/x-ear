from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.api_key import ApiKey
from models.tenant import Tenant
from models.user import User
import logging
from datetime import datetime
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

admin_api_keys_bp = Blueprint('admin_api_keys', __name__, url_prefix='/api/admin/api-keys')

@admin_api_keys_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize API Key table"""
    try:
        engine = db.engine
        ApiKey.__table__.create(engine, checkfirst=True)
        return success_response(message='API Key table initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_api_keys_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.API_KEYS_READ)
def get_api_keys(ctx):
    """Get list of API keys"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        tenant_id = request.args.get('tenant_id')
        
        with UnboundSession():
            query = ApiKey.query
            
            if tenant_id:
                query = query.filter(ApiKey.tenant_id == tenant_id)
                
            total = query.count()
            keys = query.order_by(ApiKey.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return success_response(data={
            'keys': [k.to_dict() for k in keys],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_api_keys_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.API_KEYS_MANAGE)
def create_api_key(ctx):
    """Create a new API key"""
    try:
        data = request.get_json()
        user_id = ctx.principal_id
        
        tenant_id = data.get('tenantId')
        if not tenant_id:
            return error_response('Tenant ID is required', code='MISSING_FIELD', status_code=400)
            
        api_key = ApiKey(
            name=data.get('name'),
            tenant_id=tenant_id,
            created_by=user_id,
            scopes=','.join(data.get('scopes', [])),
            rate_limit=data.get('rateLimit', 1000)
        )
        
        db.session.add(api_key)
        db.session.commit()
        
        return success_response(data=api_key.to_dict(), status_code=201)
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=500)

@admin_api_keys_bp.route('/<key_id>', methods=['DELETE'])
@unified_access(permission=AdminPermissions.API_KEYS_MANAGE)
def revoke_api_key(ctx, key_id):
    """Revoke (delete) an API key"""
    try:
        key = ApiKey.query.get(key_id)
        if not key:
            return error_response('API Key not found', code='NOT_FOUND', status_code=404)
            
        db.session.delete(key)
        db.session.commit()
        
        return success_response(message='API Key revoked')
    except Exception as e:
        logger.error(f"Revoke API key error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
