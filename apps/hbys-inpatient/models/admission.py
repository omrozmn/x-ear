"""
Admission Model
Represents a patient inpatient admission record.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


class Admission(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "inpatient_admissions"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("adm"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)
    admitting_doctor_id = Column(String(36), nullable=True, index=True)
    attending_doctor_id = Column(String(36), nullable=True, index=True)

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
