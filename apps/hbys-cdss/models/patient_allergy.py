"""
Patient Allergy Model
Tracks patient allergies for CDSS drug-allergy checking.
Tenant-scoped.
"""
from sqlalchemy import Column, String, Text, Boolean, Date, Index

from hbys_common.database import BaseModel, TenantScopedMixin, gen_id


class PatientAllergy(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_patient_allergies"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("alg"))

    patient_id = Column(String(50), nullable=False, index=True)

    # Allergen identification
    allergen_type = Column(
        String(20),
        nullable=False,
        comment="medication | food | environmental | latex | contrast | other",
    )
    allergen_name = Column(String(300), nullable=False)
    allergen_code = Column(
        String(50), nullable=True, comment="ATC code for medications, or other standard code"
    )

    # Reaction details
    reaction = Column(String(500), nullable=False, comment="Description of allergic reaction")
    severity = Column(
        String(20),
        nullable=False,
        default="moderate",
        comment="mild | moderate | severe | life_threatening",
    )

    # Status
    onset_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "patientId": self.patient_id,
            "allergenType": self.allergen_type,
            "allergenName": self.allergen_name,
            "allergenCode": self.allergen_code,
            "reaction": self.reaction,
            "severity": self.severity,
            "onsetDate": self.onset_date.isoformat() if self.onset_date else None,
            "isActive": self.is_active,
            "notes": self.notes,
            "recordedBy": self.recorded_by,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }

    __table_args__ = (
        Index("ix_hbys_alg_patient_active", "patient_id", "is_active"),
        Index("ix_hbys_alg_tenant_patient", "tenant_id", "patient_id"),
        Index("ix_hbys_alg_allergen_type", "allergen_type"),
    )
