# Noah Import Models — SQLAlchemy (Multi-Tenant)
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, DateTime, Boolean,
    ForeignKey, Index, Enum as SAEnum, JSON
)
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin


class ImportSessionStatus(str, enum.Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    FAILED = "failed"
    EXPIRED = "expired"


class AgentDeviceStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"


class DuplicateStatus(str, enum.Enum):
    PENDING = "pending"
    MERGED = "merged"
    DISMISSED = "dismissed"


class ImportSession(BaseModel, TenantScopedMixin):
    """Tracks a single Noah import session initiated from CRM."""
    __tablename__ = "noah_import_sessions"

    id = Column(String(50), primary_key=True)
    branch_id = Column(String(50), ForeignKey("branches.id"), nullable=True)
    requesting_user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    device_id = Column(String(50), ForeignKey("noah_agent_devices.id"), nullable=True)

    status = Column(
        SAEnum(ImportSessionStatus),
        default=ImportSessionStatus.PENDING,
        nullable=False,
    )
    allowed_formats = Column(JSON, default=list)

    # Progress tracking
    progress_stage = Column(String(50), nullable=True)
    progress_percent = Column(Integer, default=0)

    # Result summary (populated after processing)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    duplicates_found = Column(Integer, default=0)
    errors = Column(JSON, default=list)

    # File metadata (set by agent upload)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_sha256 = Column(String(64), nullable=True)
    file_exported_at = Column(DateTime, nullable=True)

    # Parser info
    parser_name = Column(String(50), nullable=True)
    parser_version = Column(String(20), nullable=True)

    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("nis")

    __table_args__ = (
        Index("ix_noah_session_tenant", "tenant_id"),
        Index("ix_noah_session_status", "status"),
        Index("ix_noah_session_device", "device_id"),
    )

    def to_dict(self):
        base = self.to_dict_base()
        base.update(
            {
                "id": self.id,
                "tenantId": self.tenant_id,
                "branchId": self.branch_id,
                "requestingUserId": self.requesting_user_id,
                "deviceId": self.device_id,
                "status": self.status.value if self.status else None,
                "allowedFormats": self.allowed_formats or [],
                "progress": {
                    "stage": self.progress_stage,
                    "percent": self.progress_percent or 0,
                },
                "summary": {
                    "created": self.records_created or 0,
                    "updated": self.records_updated or 0,
                    "skipped": self.records_skipped or 0,
                    "duplicates": self.duplicates_found or 0,
                    "errors": self.errors or [],
                },
                "fileMeta": {
                    "name": self.file_name,
                    "size": self.file_size,
                    "sha256": self.file_sha256,
                    "exportedAt": self._format_datetime_utc(self.file_exported_at),
                } if self.file_name else None,
                "parser": {
                    "name": self.parser_name,
                    "version": self.parser_version,
                } if self.parser_name else None,
                "expiresAt": self._format_datetime_utc(self.expires_at),
                "completedAt": self._format_datetime_utc(self.completed_at),
            }
        )
        return base


class ImportAuditLog(BaseModel, TenantScopedMixin):
    """Immutable audit trail for every import action."""
    __tablename__ = "noah_import_audit_logs"

    id = Column(String(50), primary_key=True)
    session_id = Column(
        String(50), ForeignKey("noah_import_sessions.id"), nullable=False
    )
    device_id = Column(String(50), nullable=True)
    user_id = Column(String(50), nullable=True)

    action = Column(String(50), nullable=False)  # e.g. session_created, upload_started, parse_completed
    detail = Column(JSON, default=dict)
    file_sha256 = Column(String(64), nullable=True)
    parser_version = Column(String(20), nullable=True)

    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    outcome = Column(String(20), nullable=True)  # success / failure / partial

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("nal")

    __table_args__ = (
        Index("ix_noah_audit_session", "session_id"),
        Index("ix_noah_audit_tenant", "tenant_id"),
    )

    def to_dict(self):
        base = self.to_dict_base()
        base.update(
            {
                "id": self.id,
                "tenantId": self.tenant_id,
                "sessionId": self.session_id,
                "deviceId": self.device_id,
                "userId": self.user_id,
                "action": self.action,
                "detail": self.detail or {},
                "fileSha256": self.file_sha256,
                "parserVersion": self.parser_version,
                "recordsCreated": self.records_created,
                "recordsUpdated": self.records_updated,
                "outcome": self.outcome,
            }
        )
        return base


class AgentDevice(BaseModel, TenantScopedMixin):
    """Registered Windows Agent device."""
    __tablename__ = "noah_agent_devices"

    id = Column(String(50), primary_key=True)
    branch_id = Column(String(50), ForeignKey("branches.id"), nullable=True)

    device_name = Column(String(255), nullable=True)
    device_fingerprint = Column(String(255), nullable=False, unique=True)
    agent_version = Column(String(20), nullable=True)

    status = Column(
        SAEnum(AgentDeviceStatus),
        default=AgentDeviceStatus.ACTIVE,
        nullable=False,
    )

    # Token management
    device_token_hash = Column(String(128), nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    enrollment_token_hash = Column(String(128), nullable=True)

    # Export folder config (guidance for CRM display)
    export_folder = Column(String(500), default=r"C:\XEAR\noah_exports")

    last_seen_at = Column(DateTime, nullable=True)
    last_heartbeat_ip = Column(String(45), nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("nad")

    __table_args__ = (
        Index("ix_noah_device_tenant", "tenant_id"),
        Index("ix_noah_device_status", "status"),
    )

    def to_dict(self):
        base = self.to_dict_base()
        base.update(
            {
                "id": self.id,
                "tenantId": self.tenant_id,
                "branchId": self.branch_id,
                "deviceName": self.device_name,
                "deviceFingerprint": self.device_fingerprint,
                "agentVersion": self.agent_version,
                "status": self.status.value if self.status else None,
                "exportFolder": self.export_folder,
                "lastSeenAt": self._format_datetime_utc(self.last_seen_at),
            }
        )
        return base


class PossibleDuplicate(BaseModel, TenantScopedMixin):
    """Ambiguous patient matches requiring manual merge."""
    __tablename__ = "noah_possible_duplicates"

    id = Column(String(50), primary_key=True)
    session_id = Column(
        String(50), ForeignKey("noah_import_sessions.id"), nullable=False
    )

    # The imported record data (snapshot)
    imported_data = Column(JSON, nullable=False)

    # Candidate existing party
    existing_party_id = Column(String(50), ForeignKey("parties.id"), nullable=True)

    match_score = Column(Integer, default=0)  # 0-100 confidence
    match_reason = Column(String(255), nullable=True)

    status = Column(
        SAEnum(DuplicateStatus),
        default=DuplicateStatus.PENDING,
        nullable=False,
    )
    resolved_by = Column(String(50), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("npd")

    __table_args__ = (
        Index("ix_noah_dup_session", "session_id"),
        Index("ix_noah_dup_status", "status"),
        Index("ix_noah_dup_tenant", "tenant_id"),
    )

    def to_dict(self):
        base = self.to_dict_base()
        base.update(
            {
                "id": self.id,
                "tenantId": self.tenant_id,
                "sessionId": self.session_id,
                "importedData": self.imported_data,
                "existingPartyId": self.existing_party_id,
                "matchScore": self.match_score,
                "matchReason": self.match_reason,
                "status": self.status.value if self.status else None,
                "resolvedBy": self.resolved_by,
                "resolvedAt": self._format_datetime_utc(self.resolved_at),
            }
        )
        return base
