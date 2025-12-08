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
from flask_jwt_extended import jwt_required

from models import db, AdminUser
from models.admin_permission import AdminRoleModel, AdminPermissionModel
from utils.admin_permissions import (
    require_admin_permission,
    require_super_admin,
    AdminPermissions
)

logger = logging.getLogger(__name__)


def success_response(data: dict, status: int = 200):
    """Standard success response wrapper"""
    return jsonify({'success': True, 'data': data}), status


def error_response(message: str, status: int = 400):
    """Standard error response wrapper"""
    return jsonify({'success': False, 'error': {'message': message}}), status


admin_roles_bp = Blueprint('admin_roles', __name__)


# =============================================================================
# ROLES ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/roles', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_READ)
def get_admin_roles():
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
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_READ)
def get_admin_role(role_id):
    """Tek bir rol detayını getir"""
    role = AdminRoleModel.query.get(role_id)
    
    if not role:
        return error_response('Rol bulunamadı', 404)
    
    return success_response({
        'role': role.to_dict(include_permissions=True)
    })


@admin_roles_bp.route('/api/admin/roles', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_MANAGE)
def create_admin_role():
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
    
    logger.info(f"Admin role created: {role.name} by user")
    
    return success_response({
        'message': 'Rol oluşturuldu',
        'role': role.to_dict(include_permissions=True)
    }, 201)


@admin_roles_bp.route('/api/admin/roles/<role_id>', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_MANAGE)
def update_admin_role(role_id):
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
@jwt_required()
@require_super_admin
def delete_admin_role(role_id):
    """
    Rol sil
    
    Not: System role'ler silinemez
    """
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
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_READ)
def get_admin_role_permissions(role_id):
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
@jwt_required()
@require_super_admin
def update_admin_role_permissions(role_id):
    """
    Rol izinlerini güncelle
    
    Body:
        permissions: list[str] - İzin kodları
    
    Not: SuperAdmin rolünün izinleri değiştirilemez
    """
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
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_READ)
def get_admin_permissions():
    """
    Tüm izinleri listele
    
    Query params:
        category: str - Kategoriye göre filtrele
    """
    query = AdminPermissionModel.query
    
    category = request.args.get('category')
    if category:
        query = query.filter_by(category=category)
    
    permissions = query.order_by(AdminPermissionModel.category, AdminPermissionModel.code).all()
    
    # Kategorilere göre grupla
    grouped = {}
    for perm in permissions:
        cat = perm.category or 'other'
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(perm.to_dict())
    
    return success_response({
        'permissions': [p.to_dict() for p in permissions],
        'grouped': grouped,
        'categories': list(grouped.keys()),
        'total': len(permissions)
    })


# =============================================================================
# ADMIN USERS ENDPOINTS
# =============================================================================

@admin_roles_bp.route('/api/admin/admin-users', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.USERS_READ)
def get_admin_users_with_roles():
    """Admin kullanıcıları rolleriyle birlikte listele"""
    users = AdminUser.query.filter_by(is_active=True).order_by(AdminUser.email).all()
    
    return success_response({
        'users': [u.to_dict(include_roles=True) for u in users],
        'total': len(users)
    })


@admin_roles_bp.route('/api/admin/admin-users/<user_id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.USERS_READ)
def get_admin_user_detail(user_id):
    """Admin kullanıcı detayı"""
    user = AdminUser.query.get(user_id)
    
    if not user:
        return error_response('Kullanıcı bulunamadı', 404)
    
    return success_response({
        'user': user.to_dict(include_roles=True)
    })


@admin_roles_bp.route('/api/admin/admin-users/<user_id>/roles', methods=['PUT'])
@jwt_required()
@require_super_admin
def update_admin_user_roles(user_id):
    """
    Kullanıcıya rol ata
    
    Body:
        role_ids: list[str] - Rol ID'leri
    
    Not: admin@x-ear.com kullanıcısından SuperAdmin rolü kaldırılamaz
    """
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
@jwt_required()
@require_admin_permission(AdminPermissions.ROLES_READ)
def get_my_admin_permissions():
    """
    Mevcut admin kullanıcısının izinlerini döndürür.
    Frontend için - sidebar, buton gizleme vb.
    """
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    jwt_data = get_jwt()
    
    # Admin token mu? (claim name is 'type' from login)
    token_type = jwt_data.get('type') or jwt_data.get('token_type')
    if token_type != 'admin':
        return error_response('Bu endpoint sadece admin panel kullanıcıları için', 403)
    
    admin_user_id = get_jwt_identity()
    user = AdminUser.query.get(admin_user_id)
    
    if not user:
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
