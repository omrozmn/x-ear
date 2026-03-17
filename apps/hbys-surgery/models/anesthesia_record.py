"""
Anesthesia Record Model - Tracks anesthesia details for a surgical procedure.
"""
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum, Index

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id


class ASAScore(str, enum.Enum):
    asa_1 = "1"
    asa_2 = "2"
    asa_3 = "3"
    asa_4 = "4"
    asa_5 = "5"
    asa_6 = "6"


class AnesthesiaRecordType(str, enum.Enum):
    general = "general"
    spinal = "spinal"
    epidural = "epidural"
    local = "local"
    sedation = "sedation"
    regional = "regional"


class AnesthesiaRecord(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "hbys_anesthesia_records"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("ane"))
    surgery_id = Column(
        String(36),
        ForeignKey("hbys_surgeries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    anesthesiologist_id = Column(String(36), nullable=True, index=True)

    # ASA classification
    asa_score = Column(
        Enum(ASAScore, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

    # Anesthesia type
    anesthesia_type = Column(
        Enum(AnesthesiaRecordType, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

    # Time tracking
    induction_time = Column(DateTime, nullable=True)
    intubation_time = Column(DateTime, nullable=True)
    extubation_time = Column(DateTime, nullable=True)
    recovery_time = Column(DateTime, nullable=True)

    # Clinical data
    pre_op_assessment = Column(Text, nullable=True)
    medications_given = Column(Text, nullable=True)  # JSON array
    vital_signs_log = Column(Text, nullable=True)  # JSON array
    complications = Column(Text, nullable=True)
    post_op_instructions = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_hbys_ane_tenant_surgery", "tenant_id", "surgery_id"),
        Index("ix_hbys_ane_tenant_anesth", "tenant_id", "anesthesiologist_id"),
    )
