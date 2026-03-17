"""
Laboratory Service
Business logic for lab orders, test execution, result entry, and verification.
Includes abnormal/critical value detection.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session, joinedload

from hbys_common.database import gen_id, now_utc, unbound_session
from hbys_common.events import event_bus

from models.lab_order import LabOrder
from models.lab_test import LabTest
from models.test_definition import TestDefinition
from schemas import (
    LabOrderCreate,
    LabOrderUpdate,
    SpecimenCollect,
    LabTestResultEntry,
    LabTestVerify,
    TestDefinitionCreate,
    TestDefinitionUpdate,
)

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _generate_barcode() -> str:
    """Generate a unique barcode string for specimen tubes."""
    import uuid
    ts = datetime.now(timezone.utc).strftime("%y%m%d%H%M")
    short = uuid.uuid4().hex[:6].upper()
    return f"LAB-{ts}-{short}"


def _detect_abnormal_critical(
    result_value: Optional[str],
    definition: Optional[TestDefinition],
    gender: Optional[str] = None,
    age: Optional[int] = None,
) -> Tuple[bool, bool]:
    """
    Evaluate whether a result is abnormal or critical based on the test definition.

    Returns:
        (is_abnormal, is_critical)
    """
    if not result_value or not definition:
        return False, False

    try:
        numeric_value = float(result_value)
    except (ValueError, TypeError):
        # Non-numeric result (e.g., culture text) -- cannot auto-evaluate
        return False, False

    # Determine reference range based on gender/age
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None

    if age is not None and age < 18 and (definition.ref_range_child_low is not None or definition.ref_range_child_high is not None):
        ref_low = definition.ref_range_child_low
        ref_high = definition.ref_range_child_high
    elif gender and gender.lower() in ("female", "f", "kadın", "k"):
        ref_low = definition.ref_range_female_low
        ref_high = definition.ref_range_female_high
    else:
        # Default to male / unisex ranges
        ref_low = definition.ref_range_male_low
        ref_high = definition.ref_range_male_high

    is_abnormal = False
    if ref_low is not None and numeric_value < ref_low:
        is_abnormal = True
    if ref_high is not None and numeric_value > ref_high:
        is_abnormal = True

    # Critical / panic values
    is_critical = False
    if definition.critical_low is not None and numeric_value < definition.critical_low:
        is_critical = True
    if definition.critical_high is not None and numeric_value > definition.critical_high:
        is_critical = True

    # A critical result is always abnormal
    if is_critical:
        is_abnormal = True

    return is_abnormal, is_critical


def _publish_critical_alert(test: "LabTest", result_value: str) -> None:
    """Fire-and-forget critical lab result notification via event bus."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(
                event_bus.publish(
                    "lab.critical_result",
                    {
                        "test_id": test.id,
                        "lab_order_id": test.lab_order_id,
                        "tenant_id": test.tenant_id,
                        "test_definition_id": test.test_definition_id,
                        "result_value": result_value,
                        "loinc_code": test.loinc_code,
                    },
                    source_service="hbys-laboratory",
                )
            )
        else:
            loop.run_until_complete(
                event_bus.publish(
                    "lab.critical_result",
                    {
                        "test_id": test.id,
                        "lab_order_id": test.lab_order_id,
                        "tenant_id": test.tenant_id,
                        "test_definition_id": test.test_definition_id,
                        "result_value": result_value,
                        "loinc_code": test.loinc_code,
                    },
                    source_service="hbys-laboratory",
                )
            )
    except Exception as exc:
        logger.error(f"Failed to publish critical lab alert for test {test.id}: {exc}")


def _update_order_status(db: Session, order: LabOrder) -> None:
    """
    Recalculate the parent order status based on its child tests.
    Rules:
      - All cancelled -> cancelled
      - All completed/verified -> completed
      - Any in_progress -> in_progress
      - Otherwise keep current status
    """
    statuses = [t.status for t in order.tests]
    if not statuses:
        return

    if all(s == "cancelled" for s in statuses):
        order.status = "cancelled"
    elif all(s in ("completed", "verified", "cancelled") for s in statuses):
        order.status = "completed"
    elif any(s == "in_progress" for s in statuses):
        order.status = "in_progress"


# ─── Lab Order Operations ───────────────────────────────────────────────────

