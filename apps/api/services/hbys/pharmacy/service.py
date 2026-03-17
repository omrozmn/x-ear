"""
Pharmacy Service Layer
Business logic for expiry alerts, narcotic tracking, interaction checking,
stock management, and dispensing operations.
"""
from datetime import date, timedelta
from typing import List, Optional, Tuple
import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_

from .models.pharmacy_stock import PharmacyStock
from .models.pharmacy_dispensing import PharmacyDispensing
from .models.drug_interaction import DrugInteraction
from .models.stock_movement import StockMovement
from .schemas import (
    PharmacyStockCreate,
    PharmacyStockUpdate,
    PharmacyDispensingCreate,
    PharmacyDispensingUpdate,
    StockMovementCreate,
    DrugInteractionCreate,
    DrugInteractionUpdate,
    InteractionCheckResult,
    InteractionCheckResponse,
    ExpiryAlertItem,
    ExpiryAlertResponse,
    NarcoticStockItem,
    NarcoticReportResponse,
    PatientMedicationHistoryItem,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stock CRUD
# ---------------------------------------------------------------------------

def create_stock(db: Session, data: PharmacyStockCreate, tenant_id: str) -> PharmacyStock:
    stock = PharmacyStock(
        medication_id=data.medication_id,
        lot_number=data.lot_number,
        barcode=data.barcode,
        quantity_on_hand=data.quantity_on_hand,
        quantity_reserved=data.quantity_reserved,
        unit_cost=data.unit_cost,
        expiry_date=data.expiry_date,
        storage_location=data.storage_location,
        storage_conditions=data.storage_conditions,
        its_tracking_number=data.its_tracking_number,
        is_narcotic=data.is_narcotic,
        supplier_id=data.supplier_id,
        tenant_id=tenant_id,
    )
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return stock


def get_stock(db: Session, stock_id: str) -> Optional[PharmacyStock]:
    return db.query(PharmacyStock).filter(PharmacyStock.id == stock_id).first()


def list_stocks(
    db: Session,
    medication_id: Optional[str] = None,
    is_narcotic: Optional[bool] = None,
    storage_conditions: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[PharmacyStock], int]:
    q = db.query(PharmacyStock)
    if medication_id:
        q = q.filter(PharmacyStock.medication_id == medication_id)
    if is_narcotic is not None:
        q = q.filter(PharmacyStock.is_narcotic == is_narcotic)
    if storage_conditions:
        q = q.filter(PharmacyStock.storage_conditions == storage_conditions)
    total = q.count()
    items = q.order_by(PharmacyStock.expiry_date.asc()).offset(skip).limit(limit).all()
    return items, total


def update_stock(db: Session, stock_id: str, data: PharmacyStockUpdate) -> Optional[PharmacyStock]:
    stock = get_stock(db, stock_id)
    if not stock:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stock, key, value)
    db.commit()
    db.refresh(stock)
    return stock


def delete_stock(db: Session, stock_id: str) -> bool:
    stock = get_stock(db, stock_id)
    if not stock:
        return False
    db.delete(stock)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Dispensing
# ---------------------------------------------------------------------------

def create_dispensing(db: Session, data: PharmacyDispensingCreate, tenant_id: str) -> PharmacyDispensing:
    dispensing = PharmacyDispensing(
        prescription_id=data.prescription_id,
        prescription_item_id=data.prescription_item_id,
        patient_id=data.patient_id,
        medication_id=data.medication_id,
        quantity_dispensed=data.quantity_dispensed,
        lot_number=data.lot_number,
        dispensed_by=data.dispensed_by,
        status="dispensed",
        notes=data.notes,
        tenant_id=tenant_id,
    )
    db.add(dispensing)

    # Deduct from stock if lot_number is provided
    if data.lot_number:
        stock = (
            db.query(PharmacyStock)
            .filter(
                PharmacyStock.medication_id == data.medication_id,
                PharmacyStock.lot_number == data.lot_number,
            )
            .first()
        )
        if stock:
            stock.quantity_on_hand = max(0, stock.quantity_on_hand - data.quantity_dispensed)
            # Record stock movement
            movement = StockMovement(
                pharmacy_stock_id=stock.id,
                movement_type="dispensing",
                quantity=-data.quantity_dispensed,
                reference_id=dispensing.id,
                performed_by=data.dispensed_by,
                notes=f"Dispensed to patient {data.patient_id}",
                tenant_id=tenant_id,
            )
            db.add(movement)

    db.commit()
    db.refresh(dispensing)
    return dispensing


def get_dispensing(db: Session, dispensing_id: str) -> Optional[PharmacyDispensing]:
    return db.query(PharmacyDispensing).filter(PharmacyDispensing.id == dispensing_id).first()


