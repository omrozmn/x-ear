from flask import Blueprint, request, jsonify
from models.user import ActivityLog, User
from utils.authorization import admin_required, permission_required
from flask_jwt_extended import jwt_required, get_jwt_identity

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/audit', methods=['GET'])
@admin_required
def list_audit():
    # Simple listing with optional filters
    entity_type = request.args.get('entity_type')
    q = ActivityLog.query.order_by(ActivityLog.created_at.desc())
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    items = q.limit(200).all()
    return jsonify({'success': True, 'data': [i.to_dict() for i in items]})
