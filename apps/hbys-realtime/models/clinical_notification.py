"""
Clinical Notification Model
Represents a clinical notification dispatched to users, roles, wards, or broadcast.
"""
from sqlalchemy import Column, String, Text, DateTime

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, format_datetime_utc


class ClinicalNotification(BaseModel, TenantScopedMixin):
    __tablename__ = "clinical_notifications"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("cno"))

    # Notification classification
    notification_type = Column(
        String(30), nullable=False, index=True
    )  # critical_lab / panic_value / vital_alert / medication_due / nurse_call /
    #   code_blue / consultation_request / bed_ready / discharge_ready / surgery_ready

    priority = Column(
        String(10), nullable=False, default="medium"
    )  # low / medium / high / critical

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(Text, nullable=True)  # JSON-encoded payload

    # Source information
    source_type = Column(String(50), nullable=True)  # e.g. lab_test, vital_sign, order
    source_id = Column(String(36), nullable=True, index=True)

    # Patient context (nullable for system-wide notifications)
    patient_id = Column(String(36), nullable=True, index=True)

    # Target routing
    target_type = Column(
        String(10), nullable=False, default="user"
    )  # user / role / ward / all
    target_id = Column(String(100), nullable=True, index=True)

    # Delivery status
    status = Column(
        String(10), nullable=False, default="pending"
    )  # pending / sent / delivered / read / expired

    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    read_by = Column(String(36), nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Delivery channel
    channel = Column(
        String(15), nullable=False, default="websocket"
    )  # websocket / push / sms / email / pager

    def to_dict(self):
        return {
            "id": self.id,
            "notificationType": self.notification_type,
            "priority": self.priority,
            "title": self.title,
            "message": self.message,
            "data": self.data,
            "sourceType": self.source_type,
            "sourceId": self.source_id,
            "patientId": self.patient_id,
            "targetType": self.target_type,
            "targetId": self.target_id,
            "status": self.status,
            "sentAt": format_datetime_utc(self.sent_at),
            "readAt": format_datetime_utc(self.read_at),
            "readBy": self.read_by,
            "expiresAt": format_datetime_utc(self.expires_at),
            "channel": self.channel,
            "tenantId": self.tenant_id,
            "createdAt": format_datetime_utc(self.created_at),
            "updatedAt": format_datetime_utc(self.updated_at),
        }
