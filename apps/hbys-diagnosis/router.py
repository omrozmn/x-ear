"""
Diagnosis Router - FastAPI endpoints for diagnosis management and ICD search.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from hbys_common.auth import get_current_user, require_permission, CurrentUser
from hbys_common.schemas import ResponseEnvelope

import service
from schemas import (
    DiagnosisCreate,
    DiagnosisUpdate,
    DiagnosisRead,
    DiagnosisListResponse,
    ICDCodeRead,
    ICDSearchResult,
    PatientDiagnosisHistory,
)

router = APIRouter(prefix="/api/hbys/diagnoses", tags=["HBYS - Diagnoses"])


def get_db(request: Request):
    """Yield a DB session from the app's session factory."""
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


# ─── ICD Code Search ─────────────────────────────────────────────────────────


@router.get(
    "/icd/search",
    response_model=ResponseEnvelope[ICDSearchResult],
    summary="Search ICD codes",
    description="Turkish character-safe search across ICD-10 code catalog.",
)
def search_icd_codes(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    version: str = Query("10", max_length=5),
    chapter: Optional[str] = Query(None, max_length=10),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.search_icd_codes(db, query=q, version=version, chapter=chapter, limit=limit)
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/icd/{code}",
    response_model=ResponseEnvelope[ICDCodeRead],
    summary="Get ICD code details",
)
def get_icd_code(
    code: str,
    version: str = Query("10", max_length=5),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    icd = service.get_icd_code(db, code=code, version=version)
    if not icd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ICD code '{code}' not found.",
        )
    return ResponseEnvelope.ok(data=ICDCodeRead.model_validate(icd))


# ─── Diagnosis CRUD per Encounter ────────────────────────────────────────────


@router.post(
    "/encounters/{encounter_id}",
    response_model=ResponseEnvelope[DiagnosisRead],
    status_code=status.HTTP_201_CREATED,
    summary="Add diagnosis to encounter",
)
def add_diagnosis(
    encounter_id: str,
    data: DiagnosisCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:create")),
):
    diagnosis = service.create_diagnosis(
        db, encounter_id=encounter_id, data=data, tenant_id=user.tenant_id
    )
    return ResponseEnvelope.ok(data=DiagnosisRead.model_validate(diagnosis))


@router.get(
    "/encounters/{encounter_id}",
    response_model=ResponseEnvelope[DiagnosisListResponse],
    summary="List diagnoses for encounter",
)
def list_encounter_diagnoses(
    encounter_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:read")),
):
    result = service.list_diagnoses_by_encounter(
        db, encounter_id=encounter_id, tenant_id=user.tenant_id, skip=skip, limit=limit
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/{diagnosis_id}",
    response_model=ResponseEnvelope[DiagnosisRead],
    summary="Get diagnosis by ID",
)
def get_diagnosis(
    diagnosis_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:read")),
):
    diagnosis = service.get_diagnosis(db, diagnosis_id=diagnosis_id, tenant_id=user.tenant_id)
    if not diagnosis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis '{diagnosis_id}' not found.",
        )
    return ResponseEnvelope.ok(data=DiagnosisRead.model_validate(diagnosis))


@router.put(
    "/{diagnosis_id}",
    response_model=ResponseEnvelope[DiagnosisRead],
    summary="Update diagnosis",
)
def update_diagnosis(
    diagnosis_id: str,
    data: DiagnosisUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:update")),
):
    diagnosis = service.update_diagnosis(
        db, diagnosis_id=diagnosis_id, data=data, tenant_id=user.tenant_id
    )
    if not diagnosis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis '{diagnosis_id}' not found.",
        )
    return ResponseEnvelope.ok(data=DiagnosisRead.model_validate(diagnosis))


@router.delete(
    "/{diagnosis_id}",
    response_model=ResponseEnvelope,
    summary="Delete diagnosis",
)
def delete_diagnosis(
    diagnosis_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:delete")),
):
    deleted = service.delete_diagnosis(db, diagnosis_id=diagnosis_id, tenant_id=user.tenant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis '{diagnosis_id}' not found.",
        )
    return ResponseEnvelope.ok(data={"message": "Diagnosis deleted successfully."})


# ─── Patient Diagnosis History ────────────────────────────────────────────────


@router.get(
    "/patients/{patient_id}/history",
    response_model=ResponseEnvelope[PatientDiagnosisHistory],
    summary="Get patient diagnosis history",
    description="Returns full diagnosis history for a patient across all encounters.",
)
def get_patient_history(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission("hbys:diagnosis:read")),
):
    result = service.get_patient_diagnosis_history(
        db, patient_id=patient_id, tenant_id=user.tenant_id, skip=skip, limit=limit
    )
    return ResponseEnvelope.ok(data=result)
