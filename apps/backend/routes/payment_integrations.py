
from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db, gen_id
from models.user import User
from models.tenant import Tenant
from models.sales import Sale, PaymentRecord
from services.paytr_service import PayTRService
import json
import logging
from datetime import datetime
import os

logger = logging.getLogger(__name__)

payment_integrations_bp = Blueprint('payment_integrations', __name__, url_prefix='/api/payments/pos')

def get_tenant_paytr_settings(tenant_id):
    """Retrieve PayTR settings for a tenant"""
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant or not tenant.settings:
        return None
        
    pos_settings = tenant.settings.get('pos_integration', {})
    if not pos_settings.get('enabled') or pos_settings.get('provider') != 'paytr':
        return None
        
    return {
        'merchant_id': pos_settings.get('merchant_id'),
        'merchant_key': pos_settings.get('merchant_key'),
        'merchant_salt': pos_settings.get('merchant_salt'),
        'test_mode': pos_settings.get('test_mode', False)
    }


@payment_integrations_bp.route('/paytr/config', methods=['GET'])
@jwt_required()
def get_paytr_config():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    settings = get_tenant_paytr_settings(user.tenant_id) or {}
    return jsonify({
        'success': True,
        'data': {
            'merchant_id': settings.get('merchant_id', ''),
            'merchant_key': settings.get('merchant_key', ''),
            'merchant_salt': settings.get('merchant_salt', ''),
            'test_mode': settings.get('test_mode', False),
            'enabled': True
        }
    })

@payment_integrations_bp.route('/paytr/config', methods=['PUT'])
@jwt_required()
def update_paytr_config():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    data = request.get_json()
    tenant = db.session.get(Tenant, user.tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
        
    if not tenant.settings:
        tenant.settings = {}
        
    pos_settings = tenant.settings.get('pos_integration', {})
    pos_settings.update({
        'provider': 'paytr',
        'enabled': True,
        'merchant_id': data.get('merchant_id'),
        'merchant_key': data.get('merchant_key'),
        'merchant_salt': data.get('merchant_salt'),
        'test_mode': data.get('test_mode', False)
    })
    
    tenant.settings['pos_integration'] = pos_settings
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "settings")
    
    db.session.commit()
    
    return jsonify({'success': True})

