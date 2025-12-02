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


def _parse_inbox_xml_to_invoice(fpath: str) -> dict:
    """Parse UBL XML file and return InBoxInvoice-like dict."""
    import uuid as uuid_module
    try:
        invoice_data = parse_ubl_xml_to_dict(fpath) if is_ubl_file(fpath) else {}
    except Exception:
        invoice_data = {}
    
    filename = os.path.basename(fpath)
    stat = os.stat(fpath)
    
    # Extract key fields from parsed UBL
    return {
        'uuid': invoice_data.get('uuid') or str(uuid_module.uuid4()),
        'invoiceNo': invoice_data.get('invoice_number', filename.replace('.xml', '')),
        'invoiceDate': invoice_data.get('issue_date', datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d')),
        'invoiceTypeCode': invoice_data.get('invoice_type_code', 'SATIS'),
        'profileId': invoice_data.get('profile_id', 'TEMELFATURA'),
        'senderName': invoice_data.get('supplier_name') or 'Bilinmeyen Gonderici',
        'senderTaxNo': invoice_data.get('supplier_tax_id', ''),
        'receiverName': invoice_data.get('customer_name', ''),
        'receiverTaxNo': invoice_data.get('customer_tax_id', ''),
        'totalAmount': invoice_data.get('payable_amount', 0),
        'taxAmount': invoice_data.get('tax_total', 0),
        'currency': invoice_data.get('currency_code', 'TRY'),
        'isRead': False,
        'createTime': datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'filename': filename,
        # Extra fields for detailed view
        'lineCount': len(invoice_data.get('lines', [])),
        'notes': invoice_data.get('notes', []),
        'accountingCost': invoice_data.get('accounting_cost', ''),
        # SGK specific fields
        'dosyaNo': invoice_data.get('dosya_no', ''),
        'mukellefKodu': invoice_data.get('mukellef_kodu', ''),
        'mukellefAdi': invoice_data.get('mukellef_adi', ''),
    }


@birfatura_bp.route('/api/OutEBelgeV2/GetInBoxDocuments', methods=['POST'])
def out_get_inbox_documents():
    """
    Proxy for Birfatura GetInBoxDocuments.
    In mock mode, reads from local inbox directory and returns parsed invoice list.
    """
    payload = request.get_json() or {}
    
    # Mock mode: read from local inbox
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        inbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox'))
        os.makedirs(inbox_dir, exist_ok=True)
        
        invoices = []
        try:
            for fname in sorted(os.listdir(inbox_dir), reverse=True):
                if fname.endswith('.xml'):
                    fpath = os.path.join(inbox_dir, fname)
                    if os.path.isfile(fpath):
                        inv = _parse_inbox_xml_to_invoice(fpath)
                        invoices.append(inv)
        except Exception as e:
            return jsonify({'Success': False, 'Message': str(e)}), 500
        
        page_number = payload.get('pageNumber', 1)
        page_size = 20
        start = (page_number - 1) * page_size
        end = start + page_size
        
        return jsonify({
            'Success': True,
            'Message': 'Mocked GetInBoxDocuments',
            'Result': {
                'InBoxInvoices': {
                    'total': len(invoices),
                    'limit': page_size,
                    'page': page_number,
                    'objects': invoices[start:end]
                },
                'InBoxReceiptAdvice': {
                    'total': 0,
                    'limit': page_size,
                    'page': page_number,
                    'objects': []
                }
            }
        }), 200
    
    # Production: forward to Birfatura
    try:
        client = BirfaturaClient()
        resp = client.get_inbox_documents(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/GetInBoxDocumentsWithDetail', methods=['POST'])
def out_get_inbox_documents_with_detail():
    """
    Proxy for Birfatura GetInBoxDocumentsWithDetail.
    In mock mode, returns invoice list with jsonData (XML content).
    """
    payload = request.get_json() or {}
    
    # Mock mode: read from local inbox with XML content
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        import base64
        inbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox'))
        os.makedirs(inbox_dir, exist_ok=True)
        
        invoices = []
        try:
            for fname in sorted(os.listdir(inbox_dir), reverse=True):
                if fname.endswith('.xml'):
                    fpath = os.path.join(inbox_dir, fname)
                    if os.path.isfile(fpath):
                        inv = _parse_inbox_xml_to_invoice(fpath)
                        # Add XML content as jsonData (base64 encoded)
                        with open(fpath, 'rb') as f:
                            xml_content = f.read()
                        inv['jsonData'] = base64.b64encode(xml_content).decode('utf-8')
                        invoices.append(inv)
        except Exception as e:
            return jsonify({'Success': False, 'Message': str(e)}), 500
        
        page_number = payload.get('pageNumber', 1)
        page_size = 20
        start = (page_number - 1) * page_size
        end = start + page_size
        
        return jsonify({
            'Success': True,
            'Message': 'Mocked GetInBoxDocumentsWithDetail',
            'Result': {
                'InBoxInvoices': {
                    'total': len(invoices),
                    'limit': page_size,
                    'page': page_number,
                    'objects': invoices[start:end]
                },
                'InBoxReceiptAdvice': {
                    'total': 0,
                    'limit': page_size,
                    'page': page_number,
                    'objects': []
                }
            }
        }), 200
    
    # Production: forward to Birfatura
    try:
        client = BirfaturaClient()
        resp = client.get_inbox_documents_with_detail(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/PreviewDocumentReturnPDF', methods=['POST'])
def out_preview_document_return_pdf():
    """
    Proxy for Birfatura PreviewDocumentReturnPDF.
    In mock mode, generates PDF from provided XML.
    """
    payload = request.get_json() or {}
    
    # Mock mode: generate PDF from XML
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        import base64
        import gzip
        
        document_bytes = payload.get('documentBytes')
        if not document_bytes:
            return jsonify({'Success': False, 'Message': 'documentBytes required'}), 400
        
        try:
            # Decode and decompress if needed
            xml_bytes = base64.b64decode(document_bytes)
            try:
                xml_content = gzip.decompress(xml_bytes).decode('utf-8')
            except Exception:
                xml_content = xml_bytes.decode('utf-8')
            
            # Parse and render to PDF
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.xml', delete=False) as tf:
                tf.write(xml_content.encode('utf-8'))
                tf.flush()
                if is_ubl_file(tf.name):
                    invoice_data = parse_ubl_xml_to_dict(tf.name)
                else:
                    invoice_data = {}
                os.unlink(tf.name)
            
            pdf_bytes = render_invoice_to_pdf(invoice_data)
            pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            return jsonify({
                'Success': True,
                'Message': 'Mocked PreviewDocumentReturnPDF',
                'Result': {
                    'zipped': pdf_b64
                }
            }), 200
        except Exception as e:
            return jsonify({'Success': False, 'Message': f'pdf-error: {e}'}), 500
    
    # Production: forward to Birfatura
    try:
        client = BirfaturaClient()
        resp = client.preview_document_pdf(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/DocumentDownloadByUUID', methods=['POST'])
def out_document_download_by_uuid():
    """
    Proxy for Birfatura DocumentDownloadByUUID.
    In mock mode, returns document from local inbox by UUID.
    """
    payload = request.get_json() or {}
    
    document_uuid = payload.get('documentUUID')
    file_extension = payload.get('fileExtension', 'XML')
    
    if not document_uuid:
        return jsonify({'Success': False, 'Message': 'documentUUID required'}), 400
    
    # Mock mode: find file in inbox
    if os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
        import base64
        import gzip
        
        inbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_inbox'))
        
        # Search for file with matching UUID
        found_path = None
        try:
            for fname in os.listdir(inbox_dir):
                if fname.endswith('.xml'):
                    fpath = os.path.join(inbox_dir, fname)
                    inv = _parse_inbox_xml_to_invoice(fpath)
                    if inv.get('uuid') == document_uuid:
                        found_path = fpath
                        break
        except Exception:
            pass
        
        if not found_path:
            return jsonify({'Success': False, 'Message': 'Document not found'}), 404
        
        try:
            with open(found_path, 'rb') as f:
                content = f.read()
            
            if file_extension.upper() == 'PDF':
                if is_ubl_file(found_path):
                    invoice_data = parse_ubl_xml_to_dict(found_path)
                else:
                    invoice_data = {}
                content = render_invoice_to_pdf(invoice_data)
            
            # Compress and encode
            compressed = gzip.compress(content)
            content_b64 = base64.b64encode(compressed).decode('utf-8')
            
            return jsonify({
                'Success': True,
                'Message': 'Mocked DocumentDownloadByUUID',
                'Result': {
                    'content': content_b64
                }
            }), 200
        except Exception as e:
            return jsonify({'Success': False, 'Message': f'download-error: {e}'}), 500
    
    # Production: forward to Birfatura
    try:
        client = BirfaturaClient()
        resp = client.document_download_by_uuid(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502
