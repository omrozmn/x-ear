"""
Clinical Protocol Model
Reference table for clinical treatment protocols / guidelines.
NOT tenant-scoped: shared across all tenants as reference data.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, Index

from core.models.base import BaseModel
from core.database import gen_id


class ClinicalProtocol(BaseModel):
    __tablename__ = "hbys_clinical_protocols"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("cpr"))

    # Identification
    name_tr = Column(String(500), nullable=False)
    name_en = Column(String(500), nullable=True)

    # Classification
    icd_codes = Column(Text, nullable=True, comment="JSON array of associated ICD-10 codes")
    specialty = Column(String(100), nullable=True, index=True)
    protocol_type = Column(
        String(20),
        nullable=False,
        default="treatment",
        comment="treatment | diagnostic | preventive | follow_up",
    )

    # Content
    description = Column(Text, nullable=True)
    steps = Column(Text, nullable=True, comment="JSON array of protocol steps")
    contraindications = Column(Text, nullable=True, comment="JSON array or free text")

    # Metadata
    evidence_level = Column(
        String(10), nullable=True, comment="1a | 1b | 2a | 2b | 3 | 4 | 5"
    )
    is_active = Column(Boolean, nullable=False, default=True)
    version = Column(Integer, nullable=False, default=1)

    @staticmethod
    def _json_load(value):
        if value is None:
            return None
        import json
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            "id": self.id,
            "nameTr": self.name_tr,
            "nameEn": self.name_en,
            "icdCodes": self._json_load(self.icd_codes),
            "specialty": self.specialty,
            "protocolType": self.protocol_type,
            "description": self.description,
            "steps": self._json_load(self.steps),
            "contraindications": self._json_load(self.contraindications),
            "evidenceLevel": self.evidence_level,
            "isActive": self.is_active,
            "version": self.version,
        }
        d.update(base)
        return d

    __table_args__ = (
        Index("ix_hbys_cpr_specialty", "specialty"),
        Index("ix_hbys_cpr_type", "protocol_type"),
        Index("ix_hbys_cpr_active", "is_active"),
    )
