from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models.system import Settings
from models.base import db
import logging

logger = logging.getLogger(__name__)

admin_settings_bp = Blueprint('admin_settings', __name__, url_prefix='/api/admin/settings')

@admin_settings_bp.route('', methods=['GET'])
@jwt_required()
def get_admin_settings():
    """Get system settings for admin"""
    try:
        settings = Settings.get_system_settings()
        return jsonify({
            "data": {
                "settings": settings.settings_json
            }
        }), 200
    except Exception as e:
        logger.error(f"Get admin settings error: {e}")
        return jsonify({"error": str(e)}), 500

@admin_settings_bp.route('', methods=['POST'])
@jwt_required()
def update_admin_settings():
    """Update system settings"""
    try:
        data = request.get_json()
        settings_record = Settings.get_system_settings()
        
        # Merge new settings with existing ones
        current_settings = settings_record.settings_json
        
        # Deep merge or shallow merge? 
        # For simplicity, we'll do a shallow merge of top-level keys, 
        # but the frontend sends the whole object usually.
        # If the frontend sends a partial object, we need to be careful.
        # Assuming frontend sends the complete structure for the sections it edits.
        
        # However, to support the new integrations fields without losing others:
        new_settings = {**current_settings, **data}
        
        settings_record.settings_json = new_settings
        db.session.commit()
        
        return jsonify({
            "data": {
                "settings": new_settings
            }
        }), 200
    except Exception as e:
        logger.error(f"Update admin settings error: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_settings_bp.route('', methods=['PATCH'])
@jwt_required()
def patch_admin_settings():
    """Apply partial updates to system settings using dot-path notation."""
    try:
        data = request.get_json()
        updates = data.get('updates')
        
        if not updates or not isinstance(updates, dict):
            return jsonify({"error": "'updates' object required"}), 400

        settings_record = Settings.get_system_settings()
        
        for path, val in updates.items():
            settings_record.update_setting(path, val)
            
        db.session.commit()
        
        return jsonify({
            "data": {
                "settings": settings_record.settings_json
            }
        }), 200
    except Exception as e:
        logger.error(f"Patch admin settings error: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