def list_dispensings(
    db: Session,
    patient_id: Optional[str] = None,
    prescription_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[PharmacyDispensing], int]:
    q = db.query(PharmacyDispensing)
    if patient_id:
        q = q.filter(PharmacyDispensing.patient_id == patient_id)
    if prescription_id:
        q = q.filter(PharmacyDispensing.prescription_id == prescription_id)
    if status:
        q = q.filter(PharmacyDispensing.status == status)
    total = q.count()
    items = q.order_by(PharmacyDispensing.dispensed_at.desc()).offset(skip).limit(limit).all()
    return items, total


def process_return(
    db: Session,
    dispensing_id: str,
    return_reason: str,
    quantity_returned: Optional[int] = None,
    performed_by: Optional[str] = None,
) -> Optional[PharmacyDispensing]:
    """Process a medication return. Returns stock to inventory."""
    dispensing = get_dispensing(db, dispensing_id)
    if not dispensing or dispensing.status not in ("dispensed",):
        return None

    qty = quantity_returned or dispensing.quantity_dispensed
    dispensing.status = "returned"
    dispensing.return_reason = return_reason

    # Return to stock
    if dispensing.lot_number:
        stock = (
            db.query(PharmacyStock)
            .filter(
                PharmacyStock.medication_id == dispensing.medication_id,
                PharmacyStock.lot_number == dispensing.lot_number,
            )
            .first()
        )
        if stock:
            stock.quantity_on_hand += qty
            actor = performed_by or dispensing.dispensed_by
            movement = StockMovement(
                pharmacy_stock_id=stock.id,
                movement_type="return",
                quantity=qty,
                reference_id=dispensing.id,
                performed_by=actor,
                notes=f"Return: {return_reason}",
                tenant_id=dispensing.tenant_id,
            )
            db.add(movement)

    db.commit()
    db.refresh(dispensing)
    return dispensing


# ---------------------------------------------------------------------------
# Drug Interaction Checking
# ---------------------------------------------------------------------------

def check_interactions(db: Session, drug_codes: List[str]) -> InteractionCheckResponse:
    """Check all pairwise interactions for a list of drug codes."""
    if len(drug_codes) < 2:
        return InteractionCheckResponse(has_interactions=False, interactions=[], checked_pairs=0)

    pairs_checked = 0
    found: List[InteractionCheckResult] = []

    for i in range(len(drug_codes)):
        for j in range(i + 1, len(drug_codes)):
            code_a, code_b = drug_codes[i], drug_codes[j]
            pairs_checked += 1

            interactions = (
                db.query(DrugInteraction)
                .filter(
                    or_(
                        (DrugInteraction.drug_a_code == code_a) & (DrugInteraction.drug_b_code == code_b),
                        (DrugInteraction.drug_a_code == code_b) & (DrugInteraction.drug_b_code == code_a),
                    )
                )
                .all()
            )
            for ix in interactions:
                found.append(
                    InteractionCheckResult(
                        drug_a_code=ix.drug_a_code,
                        drug_a_name=ix.drug_a_name,
                        drug_b_code=ix.drug_b_code,
                        drug_b_name=ix.drug_b_name,
                        severity=ix.severity,
                        description_tr=ix.description_tr,
                        clinical_effect=ix.clinical_effect,
                        management=ix.management,
                    )
                )

    return InteractionCheckResponse(
        has_interactions=len(found) > 0,
        interactions=found,
        checked_pairs=pairs_checked,
    )


