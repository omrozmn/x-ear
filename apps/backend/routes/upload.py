"""
Upload API

Handles file uploads via S3 presigned URLs.
Supports unified access pattern for Super Admin and Tenant users.
"""
from flask import Blueprint, request
from services.s3_service import s3_service
from models.user import ActivityLog
from models.base import db
from utils.decorators import unified_access
from utils.response import success_response, error_response
import logging

logger = logging.getLogger(__name__)

upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/presigned', methods=['POST'])
@unified_access(resource='upload', action='write')
def get_presigned_upload_url(ctx):
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
        data = request.get_json()
        if not data:
            return error_response('No data provided', 400)
            
        filename = data.get('filename')
        folder = data.get('folder', 'uploads')
        content_type = data.get('content_type')
        
        if not filename:
            return error_response('Filename is required', 400)
        
        # Determine tenant_id for file path
        if ctx.tenant_id:
            tenant_id = ctx.tenant_id
        elif ctx.is_admin:
            tenant_id = 'admin'
        else:
            tenant_id = 'public'
            
        # Generate presigned URL
        presigned_data = s3_service.generate_presigned_upload_url(
            folder=folder,
            tenant_id=str(tenant_id),
            filename=filename,
            content_type=content_type
        )
        
        # Create Activity Log for upload attempt
        try:
            user_id = ctx.user.id if ctx.user else (ctx.admin.id if ctx.admin else 'system')
            activity_log = ActivityLog(
                user_id=user_id,
                action='file_upload_init',
                entity_type='file',
                entity_id=filename,
                details=f"File upload initiated: {filename} to {folder}",
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', ''),
                tenant_id=ctx.tenant_id
            )
            db.session.add(activity_log)
            db.session.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log for file upload: {log_error}")
        
        return success_response(data=presigned_data)
        
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return error_response(str(e), 500)


@upload_bp.route('/files', methods=['GET'])
@unified_access(resource='upload', action='read')
def list_files(ctx):
    """
    List files in a folder
    
    Query Params:
        folder (str): Folder name (default: 'uploads')
    """
    try:
        folder = request.args.get('folder', 'uploads')
        
        # Determine tenant_id for file listing
        if ctx.tenant_id:
            tenant_id = ctx.tenant_id
        elif ctx.is_admin:
            # Super Admin can list from a specific tenant if provided
            tenant_id = request.args.get('tenant_id', 'admin')
        else:
            tenant_id = 'public'
                
        files = s3_service.list_files(folder, str(tenant_id))
        
        return success_response(data={'files': files})
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        return error_response(str(e), 500)


@upload_bp.route('/files', methods=['DELETE'])
@unified_access(resource='upload', action='delete')
def delete_file(ctx):
    """
    Delete a file
    
    Query Params:
        key (str): S3 key of the file to delete
    """
    try:
        key = request.args.get('key')
        if not key:
            return error_response('Key is required', 400)
        
        # Determine tenant_id for security check
        if ctx.tenant_id:
            tenant_id = ctx.tenant_id
        elif ctx.is_admin:
            tenant_id = None  # Super Admin can delete any file
        else:
            tenant_id = 'public'
        
        # Security check: Ensure the key belongs to the tenant
        # Super Admin (tenant_id=None) can delete any file
        if tenant_id and str(tenant_id) not in key:
            return error_response('Unauthorized to delete this file', 403)

        success = s3_service.delete_file(key)
        
        if success:
            # Create Activity Log
            try:
                user_id = ctx.user.id if ctx.user else (ctx.admin.id if ctx.admin else 'system')
                activity_log = ActivityLog(
                    user_id=user_id,
                    action='file_delete',
                    entity_type='file',
                    entity_id=key,
                    details=f"File deleted: {key}",
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent', ''),
                    tenant_id=ctx.tenant_id
                )
                db.session.add(activity_log)
                db.session.commit()
            except Exception as log_error:
                logger.error(f"Failed to create activity log for file deletion: {log_error}")
            
            return success_response(message='File deleted successfully')
        else:
            return error_response('Failed to delete file', 500)
            
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return error_response(str(e), 500)
