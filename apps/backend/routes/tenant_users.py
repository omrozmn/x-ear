import os
import uuid as uuid_lib
import base64
from flask import Blueprint, request, jsonify, current_app
from models.base import db
from models.user import User
from models.tenant import Tenant
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.authorization import permission_required
from werkzeug.utils import secure_filename

tenant_users_bp = Blueprint('tenant_users', __name__)

# Allowed image extensions for stamp/signature
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def _get_upload_folder():
    """Get or create the tenant uploads folder."""
    base_dir = current_app.config.get('UPLOAD_FOLDER', os.path.join(current_app.instance_path, 'uploads'))
    tenant_uploads = os.path.join(base_dir, 'tenant_assets')
    os.makedirs(tenant_uploads, exist_ok=True)
    return tenant_uploads

@tenant_users_bp.route('/tenant/users', methods=['GET'])
@jwt_required()
def list_tenant_users():
    """
    List users belonging to the current user's tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Check permission (optional, or assume all tenant users can see their team)
    # if not current_user.has_permission('tenant.users.view'): ...
    
    query = User.query.filter_by(tenant_id=current_user.tenant_id)
    
    # If user is admin (branch admin), filter by assigned branches
    if current_user.role == 'admin':
        # Get IDs of branches assigned to current user
        user_branch_ids = [b.id for b in current_user.branches]
        if user_branch_ids:
            # Filter users that belong to any of the current user's branches
            from models.user import user_branches
            query = query.join(user_branches).filter(user_branches.c.branch_id.in_(user_branch_ids))
        else:
            # If admin has no branches assigned, return only themselves
            return jsonify({'success': True, 'data': [current_user.to_dict()]}), 200

    users = query.all()
    return jsonify({'success': True, 'data': [u.to_dict() for u in users]}), 200

@tenant_users_bp.route('/tenant/users', methods=['POST'])
@jwt_required()
def invite_tenant_user():
    """
    Create a new user for the tenant with username and password.
    Admin creates the user directly with credentials.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Only tenant_admin or admin can create users
    if current_user.role not in ['tenant_admin', 'admin']:
         return jsonify({'success': False, 'error': 'Only admins can create users'}), 403

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')  # Optional
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    role = data.get('role', 'user') # admin, user, doctor, etc.
    branch_ids = data.get('branchIds', [])
    
    # Validate required fields
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400
    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'error': 'Username already exists'}), 409
    
    # Check if email exists (if provided)
    if email and User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already exists'}), 409
        
    # Create user with admin-provided credentials
    new_user = User(
        username=username,
        email=email or f"{username}@{current_user.tenant_id}.local",  # Generate if not provided
        first_name=first_name,
        last_name=last_name,
        tenant_id=current_user.tenant_id,
        role=role
    )
    new_user.set_password(password)
    
    if branch_ids:
        from models.branch import Branch
        branches = Branch.query.filter(Branch.id.in_(branch_ids), Branch.tenant_id == current_user.tenant_id).all()
        new_user.branches = branches

    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'data': new_user.to_dict()}), 201

@tenant_users_bp.route('/tenant/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_tenant_user(user_id):
    """
    Remove a user from the tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    if current_user.role != 'admin':
         return jsonify({'success': False, 'error': 'Only admins can remove users'}), 403
         
    user_to_delete = db.session.get(User, user_id)
    
    if not user_to_delete:
        return jsonify({'success': False, 'error': 'User not found'}), 404
        
    if user_to_delete.tenant_id != current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to your tenant'}), 403
        
    if user_to_delete.id == current_user.id:
        return jsonify({'success': False, 'error': 'Cannot delete yourself'}), 400
        
    db.session.delete(user_to_delete)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User removed'}), 200

@tenant_users_bp.route('/tenant/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_tenant_user(user_id):
    """
    Update a user in the tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Only tenant_admin or admin can update users
    if current_user.role not in ['tenant_admin', 'admin']:
         return jsonify({'success': False, 'error': 'Only admins can update users'}), 403
         
    user_to_update = db.session.get(User, user_id)
    
    if not user_to_update:
        return jsonify({'success': False, 'error': 'User not found'}), 404
        
    if user_to_update.tenant_id != current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to your tenant'}), 403
        
    # Restriction: Admin cannot edit Tenant Admin
    if current_user.role == 'admin' and user_to_update.role == 'tenant_admin':
        return jsonify({'success': False, 'error': 'Admins cannot edit Tenant Admins'}), 403
        
    data = request.get_json()
    
    if 'username' in data:
        # Check uniqueness if changed
        if data['username'] != user_to_update.username:
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'success': False, 'error': 'Username already exists'}), 409
        user_to_update.username = data['username']
        
    if 'email' in data:
        if data['email'] != user_to_update.email:
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'success': False, 'error': 'Email already exists'}), 409
        user_to_update.email = data['email']
        
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
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
        branches = Branch.query.filter(Branch.id.in_(data['branchIds']), Branch.tenant_id == current_user.tenant_id).all()
        user_to_update.branches = branches
        
    db.session.commit()
    
    return jsonify({'success': True, 'data': user_to_update.to_dict()}), 200


# ============================================================================
# Tenant Company Settings Endpoints
# ============================================================================

