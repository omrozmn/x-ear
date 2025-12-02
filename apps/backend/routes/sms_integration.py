from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, SMSProviderConfig, SMSHeaderRequest, SMSPackage, TenantSMSCredit, TargetAudience, User, Tenant, ActivityLog, Notification
from utils.authorization import admin_required, role_required
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)

# Upload folder for audience Excel files
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'audiences')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

sms_bp = Blueprint('sms_integration', __name__)

# ============================================================================
# TENANT ROUTES
# ============================================================================

@sms_bp.route('/sms/config', methods=['GET'])
@jwt_required()
def get_sms_config():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
    if not config:
        # Create default empty config
        config = SMSProviderConfig(tenant_id=user.tenant_id)
        db.session.add(config)
        db.session.commit()
        
    return jsonify({'success': True, 'data': config.to_dict()})

@sms_bp.route('/sms/config', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'tenant_admin'])
def update_sms_config():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    data = request.get_json() or {}
    config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
    if not config:
        config = SMSProviderConfig(tenant_id=user.tenant_id)
        db.session.add(config)
    
    if 'apiUsername' in data: config.api_username = data['apiUsername']
    if 'apiPassword' in data: config.api_password = data['apiPassword']
    if 'documentsEmail' in data: config.documents_email = data['documentsEmail']
    
    db.session.commit()
    
    # TODO: Add proper activity logging when ActivityLog.log is implemented
    # ActivityLog.log(user.tenant_id, user_id, 'update_sms_config', 'Updated SMS configuration')
    
    return jsonify({'success': True, 'data': config.to_dict()})


@sms_bp.route('/sms/headers', methods=['GET'])
@jwt_required()
def list_sms_headers():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    headers = SMSHeaderRequest.query.filter_by(tenant_id=user.tenant_id).order_by(SMSHeaderRequest.created_at.desc()).all()
    return jsonify({'success': True, 'data': [h.to_dict() for h in headers]})

@sms_bp.route('/sms/headers', methods=['POST'])
@jwt_required()
@role_required(['admin', 'tenant_admin'])
def request_sms_header():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    data = request.get_json() or {}
    required = ['headerText', 'headerType']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
    if len(data['headerText']) > 11:
        return jsonify({'success': False, 'error': 'Header text max 11 chars'}), 400
        
    header = SMSHeaderRequest(
        tenant_id=user.tenant_id,
        header_text=data['headerText'],
        header_type=data['headerType'],
        documents_json=data.get('documents', [])
    )
    
    db.session.add(header)
    db.session.commit()
    
    # TODO: Add proper activity logging when ActivityLog.log is implemented
    # ActivityLog.log(user.tenant_id, user_id, 'request_sms_header', f"Requested SMS header: {data['headerText']}")
    
    # Notify admins
    try:
        admins = User.query.filter(User.role.in_(['admin', 'super_admin'])).all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                tenant_id=admin.tenant_id or user.tenant_id, # Fallback to requester's tenant if admin has no tenant
                title="Yeni SMS Başlık Talebi",
                message=f"{user.username} (Tenant: {user.tenant_id}) yeni bir SMS başlığı talep etti: {data['headerText']}",
                notification_type="info",
                is_read=False
            )
            db.session.add(notif)
        db.session.commit()
    except Exception as e:
        print(f"Failed to create notifications: {e}")
    
    return jsonify({'success': True, 'data': header.to_dict()}), 201

@sms_bp.route('/sms/packages', methods=['GET'])
def list_sms_packages():
    # Public endpoint or authenticated? Let's make it public or at least accessible to all logged in
    packages = SMSPackage.query.filter_by(is_active=True).order_by(SMSPackage.price).all()
    return jsonify({'success': True, 'data': [p.to_dict() for p in packages]})

@sms_bp.route('/sms/credit', methods=['GET'])
@jwt_required()
def get_sms_credit():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    credit = TenantSMSCredit.query.filter_by(tenant_id=user.tenant_id).first()
    if not credit:
        credit = TenantSMSCredit(tenant_id=user.tenant_id)
        db.session.add(credit)
        db.session.commit()
        
    return jsonify({'success': True, 'data': credit.to_dict()})

from services.s3_service import s3_service

