from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import os
from models.base import db
from models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64
from services.birfatura.invoice_sync import InvoiceSyncService
from utils.ubl_utils import is_ubl_file, parse_ubl_xml_to_dict
from utils.pdf_renderer import render_invoice_to_pdf

birfatura_bp = Blueprint('birfatura_bp', __name__)

# Create InvoiceSyncService once (stateless/shared)
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

    # Dev-mode mock: return a simulated success without calling provider
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        return jsonify({'success': True, 'data': {'Message': 'Mocked sendDocument', 'Received': body}}), 200

    try:
        client = BirfaturaClient()
        resp = client.send_document(body)
        return jsonify({'success': True, 'data': resp}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 502


@birfatura_bp.route('/api/EFatura/sendBasicInvoice', methods=['POST'])
def send_basic_invoice():
    invoice = request.get_json() or {}
    body = invoice_to_basic_model(invoice)
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        return jsonify({'success': True, 'data': {'Message': 'Mocked sendBasicInvoice', 'Received': body}}), 200

    try:
        client = BirfaturaClient()
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
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        return jsonify({'Success': True, 'Message': 'Mocked out_send_document', 'Received': payload}), 200

    try:
        client = BirfaturaClient()
        resp = client.send_document(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/SendBasicInvoiceFromModel', methods=['POST'])
def out_send_basic_invoice_from_model():
    payload = request.get_json() or {}
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        return jsonify({'Success': True, 'Message': 'Mocked out_send_basic_invoice_from_model', 'Received': payload}), 200

    try:
        client = BirfaturaClient()
        resp = client.send_basic_invoice(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/birfatura/sync-invoices', methods=['POST'])
@jwt_required()
def sync_invoices():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401

    payload = request.get_json() or {}

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
        stats = sync_service.sync_invoices(user.tenant_id, start_date, end_date)
        request_id = request.headers.get('X-Request-ID')
        return jsonify({
            'success': True,
            'data': {
                'imported': stats
            },
            'requestId': request_id,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        request_id = request.headers.get('X-Request-ID')
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': request_id,
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@birfatura_bp.route('/api/OutEBelgeV2/ReceiveDocument', methods=['POST'])
def out_receive_document():
    """
    Simple inbox simulator endpoint: accepts JSON with `xml` or `documentBase64` (or raw body)
    and writes the XML to `instance/birfatura_inbox/` with a provided `filename` or timestamped name.
    """
    payload = None
    try:
        payload = request.get_json(silent=True)
    except Exception:
        payload = None

    xml_content = None
    filename = None

    if isinstance(payload, dict):
        if 'xml' in payload:
            xml_content = payload.get('xml')
        elif 'documentBase64' in payload:
            import base64
            try:
                xml_content = base64.b64decode(payload.get('documentBase64')).decode('utf-8')
            except Exception:
                xml_content = None
        elif 'base64' in payload:
            import base64
            try:
                xml_content = base64.b64decode(payload.get('base64')).decode('utf-8')
            except Exception:
                xml_content = None
        filename = payload.get('filename') or payload.get('fileName')

    # fallback to raw body (allow client to POST XML directly)
    if not xml_content and request.data:
        try:
            xml_content = request.data.decode('utf-8')
        except Exception:
            xml_content = None

    if not xml_content:
        return jsonify({'Success': False, 'Message': 'No xml or base64 payload provided'}), 400

    # ensure inbox dir exists
    inbox_dir = os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox')
    try:
        os.makedirs(inbox_dir, exist_ok=True)
    except Exception:
        pass

    if not filename:
        filename = f"inbox-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.xml"

    safe_name = filename.replace('/', '_').replace('\\', '_')
    out_path = os.path.join(inbox_dir, safe_name)
    try:
        with open(out_path, 'wb') as f:
            f.write(xml_content.encode('utf-8'))
    except Exception as e:
        return jsonify({'Success': False, 'Message': f'write-error: {e}'}), 500

    # Dev-mode echo
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        return jsonify({'Success': True, 'Message': 'Mocked receive_document', 'SavedPath': out_path}), 200

    return jsonify({'Success': True, 'Message': 'Received', 'SavedPath': out_path}), 200


@birfatura_bp.route('/api/birfatura/inbox/list', methods=['GET'])
def birfatura_inbox_list():
    """List files saved in the birfatura_inbox directory."""
    inbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox'))
    os.makedirs(inbox_dir, exist_ok=True)
    files = []
    try:
        for fname in sorted(os.listdir(inbox_dir)):
            fpath = os.path.join(inbox_dir, fname)
            if os.path.isfile(fpath):
                stat = os.stat(fpath)
                files.append({'filename': fname, 'size': stat.st_size, 'mtime': stat.st_mtime})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    return jsonify({'success': True, 'data': files}), 200


@birfatura_bp.route('/api/birfatura/inbox/file', methods=['GET'])
def birfatura_inbox_file():
    """Return raw XML or rendered PDF for a given inbox filename.

    Query params:
      - name: filename in the inbox directory (required)
      - format: 'xml' (default) or 'pdf'
    """
    name = request.args.get('name')
    fmt = request.args.get('format', 'xml')
    if not name:
        return jsonify({'success': False, 'error': 'name parameter required'}), 400

    inbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox'))
    fpath = os.path.join(inbox_dir, name)
    if not os.path.exists(fpath) or not os.path.isfile(fpath):
        return jsonify({'success': False, 'error': 'file not found'}), 404

    try:
        if fmt == 'xml':
            with open(fpath, 'rb') as f:
                data = f.read()
            return (data, 200, {
                'Content-Type': 'application/xml',
                'Content-Disposition': f'attachment; filename="{name}"'
            })
        elif fmt == 'pdf':
            # attempt to parse as UBL and render to PDF
            try:
                if is_ubl_file(fpath):
                    invoice_data = parse_ubl_xml_to_dict(fpath)
                else:
                    invoice_data = None
                pdf_bytes = render_invoice_to_pdf(invoice_data or {})
                return (pdf_bytes, 200, {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': f'inline; filename="{os.path.splitext(name)[0]}.pdf"'
                })
            except Exception as e:
                return jsonify({'success': False, 'error': f'pdf-render-error: {e}'}), 500
        else:
            return jsonify({'success': False, 'error': 'unsupported format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
