# Legacy Shims Module
# This module provides backward-compatible re-exports for moved modules.
# Old import paths will continue to work for 2 sprints after migration.
# 
# Example usage:
#   # Old code that still works:
#   from legacy_shims.models import User
#   
#   # Will be redirected to:
#   from core.models import User
#
# DEPRECATION NOTICE: These shims will be removed after 2 sprints.
# Please update your imports to use the new paths directly.
