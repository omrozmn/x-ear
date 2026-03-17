"""
Emergency Visit Model
Represents a patient visit to the emergency department.
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class EmergencyVisit(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "emergency_visits"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("emr"))
    patient_id = Column(
        String(36),
        ForeignKey("parties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Arrival info
    arrival_mode = Column(
        String(20), nullable=False, default="walk_in"
    )  # walk_in / ambulance_112 / referral / police / self
    arrival_date = Column(DateTime, nullable=False, default=now_utc)
    unidentified_patient_info = Column(Text, nullable=True)  # JSON string

    # Clinical
    chief_complaint = Column(String(500), nullable=True)
    triage_level = Column(Integer, nullable=True)  # 1-5
    triage_color = Column(
        String(10), nullable=True
    )  # red / orange / yellow / green / blue
    triage_nurse_id = Column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    triage_date = Column(DateTime, nullable=True)

    # Doctor assignment
    attending_doctor_id = Column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Status tracking
    status = Column(
        String(20), nullable=False, default="waiting"
    )  # waiting / triage / treatment / observation / admitted / discharged / transferred / deceased / left_ama

    # Bed & observation
    bed_number = Column(String(20), nullable=True)
    observation_start = Column(DateTime, nullable=True)

    # Disposition & discharge
    disposition = Column(String(100), nullable=True)
    discharge_date = Column(DateTime, nullable=True)
    discharge_notes = Column(Text, nullable=True)

    # Forensic & accident flags
    is_forensic_case = Column(Boolean, nullable=False, default=False)
    forensic_report_filed = Column(Boolean, nullable=False, default=False)
    is_workplace_accident = Column(Boolean, nullable=False, default=False)
    is_traffic_accident = Column(Boolean, nullable=False, default=False)

    # Relationships
    triage_assessments = relationship(
        "TriageAssessment",
        back_populates="emergency_visit",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def to_dict(self):
        result = self.to_dict_base()
        result.update(
            {
                "id": self.id,
                "patientId": self.patient_id,
                "arrivalMode": self.arrival_mode,
                "arrivalDate": self._format_datetime_utc(self.arrival_date),
                "unidentifiedPatientInfo": self.unidentified_patient_info,
                "chiefComplaint": self.chief_complaint,
                "triageLevel": self.triage_level,
                "triageColor": self.triage_color,
                "triageNurseId": self.triage_nurse_id,
                "triageDate": self._format_datetime_utc(self.triage_date),
                "attendingDoctorId": self.attending_doctor_id,
                "status": self.status,
                "bedNumber": self.bed_number,
                "observationStart": self._format_datetime_utc(self.observation_start),
                "disposition": self.disposition,
                "dischargeDate": self._format_datetime_utc(self.discharge_date),
                "dischargeNotes": self.discharge_notes,
                "isForensicCase": self.is_forensic_case,
                "forensicReportFiled": self.forensic_report_filed,
                "isWorkplaceAccident": self.is_workplace_accident,
                "isTrafficAccident": self.is_traffic_accident,
                "tenantId": self.tenant_id,
            }
        )
        return result
