"""
Admin Panel Role & Permission Management API

Bu modül admin panel kullanıcılarının rol ve izin yönetimini sağlar.
CRM tarafındaki tenant permission sisteminden tamamen bağımsızdır.

Endpoints:
    GET    /api/admin/roles                    - Tüm rolleri listele
    GET    /api/admin/roles/<id>               - Rol detayı
    POST   /api/admin/roles                    - Yeni rol oluştur
    PUT    /api/admin/roles/<id>               - Rol güncelle
    DELETE /api/admin/roles/<id>               - Rol sil
    
    GET    /api/admin/roles/<id>/permissions   - Rol izinlerini getir
    PUT    /api/admin/roles/<id>/permissions   - Rol izinlerini güncelle
    
    GET    /api/admin/permissions              - Tüm izinleri listele
    
    GET    /api/admin/admin-users              - Admin kullanıcıları listele
    PUT    /api/admin/admin-users/<id>/roles   - Kullanıcıya rol ata
"""
import logging
from flask import Blueprint, request, jsonify

from models import db, AdminUser
from models.admin_permission import AdminRoleModel, AdminPermissionModel
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions

logger = logging.getLogger(__name__)

admin_roles_bp = Blueprint('admin_roles', __name__)


# =============================================================================
# ROLES ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/roles', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_admin_roles(ctx):
    """
    Tüm admin rollerini listele
    
    Query params:
        include_permissions: bool - İzinleri dahil et
    """
    include_permissions = request.args.get('include_permissions', 'false').lower() == 'true'
    
    roles = AdminRoleModel.query.order_by(AdminRoleModel.name).all()
    
    return success_response({
        'roles': [r.to_dict(include_permissions=include_permissions) for r in roles],
        'total': len(roles)
    })


