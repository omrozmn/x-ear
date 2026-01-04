from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timezone, timedelta
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.rate_limit import rate_limit
from models.user import User
from models.admin_user import AdminUser
from models.base import db
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from utils.decorators import unified_access
from utils.response import success_response, error_response
from services.communication_service import communication_service

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


@auth_bp.route('/auth/send-verification-otp', methods=['POST'])
@unified_access(resource='auth', action='write')
def send_verification_otp(ctx):
    """Send OTP to the user's phone number (requires pre-auth token)"""
    try:
        user = ctx.user
        if not user:
            return error_response("User context required", code='USER_REQUIRED', status_code=401)

        data = request.get_json() or {}
        phone = data.get('phone')

        if phone:
            # Update phone if provided
            existing = User.query.filter(User.phone == phone, User.id != user.id).first()
            if existing:
                return error_response("Phone number already in use", code='PHONE_EXISTS', status_code=400)
            user.phone = phone
            db.session.commit()
        
        if not user.phone:
             return error_response("Phone number required", code='PHONE_REQUIRED', status_code=400)

        otp_store = current_app.extensions.get('otp_store')
        if not otp_store:
            from services.otp_store import InMemoryOTPStore
            otp_store = InMemoryOTPStore()

        # Generate OTP
        import random
        code = str(random.randint(100000, 999999))
        
        otp_store.set_otp(user.id, code, ttl=300)

        # Send SMS
        msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
        result = communication_service.send_sms(user.phone, msg)
        
        if not result.get('success'):
            logger.error(f"Failed to send SMS: {result}")
            return error_response(result.get('error', 'Failed to send SMS'), code='SMS_FAILED', status_code=500, details=result)

        return success_response(message="OTP sent")

    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        return error_response(str(e), code='AUTH_ERROR', status_code=500)


@auth_bp.route('/auth/verify-otp', methods=['POST'])
@jwt_required(optional=True) # Optional to support both pre-auth token and generic identifier flow
def verify_otp():
    """
    Verify OTP for phone verification or password reset.
    Kept @jwt_required(optional=True) because unified_access enforces auth.
    """
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
                access_token = create_access_token(
                    identity=user.id,
                    additional_claims={'tenant_id': user.tenant_id}
                )
                refresh_token = create_access_token(
                    identity=user.id,
                    additional_claims={'tenant_id': user.tenant_id},
                    expires_delta=timedelta(days=30)
                )
                
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
        logger.info(f"Login attempt with data: {data}")
        
        identifier = data.get('identifier') or data.get('username') or data.get('email') or data.get('phone')
        password = data.get('password')
        
        logger.info(f"Login attempt - identifier: {identifier}, password_provided: {bool(password)}")
        
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
            try:
                from utils.activity_logging import log_login
                log_login(identifier, None, success=False)
            except Exception as e:
                logger.warning(f"Failed to log failed login: {e}")
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        if not user.is_active:
            return jsonify({'success': False, 'error': 'Account is inactive'}), 401
            
        if not user.is_phone_verified:
            if user.phone:
                otp_store = current_app.extensions.get('otp_store')
                if not otp_store:
                    from services.otp_store import InMemoryOTPStore
                    otp_store = InMemoryOTPStore()
                
                import random
                code = str(random.randint(100000, 999999))
                otp_store.set_otp(user.id, code, ttl=300)
                
                msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
                communication_service.send_sms(user.phone, msg)

        try:
            user.last_login = datetime.now(timezone.utc)
            db.session.add(user)
            db.session.commit()
        except Exception:
            db.session.rollback()

        try:
            from utils.activity_logging import log_login
            log_login(user.id, user.tenant_id, success=True)
        except Exception as e:
            logger.warning(f"Failed to log login activity: {e}")

        access_token = create_access_token(
            identity=user.id, 
            additional_claims={
                'tenant_id': user.tenant_id,
                'role': user.role
            }
        )
        refresh_token = create_refresh_token(
            identity=user.id, 
            expires_delta=timedelta(days=30), 
            additional_claims={
                'tenant_id': user.tenant_id,
                'role': user.role
            }
        )
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
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        user_id = get_jwt_identity()
        
        # Check if admin user (ID starts with 'admin_')
        if str(user_id).startswith('admin_'):
            # Strip the 'admin_' prefix to get the actual UUID
            actual_admin_id = user_id[6:] if user_id.startswith('admin_') else user_id
            admin = db.session.get(AdminUser, actual_admin_id)
            
            if not admin:
                return jsonify({'success': False, 'error': 'Admin user not found'}), 404
                
            if not admin.is_active:
                return jsonify({'success': False, 'error': 'Account is inactive'}), 401
            
            # Create new access token with admin_ prefix
            admin_identity = admin.id if admin.id.startswith('admin_') else f'admin_{admin.id}'
            access_token = create_access_token(
                identity=admin_identity,
                additional_claims={'role': admin.role, 'user_type': 'admin'}  # user_type instead of type
            )
            
            return jsonify({
                'success': True,
                'access_token': access_token
            }), 200
        else:
            # Regular tenant user
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404
                
            if not user.is_active:
                return jsonify({'success': False, 'error': 'Account is inactive'}), 401
                
            access_token = create_access_token(identity=user.id, additional_claims={'tenant_id': user.tenant_id})
            
            return jsonify({
                'success': True,
                'access_token': access_token
            }), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/auth/set-password', methods=['POST'])
@unified_access(resource='user', action='write')
def set_password(ctx):
    """Set password for authenticated user (Post-Registration Flow)"""
    try:
        user = ctx.user
        if not user:
            return error_response('User context required', code='USER_REQUIRED', status_code=401)
            
        data = request.get_json() or {}
        password = data.get('password')
        
        if not password or len(password) < 6:
            return error_response('Password must be at least 6 characters', code='INVALID_PASSWORD', status_code=400)
            
        user.set_password(password)
        db.session.commit()
        
        return success_response(message='Password set successfully')
        
    except Exception as e:
        logger.error(f"Set password error: {e}")
        return error_response(str(e), code='AUTH_ERROR', status_code=500)
