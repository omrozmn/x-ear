"""
Clinical Encounter Model
Represents a patient-doctor clinical encounter (outpatient, inpatient, emergency).
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class Encounter(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "clinical_encounters"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("enc"))
    patient_id = Column(String(36), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Encounter metadata
    encounter_type = Column(String(20), nullable=False, default="outpatient")  # outpatient / inpatient / emergency
    status = Column(String(20), nullable=False, default="waiting")  # waiting / in_progress / completed / cancelled

    # SOAP notes
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)

    # Additional clinical data
    chief_complaint = Column(String(500), nullable=True)
    clinical_notes = Column(Text, nullable=True)

    # Dates
    encounter_date = Column(DateTime, nullable=False, default=now_utc)
    discharge_date = Column(DateTime, nullable=True)

    # Relationships
    vital_signs = relationship("VitalSigns", back_populates="encounter", cascade="all, delete-orphan", lazy="select")
    notes = relationship("ClinicalNote", back_populates="encounter", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "patientId": self.patient_id,
            "doctorId": self.doctor_id,
            "encounterType": self.encounter_type,
            "status": self.status,
            "subjective": self.subjective,
            "objective": self.objective,
            "assessment": self.assessment,
            "plan": self.plan,
            "chiefComplaint": self.chief_complaint,
            "clinicalNotes": self.clinical_notes,
            "encounterDate": self._format_datetime_utc(self.encounter_date),
            "dischargeDate": self._format_datetime_utc(self.discharge_date),
            "tenantId": self.tenant_id,
        })
        return result