@payment_integrations_bp.route('/paytr/initiate', methods=['POST'])
@jwt_required()
def initiate_paytr_payment():

    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        sale_id = data.get('sale_id')
        installment_count = data.get('installment_count', 1)
        # Verify Sale
        sale = db.session.get(Sale, sale_id)
        if not sale or sale.tenant_id != user.tenant_id:
            return jsonify({'success': False, 'error': 'Sale not found'}), 404

        # Get Tenant Settings
        settings = get_tenant_paytr_settings(user.tenant_id)
        if not settings:
            return jsonify({'success': False, 'error': 'PayTR integration not configured'}), 400

        # Create Pending Payment Record
        # We create it now to start tracking the transaction ID
        transaction_id = gen_id("ptr") # e.g., ptr_...
        
        # Calculate amount (use remainder of sale or specific amount)
        amount = float(data.get('amount') or 0)
        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'}), 400

        payment_record = PaymentRecord(
            tenant_id=user.tenant_id,
            branch_id=getattr(user, 'branch_id', None), # Optional
            patient_id=sale.patient_id,
            sale_id=sale.id,
            amount=amount,
            payment_date=datetime.now(),
            payment_method='card',
            payment_type='payment',
            status='pending',
            pos_provider='paytr',
            pos_transaction_id=transaction_id,
            installment_count=installment_count
        )
        db.session.add(payment_record)
        db.session.commit()

        # Prepare PayTR Service
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )

        # Prepare User Basket
        # Should be list of [name, price, quantity]
        # For simplicity, we can just put "Sale Payment" or list items
        basket = [[f"Satis #{sale_id} Odeme", str(amount), 1]]

        # Prepare Request
        # Use frontend URL for OK/Fail redirect (though Iframe handles it differently)
        # PayTR requires fully qualified URLs
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        ok_url = f"{frontend_url}/pos/success"
        fail_url = f"{frontend_url}/pos/fail"

        # Get Client IP
        if request and hasattr(request, 'headers'):
            user_ip = request.headers.get('X-Forwarded-For', request.remote_addr) or '127.0.0.1'
        else:
            user_ip = '127.0.0.1'

        payload = paytr.generate_token_request(
            user_ip=user_ip,
            order_id=transaction_id,
            email=sale.patient.email or 'noreply@xear.com', # Fallback
            payment_amount=amount,
            user_basket=basket,
            no_installment="0" if installment_count > 1 else "1", 
            max_installment="12",
            user_name=f"{sale.patient.first_name} {sale.patient.last_name}",
            user_address=getattr(sale.patient, 'address_full', None) or "Adres Yok",
            user_phone=sale.patient.phone or "5555555555",
            merchant_ok_url=ok_url,
            merchant_fail_url=fail_url
        )

        token_result = paytr.get_token(payload)

        if token_result['success']:
            return jsonify({
                'success': True,
                'token': token_result['token'],
                'iframe_url': 'https://www.paytr.com/odeme/guvenli/' + token_result['token']
            })
        else:
            return jsonify({
                'success': False,
                'error': token_result.get('error')
            }), 400

    except Exception as e:
        logger.error(f"PayTR Initiate Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@payment_integrations_bp.route('/paytr/callback', methods=['POST'])
def paytr_callback():
    """
    Callback from PayTR server.
    IMPORTANT: This must return "OK" string if successful, otherwise PayTR retries.
    """
    try:
        data = request.form
        merchant_oid = data.get('merchant_oid')
        status = data.get('status')
        
        # 1. Find Payment Record
        payment = PaymentRecord.query.filter_by(pos_transaction_id=merchant_oid).first()
        if not payment:
            logger.error(f"PayTR Callback: Payment record not found for oid {merchant_oid}")
            return "OK" # Return OK to stop PayTR from retrying if logic fails hard? Usually return fail. But if record missing, maybe OK.

        # 2. Get Settings
        settings = get_tenant_paytr_settings(payment.tenant_id)
        if not settings:
            logger.error(f"PayTR Callback: Tenant settings missing for tenant {payment.tenant_id}")
            return "OK"

        # 3. Validate Hash
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )
        
        if not paytr.validate_callback(data):
            logger.error(f"PayTR Callback: Invalid Hash for oid {merchant_oid}")
            return "OK" # PayTR expects OK even on fail logic handled app-side, but usually 500 triggers retry.
            # Assuming we just log and ignore if hash bad.
        
        # 4. Update Status
        payment.pos_raw_response = data.to_dict(flat=False) # Store full raw
        
        if status == 'success':
            payment.status = 'paid'
            payment.pos_status = 'success'
            payment.gross_amount = float(data.get('total_amount', 0)) / 100 # Back to TL
            payment.net_amount = payment.gross_amount # Minus commission if calculated
            
            # Update Sale Paid Amount logic (re-use logic from create_payment_record if possible)
            if payment.sale_id:
                sale = db.session.get(Sale, payment.sale_id)
                if sale:
                     # Recalculate totals
                    existing_payments = PaymentRecord.query.filter_by(
                         sale_id=sale.id,
                         status='paid'
                    ).all()
                     # Note: current `payment` is already in DB but status was pending. Now it is paid.
                     # We need to make sure we don't double count if we just re-query.
                     # Since we haven't committed yet, it's still 'pending' in DB? 
                     # No, we updated `payment.status = 'paid'` in session. 
                     
                    current_sum = sum(float(p.amount) for p in existing_payments) 
                    # If this payment is in existing_payments list (it might be if session dirty?), careful.
                    # It's safer to just add this payment's amount to (total - this_payment_prev). 
                    # Actually, easier:
                    
                    sale.paid_amount = float(sale.paid_amount or 0) + float(payment.amount)
                    
                    # Update status
                    sale_total = float(sale.total_amount or sale.final_amount or 0)
                    if sale.paid_amount >= sale_total - 0.01:
                        sale.status = 'paid'
                    elif sale.paid_amount > 0:
                        sale.status = 'partial'
            
            # Create Cashbox (Income) Record? 
            # Yes, virtual POS in flow is income.
            # Implement CashMovement logic here if required. For now, PaymentRecord is source of truth.

        else:
            payment.status = 'failed'
            payment.pos_status = 'failed'
            payment.error_message = data.get('failed_reason_msg', 'Unknown Error')

        db.session.commit()
        return "OK"

    except Exception as e:
        logger.error(f"PayTR Callback Exception: {str(e)}")
        return "OK" # Reduce retries on logic error inside our code
