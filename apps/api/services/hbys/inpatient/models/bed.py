"""
Bed Model
Represents a hospital bed within a ward.
"""
from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from core.models.base import BaseModel, JSONMixin
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id


class Bed(Base, TenantScopedMixin, BaseModel, JSONMixin):
    __tablename__ = "inpatient_beds"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("bed"))
    ward_id = Column(String(36), ForeignKey("inpatient_wards.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_number = Column(String(20), nullable=False)
    room_number = Column(String(20), nullable=True)
    bed_type = Column(
        String(20), nullable=False, default="standard"
    )  # standard/electric/bariatric/pediatric/icu
    status = Column(
        String(20), nullable=False, default="available"
    )  # available/occupied/reserved/maintenance/cleaning
    current_patient_id = Column(String(36), nullable=True, index=True)
    features = Column(Text, nullable=True)  # JSON: e.g. {"oxygen": true, "suction": true}

    # Relationships
    ward = relationship("Ward", back_populates="beds")
    admissions = relationship("Admission", back_populates="bed", lazy="select")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "wardId": self.ward_id,
            "bedNumber": self.bed_number,
            "roomNumber": self.room_number,
            "bedType": self.bed_type,
            "status": self.status,
            "currentPatientId": self.current_patient_id,
            "features": self.json_load(self.features),
            "tenantId": self.tenant_id,
        })
        return result
