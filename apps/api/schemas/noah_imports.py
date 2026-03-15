# Noah Import Schemas — Pydantic v2
from typing import Optional, List, Any
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


# ────────────────────────────────────────────────────────────
# Normalized data schemas (parser output)
# ────────────────────────────────────────────────────────────
class NoahExternalIds(AppBaseModel):
    noah_patient_id: Optional[str] = Field(None, alias="noahPatientId")
    national_id: Optional[str] = Field(None, alias="nationalId")


class NoahPatient(AppBaseModel):
    external_ids: Optional[NoahExternalIds] = Field(None, alias="externalIds")
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    # Extended fields from HIMSA PatientExport XSD
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = Field(None, alias="zipCode")
    insurance: Optional[str] = None
    physician: Optional[str] = None
    work_telephone: Optional[str] = Field(None, alias="workTelephone")
    patient_no: Optional[str] = Field(None, alias="patientNo")


class NoahAudiogram(AppBaseModel):
    patient_ref: Optional[str] = Field(None, alias="patientRef")
    date: Optional[str] = None
    ear: Optional[str] = None  # left / right / binaural
    conduction_type: Optional[str] = Field(None, alias="conductionType")  # air / bone
    thresholds: Optional[dict] = None  # e.g. {"250":20,"500":25,...}
    masking: bool = False
    transducer: Optional[str] = None  # e.g. InsertEarphones, Headphones, BoneOscillator
    audiogram_type: Optional[str] = Field(None, alias="audiogramType")  # threshold / ucl / mcl
    point_statuses: Optional[dict] = Field(None, alias="pointStatuses")  # freq -> status
    notes: Optional[str] = None


class NoahFitting(AppBaseModel):
    patient_ref: Optional[str] = Field(None, alias="patientRef")
    date: Optional[str] = None
    device_brand: Optional[str] = Field(None, alias="deviceBrand")
    device_model: Optional[str] = Field(None, alias="deviceModel")
    device_serial: Optional[str] = Field(None, alias="deviceSerial")
    ear: Optional[str] = None  # left / right
    notes: Optional[str] = None
    device_category: Optional[str] = Field(None, alias="deviceCategory")
    battery_type: Optional[str] = Field(None, alias="batteryType")
    ear_mold: Optional[str] = Field(None, alias="earMold")
    fitting_type: Optional[str] = Field(None, alias="fittingType")


class NormalizedPayload(AppBaseModel):
    patients: List[NoahPatient] = []
    audiograms: List[NoahAudiogram] = []
    fittings: List[NoahFitting] = []


# ────────────────────────────────────────────────────────────
# File metadata
# ────────────────────────────────────────────────────────────
class FileMeta(AppBaseModel):
    name: str
    size: int
    sha256: str
    exported_at: Optional[datetime] = Field(None, alias="exportedAt")


class ParserInfo(AppBaseModel):
    name: str
    version: str


# ────────────────────────────────────────────────────────────
# Import Session
# ────────────────────────────────────────────────────────────
class ImportSessionCreate(AppBaseModel):
    branch_id: Optional[str] = Field(None, alias="branchId")
    allowed_formats: Optional[List[str]] = Field(None, alias="allowedFormats")


class ImportSessionProgress(AppBaseModel):
    stage: Optional[str] = None
    percent: int = 0


