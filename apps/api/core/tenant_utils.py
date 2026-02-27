"""
Tenant context utility functions for routers
"""
from typing import Optional
from fastapi import HTTPException
from middleware.unified_access import UnifiedAccess


def get_effective_tenant_id(access: UnifiedAccess, allow_system: bool = False) -> str:
    """
    Get effective tenant ID from UnifiedAccess, supporting impersonation.
    
    Args:
        access: UnifiedAccess object from dependency
        allow_system: If True, allows 'system' as valid tenant_id
        
    Returns:
        Effective tenant ID
        
    Raises:
        HTTPException: If no valid tenant context found
    """
    # Use effective_tenant_id for impersonation, fallback to tenant_id
    tenant_id = access.effective_tenant_id or access.tenant_id
    
    if not tenant_id or (not allow_system and tenant_id == 'system'):
        raise HTTPException(
            status_code=400,
            detail="Lütfen işlem yapmak için bir klinik (tenant) seçiniz."
        )
    
    return tenant_id


def get_optional_tenant_id(access: UnifiedAccess) -> Optional[str]:
    """
    Get effective tenant ID if available, None otherwise.
    Useful for endpoints that work with or without tenant context.
    
    Args:
        access: UnifiedAccess object from dependency
        
    Returns:
        Effective tenant ID or None
    """
    tenant_id = access.effective_tenant_id or access.tenant_id
    return tenant_id if tenant_id and tenant_id != 'system' else None
