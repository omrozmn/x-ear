"""
Diagnosis Service - Business logic for diagnosis management and ICD search.
"""
import logging
import unicodedata
from typing import Optional, List, Tuple

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from database import gen_id
from .models.diagnosis import Diagnosis
from .models.icd_code import ICDCode
from .schemas import (
    DiagnosisCreate,
    DiagnosisUpdate,
    DiagnosisRead,
    DiagnosisListResponse,
    ICDCodeRead,
    ICDSearchResult,
    PatientDiagnosisHistory,
)

logger = logging.getLogger(__name__)

# ─── Turkish character normalization map ──────────────────────────────────────
_TR_CHAR_MAP = str.maketrans(
    {
        "\u0131": "i",   # dotless i -> i
        "\u0130": "i",   # capital dotted I -> i
        "\u00e7": "c",   # c cedilla
        "\u00c7": "c",
        "\u011f": "g",   # g breve
        "\u011e": "g",
        "\u00f6": "o",   # o diaeresis
        "\u00d6": "o",
        "\u015f": "s",   # s cedilla
        "\u015e": "s",
        "\u00fc": "u",   # u diaeresis
        "\u00dc": "u",
    }
)


def _normalize_turkish(text: str) -> str:
    """Normalize Turkish characters to ASCII equivalents for search."""
    return text.lower().translate(_TR_CHAR_MAP)


# ─── ICD Code Service ────────────────────────────────────────────────────────


def search_icd_codes(
    db: Session,
    query: str,
    version: str = "10",
    chapter: Optional[str] = None,
    limit: int = 20,
) -> ICDSearchResult:
    """
    Search ICD codes by code or name.
    Supports Turkish character-safe search: searching 'ust' will match 'ust solunum'.
    Uses both LIKE-based search and post-filter normalization.
    """
    q_normalized = _normalize_turkish(query.strip())

    # Build base query
    base_q = db.query(ICDCode).filter(ICDCode.version == version)
    if chapter:
        base_q = base_q.filter(ICDCode.chapter == chapter)

    # Strategy 1: Direct LIKE on code and name fields
    like_pattern = f"%{query.strip()}%"
    direct_results = (
        base_q.filter(
            or_(
                ICDCode.code.ilike(like_pattern),
                ICDCode.name_tr.ilike(like_pattern),
                ICDCode.name_en.ilike(like_pattern),
            )
        )
        .limit(limit)
        .all()
    )

    direct_codes = {r.code for r in direct_results}

    # Strategy 2: If query contains Turkish characters or yields few results,
    # do a broader scan with normalized comparison
    extra_results: List[ICDCode] = []
    if len(direct_results) < limit:
        remaining = limit - len(direct_results)
        # Load candidates not already found via direct search
        candidates = base_q.all()
        for candidate in candidates:
            if candidate.code in direct_codes:
                continue
            name_norm = _normalize_turkish(candidate.name_tr or "")
            code_norm = candidate.code.lower()
            if q_normalized in name_norm or q_normalized in code_norm:
                extra_results.append(candidate)
                if len(extra_results) >= remaining:
                    break

    all_results = direct_results + extra_results
    total = len(all_results)

    return ICDSearchResult(
        results=[ICDCodeRead.model_validate(r) for r in all_results],
        total=total,
        query=query.strip(),
    )


def get_icd_code(db: Session, code: str, version: str = "10") -> Optional[ICDCode]:
    """Get a single ICD code by its code value."""
    return (
        db.query(ICDCode)
        .filter(ICDCode.code == code, ICDCode.version == version)
        .first()
    )


# ─── Diagnosis CRUD ──────────────────────────────────────────────────────────


def create_diagnosis(
    db: Session,
    encounter_id: str,
    data: DiagnosisCreate,
    tenant_id: str,
) -> Diagnosis:
    """Create a new diagnosis record for an encounter."""
    diagnosis = Diagnosis(
        id=gen_id("dgn"),
        encounter_id=encounter_id,
        patient_id=data.patient_id,
        icd_code=data.icd_code,
        icd_version=data.icd_version,
        diagnosis_name_tr=data.diagnosis_name_tr,
        diagnosis_name_en=data.diagnosis_name_en,
        diagnosis_type=data.diagnosis_type,
        severity=data.severity,
        onset_date=data.onset_date,
        resolved_date=data.resolved_date,
        is_chronic=data.is_chronic,
        notes=data.notes,
        diagnosed_by=data.diagnosed_by,
        tenant_id=tenant_id,
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    logger.info(
        "Diagnosis created: id=%s, encounter=%s, icd=%s",
        diagnosis.id,
        encounter_id,
        data.icd_code,
    )
    return diagnosis


def list_diagnoses_by_encounter(
    db: Session,
    encounter_id: str,
    tenant_id: str,
    skip: int = 0,
    limit: int = 50,
) -> DiagnosisListResponse:
    """List all diagnoses for a given encounter."""
    query = db.query(Diagnosis).filter(
        Diagnosis.encounter_id == encounter_id,
        Diagnosis.tenant_id == tenant_id,
    )
    total = query.count()
    items = query.order_by(Diagnosis.created_at.desc()).offset(skip).limit(limit).all()
    return DiagnosisListResponse(
        items=[DiagnosisRead.model_validate(i) for i in items],
        total=total,
    )


def get_diagnosis(
    db: Session, diagnosis_id: str, tenant_id: str
) -> Optional[Diagnosis]:
    """Get a single diagnosis by ID."""
    return (
        db.query(Diagnosis)
        .filter(Diagnosis.id == diagnosis_id, Diagnosis.tenant_id == tenant_id)
        .first()
    )


def update_diagnosis(
    db: Session,
    diagnosis_id: str,
    data: DiagnosisUpdate,
    tenant_id: str,
) -> Optional[Diagnosis]:
    """Update an existing diagnosis."""
    diagnosis = get_diagnosis(db, diagnosis_id, tenant_id)
    if not diagnosis:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(diagnosis, field, value)

    db.commit()
    db.refresh(diagnosis)
    logger.info("Diagnosis updated: id=%s", diagnosis_id)
    return diagnosis


def delete_diagnosis(
    db: Session, diagnosis_id: str, tenant_id: str
) -> bool:
    """Delete a diagnosis. Returns True if deleted, False if not found."""
    diagnosis = get_diagnosis(db, diagnosis_id, tenant_id)
    if not diagnosis:
        return False

    db.delete(diagnosis)
    db.commit()
    logger.info("Diagnosis deleted: id=%s", diagnosis_id)
    return True


def get_patient_diagnosis_history(
    db: Session,
    patient_id: str,
    tenant_id: str,
    skip: int = 0,
    limit: int = 100,
) -> PatientDiagnosisHistory:
    """
    Get full diagnosis history for a patient across all encounters.
    Includes chronic and active counts.
    """
    base_q = db.query(Diagnosis).filter(
        Diagnosis.patient_id == patient_id,
        Diagnosis.tenant_id == tenant_id,
    )

    total = base_q.count()
    chronic_count = base_q.filter(Diagnosis.is_chronic == True).count()  # noqa: E712
    active_count = base_q.filter(Diagnosis.resolved_date.is_(None)).count()

    items = (
        base_q.order_by(Diagnosis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return PatientDiagnosisHistory(
        patient_id=patient_id,
        diagnoses=[DiagnosisRead.model_validate(i) for i in items],
        total=total,
        chronic_count=chronic_count,
        active_count=active_count,
    )
