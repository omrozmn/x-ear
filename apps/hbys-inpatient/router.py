"""
Inpatient Service Router (MS-9)
REST API endpoints for admissions, wards, beds, nursing observations,
nurse orders, I/O balance, and inpatient dashboard.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from main import get_db
from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope

import service as inpatient_service
from schemas import (
    # Ward
    WardCreate, WardUpdate, WardRead, WardListResponse,
    # Bed
    BedCreate, BedUpdate, BedRead, BedListResponse,
    # Admission
    AdmissionCreate, AdmissionUpdate, AdmissionDischarge, AdmissionTransfer,
    AdmissionRead, AdmissionListResponse,
    # Nursing Observation
    NursingObservationCreate, NursingObservationUpdate, NursingObservationRead,
    NursingObservationListResponse,
    # Nurse Order
    NurseOrderCreate, NurseOrderUpdate, NurseOrderExecute, NurseOrderRead,
    NurseOrderListResponse,
    # Dashboard / IO
    IOBalanceResponse, InpatientDashboard,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hbys/inpatient", tags=["HBYS - Inpatient"])


# ═══════════════════════════════════════════════════════════════════════════
# Dashboard
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/dashboard",
    operation_id="getInpatientDashboard",
    response_model=ResponseEnvelope[InpatientDashboard],
)
def get_dashboard(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get inpatient dashboard with occupancy stats."""
    data = inpatient_service.get_inpatient_dashboard(db, user.tenant_id)
    return ResponseEnvelope(data=data)


