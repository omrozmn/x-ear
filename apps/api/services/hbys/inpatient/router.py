"""
Inpatient Service Router (MS-9)
REST API endpoints for admissions, wards, beds, nursing observations,
nurse orders, I/O balance, and inpatient dashboard.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope

from . import service
from .schemas import (
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

router = APIRouter(prefix="/hbys/inpatient", tags=["HBYS - Inpatient"])


# ═══════════════════════════════════════════════════════════════════════════
# Dashboard
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/dashboard",
    operation_id="getInpatientDashboard",
    response_model=ResponseEnvelope[InpatientDashboard],
)
def get_dashboard(
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get inpatient dashboard with occupancy stats."""
    data = service.get_inpatient_dashboard(db, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """List all wards with optional active filter."""
    data = service.list_wards(db, access.tenant_id, is_active=is_active, skip=skip, limit=limit)
    return ResponseEnvelope(data=data)


@router.post(
    "/wards",
    operation_id="createWard",
    response_model=ResponseEnvelope[WardRead],
    status_code=201,
)
def create_ward(
    body: WardCreate,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Create a new ward."""
    ward = service.create_ward(db, body, access.tenant_id)
    data = WardRead.model_validate(ward)
    return ResponseEnvelope(data=data, message="Ward created successfully")


@router.get(
    "/wards/{ward_id}",
    operation_id="getWard",
    response_model=ResponseEnvelope[WardRead],
)
def get_ward(
    ward_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get a single ward by ID."""
    ward = service.get_ward(db, ward_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Update a ward."""
    ward = service.update_ward(db, ward_id, body, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Delete a ward."""
    deleted = service.delete_ward(db, ward_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """List beds with optional ward and status filters."""
    data = service.list_beds(db, access.tenant_id, ward_id=ward_id, status=status, skip=skip, limit=limit)
    return ResponseEnvelope(data=data)


@router.post(
    "/beds",
    operation_id="createBed",
    response_model=ResponseEnvelope[BedRead],
    status_code=201,
)
def create_bed(
    body: BedCreate,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Create a new bed."""
    bed = service.create_bed(db, body, access.tenant_id)
    data = service._bed_to_read(bed)
    return ResponseEnvelope(data=data, message="Bed created successfully")


@router.get(
    "/beds/{bed_id}",
    operation_id="getBed",
    response_model=ResponseEnvelope[BedRead],
)
def get_bed(
    bed_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get a single bed by ID."""
    bed = service.get_bed(db, bed_id, access.tenant_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    data = service._bed_to_read(bed)
    return ResponseEnvelope(data=data)


@router.patch(
    "/beds/{bed_id}",
    operation_id="updateBed",
    response_model=ResponseEnvelope[BedRead],
)
def update_bed(
    bed_id: str,
    body: BedUpdate,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Update a bed."""
    bed = service.update_bed(db, bed_id, body, access.tenant_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    data = service._bed_to_read(bed)
    return ResponseEnvelope(data=data, message="Bed updated successfully")


@router.delete(
    "/beds/{bed_id}",
    operation_id="deleteBed",
    response_model=ResponseEnvelope,
)
def delete_bed(
    bed_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Delete a bed."""
    deleted = service.delete_bed(db, bed_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """List admissions with optional filters."""
    data = service.list_admissions(
        db, access.tenant_id, status=status, ward_id=ward_id,
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Create a new inpatient admission."""
    admission = service.create_admission(db, body, access.tenant_id)
    data = AdmissionRead.model_validate(admission)
    return ResponseEnvelope(data=data, message="Admission created successfully")


@router.get(
    "/admissions/{admission_id}",
    operation_id="getAdmission",
    response_model=ResponseEnvelope[AdmissionRead],
)
def get_admission(
    admission_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get a single admission by ID."""
    admission = service.get_admission(db, admission_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Update an admission."""
    admission = service.update_admission(db, admission_id, body, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Discharge a patient from inpatient care."""
    admission = service.discharge_admission(db, admission_id, body, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Transfer a patient to a different ward/bed."""
    admission = service.transfer_admission(db, admission_id, body, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Delete an admission record."""
    deleted = service.delete_admission(db, admission_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get intake/output balance for an admission."""
    data = service.get_io_balance(db, admission_id, access.tenant_id, date_from=date_from, date_to=date_to)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """List nursing observations with optional filters."""
    data = service.list_nursing_observations(
        db, access.tenant_id, admission_id=admission_id,
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
    access: UnifiedAccess = Depends(require_access("inpatient.nursing")),
    db: Session = Depends(get_db),
):
    """Record a new nursing observation."""
    obs = service.create_nursing_observation(db, body, access.tenant_id)
    data = service._observation_to_read(obs)
    return ResponseEnvelope(data=data, message="Nursing observation recorded")


@router.get(
    "/nursing-observations/{observation_id}",
    operation_id="getNursingObservation",
    response_model=ResponseEnvelope[NursingObservationRead],
)
def get_nursing_observation(
    observation_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get a single nursing observation by ID."""
    obs = service.get_nursing_observation(db, observation_id, access.tenant_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Nursing observation not found")
    data = service._observation_to_read(obs)
    return ResponseEnvelope(data=data)


@router.patch(
    "/nursing-observations/{observation_id}",
    operation_id="updateNursingObservation",
    response_model=ResponseEnvelope[NursingObservationRead],
)
def update_nursing_observation(
    observation_id: str,
    body: NursingObservationUpdate,
    access: UnifiedAccess = Depends(require_access("inpatient.nursing")),
    db: Session = Depends(get_db),
):
    """Update a nursing observation."""
    obs = service.update_nursing_observation(db, observation_id, body, access.tenant_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Nursing observation not found")
    data = service._observation_to_read(obs)
    return ResponseEnvelope(data=data, message="Nursing observation updated")


@router.delete(
    "/nursing-observations/{observation_id}",
    operation_id="deleteNursingObservation",
    response_model=ResponseEnvelope,
)
def delete_nursing_observation(
    observation_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.nursing")),
    db: Session = Depends(get_db),
):
    """Delete a nursing observation."""
    deleted = service.delete_nursing_observation(db, observation_id, access.tenant_id)
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
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """List nurse orders with optional filters."""
    data = service.list_nurse_orders(
        db, access.tenant_id, admission_id=admission_id,
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
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Create a new nurse order."""
    order = service.create_nurse_order(db, body, access.tenant_id)
    data = service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order created")


@router.get(
    "/nurse-orders/{order_id}",
    operation_id="getNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def get_nurse_order(
    order_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.view")),
    db: Session = Depends(get_db),
):
    """Get a single nurse order by ID."""
    order = service.get_nurse_order(db, order_id, access.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = service._order_to_read(order)
    return ResponseEnvelope(data=data)


@router.patch(
    "/nurse-orders/{order_id}",
    operation_id="updateNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def update_nurse_order(
    order_id: str,
    body: NurseOrderUpdate,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Update a nurse order."""
    order = service.update_nurse_order(db, order_id, body, access.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order updated")


@router.post(
    "/nurse-orders/{order_id}/execute",
    operation_id="executeNurseOrder",
    response_model=ResponseEnvelope[NurseOrderRead],
)
def execute_nurse_order(
    order_id: str,
    body: NurseOrderExecute,
    access: UnifiedAccess = Depends(require_access("inpatient.nursing")),
    db: Session = Depends(get_db),
):
    """Mark a nurse order as executed."""
    order = service.execute_nurse_order(db, order_id, body, access.tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    data = service._order_to_read(order)
    return ResponseEnvelope(data=data, message="Nurse order executed")


@router.delete(
    "/nurse-orders/{order_id}",
    operation_id="deleteNurseOrder",
    response_model=ResponseEnvelope,
)
def delete_nurse_order(
    order_id: str,
    access: UnifiedAccess = Depends(require_access("inpatient.manage")),
    db: Session = Depends(get_db),
):
    """Delete a nurse order."""
    deleted = service.delete_nurse_order(db, order_id, access.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Nurse order not found")
    return ResponseEnvelope(message="Nurse order deleted")
