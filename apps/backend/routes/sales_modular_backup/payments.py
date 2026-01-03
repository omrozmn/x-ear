"""
Sales Payments Operations - Unified Access
------------------------------------------
Payment-related endpoints for sales
"""

from flask import request, jsonify
from models.base import db
from models.sales import Sale, PaymentRecord, PaymentPlan, PaymentInstallment
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
from datetime import datetime
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

from . import sales_bp

@sales_bp.route('/sales/<sale_id>/payments', methods=['GET'])
@unified_access(resource='sales', action='read')
def get_sale_payments(ctx, sale_id):
    """
    Get all payments for a specific sale.
    
    Access:
    - Tenant scoped
    """
    try:
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response("Sale not found", code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        # Get all payment records for this sale
        payments = PaymentRecord.query.filter_by(sale_id=sale_id)\
            .order_by(PaymentRecord.payment_date.desc()).all()
        
        payment_data = []
        for payment in payments:
            payment_dict = {
                'id': payment.id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'dueDate': payment.due_date.isoformat() if payment.due_date else None,
                'paymentMethod': payment.payment_method,
                'paymentType': payment.payment_type,
                'status': payment.status,
                'referenceNumber': payment.reference_number,
                'notes': payment.notes,
                'promissoryNoteId': payment.promissory_note_id,
                'createdAt': payment.created_at.isoformat() if payment.created_at else None,
                'updatedAt': payment.updated_at.isoformat() if payment.updated_at else None
            }
            payment_data.append(payment_dict)
        
        # Calculate payment summary
        total_paid = sum(float(p.amount) for p in payments if p.status == 'paid')
        total_pending = sum(float(p.amount) for p in payments if p.status == 'pending')
        remaining_balance = float(sale.total_amount) - total_paid
        
        return success_response(
            data={
                'payments': payment_data,
                'summary': {
                    'totalAmount': float(sale.total_amount),
                    'totalPaid': total_paid,
                    'totalPending': total_pending,
                    'remainingBalance': remaining_balance,
                    'paymentCount': len(payments)
                }
            },
            meta={'saleId': sale_id, 'tenantScope': ctx.tenant_id}
        )
        
    except Exception as e:
        logger.error(f"Get sale payments error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PAYMENTS_READ_ERROR', status_code=500)


@sales_bp.route('/sales/<sale_id>/payments', methods=['POST'])
@unified_access(resource='sales', action='write')
@idempotent(methods=['POST'])
def create_sale_payment(ctx, sale_id):
    """
    Record a new payment for a sale.
    
    Access:
    - Tenant scoped
    - Requires write permission
    """
    try:
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response("Sale not found", code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        # Create payment record
        payment = PaymentRecord(
            id=str(uuid4()),
            sale_id=sale_id,
            amount=data.get('amount', 0),
            payment_date=datetime.utcnow(),
            payment_method=data.get('payment_method') or data.get('paymentMethod'),
            payment_type=data.get('payment_type') or data.get('paymentType', 'full'),
            status='paid',
            reference_number=data.get('reference_number') or data.get('referenceNumber'),
            notes=data.get('notes'),
            created_by=ctx.principal_id
        )
        
        db.session.add(payment)
        db.session.commit()
        
        logger.info(f"Payment created for sale {sale_id}: {payment.id}")
        
        return success_response(
            data=payment.to_dict() if hasattr(payment, 'to_dict') else {'id': payment.id},
            meta={'saleId': sale_id, 'paymentId': payment.id},
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create payment error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PAYMENT_CREATE_ERROR', status_code=500)


@sales_bp.route('/sales/<sale_id>/payment-plan', methods=['GET'])
@unified_access(resource='sales', action='read')
def get_sale_payment_plan(ctx, sale_id):
    """
    Get payment plan for a sale.
    
    Access:
    - Tenant scoped
    """
    try:
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response("Sale not found", code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        payment_plan = PaymentPlan.query.filter_by(sale_id=sale_id).first()
        
        if not payment_plan:
            return error_response("Payment plan not found", code='PLAN_NOT_FOUND', status_code=404)
        
        return success_response(
            data=payment_plan.to_dict() if hasattr(payment_plan, 'to_dict') else {'id': payment_plan.id},
            meta={'saleId': sale_id}
        )
        
    except Exception as e:
        logger.error(f"Get payment plan error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PLAN_READ_ERROR', status_code=500)


@sales_bp.route('/sales/<sale_id>/payment-plan', methods=['POST'])
@unified_access(resource='sales', action='write')
@idempotent(methods=['POST'])
def create_sale_payment_plan(ctx, sale_id):
    """
    Create or update payment plan for a sale.
    
    Access:
    - Tenant scoped
    """
    try:
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response("Sale not found", code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        # Check if plan already exists
        existing_plan = PaymentPlan.query.filter_by(sale_id=sale_id).first()
        
        if existing_plan:
            # Update existing plan
            existing_plan.number_of_installments = data.get('number_of_installments') or data.get('numberOfInstallments')
            existing_plan.updated_at = datetime.utcnow()
            plan = existing_plan
        else:
            # Create new plan
            plan = PaymentPlan(
                id=str(uuid4()),
                sale_id=sale_id,
                number_of_installments=data.get('number_of_installments') or data.get('numberOfInstallments'),
                created_by=ctx.principal_id
            )
            db.session.add(plan)
        
        db.session.commit()
        
        logger.info(f"Payment plan created/updated for sale {sale_id}")
        
        return success_response(
            data=plan.to_dict() if hasattr(plan, 'to_dict') else {'id': plan.id},
            meta={'saleId': sale_id, 'planId': plan.id},
            status_code=201 if not existing_plan else 200
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create/update payment plan error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PLAN_CREATE_ERROR', status_code=500)
