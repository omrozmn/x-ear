"""
Suggested Suppliers Operations
------------------------------
Manages suggested supplier proposals from invoice imports.
"""

from flask import request, jsonify
from datetime import datetime
from models.base import db
from models.suppliers import Supplier
from models.purchase_invoice import PurchaseInvoice, SuggestedSupplier
from . import suppliers_bp
from utils.decorators import unified_access
from utils.idempotency import idempotent
from utils.optimistic_locking import with_transaction
import logging

logger = logging.getLogger(__name__)


@suppliers_bp.route('/suppliers/suggested', methods=['GET'])
@unified_access(resource='suppliers', action='read')
def get_suggested_suppliers(ctx):
    """Get all suggested suppliers (pending approval) - Unified Access"""
    try:
        # Build query with tenant scoping
        query = SuggestedSupplier.query.filter_by(status='PENDING')
        
        # Apply tenant filter if not super admin
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        suggested = query.order_by(
            SuggestedSupplier.last_invoice_date.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'suggestedSuppliers': [s.to_dict() for s in suggested]
        }), 200
        
    except Exception as e:
        logger.error(f"Get suggested suppliers error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/suggested/<int:suggested_id>/accept', methods=['POST'])
@unified_access(resource='suppliers', action='write')
@idempotent(methods=['POST'])
@with_transaction
def accept_suggested_supplier(ctx, suggested_id):
    """Accept a suggested supplier and create a new supplier record - Unified Access"""
    try:
        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested:
            return jsonify({'success': False, 'error': 'Suggested supplier not found'}), 404
        
        # Tenant check for non-super-admins
        if ctx.tenant_id and hasattr(suggested, 'tenant_id') and suggested.tenant_id != ctx.tenant_id:
            return jsonify({'success': False, 'error': 'Suggested supplier not found'}), 404
        
        # Check if already accepted
        if suggested.status == 'ACCEPTED':
            return jsonify({
                'success': False,
                'error': 'Supplier already accepted',
                'supplier': suggested.supplier.to_dict() if suggested.supplier else None
            }), 400
        
        # Determine tenant for the new supplier
        tenant_id = ctx.tenant_id or getattr(suggested, 'tenant_id', None)
        if not tenant_id:
            return jsonify({'error': 'Could not determine tenant for supplier'}), 400
        
        # Check if a supplier with this tax number already exists
        existing = db.session.query(Supplier).filter_by(
            tenant_id=tenant_id,
            tax_number=suggested.tax_number
        ).first()
        
        if existing:
            # Link to existing supplier
            suggested.status = 'ACCEPTED'
            suggested.supplier_id = existing.id
            suggested.accepted_at = datetime.now()
            
            # Update all invoices
            PurchaseInvoice.query.filter_by(
                sender_tax_number=suggested.tax_number
            ).update({
                'supplier_id': existing.id,
                'is_matched': True
            })
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'supplier': existing.to_dict(),
                'note': 'Linked to existing supplier'
            }), 200
        
        # Create new supplier
        supplier = Supplier(
            tenant_id=tenant_id,
            company_name=suggested.company_name,
            tax_number=suggested.tax_number,
            tax_office=suggested.tax_office,
            address=suggested.address,
            city=suggested.city,
            is_active=True
        )
        db.session.add(supplier)
        db.session.flush()  # Get ID
        
        # Update suggested supplier
        suggested.status = 'ACCEPTED'
        suggested.supplier_id = supplier.id
        suggested.accepted_at = datetime.now()
        
        # Update all related invoices
        PurchaseInvoice.query.filter_by(
            sender_tax_number=suggested.tax_number
        ).update({
            'supplier_id': supplier.id,
            'is_matched': True
        })
        
        db.session.commit()
        
        logger.info(f"Suggested supplier accepted: {suggested_id} -> supplier {supplier.id}")
        
        return jsonify({
            'success': True,
            'supplier': supplier.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Accept suggested supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@suppliers_bp.route('/suppliers/suggested/<int:suggested_id>', methods=['DELETE'])
@unified_access(resource='suppliers', action='delete')
def reject_suggested_supplier(ctx, suggested_id):
    """Reject/delete a suggested supplier - Unified Access"""
    try:
        suggested = db.session.get(SuggestedSupplier, suggested_id)
        if not suggested:
            return jsonify({'error': 'Suggested supplier not found'}), 404
        
        # Tenant check for non-super-admins
        if ctx.tenant_id and hasattr(suggested, 'tenant_id') and suggested.tenant_id != ctx.tenant_id:
            return jsonify({'error': 'Suggested supplier not found'}), 404
        
        # Mark as rejected instead of deleting (for audit trail)
        suggested.status = 'REJECTED'
        db.session.commit()
        
        logger.info(f"Suggested supplier rejected: {suggested_id}")
        
        return jsonify({
            'success': True,
            'message': 'Suggested supplier rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reject suggested supplier error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
