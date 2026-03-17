"""
Emergency Service Router (MS-7)
FastAPI endpoints for emergency department management.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope, ResponseMeta

from .schemas import (
    EmergencyVisitCreate,
    EmergencyVisitUpdate,
    EmergencyVisitRead,
    EmergencyVisitListResponse,
    TriageAssessmentCreate,
    TriageAssessmentRead,
    AssignDoctorRequest,
    AssignBedRequest,
    DischargeRequest,
    AdmitRequest,
    TransferRequest,
    ForensicReportRequest,
    DashboardStats,
)
from .service import EmergencyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hbys/emergency", tags=["HBYS - Emergency"])


def _get_tenant_id(db: Session) -> str:
    """Extract tenant_id from the database session context."""
    from database import get_current_tenant_id

    tenant_id = get_current_tenant_id()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context not found")
    return tenant_id


# ─── Visit Registration ─────────────────────────────────────────────────────


@router.post(
    "/visits",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    status_code=201,
    summary="Register a new emergency visit",
)
def register_visit(
    body: EmergencyVisitCreate,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    try:
        visit = EmergencyService.create_visit(db, body, tenant_id)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Emergency visit registered",
        )
    except Exception as e:
        db.rollback()
        logger.exception("Failed to register emergency visit")
        raise HTTPException(status_code=500, detail=str(e))


# ─── List Active Visits ─────────────────────────────────────────────────────


@router.get(
    "/visits",
    response_model=ResponseEnvelope[EmergencyVisitListResponse],
    summary="List active emergency visits",
)
def list_active_visits(
    status: Optional[str] = Query(None, description="Filter by status"),
    triage_color: Optional[str] = Query(None, alias="triageColor", description="Filter by triage colour"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    items, total = EmergencyService.list_active_visits(
        db, tenant_id, status_filter=status, triage_color=triage_color,
        limit=limit, offset=offset,
    )
    visit_reads = [EmergencyVisitRead.model_validate(v) for v in items]
    return ResponseEnvelope.create_success(
        data=EmergencyVisitListResponse(items=visit_reads, total=total),
        meta=ResponseMeta(total=total, page=(offset // limit) + 1, per_page=limit),
    )


# ─── Get Single Visit ───────────────────────────────────────────────────────


@router.get(
    "/visits/{visit_id}",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Get emergency visit details",
)
def get_visit(visit_id: str, db: Session = Depends(get_db)):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    return ResponseEnvelope.create_success(
        data=EmergencyVisitRead.model_validate(visit),
    )


# ─── Update Visit ───────────────────────────────────────────────────────────


@router.patch(
    "/visits/{visit_id}",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Update emergency visit",
)
def update_visit(
    visit_id: str,
    body: EmergencyVisitUpdate,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    try:
        visit = EmergencyService.update_visit(db, visit, body)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Emergency visit updated",
        )
    except Exception as e:
        db.rollback()
        logger.exception("Failed to update emergency visit %s", visit_id)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Triage ──────────────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/triage",
    response_model=ResponseEnvelope[TriageAssessmentRead],
    status_code=201,
    summary="Perform triage assessment",
)
def perform_triage(
    visit_id: str,
    body: TriageAssessmentCreate,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    try:
        visit, assessment = EmergencyService.perform_triage(db, visit, body, tenant_id)
        db.commit()
        db.refresh(assessment)
        return ResponseEnvelope.create_success(
            data=TriageAssessmentRead.model_validate(assessment),
            message=f"Triage completed: Level {visit.triage_level} ({visit.triage_color})",
        )
    except Exception as e:
        db.rollback()
        logger.exception("Triage failed for visit %s", visit_id)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Assign Doctor ───────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/assign-doctor",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Assign attending doctor",
)
def assign_doctor(
    visit_id: str,
    body: AssignDoctorRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    try:
        visit = EmergencyService.assign_doctor(db, visit, body.attending_doctor_id)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Doctor assigned",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Assign Bed ──────────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/assign-bed",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Assign bed to patient",
)
def assign_bed(
    visit_id: str,
    body: AssignBedRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    try:
        visit = EmergencyService.assign_bed(db, visit, body.bed_number, tenant_id)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message=f"Bed {body.bed_number} assigned",
        )
    except ValueError as ve:
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Discharge ───────────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/discharge",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Discharge patient from emergency",
)
def discharge_visit(
    visit_id: str,
    body: DischargeRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    if visit.status in ("discharged", "transferred", "deceased"):
        raise HTTPException(status_code=400, detail=f"Visit already finalized: {visit.status}")
    try:
        visit = EmergencyService.discharge_visit(
            db, visit, body.disposition, body.discharge_notes
        )
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Patient discharged",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Admit ───────────────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/admit",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Admit patient to inpatient from emergency",
)
def admit_visit(
    visit_id: str,
    body: AdmitRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    if visit.status in ("admitted", "discharged", "transferred", "deceased"):
        raise HTTPException(status_code=400, detail=f"Visit already finalized: {visit.status}")
    try:
        visit = EmergencyService.admit_visit(db, visit, body.disposition, body.notes)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Patient admitted to inpatient",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Transfer ────────────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/transfer",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="Transfer patient to another facility",
)
def transfer_visit(
    visit_id: str,
    body: TransferRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    if visit.status in ("discharged", "transferred", "deceased"):
        raise HTTPException(status_code=400, detail=f"Visit already finalized: {visit.status}")
    try:
        visit = EmergencyService.transfer_visit(
            db, visit, body.destination, body.transfer_reason
        )
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message=f"Patient transferred to {body.destination}",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Forensic Report ────────────────────────────────────────────────────────


@router.post(
    "/visits/{visit_id}/forensic-report",
    response_model=ResponseEnvelope[EmergencyVisitRead],
    summary="File forensic report for an emergency visit",
)
def file_forensic_report(
    visit_id: str,
    body: ForensicReportRequest,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    visit = EmergencyService.get_visit(db, visit_id, tenant_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Emergency visit not found")
    try:
        visit = EmergencyService.file_forensic_report(db, visit, body.report_notes)
        db.commit()
        db.refresh(visit)
        return ResponseEnvelope.create_success(
            data=EmergencyVisitRead.model_validate(visit),
            message="Forensic report filed",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Dashboard ───────────────────────────────────────────────────────────────


@router.get(
    "/dashboard",
    response_model=ResponseEnvelope[DashboardStats],
    summary="Get emergency department dashboard statistics",
)
def get_dashboard(db: Session = Depends(get_db)):
    tenant_id = _get_tenant_id(db)
    stats = EmergencyService.get_dashboard_stats(db, tenant_id)
    return ResponseEnvelope.create_success(data=stats)
