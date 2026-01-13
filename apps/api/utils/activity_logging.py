"""
Activity Logging Decorator and Utilities

Provides a decorator @log_action for automatically logging user actions.
Extracts user context from JWT and Flask request.

Usage:
    @log_action(action="patient.created", message="Hasta oluşturuldu")
    def create_patient():
        ...
    
    # Or with dynamic message
    @log_action(action="patient.updated")
    def update_patient(patient_id):
        ...  # message will be auto-generated

Critical actions (is_critical=True):
- User creation, deletion, role changes
- Invoice sending/cancellation
- Cash record creation/deletion
- File uploads/deletions
- Login/logout
- Tenant settings changes
"""
import logging
import json
from functools import wraps
from flask import request, g
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
from models.base import db
from models.user import ActivityLog

logger = logging.getLogger(__name__)

# Define which actions are critical
CRITICAL_ACTIONS = {
    # User management
    'user.created', 'user.deleted', 'user.role_changed', 'user.branch_assigned',
    # Invoice operations
    'invoice.sent', 'invoice.cancelled', 'invoice.deleted',
    # Cash operations
    'cash.created', 'cash.deleted', 'cash.updated',
    # File operations
    'file.uploaded', 'file.deleted',
    # Auth events
    'auth.login', 'auth.logout', 'auth.failed_login',
    # Impersonation
    'auth.impersonation_started', 'auth.impersonation_ended',
    # Settings
    'settings.updated', 'tenant.settings_updated',
    # SGK
    'sgk.submitted', 'sgk.cancelled',
    # SMS
    'sms.sent', 'sms.bulk_sent',
    # Patient deletion
    'patient.deleted',
}

# Action to human-readable message templates
ACTION_MESSAGES = {
    # Patient
    'patient.created': 'Yeni hasta kaydı oluşturuldu',
    'patient.updated': 'Hasta bilgileri güncellendi',
    'patient.deleted': 'Hasta kaydı silindi',
    # Appointment
    'appointment.created': 'Yeni randevu oluşturuldu',
    'appointment.updated': 'Randevu güncellendi',
    'appointment.cancelled': 'Randevu iptal edildi',
    'appointment.completed': 'Randevu tamamlandı',
    # Invoice
    'invoice.created': 'Fatura oluşturuldu',
    'invoice.updated': 'Fatura güncellendi',
    'invoice.sent': 'Fatura gönderildi',
    'invoice.cancelled': 'Fatura iptal edildi',
    'invoice.deleted': 'Fatura silindi',
    # Cash
    'cash.created': 'Kasa kaydı oluşturuldu',
    'cash.updated': 'Kasa kaydı güncellendi',
    'cash.deleted': 'Kasa kaydı silindi',
    # File
    'file.uploaded': 'Dosya yüklendi',
    'file.deleted': 'Dosya silindi',
    # SMS
    'sms.sent': 'SMS gönderildi',
    'sms.bulk_sent': 'Toplu SMS gönderildi',
    # Auth
    'auth.login': 'Sisteme giriş yapıldı',
    'auth.logout': 'Sistemden çıkış yapıldı',
    'auth.failed_login': 'Başarısız giriş denemesi',
    # User management
    'user.created': 'Yeni kullanıcı oluşturuldu',
    'user.updated': 'Kullanıcı bilgileri güncellendi',
    'user.deleted': 'Kullanıcı silindi',
    'user.role_changed': 'Kullanıcı rolü değiştirildi',
    'user.branch_assigned': 'Kullanıcı şubeye atandı',
    # Impersonation
    'auth.impersonation_started': 'Rol simülasyonu başlatıldı',
    'auth.impersonation_ended': 'Rol simülasyonu sonlandırıldı',
    # Sales
    'sale.created': 'Satış oluşturuldu',
    'sale.updated': 'Satış güncellendi',
    'sale.deleted': 'Satış silindi',
    # Device
    'device.created': 'Cihaz eklendi',
    'device.updated': 'Cihaz güncellendi',
    'device.assigned': 'Cihaz atandı',
    'device.deleted': 'Cihaz silindi',
    # SGK
    'sgk.submitted': 'SGK başvurusu gönderildi',
    'sgk.cancelled': 'SGK başvurusu iptal edildi',
    # Campaign
    'campaign.created': 'Kampanya oluşturuldu',
    'campaign.updated': 'Kampanya güncellendi',
    'campaign.deleted': 'Kampanya silindi',
    # Settings
    'settings.updated': 'Ayarlar güncellendi',
    'tenant.settings_updated': 'Tenant ayarları güncellendi',
}


