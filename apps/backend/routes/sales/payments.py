"""
Sales Module - Payment Endpoints

Handles payment tracking, payment plans, and installments.
"""
from flask import Blueprint, request, jsonify
from models.base import db
from models.sales import Sale, PaymentPlan, PaymentInstallment, PaymentRecord
from utils.decorators import unified_access
from utils.response import success_response, error_response
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
import logging

from .helpers import (
    build_installment_data,
    build_payment_plan_data,
    ERROR_SALE_NOT_FOUND,
    ERROR_NO_DATA_PROVIDED
)

logger = logging.getLogger(__name__)

UTC_OFFSET = "+00:00"
payments_bp = Blueprint('sales_payments', __name__)


def now_utc():
    """Return current UTC timestamp."""
    return datetime.now()


@payments_bp.route('/sales/<sale_id>/payments', methods=['GET'])
def get_sale_payments(sale_id):
    """Get all payments for a specific sale."""
    try:
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
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
        
        return jsonify({
            'success': True,
            'data': {
                'payments': payment_data,
                'summary': {
                    'totalAmount': float(sale.total_amount),
                    'totalPaid': total_paid,
                    'totalPending': total_pending,
                    'remainingBalance': remaining_balance,
                    'paymentCount': len(payments)
                }
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get sale payments error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@payments_bp.route('/sales/<sale_id>/payments', methods=['POST'])
def record_sale_payment(sale_id):
    """Record a new payment for a sale."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
        # Validate required fields
        required_fields = ['amount', 'paymentMethod', 'paymentDate']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate amount
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({
                'success': False,
                'error': 'Payment amount must be greater than 0'
            }), 400
        
        # Check if payment exceeds remaining balance
        existing_payments = PaymentRecord.query.filter_by(
            sale_id=sale_id, 
            status='paid'
        ).all()
        total_paid = sum(float(p.amount) for p in existing_payments)
        remaining = float(sale.total_amount) - total_paid
        
        if amount > remaining + 0.01:  # Allow small rounding differences
            return jsonify({
                'success': False,
                'error': f'Payment amount ({amount}) exceeds remaining balance ({remaining})'
            }), 400
        
        # Create payment record
        payment = PaymentRecord()
        payment.id = f"payment_{uuid4().hex[:8]}"
        payment.patient_id = sale.patient_id
        payment.sale_id = sale_id
        payment.amount = Decimal(str(amount))
        payment.payment_method = data['paymentMethod']
        payment.payment_type = data.get('paymentType', 'payment')
        payment.status = data.get('status', 'paid')
        payment.reference_number = data.get('referenceNumber')
        payment.notes = data.get('notes')
        payment.promissory_note_id = data.get('promissoryNoteId')
        
        # Parse payment date
        try:
            payment.payment_date = datetime.fromisoformat(
                data['paymentDate'].replace('Z', UTC_OFFSET)
            )
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid payment date format'
            }), 400
        
        # Parse due date if provided
        if data.get('dueDate'):
            try:
                payment.due_date = datetime.fromisoformat(
                    data['dueDate'].replace('Z', UTC_OFFSET)
                )
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid due date format'
                }), 400
        
        payment.created_at = now_utc()
        payment.updated_at = now_utc()
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': payment.id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'paymentMethod': payment.payment_method,
                'status': payment.status,
                'saleId': sale_id
            },
            'message': 'Payment recorded successfully',
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Record sale payment error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@payments_bp.route('/sales/<sale_id>/installments/<installment_id>/pay', methods=['POST'])
def pay_installment(sale_id, installment_id):
    """Pay a specific installment."""
    try:
        data = request.get_json()
        
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
        # Get installment
        installment = PaymentInstallment.query.filter_by(id=installment_id).first()
        
        if not installment:
            return jsonify({
                'success': False,
                'error': 'Installment not found'
            }), 404
        
        if installment.status == 'paid':
            return jsonify({
                'success': False,
                'error': 'Installment already paid'
            }), 400
        
        # Validate payment data
        amount = data.get('amount', float(installment.amount)) if data else float(installment.amount)
        payment_method = data.get('paymentMethod', 'cash') if data else 'cash'
        payment_date = data.get('paymentDate', now_utc().isoformat()) if data else now_utc().isoformat()
        
        # Create payment record
        payment = PaymentRecord()
        payment.id = f"payment_{uuid4().hex[:8]}"
        payment.patient_id = sale.patient_id
        payment.sale_id = sale_id
        payment.amount = Decimal(str(amount))
        payment.payment_method = payment_method
        payment.payment_type = 'installment'
        payment.status = 'paid'
        payment.reference_number = data.get('referenceNumber') if data else None
        payment.notes = f"Installment {installment.installment_number} payment"
        
        try:
            payment.payment_date = datetime.fromisoformat(
                payment_date.replace('Z', UTC_OFFSET)
            )
        except ValueError:
            payment.payment_date = now_utc()
        
        payment.created_at = now_utc()
        payment.updated_at = now_utc()
        
        # Update installment status
        installment.status = 'paid'
        installment.paid_date = payment.payment_date
        installment.updated_at = now_utc()
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'paymentId': payment.id,
                'installmentId': installment_id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'status': installment.status
            },
            'message': 'Installment paid successfully',
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Pay installment error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@payments_bp.route('/sales/<sale_id>/payment-plan', methods=['GET'])
def get_sale_payment_plan(sale_id):
    """Get payment plan details for a sale."""
    try:
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404

        # Get payment plans for this sale
        payment_plans = PaymentPlan.query.filter_by(sale_id=sale_id).all()
        plans_data = [build_payment_plan_data(plan) for plan in payment_plans]

        return jsonify({
            'success': True,
            'data': {
                'paymentPlans': plans_data,
                'saleId': sale_id,
                'totalAmount': float(sale.total_amount)
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Get sale payment plan error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@payments_bp.route('/sales/<sale_id>/payment-plan', methods=['POST'])
@unified_access(resource='sales', action='write')
def create_sale_payment_plan(ctx, sale_id):
    """Create payment plan for a sale.
    
    Access:
    - Requires write permission on sales
    - Tenant scoped
    """
    try:
        data = request.get_json()
        if not data:
            return error_response(ERROR_NO_DATA_PROVIDED, code='NO_DATA', status_code=400)

        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response(ERROR_SALE_NOT_FOUND, code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response(ERROR_SALE_NOT_FOUND, code='FORBIDDEN', status_code=404)

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json()['settings']
        
        plan_type = data.get('planType', 'installment')
        installment_count = int(data.get('installmentCount', 6))
        down_payment = float(data.get('downPayment', 0))
        
        from services.pricing import create_payment_plan, create_custom_payment_plan
        
        if plan_type == 'custom':
            payment_plan = create_custom_payment_plan(
                sale_id=sale_id,
                installments_data=data.get('installments', []),
                settings=settings
            )
        else:
            payment_plan = create_payment_plan(
                sale_id=sale_id,
                total_amount=float(sale.total_amount),
                plan_type=plan_type,
                installment_count=installment_count,
                down_payment=down_payment,
                settings=settings
            )
        
        if payment_plan:
            db.session.add(payment_plan)
            db.session.commit()
            
            return success_response(
                data=build_payment_plan_data(payment_plan),
                status_code=201
            )
        else:
            return error_response("Failed to create payment plan", code='PLAN_CREATE_FAILED', status_code=500)

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create payment plan error: {str(e)}")
        return error_response(str(e), code='PLAN_CREATE_ERROR', status_code=500)
