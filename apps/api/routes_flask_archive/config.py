from flask import Blueprint, jsonify
import os

config_bp = Blueprint('config', __name__)


@config_bp.route('/config', methods=['GET'])
def get_config():
    admin_url = os.getenv('ADMIN_PANEL_URL', '/admin-panel/')
    return jsonify({'success': True, 'data': {'adminPanelUrl': admin_url}})
