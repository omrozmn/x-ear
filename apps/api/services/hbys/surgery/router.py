"""
Surgery Router - API endpoints for surgical procedures, teams, checklists, and anesthesia.
"""
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta

from .schemas import (
    SurgeryCreate,
    SurgeryUpdate,
    SurgeryRead,
    SurgeryListResponse,
    SurgeryTeamCreate,
    SurgeryTeamUpdate,
    SurgeryTeamRead,
    ChecklistSignInUpdate,
    ChecklistTimeOutUpdate,
    ChecklistSignOutUpdate,
    ChecklistRead,
    SignInRead,
    TimeOutRead,
    SignOutRead,
    AnesthesiaRecordCreate,
    AnesthesiaRecordUpdate,
    AnesthesiaRecordRead,
    ORScheduleEntry,
    ORScheduleResponse,
    SurgeryStatusEnum,
)
from .service import SurgeryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hbys/surgeries", tags=["HBYS - Surgery"])


# ── OR Schedule (must be before /{surgery_id} to avoid path conflict) ─────────


@router.get("/schedule/or", response_model=ResponseEnvelope[ORScheduleResponse])
def get_or_schedule(
    operating_room: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    status: Optional[SurgeryStatusEnum] = Query(None),
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """Get operating room schedule with optional filters."""
    from .models.surgery_team import SurgeryTeam, TeamRole

    surgeries = SurgeryService.get_or_schedule(
        db,
        access.tenant_id,
        operating_room=operating_room,
        date_from=date_from,
        date_to=date_to,
        status=status.value if status else None,
    )

    entries = []
    for s in surgeries:
        primary_surgeon = (
            db.query(SurgeryTeam)
            .filter(
                SurgeryTeam.surgery_id == s.id,
                SurgeryTeam.tenant_id == access.tenant_id,
                SurgeryTeam.role == TeamRole.primary_surgeon,
            )
            .first()
        )
        surgeon_name = None
        if primary_surgeon:
            try:
                from core.models.user import User

                user = db.query(User).filter(User.id == primary_surgeon.user_id).first()
                if user:
                    surgeon_name = getattr(user, "full_name", None) or getattr(
                        user, "name", None
                    )
            except Exception:
                pass

        entries.append(
            ORScheduleEntry(
                surgery_id=s.id,
                patient_id=s.patient_id,
                procedure_name=s.procedure_name,
                operating_room=s.operating_room,
                scheduled_date=s.scheduled_date,
                estimated_duration_minutes=s.estimated_duration_minutes,
                surgery_type=s.surgery_type.value if s.surgery_type else "elective",
                status=s.status.value if s.status else "planned",
                surgeon_name=surgeon_name,
            )
        )

    return ResponseEnvelope.create_success(
        data=ORScheduleResponse(entries=entries, total=len(entries)),
    )


# ── Surgery CRUD ──────────────────────────────────────────────────────────────


@router.post("", response_model=ResponseEnvelope[SurgeryRead])
def create_surgery(
    data: SurgeryCreate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.create")),
    db: Session = Depends(get_db),
):
    """Create a new surgical procedure record."""
    surgery = SurgeryService.create_surgery(db, data, access.tenant_id)
    return ResponseEnvelope.create_success(
        data=SurgeryRead.model_validate(surgery),
        message="Surgery created successfully.",
    )


@router.get("", response_model=ResponseEnvelope[SurgeryListResponse])
def list_surgeries(
    patient_id: Optional[str] = Query(None),
    encounter_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """List surgeries with optional filters."""
    items, total = SurgeryService.list_surgeries(
        db, access.tenant_id, patient_id, encounter_id, status, skip, limit
    )
    return ResponseEnvelope.create_success(
        data=SurgeryListResponse(
            items=[SurgeryRead.model_validate(s) for s in items],
            total=total,
        ),
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.get("/{surgery_id}", response_model=ResponseEnvelope[SurgeryRead])
def get_surgery(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """Get a surgery by ID."""
    surgery = SurgeryService.get_surgery(db, surgery_id, access.tenant_id)
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryRead.model_validate(surgery),
    )


@router.patch("/{surgery_id}", response_model=ResponseEnvelope[SurgeryRead])
def update_surgery(
    surgery_id: str,
    data: SurgeryUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Update a surgery record."""
    surgery = SurgeryService.update_surgery(db, surgery_id, data, access.tenant_id)
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryRead.model_validate(surgery),
        message="Surgery updated successfully.",
    )


@router.delete("/{surgery_id}", response_model=ResponseEnvelope)
def delete_surgery(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.delete")),
    db: Session = Depends(get_db),
):
    """Delete a surgery record."""
    deleted = SurgeryService.delete_surgery(db, surgery_id, access.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(message="Surgery deleted successfully.")


# ── Start / Complete Surgery ──────────────────────────────────────────────────


@router.post("/{surgery_id}/start", response_model=ResponseEnvelope[SurgeryRead])
def start_surgery(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Start a surgery (transition to in_progress, sets actual_start)."""
    try:
        surgery = SurgeryService.start_surgery(db, surgery_id, access.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryRead.model_validate(surgery),
        message="Surgery started.",
    )


class CompleteSurgeryPayload(SurgeryUpdate):
    """Subset of fields relevant when completing a surgery."""
    pass


@router.post("/{surgery_id}/complete", response_model=ResponseEnvelope[SurgeryRead])
def complete_surgery(
    surgery_id: str,
    data: Optional[CompleteSurgeryPayload] = None,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Complete a surgery (transition to completed, sets actual_end)."""
    try:
        surgery = SurgeryService.complete_surgery(
            db,
            surgery_id,
            access.tenant_id,
            post_op_diagnosis=data.post_op_diagnosis if data else None,
            complications=data.complications if data else None,
            blood_loss_ml=data.blood_loss_ml if data else None,
            specimens_sent=data.specimens_sent if data else None,
            surgical_notes=data.surgical_notes if data else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not surgery:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryRead.model_validate(surgery),
        message="Surgery completed.",
    )


# ── Surgery Team ──────────────────────────────────────────────────────────────


@router.post(
    "/{surgery_id}/team", response_model=ResponseEnvelope[SurgeryTeamRead]
)
def add_team_member(
    surgery_id: str,
    data: SurgeryTeamCreate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Add a team member to a surgery."""
    member = SurgeryService.add_team_member(db, surgery_id, data, access.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryTeamRead.model_validate(member),
        message="Team member added.",
    )


@router.get(
    "/{surgery_id}/team",
    response_model=ResponseEnvelope[list[SurgeryTeamRead]],
)
def list_team_members(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """List all team members for a surgery."""
    members = SurgeryService.list_team_members(db, surgery_id, access.tenant_id)
    return ResponseEnvelope.create_success(
        data=[SurgeryTeamRead.model_validate(m) for m in members],
    )


@router.patch(
    "/{surgery_id}/team/{member_id}",
    response_model=ResponseEnvelope[SurgeryTeamRead],
)
def update_team_member(
    surgery_id: str,
    member_id: str,
    data: SurgeryTeamUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Update a team member's role or notes."""
    member = SurgeryService.update_team_member(db, member_id, data, access.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return ResponseEnvelope.create_success(
        data=SurgeryTeamRead.model_validate(member),
        message="Team member updated.",
    )


@router.delete(
    "/{surgery_id}/team/{member_id}", response_model=ResponseEnvelope
)
def remove_team_member(
    surgery_id: str,
    member_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Remove a team member from a surgery."""
    removed = SurgeryService.remove_team_member(db, member_id, access.tenant_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return ResponseEnvelope.create_success(message="Team member removed.")


# ── WHO Surgical Safety Checklist ─────────────────────────────────────────────


@router.get(
    "/{surgery_id}/checklist",
    response_model=ResponseEnvelope[ChecklistRead],
)
def get_checklist(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """Get the WHO surgical safety checklist for a surgery (auto-creates if missing)."""
    checklist = SurgeryService.get_or_create_checklist(db, surgery_id, access.tenant_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=_checklist_to_read(checklist),
    )


@router.post(
    "/{surgery_id}/checklist/sign-in",
    response_model=ResponseEnvelope[ChecklistRead],
)
def complete_sign_in(
    surgery_id: str,
    data: ChecklistSignInUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Complete the Sign In phase of the WHO checklist (before anesthesia induction)."""
    checklist = SurgeryService.complete_sign_in(
        db, surgery_id, data, access.user_id, access.tenant_id
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=_checklist_to_read(checklist),
        message="Sign In phase completed.",
    )


@router.post(
    "/{surgery_id}/checklist/time-out",
    response_model=ResponseEnvelope[ChecklistRead],
)
def complete_time_out(
    surgery_id: str,
    data: ChecklistTimeOutUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Complete the Time Out phase of the WHO checklist (before skin incision)."""
    checklist = SurgeryService.complete_time_out(
        db, surgery_id, data, access.user_id, access.tenant_id
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=_checklist_to_read(checklist),
        message="Time Out phase completed.",
    )


@router.post(
    "/{surgery_id}/checklist/sign-out",
    response_model=ResponseEnvelope[ChecklistRead],
)
def complete_sign_out(
    surgery_id: str,
    data: ChecklistSignOutUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Complete the Sign Out phase of the WHO checklist (before patient leaves OR)."""
    checklist = SurgeryService.complete_sign_out(
        db, surgery_id, data, access.user_id, access.tenant_id
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=_checklist_to_read(checklist),
        message="Sign Out phase completed.",
    )


# ── Anesthesia Record ────────────────────────────────────────────────────────


@router.post(
    "/{surgery_id}/anesthesia",
    response_model=ResponseEnvelope[AnesthesiaRecordRead],
)
def create_anesthesia_record(
    surgery_id: str,
    data: AnesthesiaRecordCreate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Create an anesthesia record for a surgery."""
    record = SurgeryService.create_anesthesia_record(
        db, surgery_id, data, access.tenant_id
    )
    if not record:
        raise HTTPException(status_code=404, detail="Surgery not found.")
    return ResponseEnvelope.create_success(
        data=AnesthesiaRecordRead.model_validate(record),
        message="Anesthesia record created.",
    )


@router.get(
    "/{surgery_id}/anesthesia",
    response_model=ResponseEnvelope[AnesthesiaRecordRead],
)
def get_anesthesia_record(
    surgery_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.view")),
    db: Session = Depends(get_db),
):
    """Get the anesthesia record for a surgery."""
    record = SurgeryService.get_anesthesia_record(db, surgery_id, access.tenant_id)
    if not record:
        raise HTTPException(status_code=404, detail="Anesthesia record not found.")
    return ResponseEnvelope.create_success(
        data=AnesthesiaRecordRead.model_validate(record),
    )


@router.patch(
    "/{surgery_id}/anesthesia/{record_id}",
    response_model=ResponseEnvelope[AnesthesiaRecordRead],
)
def update_anesthesia_record(
    surgery_id: str,
    record_id: str,
    data: AnesthesiaRecordUpdate,
    access: UnifiedAccess = Depends(require_access("hbys.surgery.update")),
    db: Session = Depends(get_db),
):
    """Update an anesthesia record."""
    record = SurgeryService.update_anesthesia_record(
        db, record_id, data, access.tenant_id
    )
    if not record:
        raise HTTPException(status_code=404, detail="Anesthesia record not found.")
    return ResponseEnvelope.create_success(
        data=AnesthesiaRecordRead.model_validate(record),
        message="Anesthesia record updated.",
    )


# ── Helpers ───────────────────────────────────────────────────────────────────


def _checklist_to_read(cl: "SurgicalChecklist") -> ChecklistRead:
    """Convert a SurgicalChecklist model to ChecklistRead schema."""
    return ChecklistRead(
        id=cl.id,
        surgery_id=cl.surgery_id,
        sign_in=SignInRead(
            patient_identity_confirmed=cl.sign_in_patient_identity_confirmed,
            site_marked=cl.sign_in_site_marked,
            anesthesia_check_complete=cl.sign_in_anesthesia_check_complete,
            pulse_oximeter_on=cl.sign_in_pulse_oximeter_on,
            allergies_checked=cl.sign_in_allergies_checked,
            airway_risk_assessed=cl.sign_in_airway_risk_assessed,
            completed_by=cl.sign_in_completed_by,
            completed_at=cl.sign_in_completed_at,
        ),
        time_out=TimeOutRead(
            team_introduction=cl.time_out_team_introduction,
            patient_procedure_site_confirmed=cl.time_out_patient_procedure_site_confirmed,
            antibiotic_prophylaxis_given=cl.time_out_antibiotic_prophylaxis_given,
            critical_events_reviewed=cl.time_out_critical_events_reviewed,
            imaging_displayed=cl.time_out_imaging_displayed,
            completed_by=cl.time_out_completed_by,
            completed_at=cl.time_out_completed_at,
        ),
        sign_out=SignOutRead(
            procedure_recorded=cl.sign_out_procedure_recorded,
            instrument_count_correct=cl.sign_out_instrument_count_correct,
            specimens_labeled=cl.sign_out_specimens_labeled,
            concerns_addressed=cl.sign_out_concerns_addressed,
            completed_by=cl.sign_out_completed_by,
            completed_at=cl.sign_out_completed_at,
        ),
        notes=cl.notes,
        tenant_id=cl.tenant_id,
        created_at=cl.created_at,
        updated_at=cl.updated_at,
    )
