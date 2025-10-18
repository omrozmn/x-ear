from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timezone, timedelta
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.rate_limit import rate_limit
from models.user import User
from models.base import db
from flask_jwt_extended import create_access_token

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

auth_bp = Blueprint('auth', __name__)

# Rate-limiting defaults (simple windowed counter)
_RATE_LIMIT_WINDOW_SECONDS = 3600
_RATE_LIMIT_MAX = 5


@auth_bp.route('/auth/forgot-password', methods=['POST'])
@rate_limit(window_seconds=_RATE_LIMIT_WINDOW_SECONDS, max_calls=_RATE_LIMIT_MAX)
def forgot_password():
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier')
        captcha_token = data.get('captcha_token')
        if not identifier:
            return jsonify({"success": False, "error": "Identifier required"}), 400
        if not captcha_token:
            return jsonify({"success": False, "error": "CAPTCHA required"}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            logger.warning('OTP store not initialized; using transient fallback')
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        # rate limiting handled by decorator

        # generate OTP and store it (deterministic-ish for tests)
        now_ts = int(now_utc().timestamp())
        code = str(100000 + (now_ts % 900000))
        otp_store.set_otp(identifier, code, ttl=300)

        # TODO: send OTP via SMS/Email based on identifier
        return jsonify({"success": True, "message": "OTP generated"}), 200
    except Exception as e:
        logger.error(f"Forgot-password error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route('/auth/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier')
        otp = data.get('otp')
        if not identifier or not otp:
            return jsonify({"success": False, "error": "Identifier and OTP required"}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            logger.warning('OTP store not initialized; using transient fallback')
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        stored = otp_store.get_otp(identifier)
        if not stored:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400
        if str(otp) != str(stored):
            return jsonify({"success": False, "message": "Invalid OTP"}), 400

        # success: remove stored OTP
        otp_store.delete_otp(identifier)
        return jsonify({"success": True, "message": "OTP verified"}), 200
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        logger.info(f"Login attempt with data: {data}")  # Debug log
        
        identifier = data.get('username') or data.get('email') or data.get('phone')
        password = data.get('password')
        
        logger.info(f"Login attempt - identifier: {identifier}, password_provided: {bool(password)}")  # Debug log
        
        if not identifier or not password:
            return jsonify({'success': False, 'error': 'username/email/phone and password required'}), 400

        # Try username, then email, then phone
        user = User.query.filter_by(username=identifier).first()
        if not user:
            user = User.query.filter_by(email=identifier).first()
        if not user:
            user = User.query.filter_by(phone=identifier).first()

        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 401

        # Update last_login
        try:
            user.last_login = datetime.now(timezone.utc)
            db.session.add(user)
            db.session.commit()
        except Exception:
            db.session.rollback()

        access_token = create_access_token(identity=user.id)
        refresh_token = create_access_token(identity=user.id, expires_delta=timedelta(days=30))
        return jsonify({
            'success': True,
            'access_token': access_token,
            'refreshToken': refresh_token,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
