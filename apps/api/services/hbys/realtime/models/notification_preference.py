"""
Notification Preference Model
Stores per-user notification channel preferences and quiet-hours settings.
"""
from sqlalchemy import Column, String, Boolean, Time

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id


class NotificationPreference(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("npf"))
    user_id = Column(String(36), nullable=False, index=True)

    # Which notification type this preference applies to
    notification_type = Column(
        String(30), nullable=False
    )  # critical_lab / panic_value / vital_alert / medication_due / nurse_call /
    #   code_blue / consultation_request / bed_ready / discharge_ready / surgery_ready

    # Delivery channel preference
    channel = Column(
        String(15), nullable=False, default="websocket"
    )  # websocket / push / sms / email / pager

    is_enabled = Column(Boolean, nullable=False, default=True)

    # Quiet hours (nullable = no quiet hours configured)
    quiet_hours_start = Column(Time, nullable=True)
    quiet_hours_end = Column(Time, nullable=True)

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "userId": self.user_id,
            "notificationType": self.notification_type,
            "channel": self.channel,
            "isEnabled": self.is_enabled,
            "quietHoursStart": str(self.quiet_hours_start) if self.quiet_hours_start else None,
            "quietHoursEnd": str(self.quiet_hours_end) if self.quiet_hours_end else None,
            "tenantId": self.tenant_id,
        })
        return result
