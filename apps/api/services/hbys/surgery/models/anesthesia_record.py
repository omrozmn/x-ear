"""
Anesthesia Record Model - Tracks anesthesia details for a surgical procedure.
"""
import enum
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from core.models.base import BaseModel, LowercaseEnum
from core.models.mixins import TenantScopedMixin
from database import gen_id


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


class AnesthesiaRecord(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_anesthesia_records"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("ane"))
    surgery_id = Column(
        String(36),
        ForeignKey("hbys_surgeries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    anesthesiologist_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ASA classification
    asa_score = Column(LowercaseEnum(ASAScore), nullable=True)

    # Anesthesia type
    anesthesia_type = Column(LowercaseEnum(AnesthesiaRecordType), nullable=True)

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

    def to_dict(self):
        import json as _json

        def _safe_json(val):
            if val is None:
                return None
            if isinstance(val, str):
                try:
                    return _json.loads(val)
                except (ValueError, TypeError):
                    return val
            return val

        d = self.to_dict_base()
        d.update(
            {
                "id": self.id,
                "surgeryId": self.surgery_id,
                "anesthesiologistId": self.anesthesiologist_id,
                "asaScore": self.asa_score.value if self.asa_score else None,
                "anesthesiaType": self.anesthesia_type.value
                if self.anesthesia_type
                else None,
                "inductionTime": self._format_datetime_utc(self.induction_time),
                "intubationTime": self._format_datetime_utc(self.intubation_time),
                "extubationTime": self._format_datetime_utc(self.extubation_time),
                "recoveryTime": self._format_datetime_utc(self.recovery_time),
                "preOpAssessment": self.pre_op_assessment,
                "medicationsGiven": _safe_json(self.medications_given),
                "vitalSignsLog": _safe_json(self.vital_signs_log),
                "complications": self.complications,
                "postOpInstructions": self.post_op_instructions,
            }
        )
        return d
