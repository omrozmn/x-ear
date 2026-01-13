
"""
LEGACY SHIM: database.py
========================
DEPRECATED: This module has been moved to `core.database`.
Please update your imports to use `core.database` instead.
SUNSET DATE: 2026-04-01
This shim will be removed in a future release.
"""
from core.database import * # noqa: F401, F403
from core.database import (
    _skip_tenant_filter,
    _current_tenant_id,
    _default_sqlite_path
)
