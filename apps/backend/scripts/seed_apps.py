"""Seed RBAC apps, roles and permissions.
Creates a default 'admin-panel' app and core roles/permissions.
"""
from importlib import import_module

app_mod = import_module('backend.app')
app = getattr(app_mod, 'app')

from models.base import db
from models.user import User
from models.app import App
from models.role import Role
from models.permission import Permission
from models.user_app_role import UserAppRole

CORE_ROLES = [
    {'name': 'app_owner', 'description': 'Owner of an application (can transfer ownership)', 'is_system': True},
    {'name': 'app_admin', 'description': 'Admin of an application (manage entities and users)', 'is_system': True},
    {'name': 'app_viewer', 'description': 'Read-only access to app entities', 'is_system': True},
    # X-Ear CRM specific roles
    {'name': 'tenant_admin', 'description': 'Tenant administrator with full control', 'is_system': True},
    {'name': 'doctor', 'description': 'Doctor with medical access', 'is_system': True},
    {'name': 'secretary', 'description': 'Secretary with limited access', 'is_system': True},
]

CORE_PERMISSIONS = [
    {'name': 'admin-panel:access', 'description': 'Access the admin panel UI'},
    {'name': 'crm:read', 'description': 'Read CRM entities'},
    {'name': 'crm:write', 'description': 'Create/update CRM entities'},
    {'name': 'users:manage', 'description': 'Create/update/delete users'},
    {'name': 'users:view', 'description': 'View users'},
    {'name': 'notifications:send', 'description': 'Send system notifications'},
]

# X-Ear CRM specific permissions by category
CRM_PERMISSIONS = [
    # Patients
    {'name': 'patients.view', 'description': 'Hasta listesini ve detaylarini goruntuleyebilir'},
    {'name': 'patients.create', 'description': 'Yeni hasta kaydi olusturabilir'},
    {'name': 'patients.edit', 'description': 'Hasta bilgilerini guncelleyebilir'},
    {'name': 'patients.delete', 'description': 'Hasta kaydini silebilir'},
    {'name': 'patients.notes', 'description': 'Hasta notlarina erisebilir'},
    {'name': 'patients.history', 'description': 'Hasta gecmisini goruntuleyebilir'},
    
    # Sales
    {'name': 'sales.view', 'description': 'Satis listesini goruntuleyebilir'},
    {'name': 'sales.create', 'description': 'Yeni satis olusturabilir'},
    {'name': 'sales.edit', 'description': 'Satis bilgilerini guncelleyebilir'},
    {'name': 'sales.delete', 'description': 'Satis kaydini silebilir'},
    {'name': 'sales.approve', 'description': 'Satislari onaylayabilir'},
    
    # Finance
    {'name': 'finance.view', 'description': 'Finans bilgilerini goruntuleyebilir'},
    {'name': 'finance.payments', 'description': 'Odeme islemleri yapabilir'},
    {'name': 'finance.refunds', 'description': 'Iade islemleri yapabilir'},
    {'name': 'finance.reports', 'description': 'Finansal raporlari goruntuleyebilir'},
    {'name': 'finance.cash_register', 'description': 'Kasa islemlerine erisebilir'},
    
    # Invoices
    {'name': 'invoices.view', 'description': 'Faturalari goruntuleyebilir'},
    {'name': 'invoices.create', 'description': 'Fatura olusturabilir'},
    {'name': 'invoices.send', 'description': 'Fatura gonderebilir (e-fatura/e-arsiv)'},
    {'name': 'invoices.cancel', 'description': 'Fatura iptal edebilir'},
    
    # Devices
    {'name': 'devices.view', 'description': 'Cihaz listesini goruntuleyebilir'},
    {'name': 'devices.create', 'description': 'Yeni cihaz ekleyebilir'},
    {'name': 'devices.edit', 'description': 'Cihaz bilgilerini guncelleyebilir'},
    {'name': 'devices.delete', 'description': 'Cihaz kaydini silebilir'},
    {'name': 'devices.assign', 'description': 'Cihaz atamasi yapabilir'},
    
    # Inventory
    {'name': 'inventory.view', 'description': 'Stok bilgilerini goruntuleyebilir'},
    {'name': 'inventory.manage', 'description': 'Stok giris/cikis islemleri yapabilir'},
    
    # Campaigns
    {'name': 'campaigns.view', 'description': 'Kampanyalari goruntuleyebilir'},
    {'name': 'campaigns.create', 'description': 'Kampanya olusturabilir'},
    {'name': 'campaigns.edit', 'description': 'Kampanya duzenleyebilir'},
    {'name': 'campaigns.delete', 'description': 'Kampanya silebilir'},
    {'name': 'campaigns.send_sms', 'description': 'SMS gonderebilir'},
    
    # SGK
    {'name': 'sgk.view', 'description': 'SGK kayitlarini goruntuleyebilir'},
    {'name': 'sgk.create', 'description': 'SGK provizyon olusturabilir'},
    {'name': 'sgk.upload', 'description': 'SGK basvuru yukleyebilir'},
    
    # Settings
    {'name': 'settings.view', 'description': 'Ayarlari goruntuleyebilir'},
    {'name': 'settings.edit', 'description': 'Ayarlari guncelleyebilir'},
    {'name': 'settings.branches', 'description': 'Sube yonetimi yapabilir'},
    {'name': 'settings.integrations', 'description': 'Entegrasyon ayarlarini yonetebilir'},
    
    # Team
    {'name': 'team.view', 'description': 'Ekip uyelerini goruntuleyebilir'},
    {'name': 'team.create', 'description': 'Yeni ekip uyesi ekleyebilir'},
    {'name': 'team.edit', 'description': 'Ekip uyesi bilgilerini guncelleyebilir'},
    {'name': 'team.delete', 'description': 'Ekip uyesi silebilir'},
    {'name': 'team.permissions', 'description': 'Rol izinlerini yonetebilir'},
    
    # Reports
    {'name': 'reports.view', 'description': 'Raporlari goruntuleyebilir'},
    {'name': 'reports.export', 'description': 'Raporlari disari aktarabilir'},
    
    # Dashboard
    {'name': 'dashboard.view', 'description': 'Dashboard goruntuleyebilir'},
    {'name': 'dashboard.analytics', 'description': 'Analitik verileri goruntuleyebilir'},
]

