"""
Imaging Service Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum

from pydantic import Field

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


# ─── Enums ────────────────────────────────────────────────────────────────────


class Modality(str, Enum):
    xray = "xray"
    ct = "ct"
    mri = "mri"
    ultrasound = "ultrasound"
    mammography = "mammography"
    pet_ct = "pet_ct"
    fluoroscopy = "fluoroscopy"
    angiography = "angiography"


class Laterality(str, Enum):
    left = "left"
    right = "right"
    bilateral = "bilateral"
    na = "na"


class OrderPriority(str, Enum):
    routine = "routine"
    urgent = "urgent"
    stat = "stat"


class OrderStatus(str, Enum):
    ordered = "ordered"
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    reported = "reported"
    cancelled = "cancelled"


class ReportStatus(str, Enum):
    draft = "draft"
    preliminary = "preliminary"
    final = "final"
    amended = "amended"
    cancelled = "cancelled"


# ─── Imaging Order Schemas ────────────────────────────────────────────────────


class ImagingOrderCreate(AppBaseModel):
    encounter_id: str = Field(..., alias="encounterId")
    patient_id: str = Field(..., alias="patientId")
    ordered_by: Optional[str] = Field(None, alias="orderedBy")
    modality: Modality
    body_part: str = Field(..., alias="bodyPart", max_length=200)
    laterality: Laterality = Laterality.na
    clinical_indication: Optional[str] = Field(None, alias="clinicalIndication")
    priority: OrderPriority = OrderPriority.routine


class ImagingOrderUpdate(AppBaseModel):
    modality: Optional[Modality] = None
    body_part: Optional[str] = Field(None, alias="bodyPart", max_length=200)
    laterality: Optional[Laterality] = None
    clinical_indication: Optional[str] = Field(None, alias="clinicalIndication")
    priority: Optional[OrderPriority] = None
    status: Optional[OrderStatus] = None


class ImagingOrderSchedule(AppBaseModel):
    scheduled_date: datetime = Field(..., alias="scheduledDate")


class ImagingOrderComplete(AppBaseModel):
    performed_by: str = Field(..., alias="performedBy")
    performed_date: Optional[datetime] = Field(None, alias="performedDate")
    orthanc_study_id: Optional[str] = Field(None, alias="orthancStudyId")
    dicom_study_uid: Optional[str] = Field(None, alias="dicomStudyUid")


class ImagingOrderRead(AppBaseModel, IDMixin, TimestampMixin):
    encounter_id: str = Field(..., alias="encounterId")
    patient_id: str = Field(..., alias="patientId")
    ordered_by: Optional[str] = Field(None, alias="orderedBy")
    modality: str
    body_part: str = Field(..., alias="bodyPart")
    laterality: str
    clinical_indication: Optional[str] = Field(None, alias="clinicalIndication")
    priority: str
    status: str
    scheduled_date: Optional[datetime] = Field(None, alias="scheduledDate")
    performed_date: Optional[datetime] = Field(None, alias="performedDate")
    performed_by: Optional[str] = Field(None, alias="performedBy")
    accession_number: Optional[str] = Field(None, alias="accessionNumber")
    orthanc_study_id: Optional[str] = Field(None, alias="orthancStudyId")
    dicom_study_uid: Optional[str] = Field(None, alias="dicomStudyUid")
    tenant_id: Optional[str] = Field(None, alias="tenantId")


# ─── Radiology Report Schemas ────────────────────────────────────────────────


class RadiologyReportCreate(AppBaseModel):
    imaging_order_id: str = Field(..., alias="imagingOrderId")
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    reported_by: Optional[str] = Field(None, alias="reportedBy")
    is_critical: bool = Field(False, alias="isCritical")


class RadiologyReportUpdate(AppBaseModel):
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[ReportStatus] = None
    is_critical: Optional[bool] = Field(None, alias="isCritical")


class RadiologyReportRead(AppBaseModel, IDMixin, TimestampMixin):
    imaging_order_id: str = Field(..., alias="imagingOrderId")
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    reported_by: Optional[str] = Field(None, alias="reportedBy")
    reported_at: Optional[datetime] = Field(None, alias="reportedAt")
    verified_by: Optional[str] = Field(None, alias="verifiedBy")
    verified_at: Optional[datetime] = Field(None, alias="verifiedAt")
    status: str
    is_critical: bool = Field(False, alias="isCritical")
    critical_notified_at: Optional[datetime] = Field(None, alias="criticalNotifiedAt")
    tenant_id: Optional[str] = Field(None, alias="tenantId")


# ─── Report Template Schemas ─────────────────────────────────────────────────


class ReportTemplateCreate(AppBaseModel):
    name_tr: str = Field(..., alias="nameTr")
    modality: Optional[str] = None
    body_part: Optional[str] = Field(None, alias="bodyPart")
    template_content: str = Field(..., alias="templateContent")
    is_active: bool = Field(True, alias="isActive")


class ReportTemplateUpdate(AppBaseModel):
    name_tr: Optional[str] = Field(None, alias="nameTr")
    modality: Optional[str] = None
    body_part: Optional[str] = Field(None, alias="bodyPart")
    template_content: Optional[str] = Field(None, alias="templateContent")
    is_active: Optional[bool] = Field(None, alias="isActive")


class ReportTemplateRead(AppBaseModel, IDMixin, TimestampMixin):
    name_tr: str = Field(..., alias="nameTr")
    modality: Optional[str] = None
    body_part: Optional[str] = Field(None, alias="bodyPart")
    template_content: str = Field(..., alias="templateContent")
    is_active: bool = Field(True, alias="isActive")


# ─── Viewer URL Response ─────────────────────────────────────────────────────


class ViewerUrlResponse(AppBaseModel):
    viewer_url: str = Field(..., alias="viewerUrl")
    orthanc_study_id: Optional[str] = Field(None, alias="orthancStudyId")
    dicom_study_uid: Optional[str] = Field(None, alias="dicomStudyUid")
