from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.invoice import Invoice
from models.purchase_invoice import PurchaseInvoice
from models.user import ActivityLog
from sqlalchemy import func, desc, or_
import logging

# Not sure if logger was initialized, assuming yes or not critical
logger = logging.getLogger(__name__)

admin_birfatura_bp = Blueprint('admin_birfatura', __name__, url_prefix='/api/admin/birfatura')

@admin_birfatura_bp.route('/stats', methods=['GET'])
@unified_access(permission=AdminPermissions.BIRFATURA_READ)
def get_stats(ctx):
    """Get BirFatura statistics"""
    try:
        # Outgoing Invoices Stats
        outgoing_stats = db.session.query(
            Invoice.edocument_status,
            func.count(Invoice.id)
        ).filter(Invoice.edocument_status.isnot(None)).group_by(Invoice.edocument_status).all()
        
        outgoing_dict = {status: count for status, count in outgoing_stats}
        
        # Incoming Invoices Stats
        incoming_stats = db.session.query(
            PurchaseInvoice.status,
            func.count(PurchaseInvoice.id)
        ).group_by(PurchaseInvoice.status).all()
        
        incoming_dict = {status: count for status, count in incoming_stats}
        
        return success_response(data={
            'outgoing': outgoing_dict,
            'incoming': incoming_dict,
            'totalOutgoing': sum(outgoing_dict.values()),
            'totalIncoming': sum(incoming_dict.values())
        })
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_birfatura_bp.route('/invoices', methods=['GET'])
@unified_access(permission=AdminPermissions.BIRFATURA_READ)
def get_invoices(ctx):
    """Get invoices with BirFatura status"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status')
        direction = request.args.get('direction', 'outgoing') # outgoing, incoming
        
        if direction == 'outgoing':
            query = Invoice.query.filter(Invoice.edocument_status.isnot(None))
            if status:
                query = query.filter(Invoice.edocument_status == status)
            
            total = query.count()
            invoices = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            
            data = [inv.to_dict() for inv in invoices]
            
        else: # incoming
            query = PurchaseInvoice.query
            if status:
                query = query.filter(PurchaseInvoice.status == status)
                
            total = query.count()
            invoices = query.order_by(PurchaseInvoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            
            data = [inv.to_dict() for inv in invoices]
            
        return success_response(data={
            'invoices': data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_birfatura_bp.route('/logs', methods=['GET'])
@unified_access(permission=AdminPermissions.BIRFATURA_READ)
def get_logs(ctx):
    """Get BirFatura related logs"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        query = ActivityLog.query.filter(
            or_(
                ActivityLog.action.like('invoice.%'),
                ActivityLog.action.like('birfatura.%')
            )
        )
        
        total = query.count()
        logs = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return success_response(data={
            'logs': [log.to_dict_with_user() for log in logs],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
