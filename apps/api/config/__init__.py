"""Config package for Flask application."""

from .permissions_map import (
    ENDPOINT_PERMISSIONS,
    get_permission_for_endpoint,
    get_all_permissions,
    get_endpoints_for_permission
)

__all__ = [
    'ENDPOINT_PERMISSIONS',
    'get_permission_for_endpoint',
    'get_all_permissions',
    'get_endpoints_for_permission'
]
