from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from datetime import datetime
from models.base import db
from models.invoice import Invoice
from models.tenant import Tenant
import uuid
import logging
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

admin_invoices_bp = Blueprint('admin_invoices', __name__, url_prefix='/api/admin/invoices')

@admin_invoices_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.INVOICES_READ)
def get_admin_invoices(ctx):
    """
    Get paginated list of admin invoices
    """
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        tenant_id = request.args.get('tenant_id')
        status = request.args.get('status')
        search = request.args.get('search')
        
        with UnboundSession():
            query = Invoice.query
            
            if tenant_id:
                query = query.filter(Invoice.tenant_id == tenant_id)
                
            if status:
                query = query.filter(Invoice.status == status)
                
            if search:
                query = query.filter(Invoice.invoice_number.ilike(f'%{search}%'))
                
            total = query.count()
            invoices = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            
            invoice_list = []
            for inv in invoices:
                inv_dict = inv.to_dict()
                # Add tenant info manually since lazy loading might be an issue or simpler
                tenant = db.session.get(Tenant, inv.tenant_id)
                if tenant:
                    inv_dict['tenant_name'] = tenant.name
                invoice_list.append(inv_dict)
            
        return success_response(data={
            'invoices': invoice_list,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get invoices error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_invoices_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.INVOICES_MANAGE)
def create_admin_invoice(ctx):
    # Admin panelden fatura oluşturma genellikle manuel bir süreçtir
    # Şimdilik basit bir implementasyon
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('tenant_id') or not data.get('amount'):
             return error_response('Tenant ID and amount are required', code='MISSING_FIELDS', status_code=400)
             
        new_invoice = Invoice(
            # id is auto-increment Integer
            tenant_id=data['tenant_id'],
            invoice_number=f"INV-{int(datetime.utcnow().timestamp())}",
            device_price=data['amount'],
            status='active',
            created_at=datetime.utcnow()
        )
        
        db.session.add(new_invoice)
        db.session.commit()
        
        return success_response(data={'invoice': new_invoice.to_dict()}, status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create invoice error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=500)

@admin_invoices_bp.route('/<id>', methods=['GET'])
@unified_access(permission=AdminPermissions.INVOICES_READ)
def get_admin_invoice(ctx, id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return error_response('Invoice not found', code='NOT_FOUND', status_code=404)
            
        inv_dict = invoice.to_dict()
        tenant = db.session.get(Tenant, invoice.tenant_id)
        if tenant:
            inv_dict['tenant_name'] = tenant.name
            
        return success_response(data={'invoice': inv_dict})
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_invoices_bp.route('/<id>/payment', methods=['POST'])
@unified_access(permission=AdminPermissions.INVOICES_MANAGE)
def record_payment(ctx, id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return error_response('Invoice not found', code='NOT_FOUND', status_code=404)
        
        # Simple status update for now
        invoice.status = 'paid' # Or whatever status logic
        db.session.commit()
            
        return success_response(data={'invoice': invoice.to_dict()})
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_invoices_bp.route('/<id>/pdf', methods=['GET'])
@unified_access(permission=AdminPermissions.INVOICES_READ)
def get_invoice_pdf(ctx, id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return error_response('Invoice not found', code='NOT_FOUND', status_code=404)
            
        if invoice.gib_pdf_link:
             return success_response(data={'url': invoice.gib_pdf_link})
             
        return error_response('PDF not available', code='NOT_FOUND', status_code=404)
    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
