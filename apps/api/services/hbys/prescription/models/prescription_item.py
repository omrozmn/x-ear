"""
Prescription Item Model
=======================
Individual medication line-item inside a prescription.
"""
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship

from core.models.base import BaseModel, gen_id
from core.models.mixins import TenantScopedMixin


class PrescriptionItem(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_prescription_items"

    # Primary key
    id = Column(String(50), primary_key=True, default=lambda: gen_id("pri"))

    # Parent prescription
    prescription_id = Column(
        String(50),
        ForeignKey("hbys_prescriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Medication info
    medication_name = Column(String(300), nullable=False)
    medication_code = Column(String(50), nullable=True)

    # Dosage
    dosage = Column(String(100), nullable=True, comment="e.g. 500mg")
    dosage_form = Column(
        String(30),
        nullable=True,
        default="tablet",
        comment="tablet | capsule | syrup | injection | cream | drop | inhaler | patch | suppository",
    )
    frequency = Column(String(50), nullable=True, comment="e.g. 3x1")
    duration_days = Column(Integer, nullable=True)
    quantity = Column(Integer, nullable=True)

    # Usage
    usage_instructions = Column(Text, nullable=True)
    is_generic_allowed = Column(Boolean, default=True, nullable=False)

    # Packaging
    box_count = Column(Integer, nullable=True, default=1)
    unit_per_box = Column(Integer, nullable=True)

    # Relationship back to prescription
    prescription = relationship("Prescription", back_populates="items")

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            "id": self.id,
            "prescriptionId": self.prescription_id,
            "medicationName": self.medication_name,
            "medicationCode": self.medication_code,
            "dosage": self.dosage,
            "dosageForm": self.dosage_form,
            "frequency": self.frequency,
            "durationDays": self.duration_days,
            "quantity": self.quantity,
            "usageInstructions": self.usage_instructions,
            "isGenericAllowed": self.is_generic_allowed,
            "boxCount": self.box_count,
            "unitPerBox": self.unit_per_box,
        }
        d.update(base)
        return d

    __table_args__ = (
        Index("ix_hbys_pri_prescription", "prescription_id"),
    )
