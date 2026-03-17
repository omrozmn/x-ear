"""
Radiology Report Model
Represents a radiologist's report for an imaging order.
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


class RadiologyReport(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "radiology_reports"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("rpt"))
    imaging_order_id = Column(
        String(36),
        ForeignKey("imaging_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Report content
    findings = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)

    # Authorship
    reported_by = Column(String(36), nullable=True, index=True)
    reported_at = Column(DateTime, nullable=True, default=now_utc)

    # Verification
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Workflow
    status = Column(
        String(20), nullable=False, default="draft"
    )  # draft / preliminary / final / amended / cancelled

    # Critical findings
    is_critical = Column(Boolean, nullable=False, default=False)
    critical_notified_at = Column(DateTime, nullable=True)

    # Relationships
    imaging_order = relationship("ImagingOrder", back_populates="reports")