def get_user_context():
    """
    Extract user context from JWT token and request.
    
    Returns:
        dict with user_id, tenant_id, branch_id, role, real_user_id
    """
    context = {
        'user_id': None,
        'tenant_id': None,
        'branch_id': None,
        'role': None,
        'real_user_id': None,
        'is_impersonating': False
    }
    
    try:
        verify_jwt_in_request(optional=True)
        
        user_id = get_jwt_identity()
        if user_id:
            context['user_id'] = user_id
        
        jwt_claims = get_jwt()
        if jwt_claims:
            context['tenant_id'] = jwt_claims.get('tenant_id')
            context['role'] = jwt_claims.get('effective_role') or jwt_claims.get('role')
            
            # Check for impersonation
            if jwt_claims.get('is_impersonating'):
                context['real_user_id'] = jwt_claims.get('real_user_id')
                context['is_impersonating'] = True
            
            # Try to get branch from claims or request
            context['branch_id'] = jwt_claims.get('branch_id')
    except Exception as e:
        logger.debug(f"Could not extract JWT context: {e}")
    
    # Try to get branch from request if not in JWT
    if not context['branch_id']:
        try:
            if request.is_json and request.json:
                context['branch_id'] = request.json.get('branch_id') or request.json.get('branchId')
        except Exception:
            pass
    
    # Get role from database if not in JWT
    if context['user_id'] and not context['role']:
        try:
            from models.user import User
            user = User.query.get(context['user_id'])
            if user:
                context['role'] = user.role
                if not context['tenant_id']:
                    context['tenant_id'] = user.tenant_id
        except Exception as e:
            logger.debug(f"Could not get user from DB: {e}")
    
    return context


def get_request_metadata():
    """
    Extract request metadata.
    
    Returns:
        dict with ip_address, user_agent
    """
    return {
        'ip_address': request.headers.get('X-Forwarded-For', request.remote_addr),
        'user_agent': request.headers.get('User-Agent', '')[:500]  # Limit length
    }


def create_activity_log(
    action: str,
    message: str = None,
    entity_id: str = None,
    entity_type: str = None,
    data: dict = None,
    is_critical: bool = None,
    user_context: dict = None
):
    """
    Create an activity log entry.
    
    Args:
        action: Action identifier (e.g., "patient.created")
        message: Human-readable message (auto-generated if not provided)
        entity_id: ID of the affected entity
        entity_type: Type of entity (e.g., "patient", "invoice")
        data: Additional structured data
        is_critical: Whether this is a critical action (auto-detected if not provided)
        user_context: Pre-fetched user context (optional)
    
    Returns:
        ActivityLog instance or None on error
    """
    try:
        # Get user context if not provided
        if user_context is None:
            user_context = get_user_context()
        
        # Get request metadata
        request_meta = get_request_metadata()
        
        # Auto-generate message if not provided
        if message is None:
            message = ACTION_MESSAGES.get(action, action)
        
        # Auto-detect entity_type from action if not provided
        if entity_type is None and '.' in action:
            entity_type = action.split('.')[0]
        
        # Auto-detect critical status
        if is_critical is None:
            is_critical = action in CRITICAL_ACTIONS
        
        # Create log entry
        log = ActivityLog(
            tenant_id=user_context.get('tenant_id'),
            branch_id=user_context.get('branch_id'),
            user_id=user_context.get('user_id'),
            real_user_id=user_context.get('real_user_id'),
            role=user_context.get('role'),
            action=action,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=request_meta['ip_address'],
            user_agent=request_meta['user_agent'],
            is_critical=is_critical
        )
        
        # Set data JSON
        if data:
            log.data_json = data
        
        db.session.add(log)
        db.session.commit()
        
        logger.info(f"Activity logged: {action} by user {user_context.get('user_id')}")
        
        return log
        
    except Exception as e:
        logger.error(f"Failed to create activity log: {e}")
        db.session.rollback()
        return None


