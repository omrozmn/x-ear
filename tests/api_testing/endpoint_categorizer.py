"""Endpoint categorization by functional area."""
from enum import Enum


class EndpointCategory(Enum):
    """Endpoint categories for reporting."""
    ADMIN_PANEL = "ADMIN_PANEL"
    TENANT_WEB_APP = "TENANT_WEB_APP"
    AFFILIATE = "AFFILIATE"
    SYSTEM = "SYSTEM"


def categorize_endpoint(path: str) -> EndpointCategory:
    """Categorize endpoint by path.
    
    Args:
        path: Endpoint path (e.g., "/api/admin/users")
        
    Returns:
        EndpointCategory enum value
    """
    # Remove trailing slashes and query parameters
    clean_path = path.rstrip('/').split('?')[0]
    
    if clean_path.startswith('/api/admin'):
        return EndpointCategory.ADMIN_PANEL
    elif clean_path.startswith('/api/affiliates'):
        return EndpointCategory.AFFILIATE
    elif clean_path.startswith('/api'):
        return EndpointCategory.TENANT_WEB_APP
    else:
        return EndpointCategory.SYSTEM