def create_interaction(db: Session, data: DrugInteractionCreate) -> DrugInteraction:
    interaction = DrugInteraction(
        drug_a_code=data.drug_a_code,
        drug_a_name=data.drug_a_name,
        drug_b_code=data.drug_b_code,
        drug_b_name=data.drug_b_name,
        severity=data.severity,
        description_tr=data.description_tr,
        description_en=data.description_en,
        clinical_effect=data.clinical_effect,
        management=data.management,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def update_interaction(db: Session, interaction_id: str, data: DrugInteractionUpdate) -> Optional[DrugInteraction]:
    interaction = db.query(DrugInteraction).filter(DrugInteraction.id == interaction_id).first()
    if not interaction:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(interaction, key, value)
    db.commit()
    db.refresh(interaction)
    return interaction


def delete_interaction(db: Session, interaction_id: str) -> bool:
    interaction = db.query(DrugInteraction).filter(DrugInteraction.id == interaction_id).first()
    if not interaction:
        return False
    db.delete(interaction)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Stock Movements
# ---------------------------------------------------------------------------

def create_stock_movement(db: Session, data: StockMovementCreate, tenant_id: str) -> StockMovement:
    """Record a stock movement and update stock quantity accordingly."""
    movement = StockMovement(
        pharmacy_stock_id=data.pharmacy_stock_id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        reference_id=data.reference_id,
        performed_by=data.performed_by,
        notes=data.notes,
        tenant_id=tenant_id,
    )
    db.add(movement)

    # Update stock quantity
    stock = get_stock(db, data.pharmacy_stock_id)
    if stock:
        stock.quantity_on_hand += data.quantity

    db.commit()
    db.refresh(movement)
    return movement


def list_stock_movements(
    db: Session,
    pharmacy_stock_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[StockMovement], int]:
    q = db.query(StockMovement)
    if pharmacy_stock_id:
        q = q.filter(StockMovement.pharmacy_stock_id == pharmacy_stock_id)
    if movement_type:
        q = q.filter(StockMovement.movement_type == movement_type)
    total = q.count()
    items = q.order_by(StockMovement.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


# ---------------------------------------------------------------------------
# Expiry Alerts
# ---------------------------------------------------------------------------

def get_expiry_alerts(db: Session, days_threshold: int = 30) -> ExpiryAlertResponse:
    """Get expired and soon-to-expire medications."""
    today = date.today()
    threshold_date = today + timedelta(days=days_threshold)

    # Expired
    expired_stocks = (
        db.query(PharmacyStock)
        .filter(PharmacyStock.expiry_date < today, PharmacyStock.quantity_on_hand > 0)
        .order_by(PharmacyStock.expiry_date.asc())
        .all()
    )

    # Expiring soon
    expiring_stocks = (
        db.query(PharmacyStock)
        .filter(
            PharmacyStock.expiry_date >= today,
            PharmacyStock.expiry_date <= threshold_date,
            PharmacyStock.quantity_on_hand > 0,
        )
        .order_by(PharmacyStock.expiry_date.asc())
        .all()
    )

    expired_items = [
        ExpiryAlertItem(
            stock_id=s.id,
            medication_id=s.medication_id,
            lot_number=s.lot_number,
            quantity_on_hand=s.quantity_on_hand,
            expiry_date=s.expiry_date,
            days_until_expiry=(s.expiry_date - today).days,
            storage_location=s.storage_location,
        )
        for s in expired_stocks
    ]

    expiring_items = [
        ExpiryAlertItem(
            stock_id=s.id,
            medication_id=s.medication_id,
            lot_number=s.lot_number,
            quantity_on_hand=s.quantity_on_hand,
            expiry_date=s.expiry_date,
            days_until_expiry=(s.expiry_date - today).days,
            storage_location=s.storage_location,
        )
        for s in expiring_stocks
    ]

    return ExpiryAlertResponse(
        expired=expired_items,
        expiring_soon=expiring_items,
        total_expired=len(expired_items),
        total_expiring_soon=len(expiring_items),
    )


# ---------------------------------------------------------------------------
# Narcotic Tracking
# ---------------------------------------------------------------------------

def get_narcotic_report(db: Session) -> NarcoticReportResponse:
    """Get all narcotic/controlled substance stock items."""
    narcotics = (
        db.query(PharmacyStock)
        .filter(PharmacyStock.is_narcotic == True)  # noqa: E712
        .order_by(PharmacyStock.medication_id.asc())
        .all()
    )

    items = [
        NarcoticStockItem(
            stock_id=s.id,
            medication_id=s.medication_id,
            lot_number=s.lot_number,
            quantity_on_hand=s.quantity_on_hand,
            quantity_reserved=s.quantity_reserved,
            its_tracking_number=s.its_tracking_number,
            storage_location=s.storage_location,
        )
        for s in narcotics
    ]

    return NarcoticReportResponse(items=items, total_narcotic_items=len(items))


# ---------------------------------------------------------------------------
# Patient Medication History
# ---------------------------------------------------------------------------

def get_patient_medication_history(
    db: Session,
    patient_id: str,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[PatientMedicationHistoryItem], int]:
    """Get full medication dispensing history for a patient."""
    q = db.query(PharmacyDispensing).filter(PharmacyDispensing.patient_id == patient_id)
    total = q.count()
    dispensings = q.order_by(PharmacyDispensing.dispensed_at.desc()).offset(skip).limit(limit).all()

    items = [
        PatientMedicationHistoryItem(
            dispensing_id=d.id,
            prescription_id=d.prescription_id,
            medication_id=d.medication_id,
            quantity_dispensed=d.quantity_dispensed,
            dispensed_at=d.dispensed_at,
            status=d.status,
            lot_number=d.lot_number,
            dispensed_by=d.dispensed_by,
            notes=d.notes,
        )
        for d in dispensings
    ]

    return items, total