class ImportSessionSummary(AppBaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0
    duplicates: int = 0
    errors: List[Any] = []


class ImportSessionRead(AppBaseModel, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    requesting_user_id: str = Field(..., alias="requestingUserId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    status: str
    allowed_formats: List[str] = Field(default_factory=list, alias="allowedFormats")
    progress: ImportSessionProgress = Field(default_factory=ImportSessionProgress)
    summary: ImportSessionSummary = Field(default_factory=ImportSessionSummary)
    file_meta: Optional[FileMeta] = Field(None, alias="fileMeta")
    parser: Optional[ParserInfo] = None
    expires_at: datetime = Field(..., alias="expiresAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")


# ────────────────────────────────────────────────────────────
# Agent Device
# ────────────────────────────────────────────────────────────
class AgentEnrollRequest(AppBaseModel):
    enrollment_token: str = Field(..., alias="enrollmentToken")
    device_fingerprint: str = Field(..., alias="deviceFingerprint")
    device_name: Optional[str] = Field(None, alias="deviceName")


class AgentEnrollResponse(AppBaseModel):
    device_id: str = Field(..., alias="deviceId")
    device_token: str = Field(..., alias="deviceToken")
    export_folder: str = Field(..., alias="exportFolder")


class AgentHeartbeatRequest(AppBaseModel):
    device_id: str = Field(..., alias="deviceId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    agent_version: Optional[str] = Field(None, alias="agentVersion")


class AgentDeviceRead(AppBaseModel, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    device_name: Optional[str] = Field(None, alias="deviceName")
    agent_version: Optional[str] = Field(None, alias="agentVersion")
    status: str
    export_folder: str = Field(..., alias="exportFolder")
    last_seen_at: Optional[datetime] = Field(None, alias="lastSeenAt")


# ────────────────────────────────────────────────────────────
# Upload (Agent → Backend)
# ────────────────────────────────────────────────────────────
class ImportUploadRequest(AppBaseModel):
    file_meta: FileMeta = Field(..., alias="fileMeta")
    parser: ParserInfo
    normalized_payload: NormalizedPayload = Field(..., alias="normalizedPayload")


# ────────────────────────────────────────────────────────────
# Possible Duplicate
# ────────────────────────────────────────────────────────────
class PossibleDuplicateRead(AppBaseModel, IDMixin, TimestampMixin):
    session_id: str = Field(..., alias="sessionId")
    imported_data: dict = Field(..., alias="importedData")
    existing_party_id: Optional[str] = Field(None, alias="existingPartyId")
    match_score: int = Field(0, alias="matchScore")
    match_reason: Optional[str] = Field(None, alias="matchReason")
    status: str
    resolved_by: Optional[str] = Field(None, alias="resolvedBy")
    resolved_at: Optional[datetime] = Field(None, alias="resolvedAt")


class DuplicateMergeRequest(AppBaseModel):
    action: str  # "merge" | "dismiss"
    target_party_id: Optional[str] = Field(None, alias="targetPartyId")


# ────────────────────────────────────────────────────────────
# Enrollment Token Management
# ────────────────────────────────────────────────────────────
class EnrollmentTokenCreate(AppBaseModel):
    branch_id: Optional[str] = Field(None, alias="branchId")


class EnrollmentTokenResponse(AppBaseModel):
    token: str
    expires_at: datetime = Field(..., alias="expiresAt")
    branch_id: Optional[str] = Field(None, alias="branchId")


# ────────────────────────────────────────────────────────────
# Agent Auto-Sync (agent-initiated, no CRM session required)
# ────────────────────────────────────────────────────────────
class AgentSyncRequest(AppBaseModel):
    file_meta: FileMeta = Field(..., alias="fileMeta")
    parser: ParserInfo
    normalized_payload: NormalizedPayload = Field(..., alias="normalizedPayload")


class AgentSyncResponse(AppBaseModel):
    session_id: str = Field(..., alias="sessionId")
    status: str
    summary: ImportSessionSummary = Field(default_factory=ImportSessionSummary)
    synced_at: datetime = Field(..., alias="syncedAt")


# ────────────────────────────────────────────────────────────
# Audit Log
# ────────────────────────────────────────────────────────────
class ImportAuditLogRead(AppBaseModel, IDMixin, TimestampMixin):
    session_id: str = Field(..., alias="sessionId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    user_id: Optional[str] = Field(None, alias="userId")
    action: str
    detail: dict = {}
    file_sha256: Optional[str] = Field(None, alias="fileSha256")
    parser_version: Optional[str] = Field(None, alias="parserVersion")
    records_created: int = Field(0, alias="recordsCreated")
    records_updated: int = Field(0, alias="recordsUpdated")
    outcome: Optional[str] = None
