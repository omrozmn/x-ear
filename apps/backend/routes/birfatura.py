from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import os

from services.birfatura.service import BirfaturaClient
from services.birfatura.mappers import invoice_to_basic_model, invoice_xml_to_base64
from services.birfatura.invoice_sync import InvoiceSyncService
from models.user import User
from models.tenant import Tenant
from models.integration_config import IntegrationConfig
from models.base import db
from utils.decorators import unified_access
from utils.response import success_response, error_response

birfatura_bp = Blueprint('birfatura_bp', __name__)

sync_service = InvoiceSyncService()

def get_configured_client(tenant_id):
    """
    Get BirFatura client configured for the specific tenant.
    """
    if not tenant_id:
        raise ValueError("Tenant context required")
        
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")

    tenant_invoice_settings = (tenant.settings or {}).get('invoice_integration', {})
    tenant_api_key = tenant_invoice_settings.get('api_key')
    tenant_secret_key = tenant_invoice_settings.get('secret_key')
    
    integration_key_config = IntegrationConfig.query.filter_by(
        integration_type='birfatura', 
        config_key='integration_key'
    ).first()
    global_integration_key = integration_key_config.config_value if integration_key_config else None

    # Check credentials in non-mock env
    using_mock = os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production'
    if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_integration_key):
             raise ValueError("Missing BirFatura credentials. Please configure Invoice Integration settings.")
             
    return BirfaturaClient(
        api_key=tenant_api_key,
        secret_key=tenant_secret_key,
        integration_key=global_integration_key
    )

@birfatura_bp.route('/api/EFatura/sendDocument', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def send_document(ctx):
    if not ctx.tenant_id:
        return error_response("Tenant context required", code='TENANT_REQUIRED', status_code=400)

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
        return error_response('Missing xml or base64 field', code='INVALID_PAYLOAD', status_code=400)

    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.send_document(body)
        return success_response(data=resp)
    except Exception as e:
        return error_response(str(e), code='INTEGRATION_ERROR', status_code=502)


@birfatura_bp.route('/api/EFatura/sendBasicInvoice', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def send_basic_invoice(ctx):
    if not ctx.tenant_id:
        return error_response("Tenant context required", code='TENANT_REQUIRED', status_code=400)

    invoice = request.get_json() or {}
    body = invoice_to_basic_model(invoice)
    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.send_basic_invoice(body)
        return success_response(data=resp)
    except Exception as e:
        return error_response(str(e), code='INTEGRATION_ERROR', status_code=502)


@birfatura_bp.route('/api/EFatura/Create', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def create_invoice(ctx):
    """Create invoice (draft mode, not sent to GİB yet)"""
    if not ctx.tenant_id:
        return jsonify({'Success': False, 'Message': 'Tenant context required'}), 400

    payload = request.get_json() or {}
    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.create_invoice(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/EFatura/Retry/<invoice_id>', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def retry_invoice(ctx, invoice_id: str):
    """Retry sending a failed invoice to GİB"""
    if not ctx.tenant_id:
        return jsonify({'Success': False, 'Message': 'Tenant context required'}), 400

    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.retry_invoice(invoice_id)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/EFatura/Cancel/<invoice_id>', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def cancel_invoice(ctx, invoice_id: str):
    """Cancel an invoice (send cancellation to GİB)"""
    if not ctx.tenant_id:
        return jsonify({'Success': False, 'Message': 'Tenant context required'}), 400

    payload = request.get_json() or {}
    reason = payload.get('reason', None)
    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.cancel_invoice(invoice_id, reason)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


# Provider-shaped proxy endpoints used by the Orval-generated client in the frontend.
@birfatura_bp.route('/api/OutEBelgeV2/SendDocument', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def out_send_document(ctx):
    if not ctx.tenant_id:
        return jsonify({'Success': False, 'Message': 'Tenant context required'}), 400

    payload = request.get_json() or {}
    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.send_document(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/OutEBelgeV2/SendBasicInvoiceFromModel', methods=['POST'])
@unified_access(resource='integration.birfatura', action='write')
def out_send_basic_invoice_from_model(ctx):
    if not ctx.tenant_id:
        return jsonify({'Success': False, 'Message': 'Tenant context required'}), 400

    payload = request.get_json() or {}
    try:
        client = get_configured_client(ctx.tenant_id)
        resp = client.send_basic_invoice(payload)
        return jsonify(resp), 200
    except Exception as e:
        return jsonify({'Success': False, 'Message': str(e)}), 502


@birfatura_bp.route('/api/birfatura/sync-invoices', methods=['POST'])
@unified_access(resource='integration.birfatura', action='sync')
def sync_invoices(ctx):
    """Sync invoices from BirFatura API"""
    if not ctx.tenant_id:
        return error_response("Tenant context required", code='TENANT_REQUIRED', status_code=400)

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
        # sync_invoices now correctly initializes its own client using the passed tenant_id
        stats = sync_service.sync_invoices(ctx.tenant_id, start_date, end_date)
        return success_response({
            'imported': stats
        })
    except Exception as e:
        return error_response(str(e), code='SYNC_FAILED', status_code=500)
