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
        
        # Create Activity Log for upload attempt
        try:
            from models.user import ActivityLog
            from models.base import db
            activity_log = ActivityLog(
                user_id=current_user_id,
                action='file_upload_init',
                entity_type='file',
                entity_id=filename, # We don't have ID yet, use filename
                details=f"File upload initiated: {filename} to {folder}",
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', '')
            )
            db.session.add(activity_log)
            db.session.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log for file upload: {log_error}")
        
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

@upload_bp.route('/files', methods=['DELETE'])
@jwt_required()
def delete_file():
    """
    Delete a file
    
    Query Params:
        key (str): S3 key of the file to delete
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        key = request.args.get('key')
        if not key:
            return jsonify({'error': 'Key is required'}), 400
            
        # Get tenant ID
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            if current_user and hasattr(current_user, 'tenant_id'):
                tenant_id = current_user.tenant_id
            if not tenant_id:
                tenant_id = 'admin' if current_user and current_user.role == 'admin' else 'public'
        
        # Security check: Ensure the key belongs to the tenant
        # Key format: folder/tenant_id/...
        # We should verify that the key contains the tenant_id segment
        if str(tenant_id) not in key and getattr(current_user, 'role', '') != 'super_admin':
             return jsonify({'error': 'Unauthorized to delete this file'}), 403

        success = s3_service.delete_file(key)
        
        if success:
            # Create Activity Log
            try:
                from models.user import ActivityLog
                from models.base import db
                activity_log = ActivityLog(
                    user_id=current_user_id,
                    action='file_delete',
                    entity_type='file',
                    entity_id=key,
                    details=f"File deleted: {key}",
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent', '')
                )
                db.session.add(activity_log)
                db.session.commit()
            except Exception as log_error:
                logger.error(f"Failed to create activity log for file deletion: {log_error}")
            
            return jsonify({'success': True, 'message': 'File deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete file'}), 500
            
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return jsonify({'error': str(e)}), 500