# Role -> permissions mapping for X-Ear CRM
CRM_ROLE_PERMISSIONS_MAP = {
    'tenant_admin': [p['name'] for p in CRM_PERMISSIONS],  # All permissions
    'doctor': [
        'patients.view', 'patients.create', 'patients.edit', 'patients.notes', 'patients.history',
        'sales.view', 'sales.create',
        'devices.view', 'devices.assign',
        'dashboard.view',
        'reports.view',
    ],
    'secretary': [
        'patients.view', 'patients.create', 'patients.edit', 
        'sales.view',
        'devices.view',
        'dashboard.view',
    ],
}

ADMIN_PANEL = {
    'name': 'Admin Panel',
    'slug': 'admin-panel',
    'description': 'Central app for managing CRM entities and users.'
}


def _get_or_create_role(session, name, **kwargs):
    r = session.query(Role).filter_by(name=name).one_or_none()
    if r:
        return r
    r = Role()
    r.name = name
    r.description = kwargs.get('description')
    r.is_system = kwargs.get('is_system', False)
    session.add(r)
    session.flush()
    return r


def _get_or_create_permission(session, name, **kwargs):
    p = session.query(Permission).filter_by(name=name).one_or_none()
    if p:
        return p
    p = Permission()
    p.name = name
    p.description = kwargs.get('description')
    session.add(p)
    session.flush()
    return p


def main():
    with app.app_context():
        # Create/core roles and permissions
        for rinfo in CORE_ROLES:
            _get_or_create_role(db.session, rinfo['name'], description=rinfo.get('description'), is_system=rinfo.get('is_system'))

        for pinfo in CORE_PERMISSIONS:
            _get_or_create_permission(db.session, pinfo['name'], description=pinfo.get('description'))

        # Create CRM-specific permissions
        for pinfo in CRM_PERMISSIONS:
            _get_or_create_permission(db.session, pinfo['name'], description=pinfo.get('description'))

        db.session.commit()

        # Wire up role -> permission relations (CORE)
        for rname, pnames in ROLE_PERMISSIONS_MAP.items():
            role = Role.query.filter_by(name=rname).one_or_none()
            if not role:
                continue
            for pname in pnames:
                perm = Permission.query.filter_by(name=pname).one_or_none()
                if perm and perm not in role.permissions:
                    role.permissions.append(perm)
        
        # Wire up role -> permission relations (CRM)
        for rname, pnames in CRM_ROLE_PERMISSIONS_MAP.items():
            role = Role.query.filter_by(name=rname).one_or_none()
            if not role:
                continue
            for pname in pnames:
                perm = Permission.query.filter_by(name=pname).one_or_none()
                if perm and perm not in role.permissions:
                    role.permissions.append(perm)
        
        db.session.commit()

        # Ensure admin-panel app exists
        app_rec = App.query.filter_by(slug=ADMIN_PANEL['slug']).one_or_none()
        if not app_rec:
            app_rec = App()
            app_rec.name = ADMIN_PANEL['name']
            app_rec.slug = ADMIN_PANEL['slug']
            app_rec.description = ADMIN_PANEL['description']
            db.session.add(app_rec)
            db.session.flush()

        # Assign an owner user - prefer existing admin user by role
        # Prefer explicit owner from env variable if provided
        from os import getenv
        owner_email_env = getenv('ADMIN_OWNER_EMAIL')
        owner = None
        if owner_email_env:
            # Use .first() for resilience if duplicates exist; prefer the earliest created match
            owner = User.query.filter_by(email=owner_email_env).order_by(User.created_at).first()
        if not owner:
            # fallback to seeded admin emails used by other seed scripts
            # If multiple matches exist, pick the earliest created one to be deterministic
            owner = User.query.filter(User.email.in_(['admin@xear.test', 'seed-admin@example.com'])).order_by(User.created_at).first()
            print(f"DEBUG: Looking for owner with emails ['admin@xear.test', 'seed-admin@example.com'], found: {owner}")
            
            # If still no owner, try to find any admin user by role
            if not owner:
                owner = User.query.filter_by(role='admin').order_by(User.created_at).first()
                print(f"DEBUG: Looking for any admin user by role, found: {owner}")

        if owner:
            print(f"DEBUG: Setting owner {owner.email} (id: {owner.id}) for app {app_rec.slug}")
            # ensure app owner_user_id set
            app_rec.owner_user_id = owner.id
            # ensure owner has app_owner role for this app
            rar = UserAppRole.query.filter_by(user_id=owner.id, app_id=app_rec.id, role_id=None).one_or_none()
            # naive way: find app_owner role id
            app_owner_role = Role.query.filter_by(name='app_owner').one_or_none()
            if app_owner_role:
                existing = UserAppRole.query.filter_by(user_id=owner.id, app_id=app_rec.id, role_id=app_owner_role.id).one_or_none()
                if not existing:
                    uar = UserAppRole()
                    uar.user_id = owner.id
                    uar.app_id = app_rec.id
                    uar.role_id = app_owner_role.id
                    db.session.add(uar)
        db.session.commit()
        print('RBAC apps/roles/permissions seeding complete')


if __name__ == '__main__':
    main()
