import os
import sys
from sqlalchemy import inspect

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'apps/backend'))

from app import app, db
from models.base import BaseModel

def audit_models():
    print("Auditing models for Tenant Security...")
    
    # Get all models
    models = []
    # Try newer SQLAlchemy registry access first
    try:
        registry = db.Model.registry._class_registry
    except AttributeError:
        # Fallback for older SQLAlchemy
        registry = db.Model._decl_class_registry

    for cls in registry.values():
        if hasattr(cls, '__tablename__'):
            models.append(cls)
            
    exempt_models = ['admin_users', 'tenants', 'plans', 'addons', 'system_settings', 'sms_packages', 'sms_provider_configs', 'alembic_version', 'permissions', 'roles', 'role_permissions']
    
    issues = []
    
    for model in models:
        table_name = model.__tablename__
        if table_name in exempt_models:
            continue
            
        mapper = inspect(model)
        columns = [c.key for c in mapper.columns]
        
        has_tenant_id = 'tenant_id' in columns
        
        # Check if model inherits from BaseModel (which has query_class=TenantQuery)
        is_secure_base = issubclass(model, BaseModel)
        
        if has_tenant_id:
            if not is_secure_base:
                issues.append(f"CRITICAL: Model '{model.__name__}' ({table_name}) has tenant_id but does not inherit from BaseModel!")
            else:
                # Double check query_class
                # Note: query_class is usually on the class itself or inherited
                qc = getattr(model, 'query_class', None)
                if qc is None or qc.__name__ != 'TenantQuery':
                     issues.append(f"CRITICAL: Model '{model.__name__}' ({table_name}) has tenant_id but query_class is NOT TenantQuery! Found: {qc}")
        else:
             # If it's not an exempt model and has no tenant_id, warn about it
             # issues.append(f"WARNING: Model '{model.__name__}' ({table_name}) has NO tenant_id. Is this intentional?")
             pass
             
    if issues:
        print("\nFound security issues:")
        for issue in issues:
            print(issue)
        sys.exit(1)
    else:
        print("\nAll tenant-specific models are secure (inherit from BaseModel with TenantQuery).")
        sys.exit(0)

if __name__ == "__main__":
    with app.app_context():
        audit_models()
