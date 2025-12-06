#!/usr/bin/env python3
"""
Admin Panel Permission System Seed Data

Bu script admin panel için varsayılan rolleri ve izinleri oluşturur.
İlk kurulumda veya migration sonrasında çalıştırılmalıdır.

Kullanım:
    python scripts/seed_admin_permissions.py
    
    # Veya app context içinde:
    from scripts.seed_admin_permissions import seed_admin_permissions
    seed_admin_permissions()
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db, AdminUser
from models.admin_permission import (
    AdminRoleModel, 
    AdminPermissionModel,
    DEFAULT_ADMIN_PERMISSIONS,
    DEFAULT_ADMIN_ROLES
)


def seed_admin_permissions(app=None):
    """
    Admin panel için varsayılan izinleri ve rolleri oluşturur.
    
    Bu fonksiyon idempotent'tir - tekrar çalıştırıldığında 
    mevcut kayıtları güncellemez, sadece eksikleri ekler.
    """
    if app is None:
        from app import app
    
    with app.app_context():
        print("=" * 60)
        print("Admin Panel Permission System Seed")
        print("=" * 60)
        
        # 1. İzinleri oluştur
        print("\n1. Creating Admin Permissions...")
        permissions_created = 0
        permissions_existing = 0
        
        for perm_data in DEFAULT_ADMIN_PERMISSIONS:
            existing = AdminPermissionModel.query.filter_by(code=perm_data['code']).first()
            if not existing:
                perm = AdminPermissionModel(
                    code=perm_data['code'],
                    label=perm_data['label'],
                    description=perm_data.get('description', ''),
                    category=perm_data.get('category', '')
                )
                db.session.add(perm)
                permissions_created += 1
                print(f"   + Created: {perm_data['code']}")
            else:
                permissions_existing += 1
        
        db.session.commit()
        print(f"   Created: {permissions_created}, Existing: {permissions_existing}")
        
        # 2. Rolleri oluştur
        print("\n2. Creating Admin Roles...")
        roles_created = 0
        roles_existing = 0
        
        for role_data in DEFAULT_ADMIN_ROLES:
            existing = AdminRoleModel.query.filter_by(name=role_data['name']).first()
            if not existing:
                role = AdminRoleModel(
                    name=role_data['name'],
                    description=role_data.get('description', ''),
                    is_system_role=role_data.get('is_system_role', False)
                )
                db.session.add(role)
                db.session.flush()  # Get ID
                
                # İzinleri ekle
                perm_codes = role_data.get('permissions', [])
                if perm_codes == '*':
                    # Tüm izinler
                    all_perms = AdminPermissionModel.query.all()
                    for perm in all_perms:
                        role.permissions.append(perm)
                else:
                    for perm_code in perm_codes:
                        perm = AdminPermissionModel.query.filter_by(code=perm_code).first()
                        if perm:
                            role.permissions.append(perm)
                
                roles_created += 1
                perm_count = role.permissions.count()
                print(f"   + Created: {role_data['name']} ({perm_count} permissions)")
            else:
                roles_existing += 1
        
        db.session.commit()
        print(f"   Created: {roles_created}, Existing: {roles_existing}")
        
        # 3. admin@x-ear.com kullanıcısına SuperAdmin rolü ata
        print("\n3. Assigning SuperAdmin role to admin@x-ear.com...")
        admin_user = AdminUser.query.filter_by(email='admin@x-ear.com').first()
        super_admin_role = AdminRoleModel.query.filter_by(name='SuperAdmin').first()
        
        if admin_user and super_admin_role:
            if super_admin_role not in admin_user.admin_roles.all():
                admin_user.admin_roles.append(super_admin_role)
                db.session.commit()
                print(f"   + Assigned SuperAdmin role to {admin_user.email}")
            else:
                print(f"   = Already assigned to {admin_user.email}")
        else:
            if not admin_user:
                print("   ! admin@x-ear.com user not found")
            if not super_admin_role:
                print("   ! SuperAdmin role not found")
        
        # 4. Özet
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        
        total_permissions = AdminPermissionModel.query.count()
        total_roles = AdminRoleModel.query.count()
        system_roles = AdminRoleModel.query.filter_by(is_system_role=True).count()
        
        print(f"Total Permissions: {total_permissions}")
        print(f"Total Roles: {total_roles} ({system_roles} system roles)")
        
        print("\nRoles and their permissions:")
        for role in AdminRoleModel.query.all():
            perm_count = role.permissions.count()
            user_count = role.users.count()
            system_tag = " [SYSTEM]" if role.is_system_role else ""
            print(f"  - {role.name}{system_tag}: {perm_count} permissions, {user_count} users")
        
        print("\n✅ Admin permission system seed completed!")
        
        return {
            'permissions_created': permissions_created,
            'roles_created': roles_created,
            'total_permissions': total_permissions,
            'total_roles': total_roles
        }


def reset_admin_permissions(app=None):
    """
    Admin panel izin sistemini sıfırlar ve yeniden oluşturur.
    
    DİKKAT: Bu işlem mevcut rol-izin atamalarını siler!
    """
    if app is None:
        from app import app
    
    with app.app_context():
        print("⚠️  Resetting admin permission system...")
        
        # Junction table'ları temizle
        from models.admin_permission import admin_role_permissions, admin_user_roles
        db.session.execute(admin_role_permissions.delete())
        db.session.execute(admin_user_roles.delete())
        
        # Rolleri ve izinleri sil
        AdminRoleModel.query.delete()
        AdminPermissionModel.query.delete()
        
        db.session.commit()
        print("   Cleared existing data")
        
        # Yeniden oluştur
        return seed_admin_permissions(app)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Seed admin permissions')
    parser.add_argument('--reset', action='store_true', help='Reset and recreate all permissions')
    args = parser.parse_args()
    
    if args.reset:
        reset_admin_permissions()
    else:
        seed_admin_permissions()
