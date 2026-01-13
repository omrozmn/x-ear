from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.system_setting import SystemSetting
import logging

logger = logging.getLogger(__name__)

admin_settings_bp = Blueprint('admin_settings', __name__, url_prefix='/api/admin/settings')

@admin_settings_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
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
            
        return success_response(message='System Settings table initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_settings_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.SETTINGS_READ)
def get_settings(ctx):
    """Get all system settings"""
    try:
        settings = SystemSetting.query.all()
        return success_response(data=[s.to_dict() for s in settings])
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_settings_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.SETTINGS_MANAGE)
def update_settings(ctx):
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
        
        return success_response(message='Settings updated')
    except Exception as e:
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_settings_bp.route('/cache/clear', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def clear_cache(ctx):
    """Clear system cache (Mock)"""
    try:
        # In a real app, this would clear Redis or other cache
        return success_response(message='Cache cleared successfully')
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_settings_bp.route('/backup', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def trigger_backup(ctx):
    """Trigger database backup (Mock)"""
    try:
        # In a real app, this would trigger a backup job
        return success_response(message='Backup job started')
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
