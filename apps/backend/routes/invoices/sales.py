"""
Sale-Invoice Integration Endpoints
----------------------------------
Create invoices from sales transactions.
"""

from flask import request, jsonify
from sqlalchemy import desc
from datetime import datetime
from uuid import uuid4

from models.base import db
from models.invoice import Invoice
from models.sales import Sale
from . import invoices_bp
from utils.decorators import unified_access
from utils.query_policy import get_or_404_scoped
import logging

logger = logging.getLogger(__name__)


def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()


@invoices_bp.route('/sales/<sale_id>/invoice', methods=['POST', 'OPTIONS'])
@unified_access(resource='invoices', action='write')
def create_sale_invoice(ctx, sale_id):
    """Create invoice for a sale - Unified Access"""
    try:
        # Get the sale with tenant scoping
        sale = get_or_404_scoped(ctx, Sale, sale_id)
        if not sale:
            return jsonify({'success': False, 'error': 'Sale not found'}), 404

        # Check if invoice already exists for this sale
        existing_invoice = Invoice.query.filter_by(sale_id=sale_id).first()
        if existing_invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice already exists for this sale',
                'data': existing_invoice.to_dict()
            }), 400

        # Generate invoice number
        year_month = datetime.utcnow().strftime('%Y%m')
        latest = Invoice.query.filter(
            Invoice.invoice_number.like(f'INV{year_month}%')
        ).order_by(desc(Invoice.created_at)).first()
        
        if latest:
            last_num = int(latest.invoice_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1
        
        invoice_number = f"INV{year_month}{new_num:04d}"

        # Get optional data from request
        data = request.get_json() or {}
        invoice_type = data.get('invoiceType', 'standard')
        customer_info = data.get('customerInfo', {})

        # Create invoice from sale data
        invoice = Invoice(
            tenant_id=sale.tenant_id,
            branch_id=sale.branch_id,
            invoice_number=invoice_number,
            patient_id=sale.patient_id,
            sale_id=sale_id,
            device_price=sale.total_amount,
            sgk_coverage=sale.sgk_coverage or 0,
            patient_payment=sale.patient_payment or sale.total_amount,
            invoice_type=invoice_type,
            status='draft',
            created_at=now_utc(),
            updated_at=now_utc()
        )

        # Add custom customer info if provided
        if customer_info:
            invoice.customer_name = customer_info.get('name', sale.patient.name if sale.patient else '')
            invoice.customer_address = customer_info.get('address', '')
            invoice.customer_tax_number = customer_info.get('taxNumber', '')

        db.session.add(invoice)
        db.session.commit()

        logger.info(f"Invoice created for sale {sale_id}: {invoice.id} by {ctx.principal_id}")

        return jsonify({
            'success': True,
            'data': invoice.to_dict(),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create sale invoice error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500
