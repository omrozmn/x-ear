"""
Test Definition Model (NOT tenant-scoped)
Master catalogue of available laboratory tests with reference ranges and metadata.
Shared across all tenants.
"""
from sqlalchemy import Column, String, Text, Float, Integer, Boolean

from core.models.base import BaseModel
from database import Base, gen_id


class TestDefinition(Base, BaseModel):
    __tablename__ = "lab_test_definitions"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("tdf"))

    # Naming
    name_tr = Column(String(200), nullable=False, index=True)
    name_en = Column(String(200), nullable=True)

    # Classification
    loinc_code = Column(String(20), nullable=True, unique=True)
    category = Column(String(30), nullable=False, default="biochemistry")
    # hematology / biochemistry / microbiology / immunology / urinalysis / coagulation / hormones / tumor_markers

    # Specimen & unit
    specimen_type = Column(String(20), nullable=False, default="blood")
    # blood / urine / stool / csf / tissue / swab
    unit = Column(String(50), nullable=True)

    # Reference ranges by gender
    ref_range_male_low = Column(Float, nullable=True)
    ref_range_male_high = Column(Float, nullable=True)
    ref_range_female_low = Column(Float, nullable=True)
    ref_range_female_high = Column(Float, nullable=True)

    # Reference ranges by age (pediatric / geriatric overrides)
    ref_range_child_low = Column(Float, nullable=True)
    ref_range_child_high = Column(Float, nullable=True)

    # Critical / panic values
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)

    # Operational
    turnaround_minutes = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Extra description
    description = Column(Text, nullable=True)

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "nameTr": self.name_tr,
            "nameEn": self.name_en,
            "loincCode": self.loinc_code,
            "category": self.category,
            "specimenType": self.specimen_type,
            "unit": self.unit,
            "refRangeMaleLow": self.ref_range_male_low,
            "refRangeMaleHigh": self.ref_range_male_high,
            "refRangeFemaleLow": self.ref_range_female_low,
            "refRangeFemaleHigh": self.ref_range_female_high,
            "refRangeChildLow": self.ref_range_child_low,
            "refRangeChildHigh": self.ref_range_child_high,
            "criticalLow": self.critical_low,
            "criticalHigh": self.critical_high,
            "turnaroundMinutes": self.turnaround_minutes,
            "isActive": self.is_active,
            "description": self.description,
        })
        return result
