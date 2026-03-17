"""
Drug Interaction Model
System-wide drug interaction reference data (NOT tenant-scoped).
Stores known drug-drug interactions with severity levels and clinical guidance.
"""
from sqlalchemy import Column, String, Text

from hbys_common.database import BaseModel, gen_id


class DrugInteraction(BaseModel):
    __tablename__ = "drug_interactions"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("dxi"))
    drug_a_code = Column(String(50), nullable=False, index=True)
    drug_a_name = Column(String(200), nullable=False)
    drug_b_code = Column(String(50), nullable=False, index=True)
    drug_b_name = Column(String(200), nullable=False)
    severity = Column(
        String(20), nullable=False, default="moderate"
    )  # minor / moderate / major / contraindicated
    description_tr = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    clinical_effect = Column(Text, nullable=True)
    management = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "drugACode": self.drug_a_code,
            "drugAName": self.drug_a_name,
            "drugBCode": self.drug_b_code,
            "drugBName": self.drug_b_name,
            "severity": self.severity,
            "descriptionTr": self.description_tr,
            "descriptionEn": self.description_en,
            "clinicalEffect": self.clinical_effect,
            "management": self.management,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
