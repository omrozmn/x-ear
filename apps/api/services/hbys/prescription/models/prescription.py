"""
Prescription Model
==================
Represents an e-Recete (electronic prescription) in the HBYS system.
Tenant-scoped, tracks MEDULA integration status.
"""
from sqlalchemy import Column, String, Text, DateTime, Index
from sqlalchemy.orm import relationship

from core.models.base import BaseModel, gen_id, JSONMixin
from core.models.mixins import TenantScopedMixin


class Prescription(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = "hbys_prescriptions"

    # Primary key
    id = Column(String(50), primary_key=True, default=lambda: gen_id("prx"))

    # Foreign keys (logical - no FK constraint to avoid cross-service coupling)
    encounter_id = Column(String(50), nullable=True, index=True)
    patient_id = Column(String(50), nullable=False, index=True)
    doctor_id = Column(String(50), nullable=False, index=True)

    # Prescription metadata
    prescription_type = Column(
        String(20),
        nullable=False,
        default="normal",
        comment="normal | red | green | orange | purple",
    )
    status = Column(
        String(20),
        nullable=False,
        default="draft",
        comment="draft | sent | approved | rejected | cancelled",
    )

    # MEDULA integration
    medula_prescription_id = Column(String(100), nullable=True, unique=True)
    medula_response = Column(Text, nullable=True, comment="JSON from MEDULA response")

    # Clinical info
    protocol_no = Column(String(50), nullable=True)
    diagnosis_codes = Column(Text, nullable=True, comment="JSON array of ICD-10 codes")
    notes = Column(Text, nullable=True)

    # Timestamps
    prescribed_at = Column(DateTime, nullable=True)

    # Relationships
    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ------------------------------------------------------------------ #
    # JSON helpers
    # ------------------------------------------------------------------ #
    @property
    def diagnosis_codes_list(self):
        return self.json_load(self.diagnosis_codes) or []

    @diagnosis_codes_list.setter
    def diagnosis_codes_list(self, value):
        self.diagnosis_codes = self.json_dump(value)

    @property
    def medula_response_dict(self):
        return self.json_load(self.medula_response)

    @medula_response_dict.setter
    def medula_response_dict(self, value):
        self.medula_response = self.json_dump(value)

    # ------------------------------------------------------------------ #
    # Serialisation
    # ------------------------------------------------------------------ #
    def to_dict(self):
        base = self.to_dict_base()
        d = {
            "id": self.id,
            "encounterId": self.encounter_id,
            "patientId": self.patient_id,
            "doctorId": self.doctor_id,
            "prescriptionType": self.prescription_type,
            "status": self.status,
            "medulaPrescriptionId": self.medula_prescription_id,
            "medulaResponse": self.medula_response_dict,
            "protocolNo": self.protocol_no,
            "diagnosisCodes": self.diagnosis_codes_list,
            "notes": self.notes,
            "prescribedAt": (
                self.prescribed_at.isoformat() if self.prescribed_at else None
            ),
            "items": [i.to_dict() for i in (self.items or [])],
        }
        d.update(base)
        return d

    __table_args__ = (
        Index("ix_hbys_prx_patient_status", "patient_id", "status"),
        Index("ix_hbys_prx_doctor", "doctor_id"),
        Index("ix_hbys_prx_encounter", "encounter_id"),
        Index("ix_hbys_prx_medula_id", "medula_prescription_id"),
    )
