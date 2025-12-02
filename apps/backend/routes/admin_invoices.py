from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from datetime import datetime
import uuid

admin_invoices_bp = Blueprint('admin_invoices', __name__, url_prefix='/api/admin/invoices')

# Mock data store
MOCK_INVOICES = []

@admin_invoices_bp.route('', methods=['GET'])
@jwt_required()
def get_admin_invoices():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    # Return mock data
    return jsonify({
        'data': {
            'invoices': MOCK_INVOICES,
            'pagination': {
                'total': len(MOCK_INVOICES),
                'page': page,
                'limit': limit,
                'totalPages': 1
            }
        }
    })

@admin_invoices_bp.route('', methods=['POST'])
@jwt_required()
def create_admin_invoice():
    data = request.get_json()
    new_invoice = {
        'id': str(uuid.uuid4()),
        'invoice_number': f"INV-{len(MOCK_INVOICES)+1}",
        'status': 'open',
        'created_at': datetime.utcnow().isoformat(),
        **data
    }
    MOCK_INVOICES.append(new_invoice)
    return jsonify({'data': {'invoice': new_invoice}}), 201

@admin_invoices_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_admin_invoice(id):
    invoice = next((i for i in MOCK_INVOICES if i['id'] == id), None)
    if not invoice:
        return jsonify({'error': 'Invoice not found'}), 404
    return jsonify({'data': {'invoice': invoice}})

@admin_invoices_bp.route('/<id>/payment', methods=['POST'])
@jwt_required()
def record_payment(id):
    invoice = next((i for i in MOCK_INVOICES if i['id'] == id), None)
    if not invoice:
        return jsonify({'error': 'Invoice not found'}), 404
    
    data = request.get_json()
    amount = data.get('amount', 0)
    invoice['paid_amount'] = (invoice.get('paid_amount', 0) + amount)
    if invoice['paid_amount'] >= invoice.get('total', 0):
        invoice['status'] = 'paid'
        
    return jsonify({'data': {'invoice': invoice}})

@admin_invoices_bp.route('/<id>/pdf', methods=['GET'])
@jwt_required()
def get_invoice_pdf(id):
    # Return a dummy PDF
    return jsonify({'message': 'PDF generation not implemented'}), 501
