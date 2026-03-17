"""
Surgery Model - Core surgical procedure record.
"""
import enum
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, Enum, Index

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


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


class Surgery(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "hbys_surgeries"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("srg"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)

    # Procedure details
    surgery_type = Column(
        Enum(SurgeryType, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=SurgeryType.elective,
    )
    procedure_name = Column(String(500), nullable=False)
    procedure_code = Column(String(50), nullable=True, index=True)  # SUT kodu
    body_site = Column(String(200), nullable=True)
    laterality = Column(
        Enum(Laterality, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

    # Status tracking
    status = Column(
        Enum(SurgeryStatus, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=SurgeryStatus.planned,
    )

    # Scheduling
    scheduled_date = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    operating_room = Column(String(100), nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)

    # Anesthesia
    anesthesia_type = Column(
        Enum(AnesthesiaType, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

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
