from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.system_setting import SystemSetting
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging

logger = logging.getLogger(__name__)

admin_settings_bp = Blueprint('admin_settings', __name__, url_prefix='/api/admin/settings')

@admin_settings_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize System Settings table"""
    try:
        engine = db.engine
        SystemSetting.__table__.create(engine, checkfirst=True)
        
        # Seed default settings if empty
        if SystemSetting.query.count() == 0:
            defaults = [
                SystemSetting(key='site_name', value='X-Ear CRM', category='general', is_public=True),
                SystemSetting(key='maintenance_mode', value='false', category='maintenance', is_public=True),
                SystemSetting(key='smtp_host', value='smtp.gmail.com', category='mail'),
                SystemSetting(key='smtp_port', value='587', category='mail'),
                SystemSetting(key='smtp_user', value='', category='mail'),
                SystemSetting(key='smtp_pass', value='', category='mail'),
            ]
            db.session.add_all(defaults)
            db.session.commit()
            
        return jsonify({'success': True, 'message': 'System Settings table initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_settings_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.SETTINGS_READ)
def get_settings():
    """Get all system settings"""
    try:
        settings = SystemSetting.query.all()
        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in settings]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_settings_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SETTINGS_MANAGE)
def update_settings():
    """Update system settings"""
    try:
        data = request.get_json()
        
        for item in data:
            key = item.get('key')
            value = item.get('value')
            
            setting = SystemSetting.query.get(key)
            if setting:
                setting.value = str(value)
            else:
                setting = SystemSetting(
                    key=key,
                    value=str(value),
                    category=item.get('category', 'general'),
                    is_public=item.get('isPublic', False)
                )
                db.session.add(setting)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Settings updated'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_settings_bp.route('/cache/clear', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def clear_cache():
    """Clear system cache (Mock)"""
    try:
        # In a real app, this would clear Redis or other cache
        return jsonify({'success': True, 'message': 'Cache cleared successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_settings_bp.route('/backup', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def trigger_backup():
    """Trigger database backup (Mock)"""
    try:
        # In a real app, this would trigger a backup job
        return jsonify({'success': True, 'message': 'Backup job started'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

