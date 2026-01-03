"""
Sales Helper Utilities - Context and Authentication

Provides tenant context helpers for sales operations.
"""
from flask import request
from flask_jwt_extended import get_jwt_identity, get_jwt
from models.base import db
from models.user import User
from datetime import datetime


def now_utc():
    """Return current UTC timestamp."""
    return datetime.now()


def get_tenant_context():
    """
    Get current user's tenant context for tenant scoping.
    Returns (user, tenant_id, is_admin) tuple.
    """
    try:
        user_id = get_jwt_identity()
        jwt_claims = get_jwt()
        
        # Check if this is an admin panel JWT
        is_admin = jwt_claims.get('type') == 'admin'
        if is_admin:
            # Super Admin - tenant_id from header or None for all
            tenant_id = request.headers.get('X-Tenant-ID')
            return None, tenant_id, True
        
        # Regular user
        user = db.session.get(User, user_id)
        if not user:
            return None, None, False
        
        return user, user.tenant_id, False
    except Exception:
        return None, None, False


def check_sale_access(sale, tenant_id, is_admin):
    """Check if current context can access the sale."""
    if is_admin:
        return True  # Super Admin can access all
    if not tenant_id:
        return False
    return sale.tenant_id == tenant_id


def check_branch_access(user, branch_id):
    """
    Check if user has access to a specific branch.
    
    Returns True if:
    - User is tenant_admin (access to all branches)
    - User has branch_id in their assigned branches
    - branch_id is None (no branch restriction)
    """
    if not user:
        return False
    
    # Tenant Admin has access to all branches
    if user.role == 'tenant_admin':
        return True
    
    # No branch restriction
    if branch_id is None:
        return True
    
    # Check if user has this branch assigned
    user_branch_ids = [b.id for b in user.branches]
    return branch_id in user_branch_ids


def get_user_branch_ids(user):
    """Get list of branch IDs accessible to a user."""
    if not user:
        return []
    
    # Tenant Admin sees all branches
    if user.role == 'tenant_admin':
        return None  # None means all branches
    
    return [b.id for b in user.branches]