def create_lab_order(
    db: Session,
    tenant_id: str,
    data: LabOrderCreate,
) -> LabOrder:
    """Create a new lab order with associated tests."""
    barcode = _generate_barcode()

    order = LabOrder(
        id=gen_id("lor"),
        tenant_id=tenant_id,
        encounter_id=data.encounter_id,
        patient_id=data.patient_id,
        ordered_by=data.ordered_by,
        order_date=now_utc(),
        status="ordered",
        priority=data.priority,
        clinical_info=data.clinical_info,
        specimen_type=data.specimen_type,
        barcode=barcode,
    )
    db.add(order)
    db.flush()

    # Add requested tests
    patient_gender = getattr(data, "patient_gender", None)
    for test_req in data.tests:
        definition = db.query(TestDefinition).filter(
            TestDefinition.id == test_req.test_definition_id,
            TestDefinition.tenant_id == tenant_id,
            TestDefinition.is_active == True,
        ).first()

        # Select reference range based on patient gender
        ref_low = None
        ref_high = None
        if definition:
            if patient_gender and patient_gender.lower() in ("female", "f", "kadın", "k"):
                ref_low = definition.ref_range_female_low
                ref_high = definition.ref_range_female_high
            else:
                ref_low = definition.ref_range_male_low
                ref_high = definition.ref_range_male_high

        lab_test = LabTest(
            id=gen_id("ltst"),
            tenant_id=tenant_id,
            lab_order_id=order.id,
            test_definition_id=test_req.test_definition_id,
            status="pending",
            result_unit=definition.unit if definition else None,
            reference_range_low=ref_low,
            reference_range_high=ref_high,
            loinc_code=definition.loinc_code if definition else None,
            notes=test_req.notes,
        )
        db.add(lab_test)

    db.commit()
    db.refresh(order)
    return order


def get_lab_order(db: Session, order_id: str, tenant_id: Optional[str] = None) -> Optional[LabOrder]:
    """Get a lab order by ID with its tests and definitions."""
    query = (
        db.query(LabOrder)
        .options(joinedload(LabOrder.tests).joinedload(LabTest.test_definition))
        .filter(LabOrder.id == order_id)
    )
    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)
    return query.first()


def list_lab_orders(
    db: Session,
    tenant_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[LabOrder], int]:
    """List lab orders with optional filters, returns (orders, total_count)."""
    query = db.query(LabOrder).options(
        joinedload(LabOrder.tests)
    )

    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)
    if patient_id:
        query = query.filter(LabOrder.patient_id == patient_id)
    if encounter_id:
        query = query.filter(LabOrder.encounter_id == encounter_id)
    if status:
        query = query.filter(LabOrder.status == status)
    if priority:
        query = query.filter(LabOrder.priority == priority)

    total = query.count()
    orders = query.order_by(LabOrder.order_date.desc()).offset(skip).limit(limit).all()
    return orders, total


def update_lab_order(
    db: Session,
    order_id: str,
    data: LabOrderUpdate,
    tenant_id: Optional[str] = None,
) -> Optional[LabOrder]:
    """Update a lab order's editable fields."""
    query = db.query(LabOrder).filter(LabOrder.id == order_id)
    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)
    order = query.first()
    if not order:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    db.commit()
    db.refresh(order)
    return order


def cancel_lab_order(db: Session, order_id: str, tenant_id: Optional[str] = None) -> Optional[LabOrder]:
    """Cancel a lab order and all its pending tests."""
    query = db.query(LabOrder).options(joinedload(LabOrder.tests)).filter(LabOrder.id == order_id)
    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)
    order = query.first()
    if not order:
        return None
    if order.status in ("completed", "cancelled"):
        return order

    order.status = "cancelled"
    for test in order.tests:
        if test.status in ("pending", "in_progress"):
            test.status = "cancelled"

    db.commit()
    db.refresh(order)
    return order


# ─── Specimen Collection ────────────────────────────────────────────────────

def collect_specimen(
    db: Session,
    order_id: str,
    data: SpecimenCollect,
    tenant_id: Optional[str] = None,
) -> Optional[LabOrder]:
    """Record specimen collection for a lab order."""
    query = db.query(LabOrder).filter(LabOrder.id == order_id)
    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)
    order = query.first()
    if not order:
        return None
    if order.status not in ("ordered",):
        logger.warning(f"Cannot collect specimen for order {order_id} in status {order.status}")
        return order

    order.collection_date = now_utc()
    order.collected_by = data.collected_by
    order.status = "collected"
    if data.barcode:
        order.barcode = data.barcode
    if data.specimen_type:
        order.specimen_type = data.specimen_type

    db.commit()
    db.refresh(order)
    return order


# ─── Result Entry & Verification ────────────────────────────────────────────

def enter_test_result(
    db: Session,
    test_id: str,
    data: LabTestResultEntry,
    patient_gender: Optional[str] = None,
    patient_age: Optional[int] = None,
    tenant_id: Optional[str] = None,
) -> Optional[LabTest]:
    """Enter a result for a single lab test. Auto-detects abnormal/critical."""
    query = (
        db.query(LabTest)
        .options(joinedload(LabTest.test_definition))
        .filter(LabTest.id == test_id)
    )
    if tenant_id:
        query = query.filter(LabTest.tenant_id == tenant_id)
    test = query.first()
    if not test:
        return None
    if test.status in ("verified", "cancelled"):
        logger.warning(f"Cannot enter result for test {test_id} in status {test.status}")
        return test

    test.result_value = data.result_value
    test.result_text = data.result_text
    if data.result_unit:
        test.result_unit = data.result_unit
    if data.performed_by:
        test.performed_by = data.performed_by
    if data.notes:
        test.notes = data.notes

    test.result_date = now_utc()
    test.status = "completed"

    # Auto-detect abnormal / critical
    is_abnormal, is_critical = _detect_abnormal_critical(
        result_value=data.result_value,
        definition=test.test_definition,
        gender=patient_gender,
        age=patient_age,
    )
    test.is_abnormal = is_abnormal
    test.is_critical = is_critical

    # Trigger critical lab alert notification
    if is_critical:
        _publish_critical_alert(test, data.result_value)

    # Update parent order status
    order = db.query(LabOrder).options(joinedload(LabOrder.tests)).filter(LabOrder.id == test.lab_order_id).first()
    if order:
        _update_order_status(db, order)

    db.commit()
    db.refresh(test)
    return test