@sms_bp.route('/sms/documents/upload', methods=['POST'])
@jwt_required()
@role_required(['admin', 'tenant_admin'])
def upload_sms_document():
    """Upload SMS document to S3"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    document_type = request.form.get('documentType')  # contract, id_card, residence, etc.
    
    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not document_type:
        return jsonify({'success': False, 'error': 'Document type required'}), 400
    
    try:
        # Upload to S3
        upload_result = s3_service.upload_file(
            file_obj=file,
            folder='sms_documents',
            tenant_id=user.tenant_id,
            original_filename=file.filename
        )
        
        # Get or create config
        config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
        if not config:
            config = SMSProviderConfig(tenant_id=user.tenant_id)
            db.session.add(config)
        
        # Add document metadata
        docs = config.documents_json or []
        
        # Remove existing document of same type (replace)
        docs = [d for d in docs if d.get('type') != document_type]
        
        # Add new document
        docs.append({
            'type': document_type,
            's3_key': upload_result['key'],
            'filename': upload_result['filename'],
            'size': upload_result['size'],
            'uploadedAt': datetime.now(timezone.utc).isoformat()
        })
        
        config.documents_json = docs
        db.session.commit()
        
        # TODO: Add proper activity logging when ActivityLog.log is implemented
        # ActivityLog.log(user.tenant_id, user_id, 'sms_document_upload', f'Uploaded {document_type} document')
        
        return jsonify({
            'success': True,
            'data': {
                'type': document_type,
                'filename': upload_result['filename'],
                'size': upload_result['size']
            }
        })
        
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@sms_bp.route('/sms/documents/<document_type>/download', methods=['GET'])
@jwt_required()
def download_sms_document(document_type):
    """Generate presigned URL for document download"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
    
    config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
    if not config:
        return jsonify({'success': False, 'error': 'No configuration found'}), 404
    
    docs = config.documents_json or []
    doc = next((d for d in docs if d.get('type') == document_type), None)
    
    if not doc:
        return jsonify({'success': False, 'error': 'Document not found'}), 404
    
    try:
        # Generate presigned URL (1 hour expiry)
        presigned_url = s3_service.generate_presigned_url(doc['s3_key'], expiration=3600)
        return jsonify({'success': True, 'url': presigned_url})
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@sms_bp.route('/sms/documents/<document_type>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'tenant_admin'])
def delete_sms_document(document_type):
    """Delete an uploaded document"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
    
    config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
    if not config:
        return jsonify({'success': False, 'error': 'No configuration found'}), 404
    
    docs = config.documents_json or []
    doc = next((d for d in docs if d.get('type') == document_type), None)
    
    if not doc:
        return jsonify({'success': False, 'error': 'Document not found'}), 404
    
    try:
        # Delete from S3
        s3_service.delete_file(doc['s3_key'])
        
        # Remove from config
        docs = [d for d in docs if d.get('type') != document_type]
        config.documents_json = docs
        db.session.commit()
        
        # TODO: Add proper activity logging when ActivityLog.log is implemented
        # ActivityLog.log(user.tenant_id, user_id, 'sms_document_delete', f'Deleted {document_type} document')
        
        return jsonify({'success': True, 'message': 'Document deleted'})
    except Exception as e:
        logger.error(f"Document deletion failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@sms_bp.route('/sms/audiences', methods=['GET'])
@jwt_required()
def list_target_audiences():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    audiences = TargetAudience.query.filter_by(tenant_id=user.tenant_id).order_by(TargetAudience.created_at.desc()).all()
    return jsonify({'success': True, 'data': [a.to_dict() for a in audiences]})

@sms_bp.route('/sms/audiences', methods=['POST'])
@jwt_required()
def create_target_audience():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    data = request.get_json() or {}
    required = ['name', 'sourceType']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
    audience = TargetAudience(
        tenant_id=user.tenant_id,
        name=data['name'],
        source_type=data['sourceType'],
        file_path=data.get('filePath'),
        total_records=data.get('totalRecords', 0),
        filter_criteria_json=data.get('filterCriteria', {})
    )
    
    db.session.add(audience)
    db.session.commit()
    
    return jsonify({'success': True, 'data': audience.to_dict()}), 201

@sms_bp.route('/sms/audiences/upload', methods=['POST'])
@jwt_required()
def upload_audience_excel():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'success': False, 'error': 'Invalid file type. Only Excel files allowed.'}), 400

    try:
        import pandas as pd
        import os
        
        filename = secure_filename(f"aud_{user.tenant_id}_{int(datetime.now().timestamp())}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Parse Excel
        df = pd.read_excel(filepath)
        
        # Normalize columns
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Check required columns (flexible matching)
        required_cols = ['telefon']
        if not any(col in df.columns for col in required_cols):
             # Try to find a column that looks like phone
             phone_col = next((c for c in df.columns if 'tel' in c or 'gsm' in c or 'mobile' in c), None)
             if not phone_col:
                 os.remove(filepath)
                 return jsonify({'success': False, 'error': 'Excel dosyasında "Telefon" sütunu bulunamadı.'}), 400
             # Rename to standard
             df.rename(columns={phone_col: 'telefon'}, inplace=True)

        # Count valid records (non-empty phone)
        total_records = df['telefon'].notna().sum()
        
        if total_records == 0:
            os.remove(filepath)
            return jsonify({'success': False, 'error': 'Dosyada geçerli telefon numarası bulunamadı.'}), 400

        # Create Audience
        audience = TargetAudience(
            tenant_id=user.tenant_id,
            name=f"Excel Yükleme - {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            source_type='excel',
            file_path=filename,
            total_records=int(total_records)
        )
        
        db.session.add(audience)
        db.session.commit()
        
        return jsonify({'success': True, 'data': audience.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# ADMIN ROUTES
# ============================================================================

@sms_bp.route('/admin/sms/packages', methods=['GET'])
@admin_required
def admin_list_packages():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    query = SMSPackage.query.order_by(SMSPackage.created_at.desc())
    total = query.count()
    packages = query.offset(offset).limit(limit).all()
    
    return jsonify({
        'success': True, 
        'data': [p.to_dict() for p in packages],
        'pagination': {
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': (total + limit - 1) // limit
        }
    })

@sms_bp.route('/admin/sms/packages', methods=['POST'])
@admin_required
def admin_create_package():
    data = request.get_json() or {}
    required = ['name', 'smsCount', 'price']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
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
    return jsonify({'success': True, 'data': pkg.to_dict()}), 201

@sms_bp.route('/admin/sms/packages/<pkg_id>', methods=['PUT'])
@admin_required
def admin_update_package(pkg_id):
    pkg = db.session.get(SMSPackage, pkg_id)
    if not pkg:
        return jsonify({'success': False, 'error': 'Not found'}), 404
        
    data = request.get_json() or {}
    if 'name' in data: pkg.name = data['name']
    if 'description' in data: pkg.description = data['description']
    if 'smsCount' in data: pkg.sms_count = data['smsCount']
    if 'price' in data: pkg.price = data['price']
    if 'isActive' in data: pkg.is_active = data['isActive']
    
    db.session.commit()
    return jsonify({'success': True, 'data': pkg.to_dict()})

@sms_bp.route('/admin/sms/headers', methods=['GET'])
@admin_required
def admin_list_headers():
    # List all pending headers or all headers
    status = request.args.get('status')
    query = SMSHeaderRequest.query
    if status:
        query = query.filter_by(status=status)
    
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    total = query.count()
    headers = query.order_by(SMSHeaderRequest.created_at.desc()).offset(offset).limit(limit).all()
    
    # We might want to include tenant info here
    results = []
    for h in headers:
        d = h.to_dict()
        tenant = db.session.get(Tenant, h.tenant_id)
        if tenant:
            d['tenantName'] = tenant.name
        results.append(d)
        
    return jsonify({
        'success': True, 
        'data': results,
        'pagination': {
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': (total + limit - 1) // limit
        }
    })

@sms_bp.route('/admin/sms/headers/<header_id>/status', methods=['PUT'])
@admin_required
def admin_update_header_status(header_id):
    header = db.session.get(SMSHeaderRequest, header_id)
    if not header:
        return jsonify({'success': False, 'error': 'Not found'}), 404
        
    data = request.get_json() or {}
    status = data.get('status')
    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'success': False, 'error': 'Invalid status'}), 400
        
    header.status = status
    if status == 'rejected':
        header.rejection_reason = data.get('rejectionReason')
        
    db.session.commit()
    
    # Notify tenant (TODO: Implement notification system)
    
    return jsonify({'success': True, 'data': header.to_dict()})
