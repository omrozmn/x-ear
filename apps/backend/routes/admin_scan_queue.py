from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.scan_queue import ScanQueue
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

admin_scan_queue_bp = Blueprint('admin_scan_queue', __name__, url_prefix='/api/admin/scan-queue')

@admin_scan_queue_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize Scan Queue table"""
    try:
        engine = db.engine
        ScanQueue.__table__.create(engine, checkfirst=True)
        return jsonify({'success': True, 'message': 'Scan Queue table initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_scan_queue_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.SCAN_QUEUE_READ)
def get_scan_queue():
    """Get scan queue items"""
    try:
        status = request.args.get('status')
        
        query = ScanQueue.query
        if status:
            query = query.filter(ScanQueue.status == status)
            
        items = query.order_by(ScanQueue.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [i.to_dict() for i in items]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_scan_queue_bp.route('/<id>/retry', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SCAN_QUEUE_MANAGE)
def retry_scan(id):
    """Retry a failed scan"""
    try:
        scan = ScanQueue.query.get(id)
        if not scan:
            return jsonify({'success': False, 'error': {'message': 'Scan not found'}}), 404
            
        scan.status = 'pending'
        scan.error_message = None
        scan.started_at = None
        scan.completed_at = None
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scan queued for retry',
            'data': scan.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

