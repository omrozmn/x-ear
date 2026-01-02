from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from utils.admin_permissions import require_admin_permission, AdminPermissions
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
@jwt_required()
@require_admin_permission(AdminPermissions.INVOICES_READ)
def get_admin_invoices():
    """
    Get paginated list of admin invoices
    ---
    tags:
      - AdminInvoices
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: limit
        in: query
        type: integer
        default: 10
      - name: tenant_id
        in: query
        type: string
      - name: status
        in: query
        type: string
      - name: search
        in: query
        type: string
    responses:
      200:
        description: List of invoices with pagination
        schema:
          type: object
          properties:
            data:
              type: object
              properties:
                invoices:
                  type: array
                  items:
                    type: object
                pagination:
                  type: object
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
                
            # Join with Tenant to get tenant name
            # query = query.join(Tenant).add_columns(Tenant.name.label('tenant_name'))
            
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
            
        return jsonify({
            'data': {
                'invoices': invoice_list,
                'pagination': {
                    'total': total,
                    'page': page,
                    'limit': limit,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        })
    except Exception as e:
        logger.error(f"Get invoices error: {e}")
        return jsonify({'error': str(e)}), 500

@admin_invoices_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.INVOICES_MANAGE)
def create_admin_invoice():
    # Admin panelden fatura oluşturma genellikle manuel bir süreçtir
    # Şimdilik basit bir implementasyon
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('tenant_id') or not data.get('amount'):
             return jsonify({'error': 'Tenant ID and amount are required'}), 400
             
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
        
        return jsonify({'data': {'invoice': new_invoice.to_dict()}}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create invoice error: {e}")
        return jsonify({'error': str(e)}), 500

@admin_invoices_bp.route('/<id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.INVOICES_READ)
def get_admin_invoice(id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        inv_dict = invoice.to_dict()
        tenant = db.session.get(Tenant, invoice.tenant_id)
        if tenant:
            inv_dict['tenant_name'] = tenant.name
            
        return jsonify({'data': {'invoice': inv_dict}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_invoices_bp.route('/<id>/payment', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.INVOICES_MANAGE)
def record_payment(id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Simple status update for now
        invoice.status = 'paid' # Or whatever status logic
        db.session.commit()
            
        return jsonify({'data': {'invoice': invoice.to_dict()}})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_invoices_bp.route('/<id>/pdf', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.INVOICES_READ)
def get_invoice_pdf(id):
    try:
        invoice = Invoice.query.get(id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        if invoice.gib_pdf_link:
             return jsonify({'url': invoice.gib_pdf_link})
             
        return jsonify({'message': 'PDF not available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
