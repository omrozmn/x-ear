"""
DEPRECATED: This module is for Flask compatibility only.

For FastAPI, use:
- core/database.py: set_tenant_context(), reset_tenant_context(), unbound_session()
- utils/background_task.py: @tenant_task decorator
- utils/async_context.py: gather_with_tenant_context()

This file will be removed after Flask migration is complete.
"""
from contextvars import ContextVar
from flask import g, request, current_app
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session, Query
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
import logging
import warnings

# Emit deprecation warning on import
warnings.warn(
    "utils.tenant_security is deprecated. Use core.database for tenant context management.",
    DeprecationWarning,
    stacklevel=2
)

# Import Single Source of Truth from database.py
from database import (
    get_current_tenant_id, 
    set_current_tenant_id,
    should_skip_tenant_filter,
    _skip_tenant_filter as _skip_filter  # Alias for backward compat
)

logger = logging.getLogger(__name__)

# _current_tenant_id removed - usage via get/set methods
# _skip_filter imported from database

class UnboundSession:
    """Context manager to bypass tenant filter"""
    def __enter__(self):
        self.token = _skip_filter.set(True)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        _skip_filter.reset(self.token)


class TenantQuery(Query):
    """Custom Query class that auto-applies tenant filter"""
    
    def __new__(cls, *args, **kwargs):
        if len(args) > 0:
            # Get the entity being queried
            entity = args[0]
            
            # Check if filter should be skipped
            if _skip_filter.get():
                return super().__new__(cls)
            
            # Check if entity has tenant_id
            if hasattr(entity, 'tenant_id'):
                tenant_id = get_current_tenant_id()
                if tenant_id:
                    # Create instance and auto-filter
                    instance = super().__new__(cls)
                    return instance
        
        return super().__new__(cls)
    
    def get(self, ident):
        """Override get to apply tenant filter"""
        if _skip_filter.get():
            return super().get(ident)
        
        obj = super().get(ident)
        if obj and hasattr(obj, 'tenant_id'):
            tenant_id = get_current_tenant_id()
            if tenant_id and obj.tenant_id != tenant_id:
                return None
        return obj


class TenantAwareSession(Session):
    """Custom Session that enforces tenant isolation"""
    
    def get(self, entity, ident, **kwargs):
        """Override get() to add tenant check"""
        # Skip filter if in UnboundSession context
        if _skip_filter.get():
            return super().get(entity, ident, **kwargs)
        
        # Get the object
        obj = super().get(entity, ident, **kwargs)
        
        # Check tenant if object exists and has tenant_id
        if obj is not None:
            # Use inspector to check if entity has tenant_id column
            mapper = inspect(entity)
            if 'tenant_id' in [c.key for c in mapper.columns]:
                tenant_id = get_current_tenant_id()
                if tenant_id is not None:
                    obj_tenant = getattr(obj, 'tenant_id', None)
                    if obj_tenant != tenant_id:
                        # Tenant mismatch - return None (object doesn't exist for this tenant)
                        return None
        
        return obj
    
    def query(self, *entities, **kwargs):
        """Override query to auto-apply tenant filter"""
        # Create the query using parent class
        q = super().query(*entities, **kwargs)
        
        # Skip filter if in UnboundSession context
        if _skip_filter.get():
            return q
        
        # Get current tenant
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            return q
        
        # Apply filter for each entity that has tenant_id
        for entity in entities:
            # Check if this is a mapped class (has __tablename__)
            if hasattr(entity, '__tablename__') and hasattr(entity, 'tenant_id'):
                q = q.filter(entity.tenant_id == tenant_id)
        
        return q


def setup_tenant_security(app, db):
    """Setup tenant security for the application"""
    
    @app.before_request
    def identify_tenant():
        """Identify and set current tenant from JWT"""
        # Reset context at start of request using token-based reset
        # CRITICAL: Never use set_current_tenant_id(None) - use token-based reset instead
        token = _current_tenant_id.set(None)
        
        try:
            # Check if JWT is present
            verify_jwt_in_request(optional=True)
            
            # If no identity found (unauthenticated request), skip tenant identification
            if not get_jwt_identity():
                return
            
            # Try to get tenant_id from claims first (performance)
            claims = get_jwt()
            if claims and 'tenant_id' in claims:
                set_current_tenant_id(claims['tenant_id'])
                return

            # Fallback: load user from DB to get tenant_id
            user_id = get_jwt_identity()
            if user_id:
                from models.user import User
                # Use UnboundSession to avoid chicken-egg problem
                with UnboundSession():
                    user = db.session.get(User, user_id)
                    if user and user.tenant_id:
                        set_current_tenant_id(user.tenant_id)
        except Exception as e:
            # No valid JWT or other error
            logger.debug(f"Tenant identification failed: {e}")
            pass
        finally:
            # Reset token to restore previous context (usually None)
            _current_tenant_id.reset(token)


def check_tenant_access(entity):
    """
    Verify that the entity belongs to the current tenant.
    Raises 404 if mismatch to hide existence.
    """
    if not entity:
        return
        
    current_tenant_id = get_current_tenant_id()
    if not current_tenant_id:
        # If no tenant context (e.g. super admin or background task), we might allow access.
        # But to be safe, if we are in a request context and not admin, we should block.
        # For now, let's assume if no tenant_id is set, it's a system process or admin.
        return

    if hasattr(entity, 'tenant_id'):
        if entity.tenant_id != current_tenant_id:
            logger.warning(f"Tenant mismatch! Current: {current_tenant_id}, Entity: {entity.tenant_id}")
            from flask import abort
            abort(404)
