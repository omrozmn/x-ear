
from app import app
from models import Permission

def list_tenant_permissions():
    with app.app_context():
        # Using the same filter logic as the API
        all_perms = Permission.query.order_by(Permission.name).all()
        perms = [p for p in all_perms if not p.name.startswith('admin.') and not p.name.startswith('system.') and not p.name.startswith('activity_logs.')]
        
        print(f"Total Tenant Permissions: {len(perms)}\n")
        
        # Group by category for easier reading
        grouped = {}
        for p in perms:
            category = p.name.split('.')[0]
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(p.name)
            
        for cat, p_list in grouped.items():
            print(f"--- {cat.upper()} ({len(p_list)}) ---")
            for p in p_list:
                print(f"  - {p}")
            print("")

if __name__ == "__main__":
    list_tenant_permissions()
