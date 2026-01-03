
from app import app
from models import Permission

with app.app_context():
    # Check for 'patients.view' specifically
    p = Permission.query.filter_by(name='patients.view').first()
    print(f"patients.view exists: {p is not None}")
    
    # Check for 'admin.patients.view'
    ap = Permission.query.filter_by(name='admin.patients.view').first()
    print(f"admin.patients.view exists: {ap is not None}")
    
    # Helper: count permissions starting with 'admin.' vs those that don't
    admin_count = Permission.query.filter(Permission.name.startswith('admin.')).count()
    total_count = Permission.query.count()
    print(f"Total Permissions: {total_count}")
    print(f"Admin Permissions: {admin_count}")
    print(f"Tenant Permissions (approx): {total_count - admin_count}")