def log_action(
    action: str,
    message: str = None,
    entity_id_param: str = None,
    entity_id_from_response: str = None,
    is_critical: bool = None,
    include_request_body: bool = False
):
    """
    Decorator to automatically log an action when a route handler is called.
    
    Args:
        action: Action identifier (e.g., "patient.created")
        message: Human-readable message (auto-generated if not provided)
        entity_id_param: Name of the URL parameter containing entity ID
        entity_id_from_response: Key in response JSON to extract entity ID
        is_critical: Whether this is a critical action
        include_request_body: Whether to include request body in log data
    
    Usage:
        @log_action(action="patient.created", entity_id_from_response="data.id")
        def create_patient():
            ...
        
        @log_action(action="patient.deleted", entity_id_param="patient_id")
        def delete_patient(patient_id):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Get user context before executing the function
            user_context = get_user_context()
            
            # Execute the actual function
            result = fn(*args, **kwargs)
            
            # Try to extract entity_id
            entity_id = None
            data = {}
            
            # From URL parameters
            if entity_id_param and entity_id_param in kwargs:
                entity_id = kwargs[entity_id_param]
            
            # Include request body if requested
            if include_request_body:
                try:
                    if request.is_json and request.json:
                        # Filter out sensitive fields
                        body = {k: v for k, v in request.json.items() 
                               if k.lower() not in ('password', 'password_hash', 'token', 'secret')}
                        data['request'] = body
                except Exception:
                    pass
            
            # From response (for create operations)
            if entity_id_from_response and result:
                try:
                    # Handle Flask response tuple (data, status_code) or (data, status_code, headers)
                    response_data = result
                    if isinstance(result, tuple):
                        response_data = result[0]
                    
                    # Get JSON from response
                    if hasattr(response_data, 'get_json'):
                        json_data = response_data.get_json()
                    elif isinstance(response_data, dict):
                        json_data = response_data
                    else:
                        json_data = None
                    
                    if json_data:
                        # Navigate nested path like "data.id"
                        parts = entity_id_from_response.split('.')
                        value = json_data
                        for part in parts:
                            if isinstance(value, dict):
                                value = value.get(part)
                            else:
                                value = None
                                break
                        entity_id = value
                        
                        # Add response entity to data
                        if 'data' in json_data:
                            data['entity'] = json_data.get('data')
                except Exception as e:
                    logger.debug(f"Could not extract entity_id from response: {e}")
            
            # Create log entry
            create_activity_log(
                action=action,
                message=message,
                entity_id=str(entity_id) if entity_id else None,
                data=data if data else None,
                is_critical=is_critical,
                user_context=user_context
            )
            
            return result
        
        return wrapper
    return decorator


def log_login(user_id: str, tenant_id: str = None, success: bool = True):
    """
    Log a login event.
    
    Args:
        user_id: User attempting to log in
        tenant_id: Tenant ID if known
        success: Whether login was successful
    """
    action = 'auth.login' if success else 'auth.failed_login'
    message = 'Sisteme giriş yapıldı' if success else 'Başarısız giriş denemesi'
    
    user_context = {
        'user_id': user_id if success else None,
        'tenant_id': tenant_id,
        'role': None,
        'real_user_id': None
    }
    
    create_activity_log(
        action=action,
        message=message,
        entity_id=user_id,
        entity_type='user',
        is_critical=True,
        user_context=user_context
    )


def log_logout(user_id: str, tenant_id: str = None):
    """Log a logout event."""
    user_context = {
        'user_id': user_id,
        'tenant_id': tenant_id,
        'role': None,
        'real_user_id': None
    }
    
    create_activity_log(
        action='auth.logout',
        message='Sistemden çıkış yapıldı',
        entity_id=user_id,
        entity_type='user',
        is_critical=True,
        user_context=user_context
    )
