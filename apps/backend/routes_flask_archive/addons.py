from flask import Blueprint, jsonify
from models.addon import AddOn
from utils.response_envelope import success_response, error_response

addons_bp = Blueprint('addons', __name__)

@addons_bp.route('', methods=['GET'])
def get_addons():
    """Get all active addons (Public)"""
    try:
        # Fetch only active addons for public view
        addons = AddOn.query.filter_by(is_active=True).all()
        return success_response([addon.to_dict() for addon in addons])
    except Exception as e:
        return error_response(str(e), 500)
