from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.s3_service import s3_service
from utils.tenant_security import get_current_tenant_id
from models.user import User
import logging

logger = logging.getLogger(__name__)

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/presigned', methods=['POST'])
@jwt_required()
def get_presigned_upload_url():
    """
    Get a presigned URL for direct S3 upload
    
    Request Body:
        filename (str): Original filename
        folder (str): Target folder (e.g., 'sms_documents', 'invoices')
        content_type (str): File content type (optional)
        
    Returns:
        JSON: {
            'url': str,
            'fields': dict,
            'key': str
        }
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        filename = data.get('filename')
        folder = data.get('folder', 'uploads')
        content_type = data.get('content_type')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        # Get tenant ID from current user
        # Note: get_current_tenant_id might rely on g.tenant_id set by middleware
        # or we can extract it from current_user if available
        tenant_id = get_current_tenant_id()
        
        if not tenant_id:
            # Fallback logic if tenant_id is not set in g
            if current_user and hasattr(current_user, 'tenant_id'):
                tenant_id = current_user.tenant_id
                
            if not tenant_id:
                tenant_id = 'admin' if current_user and current_user.role == 'admin' else 'public'
            
        # Generate presigned URL
        presigned_data = s3_service.generate_presigned_upload_url(
            folder=folder,
            tenant_id=str(tenant_id),
            filename=filename,
            content_type=content_type
        )
        
        return jsonify({
            'success': True,
            'data': presigned_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/files', methods=['GET'])
@jwt_required()
def list_files():
    """
    List files in a folder
    
    Query Params:
        folder (str): Folder name (default: 'uploads')
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        folder = request.args.get('folder', 'uploads')
        
        # Get tenant ID
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            if current_user and hasattr(current_user, 'tenant_id'):
                tenant_id = current_user.tenant_id
                
            if not tenant_id:
                tenant_id = 'admin' if current_user and current_user.role == 'admin' else 'public'
                
        files = s3_service.list_files(folder, str(tenant_id))
        
        return jsonify({
            'success': True,
            'data': {
                'files': files
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        return jsonify({'error': str(e)}), 500