@admin_roles_bp.route('/api/admin/roles/<role_id>', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_admin_role(ctx, role_id):
    """Tek bir rol detayını getir"""
    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    return success_response({
        'role': role.to_dict(include_permissions=True)
    })


@admin_roles_bp.route('/api/admin/roles', methods=['POST'])
@unified_access(permission=AdminPermissions.ROLES_MANAGE)
def create_admin_role(ctx):
    """
    Yeni rol oluştur
    
    Body:
        name: str - Rol adı (unique)
        description: str - Açıklama
        permissions: list[str] - İzin kodları
    """
    data = request.get_json()
    
    name = data.get('name', '').strip()
    if not name:
        return error_response('Rol adı zorunludur', 400)
    
    # Aynı isimde rol var mı?
    existing = AdminRoleModel.query.filter_by(name=name).first()
    if existing:
        return error_response('Bu isimde bir rol zaten var', 400)
    
    role = AdminRoleModel(
        name=name,
        description=data.get('description', ''),
        is_system_role=False  # Manuel oluşturulan roller system role değil
    )
    
    # İzinleri ekle
    permission_codes = data.get('permissions', [])
    for code in permission_codes:
        perm = AdminPermissionModel.query.filter_by(code=code).first()
        if perm:
            role.permissions.append(perm)
    
    db.session.add(role)
    db.session.commit()
    
    logger.info(f"Admin role created: {role.name} by user {ctx.principal_id}")
    
    return success_response({
        'message': 'Rol oluşturuldu',
        'role': role.to_dict(include_permissions=True)
    }, 201)


@admin_roles_bp.route('/api/admin/roles/<role_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.ROLES_MANAGE)
def update_admin_role(ctx, role_id):
    """
    Rol güncelle
    
    Body:
        name: str - Rol adı
        description: str - Açıklama
    
    Not: System role'ler için name değiştirilemez
    """
    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    data = request.get_json()
    
    # System role ise isim değiştirilemez
    if role.is_system_role and data.get('name') and data.get('name') != role.name:
        return error_response('Sistem rollerinin adı değiştirilemez', 400)
    
    # İsim benzersiz mi?
    new_name = data.get('name', '').strip()
    if new_name and new_name != role.name:
        existing = AdminRoleModel.query.filter_by(name=new_name).first()
        if existing:
            return error_response('Bu isimde bir rol zaten var', 400)
        role.name = new_name
    
    if 'description' in data:
        role.description = data['description']
    
    db.session.commit()
    
    logger.info(f"Admin role updated: {role.name}")
    
    return success_response({
        'message': 'Rol güncellendi',
        'role': role.to_dict(include_permissions=True)
    })


@admin_roles_bp.route('/api/admin/roles/<role_id>', methods=['DELETE'])
@unified_access() # No explicit permission needed as we check super admin below, but unified checks authn
def delete_admin_role(ctx, role_id):
    """
    Rol sil
    
    Not: System role'ler silinemez
    """
    # Strict Super Admin Check
    if not ctx.is_super_admin:
        return error_response('Bu işlem için Super Admin yetkisi gereklidir', 403)

    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    if role.is_system_role:
        return error_response('Sistem rolleri silinemez', 400)
    
    # Role atanmış kullanıcı var mı?
    user_count = role.users.count()
    if user_count > 0:
        return error_response(
            f'Bu role atanmış {user_count} kullanıcı var. Önce kullanıcıları başka bir role taşıyın.',
            400
        )
    
    role_name = role.name
    db.session.delete(role)
    db.session.commit()
    
    logger.info(f"Admin role deleted: {role_name}")
    
    return success_response({'message': 'Rol silindi'})


# =============================================================================
# ROLE PERMISSIONS ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/roles/<role_id>/permissions', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_admin_role_permissions(ctx, role_id):
    """Rol izinlerini getir"""
    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    return success_response({
        'role_id': role.id,
        'role_name': role.name,
        'is_system_role': role.is_system_role,
        'permissions': [p.to_dict() for p in role.permissions.all()]
    })


@admin_roles_bp.route('/api/admin/roles/<role_id>/permissions', methods=['PUT'])
@unified_access() # Super Admin Check only
def update_admin_role_permissions(ctx, role_id):
    """
    Rol izinlerini güncelle
    
    Body:
        permissions: list[str] - İzin kodları
    
    Not: SuperAdmin rolünün izinleri değiştirilemez
    """
    # Strict Super Admin Check
    if not ctx.is_super_admin:
        return error_response('Bu işlem için Super Admin yetkisi gereklidir', 403)

    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    # SuperAdmin izinleri değiştirilemez
    if role.name == 'SuperAdmin':
        return error_response('SuperAdmin rolünün izinleri değiştirilemez', 400)
    
    data = request.get_json()
    permission_codes = data.get('permissions', [])
    
    # Mevcut izinleri temizle
    role.permissions = []
    db.session.flush()
    
    # Yeni izinleri ekle
    for code in permission_codes:
        perm = AdminPermissionModel.query.filter_by(code=code).first()
        if perm:
            role.permissions.append(perm)
    
    db.session.commit()
    
    logger.info(f"Admin role permissions updated: {role.name}, {len(permission_codes)} permissions")
    
    return success_response({
        'message': 'Rol izinleri güncellendi',
        'role': role.to_dict(include_permissions=True)
    })


# =============================================================================
# PERMISSIONS ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/permissions', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_admin_permissions(ctx):
    """
    Tüm izinleri listele
    
    Query params:
        category: str - Kategoriye göre filtrele
    """
    # Permission categories for frontend grouping (Same as legacy permissions.py to support UI)
    PERMISSION_CATEGORIES = {
        'patients': {'label': 'Hastalar', 'icon': 'users'},
        'sales': {'label': 'Satışlar', 'icon': 'shopping-cart'},
        'finance': {'label': 'Finans', 'icon': 'dollar-sign'},
        'invoices': {'label': 'Faturalar', 'icon': 'file-text'},
        'devices': {'label': 'Cihazlar', 'icon': 'headphones'},
        'inventory': {'label': 'Stok', 'icon': 'package'},
        'campaigns': {'label': 'Kampanyalar', 'icon': 'megaphone'},
        'sgk': {'label': 'SGK', 'icon': 'shield'},
        'settings': {'label': 'Ayarlar', 'icon': 'settings'},
        'team': {'label': 'Ekip', 'icon': 'users-round'},
        'reports': {'label': 'Raporlar', 'icon': 'bar-chart'},
        'dashboard': {'label': 'Dashboard', 'icon': 'layout-dashboard'},
    }

    query = AdminPermissionModel.query
    
    category = request.args.get('category')
    if category:
        query = query.filter_by(category=category)
    
    permissions = query.order_by(AdminPermissionModel.category, AdminPermissionModel.code).all()
    
    # Group permissions by category with UI metadata
    grouped = {}
    ungrouped = []
    
    for perm in permissions:
        # Use existing category field or infer from code
        cat = perm.category
        if not cat and '.' in perm.code:
             cat = perm.code.split('.')[0]
        
        # Fallback
        cat = cat or 'other'
        
        pdict = perm.to_dict()
        
        if cat in PERMISSION_CATEGORIES:
            if cat not in grouped:
                grouped[cat] = {
                    'category': cat,
                    'label': PERMISSION_CATEGORIES[cat]['label'],
                    'icon': PERMISSION_CATEGORIES[cat]['icon'],
                    'permissions': []
                }
            grouped[cat]['permissions'].append(pdict)
        else:
            ungrouped.append(pdict)
    
    result = list(grouped.values())
    if ungrouped:
        result.append({
            'category': 'other',
            'label': 'Diğer',
            'icon': 'more-horizontal',
            'permissions': ungrouped
        })
    
    return success_response({
        'data': result,  # Frontend expects list of groups in 'data'
        'all': [p.to_dict() for p in permissions], # Frontend expects 'all'
        'total': len(permissions)
    })


# =============================================================================
# ADMIN USERS ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/admin-users', methods=['GET'])
@unified_access(permission=AdminPermissions.USERS_READ)
def get_admin_users_with_roles(ctx):
    """Admin kullanıcıları rolleriyle birlikte listele"""
    users = AdminUser.query.filter_by(is_active=True).order_by(AdminUser.email).all()
    
    return success_response({
        'users': [u.to_dict(include_roles=True) for u in users],
        'total': len(users)
    })


@admin_roles_bp.route('/api/admin/admin-users/<user_id>', methods=['GET'])
@unified_access(permission=AdminPermissions.USERS_READ)
def get_admin_user_detail(ctx, user_id):
    """Admin kullanıcı detayı"""
    user = AdminUser.query.get(user_id)
    
    if not user:
        return error_response('Kullanıcı bulunamadı', 404)
    
    return success_response({
        'user': user.to_dict(include_roles=True)
    })


@admin_roles_bp.route('/api/admin/admin-users/<user_id>/roles', methods=['PUT'])
@unified_access()
def update_admin_user_roles(ctx, user_id):
    """
    Kullanıcıya rol ata
    
    Body:
        role_ids: list[str] - Rol ID'leri
    
    Not: admin@x-ear.com kullanıcısından SuperAdmin rolü kaldırılamaz
    """
    # Strict Super Admin Check
    if not ctx.is_super_admin:
        return error_response('Bu işlem için Super Admin yetkisi gereklidir', 403)

    user = AdminUser.query.get(user_id)
    
    if not user:
        return error_response('Kullanıcı bulunamadı', 404)
    
    data = request.get_json()
    role_ids = data.get('role_ids', [])
    
    # admin@x-ear.com için SuperAdmin zorunlu
    if user.email == 'admin@x-ear.com':
        super_admin = AdminRoleModel.query.filter_by(name='SuperAdmin').first()
        if super_admin and super_admin.id not in role_ids:
            return error_response(
                'admin@x-ear.com kullanıcısından SuperAdmin rolü kaldırılamaz',
                400
            )
    
    # Mevcut rolleri temizle
    user.admin_roles = []
    db.session.flush()
    
    # Yeni rolleri ekle
    for role_id in role_ids:
        role = AdminRoleModel.query.get(role_id)
        if role:
            user.admin_roles.append(role)
    
    db.session.commit()
    
    logger.info(f"Admin user roles updated: {user.email}, {len(role_ids)} roles")
    
    return success_response({
        'message': 'Kullanıcı rolleri güncellendi',
        'user': user.to_dict(include_roles=True)
    })


@admin_roles_bp.route('/api/admin/my-permissions', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_my_admin_permissions(ctx):
    """
    Mevcut admin kullanıcısının izinlerini döndürür.
    Frontend için - sidebar, buton gizleme vb.
    """
    # Context'ten principal'ı al
    user_id = ctx.principal_id
    
    # ctx ensures we have a valid principal.
    # We must ensure it's an admin user (already handled by permissions check if ROLES_READ is admin only)
    # But for safety and type checking:
    
    user = AdminUser.query.get(user_id)
    
    # If not found in AdminUser, check standard User table for super_admin role
    if not user:
        from models.user import User
        standard_user = User.query.get(user_id)
        if standard_user and standard_user.role == 'super_admin':
            all_permissions = AdminPermissionModel.query.all()
            return success_response({
                'is_super_admin': True,
                'permissions': [p.code for p in all_permissions],
                'roles': ['SuperAdmin']
            })
            
        return error_response('Kullanıcı bulunamadı', 404)
    
    # SuperAdmin tüm izinlere sahip
    if user.is_super_admin():
        all_permissions = AdminPermissionModel.query.all()
        return success_response({
            'is_super_admin': True,
            'permissions': [p.code for p in all_permissions],
            'roles': ['SuperAdmin']
        })
    
    return success_response({
        'is_super_admin': False,
        'permissions': list(user.get_all_permissions()),
        'roles': [r.name for r in user.admin_roles]
    })


def register_admin_roles_blueprint(app):
    """Blueprint'i Flask app'e kaydet"""
    app.register_blueprint(admin_roles_bp)
    logger.info("Admin roles blueprint registered")
