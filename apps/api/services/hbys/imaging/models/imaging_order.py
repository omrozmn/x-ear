"""
Imaging Order Model
Represents a radiology/imaging order for a patient encounter.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class ImagingOrder(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "imaging_orders"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("img"))
    encounter_id = Column(
        String(36),
        ForeignKey("clinical_encounters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        String(36),
        ForeignKey("parties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ordered_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Imaging details
    modality = Column(
        String(20),
        nullable=False,
    )  # xray / ct / mri / ultrasound / mammography / pet_ct / fluoroscopy / angiography
    body_part = Column(String(200), nullable=False)
    laterality = Column(
        String(20), nullable=False, default="na"
    )  # left / right / bilateral / na
    clinical_indication = Column(Text, nullable=True)

    # Workflow
    priority = Column(
        String(20), nullable=False, default="routine"
    )  # routine / urgent / stat
    status = Column(
        String(20), nullable=False, default="ordered"
    )  # ordered / scheduled / in_progress / completed / reported / cancelled

    # Scheduling & execution
    scheduled_date = Column(DateTime, nullable=True)
    performed_date = Column(DateTime, nullable=True)
    performed_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # DICOM / Orthanc integration
    accession_number = Column(String(64), unique=True, nullable=True)
    orthanc_study_id = Column(String(255), nullable=True)
    dicom_study_uid = Column(String(255), nullable=True)

    # Relationships
    reports = relationship(
        "RadiologyReport",
        back_populates="imaging_order",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def to_dict(self):
        result = self.to_dict_base()
        result.update(
            {
                "id": self.id,
                "encounterId": self.encounter_id,
                "patientId": self.patient_id,
                "orderedBy": self.ordered_by,
                "modality": self.modality,
                "bodyPart": self.body_part,
                "laterality": self.laterality,
                "clinicalIndication": self.clinical_indication,
                "priority": self.priority,
                "status": self.status,
                "scheduledDate": self._format_datetime_utc(self.scheduled_date),
                "performedDate": self._format_datetime_utc(self.performed_date),
                "performedBy": self.performed_by,
                "accessionNumber": self.accession_number,
                "orthancStudyId": self.orthanc_study_id,
                "dicomStudyUid": self.dicom_study_uid,
                "tenantId": self.tenant_id,
            }
        )
        return result
