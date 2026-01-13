from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity
from models.user import User


def _get_feature_obj(name: str):
    settings = Settings.get_system_settings()
    fv = settings.get_setting(f'features.{name}', None)
    if fv is None:
        return None
    # normalize boolean -> object
    if isinstance(fv, bool):
        return {'mode': 'visible' if fv else 'hidden', 'plans': []}
    if isinstance(fv, dict):
        return {'mode': fv.get('mode', 'visible'), 'plans': list(fv.get('plans') or [])}
    return None


def is_admin_user(user_id: str) -> bool:
    try:
        if not user_id:
            return False
        user = User.query.get(user_id)
        if not user:
            return False
        return user.role in ('SUPER_ADMIN', 'OWNER', 'ADMIN')
    except Exception:
        return False


def user_plan(user_id: str):
    """Return the plan id associated with a user from system settings mapping 'user_plans'."""
    try:
        if not user_id:
            return None
        settings = Settings.get_system_settings()
        mapping = settings.get_setting('user_plans', {}) or {}
        # mapping expected like {user_id: plan_id}
        return mapping.get(user_id)
    except Exception:
        return None


def feature_read_allowed(name: str, user_id: str = None) -> bool:
    obj = _get_feature_obj(name)
    if obj is None:
        # default allow if no feature configured
        return True
    mode = obj.get('mode', 'visible')
    # If plans list is specified, enforce plan-based visibility
    plans_list = obj.get('plans') or []
    if plans_list:
        up = user_plan(user_id)
        if up and str(up) in [str(p) for p in plans_list]:
            return True
        return is_admin_user(user_id)
    if mode == 'hidden':
        # hidden: only admin users can read
        return is_admin_user(user_id)
    # visible or frozen -> read allowed
    return True


def feature_write_allowed(name: str, user_id: str = None) -> bool:
    obj = _get_feature_obj(name)
    if obj is None:
        return True
    mode = obj.get('mode', 'visible')
    plans_list = obj.get('plans') or []
    if plans_list:
        up = user_plan(user_id)
        if up and str(up) in [str(p) for p in plans_list]:
            # if plan matches, allow writes unless frozen?
            # for plan-specific behavior, we honor 'mode' as well
            if mode == 'frozen':
                return is_admin_user(user_id)
            if mode == 'hidden':
                return is_admin_user(user_id)
            return True
        return is_admin_user(user_id)
    if mode == 'hidden':
        return is_admin_user(user_id)
    if mode == 'frozen':
        # frozen: only admin users can write
        return is_admin_user(user_id)
    return True


def feature_gate(name: str, require: str = 'read'):
    """Decorator to gate an endpoint by a feature flag.

    require: 'read' or 'write'
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            uid = None
            try:
                uid = get_jwt_identity()
            except Exception:
                uid = None
            if require == 'read':
                ok = feature_read_allowed(name, uid)
                if not ok:
                    return jsonify({'success': False, 'error': 'Feature not available'}), 404
            else:
                ok = feature_write_allowed(name, uid)
                if not ok:
                    return jsonify({'success': False, 'error': 'Feature is disabled or frozen for your account'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator
