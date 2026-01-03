from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, SMSProviderConfig, SMSHeaderRequest, SMSPackage, TenantSMSCredit, TargetAudience, User, Tenant, ActivityLog, Notification
from utils.authorization import admin_required, role_required
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.query_policy import tenant_scoped_query
from datetime import datetime, timezone
import logging
import os
from utils.tenant_security import UnboundSession
from utils.admin_permissions import require_admin_permission, AdminPermissions

logger = logging.getLogger(__name__)

# Upload folder for audience Excel files
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'audiences')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

sms_bp = Blueprint('sms_integration', __name__)

# ============================================================================
# TENANT ROUTES
# ============================================================================

@sms_bp.route('/sms/config', methods=['GET'])
@unified_access(resource='sms', action='read')
def get_sms_config(ctx):
    """Get SMS configuration for tenant."""
    # Use tenant_scoped_query - works for both tenant users and super admin
    config = tenant_scoped_query(ctx, SMSProviderConfig).first()
    
    if not config:
        # For tenant users, create default config
        if ctx.tenant_id:
            config = SMSProviderConfig(tenant_id=ctx.tenant_id)
            db.session.add(config)
            db.session.commit()
        else:
            # Super admin with no tenant - return empty config
            return success_response(data=None)
        
    return success_response(data=config.to_dict())

@sms_bp.route('/sms/config', methods=['PUT'])
@unified_access(resource='sms', action='write')
def update_sms_config(ctx):
    """Update SMS configuration for tenant."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    # Allow super_admin, tenant_admin, or admin role
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        if ctx.user and ctx.user.role not in ['admin', 'tenant_admin']:
            return error_response('Admin access required', code='FORBIDDEN', status_code=403)
        
    data = request.get_json() or {}
    config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
    if not config:
        config = SMSProviderConfig(tenant_id=ctx.tenant_id)
        db.session.add(config)
    
    if 'apiUsername' in data: config.api_username = data['apiUsername']
    if 'apiPassword' in data: config.api_password = data['apiPassword']
    if 'documentsEmail' in data: config.documents_email = data['documentsEmail']
    
    db.session.commit()
    
    return success_response(data=config.to_dict())


@sms_bp.route('/sms/headers', methods=['GET'])
@unified_access(resource='sms', action='read')
def list_sms_headers(ctx):
    """List SMS headers for tenant."""
    # Use tenant_scoped_query - works for both tenant users and super admin
    headers = tenant_scoped_query(ctx, SMSHeaderRequest).order_by(SMSHeaderRequest.created_at.desc()).all()
    return success_response(data=[h.to_dict() for h in headers])

@sms_bp.route('/sms/headers', methods=['POST'])
@unified_access(resource='sms', action='write')
def request_sms_header(ctx):
    """Request a new SMS header for tenant."""
    # Tenant context is required for creating headers
    if not ctx.tenant_id:
        return error_response('Tenant context required for creating SMS headers', code='TENANT_REQUIRED', status_code=400)
    
    # Allow super_admin, tenant_admin, or admin role
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        # Check if user has admin role within tenant
        if ctx.user and ctx.user.role not in ['admin', 'tenant_admin']:
            return error_response('Admin access required', code='FORBIDDEN', status_code=403)
        
    data = request.get_json() or {}
    logger.info(f"SMS Header Request - tenant_id: {ctx.tenant_id}, data: {data}")
    
    # Support both old (headerText/headerType) and new (name) formats
    header_text = data.get('headerText') or data.get('name')
    header_type = data.get('headerType', 'company_title')
    
    if not header_text:
        logger.warning(f"SMS Header Request - Missing header text. Data: {data}")
        return error_response('Header text is required', code='MISSING_FIELDS', status_code=400)
        
    if len(header_text) > 11:
        return error_response('Header text max 11 chars', code='INVALID_LENGTH', status_code=400)
    
    # Check if this is the first header for this tenant
    existing_headers = SMSHeaderRequest.query.filter_by(tenant_id=ctx.tenant_id).count()
    is_first_header = existing_headers == 0
        
    header = SMSHeaderRequest(
        tenant_id=ctx.tenant_id,
        header_text=header_text,
        header_type=header_type,
        documents_json=data.get('documents', []),
        is_default=is_first_header  # First header is automatically default
    )
    
    db.session.add(header)
    db.session.commit()
    
    # Notify admins
    try:
        admins = User.query.filter(User.role.in_(['admin', 'super_admin'])).all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                tenant_id=admin.tenant_id or ctx.tenant_id,
                title="Yeni SMS Başlık Talebi",
                message=f"Yeni SMS başlığı talep edildi: {header_text}",
                notification_type="info",
                is_read=False
            )
            db.session.add(notif)
        db.session.commit()
    except Exception as e:
        logger.warning(f"Failed to create notifications: {e}")
    
    return success_response(data=header.to_dict(), status_code=201)

@sms_bp.route('/sms/headers/<header_id>/set-default', methods=['PUT'])
@unified_access(resource='sms', action='write')
def set_default_header(ctx, header_id):
    """Set a header as the default for the tenant."""
    # Tenant context is required
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    # Allow super_admin, tenant_admin, or admin role
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        if ctx.user and ctx.user.role not in ['admin', 'tenant_admin']:
            return error_response('Admin access required', code='FORBIDDEN', status_code=403)
    
    header = db.session.get(SMSHeaderRequest, header_id)
    if not header or header.tenant_id != ctx.tenant_id:
        return error_response('Header not found', code='NOT_FOUND', status_code=404)
    
    if header.status != 'approved':
        return error_response('Only approved headers can be set as default', code='NOT_APPROVED', status_code=400)
    
    try:
        # Remove default from all other headers for this tenant
        SMSHeaderRequest.query.filter_by(
            tenant_id=ctx.tenant_id
        ).update({'is_default': False})
        
        # Set this header as default
        header.is_default = True
        db.session.commit()
        
        return success_response(data=header.to_dict(), message='Varsayılan başlık olarak ayarlandı')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to set default header: {e}")
        return error_response('Failed to set default header', code='UPDATE_FAILED', status_code=500)

@sms_bp.route('/sms/packages', methods=['GET'])
def list_sms_packages():
    """List available SMS packages (public endpoint)."""
    packages = SMSPackage.query.filter_by(is_active=True).order_by(SMSPackage.price).all()
    return jsonify({'success': True, 'data': [p.to_dict() for p in packages]})

@sms_bp.route('/sms/credit', methods=['GET'])
@unified_access(resource='sms', action='read')
def get_sms_credit(ctx):
    """Get SMS credit balance for tenant."""
    # Use tenant_scoped_query - works for both tenant users and super admin
    credit = tenant_scoped_query(ctx, TenantSMSCredit).first()
    
    if not credit:
        # For tenant users, create default credit
        if ctx.tenant_id:
            credit = TenantSMSCredit(tenant_id=ctx.tenant_id)
            db.session.add(credit)
            db.session.commit()
        else:
            # Super admin with no tenant - return empty credit
            return success_response(data=None)
        
    return success_response(data=credit.to_dict())

from services.s3_service import s3_service

@sms_bp.route('/sms/documents/upload', methods=['POST'])
@unified_access(resource='sms', action='write')
def upload_sms_document(ctx):
    """Upload SMS document to S3."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    # Allow super_admin, tenant_admin, or admin role
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        if ctx.user and ctx.user.role not in ['admin', 'tenant_admin']:
            return error_response('Admin access required', code='FORBIDDEN', status_code=403)
    
    if 'file' not in request.files:
        return error_response('No file provided', code='NO_FILE', status_code=400)
    
    file = request.files['file']
    document_type = request.form.get('documentType')
    
    if not file or file.filename == '':
        return error_response('No file selected', code='NO_FILE', status_code=400)
    
    if not document_type:
        return error_response('Document type required', code='MISSING_TYPE', status_code=400)
    
    try:
        upload_result = s3_service.upload_file(
            file_obj=file,
            folder='sms_documents',
            tenant_id=ctx.tenant_id,
            original_filename=file.filename
        )
        
        config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
        if not config:
            config = SMSProviderConfig(tenant_id=ctx.tenant_id)
            db.session.add(config)
        
        docs = config.documents_json or []
        docs = [d for d in docs if d.get('type') != document_type]
        docs.append({
            'type': document_type,
            's3_key': upload_result['key'],
            'filename': upload_result['filename'],
            'size': upload_result['size'],
            'uploadedAt': datetime.now(timezone.utc).isoformat()
        })
        
        config.documents_json = docs
        db.session.commit()
        
        return success_response(data={
            'type': document_type,
            'filename': upload_result['filename'],
            'size': upload_result['size']
        })
        
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        return error_response(str(e), code='UPLOAD_FAILED', status_code=500)

@sms_bp.route('/sms/documents/<document_type>/download', methods=['GET'])
@unified_access(resource='sms', action='read')
def download_sms_document(ctx, document_type):
    """Generate presigned URL for document download."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
    if not config:
        return error_response('No configuration found', code='NOT_FOUND', status_code=404)
    
    docs = config.documents_json or []
    doc = next((d for d in docs if d.get('type') == document_type), None)
    
    if not doc:
        return error_response('Document not found', code='NOT_FOUND', status_code=404)
    
    try:
        presigned_url = s3_service.generate_presigned_url(doc['s3_key'], expiration=3600)
        return success_response(data={'url': presigned_url})
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        return error_response(str(e), code='URL_FAILED', status_code=500)

@sms_bp.route('/sms/documents/<document_type>', methods=['DELETE'])
@unified_access(resource='sms', action='write')
def delete_sms_document(ctx, document_type):
    """Delete an uploaded document."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    # Allow super_admin, tenant_admin, or admin role
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        if ctx.user and ctx.user.role not in ['admin', 'tenant_admin']:
            return error_response('Admin access required', code='FORBIDDEN', status_code=403)
    
    config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
    if not config:
        return error_response('No configuration found', code='NOT_FOUND', status_code=404)
    
    docs = config.documents_json or []
    doc = next((d for d in docs if d.get('type') == document_type), None)
    
    if not doc:
        return error_response('Document not found', code='NOT_FOUND', status_code=404)
    
    try:
        s3_service.delete_file(doc['s3_key'])
        docs = [d for d in docs if d.get('type') != document_type]
        config.documents_json = docs
        db.session.commit()
        
        return success_response(message='Document deleted')
    except Exception as e:
        logger.error(f"Document deletion failed: {e}")
        return error_response(str(e), code='DELETE_FAILED', status_code=500)


@sms_bp.route('/sms/audiences', methods=['GET'])
@unified_access(resource='sms', action='read')
def list_target_audiences(ctx):
    """List target audiences for tenant."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
        
    audiences = TargetAudience.query.filter_by(tenant_id=ctx.tenant_id).order_by(TargetAudience.created_at.desc()).all()
    return success_response(data=[a.to_dict() for a in audiences])

@sms_bp.route('/sms/audiences', methods=['POST'])
@unified_access(resource='sms', action='write')
def create_target_audience(ctx):
    """Create a new target audience."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
        
    data = request.get_json() or {}
    required = ['name', 'sourceType']
    if not all(k in data for k in required):
        return error_response('Missing required fields', code='MISSING_FIELDS', status_code=400)
        
    audience = TargetAudience(
        tenant_id=ctx.tenant_id,
        name=data['name'],
        source_type=data['sourceType'],
        file_path=data.get('filePath'),
        total_records=data.get('totalRecords', 0),
        filter_criteria_json=data.get('filterCriteria', {})
    )
    
    db.session.add(audience)
    db.session.commit()
    
    return success_response(data=audience.to_dict(), status_code=201)

@sms_bp.route('/sms/audiences/upload', methods=['POST'])
@unified_access(resource='sms', action='write')
def upload_audience_excel(ctx):
    """Upload Excel file for audience."""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
        
    if 'file' not in request.files:
        return error_response('No file part', code='NO_FILE', status_code=400)
        
    file = request.files['file']
    if file.filename == '':
        return error_response('No selected file', code='NO_FILE', status_code=400)
        
    if not file.filename.endswith(('.xlsx', '.xls')):
        return error_response('Invalid file type. Only Excel files allowed.', code='INVALID_TYPE', status_code=400)

    try:
        import pandas as pd
        
        filename = secure_filename(f"aud_{ctx.tenant_id}_{int(datetime.now().timestamp())}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        df = pd.read_excel(filepath)
        df.columns = [c.strip().lower() for c in df.columns]
        
        required_cols = ['telefon']
        if not any(col in df.columns for col in required_cols):
            phone_col = next((c for c in df.columns if 'tel' in c or 'gsm' in c or 'mobile' in c), None)
            if not phone_col:
                os.remove(filepath)
                return error_response('Excel dosyasında "Telefon" sütunu bulunamadı.', code='INVALID_FORMAT', status_code=400)
            df.rename(columns={phone_col: 'telefon'}, inplace=True)

        total_records = df['telefon'].notna().sum()
        
        if total_records == 0:
            os.remove(filepath)
            return error_response('Dosyada geçerli telefon numarası bulunamadı.', code='NO_RECORDS', status_code=400)

        audience = TargetAudience(
            tenant_id=ctx.tenant_id,
            name=f"Excel Yükleme - {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            source_type='excel',
            file_path=filename,
            total_records=int(total_records)
        )
        
        db.session.add(audience)
        db.session.commit()
        
        return success_response(data=audience.to_dict(), status_code=201)
        
    except Exception as e:
        return error_response(str(e), code='UPLOAD_FAILED', status_code=500)

# ============================================================================
# ADMIN ROUTES
# ============================================================================

@sms_bp.route('/admin/sms/packages', methods=['GET'])
@unified_access(resource='admin.sms', action='read')
def admin_list_packages(ctx):
    """List all SMS packages (admin)."""
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    query = SMSPackage.query.order_by(SMSPackage.created_at.desc())
    total = query.count()
    packages = query.offset(offset).limit(limit).all()
    
    return success_response(
        data=[p.to_dict() for p in packages],
        meta={
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': (total + limit - 1) // limit
        }
    )

@sms_bp.route('/admin/sms/packages', methods=['POST'])
@unified_access(resource='admin.sms', action='write')
def admin_create_package(ctx):
    """Create a new SMS package (admin)."""
    data = request.get_json() or {}
    required = ['name', 'smsCount', 'price']
    if not all(k in data for k in required):
        return error_response('Missing required fields', code='MISSING_FIELDS', status_code=400)
        
    pkg = SMSPackage(
        name=data['name'],
        description=data.get('description'),
        sms_count=data['smsCount'],
        price=data['price'],
        currency=data.get('currency', 'TRY'),
        is_active=data.get('isActive', True)
    )
    db.session.add(pkg)
    db.session.commit()
    return success_response(data=pkg.to_dict(), status_code=201)

@sms_bp.route('/admin/sms/packages/<pkg_id>', methods=['PUT'])
@unified_access(resource='admin.sms', action='write')
def admin_update_package(ctx, pkg_id):
    """Update an SMS package (admin)."""
    pkg = db.session.get(SMSPackage, pkg_id)
    if not pkg:
        return error_response('Not found', code='NOT_FOUND', status_code=404)
        
    data = request.get_json() or {}
    if 'name' in data: pkg.name = data['name']
    if 'description' in data: pkg.description = data['description']
    if 'smsCount' in data: pkg.sms_count = data['smsCount']
    if 'price' in data: pkg.price = data['price']
    if 'isActive' in data: pkg.is_active = data['isActive']
    
    db.session.commit()
    return success_response(data=pkg.to_dict())

@sms_bp.route('/admin/sms/headers', methods=['GET'])
@unified_access(resource='admin.sms', action='read')
def admin_list_headers(ctx):
    """List all SMS header requests (admin)."""
    status = request.args.get('status')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    query = SMSHeaderRequest.query
    if status:
        query = query.filter_by(status=status)

    total = query.count()
    headers = query.order_by(SMSHeaderRequest.created_at.desc()).offset(offset).limit(limit).all()
    
    results = []
    for h in headers:
        d = h.to_dict()
        tenant = db.session.get(Tenant, h.tenant_id)
        if tenant:
            d['tenantName'] = tenant.name
        results.append(d)
        
    return success_response(
        data=results,
        meta={
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': (total + limit - 1) // limit
        }
    )

@sms_bp.route('/admin/sms/headers/<header_id>/status', methods=['PUT'])
@unified_access(resource='admin.sms', action='write')
def admin_update_header_status(ctx, header_id):
    """Update SMS header request status (admin)."""
    header = db.session.get(SMSHeaderRequest, header_id)
    if not header:
        return error_response('Not found', code='NOT_FOUND', status_code=404)
        
    data = request.get_json() or {}
    status = data.get('status')
    if status not in ['pending', 'approved', 'rejected']:
        return error_response('Invalid status', code='INVALID_STATUS', status_code=400)
        
    header.status = status
    if status == 'rejected':
        header.rejection_reason = data.get('rejectionReason')
        
    db.session.commit()
    
    return success_response(data=header.to_dict())
