"""
Clinical Service - Business Logic Layer
Handles CRUD and business rules for encounters, vital signs, and clinical notes.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.encounter import Encounter
from models.vital_signs import VitalSigns
from models.clinical_note import ClinicalNote
from schemas import (
    EncounterCreate, EncounterUpdate,
    VitalSignsCreate, VitalSignsUpdate,
    ClinicalNoteCreate, ClinicalNoteUpdate,
)
from hbys_common.database import gen_id, now_utc

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Encounter Operations
# ---------------------------------------------------------------------------

def list_encounters(
    db: Session,
    tenant_id: str,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    encounter_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[Encounter], int]:
    """List encounters with optional filters and pagination."""
    query = db.query(Encounter).filter(Encounter.tenant_id == tenant_id)

    if patient_id:
        query = query.filter(Encounter.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Encounter.doctor_id == doctor_id)
    if encounter_type:
        query = query.filter(Encounter.encounter_type == encounter_type)
    if status:
        query = query.filter(Encounter.status == status)

    total = query.count()
    encounters = (
        query
        .order_by(desc(Encounter.encounter_date))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return encounters, total


def get_encounter(db: Session, tenant_id: str, encounter_id: str) -> Optional[Encounter]:
    """Get a single encounter by ID, scoped to tenant."""
    return (
        db.query(Encounter)
        .filter(Encounter.id == encounter_id, Encounter.tenant_id == tenant_id)
        .first()
    )


def create_encounter(db: Session, tenant_id: str, data: EncounterCreate) -> Encounter:
    """Create a new clinical encounter."""
    encounter = Encounter(
        id=gen_id("enc"),
        tenant_id=tenant_id,
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        encounter_type=data.encounter_type,
        status=data.status,
        subjective=data.subjective,
        objective=data.objective,
        assessment=data.assessment,
        plan=data.plan,
        chief_complaint=data.chief_complaint,
        clinical_notes=data.clinical_notes,
        encounter_date=data.encounter_date or now_utc(),
        discharge_date=data.discharge_date,
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    logger.info("Created encounter %s for patient %s", encounter.id, encounter.patient_id)
    return encounter


def update_encounter(db: Session, tenant_id: str, encounter_id: str, data: EncounterUpdate) -> Optional[Encounter]:
    """Update an existing encounter. Only non-None fields are updated."""
    encounter = get_encounter(db, tenant_id, encounter_id)
    if not encounter:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(encounter, field, value)

    db.commit()
    db.refresh(encounter)
    logger.info("Updated encounter %s", encounter.id)
    return encounter


def delete_encounter(db: Session, tenant_id: str, encounter_id: str) -> bool:
    """Delete an encounter and all related records (cascade)."""
    encounter = get_encounter(db, tenant_id, encounter_id)
    if not encounter:
        return False

    db.delete(encounter)
    db.commit()
    logger.info("Deleted encounter %s", encounter_id)
    return True


def complete_encounter(db: Session, tenant_id: str, encounter_id: str) -> Optional[Encounter]:
    """Mark an encounter as completed and set the discharge date."""
    encounter = get_encounter(db, tenant_id, encounter_id)
    if not encounter:
        return None

    encounter.status = "completed"
    encounter.discharge_date = now_utc()
    db.commit()
    db.refresh(encounter)
    logger.info("Completed encounter %s", encounter.id)
    return encounter


# ---------------------------------------------------------------------------
# Vital Signs Operations
# ---------------------------------------------------------------------------

def list_vital_signs(
    db: Session,
    tenant_id: str,
    encounter_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[VitalSigns], int]:
    """List vital signs with optional filters and pagination."""
    query = db.query(VitalSigns).filter(VitalSigns.tenant_id == tenant_id)

    if encounter_id:
        query = query.filter(VitalSigns.encounter_id == encounter_id)
    if patient_id:
        query = query.filter(VitalSigns.patient_id == patient_id)

    total = query.count()
    records = (
        query
        .order_by(desc(VitalSigns.recorded_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return records, total


def get_vital_signs(db: Session, tenant_id: str, vital_id: str) -> Optional[VitalSigns]:
    """Get a single vital signs record by ID."""
    return (
        db.query(VitalSigns)
        .filter(VitalSigns.id == vital_id, VitalSigns.tenant_id == tenant_id)
        .first()
    )


def create_vital_signs(db: Session, tenant_id: str, data: VitalSignsCreate) -> VitalSigns:
    """Create a new vital signs record."""
    # Auto-calculate BMI if not provided
    bmi = data.bmi
    if bmi is None and data.height and data.weight and data.height > 0:
        height_m = data.height / 100.0
        bmi = round(data.weight / (height_m ** 2), 2)

    record = VitalSigns(
        id=gen_id("vit"),
        tenant_id=tenant_id,
        encounter_id=data.encounter_id,
        patient_id=data.patient_id,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        heart_rate=data.heart_rate,
        respiratory_rate=data.respiratory_rate,
        temperature=data.temperature,
        oxygen_saturation=data.oxygen_saturation,
        height=data.height,
        weight=data.weight,
        bmi=bmi,
        pain_score=data.pain_score,
        recorded_at=data.recorded_at or now_utc(),
        recorded_by=data.recorded_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Created vital signs %s for encounter %s", record.id, record.encounter_id)
    return record


def update_vital_signs(db: Session, tenant_id: str, vital_id: str, data: VitalSignsUpdate) -> Optional[VitalSigns]:
    """Update an existing vital signs record."""
    record = get_vital_signs(db, tenant_id, vital_id)
    if not record:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    # Recalculate BMI if height or weight changed
    if ("height" in update_data or "weight" in update_data) and "bmi" not in update_data:
        h = record.height
        w = record.weight
        if h and w and h > 0:
            record.bmi = round(w / ((h / 100.0) ** 2), 2)

    db.commit()
    db.refresh(record)
    logger.info("Updated vital signs %s", record.id)
    return record


def delete_vital_signs(db: Session, tenant_id: str, vital_id: str) -> bool:
    """Delete a vital signs record."""
    record = get_vital_signs(db, tenant_id, vital_id)
    if not record:
        return False

    db.delete(record)
    db.commit()
    logger.info("Deleted vital signs %s", vital_id)
    return True


# ---------------------------------------------------------------------------
# Clinical Note Operations
# ---------------------------------------------------------------------------

def list_clinical_notes(
    db: Session,
    tenant_id: str,
    encounter_id: Optional[str] = None,
    note_type: Optional[str] = None,
    author_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[ClinicalNote], int]:
    """List clinical notes with optional filters and pagination."""
    query = db.query(ClinicalNote).filter(ClinicalNote.tenant_id == tenant_id)

    if encounter_id:
        query = query.filter(ClinicalNote.encounter_id == encounter_id)
    if note_type:
        query = query.filter(ClinicalNote.note_type == note_type)
    if author_id:
        query = query.filter(ClinicalNote.author_id == author_id)

    total = query.count()
    notes = (
        query
        .order_by(desc(ClinicalNote.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return notes, total


def get_clinical_note(db: Session, tenant_id: str, note_id: str) -> Optional[ClinicalNote]:
    """Get a single clinical note by ID."""
    return (
        db.query(ClinicalNote)
        .filter(ClinicalNote.id == note_id, ClinicalNote.tenant_id == tenant_id)
        .first()
    )


def create_clinical_note(db: Session, tenant_id: str, data: ClinicalNoteCreate) -> ClinicalNote:
    """Create a new clinical note."""
    note = ClinicalNote(
        id=gen_id("cln"),
        tenant_id=tenant_id,
        encounter_id=data.encounter_id,
        note_type=data.note_type,
        content=data.content,
        author_id=data.author_id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    logger.info("Created clinical note %s for encounter %s", note.id, note.encounter_id)
    return note


def update_clinical_note(db: Session, tenant_id: str, note_id: str, data: ClinicalNoteUpdate) -> Optional[ClinicalNote]:
    """Update an existing clinical note."""
    note = get_clinical_note(db, tenant_id, note_id)
    if not note:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    db.commit()
    db.refresh(note)
    logger.info("Updated clinical note %s", note.id)
    return note


def delete_clinical_note(db: Session, tenant_id: str, note_id: str) -> bool:
    """Delete a clinical note."""
    note = get_clinical_note(db, tenant_id, note_id)
    if not note:
        return False

    db.delete(note)
    db.commit()
    logger.info("Deleted clinical note %s", note_id)
    return True
