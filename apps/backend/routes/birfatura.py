from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta

from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64
from services.birfatura.invoice_sync import InvoiceSyncService

birfatura_bp = Blueprint('birfatura_bp', __name__)

client = BirfaturaClient()
sync_service = InvoiceSyncService()


@birfatura_bp.route('/api/EFatura/sendDocument', methods=['POST'])
def send_document():
    payload = request.get_json() or {}

    if 'xml' in payload:
        content_b64 = invoice_xml_to_base64(payload['xml'])
        body = {
            'fileName': payload.get('filename', 'document.xml'),
            'documentBase64': content_b64,
        }
    elif 'base64' in payload:
        body = {
            'fileName': payload.get('filename', 'document.xml'),
            'documentBase64': payload['base64'],
        }
    else:
        return jsonify({'success': False, 'error': 'Missing xml or base64 field'}), 400

    try:
        resp = client.send_document(body)
        return jsonify({'success': True, 'data': resp}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 502


@birfatura_bp.route('/api/EFatura/sendBasicInvoice', methods=['POST'])
def send_basic_invoice():
    invoice = request.get_json() or {}
    body = invoice_to_basic_model(invoice)
    try:
        resp = client.send_basic_invoice(body)
        return jsonify({'success': True, 'data': resp}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 502


@birfatura_bp.route('/api/EFatura/Create', methods=['POST'])
def create_invoice():
    """Create invoice (draft mode, not sent to GİB yet)"""
    payload = request.get_json() or {}
    try:
        resp = client.create_invoice(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/EFatura/Retry/<invoice_id>', methods=['POST'])
def retry_invoice(invoice_id: str):
    """Retry sending a failed invoice to GİB"""
    try:
        resp = client.retry_invoice(invoice_id)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/EFatura/Cancel/<invoice_id>', methods=['POST'])
def cancel_invoice(invoice_id: str):
    """Cancel an invoice (send cancellation to GİB)"""
    payload = request.get_json() or {}
    reason = payload.get('reason', None)
    try:
        resp = client.cancel_invoice(invoice_id, reason)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


# Provider-shaped proxy endpoints used by the Orval-generated client in the frontend.
# These endpoints accept the same JSON shape the generated client sends and forward
# the requests to the BirFatura provider using `BirfaturaClient` which injects
# credentials from environment variables.
@birfatura_bp.route('/api/OutEBelgeV2/SendDocument', methods=['POST'])
def out_send_document():
    payload = request.get_json() or {}
    try:
        resp = client.send_document(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/SendBasicInvoiceFromModel', methods=['POST'])
def out_send_basic_invoice_from_model():
    payload = request.get_json() or {}
    try:
        resp = client.send_basic_invoice(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/birfatura/sync-invoices', methods=['POST'])
def sync_invoices():
    """Sync invoices from BirFatura API"""
    payload = request.get_json() or {}
    
    # Parse date parameters
    start_date = None
    end_date = None
    
    if 'start_date' in payload:
        try:
            start_date = datetime.fromisoformat(payload['start_date'])
        except (ValueError, TypeError):
            pass
    
    if 'end_date' in payload:
        try:
            end_date = datetime.fromisoformat(payload['end_date'])
        except (ValueError, TypeError):
            pass
    
    try:
        stats = sync_service.sync_invoices(start_date, end_date)
        return jsonify({
            'success': True,
            'imported': stats
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
