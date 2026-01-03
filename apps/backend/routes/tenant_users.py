"""
Tenant User Management API

Handles tenant user CRUD and company settings/assets.

STORAGE MODES:
- DEV (STORAGE_MODE=local): Files stored on disk (development only)
- PROD (STORAGE_MODE=s3): Files stored in S3/DigitalOcean Spaces

IMPORTANT: Disk-based storage is NOT suitable for production!
"""
import os
import uuid as uuid_lib
import base64
from io import BytesIO
from flask import Blueprint, request, jsonify, current_app
from models.base import db
from models.user import User
from models.tenant import Tenant
from utils.decorators import unified_access
from utils.response import success_response, error_response
from werkzeug.utils import secure_filename
import logging

logger = logging.getLogger(__name__)

tenant_users_bp = Blueprint('tenant_users', __name__)

# Allowed image extensions for stamp/signature
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
# Max file size for base64 upload (5MB)
MAX_BASE64_SIZE = 5 * 1024 * 1024

def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def _get_storage_mode():
    """Get storage mode from environment."""
    return os.getenv('STORAGE_MODE', 'local')

def _get_local_upload_folder():
    """Get or create the tenant uploads folder for local storage."""
    base_dir = current_app.config.get('UPLOAD_FOLDER', os.path.join(current_app.instance_path, 'uploads'))
    tenant_uploads = os.path.join(base_dir, 'tenant_assets')
    os.makedirs(tenant_uploads, exist_ok=True)
    return tenant_uploads


# ============================================================================
# Tenant User Management Endpoints
# ============================================================================

@tenant_users_bp.route('/tenant/users', methods=['GET'])
@unified_access(resource='tenant_users', action='read')
def list_tenant_users(ctx):
    """
    List users belonging to the current user's tenant.
    Super Admin can see all users (no tenant filter).
    Tenant Admin sees users in their tenant.
    Branch Admin sees users in their assigned branches.
    """
    if not ctx.tenant_id and not ctx.is_admin:
        return error_response('User does not belong to a tenant', 400)
    
    query = User.query
    
    # Apply tenant filtering for non-admin users
    if ctx.tenant_id:
        query = query.filter_by(tenant_id=ctx.tenant_id)
        
        # If user is branch admin, filter by assigned branches
        if ctx.user and ctx.user.role == 'admin':
            user_branch_ids = [b.id for b in ctx.user.branches]
            if user_branch_ids:
                from models.user import user_branches
                query = query.join(user_branches).filter(user_branches.c.branch_id.in_(user_branch_ids))
            else:
                # If admin has no branches assigned, return only themselves
                return success_response(data=[ctx.user.to_dict()])

    users = query.all()
    return success_response(data=[u.to_dict() for u in users])