# ═══════════════════════════════════════════════════════════════════════════
# Wards
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/wards",
    operation_id="listWards",
    response_model=ResponseEnvelope[WardListResponse],
)
def list_wards(
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all wards with optional active filter."""
    data = inpatient_service.list_wards(db, user.tenant_id, is_active=is_active, skip=skip, limit=limit)
    return ResponseEnvelope(data=data)


@router.post(
    "/wards",
    operation_id="createWard",
    response_model=ResponseEnvelope[WardRead],
    status_code=201,
)
def create_ward(
    body: WardCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new ward."""
    ward = inpatient_service.create_ward(db, body, user.tenant_id)
    data = WardRead.model_validate(ward)
    return ResponseEnvelope(data=data, message="Ward created successfully")


@router.get(
    "/wards/{ward_id}",
    operation_id="getWard",
    response_model=ResponseEnvelope[WardRead],
)
def get_ward(
    ward_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single ward by ID."""
    ward = inpatient_service.get_ward(db, ward_id, user.tenant_id)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    data = WardRead.model_validate(ward)
    return ResponseEnvelope(data=data)


@router.patch(
    "/wards/{ward_id}",
    operation_id="updateWard",
    response_model=ResponseEnvelope[WardRead],
)
def update_ward(
    ward_id: str,
    body: WardUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a ward."""
    ward = inpatient_service.update_ward(db, ward_id, body, user.tenant_id)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    data = WardRead.model_validate(ward)
    return ResponseEnvelope(data=data, message="Ward updated successfully")


@router.delete(
    "/wards/{ward_id}",
    operation_id="deleteWard",
    response_model=ResponseEnvelope,
)
def delete_ward(
    ward_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a ward."""
    deleted = inpatient_service.delete_ward(db, ward_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Ward not found")
    return ResponseEnvelope(message="Ward deleted successfully")


# ═══════════════════════════════════════════════════════════════════════════
# Beds
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/beds",
    operation_id="listBeds",
    response_model=ResponseEnvelope[BedListResponse],
)
def list_beds(
    ward_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List beds with optional ward and status filters."""
    data = inpatient_service.list_beds(db, user.tenant_id, ward_id=ward_id, status=status, skip=skip, limit=limit)
    return ResponseEnvelope(data=data)


@router.post(
    "/beds",
    operation_id="createBed",
    response_model=ResponseEnvelope[BedRead],
    status_code=201,
)
def create_bed(
    body: BedCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new bed."""
    bed = inpatient_service.create_bed(db, body, user.tenant_id)
    data = inpatient_service._bed_to_read(bed)
    return ResponseEnvelope(data=data, message="Bed created successfully")


@router.get(
    "/beds/{bed_id}",
    operation_id="getBed",
    response_model=ResponseEnvelope[BedRead],
)
def get_bed(
    bed_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single bed by ID."""
    bed = inpatient_service.get_bed(db, bed_id, user.tenant_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    data = inpatient_service._bed_to_read(bed)
    return ResponseEnvelope(data=data)


@router.patch(
    "/beds/{bed_id}",
    operation_id="updateBed",
    response_model=ResponseEnvelope[BedRead],
)
def update_bed(
    bed_id: str,
    body: BedUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a bed."""
    bed = inpatient_service.update_bed(db, bed_id, body, user.tenant_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    data = inpatient_service._bed_to_read(bed)
    return ResponseEnvelope(data=data, message="Bed updated successfully")


@router.delete(
    "/beds/{bed_id}",
    operation_id="deleteBed",
    response_model=ResponseEnvelope,
)
def delete_bed(
    bed_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a bed."""
    deleted = inpatient_service.delete_bed(db, bed_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bed not found")
    return ResponseEnvelope(message="Bed deleted successfully")


# ═══════════════════════════════════════════════════════════════════════════
# Admissions
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/admissions",
    operation_id="listAdmissions",
    response_model=ResponseEnvelope[AdmissionListResponse],
)
def list_admissions(
    status: Optional[str] = Query(None),
    ward_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List admissions with optional filters."""
    data = inpatient_service.list_admissions(
        db, user.tenant_id, status=status, ward_id=ward_id,
        patient_id=patient_id, skip=skip, limit=limit,
    )
    return ResponseEnvelope(data=data)


@router.post(
    "/admissions",
    operation_id="createAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
    status_code=201,
)
def create_admission(
    body: AdmissionCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new inpatient admission."""
    admission = inpatient_service.create_admission(db, body, user.tenant_id)
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data, message="Admission created successfully")


@router.get(
    "/admissions/{admission_id}",
    operation_id="getAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
)
def get_admission(
    admission_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single admission by ID."""
    admission = inpatient_service.get_admission(db, admission_id, user.tenant_id)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data)


@router.patch(
    "/admissions/{admission_id}",
    operation_id="updateAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
)
def update_admission(
    admission_id: str,
    body: AdmissionUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an admission."""
    admission = inpatient_service.update_admission(db, admission_id, body, user.tenant_id)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data, message="Admission updated successfully")


@router.post(
    "/admissions/{admission_id}/discharge",
    operation_id="dischargeAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
)
def discharge_admission(
    admission_id: str,
    body: AdmissionDischarge,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Discharge a patient from inpatient care."""
    admission = inpatient_service.discharge_admission(db, admission_id, body, user.tenant_id)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data, message="Patient discharged successfully")


@router.post(
    "/admissions/{admission_id}/transfer",
    operation_id="transferAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
)
def transfer_admission(
    admission_id: str,
    body: AdmissionTransfer,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Transfer a patient to a different ward/bed."""
    admission = inpatient_service.transfer_admission(db, admission_id, body, user.tenant_id)
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data, message="Patient transferred successfully")


@router.delete(
    "/admissions/{admission_id}",
    operation_id="deleteAdmission",
    response_model=ResponseEnvelope,
)
def delete_admission(
    admission_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an admission record."""
    deleted = inpatient_service.delete_admission(db, admission_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Admission not found")
    return ResponseEnvelope(message="Admission deleted successfully")


# ═══════════════════════════════════════════════════════════════════════════
# I/O Balance
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/admissions/{admission_id}/io-balance",
    operation_id="getIOBalance",
    response_model=ResponseEnvelope[IOBalanceResponse],
)
def get_io_balance(
    admission_id: str,
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get intake/output balance for an admission."""
    data = inpatient_service.get_io_balance(db, admission_id, user.tenant_id, date_from=date_from, date_to=date_to)
    if not data:
        raise HTTPException(status_code=404, detail="Admission not found")
    return ResponseEnvelope(data=data)


# ═══════════════════════════════════════════════════════════════════════════
# Nursing Observations
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/nursing-observations",
    operation_id="listNursingObservations",
    response_model=ResponseEnvelope[NursingObservationListResponse],
)
def list_nursing_observations(
    admission_id: Optional[str] = Query(None),
    observation_type: Optional[str] = Query(None),
    shift: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List nursing observations with optional filters."""
    data = inpatient_service.list_nursing_observations(
        db, user.tenant_id, admission_id=admission_id,
        observation_type=observation_type, shift=shift, skip=skip, limit=limit,
    )
    return ResponseEnvelope(data=data)


@router.post(
    "/nursing-observations",
    operation_id="createNursingObservation",
    response_model=ResponseEnvelope[NursingObservationRead],
    status_code=201,
)
def create_nursing_observation(
    body: NursingObservationCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a new nursing observation."""
    obs = inpatient_service.create_nursing_observation(db, body, user.tenant_id)
    data = inpatient_service._observation_to_read(obs)
    return ResponseEnvelope(data=data, message="Nursing observation recorded")


@router.get(
    "/nursing-observations/{observation_id}",
    operation_id="getNursingObservation",
    response_model=ResponseEnvelope[NursingObservationRead],
)
def get_nursing_observation(
    observation_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single nursing observation by ID."""
    obs = inpatient_service.get_nursing_observation(db, observation_id, user.tenant_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Nursing observation not found")
    data = inpatient_service._observation_to_read(obs)
    return ResponseEnvelope(data=data)


@router.patch(
    "/nursing-observations/{observation_id}",
    operation_id="updateNursingObservation",
    response_model=ResponseEnvelope[NursingObservationRead],
)
def update_nursing_observation(
    observation_id: str,
    body: NursingObservationUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a nursing observation."""
    obs = inpatient_service.update_nursing_observation(db, observation_id, body, user.tenant_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Nursing observation not found")
    data = inpatient_service._observation_to_read(obs)
    return ResponseEnvelope(data=data, message="Nursing observation updated")


@router.delete(
    "/nursing-observations/{observation_id}",
    operation_id="deleteNursingObservation",
    response_model=ResponseEnvelope,
)
def delete_nursing_observation(
    observation_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a nursing observation."""
    deleted = inpatient_service.delete_nursing_observation(db, observation_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Nursing observation not found")
    return ResponseEnvelope(message="Nursing observation deleted")


# ═══════════════════════════════════════════════════════════════════════════
# Nurse Orders
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/nurse-orders",
    operation_id="listNurseOrders",
    response_model=ResponseEnvelope[NurseOrderListResponse],
)
def list_nurse_orders(
    admission_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    order_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List nurse orders with optional filters."""
    data = inpatient_service.list_nurse_orders(
        db, user.tenant_id, admission_id=admission_id,
        status=status, order_type=order_type, skip=skip, limit=limit,
    )
    return ResponseEnvelope(data=data)


@router.post(
    "/nurse-orders",
    operation_id="createNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
    status_code=201,
)
def create_nurse_order(
    body: NurseOrderCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new nurse order."""
    order = inpatient_service.create_nurse_order(db, body, user.tenant_id)
    data = inpatient_service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order created")


@router.get(
    "/nurse-orders/{order_id}",
    operation_id="getNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def get_nurse_order(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single nurse order by ID."""
    order = inpatient_service.get_nurse_order(db, order_id, user.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = inpatient_service._order_to_read(order)
    return ResponseEnvelope(data=data)


@router.patch(
    "/nurse-orders/{order_id}",
    operation_id="updateNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def update_nurse_order(
    order_id: str,
    body: NurseOrderUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a nurse order."""
    order = inpatient_service.update_nurse_order(db, order_id, body, user.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = inpatient_service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order updated")


@router.post(
    "/nurse-orders/{order_id}/execute",
    operation_id="executeNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def execute_nurse_order(
    order_id: str,
    body: NurseOrderExecute,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a nurse order as executed."""
    order = inpatient_service.execute_nurse_order(db, order_id, body, user.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = inpatient_service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order executed")


@router.delete(
    "/nurse-orders/{order_id}",
    operation_id="deleteNurseOrder",
    response_model=ResponseEnvelope,
)
def delete_nurse_order(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a nurse order."""
    deleted = inpatient_service.delete_nurse_order(db, order_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    return ResponseEnvelope(message="Nurse order deleted")
