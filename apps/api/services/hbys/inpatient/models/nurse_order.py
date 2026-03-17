"""
Nurse Order Model
Represents nursing orders (medication admin, IV fluid, monitoring, wound care, etc.).
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel, JSONMixin
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class NurseOrder(Base, TenantScopedMixin, BaseModel, JSONMixin):
    __tablename__ = "inpatient_nurse_orders"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("nor"))
    admission_id = Column(
        String(36), ForeignKey("inpatient_admissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id = Column(String(36), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)

    order_type = Column(
        String(20), nullable=False, default="other"
    )  # medication/iv_fluid/monitoring/positioning/wound_care/diet/activity/other

    description = Column(Text, nullable=False)
    frequency = Column(String(100), nullable=True)
    scheduled_times = Column(Text, nullable=True)  # JSON: ["08:00", "14:00", "20:00"]

    status = Column(
        String(20), nullable=False, default="active"
    )  # active/completed/cancelled/on_hold

    ordered_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    executed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    admission = relationship("Admission", back_populates="nurse_orders")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "admissionId": self.admission_id,
            "patientId": self.patient_id,
            "orderType": self.order_type,
            "description": self.description,
            "frequency": self.frequency,
            "scheduledTimes": self.json_load(self.scheduled_times),
            "status": self.status,
            "orderedBy": self.ordered_by,
            "executedBy": self.executed_by,
            "executedAt": self._format_datetime_utc(self.executed_at),
            "notes": self.notes,
            "tenantId": self.tenant_id,
        })
        return result
