"""
Tenant Scoping Mixins for Multi-Tenancy Security (G-02)

This module provides the TenantScopedMixin that should be inherited by all
models requiring tenant isolation. The mixin defines the tenant_id column
and ensures proper filtering through SQLAlchemy event handlers.

CRITICAL RULES:
1. All tenant-scoped models MUST inherit from TenantScopedMixin
2. SQLAlchemy event handler filters ONLY TenantScopedMixin subclasses (not Base)
3. Never use with_loader_criteria(Base, ...) - always use TenantScopedMixin

Usage:
    class Party(Base, TenantScopedMixin, BaseModel):
        __tablename__ = 'parties'
        # ... other columns
"""
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import declared_attr


class TenantScopedMixin:
    """
    Mixin for models that require tenant isolation.
    
    All models inheriting this mixin will:
    1. Have a tenant_id column with ForeignKey to tenants table
    2. Be automatically filtered by the SQLAlchemy event handler
    3. Be included in tenant isolation checks
    
    IMPORTANT: The SQLAlchemy event handler in core/database.py filters
    ONLY models that inherit from this mixin, not all Base subclasses.
    This prevents performance issues and incorrect filtering.
    """
    
    @declared_attr
    def tenant_id(cls):
        """
        Tenant ID column with ForeignKey and index.
        
        - nullable=False: Every tenant-scoped record MUST have a tenant
        - index=True: Optimizes tenant-filtered queries
        """
        return Column(
            String(36), 
            ForeignKey('tenants.id', ondelete='CASCADE'),
            nullable=False, 
            index=True
        )
    
    @declared_attr
    def __table_args__(cls):
        """
        Add composite index for tenant_id + id for common query patterns.
        
        Note: This is a declared_attr to allow subclasses to extend it.
        Subclasses can override and call super().__table_args__ to add more.
        """
        # Get existing table args if any
        existing_args = getattr(super(), '__table_args__', None)
        
        # Create tenant index
        tenant_index = Index(
            f'ix_{cls.__tablename__}_tenant_id',
            'tenant_id'
        )
        
        if existing_args is None:
            return (tenant_index,)
        elif isinstance(existing_args, tuple):
            return existing_args + (tenant_index,)
        elif isinstance(existing_args, dict):
            return (tenant_index, existing_args)
        else:
            return (tenant_index,)


def is_tenant_scoped(model_class) -> bool:
    """
    Check if a model class is tenant-scoped.
    
    Args:
        model_class: SQLAlchemy model class to check
        
    Returns:
        True if the model inherits from TenantScopedMixin
    """
    return isinstance(model_class, type) and issubclass(model_class, TenantScopedMixin)
