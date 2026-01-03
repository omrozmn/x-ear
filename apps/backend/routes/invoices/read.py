"""
Invoices Read Operations
------------------------
GET endpoints for invoice listing and retrieval.
All endpoints use @unified_access for tenant scoping.
"""

from flask import request, jsonify
from sqlalchemy import desc
from datetime import datetime
from models.base import db
from models.invoice import Invoice
from models.patient import Patient
from . import invoices_bp
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query, get_or_404_scoped
import logging

logger = logging.getLogger(__name__)


def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()


@invoices_bp.route('/invoices', methods=['GET'])
@unified_access(resource='invoices', action='read')
def get_invoices(ctx):
    """Get all invoices with pagination - Unified Access"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Invoice)
        
        # Hide soft-deleted invoices
        query = query.filter(Invoice.status != 'deleted')
        
        # Branch filtering for Tenant Admins
        if ctx.is_tenant_admin and ctx._principal and ctx._principal.user:
            user = ctx._principal.user
            if user.role == 'admin':
                user_branch_ids = [b.id for b in user.branches] if hasattr(user, 'branches') else []
                if user_branch_ids:
                    query = query.filter(Invoice.branch_id.in_(user_branch_ids))
                else:
                    return jsonify({
                        'success': True,
                        'data': [],
                        'meta': {
                            'page': page,
                            'perPage': per_page,
                            'total': 0,
                            'totalPages': 0
                        },
                        'timestamp': datetime.now().isoformat()
                    })
        
        # Apply filters if provided
        status = request.args.get('status')
        if status:
            query = query.filter(Invoice.status == status)
        
        patient_id = request.args.get('patient_id')
        if patient_id:
            query = query.filter(Invoice.patient_id == patient_id)
        
        # Order by creation date
        query = query.order_by(desc(Invoice.created_at))
        
        # Paginate
        invoices_paginated = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [invoice.to_dict() for invoice in invoices_paginated.items],
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': invoices_paginated.total,
                'totalPages': invoices_paginated.pages
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Get invoices error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
@unified_access(resource='invoices', action='read')
def get_invoice(ctx, invoice_id):
    """Get a specific invoice - Unified Access"""
    try:
        # Get invoice with tenant scoping
        invoice = get_or_404_scoped(ctx, Invoice, invoice_id)
        
        if not invoice or getattr(invoice, 'status', None) == 'deleted':
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404
        
        return jsonify({
            'success': True,
            'data': invoice.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Get invoice error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@invoices_bp.route('/patients/<patient_id>/invoices', methods=['GET'])
@unified_access(resource='invoices', action='read')
def get_patient_invoices(ctx, patient_id):
    """Get all invoices for a patient - Unified Access"""
    try:
        # Verify patient exists with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        
        # Get invoices with tenant scoping
        query = tenant_scoped_query(ctx, Invoice).filter_by(patient_id=patient_id)
        invoices = query.order_by(desc(Invoice.created_at)).all()
        
        return jsonify({
            'success': True,
            'data': [inv.to_dict() for inv in invoices]
        })
        
    except Exception as e:
        logger.error(f"Get patient invoices error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500
