from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timezone, timedelta
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.rate_limit import rate_limit
from models.user import User
from models.base import db
from flask_jwt_extended import create_access_token, create_refresh_token

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

auth_bp = Blueprint('auth', __name__)

# Rate-limiting defaults (simple windowed counter)
_RATE_LIMIT_WINDOW_SECONDS = 3600
_RATE_LIMIT_MAX = 5



@auth_bp.route('/auth/lookup-phone', methods=['POST'])
@rate_limit(window_seconds=60, max_calls=10)
def lookup_phone():
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier')
        if not identifier:
            return jsonify({"success": False, "error": "Identifier required"}), 400

        from utils.tenant_security import UnboundSession
        with UnboundSession():
            # Try finding user by username, email, or phone
            user = User.query.filter_by(username=identifier).first()
            if not user:
                user = User.query.filter_by(email=identifier).first()
            if not user:
                user = User.query.filter_by(phone=identifier).first()
            
            if not user or not user.phone:
                # Return generic error to prevent enumeration or specific error depending on policy.
                # User asked to show masked phone, so we must return it if found.
                return jsonify({"success": False, "error": "User not found or no phone registered"}), 404

            # Mask phone: Keep last 4 digits
            phone = user.phone
            masked = '*' * (len(phone) - 4) + phone[-4:] if len(phone) > 4 else phone
            
            return jsonify({
                "success": True, 
                "masked_phone": masked,
                "is_phone_input": identifier == user.phone # Flag to tell frontend if input was already phone
            }), 200
    except Exception as e:
        logger.error(f"Lookup phone error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
@rate_limit(window_seconds=_RATE_LIMIT_WINDOW_SECONDS, max_calls=_RATE_LIMIT_MAX)
def forgot_password():
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier')
        captcha_token = data.get('captcha_token')
        if not identifier:
            return jsonify({"success": False, "error": "Phone number required"}), 400
        if not captcha_token:
            return jsonify({"success": False, "error": "CAPTCHA required"}), 400

        # Find user by phone number
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(phone=identifier).first()
            if not user:
                return jsonify({"success": False, "error": "User not found with this phone number"}), 404

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            logger.warning('OTP store not initialized; using transient fallback')
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        # Generate OTP
        import random
        code = str(random.randint(100000, 999999))
        otp_store.set_otp(identifier, code, ttl=300)

        # Send SMS using communication service
        msg = f"X-EAR sifre sifirlama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
        result = communication_service.send_sms(identifier, msg)
        
        if not result.get('success'):
            logger.error(f"Failed to send SMS: {result}")
            return jsonify({
                "success": False, 
                "error": result.get('error', 'Failed to send SMS'),
                "details": result
            }), 500

        return jsonify({"success": True, "message": "OTP sent to your phone"}), 200
    except Exception as e:
        logger.error(f"Forgot-password error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from services.communication_service import communication_service

# ... existing imports ...

@auth_bp.route('/auth/send-verification-otp', methods=['POST'])
@jwt_required()
def send_verification_otp():
    """Send OTP to the user's phone number (requires pre-auth token)"""
    try:
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        data = request.get_json() or {}
        phone = data.get('phone')

        if phone:
            # Update phone if provided
            # Check if phone is already used by another user
            existing = User.query.filter(User.phone == phone, User.id != user_id).first()
            if existing:
                return jsonify({"success": False, "error": "Phone number already in use"}), 400
            user.phone = phone
            db.session.commit()
        
        if not user.phone:
             return jsonify({"success": False, "error": "Phone number required"}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        # Generate OTP
        now_ts = int(now_utc().timestamp())
        code = str(100000 + (now_ts % 900000)) # Simple deterministic for now, replace with random in prod
        import random
        code = str(random.randint(100000, 999999))
        
        otp_store.set_otp(user.id, code, ttl=300)

        # Send SMS
        msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
        result = communication_service.send_sms(user.phone, msg)
        
        if not result.get('success'):
            logger.error(f"Failed to send SMS: {result}")
            # Return the actual error from the provider
            return jsonify({
                "success": False, 
                "error": result.get('error', 'Failed to send SMS'),
                "details": result
            }), 500

        return jsonify({"success": True, "message": "OTP sent"}), 200

    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route('/auth/verify-otp', methods=['POST'])
@jwt_required(optional=True) # Optional to support both pre-auth token and generic identifier flow
def verify_otp():
    try:
        data = request.get_json() or {}
        otp = data.get('otp')
        
        user_id = get_jwt_identity()
        identifier = data.get('identifier') # Fallback for forgot-password flow
        
        target_id = user_id if user_id else identifier
        
        if not target_id or not otp:
            return jsonify({"success": False, "error": "Identifier/Token and OTP required"}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        stored = otp_store.get_otp(target_id)
        if not stored:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400
        if str(otp) != str(stored):
            return jsonify({"success": False, "message": "Invalid OTP"}), 400

        # success: remove stored OTP ONLY if authenticated (phone verification)
        # If unauthenticated (forgot password), keep it for reset_password to consume
        if user_id:
            otp_store.delete_otp(target_id)
        
        # If authenticated (pre-auth), mark as verified and return full tokens
        if user_id:
            user = db.session.get(User, user_id)
            if user:
                user.is_phone_verified = True
                user.last_login = datetime.now(timezone.utc)
                db.session.commit()
                
                # Issue full tokens
                access_token = create_access_token(identity=user.id)
                refresh_token = create_access_token(identity=user.id, expires_delta=timedelta(days=30))
                
                return jsonify({
                    "success": True, 
                    "message": "OTP verified",
                    "access_token": access_token,
                    "refreshToken": refresh_token,
                    "data": user.to_dict()
                }), 200

        return jsonify({"success": True, "message": "OTP verified"}), 200
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using verified OTP"""
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier')
        otp = data.get('otp')
        new_password = data.get('newPassword')
        
        if not identifier or not otp or not new_password:
            return jsonify({"success": False, "error": "Identifier, OTP and new password required"}), 400

        if len(new_password) < 6:
            return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        # Verify OTP first
        stored = otp_store.get_otp(identifier)
        if not stored:
            return jsonify({"success": False, "error": "Invalid or expired OTP"}), 400
        if str(otp) != str(stored):
            return jsonify({"success": False, "error": "Invalid OTP"}), 400

        # Find user by phone number
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(phone=identifier).first()
            if not user:
                return jsonify({"success": False, "error": "User not found"}), 404

        # Update password
        user.set_password(new_password)
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        # Remove used OTP
        otp_store.delete_otp(identifier)

        # Log password reset activity
        try:
            from utils.activity_logging import log_activity
            log_activity(user.id, user.tenant_id, 'password_reset', 'Password reset via SMS OTP')
        except Exception as e:
            logger.warning(f"Failed to log password reset activity: {e}")

        return jsonify({"success": True, "message": "Password reset successfully"}), 200

    except Exception as e:
        logger.error(f"Reset password error: {e}")
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
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(username=identifier).first()
            if not user:
                user = User.query.filter_by(email=identifier).first()
            if not user:
                user = User.query.filter_by(phone=identifier).first()

        if not user or not user.check_password(password):
            # Log failed login attempt
            try:
                from utils.activity_logging import log_login
                log_login(identifier, None, success=False)
            except Exception as e:
                logger.warning(f"Failed to log failed login: {e}")
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 401
            
        # Check phone verification
            # Check phone verification
        if not user.is_phone_verified:
            # If phone is not verified, we still allow login but frontend will show modal
            # We trigger OTP send if phone exists
            if user.phone:
                # Send OTP immediately
                otp_store = current_app.extensions.get('otp_store')
                if not otp_store:
                    from services.otp_store import InMemoryOTPStore
                    otp_store = InMemoryOTPStore()
                
                import random
                code = str(random.randint(100000, 999999))
                otp_store.set_otp(user.id, code, ttl=300)
                
                msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
                communication_service.send_sms(user.phone, msg)

        # Update last_login
        try:
            user.last_login = datetime.now(timezone.utc)
            db.session.add(user)
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Log successful login
        try:
            from utils.activity_logging import log_login
            log_login(user.id, user.tenant_id, success=True)
        except Exception as e:
            logger.warning(f"Failed to log login activity: {e}")

        access_token = create_access_token(identity=user.id, additional_claims={'tenant_id': user.tenant_id})
        refresh_token = create_refresh_token(identity=user.id, expires_delta=timedelta(days=30), additional_claims={'tenant_id': user.tenant_id})
        return jsonify({
            'success': True,
            'access_token': access_token,
            'refreshToken': refresh_token,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh():
    """Refresh access token using refresh token"""
    try:
        # DEBUG: Inspect the token manually
        auth_header = request.headers.get('Authorization', '')
        logger.info(f"REFRESH ENDPOINT HIT. Header: {auth_header[:20]}...")
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                import jwt
                # Use verify=False to just see what's inside, even if expired/invalid signature
                payload = jwt.decode(token, options={"verify_signature": False})
                logger.info(f"REFRESH TOKEN PAYLOAD: {payload}")
            except Exception as e:
                logger.error(f"Failed to decode token manually: {e}")

        # Manually verify
        verify_jwt_in_request(refresh=True)
        
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
            
        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 401
            
        # Create new access token
        access_token = create_access_token(identity=user.id, additional_claims={'tenant_id': user.tenant_id})
        
        return jsonify({
            'success': True,
            'access_token': access_token
        }), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
