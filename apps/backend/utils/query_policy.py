"""
Query Policy - Tenant-Scoped Query Builder
-------------------------------------------
Provides helper functions to build tenant-scoped queries automatically.
This ensures tenant isolation is enforced at the query level, not just
at the response level.

Usage:
    from utils.query_policy import tenant_scoped_query, get_or_404_scoped

    # Build a scoped query
    patients = tenant_scoped_query(ctx, Patient).filter_by(status='active').all()

    # Get single item with 404 if not found or not in scope
    patient = get_or_404_scoped(ctx, Patient, patient_id)
"""

from typing import TypeVar, Optional, Type
from flask import jsonify
from sqlalchemy.orm import Query
from utils.access_context import AccessContext
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


def tenant_scoped_query(ctx: AccessContext, model_class: Type[T]) -> Query:
    """
    Build a tenant-scoped query based on AccessContext.
    
    For Super Admins:
        - If ctx.tenant_id is set (context switch), filters by that tenant
        - If ctx.tenant_id is None, returns unfiltered query (all tenants)
    
    For Tenant Users/Admins:
        - Always filters by their tenant_id
    
    Args:
        ctx: AccessContext from current request
        model_class: SQLAlchemy model class (must have tenant_id column)
    
    Returns:
        SQLAlchemy Query object with tenant filtering applied
    
    Example:
        query = tenant_scoped_query(ctx, Patient)
        patients = query.filter_by(status='active').all()
    """
    query = model_class.query
    
    # Check if model has tenant_id attribute
    if not hasattr(model_class, 'tenant_id'):
        logger.warning(f"Model {model_class.__name__} does not have tenant_id, returning unscoped query")
        return query
    
    # Apply tenant filtering
    if ctx.tenant_id:
        # Either tenant user OR super admin with context switch
        query = query.filter_by(tenant_id=ctx.tenant_id)
    elif not ctx.is_super_admin:
        # Tenant user without tenant_id (shouldn't happen, but safety)
        logger.error(f"Tenant user {ctx.principal_id} has no tenant_id!")
        # Return empty query for safety
        query = query.filter(False)  # Always false = empty result
    
    # Super admin with no tenant context = full access (unfiltered)
    return query


def get_or_404_scoped(ctx: AccessContext, model_class: Type[T], id_value) -> Optional[T]:
    """
    Get a single record by ID with tenant scoping, or None if not found/not in scope.
    
    Args:
        ctx: AccessContext from current request
        model_class: SQLAlchemy model class
        id_value: Primary key value to look up
    
    Returns:
        Model instance if found and in scope, None otherwise
    
    Example:
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({'error': 'Not found'}), 404
    """
    from models.base import db
    
    # Get the record first
    record = db.session.get(model_class, id_value)
    
    if not record:
        return None
    
    # Check tenant scope
    if hasattr(record, 'tenant_id'):
        if ctx.tenant_id and record.tenant_id != ctx.tenant_id:
            # Record exists but user doesn't have access
            logger.warning(f"Access denied: {ctx.principal_id} tried to access {model_class.__name__} {id_value} in tenant {record.tenant_id}")
            return None
        elif not ctx.is_super_admin and not ctx.tenant_id:
            # Tenant user without tenant_id (shouldn't happen)
            return None
    
    return record


def require_scoped(ctx: AccessContext, model_class: Type[T], id_value, error_message: str = None):
    """
    Get a single record by ID with tenant scoping, or return error response tuple.
    
    This is a convenience wrapper that returns a Flask response tuple on failure.
    
    Args:
        ctx: AccessContext from current request
        model_class: SQLAlchemy model class
        id_value: Primary key value to look up
        error_message: Custom error message (default: "{Model} not found")
    
    Returns:
        Model instance if found, or (response, status_code) tuple on failure
    
    Example:
        result = require_scoped(ctx, Patient, patient_id)
        if isinstance(result, tuple):
            return result  # Error response
        patient = result  # Success
    """
    record = get_or_404_scoped(ctx, model_class, id_value)
    
    if not record:
        msg = error_message or f"{model_class.__name__} not found"
        return jsonify({'success': False, 'error': msg}), 404
    
    return record


def branch_filtered_query(ctx: AccessContext, query: Query, model_class: Type[T]) -> Query:
    """
    Apply branch filtering for Tenant Admins (legacy behavior preservation).
    
    This is used when tenant admins are restricted to specific branches.
    Only applies if the user has role='admin' and has branch assignments.
    
    Args:
        ctx: AccessContext from current request
        query: Existing query to filter
        model_class: SQLAlchemy model class (must have branch_id column)
    
    Returns:
        Filtered query, or None if admin has no branch access
    """
    if not hasattr(model_class, 'branch_id'):
        return query
    
    # Only apply to tenant admins (not super admins, not regular users)
    if not ctx.is_tenant_admin:
        return query
    
    # Check if user object is available
    if not ctx._principal or not ctx._principal.user:
        return query
    
    user = ctx._principal.user
    
    # Get user's assigned branches
    user_branch_ids = [b.id for b in user.branches] if hasattr(user, 'branches') else []
    
    if user_branch_ids:
        query = query.filter(model_class.branch_id.in_(user_branch_ids))
    else:
        # Admin with no branches = no access (return empty)
        return None
    
    return query