def verify_test_result(
    db: Session,
    test_id: str,
    data: LabTestVerify,
    tenant_id: Optional[str] = None,
) -> Optional[LabTest]:
    """Verify / approve a completed test result (pathologist sign-off)."""
    query = db.query(LabTest).filter(LabTest.id == test_id)
    if tenant_id:
        query = query.filter(LabTest.tenant_id == tenant_id)
    test = query.first()
    if not test:
        return None
    if test.status != "completed":
        logger.warning(f"Cannot verify test {test_id} in status {test.status} (must be completed)")
        return test

    test.verified_by = data.verified_by
    test.verified_at = now_utc()
    test.status = "verified"
    if data.notes:
        test.notes = (test.notes or "") + f"\n[Verification] {data.notes}"

    # Update parent order status
    order = db.query(LabOrder).options(joinedload(LabOrder.tests)).filter(LabOrder.id == test.lab_order_id).first()
    if order:
        _update_order_status(db, order)

    db.commit()
    db.refresh(test)
    return test


# ─── Patient Lab History ────────────────────────────────────────────────────

def get_patient_lab_history(
    db: Session,
    patient_id: str,
    tenant_id: Optional[str] = None,
    test_definition_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[LabTest], int]:
    """
    Get a patient's lab result history.
    Optionally filter by a specific test type to see trends over time.
    """
    query = (
        db.query(LabTest)
        .join(LabOrder, LabTest.lab_order_id == LabOrder.id)
        .options(joinedload(LabTest.test_definition))
        .filter(LabOrder.patient_id == patient_id)
        .filter(LabTest.status.in_(["completed", "verified"]))
    )
    if tenant_id:
        query = query.filter(LabOrder.tenant_id == tenant_id)

    if test_definition_id:
        query = query.filter(LabTest.test_definition_id == test_definition_id)

    total = query.count()
    tests = query.order_by(LabTest.result_date.desc()).offset(skip).limit(limit).all()
    return tests, total


# ─── Test Definitions (catalogue) ───────────────────────────────────────────

def create_test_definition(
    db: Session,
    data: TestDefinitionCreate,
) -> TestDefinition:
    """Create a new test definition in the master catalogue."""
    definition = TestDefinition(
        id=gen_id("tdf"),
        **data.model_dump(),
    )
    db.add(definition)
    db.commit()
    db.refresh(definition)
    return definition


def update_test_definition(
    db: Session,
    definition_id: str,
    data: TestDefinitionUpdate,
    tenant_id: Optional[str] = None,
) -> Optional[TestDefinition]:
    """Update an existing test definition."""
    query = db.query(TestDefinition).filter(TestDefinition.id == definition_id)
    if tenant_id:
        query = query.filter(TestDefinition.tenant_id == tenant_id)
    definition = query.first()
    if not definition:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(definition, field, value)

    db.commit()
    db.refresh(definition)
    return definition


def search_test_definitions(
    db: Session,
    tenant_id: Optional[str] = None,
    query_str: Optional[str] = None,
    category: Optional[str] = None,
    specimen_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[TestDefinition], int]:
    """Search test definitions by name, category, or specimen type."""
    q = db.query(TestDefinition)

    if tenant_id:
        q = q.filter(TestDefinition.tenant_id == tenant_id)
    if is_active is not None:
        q = q.filter(TestDefinition.is_active == is_active)
    if category:
        q = q.filter(TestDefinition.category == category)
    if specimen_type:
        q = q.filter(TestDefinition.specimen_type == specimen_type)
    if query_str:
        search_pattern = f"%{query_str}%"
        q = q.filter(
            (TestDefinition.name_tr.ilike(search_pattern))
            | (TestDefinition.name_en.ilike(search_pattern))
            | (TestDefinition.loinc_code.ilike(search_pattern))
        )

    total = q.count()
    definitions = q.order_by(TestDefinition.category, TestDefinition.name_tr).offset(skip).limit(limit).all()
    return definitions, total


def get_test_definition(db: Session, definition_id: str, tenant_id: Optional[str] = None) -> Optional[TestDefinition]:
    """Get a single test definition by ID."""
    query = db.query(TestDefinition).filter(TestDefinition.id == definition_id)
    if tenant_id:
        query = query.filter(TestDefinition.tenant_id == tenant_id)
    return query.first()
