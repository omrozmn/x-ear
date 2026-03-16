"""
FastAPI Noah Import Router
Handles:
  - Import sessions (create, status, list)
  - Agent device enrollment & heartbeat
  - Payload upload from agent
  - Duplicate management
  - Audit log retrieval
  - Enrollment token generation
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List
from datetime import datetime
import logging

from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta
from schemas.noah_imports import (
    ImportSessionCreate,
    ImportSessionRead,
    ImportUploadRequest,
    AgentEnrollRequest,
    AgentEnrollResponse,
    AgentHeartbeatRequest,
    AgentDeviceRead,
    AgentSyncRequest,
    AgentSyncResponse,
    ImportSessionSummary,
    PossibleDuplicateRead,
    DuplicateMergeRequest,
    ImportAuditLogRead,
    EnrollmentTokenCreate,
    EnrollmentTokenResponse,
)
from services.noah_import_service import NoahImportService

logger = logging.getLogger(__name__)

from middleware.require_module import require_module
from fastapi import Depends as _Depends

router = APIRouter(prefix="/noah-import", tags=["Noah Import"], dependencies=[_Depends(require_module("noah"))])


# ────────────────────────────────────────────────────────────
# Import Sessions
# ────────────────────────────────────────────────────────────
@router.post(
    "/sessions",
    response_model=ResponseEnvelope[ImportSessionRead],
    operation_id="createNoahImportSession",
)
def create_session(
    body: ImportSessionCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Create a new Noah import session (one-click trigger from CRM)."""
    session = NoahImportService.create_session(
        db=db,
        tenant_id=access.tenant_id,
        user_id=access.user_id,
        branch_id=body.branch_id,
        allowed_formats=body.allowed_formats,
    )
    return ResponseEnvelope.create_success(
        data=session.to_dict(),
        message="İçe aktarım oturumu oluşturuldu",
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ResponseEnvelope[ImportSessionRead],
    operation_id="getNoahImportSession",
)
def get_session(
    session_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get import session status (polling by CRM)."""
    session = NoahImportService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if access.tenant_id and session.tenant_id != access.tenant_id:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    return ResponseEnvelope.create_success(data=session.to_dict())


@router.get(
    "/sessions",
    response_model=ResponseEnvelope[List[ImportSessionRead]],
    operation_id="listNoahImportSessions",
)
def list_sessions(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """List import sessions for the tenant."""
    offset = (page - 1) * per_page
    items, total = NoahImportService.list_sessions(
        db, access.tenant_id, status=status, limit=per_page, offset=offset
    )
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope.create_success(
        data=[s.to_dict() for s in items],
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )


# ────────────────────────────────────────────────────────────
# Agent Upload
# ────────────────────────────────────────────────────────────
@router.post(
    "/sessions/{session_id}/upload",
    response_model=ResponseEnvelope[ImportSessionRead],
    operation_id="uploadNoahImportPayload",
)
def upload_payload(
    session_id: str,
    body: ImportUploadRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Agent uploads parsed payload for a given session.
    Auth: device token via X-Device-Token header.
    """
    device_token = request.headers.get("X-Device-Token")
    if not device_token:
        raise HTTPException(status_code=401, detail="Device token required")

    device = NoahImportService.authenticate_device(db, device_token)
    if not device:
        raise HTTPException(status_code=401, detail="Invalid or expired device token")

    session = NoahImportService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")

    try:
        result = NoahImportService.process_upload(
            db=db,
            tenant_id=device.tenant_id,
            session_id=session_id,
            device_id=device.id,
            file_meta=body.file_meta,
            parser=body.parser,
            payload=body.normalized_payload,
        )
        return ResponseEnvelope.create_success(
            data=result.to_dict(),
            message="İçe aktarım tamamlandı",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ────────────────────────────────────────────────────────────
# Agent Device Management
# ────────────────────────────────────────────────────────────
@router.post(
    "/agents/enrollment-token",
    response_model=ResponseEnvelope[EnrollmentTokenResponse],
    operation_id="generateNoahEnrollmentToken",
)
def generate_enrollment_token(
    body: EnrollmentTokenCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Generate a one-time enrollment token (admin/settings page)."""
    token, expires = NoahImportService.generate_enrollment_token(
        db, access.tenant_id, branch_id=body.branch_id
    )
    return ResponseEnvelope.create_success(
        data=EnrollmentTokenResponse(
            token=token,
            expires_at=expires,
            branch_id=body.branch_id,
        ).model_dump(by_alias=True),
        message="Kayıt tokeni oluşturuldu",
    )


@router.post(
    "/agents/enroll",
    response_model=ResponseEnvelope[AgentEnrollResponse],
    operation_id="enrollNoahAgent",
)
def enroll_agent(
    body: AgentEnrollRequest,
    db: Session = Depends(get_db),
):
    """Agent enrollment — validates token, activates device, returns device token."""
    try:
        device, device_token = NoahImportService.enroll_device(
            db,
            enrollment_token=body.enrollment_token,
            device_fingerprint=body.device_fingerprint,
            device_name=body.device_name,
        )
        return ResponseEnvelope.create_success(
            data=AgentEnrollResponse(
                device_id=device.id,
                device_token=device_token,
                export_folder=device.export_folder,
            ).model_dump(by_alias=True),
            message="Cihaz başarıyla kaydedildi",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        db.rollback()
        raise


@router.post(
    "/agents/heartbeat",
    response_model=ResponseEnvelope[AgentDeviceRead],
    operation_id="noahAgentHeartbeat",
)
def agent_heartbeat(
    body: AgentHeartbeatRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Agent sends periodic heartbeat."""
    device_token = request.headers.get("X-Device-Token")
    if not device_token:
        raise HTTPException(status_code=401, detail="Device token required")

    device = NoahImportService.authenticate_device(db, device_token)
    if not device:
        raise HTTPException(status_code=401, detail="Invalid or expired device token")

    try:
        ip = request.client.host if request.client else None
        updated = NoahImportService.heartbeat(
            db,
            device_id=body.device_id,
            agent_version=body.agent_version,
            ip_address=ip,
        )
        return ResponseEnvelope.create_success(data=updated.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/agents/sync",
    response_model=ResponseEnvelope[AgentSyncResponse],
    operation_id="noahAgentSync",
)
def agent_sync(
    body: AgentSyncRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Agent-initiated auto-sync. Creates a session internally, processes
    the payload, and returns the result — all in one call.
    No CRM interaction required.
    """
    device_token = request.headers.get("X-Device-Token")
    if not device_token:
        raise HTTPException(status_code=401, detail="Device token required")

    device = NoahImportService.authenticate_device(db, device_token)
    if not device:
        raise HTTPException(status_code=401, detail="Invalid or expired device token")

    try:
        session = NoahImportService.sync_from_agent(
            db=db,
            device=device,
            file_meta=body.file_meta,
            parser=body.parser,
            payload=body.normalized_payload,
        )
        return ResponseEnvelope.create_success(
            data=AgentSyncResponse(
                session_id=session.id,
                status=session.status.value if hasattr(session.status, 'value') else session.status,
                summary=ImportSessionSummary(
                    created=session.records_created or 0,
                    updated=session.records_updated or 0,
                    skipped=session.records_skipped or 0,
                    duplicates=session.duplicates_found or 0,
                ),
                synced_at=session.completed_at or datetime.utcnow(),
            ).model_dump(by_alias=True),
            message="Otomatik senkronizasyon tamamlandı",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Agent sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Senkronizasyon sırasında hata oluştu")


@router.get(
    "/health",
    response_model=ResponseEnvelope,
    operation_id="noahImportHealth",
)
def health_check():
    """Health check endpoint for agent connectivity verification."""
    return ResponseEnvelope.create_success(
        data={"status": "ok", "service": "noah-import"},
        message="Servis aktif",
    )


@router.get(
    "/agents",
    response_model=ResponseEnvelope[List[AgentDeviceRead]],
    operation_id="listNoahAgents",
)
def list_agents(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """List active agent devices for tenant (settings page)."""
    devices = NoahImportService.get_agent_status(db, access.tenant_id)
    return ResponseEnvelope.create_success(
        data=[d.to_dict() for d in devices]
    )


# ────────────────────────────────────────────────────────────
# Duplicates
# ────────────────────────────────────────────────────────────
@router.get(
    "/duplicates",
    response_model=ResponseEnvelope[List[PossibleDuplicateRead]],
    operation_id="listNoahDuplicates",
)
def list_duplicates(
    status: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None, alias="sessionId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """List possible duplicate records for merge center."""
    offset = (page - 1) * per_page
    items, total = NoahImportService.list_duplicates(
        db,
        access.tenant_id,
        status=status,
        session_id=session_id,
        limit=per_page,
        offset=offset,
    )
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope.create_success(
        data=[d.to_dict() for d in items],
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )


@router.post(
    "/duplicates/{duplicate_id}/resolve",
    response_model=ResponseEnvelope[PossibleDuplicateRead],
    operation_id="resolveNoahDuplicate",
)
def resolve_duplicate(
    duplicate_id: str,
    body: DuplicateMergeRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Merge or dismiss a possible duplicate."""
    try:
        dup = NoahImportService.resolve_duplicate(
            db,
            tenant_id=access.tenant_id,
            duplicate_id=duplicate_id,
            action=body.action,
            user_id=access.user_id,
            target_party_id=body.target_party_id,
        )
        return ResponseEnvelope.create_success(
            data=dup.to_dict(),
            message="Çift kayıt çözümlendi",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ────────────────────────────────────────────────────────────
# Audit Logs
# ────────────────────────────────────────────────────────────
@router.get(
    "/audit-logs",
    response_model=ResponseEnvelope[List[ImportAuditLogRead]],
    operation_id="listNoahAuditLogs",
)
def list_audit_logs(
    session_id: Optional[str] = Query(None, alias="sessionId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """List audit logs for Noah imports."""
    offset = (page - 1) * per_page
    items, total = NoahImportService.get_audit_logs(
        db,
        access.tenant_id,
        session_id=session_id,
        limit=per_page,
        offset=offset,
    )
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope.create_success(
        data=[l.to_dict() for l in items],
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )
