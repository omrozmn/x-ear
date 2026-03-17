"""
Vital Signs Model
Records patient vital signs during a clinical encounter.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


class VitalSigns(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "clinical_vital_signs"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("vit"))
    encounter_id = Column(String(36), ForeignKey("clinical_encounters.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)

    # Blood pressure
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)

    # Cardiac and respiratory
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)

    # Body measurements
    temperature = Column(Float, nullable=True)
    oxygen_saturation = Column(Float, nullable=True)
    height = Column(Float, nullable=True)   # cm
    weight = Column(Float, nullable=True)   # kg
    bmi = Column(Float, nullable=True)

    # Pain assessment
    pain_score = Column(Integer, nullable=True)  # 0-10

    # Recording info
    recorded_at = Column(DateTime, nullable=False, default=now_utc)
    recorded_by = Column(String(36), nullable=True)

    # Relationships
    encounter = relationship("Encounter", back_populates="vital_signs")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "encounterId": self.encounter_id,
            "patientId": self.patient_id,
            "bloodPressureSystolic": self.blood_pressure_systolic,
            "bloodPressureDiastolic": self.blood_pressure_diastolic,
            "heartRate": self.heart_rate,
            "respiratoryRate": self.respiratory_rate,
            "temperature": self.temperature,
            "oxygenSaturation": self.oxygen_saturation,
            "height": self.height,
            "weight": self.weight,
            "bmi": self.bmi,
            "painScore": self.pain_score,
            "recordedAt": self._format_datetime_utc(self.recorded_at),
            "recordedBy": self.recorded_by,
            "tenantId": self.tenant_id,
        })
        return result
