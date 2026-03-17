"""
Admission Model
Represents a patient inpatient admission record.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class Admission(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "inpatient_admissions"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("adm"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    admitting_doctor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    attending_doctor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Dates
    admission_date = Column(DateTime, nullable=False, default=now_utc)
    discharge_date = Column(DateTime, nullable=True)

    # Admission metadata
    admission_type = Column(
        String(20), nullable=False, default="elective"
    )  # elective/emergency/transfer/newborn
    status = Column(
        String(20), nullable=False, default="admitted"
    )  # admitted/in_treatment/discharge_planned/discharged/transferred/deceased

    # Ward & Bed
    ward_id = Column(String(36), ForeignKey("inpatient_wards.id", ondelete="SET NULL"), nullable=True, index=True)
    bed_id = Column(String(36), ForeignKey("inpatient_beds.id", ondelete="SET NULL"), nullable=True, index=True)

    # Diagnosis
    admission_diagnosis = Column(Text, nullable=True)
    discharge_diagnosis = Column(Text, nullable=True)

    # Discharge details
    discharge_type = Column(
        String(20), nullable=True
    )  # normal/transfer/ama/deceased
    discharge_summary = Column(Text, nullable=True)
    follow_up_instructions = Column(Text, nullable=True)

    # Care instructions
    diet_type = Column(String(100), nullable=True)
    activity_level = Column(String(100), nullable=True)
    isolation_type = Column(String(50), nullable=True)

    # Relationships
    ward = relationship("Ward", back_populates="admissions")
    bed = relationship("Bed", back_populates="admissions")
    nursing_observations = relationship(
        "NursingObservation", back_populates="admission", cascade="all, delete-orphan", lazy="select"
    )
    nurse_orders = relationship(
        "NurseOrder", back_populates="admission", cascade="all, delete-orphan", lazy="select"
    )

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "encounterId": self.encounter_id,
            "patientId": self.patient_id,
            "admittingDoctorId": self.admitting_doctor_id,
            "attendingDoctorId": self.attending_doctor_id,
            "admissionDate": self._format_datetime_utc(self.admission_date),
            "dischargeDate": self._format_datetime_utc(self.discharge_date),
            "admissionType": self.admission_type,
            "status": self.status,
            "wardId": self.ward_id,
            "bedId": self.bed_id,
            "admissionDiagnosis": self.admission_diagnosis,
            "dischargeDiagnosis": self.discharge_diagnosis,
            "dischargeType": self.discharge_type,
            "dischargeSummary": self.discharge_summary,
            "followUpInstructions": self.follow_up_instructions,
            "dietType": self.diet_type,
            "activityLevel": self.activity_level,
            "isolationType": self.isolation_type,
            "tenantId": self.tenant_id,
        })
        return result
