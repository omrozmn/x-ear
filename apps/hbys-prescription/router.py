"""
Prescription Router
===================
FastAPI router for the HBYS prescription microservice.

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

from main import get_db
from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope, ResponseMeta

import service
from schemas import (
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

prescription_router = APIRouter(prefix="/api/hbys/prescriptions", tags=["HBYS - Prescriptions"])


# =========================================================================
# Prescription CRUD
# =========================================================================

@prescription_router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new prescription",
)
def create_prescription(
    body: PrescriptionCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),  # replaced at startup
):
    prx = service.create_prescription(db, user.tenant_id, body)
    return ResponseEnvelope.ok(
        data=PrescriptionRead.model_validate(prx),
    )


@prescription_router.get(
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
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = service.list_prescriptions(
        db,
        tenant_id=user.tenant_id,
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

    return ResponseEnvelope.ok(
        data=data,
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
        ),
    )


@prescription_router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Get prescription by ID",
)
def get_prescription(
    prescription_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return ResponseEnvelope.ok(
        data=PrescriptionRead.model_validate(prx),
    )


@prescription_router.patch(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Update a draft prescription",
)
def update_prescription(
    prescription_id: str,
    body: PrescriptionUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        prx = service.update_prescription(db, prx, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.ok(
        data=PrescriptionRead.model_validate(prx),
    )


@prescription_router.delete(
    "/{prescription_id}",
    response_model=ResponseEnvelope,
    summary="Delete a draft prescription",
)
def delete_prescription(
    prescription_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        service.delete_prescription(db, prx)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.ok()


# =========================================================================
# Prescription Items
# =========================================================================

@prescription_router.post(
    "/{prescription_id}/items",
    response_model=PrescriptionItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add medication item to prescription",
)
def add_item(
    prescription_id: str,
    body: PrescriptionItemCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    try:
        item = service.add_prescription_item(db, prx, body, user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.ok(
        data=PrescriptionItemRead.model_validate(item),
    )


@prescription_router.patch(
    "/{prescription_id}/items/{item_id}",
    response_model=PrescriptionItemResponse,
    summary="Update a prescription item",
)
def update_item(
    prescription_id: str,
    item_id: str,
    body: PrescriptionItemUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = service.get_prescription_item(db, item_id)
    if not item or item.prescription_id != prescription_id:
        raise HTTPException(status_code=404, detail="Item not found")
    # Tenant check via parent prescription
    prx = service.get_prescription(db, prescription_id)
    if not prx or prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        item = service.update_prescription_item(db, item, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.ok(
        data=PrescriptionItemRead.model_validate(item),
    )


@prescription_router.delete(
    "/{prescription_id}/items/{item_id}",
    response_model=ResponseEnvelope,
    summary="Remove a medication item from prescription",
)
def remove_item(
    prescription_id: str,
    item_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = service.get_prescription_item(db, item_id)
    if not item or item.prescription_id != prescription_id:
        raise HTTPException(status_code=404, detail="Item not found")
    prx = service.get_prescription(db, prescription_id)
    if not prx or prx.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        service.remove_prescription_item(db, item)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ResponseEnvelope.ok()


# =========================================================================
# MEDULA Integration
# =========================================================================

@prescription_router.post(
    "/{prescription_id}/send-medula",
    response_model=MedulaSendResponseEnvelope,
    summary="Send prescription to MEDULA e-Recete (stub)",
)
def send_to_medula(
    prescription_id: str,
    body: MedulaSendRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
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
    return ResponseEnvelope.ok(data=resp_data)


@prescription_router.post(
    "/{prescription_id}/cancel-medula",
    response_model=MedulaCancelResponseEnvelope,
    summary="Cancel prescription on MEDULA",
)
def cancel_on_medula(
    prescription_id: str,
    body: MedulaCancelRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prx = service.get_prescription(db, prescription_id)
    if not prx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if prx.tenant_id != user.tenant_id:
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
    return ResponseEnvelope.ok(data=resp_data)


# =========================================================================
# Medication Catalog
# =========================================================================

medication_router = APIRouter(prefix="/api/hbys/medications", tags=["HBYS - Medications"])


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
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = service.search_medications(
        db, query=q, atc_code=atc_code, barcode=barcode, form=form,
        page=page, per_page=per_page,
    )
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope.ok(
        data=[MedicationRead.model_validate(m) for m in items],
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
        ),
    )


@medication_router.get(
    "/{medication_id}",
    response_model=MedicationResponse,
    summary="Get medication by ID",
)
def get_medication(
    medication_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return ResponseEnvelope.ok(
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
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    med = service.create_medication(db, body)
    return ResponseEnvelope.ok(
        data=MedicationRead.model_validate(med),
    )


@medication_router.patch(
    "/{medication_id}",
    response_model=MedicationResponse,
    summary="Update a medication entry",
)
def update_medication(
    medication_id: str,
    body: MedicationUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med = service.update_medication(db, med, body)
    return ResponseEnvelope.ok(
        data=MedicationRead.model_validate(med),
    )


@medication_router.delete(
    "/{medication_id}",
    response_model=ResponseEnvelope,
    summary="Delete a medication entry",
)
def delete_medication(
    medication_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    med = service.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    service.delete_medication(db, med)
    return ResponseEnvelope.ok()


# =========================================================================
# AI Drug Interaction Endpoints
# =========================================================================

from pydantic import BaseModel
from typing import List

import ai_service


class AIInteractionCheckRequest(BaseModel):
    """Request body for checking drug interactions in a prescription."""
    medications: List[dict] = []


class AIInteractionResult(BaseModel):
    """Single interaction result."""
    drug_a: str
    drug_b: str
    interaction_type: str
    severity: str
    confidence: float
    is_known: bool
    source: str


class AIInteractionCheckResponse(BaseModel):
    """Response for prescription interaction check."""
    total_medications: int
    total_interactions: int
    interactions: List[AIInteractionResult]
    has_contraindicated: bool
    has_major: bool


class AIPairInteractionResponse(BaseModel):
    """Response for single pair interaction check."""
    drug_a: str
    drug_b: str
    interaction_type: str
    severity: str
    confidence: float
    is_known: bool
    source: str
    explanation_tr: str


@prescription_router.post(
    "/ai/check-interactions",
    response_model=AIInteractionCheckResponse,
    summary="AI: Check drug interactions in a prescription",
    tags=["HBYS - AI Drug Interactions"],
)
def ai_check_interactions(body: AIInteractionCheckRequest):
    """
    Check all pairwise drug interactions in a prescription using AI.
    Returns interactions sorted by severity (most severe first).
    """
    interactions = ai_service.check_prescription_interactions(body.medications)
    return AIInteractionCheckResponse(
        total_medications=len(body.medications),
        total_interactions=len(interactions),
        interactions=[AIInteractionResult(**i) for i in interactions],
        has_contraindicated=any(i["severity"] == "contraindicated" for i in interactions),
        has_major=any(i["severity"] == "major" for i in interactions),
    )


@prescription_router.get(
    "/ai/interaction/{drug_a}/{drug_b}",
    response_model=AIPairInteractionResponse,
    summary="AI: Check interaction between two specific drugs",
    tags=["HBYS - AI Drug Interactions"],
)
def ai_check_pair(drug_a: str, drug_b: str):
    """
    Check the interaction between two specific drugs using AI.
    Returns interaction type, severity, confidence, and a Turkish explanation.
    """
    interaction = ai_service.predict_interaction(drug_a, drug_b)
    explanation = ai_service.get_interaction_explanation(drug_a, drug_b)
    return AIPairInteractionResponse(
        **interaction,
        explanation_tr=explanation,
    )
