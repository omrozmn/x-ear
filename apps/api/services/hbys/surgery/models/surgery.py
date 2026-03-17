"""
Surgery Model - Core surgical procedure record.
"""
import enum
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, Index
from core.models.base import BaseModel, LowercaseEnum
from core.models.mixins import TenantScopedMixin
from database import gen_id, now_utc


class SurgeryType(str, enum.Enum):
    elective = "elective"
    urgent = "urgent"
    emergency = "emergency"


class SurgeryStatus(str, enum.Enum):
    planned = "planned"
    scheduled = "scheduled"
    pre_op = "pre_op"
    in_progress = "in_progress"
    post_op = "post_op"
    completed = "completed"
    cancelled = "cancelled"


class AnesthesiaType(str, enum.Enum):
    general = "general"
    spinal = "spinal"
    epidural = "epidural"
    local = "local"
    sedation = "sedation"
    regional = "regional"


class Laterality(str, enum.Enum):
    left = "left"
    right = "right"
    bilateral = "bilateral"
    not_applicable = "not_applicable"


class Surgery(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_surgeries"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("srg"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)

    # Procedure details
    surgery_type = Column(
        LowercaseEnum(SurgeryType), nullable=False, default=SurgeryType.elective
    )
    procedure_name = Column(String(500), nullable=False)
    procedure_code = Column(String(50), nullable=True, index=True)  # SUT kodu
    body_site = Column(String(200), nullable=True)
    laterality = Column(LowercaseEnum(Laterality), nullable=True)

    # Status tracking
    status = Column(
        LowercaseEnum(SurgeryStatus), nullable=False, default=SurgeryStatus.planned
    )

    # Scheduling
    scheduled_date = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    operating_room = Column(String(100), nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)

    # Anesthesia
    anesthesia_type = Column(LowercaseEnum(AnesthesiaType), nullable=True)

    # Clinical notes
    pre_op_diagnosis = Column(Text, nullable=True)
    post_op_diagnosis = Column(Text, nullable=True)
    surgical_notes = Column(Text, nullable=True)
    complications = Column(Text, nullable=True)

    # Measurements
    blood_loss_ml = Column(Integer, nullable=True)
    specimens_sent = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_hbys_surgery_tenant_patient", "tenant_id", "patient_id"),
        Index("ix_hbys_surgery_tenant_encounter", "tenant_id", "encounter_id"),
        Index("ix_hbys_surgery_tenant_status", "tenant_id", "status"),
        Index("ix_hbys_surgery_scheduled", "tenant_id", "scheduled_date"),
        Index("ix_hbys_surgery_or_schedule", "tenant_id", "operating_room", "scheduled_date"),
    )

    def to_dict(self):
        d = self.to_dict_base()
        d.update(
            {
                "id": self.id,
                "encounterId": self.encounter_id,
                "patientId": self.patient_id,
                "surgeryType": self.surgery_type.value if self.surgery_type else None,
                "procedureName": self.procedure_name,
                "procedureCode": self.procedure_code,
                "bodySite": self.body_site,
                "laterality": self.laterality.value if self.laterality else None,
                "status": self.status.value if self.status else None,
                "scheduledDate": self._format_datetime_utc(self.scheduled_date),
                "actualStart": self._format_datetime_utc(self.actual_start),
                "actualEnd": self._format_datetime_utc(self.actual_end),
                "operatingRoom": self.operating_room,
                "estimatedDurationMinutes": self.estimated_duration_minutes,
                "anesthesiaType": self.anesthesia_type.value
                if self.anesthesia_type
                else None,
                "preOpDiagnosis": self.pre_op_diagnosis,
                "postOpDiagnosis": self.post_op_diagnosis,
                "surgicalNotes": self.surgical_notes,
                "complications": self.complications,
                "bloodLossMl": self.blood_loss_ml,
                "specimensSent": self.specimens_sent,
            }
        )
        return d
