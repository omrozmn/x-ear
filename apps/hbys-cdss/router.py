"""
CDSS Router - FastAPI endpoints for Clinical Decision Support System.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from main import get_db
from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope

import service
from schemas import (
    # Alert schemas
    ClinicalAlertRead,
    AlertAcknowledge,
    AlertOverride,
    AlertListResponse,
    # Allergy schemas
    PatientAllergyCreate,
    PatientAllergyUpdate,
    PatientAllergyRead,
    PatientAllergyListResponse,
    # Protocol schemas
    ClinicalProtocolCreate,
    ClinicalProtocolUpdate,
    ClinicalProtocolRead,
    ClinicalProtocolListResponse,
    # CDSS check schemas
    PrescriptionCheckRequest,
    PrescriptionCheckResponse,
    LabResultCheckRequest,
    LabResultCheckResponse,
    DuplicateOrderCheckRequest,
    DuplicateOrderCheckResponse,
)

router = APIRouter(prefix="/api/hbys/cdss", tags=["HBYS - CDSS"])


# ============================================================================
# CDSS CHECK ENDPOINTS
# ============================================================================


@router.post(
    "/check/prescription",
    response_model=ResponseEnvelope[PrescriptionCheckResponse],
    summary="Check prescription (interactions + allergies + dose)",
    description="Run all CDSS checks on a prescription before submission.",
)
def check_prescription(
    data: PrescriptionCheckRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.check_prescription(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=result)


@router.post(
    "/check/lab-result",
    response_model=ResponseEnvelope[LabResultCheckResponse],
    summary="Check lab result for critical values",
    description="Evaluate a lab result against critical thresholds.",
)
def check_lab_result(
    data: LabResultCheckRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.check_lab_result(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=result)


@router.post(
    "/check/duplicate-order",
    response_model=ResponseEnvelope[DuplicateOrderCheckResponse],
    summary="Check for duplicate orders",
    description="Detect duplicate lab/imaging/prescription orders within a time window.",
)
def check_duplicate_order(
    data: DuplicateOrderCheckRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.check_duplicate_order(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=result)


# ============================================================================
# PATIENT ALLERGY ENDPOINTS
# ============================================================================


@router.post(
    "/allergies",
    response_model=ResponseEnvelope[PatientAllergyRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create patient allergy",
)
def create_allergy(
    data: PatientAllergyCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    allergy = service.create_allergy(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=PatientAllergyRead.model_validate(allergy))


@router.get(
    "/allergies/patient/{patient_id}",
    response_model=ResponseEnvelope[PatientAllergyListResponse],
    summary="List patient allergies",
)
def list_patient_allergies(
    patient_id: str,
    active_only: bool = Query(True, description="Only return active allergies"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_allergies(
        db,
        patient_id=patient_id,
        tenant_id=user.tenant_id,
        active_only=active_only,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/allergies/{allergy_id}",
    response_model=ResponseEnvelope[PatientAllergyRead],
    summary="Get allergy by ID",
)
def get_allergy(
    allergy_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    allergy = service.get_allergy(db, allergy_id=allergy_id, tenant_id=user.tenant_id)
    if not allergy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerji kaydı '{allergy_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=PatientAllergyRead.model_validate(allergy))


@router.put(
    "/allergies/{allergy_id}",
    response_model=ResponseEnvelope[PatientAllergyRead],
    summary="Update allergy",
)
def update_allergy(
    allergy_id: str,
    data: PatientAllergyUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    allergy = service.update_allergy(
        db, allergy_id=allergy_id, data=data, tenant_id=user.tenant_id
    )
    if not allergy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerji kaydı '{allergy_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=PatientAllergyRead.model_validate(allergy))


@router.delete(
    "/allergies/{allergy_id}",
    response_model=ResponseEnvelope,
    summary="Delete allergy",
)
def delete_allergy(
    allergy_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    deleted = service.delete_allergy(db, allergy_id=allergy_id, tenant_id=user.tenant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerji kaydı '{allergy_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=None)


# ============================================================================
# CLINICAL ALERT ENDPOINTS
# ============================================================================


@router.get(
    "/alerts",
    response_model=ResponseEnvelope[AlertListResponse],
    summary="List clinical alerts",
    description="List alerts with optional filters by patient, status, type, severity.",
)
def list_alerts(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    alert_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_alerts(
        db,
        tenant_id=user.tenant_id,
        patient_id=patient_id,
        status=alert_status,
        alert_type=alert_type,
        severity=severity,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/alerts/{alert_id}",
    response_model=ResponseEnvelope[ClinicalAlertRead],
    summary="Get alert by ID",
)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alert = service.get_alert(db, alert_id=alert_id, tenant_id=user.tenant_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uyarı '{alert_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=ClinicalAlertRead.model_validate(alert))


@router.post(
    "/alerts/{alert_id}/acknowledge",
    response_model=ResponseEnvelope[ClinicalAlertRead],
    summary="Acknowledge an alert",
)
def acknowledge_alert(
    alert_id: str,
    data: AlertAcknowledge,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alert = service.acknowledge_alert(
        db,
        alert_id=alert_id,
        acknowledged_by=data.acknowledged_by,
        tenant_id=user.tenant_id,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uyarı '{alert_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=ClinicalAlertRead.model_validate(alert))


@router.post(
    "/alerts/{alert_id}/override",
    response_model=ResponseEnvelope[ClinicalAlertRead],
    summary="Override an alert with clinical justification",
)
def override_alert(
    alert_id: str,
    data: AlertOverride,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alert = service.override_alert(
        db,
        alert_id=alert_id,
        overridden_by=data.overridden_by,
        override_reason=data.override_reason,
        tenant_id=user.tenant_id,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uyarı '{alert_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=ClinicalAlertRead.model_validate(alert))


# ============================================================================
# CLINICAL PROTOCOL ENDPOINTS
# ============================================================================


@router.post(
    "/protocols",
    response_model=ResponseEnvelope[ClinicalProtocolRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create clinical protocol",
)
def create_protocol(
    data: ClinicalProtocolCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    protocol = service.create_protocol(db, data=data)
    return ResponseEnvelope.ok(data=ClinicalProtocolRead.model_validate(protocol))


@router.get(
    "/protocols",
    response_model=ResponseEnvelope[ClinicalProtocolListResponse],
    summary="List clinical protocols",
)
def list_protocols(
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    protocol_type: Optional[str] = Query(None, description="Filter by protocol type"),
    active_only: bool = Query(True, description="Only return active protocols"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_protocols(
        db,
        specialty=specialty,
        protocol_type=protocol_type,
        active_only=active_only,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/protocols/search",
    response_model=ResponseEnvelope[ClinicalProtocolListResponse],
    summary="Search clinical protocols",
    description="Search protocols by name, ICD code, or description.",
)
def search_protocols(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    specialty: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.search_protocols(db, q=q, specialty=specialty, limit=limit)
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/protocols/by-diagnosis/{icd_code}",
    response_model=ResponseEnvelope[ClinicalProtocolListResponse],
    summary="Get protocols for a diagnosis",
    description="Find treatment protocols associated with an ICD code.",
)
def get_protocols_for_diagnosis(
    icd_code: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.get_protocols_for_diagnosis(db, icd_code=icd_code)
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/protocols/{protocol_id}",
    response_model=ResponseEnvelope[ClinicalProtocolRead],
    summary="Get protocol by ID",
)
def get_protocol(
    protocol_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    protocol = service.get_protocol(db, protocol_id=protocol_id)
    if not protocol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protokol '{protocol_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=ClinicalProtocolRead.model_validate(protocol))


@router.put(
    "/protocols/{protocol_id}",
    response_model=ResponseEnvelope[ClinicalProtocolRead],
    summary="Update clinical protocol",
)
def update_protocol(
    protocol_id: str,
    data: ClinicalProtocolUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    protocol = service.update_protocol(db, protocol_id=protocol_id, data=data)
    if not protocol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protokol '{protocol_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=ClinicalProtocolRead.model_validate(protocol))


@router.delete(
    "/protocols/{protocol_id}",
    response_model=ResponseEnvelope,
    summary="Delete clinical protocol",
)
def delete_protocol(
    protocol_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    deleted = service.delete_protocol(db, protocol_id=protocol_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Protokol '{protocol_id}' bulunamadı.",
        )
    return ResponseEnvelope.ok(data=None)
