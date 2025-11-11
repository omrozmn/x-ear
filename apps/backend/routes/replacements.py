from flask import Blueprint, request, jsonify
import uuid
from apps.backend.models.replacement import Replacement
from apps.backend import db
from datetime import datetime

bp = Blueprint('replacements', __name__, url_prefix='/api/replacements')


@bp.route('', methods=['POST'])
def create_replacement():
    data = request.get_json() or {}
    replacement_id = data.get('id') or f"REPL-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}"
    r = Replacement(
        id=replacement_id,
        patient_id=data.get('patientId') or data.get('patient_id'),
        sale_id=data.get('saleId') or data.get('sale_id'),
        old_device_id=data.get('oldDeviceId') or data.get('old_device_id'),
        new_device_id=data.get('newDeviceId') or data.get('new_device_id'),
        old_device_info=data.get('oldDeviceInfo') or data.get('old_device_info'),
        new_device_info=data.get('newDeviceInfo') or data.get('new_device_info'),
        replacement_reason=data.get('replacementReason') or data.get('replacement_reason'),
        status='pending',
        price_difference=data.get('priceDifference') or data.get('price_difference'),
        return_invoice_id=None,
        return_invoice_status=None,
        gib_sent=False,
        created_by=data.get('createdBy') or 'system',
        notes=data.get('notes')
    )

    db.session.add(r)
    db.session.commit()

    return jsonify({'success': True, 'data': r.to_dict()})


@bp.route('/<replacement_id>', methods=['GET'])
def get_replacement(replacement_id):
    r = Replacement.query.get(replacement_id)
    if not r:
        return jsonify({'success': False, 'error': 'Replacement not found'}), 404
    return jsonify({'success': True, 'data': r.to_dict()})


@bp.route('/<replacement_id>/status', methods=['PATCH'])
def patch_replacement_status(replacement_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    notes = data.get('notes')
    r = Replacement.query.get(replacement_id)
    if not r:
        return jsonify({'success': False, 'error': 'Replacement not found'}), 404
    r.status = new_status or r.status
    if notes:
        r.notes = (r.notes or '') + '\n' + notes
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'data': r.to_dict()})
from flask import Blueprint, request, jsonify
from models.base import db
from models.device_replacement import DeviceReplacement, ReturnInvoice
from datetime import datetime
import logging
import time

logger = logging.getLogger(__name__)

replacements_bp = Blueprint('replacements', __name__, url_prefix='/api')


@replacements_bp.route('/patients/<patient_id>/replacements', methods=['GET'])
def get_patient_replacements(patient_id):
    """Get all device replacements for a patient"""
    try:
        replacements = DeviceReplacement.query.filter_by(patient_id=patient_id).order_by(DeviceReplacement.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [r.to_dict() for r in replacements],
            'count': len(replacements),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get patient replacements error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@replacements_bp.route('/patients/<patient_id>/replacements', methods=['POST'])
def create_replacement(patient_id):
    """Create a new device replacement"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['oldDeviceId', 'newInventoryId', 'oldDeviceInfo', 'newDeviceInfo']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Generate ID
        replacement_id = f"REPL-{int(time.time() * 1000)}"
        
        # Create replacement
        replacement = DeviceReplacement(
            id=replacement_id,
            patient_id=patient_id,
            old_device_id=data['oldDeviceId'],
            new_inventory_id=data['newInventoryId'],
            old_device_info=data['oldDeviceInfo'],
            new_device_info=data['newDeviceInfo'],
            status='pending_invoice'
        )
        
        db.session.add(replacement)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': replacement.to_dict(),
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create replacement error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@replacements_bp.route('/replacements/<replacement_id>/invoice', methods=['POST'])
def create_return_invoice(replacement_id):
    """Create return invoice for a replacement"""
    try:
        data = request.get_json()
        
        # Get replacement
        replacement = db.session.get(DeviceReplacement, replacement_id)
        if not replacement:
            return jsonify({
                'success': False,
                'error': 'Replacement not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Check if invoice already exists
        if replacement.return_invoice:
            return jsonify({
                'success': False,
                'error': 'Return invoice already exists for this replacement',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Validate required fields
        required_fields = ['invoiceNumber', 'supplierInvoiceNumber']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Generate ID
        invoice_id = f"RET-INV-{int(time.time() * 1000)}"
        
        # Create return invoice
        invoice = ReturnInvoice(
            id=invoice_id,
            replacement_id=replacement_id,
            invoice_number=data['invoiceNumber'],
            supplier_name=data.get('supplierName'),
            supplier_invoice_id=data.get('supplierInvoiceId'),
            supplier_invoice_number=data['supplierInvoiceNumber'],
            supplier_invoice_date=datetime.fromisoformat(data['supplierInvoiceDate']) if data.get('supplierInvoiceDate') else None,
            invoice_note=data.get('invoiceNote'),
            gib_sent=False
        )
        
        # Update replacement status
        replacement.status = 'invoice_created'
        
        db.session.add(invoice)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'invoice': invoice.to_dict(),
                'replacement': replacement.to_dict()
            },
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create return invoice error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@replacements_bp.route('/return-invoices/<invoice_id>/send-to-gib', methods=['POST'])
def send_invoice_to_gib(invoice_id):
    """Mark invoice as sent to GIB"""
    try:
        invoice = db.session.get(ReturnInvoice, invoice_id)
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        if invoice.gib_sent:
            return jsonify({
                'success': False,
                'error': 'Invoice already sent to GIB',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Update invoice
        invoice.gib_sent = True
        invoice.gib_sent_date = datetime.now()
        
        # Update replacement status
        replacement = invoice.replacement
        replacement.status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'invoice': invoice.to_dict(),
                'replacement': replacement.to_dict()
            },
            'message': 'Invoice sent to GIB successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Send invoice to GIB error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
