"""
Pharmacy Service Router
REST endpoints for stock management, dispensing, returns, interaction checks,
expiry alerts, narcotic tracking, movement history, and patient medication history.
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from schemas.base import ResponseEnvelope, ResponseMeta

from . import service
from .schemas import (
    PharmacyStockCreate,
    PharmacyStockUpdate,
    PharmacyStockRead,
    PharmacyDispensingCreate,
    PharmacyDispensingUpdate,
    PharmacyDispensingRead,
    DrugInteractionCreate,
    DrugInteractionUpdate,
    DrugInteractionRead,
    StockMovementCreate,
    StockMovementRead,
    InteractionCheckRequest,
    InteractionCheckResponse,
    ExpiryAlertResponse,
    NarcoticReportResponse,
    ReturnRequest,
    PatientMedicationHistoryItem,
)

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])


# ---------------------------------------------------------------------------
# Helper: extract tenant_id from session info
# ---------------------------------------------------------------------------

def _get_tenant_id(db: Session) -> str:
    tenant_id = db.info.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context is required")
    return tenant_id


# ===========================================================================
# STOCK ENDPOINTS
# ===========================================================================

@router.post("/stocks", response_model=ResponseEnvelope)
def create_stock(payload: PharmacyStockCreate, db: Session = Depends(get_db)):
    """Create a new pharmacy stock record."""
    tenant_id = _get_tenant_id(db)
    stock = service.create_stock(db, payload, tenant_id)
    return ResponseEnvelope.create_success(data=stock.to_dict(), message="Stock created")


@router.get("/stocks", response_model=ResponseEnvelope)
def list_stocks(
    medication_id: Optional[str] = Query(None),
    is_narcotic: Optional[bool] = Query(None),
    storage_conditions: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List pharmacy stock items with optional filters."""
    items, total = service.list_stocks(db, medication_id, is_narcotic, storage_conditions, skip, limit)
    return ResponseEnvelope.create_success(
        data=[s.to_dict() for s in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.get("/stocks/{stock_id}", response_model=ResponseEnvelope)
def get_stock(stock_id: str, db: Session = Depends(get_db)):
    """Get a single stock item by ID."""
    stock = service.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.create_success(data=stock.to_dict())


@router.patch("/stocks/{stock_id}", response_model=ResponseEnvelope)
def update_stock(stock_id: str, payload: PharmacyStockUpdate, db: Session = Depends(get_db)):
    """Update an existing stock record."""
    stock = service.update_stock(db, stock_id, payload)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.create_success(data=stock.to_dict(), message="Stock updated")


@router.delete("/stocks/{stock_id}", response_model=ResponseEnvelope)
def delete_stock(stock_id: str, db: Session = Depends(get_db)):
    """Delete a stock record."""
    deleted = service.delete_stock(db, stock_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.create_success(message="Stock deleted")


# ===========================================================================
# DISPENSING ENDPOINTS
# ===========================================================================

@router.post("/dispensings", response_model=ResponseEnvelope)
def create_dispensing(payload: PharmacyDispensingCreate, db: Session = Depends(get_db)):
    """Dispense medication to a patient."""
    tenant_id = _get_tenant_id(db)
    dispensing = service.create_dispensing(db, payload, tenant_id)
    return ResponseEnvelope.create_success(data=dispensing.to_dict(), message="Medication dispensed")


@router.get("/dispensings", response_model=ResponseEnvelope)
def list_dispensings(
    patient_id: Optional[str] = Query(None),
    prescription_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List dispensing records with optional filters."""
    items, total = service.list_dispensings(db, patient_id, prescription_id, status, skip, limit)
    return ResponseEnvelope.create_success(
        data=[d.to_dict() for d in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.get("/dispensings/{dispensing_id}", response_model=ResponseEnvelope)
def get_dispensing(dispensing_id: str, db: Session = Depends(get_db)):
    """Get a single dispensing record."""
    dispensing = service.get_dispensing(db, dispensing_id)
    if not dispensing:
        raise HTTPException(status_code=404, detail="Dispensing record not found")
    return ResponseEnvelope.create_success(data=dispensing.to_dict())


@router.post("/dispensings/return", response_model=ResponseEnvelope)
def process_return(payload: ReturnRequest, db: Session = Depends(get_db)):
    """Process a medication return. Returns stock to inventory."""
    dispensing = service.process_return(
        db,
        dispensing_id=payload.dispensing_id,
        return_reason=payload.return_reason,
        quantity_returned=payload.quantity_returned,
    )
    if not dispensing:
        raise HTTPException(status_code=404, detail="Dispensing not found or not eligible for return")
    return ResponseEnvelope.create_success(data=dispensing.to_dict(), message="Return processed")


# ===========================================================================
# DRUG INTERACTION ENDPOINTS
# ===========================================================================

@router.post("/interactions/check", response_model=ResponseEnvelope)
def check_interactions(payload: InteractionCheckRequest, db: Session = Depends(get_db)):
    """Check drug-drug interactions for a list of drug codes."""
    result = service.check_interactions(db, payload.drug_codes)
    return ResponseEnvelope.create_success(data=result.model_dump(by_alias=True))


@router.post("/interactions", response_model=ResponseEnvelope)
def create_interaction(payload: DrugInteractionCreate, db: Session = Depends(get_db)):
    """Create a new drug interaction record."""
    interaction = service.create_interaction(db, payload)
    return ResponseEnvelope.create_success(data=interaction.to_dict(), message="Interaction created")


@router.get("/interactions", response_model=ResponseEnvelope)
def list_interactions(
    drug_code: Optional[str] = Query(None, description="Filter by drug code (A or B)"),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List drug interaction records."""
    from .models.drug_interaction import DrugInteraction
    from sqlalchemy import or_

    q = db.query(DrugInteraction)
    if drug_code:
        q = q.filter(
            or_(DrugInteraction.drug_a_code == drug_code, DrugInteraction.drug_b_code == drug_code)
        )
    if severity:
        q = q.filter(DrugInteraction.severity == severity)
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return ResponseEnvelope.create_success(
        data=[i.to_dict() for i in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.patch("/interactions/{interaction_id}", response_model=ResponseEnvelope)
def update_interaction(interaction_id: str, payload: DrugInteractionUpdate, db: Session = Depends(get_db)):
    """Update a drug interaction record."""
    interaction = service.update_interaction(db, interaction_id, payload)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return ResponseEnvelope.create_success(data=interaction.to_dict(), message="Interaction updated")


@router.delete("/interactions/{interaction_id}", response_model=ResponseEnvelope)
def delete_interaction(interaction_id: str, db: Session = Depends(get_db)):
    """Delete a drug interaction record."""
    deleted = service.delete_interaction(db, interaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return ResponseEnvelope.create_success(message="Interaction deleted")


# ===========================================================================
# STOCK MOVEMENT ENDPOINTS
# ===========================================================================

@router.post("/movements", response_model=ResponseEnvelope)
def create_movement(payload: StockMovementCreate, db: Session = Depends(get_db)):
    """Record a manual stock movement (purchase, adjustment, transfer, etc.)."""
    tenant_id = _get_tenant_id(db)
    movement = service.create_stock_movement(db, payload, tenant_id)
    return ResponseEnvelope.create_success(data=movement.to_dict(), message="Movement recorded")


@router.get("/movements", response_model=ResponseEnvelope)
def list_movements(
    pharmacy_stock_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List stock movements with optional filters."""
    items, total = service.list_stock_movements(db, pharmacy_stock_id, movement_type, skip, limit)
    return ResponseEnvelope.create_success(
        data=[m.to_dict() for m in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


# ===========================================================================
# ALERTS & REPORTS
# ===========================================================================

@router.get("/alerts/expiry", response_model=ResponseEnvelope)
def get_expiry_alerts(
    days: int = Query(30, ge=1, le=365, description="Days threshold for expiring soon"),
    db: Session = Depends(get_db),
):
    """Get expired and soon-to-expire medications."""
    result = service.get_expiry_alerts(db, days_threshold=days)
    return ResponseEnvelope.create_success(data=result.model_dump(by_alias=True))


@router.get("/reports/narcotics", response_model=ResponseEnvelope)
def get_narcotic_report(db: Session = Depends(get_db)):
    """Get narcotic/controlled substance inventory report."""
    result = service.get_narcotic_report(db)
    return ResponseEnvelope.create_success(data=result.model_dump(by_alias=True))


@router.get("/patients/{patient_id}/medications", response_model=ResponseEnvelope)
def get_patient_medication_history(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get medication dispensing history for a specific patient."""
    items, total = service.get_patient_medication_history(db, patient_id, skip, limit)
    return ResponseEnvelope.create_success(
        data=[i.model_dump(by_alias=True) for i in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )
