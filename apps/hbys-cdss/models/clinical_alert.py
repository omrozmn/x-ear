"""
Clinical Alert Model
Represents CDSS-generated clinical alerts (drug interactions, allergy warnings, etc.).
Tenant-scoped: each tenant has its own alerts.
"""
from sqlalchemy import Column, String, Text, DateTime, Index

from hbys_common.database import BaseModel, TenantScopedMixin, gen_id, now_utc


class ClinicalAlert(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_clinical_alerts"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("cla"))

    # Context
    patient_id = Column(String(50), nullable=False, index=True)
    encounter_id = Column(String(50), nullable=True, index=True)

    # Alert classification
    alert_type = Column(
        String(30),
        nullable=False,
        comment="drug_interaction | drug_allergy | dose_warning | critical_lab "
                "| duplicate_order | contraindication | age_warning | pregnancy_warning",
    )
    severity = Column(
        String(10),
        nullable=False,
        default="warning",
        comment="info | warning | critical",
    )

    # Content
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True, comment="JSON payload with structured details")

    # Source tracking
    source_type = Column(String(50), nullable=True, comment="prescription | lab_order | encounter")
    source_id = Column(String(50), nullable=True)

    # Lifecycle
    status = Column(
        String(20),
        nullable=False,
        default="active",
        comment="active | acknowledged | overridden | resolved",
    )
    acknowledged_by = Column(String(50), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    override_reason = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "patientId": self.patient_id,
            "encounterId": self.encounter_id,
            "alertType": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "details": self.json_load_field(self.details),
            "sourceType": self.source_type,
            "sourceId": self.source_id,
            "status": self.status,
            "acknowledgedBy": self.acknowledged_by,
            "acknowledgedAt": (
                self.acknowledged_at.isoformat() if self.acknowledged_at else None
            ),
            "overrideReason": self.override_reason,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }

    @staticmethod
    def json_load_field(value):
        """Safely parse a JSON text field."""
        if value is None:
            return None
        import json
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    __table_args__ = (
        Index("ix_hbys_cla_patient_status", "patient_id", "status"),
        Index("ix_hbys_cla_tenant_patient", "tenant_id", "patient_id"),
        Index("ix_hbys_cla_type_severity", "alert_type", "severity"),
        Index("ix_hbys_cla_source", "source_type", "source_id"),
    )
