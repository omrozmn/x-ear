"""
S3 Storage Service for File Uploads
Handles document uploads to AWS S3 with proper organization and security
"""
import os
import boto3
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        self._s3_client = None
        self._mock_mode = not self.bucket_name or os.getenv('S3_MOCK', '0') == '1'
        
        if self._mock_mode:
            logger.warning("S3Service running in mock mode - no actual S3 operations will be performed")
    
    @property
    def s3_client(self):
        if self._s3_client is None and not self._mock_mode:
            self._s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'eu-central-1')
            )
        return self._s3_client
    
    def upload_file(self, file_obj, folder: str, tenant_id: str, original_filename: str = None) -> dict:
        """
        Upload a file to S3
        
        Args:
            file_obj: File object to upload
            folder: Folder path (e.g., 'sms_documents', 'patient_docs')
            tenant_id: Tenant ID for organization
            original_filename: Original filename (optional)
        
        Returns:
            dict: {
                'url': str,  # S3 URL
                'key': str,  # S3 key
                'filename': str,  # Secure filename
                'size': int  # File size in bytes
            }
        """
        try:
            # Generate secure filename
            if original_filename:
                filename = secure_filename(original_filename)
            else:
                filename = f"{uuid.uuid4().hex}"
            
            # Create S3 key with organization
            timestamp = datetime.utcnow().strftime('%Y/%m/%d')
            s3_key = f"{folder}/{tenant_id}/{timestamp}/{uuid.uuid4().hex}_{filename}"
            
            # Get file size
            file_obj.seek(0, 2)  # Seek to end
            file_size = file_obj.tell()
            file_obj.seek(0)  # Reset to beginning
            
            # Mock mode - return simulated response
            if self._mock_mode:
                logger.info(f"[MOCK] File would be uploaded: {s3_key}")
                return {
                    'url': f"https://mock-bucket.s3.mock-region.amazonaws.com/{s3_key}",
                    'key': s3_key,
                    'filename': filename,
                    'size': file_size
                }
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': self._get_content_type(filename),
                    'ServerSideEncryption': 'AES256',
                    'Metadata': {
                        'tenant_id': tenant_id,
                        'original_filename': filename,
                        'upload_date': datetime.utcnow().isoformat()
                    }
                }
            )
            
            # Generate S3 URL
            url = f"https://{self.bucket_name}.s3.{os.getenv('AWS_REGION', 'eu-central-1')}.amazonaws.com/{s3_key}"
            
            logger.info(f"File uploaded successfully: {s3_key}")
            
            return {
                'url': url,
                'key': s3_key,
                'filename': filename,
                'size': file_size
            }
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for temporary access to a private file (Download/View)
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds (default 1 hour)
        
        Returns:
            str: Presigned URL
        """
        # Mock mode - return a placeholder URL
        if self._mock_mode:
            logger.info(f"[MOCK] Would generate presigned URL for: {s3_key}")
            return f"https://mock-bucket.s3.mock-region.amazonaws.com/{s3_key}?mock=true"
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise Exception(f"Failed to generate download URL: {str(e)}")

    def generate_presigned_upload_url(self, folder: str, tenant_id: str, filename: str, content_type: str = None, expiration: int = 3600) -> dict:
        """
        Generate a presigned URL for uploading a file directly to S3
        
        Args:
            folder: Folder path
            tenant_id: Tenant ID
            filename: Original filename
            content_type: File content type
            expiration: URL expiration in seconds
            
        Returns:
            dict: {
                'url': str,
                'fields': dict,
                'key': str
            }
        """
        # Secure filename and generate key
        safe_filename = secure_filename(filename)
        timestamp = datetime.utcnow().strftime('%Y/%m/%d')
        s3_key = f"{folder}/{tenant_id}/{timestamp}/{uuid.uuid4().hex}_{safe_filename}"
        
        if not content_type:
            content_type = self._get_content_type(safe_filename)
            
        # Mock mode
        if self._mock_mode:
            logger.info(f"[MOCK] Would generate presigned upload URL for: {s3_key}")
            return {
                'url': "https://mock-bucket.s3.mock-region.amazonaws.com",
                'fields': {
                    'key': s3_key,
                    'AWSAccessKeyId': 'mock-key',
                    'policy': 'mock-policy',
                    'signature': 'mock-signature'
                },
                'key': s3_key
            }
            
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={
                    'Content-Type': content_type,
                    'x-amz-meta-tenant-id': tenant_id,
                    'x-amz-meta-original-filename': safe_filename
                },
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 0, 10485760], # Max 10MB
                    {'x-amz-meta-tenant-id': tenant_id},
                    {'x-amz-meta-original-filename': safe_filename}
                ],
                ExpiresIn=expiration
            )
            
            return {
                'url': response['url'],
                'fields': response['fields'],
                'key': s3_key
            }
        except ClientError as e:
            logger.error(f"Failed to generate presigned upload URL: {e}")
            raise Exception(f"Failed to generate upload URL: {str(e)}")
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3
        
        Args:
            s3_key: S3 object key
        
        Returns:
            bool: True if successful
        """
        # Mock mode - just log
        if self._mock_mode:
            logger.info(f"[MOCK] Would delete file: {s3_key}")
            return True
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"File deleted successfully: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete failed: {e}")
            return False
    
    def list_files(self, folder: str, tenant_id: str) -> list:
        """
        List files in a folder for a tenant
        
        Args:
            folder: Folder path (prefix)
            tenant_id: Tenant ID
            
        Returns:
            list: List of file objects
        """
        prefix = f"{folder}/{tenant_id}/"
        
        # Mock mode
        if self._mock_mode:
            logger.info(f"[MOCK] Would list files in: {prefix}")
            return [
                {
                    'key': f"{prefix}2023/01/01/test1.pdf",
                    'filename': 'test1.pdf',
                    'size': 1024,
                    'last_modified': datetime.utcnow().isoformat(),
                    'url': f"https://mock-bucket.s3.mock-region.amazonaws.com/{prefix}2023/01/01/test1.pdf"
                },
                {
                    'key': f"{prefix}2023/01/02/image.png",
                    'filename': 'image.png',
                    'size': 2048,
                    'last_modified': datetime.utcnow().isoformat(),
                    'url': f"https://mock-bucket.s3.mock-region.amazonaws.com/{prefix}2023/01/02/image.png"
                }
            ]
            
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Extract filename from key if stored in metadata, otherwise parse key
                    # For now, just parsing key: folder/tenant/date/uuid_filename
                    key = obj['Key']
                    parts = key.split('_', 1)
                    filename = parts[1] if len(parts) > 1 else os.path.basename(key)
                    
                    files.append({
                        'key': key,
                        'filename': filename,
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'url': self.generate_presigned_url(key) # Generate view URL
                    })
                    
            return files
            
        except ClientError as e:
            logger.error(f"Failed to list files: {e}")
            raise Exception(f"Failed to list files: {str(e)}")

    def delete_folder(self, folder_path: str) -> bool:
        """
        Delete all files in a folder (useful for cleanup after approval)
        
        Args:
            folder_path: Folder path to delete
        
        Returns:
            bool: True if successful
        """
        # Mock mode - just log
        if self._mock_mode:
            logger.info(f"[MOCK] Would delete folder: {folder_path}")
            return True
        
        try:
            # List all objects in the folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder_path
            )
            
            if 'Contents' not in response:
                return True  # Folder is already empty
            
            # Delete all objects
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            
            self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            
            logger.info(f"Folder deleted successfully: {folder_path}")
            return True
            
        except ClientError as e:
            logger.error(f"S3 folder delete failed: {e}")
            return False
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension"""
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        content_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
        }
        
        return content_types.get(ext, 'application/octet-stream')


# Singleton instance
s3_service = S3Service()
