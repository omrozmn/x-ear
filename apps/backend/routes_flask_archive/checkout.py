from flask import Blueprint, request, jsonify, current_app
from models.base import db
from models.tenant import Tenant, TenantStatus
from models.subscription import Subscription, SubscriptionStatus, PaymentHistory, PaymentStatus
from models.plan import Plan
from models.user import User
from datetime import datetime, timedelta
import uuid

checkout_bp = Blueprint('checkout', __name__)

@checkout_bp.route('/api/checkout/session', methods=['POST'])
def create_checkout_session():
    """
    Initiates a checkout session for a plan purchase.
    In a real scenario, this would create a Stripe Checkout Session.
    For now, it simulates the process and returns a success URL or mock payment data.
    """
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly') # monthly or yearly
        
        # User/Tenant info
        company_name = data.get('company_name')
        email = data.get('email')
        phone = data.get('phone')
        
        if not plan_id or not company_name or not email:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
            
        plan = db.session.get(Plan, plan_id)
        if not plan:
            return jsonify({'success': False, 'message': 'Plan not found'}), 404
            
        # Calculate amount
        amount = plan.get_monthly_price() if billing_cycle == 'monthly' else plan.get_yearly_price()
        
        # SIMULATION: Create a pending tenant and subscription
        # In production, this might happen after webhook, or we create a "pending" record now.
        
        # Check if tenant exists with this email? For now, assume new tenant.
        
        # 1. Create Tenant (Pending/Trial)
        tenant = Tenant(
            name=company_name,
            slug=Tenant.generate_slug(company_name),
            owner_email=email,
            billing_email=email,
            status=TenantStatus.TRIAL.value, # Initially trial until paid
            current_plan=plan.slug,
            max_users=plan.max_users
        )
        db.session.add(tenant)
        db.session.flush() # Get ID
        
        # 2. Create Subscription
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=30 if billing_cycle == 'monthly' else 365)
        
        subscription = Subscription(
            tenant_id=tenant.id,
            plan_id=plan.id,
            status=SubscriptionStatus.INCOMPLETE.value, # Waiting for payment
            current_period_start=start_date,
            current_period_end=end_date
        )
        db.session.add(subscription)
        db.session.flush()
        
        # 3. Create Payment History (Pending)
        payment = PaymentHistory(
            tenant_id=tenant.id,
            subscription_id=subscription.id,
            amount=amount,
            currency="TRY",
            status=PaymentStatus.PENDING.value,
            description=f"Subscription to {plan.name} ({billing_cycle})"
        )
        db.session.add(payment)
        db.session.commit()
        
        # Return a "checkout URL" (in this mock, it's just a success callback with the payment ID)
        # In real Stripe, this would be session.url
        return jsonify({
            'success': True,
            'checkoutUrl': f"/checkout/success?payment_id={payment.id}", 
            'paymentId': payment.id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@checkout_bp.route('/api/checkout/confirm', methods=['POST'])
def confirm_payment():
    """
    Mock endpoint to confirm a payment (simulating a webhook or successful callback).
    """
    try:
        data = request.get_json()
        payment_id = data.get('payment_id')
        
        payment = db.session.get(PaymentHistory, payment_id)
        if not payment:
            return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
        if payment.status == PaymentStatus.SUCCEEDED.value:
             return jsonify({'success': True, 'message': 'Already paid'}), 200
             
        # Mark paid
        payment.status = PaymentStatus.SUCCEEDED.value
        payment.paid_at = datetime.utcnow()
        
        # Activate Subscription
        subscription = db.session.get(Subscription, payment.subscription_id)
        if subscription:
            subscription.status = SubscriptionStatus.ACTIVE.value
            
        # Activate Tenant
        tenant = db.session.get(Tenant, payment.tenant_id)
        if tenant:
            tenant.status = TenantStatus.ACTIVE.value
            
            # Create Admin User for the Tenant
            # Check if user exists
            existing_user = db.session.query(User).filter_by(email=tenant.owner_email).first()
            if not existing_user:
                # Create new user
                temp_password = f"Welcome{uuid.uuid4().hex[:6]}"
                new_user = User(
                    username=tenant.owner_email.split('@')[0], # Simple username
                    email=tenant.owner_email,
                    tenant_id=tenant.id,
                    role='admin' # Assuming we have a role field or relation
                )
                new_user.set_password(temp_password)
                db.session.add(new_user)
                
                # Send welcome email (Mock)
                print(f"Welcome email sent to {tenant.owner_email}. Password: {temp_password}")
            
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Payment confirmed and tenant activated'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
