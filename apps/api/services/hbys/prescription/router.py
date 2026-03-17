"""
Prescription Router
===================
FastAPI router for the HBYS prescription service (MS-3).

Endpoints:
  - CRUD prescriptions
  - Add / update / remove prescription items
  - Send to MEDULA (stub)
  - Cancel on MEDULA
  - Medication catalog search & CRUD
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta

from . import service
from .schemas import (
    # Prescription
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionRead,
    PrescriptionListItem,
    PrescriptionResponse,
    PrescriptionListResponse,
    # Items
    PrescriptionItemCreate,
    PrescriptionItemUpdate,
    PrescriptionItemRead,
    PrescriptionItemResponse,
    # Medication
    MedicationCreate,
    MedicationUpdate,
    MedicationRead,
    MedicationResponse,
    MedicationListResponse,
    # MEDULA
    MedulaSendRequest,
    MedulaSendResponse,
    MedulaSendResponseEnvelope,
    MedulaCancelRequest,
    MedulaCancelResponse,
    MedulaCancelResponseEnvelope,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hbys/prescriptions", tags=["HBYS - Prescriptions"])


# =========================================================================
# Prescription CRUD
# =========================================================================

@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new prescription",
)
def create_prescription(
    body: PrescriptionCreate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.create_prescription(db, access.tenant_id, body)
    return ResponseEnvelope.create_success(
        data=PrescriptionRead.model_validate(prx),
        message="Prescription created",
    )


@router.get(
    "",
    response_model=PrescriptionListResponse,
    summary="List prescriptions",
)
def list_prescriptions(
    patient_id: Optional[str] = Query(None, alias="patientId"),
    doctor_id: Optional[str] = Query(None, alias="doctorId"),
    status_filter: Optional[str] = Query(None, alias="status"),
    prescription_type: Optional[str] = Query(None, alias="prescriptionType"),
    encounter_id: Optional[str] = Query(None, alias="encounterId"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    access: UnifiedAccess = Depends(require_access("prescriptions.read")),
    db: Session = Depends(get_db),
):
    items, total = service.list_prescriptions(
        db,
        tenant_id=access.tenant_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        status=status_filter,
        prescription_type=prescription_type,
        encounter_id=encounter_id,
        page=page,
        per_page=per_page,
    )
    total_pages = (total + per_page - 1) // per_page
    data = []
    for prx in items:
        item_dict = PrescriptionListItem.model_validate(prx)
        item_dict.item_count = len(prx.items) if prx.items else 0
        data.append(item_dict)

    return ResponseEnvelope.create_success(
        data=data,
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Get prescription by ID",
)
def get_prescription(
    prescription_id: str,
    access: UnifiedAccess = Depends(require_access("prescriptions.read")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return ResponseEnvelope.create_success(
        data=PrescriptionRead.model_validate(prx),
    )


@router.patch(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Update a draft prescription",
)
def update_prescription(
    prescription_id: str,
    body: PrescriptionUpdate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        prx = service.update_prescription(db, prx, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.create_success(
        data=PrescriptionRead.model_validate(prx),
        message="Prescription updated",
    )


@router.delete(
    "/{prescription_id}",
    response_model=ResponseEnvelope,
    summary="Delete a draft prescription",
)
def delete_prescription(
    prescription_id: str,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        service.delete_prescription(db, prx)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.create_success(message="Prescription deleted")


# =========================================================================
# Prescription Items
# =========================================================================

@router.post(
    "/{prescription_id}/items",
    response_model=PrescriptionItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add medication item to prescription",
)
def add_item(
    prescription_id: str,
    body: PrescriptionItemCreate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        item = service.add_prescription_item(db, prx, body, access.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.create_success(
        data=PrescriptionItemRead.model_validate(item),
        message="Item added",
    )


@router.patch(
    "/{prescription_id}/items/{item_id}",
    response_model=PrescriptionItemResponse,
    summary="Update a prescription item",
)
def update_item(
    prescription_id: str,
    item_id: str,
    body: PrescriptionItemUpdate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    item = service.get_prescription_item(db, item_id)
    if not item or item.prescription_id != prescription_id:
        raise HTTPException(status_code=404, detail="Item not found")
    # Tenant check via parent prescription
    prx = service.get_prescription(db, prescription_id)
    if not prx or prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        item = service.update_prescription_item(db, item, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.create_success(
        data=PrescriptionItemRead.model_validate(item),
        message="Item updated",
    )


@router.delete(
    "/{prescription_id}/items/{item_id}",
    response_model=ResponseEnvelope,
    summary="Remove a medication item from prescription",
)
def remove_item(
    prescription_id: str,
    item_id: str,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    item = service.get_prescription_item(db, item_id)
    if not item or item.prescription_id != prescription_id:
        raise HTTPException(status_code=404, detail="Item not found")
    prx = service.get_prescription(db, prescription_id)
    if not prx or prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        service.remove_prescription_item(db, item)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.create_success(message="Item removed")


# =========================================================================
# MEDULA Integration
# =========================================================================

@router.post(
    "/{prescription_id}/send-medula",
    response_model=MedulaSendResponseEnvelope,
    summary="Send prescription to MEDULA e-Recete (stub)",
)
def send_to_medula(
    prescription_id: str,
    body: MedulaSendRequest,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Override prescription_id in the request body to match the path
    body.prescription_id = prescription_id

    try:
        result = service.send_to_medula(db, prx, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    resp_data = MedulaSendResponse(
        success=result.success,
        medula_prescription_id=result.medula_prescription_id,
        sonuc_kodu=result.sonuc_kodu,
        sonuc_mesaji=result.sonuc_mesaji,
        raw_response=result.raw,
    )
    return ResponseEnvelope.create_success(
        data=resp_data,
        message="MEDULA e-Recete sent (stub)" if result.success else "MEDULA rejected",
    )


@router.post(
    "/{prescription_id}/cancel-medula",
    response_model=MedulaCancelResponseEnvelope,
    summary="Cancel prescription on MEDULA",
)
def cancel_on_medula(
    prescription_id: str,
    body: MedulaCancelRequest,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")

    body.prescription_id = prescription_id

    try:
        result = service.cancel_on_medula(db, prx, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    resp_data = MedulaCancelResponse(
        success=result.success,
        message=result.sonuc_mesaji,
        raw_response=result.raw,
    )
    return ResponseEnvelope.create_success(
        data=resp_data,
        message="MEDULA cancellation processed",
    )


# =========================================================================
# Medication Catalog
# =========================================================================

medication_router = APIRouter(prefix="/hbys/medications", tags=["HBYS - Medications"])


@medication_router.get(
    "",
    response_model=MedicationListResponse,
    summary="Search medications",
)
def search_medications(
    q: Optional[str] = Query(None, description="Search name / generic / barcode"),
    atc_code: Optional[str] = Query(None, alias="atcCode"),
    barcode: Optional[str] = None,
    form: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    access: UnifiedAccess = Depends(require_access("prescriptions.read")),
    db: Session = Depends(get_db),
):
    items, total = service.search_medications(
        db, query=q, atc_code=atc_code, barcode=barcode, form=form,
        page=page, per_page=per_page,
    )
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope.create_success(
        data=[MedicationRead.model_validate(m) for m in items],
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )


@medication_router.get(
    "/{medication_id}",
    response_model=MedicationResponse,
    summary="Get medication by ID",
)
def get_medication(
    medication_id: str,
    access: UnifiedAccess = Depends(require_access("prescriptions.read")),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return ResponseEnvelope.create_success(
        data=MedicationRead.model_validate(med),
    )


@medication_router.post(
    "",
    response_model=MedicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a medication entry",
)
def create_medication(
    body: MedicationCreate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    med = service.create_medication(db, body)
    return ResponseEnvelope.create_success(
        data=MedicationRead.model_validate(med),
        message="Medication created",
    )


@medication_router.patch(
    "/{medication_id}",
    response_model=MedicationResponse,
    summary="Update a medication entry",
)
def update_medication(
    medication_id: str,
    body: MedicationUpdate,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med = service.update_medication(db, med, body)
    return ResponseEnvelope.create_success(
        data=MedicationRead.model_validate(med),
        message="Medication updated",
    )


@medication_router.delete(
    "/{medication_id}",
    response_model=ResponseEnvelope,
    summary="Delete a medication entry",
)
def delete_medication(
    medication_id: str,
    access: UnifiedAccess = Depends(require_access("prescriptions.write")),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    service.delete_medication(db, med)
    return ResponseEnvelope.create_success(message="Medication deleted")