@tenant_users_bp.route('/tenant/users', methods=['POST'])
@unified_access(resource='tenant_users', action='write')
def invite_tenant_user(ctx):
    """
    Create a new user for the tenant with username and password.
    Admin creates the user directly with credentials.
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
        
    # Only tenant_admin or admin can create users
    if ctx.user and ctx.user.role not in ['tenant_admin', 'admin']:
        return error_response('Only admins can create users', 403)

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')  # Optional
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    role = data.get('role', 'user')
    branch_ids = data.get('branchIds', [])
    
    # Validate required fields
    if not username:
        return error_response('Username is required', 400)
    if not password:
        return error_response('Password is required', 400)
    if len(password) < 6:
        return error_response('Password must be at least 6 characters', 400)
        
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return error_response('Username already exists', 409)
    
    # Check if email exists (if provided)
    if email and User.query.filter_by(email=email).first():
        return error_response('Email already exists', 409)
        
    # Create user with admin-provided credentials
    new_user = User(
        username=username,
        email=email or f"{username}@{ctx.tenant_id}.local",
        first_name=first_name,
        last_name=last_name,
        tenant_id=ctx.tenant_id,
        role=role
    )
    new_user.set_password(password)
    
    if branch_ids:
        from models.branch import Branch
        branches = Branch.query.filter(Branch.id.in_(branch_ids), Branch.tenant_id == ctx.tenant_id).all()
        new_user.branches = branches

    db.session.add(new_user)
    db.session.commit()
    
    return success_response(data=new_user.to_dict(), status_code=201)


@tenant_users_bp.route('/tenant/users/<user_id>', methods=['DELETE'])
@unified_access(resource='tenant_users', action='delete')
def delete_tenant_user(ctx, user_id):
    """
    Remove a user from the tenant.
    """
    if not ctx.tenant_id and not ctx.is_admin:
        return error_response('User does not belong to a tenant', 400)
    
    # Role check for non-super-admin
    if ctx.user and ctx.user.role not in ['tenant_admin', 'admin']:
        return error_response('Only admins can remove users', 403)
         
    user_to_delete = db.session.get(User, user_id)
    
    if not user_to_delete:
        return error_response('User not found', 404)
    
    # Tenant scoping check
    if ctx.tenant_id and user_to_delete.tenant_id != ctx.tenant_id:
        return error_response('User does not belong to your tenant', 403)
        
    # Cannot delete yourself
    if ctx.user and user_to_delete.id == ctx.user.id:
        return error_response('Cannot delete yourself', 400)
        
    db.session.delete(user_to_delete)
    db.session.commit()
    
    return success_response(message='User removed')


@tenant_users_bp.route('/tenant/users/<user_id>', methods=['PUT'])
@unified_access(resource='tenant_users', action='write')
def update_tenant_user(ctx, user_id):
    """
    Update a user in the tenant.
    """
    if not ctx.tenant_id and not ctx.is_admin:
        return error_response('User does not belong to a tenant', 400)
        
    # Only tenant_admin or admin can update users
    if ctx.user and ctx.user.role not in ['tenant_admin', 'admin']:
        return error_response('Only admins can update users', 403)
         
    user_to_update = db.session.get(User, user_id)
    
    if not user_to_update:
        return error_response('User not found', 404)
    
    # Tenant scoping check
    if ctx.tenant_id and user_to_update.tenant_id != ctx.tenant_id:
        return error_response('User does not belong to your tenant', 403)
        
    # Restriction: Admin cannot edit Tenant Admin
    if ctx.user and ctx.user.role == 'admin' and user_to_update.role == 'tenant_admin':
        return error_response('Admins cannot edit Tenant Admins', 403)
        
    data = request.get_json()
    
    if 'username' in data:
        if data['username'] != user_to_update.username:
            if User.query.filter_by(username=data['username']).first():
                return error_response('Username already exists', 409)
        user_to_update.username = data['username']
        
    if 'email' in data:
        if data['email'] != user_to_update.email:
            if User.query.filter_by(email=data['email']).first():
                return error_response('Email already exists', 409)
        user_to_update.email = data['email']
        
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return error_response('Password must be at least 6 characters', 400)
        user_to_update.set_password(data['password'])
        
    if 'firstName' in data:
        user_to_update.first_name = data['firstName']
        
    if 'lastName' in data:
        user_to_update.last_name = data['lastName']
        
    if 'role' in data:
        user_to_update.role = data['role']
        
    if 'isActive' in data:
        user_to_update.is_active = data['isActive']
        
    if 'branchIds' in data:
        from models.branch import Branch
        branches = Branch.query.filter(Branch.id.in_(data['branchIds']), Branch.tenant_id == ctx.tenant_id).all()
        user_to_update.branches = branches
        
    db.session.commit()
    
    return success_response(data=user_to_update.to_dict())


# ============================================================================
# Tenant Company Settings Endpoints
# ============================================================================

@tenant_users_bp.route('/tenant/company', methods=['GET'])
@unified_access(resource='tenant_users', action='read')
def get_tenant_company(ctx):
    """
    Get the current tenant's company information and settings.
    Returns company_info including logo, stamp, signature URLs.
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
    
    tenant = db.session.get(Tenant, ctx.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
    
    company_info = tenant.company_info or {}
    
    # If using S3, generate presigned URLs for assets
    if _get_storage_mode() == 's3':
        from services.s3_service import s3_service
        for asset_type in ['logo', 'stamp', 'signature']:
            key_field = f"{asset_type}Key"
            url_field = f"{asset_type}Url"
            if key_field in company_info and company_info[key_field]:
                try:
                    company_info[url_field] = s3_service.generate_presigned_url(
                        company_info[key_field], 
                        expiration=3600
                    )
                except Exception as e:
                    logger.warning(f"Failed to generate presigned URL for {asset_type}: {e}")
    
    return success_response(data={
        'id': tenant.id,
        'name': tenant.name,
        'companyInfo': company_info,
        'settings': tenant.settings or {}
    })


@tenant_users_bp.route('/tenant/company', methods=['PUT'])
@unified_access(resource='tenant_users', action='write')
def update_tenant_company(ctx):
    """
    Update the current tenant's company information.
    Only tenant_admin can update company info.
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
    
    # Only tenant_admin can update company settings
    if ctx.user and ctx.user.role != 'tenant_admin':
        return error_response('Only Tenant Admin can update company information', 403)
    
    tenant = db.session.get(Tenant, ctx.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
    
    data = request.get_json()
    if not data:
        return error_response('Request body is required', 400)
    
    # Merge with existing company_info
    company_info = tenant.company_info or {}
    
    # Update allowed fields
    allowed_fields = [
        'name', 'taxId', 'taxOffice', 'address', 'city', 'district', 'postalCode',
        'phone', 'fax', 'email', 'website', 
        'bankName', 'iban', 'accountHolder',
        'sgkMukellefKodu', 'sgkMukellefAdi',
        'tradeRegistryNo', 'mersisNo'
    ]
    
    for field in allowed_fields:
        if field in data:
            company_info[field] = data[field]
    
    tenant.company_info = company_info
    db.session.commit()
    
    return success_response(data={
        'id': tenant.id,
        'name': tenant.name,
        'companyInfo': company_info
    })


# ============================================================================
# Tenant Asset Upload Endpoints (Logo, Stamp, Signature)
# ============================================================================

@tenant_users_bp.route('/tenant/company/upload/<asset_type>', methods=['POST'])
@unified_access(resource='tenant_users', action='write')
def upload_tenant_asset(ctx, asset_type):
    """
    Upload a company asset (logo, stamp, or signature).
    
    STORAGE MODES:
    - local: Saves to disk (⚠️ DEV ONLY - not suitable for production)
    - s3: Saves to S3/DigitalOcean Spaces (production-ready)
    
    Accepts: 
    - multipart/form-data with 'file' field
    - JSON with base64 'data' field (max 5MB)
    
    asset_type: 'logo' | 'stamp' | 'signature'
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
    
    # Only tenant_admin can upload assets
    if ctx.user and ctx.user.role != 'tenant_admin':
        return error_response('Only Tenant Admin can upload company assets', 403)
    
    if asset_type not in ['logo', 'stamp', 'signature']:
        return error_response('Invalid asset type. Use: logo, stamp, signature', 400)
    
    tenant = db.session.get(Tenant, ctx.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
    
    file_data = None
    file_ext = 'png'
    content_type = 'image/png'
    
    # Check for multipart file upload
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return error_response('No file selected', 400)
        
        if not _allowed_file(file.filename):
            return error_response(f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}', 400)
        
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        content_type = f'image/{file_ext}' if file_ext != 'jpg' else 'image/jpeg'
        file_data = file.read()
    
    # Check for base64 upload
    elif request.is_json:
        data = request.get_json()
        if 'data' in data:
            try:
                base64_str = data['data']
                
                # Check size before decoding
                if len(base64_str) > MAX_BASE64_SIZE * 1.4:  # Base64 is ~1.33x larger
                    return error_response(f'File too large. Maximum size: {MAX_BASE64_SIZE // (1024*1024)}MB', 400)
                
                if ';base64,' in base64_str:
                    header, base64_str = base64_str.split(';base64,')
                    if 'png' in header:
                        file_ext = 'png'
                        content_type = 'image/png'
                    elif 'jpeg' in header or 'jpg' in header:
                        file_ext = 'jpg'
                        content_type = 'image/jpeg'
                    elif 'gif' in header:
                        file_ext = 'gif'
                        content_type = 'image/gif'
                    elif 'webp' in header:
                        file_ext = 'webp'
                        content_type = 'image/webp'
                
                file_data = base64.b64decode(base64_str)
                
                # Check decoded size
                if len(file_data) > MAX_BASE64_SIZE:
                    return error_response(f'File too large. Maximum size: {MAX_BASE64_SIZE // (1024*1024)}MB', 400)
                    
            except Exception as e:
                return error_response(f'Invalid base64 data: {str(e)}', 400)
    
    if not file_data:
        return error_response('No file data provided', 400)
    
    storage_mode = _get_storage_mode()
    company_info = tenant.company_info or {}
    
    # Generate unique filename  
    filename = f"{asset_type}_{uuid_lib.uuid4().hex[:8]}.{file_ext}"
    
    if storage_mode == 's3':
        # ============================================================
        # S3 STORAGE (Production Ready)
        # ============================================================
        from services.s3_service import s3_service
        
        object_key = f"tenants/{tenant.id}/assets/{filename}"
        
        # Delete old file if exists
        old_key = company_info.get(f"{asset_type}Key")
        if old_key:
            try:
                s3_service.delete_file(old_key)
            except Exception as e:
                logger.warning(f"Failed to delete old asset: {e}")
        
        # Upload to S3
        try:
            file_obj = BytesIO(file_data)
            result = s3_service.upload_file(
                file_obj=file_obj,
                folder='tenant_assets',
                tenant_id=tenant.id,
                original_filename=filename
            )
            
            # Store object key (not URL) in database
            company_info[f"{asset_type}Key"] = result['key']
            # Generate presigned URL for immediate use
            asset_url = s3_service.generate_presigned_url(result['key'], expiration=3600)
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            return error_response(f'Upload failed: {str(e)}', 500)
            
    else:
        # ============================================================
        # LOCAL STORAGE (⚠️ DEV ONLY - NOT FOR PRODUCTION)
        # ============================================================
        logger.warning("⚠️ Using LOCAL storage - NOT suitable for production!")
        
        upload_folder = _get_local_upload_folder()
        tenant_folder = os.path.join(upload_folder, tenant.id)
        os.makedirs(tenant_folder, exist_ok=True)
        
        filepath = os.path.join(tenant_folder, filename)
        
        # Delete old file if exists
        old_url = company_info.get(f"{asset_type}Url")
        if old_url and old_url.startswith('/api/tenant/assets/'):
            old_filename = old_url.split('/')[-1]
            old_filepath = os.path.join(tenant_folder, old_filename)
            if os.path.exists(old_filepath):
                try:
                    os.remove(old_filepath)
                except:
                    pass
        
        # Save file
        with open(filepath, 'wb') as f:
            f.write(file_data)
        
        asset_url = f"/api/tenant/assets/{tenant.id}/{filename}"
        company_info[f"{asset_type}Url"] = asset_url
    
    tenant.company_info = company_info
    db.session.commit()
    
    return success_response(
        data={'url': asset_url, 'type': asset_type, 'storageMode': storage_mode}, 
        status_code=201
    )


@tenant_users_bp.route('/tenant/company/upload/<asset_type>', methods=['DELETE'])
@unified_access(resource='tenant_users', action='delete')
def delete_tenant_asset(ctx, asset_type):
    """
    Delete a company asset (logo, stamp, or signature).
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
    
    if ctx.user and ctx.user.role != 'tenant_admin':
        return error_response('Only Tenant Admin can delete company assets', 403)
    
    if asset_type not in ['logo', 'stamp', 'signature']:
        return error_response('Invalid asset type', 400)
    
    tenant = db.session.get(Tenant, ctx.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
    
    company_info = tenant.company_info or {}
    storage_mode = _get_storage_mode()
    
    if storage_mode == 's3':
        # Delete from S3
        key_field = f"{asset_type}Key"
        old_key = company_info.get(key_field)
        if old_key:
            from services.s3_service import s3_service
            try:
                s3_service.delete_file(old_key)
            except Exception as e:
                logger.warning(f"Failed to delete from S3: {e}")
            
            del company_info[key_field]
    else:
        # Delete from local disk
        url_field = f"{asset_type}Url"
        old_url = company_info.get(url_field)
        if old_url and old_url.startswith('/api/tenant/assets/'):
            upload_folder = _get_local_upload_folder()
            tenant_folder = os.path.join(upload_folder, tenant.id)
            old_filename = old_url.split('/')[-1]
            old_filepath = os.path.join(tenant_folder, old_filename)
            if os.path.exists(old_filepath):
                try:
                    os.remove(old_filepath)
                except:
                    pass
            
            del company_info[url_field]
    
    tenant.company_info = company_info
    db.session.commit()
    
    return success_response(message=f'{asset_type} deleted')


# ============================================================================
# Asset Serving Endpoint (⚠️ DEV ONLY - requires auth in production)
# ============================================================================

@tenant_users_bp.route('/tenant/assets/<tenant_id>/<filename>', methods=['GET'])
@unified_access(resource='tenant_users', action='read')
def serve_tenant_asset(ctx, tenant_id, filename):
    """
    Serve tenant assets with authentication.
    
    In production with S3: This endpoint generates presigned URLs.
    In local dev: Serves files from disk.
    
    Access Control:
    - Super Admin: Can access any tenant's assets
    - Tenant User: Can only access own tenant's assets
    """
    # Tenant scoping check
    if ctx.tenant_id and ctx.tenant_id != tenant_id:
        return error_response('Access denied', 403)
    
    storage_mode = _get_storage_mode()
    
    if storage_mode == 's3':
        # Generate presigned URL for S3 object
        from services.s3_service import s3_service
        object_key = f"tenants/{tenant_id}/assets/{filename}"
        try:
            presigned_url = s3_service.generate_presigned_url(object_key, expiration=300)
            # Redirect to presigned URL
            from flask import redirect
            return redirect(presigned_url)
        except Exception as e:
            return error_response('Asset not found', 404)
    else:
        # Serve from local disk
        from flask import send_from_directory
        upload_folder = _get_local_upload_folder()
        tenant_folder = os.path.join(upload_folder, tenant_id)
        
        if not os.path.exists(os.path.join(tenant_folder, filename)):
            return error_response('Asset not found', 404)
        
        return send_from_directory(tenant_folder, filename)


# ============================================================================
# Asset URL Generation Endpoint (for authenticated access)
# ============================================================================

@tenant_users_bp.route('/tenant/company/assets/<asset_type>/url', methods=['GET'])
@unified_access(resource='tenant_users', action='read')
def get_asset_url(ctx, asset_type):
    """
    Get a temporary URL for accessing an asset.
    Returns presigned URL (S3) or direct URL (local).
    """
    if not ctx.tenant_id:
        return error_response('User does not belong to a tenant', 400)
    
    if asset_type not in ['logo', 'stamp', 'signature']:
        return error_response('Invalid asset type', 400)
    
    tenant = db.session.get(Tenant, ctx.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
    
    company_info = tenant.company_info or {}
    storage_mode = _get_storage_mode()
    
    if storage_mode == 's3':
        key_field = f"{asset_type}Key"
        object_key = company_info.get(key_field)
        if not object_key:
            return error_response('Asset not found', 404)
        
        from services.s3_service import s3_service
        try:
            url = s3_service.generate_presigned_url(object_key, expiration=3600)
            return success_response(data={'url': url, 'expiresIn': 3600})
        except Exception as e:
            return error_response('Failed to generate URL', 500)
    else:
        url_field = f"{asset_type}Url"
        url = company_info.get(url_field)
        if not url:
            return error_response('Asset not found', 404)
        
        return success_response(data={'url': url, 'expiresIn': None})