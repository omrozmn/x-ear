"""
Pharmacy Service Router
REST endpoints for stock management, dispensing, returns, interaction checks,
expiry alerts, narcotic tracking, movement history, and patient medication history.
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from main import get_db
from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope, ResponseMeta

import service
from schemas import (
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

router = APIRouter(prefix="/api/hbys/pharmacy", tags=["Pharmacy"])


# ===========================================================================
# STOCK ENDPOINTS
# ===========================================================================

@router.post("/stocks", response_model=ResponseEnvelope)
def create_stock(
    payload: PharmacyStockCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new pharmacy stock record."""
    stock = service.create_stock(db, payload, user.tenant_id)
    return ResponseEnvelope.ok(data=stock.to_dict())


@router.get("/stocks", response_model=ResponseEnvelope)
def list_stocks(
    medication_id: Optional[str] = Query(None),
    is_narcotic: Optional[bool] = Query(None),
    storage_conditions: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List pharmacy stock items with optional filters."""
    items, total = service.list_stocks(db, medication_id, is_narcotic, storage_conditions, skip, limit)
    return ResponseEnvelope.ok(
        data=[s.to_dict() for s in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.get("/stocks/{stock_id}", response_model=ResponseEnvelope)
def get_stock(
    stock_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single stock item by ID."""
    stock = service.get_stock(db, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.ok(data=stock.to_dict())


@router.patch("/stocks/{stock_id}", response_model=ResponseEnvelope)
def update_stock(
    stock_id: str,
    payload: PharmacyStockUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing stock record."""
    stock = service.update_stock(db, stock_id, payload)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.ok(data=stock.to_dict())


@router.delete("/stocks/{stock_id}", response_model=ResponseEnvelope)
def delete_stock(
    stock_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a stock record."""
    deleted = service.delete_stock(db, stock_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Stock not found")
    return ResponseEnvelope.ok()


# ===========================================================================
# DISPENSING ENDPOINTS
# ===========================================================================

@router.post("/dispensings", response_model=ResponseEnvelope)
def create_dispensing(
    payload: PharmacyDispensingCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dispense medication to a patient."""
    dispensing = service.create_dispensing(db, payload, user.tenant_id)
    return ResponseEnvelope.ok(data=dispensing.to_dict())


@router.get("/dispensings", response_model=ResponseEnvelope)
def list_dispensings(
    patient_id: Optional[str] = Query(None),
    prescription_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List dispensing records with optional filters."""
    items, total = service.list_dispensings(db, patient_id, prescription_id, status, skip, limit)
    return ResponseEnvelope.ok(
        data=[d.to_dict() for d in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.get("/dispensings/{dispensing_id}", response_model=ResponseEnvelope)
def get_dispensing(
    dispensing_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single dispensing record."""
    dispensing = service.get_dispensing(db, dispensing_id)
    if not dispensing:
        raise HTTPException(status_code=404, detail="Dispensing record not found")
    return ResponseEnvelope.ok(data=dispensing.to_dict())


@router.post("/dispensings/return", response_model=ResponseEnvelope)
def process_return(
    payload: ReturnRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a medication return. Returns stock to inventory."""
    dispensing = service.process_return(
        db,
        dispensing_id=payload.dispensing_id,
        return_reason=payload.return_reason,
        quantity_returned=payload.quantity_returned,
    )
    if not dispensing:
        raise HTTPException(status_code=404, detail="Dispensing not found or not eligible for return")
    return ResponseEnvelope.ok(data=dispensing.to_dict())


# ===========================================================================
# DRUG INTERACTION ENDPOINTS
# ===========================================================================

@router.post("/interactions/check", response_model=ResponseEnvelope)
def check_interactions(
    payload: InteractionCheckRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check drug-drug interactions for a list of drug codes."""
    result = service.check_interactions(db, payload.drug_codes)
    return ResponseEnvelope.ok(data=result.model_dump(by_alias=True))


@router.post("/interactions", response_model=ResponseEnvelope)
def create_interaction(
    payload: DrugInteractionCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new drug interaction record."""
    interaction = service.create_interaction(db, payload)
    return ResponseEnvelope.ok(data=interaction.to_dict())


@router.get("/interactions", response_model=ResponseEnvelope)
def list_interactions(
    drug_code: Optional[str] = Query(None, description="Filter by drug code (A or B)"),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List drug interaction records."""
    from models.drug_interaction import DrugInteraction
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
    return ResponseEnvelope.ok(
        data=[i.to_dict() for i in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


@router.patch("/interactions/{interaction_id}", response_model=ResponseEnvelope)
def update_interaction(
    interaction_id: str,
    payload: DrugInteractionUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a drug interaction record."""
    interaction = service.update_interaction(db, interaction_id, payload)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return ResponseEnvelope.ok(data=interaction.to_dict())


@router.delete("/interactions/{interaction_id}", response_model=ResponseEnvelope)
def delete_interaction(
    interaction_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a drug interaction record."""
    deleted = service.delete_interaction(db, interaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return ResponseEnvelope.ok()


# ===========================================================================
# STOCK MOVEMENT ENDPOINTS
# ===========================================================================

@router.post("/movements", response_model=ResponseEnvelope)
def create_movement(
    payload: StockMovementCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a manual stock movement (purchase, adjustment, transfer, etc.)."""
    movement = service.create_stock_movement(db, payload, user.tenant_id)
    return ResponseEnvelope.ok(data=movement.to_dict())


@router.get("/movements", response_model=ResponseEnvelope)
def list_movements(
    pharmacy_stock_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List stock movements with optional filters."""
    items, total = service.list_stock_movements(db, pharmacy_stock_id, movement_type, skip, limit)
    return ResponseEnvelope.ok(
        data=[m.to_dict() for m in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


# ===========================================================================
# ALERTS & REPORTS
# ===========================================================================

@router.get("/alerts/expiry", response_model=ResponseEnvelope)
def get_expiry_alerts(
    days: int = Query(30, ge=1, le=365, description="Days threshold for expiring soon"),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get expired and soon-to-expire medications."""
    result = service.get_expiry_alerts(db, days_threshold=days)
    return ResponseEnvelope.ok(data=result.model_dump(by_alias=True))


@router.get("/reports/narcotics", response_model=ResponseEnvelope)
def get_narcotic_report(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get narcotic/controlled substance inventory report."""
    result = service.get_narcotic_report(db)
    return ResponseEnvelope.ok(data=result.model_dump(by_alias=True))


@router.get("/patients/{patient_id}/medications", response_model=ResponseEnvelope)
def get_patient_medication_history(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get medication dispensing history for a specific patient."""
    items, total = service.get_patient_medication_history(db, patient_id, skip, limit)
    return ResponseEnvelope.ok(
        data=[i.model_dump(by_alias=True) for i in items],
        meta=ResponseMeta(total=total, page=skip // limit + 1, per_page=limit),
    )


# ===========================================================================
# AI-POWERED ENDPOINTS
# ===========================================================================

import ai_service
from pydantic import BaseModel


class ForecastRequest(BaseModel):
    history: List[dict]
    periods: int = 30


class ReorderPointRequest(BaseModel):
    history: List[dict]
    lead_time_days: int = 7
    safety_stock_days: int = 3
    current_stock: Optional[int] = None


class ExpiryOptimizationRequest(BaseModel):
    stock_items: List[dict]


class AnomalyDetectionRequest(BaseModel):
    history: List[dict]


class ProcurementPlanRequest(BaseModel):
    items: List[dict]
    budget: float


@router.post("/ai/forecast", response_model=ResponseEnvelope)
def ai_forecast(
    payload: ForecastRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Forecast drug consumption using Prophet time-series model."""
    try:
        result = ai_service.forecast_consumption(payload.history, payload.periods)
        return ResponseEnvelope.ok(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/reorder-point", response_model=ResponseEnvelope)
def ai_reorder_point(
    payload: ReorderPointRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Calculate reorder point and quantity based on historical consumption."""
    try:
        result = ai_service.calculate_reorder_point(
            payload.history,
            payload.lead_time_days,
            payload.safety_stock_days,
            payload.current_stock,
        )
        return ResponseEnvelope.ok(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/expiry-optimization", response_model=ResponseEnvelope)
def ai_expiry_optimization(
    payload: ExpiryOptimizationRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Optimize stock rotation using FEFO (First Expiry First Out) strategy."""
    result = ai_service.optimize_expiry_rotation(payload.stock_items)
    return ResponseEnvelope.ok(data=result)


@router.post("/ai/anomaly-detection", response_model=ResponseEnvelope)
def ai_anomaly_detection(
    payload: AnomalyDetectionRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Detect unusual consumption patterns (theft, waste, seasonal spikes)."""
    try:
        result = ai_service.detect_consumption_anomaly(payload.history)
        return ResponseEnvelope.ok(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
