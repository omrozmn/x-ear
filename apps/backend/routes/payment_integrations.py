
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
    """Get Tenant PayTR Config"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    settings = get_tenant_paytr_settings(user.tenant_id) or {}
    
    # Obfuscate secret keys for frontend/security display if needed
    # But usually admin needs to see them or placeholder.
    # We will return empty for secrets if not editing, but for "read" typically we send masked.
    # For now sending clear or masked? Let's send masked.
    m_key = settings.get('merchant_key', '')
    m_salt = settings.get('merchant_salt', '')
    
    masked_key = m_key[:4] + '****' + m_key[-4:] if len(m_key) > 8 else '****'
    masked_salt = m_salt[:4] + '****' + m_salt[-4:] if len(m_salt) > 8 else '****'

    return jsonify({
        'success': True,
        'data': {
            'merchant_id': settings.get('merchant_id', ''),
            'merchant_key_masked': masked_key,
            'merchant_salt_masked': masked_salt,
            'test_mode': settings.get('test_mode', False),
            'enabled': bool(settings.get('merchant_id')) # Simplified enabled check
        }
    })

@payment_integrations_bp.route('/paytr/config', methods=['PUT'])
@jwt_required()
def update_paytr_config():
    """Update Tenant PayTR Config"""
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
    
    # preserve existing secrets if not sent (e.g. sent as masked)
    new_key = data.get('merchant_key')
    new_salt = data.get('merchant_salt')
    
    final_key = new_key if new_key and '****' not in new_key else pos_settings.get('merchant_key', '')
    final_salt = new_salt if new_salt and '****' not in new_salt else pos_settings.get('merchant_salt', '')

    pos_settings.update({
        'provider': 'paytr',
        'enabled': data.get('enabled', True),
        'merchant_id': data.get('merchant_id'),
        'merchant_key': final_key,
        'merchant_salt': final_salt,
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
    """
    Initiate PayTR Payment
    Supports Sale-linked or Standalone
    """
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        sale_id = data.get('sale_id')
        patient_id = data.get('patient_id')
        installment_count = int(data.get('installment_count', 1))
        amount = float(data.get('amount') or 0)
        description = data.get('description', '')

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'}), 400

        # Verify Tenant Settings
        settings = get_tenant_paytr_settings(user.tenant_id)
        if not settings:
            return jsonify({'success': False, 'error': 'PayTR integration not configured'}), 400

        sale = None
        if sale_id:
            sale = db.session.get(Sale, sale_id)
            if not sale or sale.tenant_id != user.tenant_id:
                return jsonify({'success': False, 'error': 'Sale not found'}), 404
            
            # Idempotency Check - Prevent duplicate pending payments
            from datetime import timedelta
            existing_pending = PaymentRecord.query.filter_by(
                sale_id=sale.id,
                amount=amount,
                status='pending',
                pos_provider='paytr'
            ).order_by(PaymentRecord.payment_date.desc()).first()
            
            if existing_pending:
                # Check if pending within last 10 minutes
                time_diff = datetime.now() - existing_pending.payment_date
                if time_diff < timedelta(minutes=10):
                    logger.warning(f"Duplicate payment initiate blocked for sale {sale.id}, amount {amount}")
                    return jsonify({
                        'success': False,
                        'error': 'Bu satış için bekleyen bir ödeme zaten var. Lütfen birkaç dakika bekleyin veya önceki ödemeyi tamamlayın.'
                    }), 400

        # Use Patient from Sale if not provided
        if not patient_id and sale:
            patient_id = sale.patient_id

        # Generate Transaction ID
        transaction_id = gen_id("ptr")
        
        # Payment Record
        payment_record = PaymentRecord(
            tenant_id=user.tenant_id,
            branch_id=getattr(user, 'branch_id', None),
            patient_id=patient_id,
            sale_id=sale_id, # Can be None
            amount=amount,
            payment_date=datetime.now(),
            payment_method='card',
            payment_type='payment',
            status='pending',
            pos_provider='paytr',
            pos_transaction_id=transaction_id,
            installment_count=installment_count,
            notes=description or (f"Satis #{sale_id}" if sale_id else "Pesin Tahsilat")
        )
        db.session.add(payment_record)
        db.session.commit()

        # Init PayTR Service
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )
        
        # Determine User Info for PayTR
        user_name = "Misafir Kullanici"
        user_email = "noreply@xear.com"
        user_phone = "5555555555"
        user_address = "Adres Yok"
        
        # If we have Patient object
        if patient_id:
             # Lazy load patient or query
             # Since we are in routes, better import Patient at top or query
             from models.patient import Patient
             patient = db.session.get(Patient, patient_id)
             if patient:
                 user_name = f"{patient.first_name} {patient.last_name}"
                 user_email = patient.email or user_email
                 user_phone = patient.phone or user_phone
                 user_address = getattr(patient, 'address_full', None) or user_address

        basket_item_name = description or (f"Satis #{sale_id}" if sale_id else "Tahsilat")
        basket = [[basket_item_name, str(amount), 1]]

        # Callback URLs
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        # We point to a dedicated landing page for result
        ok_url = f"{frontend_url}/pos/success"
        fail_url = f"{frontend_url}/pos/fail"
        
        ip = request.headers.get('X-Forwarded-For', request.remote_addr) or '127.0.0.1'

        payload = paytr.generate_token_request(
            user_ip=ip,
            order_id=transaction_id,
            email=user_email,
            payment_amount=amount,
            user_basket=basket,
            no_installment="0" if installment_count > 1 else "1",
            max_installment="12",
            user_name=user_name,
            user_address=user_address,
            user_phone=user_phone,
            merchant_ok_url=ok_url,
            merchant_fail_url=fail_url
        )

        token_result = paytr.get_token(payload)

        if token_result['success']:
            return jsonify({
                'success': True,
                'token': token_result['token'],
                'iframe_url': 'https://www.paytr.com/odeme/guvenli/' + token_result['token'],
                'payment_record_id': payment_record.id
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
    PayTR Server-to-Server Callback
    Idempotent: Checks if already paid.
    """
    try:
        data = request.form
        merchant_oid = data.get('merchant_oid')
        status = data.get('status')
        
        # 1. Find Record
        payment = PaymentRecord.query.filter_by(pos_transaction_id=merchant_oid).first()
        if not payment:
            logger.error(f"PayTR Callback: Record not found {merchant_oid}")
            return "OK" # Stop retry
            
        # Idempotency Check
        if payment.status in ['paid', 'failed']:
            logger.info(f"PayTR Callback: Transaction {merchant_oid} already processed as {payment.status}")
            return "OK"

        # 2. Get Settings
        settings = get_tenant_paytr_settings(payment.tenant_id)
        if not settings:
            logger.error(f"PayTR: Settings missing for tenant {payment.tenant_id}")
            return "OK"

        # 3. Validate Hash
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )
        
        if not paytr.validate_callback(data):
            logger.error(f"PayTR: Invalid Hash {merchant_oid}")
            return "OK"

        # 4. Update
        payment.pos_raw_response = data.to_dict(flat=False)
        
        if status == 'success':
            payment.status = 'paid'
            payment.pos_status = 'success'
            payment.gross_amount = float(data.get('total_amount', 0)) / 100
            payment.net_amount = payment.gross_amount # Minus commission logic if needed

            # Update Linked Sale
            if payment.sale_id:
                sale = db.session.get(Sale, payment.sale_id)
                if sale:
                    # Refresh sale paid amount
                    sale.paid_amount = float(sale.paid_amount or 0) + float(payment.amount)
                    
                    sale_total = float(sale.total_amount or sale.final_amount or 0)
                    if sale.paid_amount >= sale_total - 0.01:
                        sale.status = 'paid' # or completed
                    elif sale.paid_amount > 0:
                        sale.status = 'partial'
            
            # Note: No separate CashMovement table insert needed as unified_cash.py derives from PaymentRecord.
            
        else:
            payment.status = 'failed'
            payment.pos_status = 'failed'
            payment.error_message = data.get('failed_reason_msg', 'Unknown Error')

        db.session.commit()
        return "OK"

    except Exception as e:
        logger.error(f"PayTR Callback Exception for merchant_oid={data.get('merchant_oid', 'N/A')}: {str(e)}")
        
        # Mark payment as error if found
        try:
            if 'merchant_oid' in data:
                error_payment = PaymentRecord.query.filter_by(pos_transaction_id=data['merchant_oid']).first()
                if error_payment and error_payment.status == 'pending':
                    error_payment.status = 'error'
                    error_payment.error_message = f"Callback processing error: {str(e)}"
                    db.session.commit()
        except:
            pass
        
        return "OK"

@payment_integrations_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_pos_transactions():
    """Report Endpoint for POS Transactions"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False}), 401
    
    provider = request.args.get('provider')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = int(request.args.get('limit', 50))
    
    query = PaymentRecord.query.filter_by(tenant_id=user.tenant_id).filter(PaymentRecord.pos_provider.isnot(None))
    
    if provider:
        query = query.filter_by(pos_provider=provider)
        
    # Date filters...
    if start_date:
        try:
             s_dt = datetime.fromisoformat(start_date)
             query = query.filter(PaymentRecord.payment_date >= s_dt)
        except: pass
        
    query = query.order_by(PaymentRecord.payment_date.desc()).limit(limit)
    records = query.all()
    
    return jsonify({
        'success': True,
        'data': [p.to_dict() for p in records]
    })
