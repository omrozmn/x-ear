from flask import Blueprint, request, jsonify

from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64

birfatura_bp = Blueprint('birfatura_bp', __name__)

client = BirfaturaClient()


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
