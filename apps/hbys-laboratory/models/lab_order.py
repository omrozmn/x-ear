"""
Lab Order Model
Represents a laboratory order (istek/talep) placed by a physician for a patient.
"""
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


class LabOrder(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "lab_orders"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("lor"))
    encounter_id = Column(String(36), nullable=True, index=True)
    patient_id = Column(String(36), nullable=False, index=True)
    ordered_by = Column(String(36), nullable=True, index=True)

    # Order metadata
    order_date = Column(DateTime, nullable=False, default=now_utc)
    status = Column(String(20), nullable=False, default="ordered")  # ordered / collected / in_progress / completed / cancelled
    priority = Column(String(10), nullable=False, default="routine")  # routine / urgent / stat

    # Clinical context
    clinical_info = Column(Text, nullable=True)
    specimen_type = Column(String(20), nullable=True)  # blood / urine / stool / csf / tissue / swab
    barcode = Column(String(50), unique=True, nullable=True, index=True)

    # Collection info
    collection_date = Column(DateTime, nullable=True)
    collected_by = Column(String(36), nullable=True)

    # Relationships
    tests = relationship("LabTest", back_populates="lab_order", cascade="all, delete-orphan", lazy="select")
