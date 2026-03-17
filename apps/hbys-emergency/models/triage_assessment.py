"""
Triage Assessment Model
Records detailed triage evaluation for an emergency visit.
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import BaseModel, TenantScopedMixin, gen_id, now_utc


class TriageAssessment(BaseModel, TenantScopedMixin):
    __tablename__ = "emergency_triage_assessments"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("tri"))
    emergency_visit_id = Column(
        String(36),
        ForeignKey("emergency_visits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Pain & consciousness
    pain_score = Column(Integer, nullable=True)  # 0-10
    consciousness = Column(
        String(20), nullable=True
    )  # alert / verbal / pain / unresponsive (AVPU)

    # Glasgow Coma Scale (3-15)
    glasgow_score = Column(Integer, nullable=True)
    glasgow_eye = Column(Integer, nullable=True)  # 1-4
    glasgow_verbal = Column(Integer, nullable=True)  # 1-5
    glasgow_motor = Column(Integer, nullable=True)  # 1-6

    # Vital signs
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)
    oxygen_saturation = Column(Float, nullable=True)  # SpO2

    # Additional
    blood_glucose = Column(Float, nullable=True)
    allergies = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)

    # Assessment info (logical FK - no constraint to avoid cross-service coupling)
    assessed_by = Column(String(36), nullable=True)
    assessed_at = Column(DateTime, nullable=False, default=now_utc)

    # Relationships
    emergency_visit = relationship("EmergencyVisit", back_populates="triage_assessments")

    def to_dict(self):
        return {
            "id": self.id,
            "emergencyVisitId": self.emergency_visit_id,
            "painScore": self.pain_score,
            "consciousness": self.consciousness,
            "glasgowScore": self.glasgow_score,
            "glasgowEye": self.glasgow_eye,
            "glasgowVerbal": self.glasgow_verbal,
            "glasgowMotor": self.glasgow_motor,
            "bloodPressureSystolic": self.blood_pressure_systolic,
            "bloodPressureDiastolic": self.blood_pressure_diastolic,
            "heartRate": self.heart_rate,
            "respiratoryRate": self.respiratory_rate,
            "temperature": self.temperature,
            "oxygenSaturation": self.oxygen_saturation,
            "bloodGlucose": self.blood_glucose,
            "allergies": self.allergies,
            "currentMedications": self.current_medications,
            "assessedBy": self.assessed_by,
            "assessedAt": self._format_datetime_utc(self.assessed_at),
            "tenantId": self.tenant_id,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
