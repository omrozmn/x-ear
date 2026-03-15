"""
Activity Logging Utilities (FastAPI)

Provides helper functions for logging user activity.

Critical actions (is_critical=True):
- User creation, deletion, role changes
- Invoice sending/cancellation
- Cash record creation/deletion
- File uploads/deletions
- Login/logout
- Tenant settings changes
"""
import logging

from core.database import SessionLocal
from core.models.user import ActivityLog

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


def _create_activity_log(
    action: str,
    message: str = None,
    entity_id: str = None,
    entity_type: str = None,
    is_critical: bool = None,
    user_context: dict = None
):
    """Create an activity log entry using a standalone DB session."""
    session = None
    try:
        if message is None:
            message = ACTION_MESSAGES.get(action, action)
        if entity_type is None and '.' in action:
            entity_type = action.split('.')[0]
        if is_critical is None:
            is_critical = action in CRITICAL_ACTIONS

        session = SessionLocal()
        log = ActivityLog(
            tenant_id=(user_context or {}).get('tenant_id'),
            user_id=(user_context or {}).get('user_id'),
            action=action,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            is_critical=is_critical,
        )
        session.add(log)
        session.commit()
        logger.info(f"Activity logged: {action} by user {(user_context or {}).get('user_id')}")
        return log
    except Exception as e:
        logger.error(f"Failed to create activity log: {e}")
        if session:
            session.rollback()
        return None
    finally:
        if session:
            session.close()


def log_activity(user_id: str, tenant_id: str, action: str, message: str = None):
    """Log a generic activity."""
    _create_activity_log(
        action=action,
        message=message,
        entity_id=user_id,
        entity_type='user',
        user_context={'user_id': user_id, 'tenant_id': tenant_id},
    )


def log_login(user_id: str, tenant_id: str = None, success: bool = True):
    """Log a login event."""
    action = 'auth.login' if success else 'auth.failed_login'
    message = 'Sisteme giriş yapıldı' if success else 'Başarısız giriş denemesi'
    _create_activity_log(
        action=action,
        message=message,
        entity_id=user_id,
        entity_type='user',
        is_critical=True,
        user_context={'user_id': user_id if success else None, 'tenant_id': tenant_id},
    )


def log_logout(user_id: str, tenant_id: str = None):
    """Log a logout event."""
    _create_activity_log(
        action='auth.logout',
        message='Sistemden çıkış yapıldı',
        entity_id=user_id,
        entity_type='user',
        is_critical=True,
        user_context={'user_id': user_id, 'tenant_id': tenant_id},
    )
