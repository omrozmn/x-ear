"""
Invoice Print Queue Operations
------------------------------
Print queue management for invoices.
"""

from flask import jsonify, request
from datetime import datetime
from uuid import uuid4

from models.base import db
from models.invoice import Invoice
from . import invoices_bp
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query
import logging

logger = logging.getLogger(__name__)


def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()


@invoices_bp.route('/invoices/print-queue', methods=['GET'])
@unified_access(resource='invoices', action='read')
def get_print_queue(ctx):
    """Get invoices in print queue - Unified Access"""
    try:
        # Query invoices with 'queued_for_print' status
        query = tenant_scoped_query(ctx, Invoice).filter_by(status='queued_for_print')
        queued_invoices = query.all()
        
        queue_items = []
        for invoice in queued_invoices:
            queue_items.append({
                'id': invoice.id,
                'invoiceNumber': invoice.invoice_number,
                'patientName': invoice.patient.name if invoice.patient else 'Unknown',
                'amount': invoice.device_price,
                'queuedAt': invoice.updated_at.isoformat() if invoice.updated_at else invoice.created_at.isoformat(),
                'priority': 'normal',
                'copies': 1
            })
        
        return jsonify({
            'success': True,
            'data': {
                'items': queue_items,
                'total': len(queue_items),
                'status': 'ready' if queue_items else 'empty'
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get print queue error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/print-queue', methods=['POST'])
@unified_access(resource='invoices', action='write')
def add_to_print_queue(ctx):
    """Add invoices to print queue - Unified Access"""
    try:
        data = request.get_json()
        
        if not data.get('invoiceIds') or not isinstance(data['invoiceIds'], list):
            return jsonify({
                'success': False,
                'error': 'invoiceIds array is required'
            }), 400
        
        invoice_ids = data['invoiceIds']
        priority = data.get('priority', 'normal')
        copies = data.get('copies', 1)
        
        updated_invoices = []
        errors = []
        
        for invoice_id in invoice_ids:
            try:
                invoice = db.session.get(Invoice, invoice_id)
                if not invoice:
                    errors.append(f"Invoice {invoice_id} not found")
                    continue
                
                # Tenant check
                if ctx.tenant_id and invoice.tenant_id != ctx.tenant_id:
                    errors.append(f"Invoice {invoice_id} not found")
                    continue
                
                # Update status to queued for print
                invoice.status = 'queued_for_print'
                invoice.updated_at = now_utc()
                
                updated_invoices.append({
                    'id': invoice.id,
                    'invoiceNumber': invoice.invoice_number,
                    'status': invoice.status,
                    'priority': priority,
                    'copies': copies
                })
                
            except Exception as e:
                errors.append(f"Error queuing invoice {invoice_id}: {str(e)}")
        
        db.session.commit()
        
        logger.info(f"Print queue updated: {len(updated_invoices)} invoices by {ctx.principal_id}")
        
        return jsonify({
            'success': True,
            'data': {
                'queuedInvoices': updated_invoices,
                'errors': errors,
                'summary': {
                    'total': len(invoice_ids),
                    'successful': len(updated_invoices),
                    'failed': len(errors)
                }
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add to print queue error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500