@tenant_users_bp.route('/tenant/company', methods=['GET'])
@jwt_required()
def get_tenant_company():
    """
    Get the current tenant's company information and settings.
    Returns company_info including logo, stamp, signature URLs.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
    
    tenant = db.session.get(Tenant, current_user.tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
    
    # company_info structure:
    # {
    #   "name": "Firma Adı",
    #   "taxId": "VKN/TCKN",
    #   "taxOffice": "Vergi Dairesi",
    #   "address": "Adres",
    #   "phone": "Telefon",
    #   "email": "Email",
    #   "website": "Website",
    #   "logoUrl": "/api/tenant/assets/logo.png",
    #   "stampUrl": "/api/tenant/assets/stamp.png",
    #   "signatureUrl": "/api/tenant/assets/signature.png",
    #   "bankName": "Banka Adı",
    #   "iban": "IBAN",
    #   "sgkMukellefKodu": "SGK Mükellef Kodu",
    #   "sgkMukellefAdi": "SGK Mükellef Adı"
    # }
    company_info = tenant.company_info or {}
    
    return jsonify({
        'success': True,
        'data': {
            'id': tenant.id,
            'name': tenant.name,
            'companyInfo': company_info,
            'settings': tenant.settings or {}
        }
    }), 200


@tenant_users_bp.route('/tenant/company', methods=['PUT'])
@jwt_required()
def update_tenant_company():
    """
    Update the current tenant's company information.
    Only tenant_admin can update company info.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
    
    # Only tenant_admin can update company settings
    if current_user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only Tenant Admin can update company information'}), 403
    
    tenant = db.session.get(Tenant, current_user.tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Request body is required'}), 400
    
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
    
    return jsonify({
        'success': True,
        'data': {
            'id': tenant.id,
            'name': tenant.name,
            'companyInfo': company_info
        }
    }), 200


@tenant_users_bp.route('/tenant/company/upload/<asset_type>', methods=['POST'])
@jwt_required()
def upload_tenant_asset(asset_type):
    """
    Upload a company asset (logo, stamp, or signature).
    Accepts multipart/form-data with 'file' field or JSON with base64 'data' field.
    
    asset_type: 'logo' | 'stamp' | 'signature'
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
    
    # Only tenant_admin can upload assets
    if current_user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only Tenant Admin can upload company assets'}), 403
    
    if asset_type not in ['logo', 'stamp', 'signature']:
        return jsonify({'success': False, 'error': 'Invalid asset type. Use: logo, stamp, signature'}), 400
    
    tenant = db.session.get(Tenant, current_user.tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
    
    upload_folder = _get_upload_folder()
    tenant_folder = os.path.join(upload_folder, tenant.id)
    os.makedirs(tenant_folder, exist_ok=True)
    
    file_data = None
    file_ext = 'png'
    
    # Check for multipart file upload
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not _allowed_file(file.filename):
            return jsonify({'success': False, 'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'}), 400
        
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        file_data = file.read()
    
    # Check for base64 upload
    elif request.is_json:
        data = request.get_json()
        if 'data' in data:
            try:
                # data can be data:image/png;base64,xxx or just base64 string
                base64_str = data['data']
                if ';base64,' in base64_str:
                    # Extract mime type and data
                    header, base64_str = base64_str.split(';base64,')
                    if 'png' in header:
                        file_ext = 'png'
                    elif 'jpeg' in header or 'jpg' in header:
                        file_ext = 'jpg'
                    elif 'gif' in header:
                        file_ext = 'gif'
                    elif 'webp' in header:
                        file_ext = 'webp'
                
                file_data = base64.b64decode(base64_str)
            except Exception as e:
                return jsonify({'success': False, 'error': f'Invalid base64 data: {str(e)}'}), 400
    
    if not file_data:
        return jsonify({'success': False, 'error': 'No file data provided'}), 400
    
    # Generate unique filename
    filename = f"{asset_type}_{uuid_lib.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(tenant_folder, filename)
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(file_data)
    
    # Update tenant company_info with asset URL
    company_info = tenant.company_info or {}
    asset_url = f"/api/tenant/assets/{tenant.id}/{filename}"
    
    url_key = f"{asset_type}Url"
    
    # Delete old file if exists
    old_url = company_info.get(url_key)
    if old_url:
        old_filename = old_url.split('/')[-1]
        old_filepath = os.path.join(tenant_folder, old_filename)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except:
                pass
    
    company_info[url_key] = asset_url
    tenant.company_info = company_info
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'url': asset_url,
            'type': asset_type
        }
    }), 201


@tenant_users_bp.route('/tenant/company/upload/<asset_type>', methods=['DELETE'])
@jwt_required()
def delete_tenant_asset(asset_type):
    """
    Delete a company asset (logo, stamp, or signature).
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
    
    if current_user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only Tenant Admin can delete company assets'}), 403
    
    if asset_type not in ['logo', 'stamp', 'signature']:
        return jsonify({'success': False, 'error': 'Invalid asset type'}), 400
    
    tenant = db.session.get(Tenant, current_user.tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
    
    company_info = tenant.company_info or {}
    url_key = f"{asset_type}Url"
    
    old_url = company_info.get(url_key)
    if old_url:
        # Delete file from disk
        upload_folder = _get_upload_folder()
        tenant_folder = os.path.join(upload_folder, tenant.id)
        old_filename = old_url.split('/')[-1]
        old_filepath = os.path.join(tenant_folder, old_filename)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except:
                pass
        
        # Remove from company_info
        del company_info[url_key]
        tenant.company_info = company_info
        db.session.commit()
    
    return jsonify({'success': True, 'message': f'{asset_type} deleted'}), 200


@tenant_users_bp.route('/tenant/assets/<tenant_id>/<filename>', methods=['GET'])
def serve_tenant_asset(tenant_id, filename):
    """
    Serve tenant assets (logo, stamp, signature) publicly.
    These are needed for PDF generation and preview.
    """
    from flask import send_from_directory
    
    upload_folder = _get_upload_folder()
    tenant_folder = os.path.join(upload_folder, tenant_id)
    
    if not os.path.exists(os.path.join(tenant_folder, filename)):
        return jsonify({'success': False, 'error': 'Asset not found'}), 404
    
    return send_from_directory(tenant_folder, filename)