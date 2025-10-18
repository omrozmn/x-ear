from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models.base import db
from models.user import User


def role_required(role):
    """Decorator to require that the current user has the given role."""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = None
            try:
                user = db.session.get(User, user_id)
            except Exception:
                pass
            if not user:
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            if user.role != role:
                return jsonify({'success': False, 'error': 'Forbidden - insufficient role'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    return role_required('admin')(fn)


# New: permission system helpers

def can(user, permission_name, app_id=None):
    """Check whether the given user is granted the named permission.

    - Super-admin shortcut: if user.role == 'admin' return True.
    - If app_id is provided, check user's roles for that app and whether any
      of those roles include the requested permission.
    - If app_id is None, check any user_app_roles across apps for a matching permission.
    """
    if not user:
        return False

    # Super admin bypass
    if getattr(user, 'role', None) == 'admin':
        return True

    # Find permission
    perm = Permission.query.filter_by(name=permission_name).one_or_none()
    if not perm:
        return False

    # Gather role ids that include this permission
    role_ids = [r.id for r in perm.roles]
    if not role_ids:
        return False

    # If app_id provided, find user_app_roles for user+app
    query = UserAppRole.query.filter(UserAppRole.user_id == user.id)
    if app_id:
        query = query.filter(UserAppRole.app_id == app_id)

    user_roles = query.all()
    for ur in user_roles:
        if ur.role_id in role_ids:
            return True

    return False


def permission_required(permission_name, app_id_arg=None):
    """Decorator to require that the current user has given permission.

    If app_id_arg is provided, decorator will look for that kwarg in the
    wrapped function's kwargs to pass as app_id to the check. If omitted,
    permission is checked across any apps the user has roles for.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401

            app_id = None
            if app_id_arg and app_id_arg in kwargs:
                app_id = kwargs[app_id_arg]
            # Allow app id from JSON body or query param as convenience
            if not app_id:
                app_id = request.json.get('app_id') if request.is_json and request.json else request.args.get('app_id')

            if not can(user, permission_name, app_id):
                return jsonify({'success': False, 'error': 'Forbidden - insufficient permission'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
