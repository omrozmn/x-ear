from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.api_key import ApiKey
from models.tenant import Tenant
from models.user import User
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging
from datetime import datetime
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

admin_api_keys_bp = Blueprint('admin_api_keys', __name__, url_prefix='/api/admin/api-keys')

@admin_api_keys_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize API Key table"""
    try:
        engine = db.engine
        ApiKey.__table__.create(engine, checkfirst=True)
        return jsonify({'success': True, 'message': 'API Key table initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_api_keys_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.API_KEYS_READ)
def get_api_keys():
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
        
        return jsonify({
            'success': True,
            'data': {
                'keys': [k.to_dict() for k in keys],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_api_keys_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.API_KEYS_MANAGE)
def create_api_key():
    """Create a new API key"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        tenant_id = data.get('tenantId')
        if not tenant_id:
            return jsonify({'success': False, 'error': {'message': 'Tenant ID is required'}}), 400
            
        api_key = ApiKey(
            name=data.get('name'),
            tenant_id=tenant_id,
            created_by=user_id,
            scopes=','.join(data.get('scopes', [])),
            rate_limit=data.get('rateLimit', 1000)
        )
        
        db.session.add(api_key)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': api_key.to_dict()
        }), 201
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_api_keys_bp.route('/<key_id>', methods=['DELETE'])
@jwt_required()
@require_admin_permission(AdminPermissions.API_KEYS_MANAGE)
def revoke_api_key(key_id):
    """Revoke (delete) an API key"""
    try:
        key = ApiKey.query.get(key_id)
        if not key:
            return jsonify({'success': False, 'error': {'message': 'API Key not found'}}), 404
            
        db.session.delete(key)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'API Key revoked'}), 200
    except Exception as e:
        logger.error(f"Revoke API key error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

