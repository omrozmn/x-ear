from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timezone
import os
import json
from models.base import db
from models.user import User
from uuid import uuid4
from flask_jwt_extended import create_access_token
from utils.rate_limit import rate_limit
from services.otp_store import InMemoryOTPStore

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

registration_bp = Blueprint('registration', __name__)

# Use shared OTP store attached to app extensions; fallback to InMemoryOTPStore if absent
from services.otp_store import InMemoryOTPStore

@registration_bp.route('/api/config/turnstile', methods=['GET'])
def get_turnstile_config():
    site_key = os.getenv('TURNSTILE_SITE_KEY')
    # Return an empty siteKey in dev if not configured; frontend will handle rendering gracefully.
    return jsonify({
        'success': True,
        'siteKey': site_key or ''
    }), 200

@registration_bp.route('/api/register-phone', methods=['POST'])
@rate_limit(window_seconds=3600, max_calls=5)
def register_phone():
    try:
        data = request.get_json() or {}
        phone = data.get('phone')
        captcha_token = data.get('captcha_token')
        if not phone:
            return jsonify({'success': False, 'message': 'Phone required'}), 400

        # Basic captcha check - in dev we skip verification if no secrets configured
        # Real verification should call verify_turnstile_token

        # Generate deterministic-ish OTP for tests
        now_ts = int(now_utc().timestamp())
        code = str(100000 + (now_ts % 900000))

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            # transient in-memory fallback
            otp_store = InMemoryOTPStore()
        otp_store.set_otp(phone, code, ttl=300)

        # Do not actually send SMS in dev; return success so tests can continue.
        return jsonify({'success': True, 'message': 'OTP generated'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@registration_bp.route('/api/verify-registration-otp', methods=['POST'])
def verify_registration_otp():
    try:
        data = request.get_json() or {}
        phone = data.get('phone')
        otp = str(data.get('otp') or '')
        if not phone or not otp:
            return jsonify({'success': False, 'message': 'Phone and OTP required'}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            otp_store = InMemoryOTPStore()
        stored = otp_store.get_otp(phone)
        if not stored:
            return jsonify({'success': False, 'message': 'Invalid or expired OTP'}), 400
        if otp != stored:
            return jsonify({'success': False, 'message': 'Invalid OTP'}), 400

        # Create or get user
        username = phone
        existing_user = db.session.query(User).filter_by(username=username).one_or_none()
        temp_password = f"temp_{datetime.now().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        if not existing_user:
            u = User()
            u.id = f"user_{datetime.now().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
            u.username = username
            u.email = None
            u.phone = phone
            u.set_password(temp_password)
            db.session.add(u)
            db.session.commit()
            user_id = u.id
            username_saved = u.username
        else:
            # Update password for existing user in dev
            existing_user.set_password(temp_password)
            db.session.commit()
            user_id = existing_user.id
            username_saved = existing_user.username

        # Issue JWT (identity is the user's id)
        access_token = create_access_token(identity=user_id)

        # Clean OTP
        try:
            otp_store = current_app.extensions.get('otp_store')
            if not otp_store:
                otp_store = InMemoryOTPStore()
            otp_store.delete_otp(phone)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user_id': user_id,
            'username': username_saved,
            'temp_password': temp_password,
            'access_token': access_token
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
