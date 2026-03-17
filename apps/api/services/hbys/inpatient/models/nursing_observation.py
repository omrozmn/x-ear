"""
Nursing Observation Model
Tracks vital signs, intake/output, pain, fall risk, pressure ulcer, consciousness, etc.
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey

from core.models.base import BaseModel, JSONMixin
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc
from sqlalchemy.orm import relationship


class NursingObservation(Base, TenantScopedMixin, BaseModel, JSONMixin):
    __tablename__ = "inpatient_nursing_observations"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("nob"))
    admission_id = Column(
        String(36), ForeignKey("inpatient_admissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id = Column(String(36), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)

    observation_type = Column(
        String(30), nullable=False, default="general"
    )  # vital_signs/intake_output/pain/fall_risk/pressure_ulcer/consciousness/general

    nurse_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    observed_at = Column(DateTime, nullable=False, default=now_utc)

    # Vital signs (JSON blob for flexibility)
    vital_data = Column(Text, nullable=True)  # JSON: bp, hr, rr, temp, spo2, etc.

    # Intake / Output
    intake_ml = Column(Float, nullable=True)
    output_ml = Column(Float, nullable=True)

    # Scores
    pain_score = Column(Integer, nullable=True)  # 0-10 NRS
    fall_risk_score = Column(Integer, nullable=True)  # Morse Fall Scale
    braden_score = Column(Integer, nullable=True)  # Braden Pressure Ulcer Scale
    glasgow_score = Column(Integer, nullable=True)  # Glasgow Coma Scale

    notes = Column(Text, nullable=True)
    shift = Column(String(20), nullable=True)  # morning/afternoon/night

    # Relationships
    admission = relationship("Admission", back_populates="nursing_observations")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "admissionId": self.admission_id,
            "patientId": self.patient_id,
            "observationType": self.observation_type,
            "nurseId": self.nurse_id,
            "observedAt": self._format_datetime_utc(self.observed_at),
            "vitalData": self.json_load(self.vital_data),
            "intakeMl": self.intake_ml,
            "outputMl": self.output_ml,
            "painScore": self.pain_score,
            "fallRiskScore": self.fall_risk_score,
            "bradenScore": self.braden_score,
            "glasgowScore": self.glasgow_score,
            "notes": self.notes,
            "shift": self.shift,
            "tenantId": self.tenant_id,
        })
        return result
