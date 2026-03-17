"""
Prescription Service - Business Logic
======================================
All business rules for prescriptions, items, medications, and MEDULA
integration are encapsulated here.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from hbys_common.database import gen_id

from models.prescription import Prescription
from models.prescription_item import PrescriptionItem
from models.medication import Medication
from schemas import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionItemCreate,
    PrescriptionItemUpdate,
    MedulaSendRequest,
    MedulaCancelRequest,
)
from medula_client import (
    MedulaEReceteClient,
    MedulaCredentials,
    MedulaPrescriptionRequest,
    MedulaDiagnosisEntry,
    MedulaMedicationEntry,
    MedulaResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _apply_filters(query, patient_id=None, doctor_id=None, status=None,
                    prescription_type=None, encounter_id=None):
    if patient_id:
        query = query.filter(Prescription.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Prescription.doctor_id == doctor_id)
    if status:
        query = query.filter(Prescription.status == status)
    if prescription_type:
        query = query.filter(Prescription.prescription_type == prescription_type)
    if encounter_id:
        query = query.filter(Prescription.encounter_id == encounter_id)
    return query


# ---------------------------------------------------------------------------
# Prescription CRUD
# ---------------------------------------------------------------------------

def create_prescription(
    db: Session,
    tenant_id: str,
    data: PrescriptionCreate,
) -> Prescription:
    """Create a new prescription (status=draft) with optional inline items."""
    prx = Prescription(
        id=gen_id("prx"),
        tenant_id=tenant_id,
        encounter_id=data.encounter_id,
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        prescription_type=data.prescription_type.value if data.prescription_type else "normal",
        status="draft",
        protocol_no=data.protocol_no,
        notes=data.notes,
        prescribed_at=data.prescribed_at or _now(),
    )
    if data.diagnosis_codes:
        prx.diagnosis_codes_list = data.diagnosis_codes

    db.add(prx)
    db.flush()  # get prx.id

    # Inline items
    if data.items:
        for item_data in data.items:
            _add_item(db, prx, item_data, tenant_id)

    db.commit()
    db.refresh(prx)
    return prx


def get_prescription(db: Session, prescription_id: str) -> Optional[Prescription]:
    return db.query(Prescription).filter(Prescription.id == prescription_id).first()


def list_prescriptions(
    db: Session,
    tenant_id: str,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status: Optional[str] = None,
    prescription_type: Optional[str] = None,
    encounter_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[Prescription], int]:
    """Return paginated list + total count."""
    q = db.query(Prescription).filter(Prescription.tenant_id == tenant_id)
    q = _apply_filters(q, patient_id, doctor_id, status, prescription_type, encounter_id)

    total = q.count()
    items = (
        q.order_by(Prescription.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return items, total


def update_prescription(
    db: Session,
    prescription: Prescription,
    data: PrescriptionUpdate,
) -> Prescription:
    """Update a prescription. Only drafts may be edited."""
    if prescription.status != "draft":
        raise ValueError("Only draft prescriptions can be updated")

    for field_name, value in data.model_dump(exclude_unset=True).items():
        if field_name == "diagnosis_codes" and value is not None:
            prescription.diagnosis_codes_list = value
        else:
            setattr(prescription, field_name, value)

    prescription.updated_at = _now()
    db.commit()
    db.refresh(prescription)
    return prescription


def delete_prescription(db: Session, prescription: Prescription) -> None:
    """Delete a prescription. Only drafts may be deleted."""
    if prescription.status != "draft":
        raise ValueError("Only draft prescriptions can be deleted")
    db.delete(prescription)
    db.commit()


# ---------------------------------------------------------------------------
# Prescription Item Management
# ---------------------------------------------------------------------------

def _add_item(
    db: Session,
    prx: Prescription,
    data: PrescriptionItemCreate,
    tenant_id: str,
) -> PrescriptionItem:
    item = PrescriptionItem(
        id=gen_id("pri"),
        tenant_id=tenant_id,
        prescription_id=prx.id,
        medication_name=data.medication_name,
        medication_code=data.medication_code,
        dosage=data.dosage,
        dosage_form=data.dosage_form.value if data.dosage_form else "tablet",
        frequency=data.frequency,
        duration_days=data.duration_days,
        quantity=data.quantity,
        usage_instructions=data.usage_instructions,
        is_generic_allowed=data.is_generic_allowed,
        box_count=data.box_count,
        unit_per_box=data.unit_per_box,
    )
    db.add(item)
    return item


def add_prescription_item(
    db: Session,
    prescription: Prescription,
    data: PrescriptionItemCreate,
    tenant_id: str,
) -> PrescriptionItem:
    """Add a medication item to an existing prescription."""
    if prescription.status != "draft":
        raise ValueError("Items can only be added to draft prescriptions")

    item = _add_item(db, prescription, data, tenant_id)
    db.commit()
    db.refresh(item)
    return item


def update_prescription_item(
    db: Session,
    item: PrescriptionItem,
    data: PrescriptionItemUpdate,
) -> PrescriptionItem:
    """Update an existing prescription item."""
    # Check parent is still draft
    prx = db.query(Prescription).filter(Prescription.id == item.prescription_id).first()
    if prx and prx.status != "draft":
        raise ValueError("Items can only be updated on draft prescriptions")

    for field_name, value in data.model_dump(exclude_unset=True).items():
        if field_name == "dosage_form" and value is not None:
            setattr(item, field_name, value.value if hasattr(value, "value") else value)
        else:
            setattr(item, field_name, value)

    item.updated_at = _now()
    db.commit()
    db.refresh(item)
    return item


def remove_prescription_item(
    db: Session,
    item: PrescriptionItem,
) -> None:
    """Remove a medication item from a prescription."""
    prx = db.query(Prescription).filter(Prescription.id == item.prescription_id).first()
    if prx and prx.status != "draft":
        raise ValueError("Items can only be removed from draft prescriptions")
    db.delete(item)
    db.commit()


def get_prescription_item(
    db: Session, item_id: str
) -> Optional[PrescriptionItem]:
    return db.query(PrescriptionItem).filter(PrescriptionItem.id == item_id).first()


# ---------------------------------------------------------------------------
# MEDULA Integration
# ---------------------------------------------------------------------------

def send_to_medula(
    db: Session,
    prescription: Prescription,
    request: MedulaSendRequest,
) -> MedulaResponse:
    """
    Send a prescription to MEDULA e-Recete.

    Business rules:
    - Prescription must be in draft status
    - Must have at least one item
    - After success, status -> 'sent'
    """
    if prescription.status not in ("draft",):
        raise ValueError("Only draft prescriptions can be sent to MEDULA")

    items = prescription.items or []
    if not items:
        raise ValueError("Prescription must have at least one medication item")

    # Build MEDULA request
    medula_request = MedulaPrescriptionRequest(
        patient_tc=request.patient_tc or "",
        doctor_tc=request.doctor_tc or "",
        tesis_kodu=request.facility_code or "",
        protocol_no=prescription.protocol_no or "",
        prescription_type=prescription.prescription_type,
        diagnoses=[
            MedulaDiagnosisEntry(code=code)
            for code in (prescription.diagnosis_codes_list or [])
        ],
        medications=[
            MedulaMedicationEntry(
                medication_code=item.medication_code or "",
                medication_name=item.medication_name,
                dosage=item.dosage or "",
                dosage_form=item.dosage_form or "",
                frequency=item.frequency or "",
                duration_days=item.duration_days or 0,
                quantity=item.quantity or 0,
                box_count=item.box_count or 1,
                usage_instructions=item.usage_instructions or "",
                is_generic_allowed=item.is_generic_allowed,
            )
            for item in items
        ],
        notes=prescription.notes or "",
    )

    # Call MEDULA stub client
    client = MedulaEReceteClient(MedulaCredentials())
    result = client.send_prescription(medula_request)

    # Update prescription based on result
    if result.success:
        prescription.status = "sent"
        prescription.medula_prescription_id = result.medula_prescription_id
    else:
        prescription.status = "rejected"

    prescription.medula_response_dict = result.raw
    prescription.updated_at = _now()
    db.commit()
    db.refresh(prescription)

    return result


def cancel_on_medula(
    db: Session,
    prescription: Prescription,
    request: MedulaCancelRequest,
) -> MedulaResponse:
    """
    Cancel an existing prescription on MEDULA.

    Business rules:
    - Prescription must have a medula_prescription_id
    - Status must be sent or approved
    """
    if not prescription.medula_prescription_id:
        raise ValueError("Prescription has not been sent to MEDULA yet")

    if prescription.status not in ("sent", "approved"):
        raise ValueError(
            f"Cannot cancel prescription in '{prescription.status}' status"
        )

    client = MedulaEReceteClient(MedulaCredentials())
    result = client.cancel_prescription(
        prescription.medula_prescription_id,
        cancel_reason=request.cancel_reason or "",
    )

    if result.success:
        prescription.status = "cancelled"
        prescription.medula_response_dict = result.raw
        prescription.updated_at = _now()
        db.commit()
        db.refresh(prescription)

    return result


# ---------------------------------------------------------------------------
# Medication Catalog
# ---------------------------------------------------------------------------

def search_medications(
    db: Session,
    query: Optional[str] = None,
    atc_code: Optional[str] = None,
    barcode: Optional[str] = None,
    form: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[Medication], int]:
    """Search the medication catalog. Not tenant-scoped."""
    q = db.query(Medication)

    if query:
        search_term = f"%{query}%"
        q = q.filter(
            or_(
                Medication.name.ilike(search_term),
                Medication.generic_name.ilike(search_term),
                Medication.barcode.ilike(search_term),
            )
        )
    if atc_code:
        q = q.filter(Medication.atc_code == atc_code)
    if barcode:
        q = q.filter(Medication.barcode == barcode)
    if form:
        q = q.filter(Medication.form == form)

    total = q.count()
    items = (
        q.order_by(Medication.name)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return items, total


def get_medication(db: Session, medication_id: str) -> Optional[Medication]:
    return db.query(Medication).filter(Medication.id == medication_id).first()


def create_medication(db: Session, data) -> Medication:
    med = Medication(
        id=gen_id("med"),
        **data.model_dump(),
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def update_medication(db: Session, medication: Medication, data) -> Medication:
    for field_name, value in data.model_dump(exclude_unset=True).items():
        setattr(medication, field_name, value)
    medication.updated_at = _now()
    db.commit()
    db.refresh(medication)
    return medication


def delete_medication(db: Session, medication: Medication) -> None:
    db.delete(medication)
    db.commit()
