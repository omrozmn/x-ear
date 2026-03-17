"""
Diagnosis Model - Patient diagnosis records linked to encounters.
"""
import enum
from sqlalchemy import Column, String, Text, Boolean, Date, Enum, Index

from hbys_common.database import BaseModel, TenantScopedMixin, gen_id


class DiagnosisType(str, enum.Enum):
    primary = "primary"
    secondary = "secondary"
    differential = "differential"


class Severity(str, enum.Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"
    critical = "critical"


class Diagnosis(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_diagnoses"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("dgn"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)
    icd_code = Column(String(20), nullable=False, index=True)
    icd_version = Column(String(5), nullable=False, default="10")
    diagnosis_name_tr = Column(String(500), nullable=False)
    diagnosis_name_en = Column(String(500), nullable=True)
    diagnosis_type = Column(
        Enum(DiagnosisType, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DiagnosisType.primary,
    )
    severity = Column(
        Enum(Severity, values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    onset_date = Column(Date, nullable=True)
    resolved_date = Column(Date, nullable=True)
    is_chronic = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    diagnosed_by = Column(String(36), nullable=True, index=True)

    __table_args__ = (
        Index("ix_hbys_diag_tenant_patient", "tenant_id", "patient_id"),
        Index("ix_hbys_diag_tenant_encounter", "tenant_id", "encounter_id"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "encounterId": self.encounter_id,
            "patientId": self.patient_id,
            "icdCode": self.icd_code,
            "icdVersion": self.icd_version,
            "diagnosisNameTr": self.diagnosis_name_tr,
            "diagnosisNameEn": self.diagnosis_name_en,
            "diagnosisType": self.diagnosis_type.value
            if self.diagnosis_type
            else None,
            "severity": self.severity.value if self.severity else None,
            "onsetDate": self.onset_date.isoformat() if self.onset_date else None,
            "resolvedDate": self.resolved_date.isoformat()
            if self.resolved_date
            else None,
            "isChronic": self.is_chronic,
            "notes": self.notes,
            "diagnosedBy": self.diagnosed_by,
            "tenantId": self.tenant_id,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
