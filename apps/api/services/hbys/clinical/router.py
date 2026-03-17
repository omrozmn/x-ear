"""
Clinical Service Router
FastAPI endpoints for encounters, vital signs, and clinical notes.
"""
import logging
import math
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError

from .schemas import (
    EncounterCreate, EncounterUpdate, EncounterRead,
    VitalSignsCreate, VitalSignsUpdate, VitalSignsRead,
    ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNoteRead,
)
from . import service as clinical_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clinical", tags=["Clinical"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _build_meta(total: int, page: int, per_page: int) -> ResponseMeta:
    total_pages = math.ceil(total / per_page) if per_page else 1
    return ResponseMeta(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
    )


def _not_found(resource: str = "Resource") -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=ApiError(message=f"{resource} not found", code="NOT_FOUND").model_dump(mode="json"),
    )


# ===========================================================================
# ENCOUNTER ENDPOINTS
# ===========================================================================

@router.get("/encounters", operation_id="listEncounters", response_model=ResponseEnvelope[List[EncounterRead]])
def list_encounters(
    patient_id: Optional[str] = Query(None, alias="patientId"),
    doctor_id: Optional[str] = Query(None, alias="doctorId"),
    encounter_type: Optional[str] = Query(None, alias="encounterType"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List clinical encounters with filtering and pagination."""
    encounters, total = clinical_service.list_encounters(
        db=db_session,
        tenant_id=access.tenant_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        encounter_type=encounter_type,
        status=status,
        page=page,
        per_page=per_page,
    )
    items = [EncounterRead.model_validate(e) for e in encounters]
    return ResponseEnvelope.create_success(data=items, meta=_build_meta(total, page, per_page))


@router.get("/encounters/{encounter_id}", operation_id="getEncounter", response_model=ResponseEnvelope[EncounterRead])
def get_encounter(
    encounter_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single encounter by ID."""
    encounter = clinical_service.get_encounter(db_session, access.tenant_id, encounter_id)
    if not encounter:
        raise _not_found("Encounter")
    return ResponseEnvelope.create_success(data=EncounterRead.model_validate(encounter))


@router.post("/encounters", operation_id="createEncounter", response_model=ResponseEnvelope[EncounterRead], status_code=201)
def create_encounter(
    body: EncounterCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Create a new clinical encounter."""
    encounter = clinical_service.create_encounter(db_session, access.tenant_id, body)
    return ResponseEnvelope.create_success(data=EncounterRead.model_validate(encounter), message="Encounter created")


@router.put("/encounters/{encounter_id}", operation_id="updateEncounter", response_model=ResponseEnvelope[EncounterRead])
def update_encounter(
    encounter_id: str,
    body: EncounterUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update an existing encounter."""
    encounter = clinical_service.update_encounter(db_session, access.tenant_id, encounter_id, body)
    if not encounter:
        raise _not_found("Encounter")
    return ResponseEnvelope.create_success(data=EncounterRead.model_validate(encounter), message="Encounter updated")


@router.delete("/encounters/{encounter_id}", operation_id="deleteEncounter", response_model=ResponseEnvelope)
def delete_encounter(
    encounter_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete an encounter and all related records."""
    deleted = clinical_service.delete_encounter(db_session, access.tenant_id, encounter_id)
    if not deleted:
        raise _not_found("Encounter")
    return ResponseEnvelope.create_success(message="Encounter deleted")


@router.post("/encounters/{encounter_id}/complete", operation_id="completeEncounter", response_model=ResponseEnvelope[EncounterRead])
def complete_encounter(
    encounter_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Mark an encounter as completed and record the discharge date."""
    encounter = clinical_service.complete_encounter(db_session, access.tenant_id, encounter_id)
    if not encounter:
        raise _not_found("Encounter")
    return ResponseEnvelope.create_success(data=EncounterRead.model_validate(encounter), message="Encounter completed")


# ===========================================================================
# VITAL SIGNS ENDPOINTS
# ===========================================================================

@router.get("/vital-signs", operation_id="listVitalSigns", response_model=ResponseEnvelope[List[VitalSignsRead]])
def list_vital_signs(
    encounter_id: Optional[str] = Query(None, alias="encounterId"),
    patient_id: Optional[str] = Query(None, alias="patientId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List vital signs records with optional encounter/patient filter."""
    records, total = clinical_service.list_vital_signs(
        db=db_session,
        tenant_id=access.tenant_id,
        encounter_id=encounter_id,
        patient_id=patient_id,
        page=page,
        per_page=per_page,
    )
    items = [VitalSignsRead.model_validate(r) for r in records]
    return ResponseEnvelope.create_success(data=items, meta=_build_meta(total, page, per_page))


@router.get("/vital-signs/{vital_id}", operation_id="getVitalSigns", response_model=ResponseEnvelope[VitalSignsRead])
def get_vital_signs(
    vital_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single vital signs record."""
    record = clinical_service.get_vital_signs(db_session, access.tenant_id, vital_id)
    if not record:
        raise _not_found("Vital signs record")
    return ResponseEnvelope.create_success(data=VitalSignsRead.model_validate(record))


@router.post("/vital-signs", operation_id="createVitalSigns", response_model=ResponseEnvelope[VitalSignsRead], status_code=201)
def create_vital_signs(
    body: VitalSignsCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Record new vital signs for a patient encounter."""
    # Verify the encounter exists and belongs to the tenant
    encounter = clinical_service.get_encounter(db_session, access.tenant_id, body.encounter_id)
    if not encounter:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Encounter not found or does not belong to this tenant", code="INVALID_ENCOUNTER").model_dump(mode="json"),
        )
    record = clinical_service.create_vital_signs(db_session, access.tenant_id, body)
    return ResponseEnvelope.create_success(data=VitalSignsRead.model_validate(record), message="Vital signs recorded")


@router.put("/vital-signs/{vital_id}", operation_id="updateVitalSigns", response_model=ResponseEnvelope[VitalSignsRead])
def update_vital_signs(
    vital_id: str,
    body: VitalSignsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update an existing vital signs record."""
    record = clinical_service.update_vital_signs(db_session, access.tenant_id, vital_id, body)
    if not record:
        raise _not_found("Vital signs record")
    return ResponseEnvelope.create_success(data=VitalSignsRead.model_validate(record), message="Vital signs updated")


@router.delete("/vital-signs/{vital_id}", operation_id="deleteVitalSigns", response_model=ResponseEnvelope)
def delete_vital_signs(
    vital_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete a vital signs record."""
    deleted = clinical_service.delete_vital_signs(db_session, access.tenant_id, vital_id)
    if not deleted:
        raise _not_found("Vital signs record")
    return ResponseEnvelope.create_success(message="Vital signs deleted")


# ===========================================================================
# CLINICAL NOTE ENDPOINTS
# ===========================================================================

@router.get("/notes", operation_id="listClinicalNotes", response_model=ResponseEnvelope[List[ClinicalNoteRead]])
def list_clinical_notes(
    encounter_id: Optional[str] = Query(None, alias="encounterId"),
    note_type: Optional[str] = Query(None, alias="noteType"),
    author_id: Optional[str] = Query(None, alias="authorId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List clinical notes with optional filters."""
    notes, total = clinical_service.list_clinical_notes(
        db=db_session,
        tenant_id=access.tenant_id,
        encounter_id=encounter_id,
        note_type=note_type,
        author_id=author_id,
        page=page,
        per_page=per_page,
    )
    items = [ClinicalNoteRead.model_validate(n) for n in notes]
    return ResponseEnvelope.create_success(data=items, meta=_build_meta(total, page, per_page))


@router.get("/notes/{note_id}", operation_id="getClinicalNote", response_model=ResponseEnvelope[ClinicalNoteRead])
def get_clinical_note(
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single clinical note."""
    note = clinical_service.get_clinical_note(db_session, access.tenant_id, note_id)
    if not note:
        raise _not_found("Clinical note")
    return ResponseEnvelope.create_success(data=ClinicalNoteRead.model_validate(note))


@router.post("/notes", operation_id="createClinicalNote", response_model=ResponseEnvelope[ClinicalNoteRead], status_code=201)
def create_clinical_note(
    body: ClinicalNoteCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Create a new clinical note for an encounter."""
    # Verify encounter belongs to tenant
    encounter = clinical_service.get_encounter(db_session, access.tenant_id, body.encounter_id)
    if not encounter:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Encounter not found or does not belong to this tenant", code="INVALID_ENCOUNTER").model_dump(mode="json"),
        )
    note = clinical_service.create_clinical_note(db_session, access.tenant_id, body)
    return ResponseEnvelope.create_success(data=ClinicalNoteRead.model_validate(note), message="Clinical note created")


@router.put("/notes/{note_id}", operation_id="updateClinicalNote", response_model=ResponseEnvelope[ClinicalNoteRead])
def update_clinical_note(
    note_id: str,
    body: ClinicalNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update an existing clinical note."""
    note = clinical_service.update_clinical_note(db_session, access.tenant_id, note_id, body)
    if not note:
        raise _not_found("Clinical note")
    return ResponseEnvelope.create_success(data=ClinicalNoteRead.model_validate(note), message="Clinical note updated")


@router.delete("/notes/{note_id}", operation_id="deleteClinicalNote", response_model=ResponseEnvelope)
def delete_clinical_note(
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete a clinical note."""
    deleted = clinical_service.delete_clinical_note(db_session, access.tenant_id, note_id)
    if not deleted:
        raise _not_found("Clinical note")
    return ResponseEnvelope.create_success(message="Clinical note deleted")
