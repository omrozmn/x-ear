"""
Ward Model
Represents a hospital ward / unit (general, ICU, NICU, etc.).
"""
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id


class Ward(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "inpatient_wards"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("wrd"))
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    ward_type = Column(
        String(20), nullable=False, default="general"
    )  # general/icu/nicu/picu/ccu/burn/isolation/maternity/psychiatric
    floor = Column(String(20), nullable=True)
    total_beds = Column(Integer, nullable=False, default=0)
    active_beds = Column(Integer, nullable=False, default=0)
    head_nurse_id = Column(String(36), nullable=True)
    phone_extension = Column(String(20), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    beds = relationship("Bed", back_populates="ward", cascade="all, delete-orphan", lazy="select")
    admissions = relationship("Admission", back_populates="ward", lazy="select")
