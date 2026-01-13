from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.scan_queue import ScanQueue
from datetime import datetime
from utils.tenant_security import UnboundSession
import logging

logger = logging.getLogger(__name__)

admin_scan_queue_bp = Blueprint('admin_scan_queue', __name__, url_prefix='/api/admin/scan-queue')

@admin_scan_queue_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize Scan Queue table"""
    try:
        engine = db.engine
        ScanQueue.__table__.create(engine, checkfirst=True)
        return success_response(message='Scan Queue table initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_scan_queue_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.SCAN_QUEUE_READ)
def get_scan_queue(ctx):
    """Get scan queue items"""
    try:
        status = request.args.get('status')
        
        with UnboundSession():
            query = ScanQueue.query
            if status:
                query = query.filter(ScanQueue.status == status)
                
            items = query.order_by(ScanQueue.created_at.desc()).all()
        
        return success_response(data=[i.to_dict() for i in items])
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_scan_queue_bp.route('/<id>/retry', methods=['POST'])
@unified_access(permission=AdminPermissions.SCAN_QUEUE_MANAGE)
def retry_scan(ctx, id):
    """Retry a failed scan"""
    try:
        scan = ScanQueue.query.get(id)
        if not scan:
            return error_response('Scan not found', code='NOT_FOUND', status_code=404)
            
        scan.status = 'pending'
        scan.error_message = None
        scan.started_at = None
        scan.completed_at = None
        db.session.commit()
        
        return success_response(data=scan.to_dict(), message='Scan queued for retry')
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
