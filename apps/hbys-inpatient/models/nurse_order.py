"""
Nurse Order Model
Represents nursing orders (medication admin, IV fluid, monitoring, wound care, etc.).
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, JSONMixin, gen_id, now_utc


class NurseOrder(Base, TenantScopedMixin, BaseModel, JSONMixin):
    __tablename__ = "inpatient_nurse_orders"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("nor"))
    admission_id = Column(
        String(36), ForeignKey("inpatient_admissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id = Column(String(36), nullable=False, index=True)

    order_type = Column(
        String(20), nullable=False, default="other"
    )  # medication/iv_fluid/monitoring/positioning/wound_care/diet/activity/other

    description = Column(Text, nullable=False)
    frequency = Column(String(100), nullable=True)
    scheduled_times = Column(Text, nullable=True)  # JSON: ["08:00", "14:00", "20:00"]

    status = Column(
        String(20), nullable=False, default="active"
    )  # active/completed/cancelled/on_hold

    ordered_by = Column(String(36), nullable=True, index=True)
    executed_by = Column(String(36), nullable=True)
    executed_at = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    admission = relationship("Admission", back_populates="nurse_orders")
