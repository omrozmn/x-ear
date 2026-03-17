"""
Imaging Order Model
Represents a radiology/imaging order for a patient encounter.
"""
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc


class ImagingOrder(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "imaging_orders"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("img"))
    encounter_id = Column(String(36), nullable=False, index=True)
    patient_id = Column(String(36), nullable=False, index=True)
    ordered_by = Column(String(36), nullable=True, index=True)

    # Imaging details
    modality = Column(
        String(20), nullable=False,
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
    performed_by = Column(String(36), nullable=True)

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
