"""
Laboratory Service Router
REST API endpoints for lab orders, specimen collection, result entry/verification,
patient lab history, and test definition management.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from schemas.base import ResponseEnvelope, ResponseMeta

from .schemas import (
    LabOrderCreate,
    LabOrderUpdate,
    LabOrderRead,
    LabOrderSummary,
    SpecimenCollect,
    LabTestRead,
    LabTestResultEntry,
    LabTestVerify,
    TestDefinitionCreate,
    TestDefinitionUpdate,
    TestDefinitionRead,
)
from . import service

router = APIRouter(prefix="/hbys/laboratory", tags=["HBYS - Laboratory"])


# ─── Helper ─────────────────────────────────────────────────────────────────

def _get_tenant_id(db: Session) -> str:
    """Extract tenant_id from the database session info (set by middleware)."""
    tenant_id = db.info.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context not found")
    return tenant_id


# ─── Lab Orders ─────────────────────────────────────────────────────────────

@router.post(
    "/orders",
    response_model=ResponseEnvelope[LabOrderRead],
    status_code=201,
    summary="Create a lab order",
)
def create_order(
    body: LabOrderCreate,
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant_id(db)
    order = service.create_lab_order(db, tenant_id, body)
    order_data = LabOrderRead.model_validate(order)
    return ResponseEnvelope.create_success(data=order_data, message="Lab order created")


@router.get(
    "/orders",
    response_model=ResponseEnvelope[List[LabOrderSummary]],
    summary="List lab orders",
)
def list_orders(
    patient_id: Optional[str] = Query(None, alias="patientId"),
    encounter_id: Optional[str] = Query(None, alias="encounterId"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    orders, total = service.list_lab_orders(
        db,
        patient_id=patient_id,
        encounter_id=encounter_id,
        status=status,
        priority=priority,
        skip=skip,
        limit=limit,
    )

    summaries = []
    for o in orders:
        tests = o.tests or []
        summaries.append(
            LabOrderSummary(
                id=o.id,
                patient_id=o.patient_id,
                order_date=o.order_date,
                status=o.status,
                priority=o.priority,
                specimen_type=o.specimen_type,
                barcode=o.barcode,
                test_count=len(tests),
                completed_count=sum(1 for t in tests if t.status in ("completed", "verified")),
                has_abnormal=any(t.is_abnormal for t in tests),
                has_critical=any(t.is_critical for t in tests),
            )
        )

    meta = ResponseMeta(total=total, page=(skip // limit) + 1, per_page=limit)
    return ResponseEnvelope.create_success(data=summaries, meta=meta)


@router.get(
    "/orders/{order_id}",
    response_model=ResponseEnvelope[LabOrderRead],
    summary="Get a lab order with tests",
)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = service.get_lab_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")
    order_data = LabOrderRead.model_validate(order)
    return ResponseEnvelope.create_success(data=order_data)


@router.patch(
    "/orders/{order_id}",
    response_model=ResponseEnvelope[LabOrderRead],
    summary="Update a lab order",
)
def update_order(
    order_id: str,
    body: LabOrderUpdate,
    db: Session = Depends(get_db),
):
    order = service.update_lab_order(db, order_id, body)
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")
    order_data = LabOrderRead.model_validate(order)
    return ResponseEnvelope.create_success(data=order_data, message="Lab order updated")


@router.post(
    "/orders/{order_id}/cancel",
    response_model=ResponseEnvelope[LabOrderRead],
    summary="Cancel a lab order",
)
def cancel_order(order_id: str, db: Session = Depends(get_db)):
    order = service.cancel_lab_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")
    order_data = LabOrderRead.model_validate(order)
    return ResponseEnvelope.create_success(data=order_data, message="Lab order cancelled")


# ─── Specimen Collection ────────────────────────────────────────────────────

@router.post(
    "/orders/{order_id}/collect",
    response_model=ResponseEnvelope[LabOrderRead],
    summary="Record specimen collection",
)
def collect_specimen(
    order_id: str,
    body: SpecimenCollect,
    db: Session = Depends(get_db),
):
    order = service.collect_specimen(db, order_id, body)
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")
    order_data = LabOrderRead.model_validate(order)
    return ResponseEnvelope.create_success(data=order_data, message="Specimen collected")


# ─── Test Results ────────────────────────────────────────────────────────────

@router.post(
    "/tests/{test_id}/result",
    response_model=ResponseEnvelope[LabTestRead],
    summary="Enter a test result",
)
def enter_result(
    test_id: str,
    body: LabTestResultEntry,
    patient_gender: Optional[str] = Query(None, alias="patientGender"),
    patient_age: Optional[int] = Query(None, alias="patientAge"),
    db: Session = Depends(get_db),
):
    test = service.enter_test_result(
        db,
        test_id,
        body,
        patient_gender=patient_gender,
        patient_age=patient_age,
    )
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    test_data = LabTestRead.model_validate(test)
    return ResponseEnvelope.create_success(data=test_data, message="Result entered")


@router.post(
    "/tests/{test_id}/verify",
    response_model=ResponseEnvelope[LabTestRead],
    summary="Verify / approve a test result",
)
def verify_result(
    test_id: str,
    body: LabTestVerify,
    db: Session = Depends(get_db),
):
    test = service.verify_test_result(db, test_id, body)
    if not test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    test_data = LabTestRead.model_validate(test)
    return ResponseEnvelope.create_success(data=test_data, message="Result verified")


# ─── Patient Lab History ────────────────────────────────────────────────────

@router.get(
    "/patients/{patient_id}/history",
    response_model=ResponseEnvelope[List[LabTestRead]],
    summary="Get patient lab result history",
)
def patient_lab_history(
    patient_id: str,
    test_definition_id: Optional[str] = Query(None, alias="testDefinitionId"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    tests, total = service.get_patient_lab_history(
        db,
        patient_id,
        test_definition_id=test_definition_id,
        skip=skip,
        limit=limit,
    )
    tests_data = [LabTestRead.model_validate(t) for t in tests]
    meta = ResponseMeta(total=total, page=(skip // limit) + 1, per_page=limit)
    return ResponseEnvelope.create_success(data=tests_data, meta=meta)


# ─── Test Definitions ───────────────────────────────────────────────────────

@router.get(
    "/test-definitions",
    response_model=ResponseEnvelope[List[TestDefinitionRead]],
    summary="Search test definitions",
)
def search_definitions(
    q: Optional[str] = Query(None, description="Search by name or LOINC code"),
    category: Optional[str] = None,
    specimen_type: Optional[str] = Query(None, alias="specimenType"),
    is_active: Optional[bool] = Query(True, alias="isActive"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    definitions, total = service.search_test_definitions(
        db,
        query_str=q,
        category=category,
        specimen_type=specimen_type,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    defs_data = [TestDefinitionRead.model_validate(d) for d in definitions]
    meta = ResponseMeta(total=total, page=(skip // limit) + 1, per_page=limit)
    return ResponseEnvelope.create_success(data=defs_data, meta=meta)


@router.get(
    "/test-definitions/{definition_id}",
    response_model=ResponseEnvelope[TestDefinitionRead],
    summary="Get a test definition",
)
def get_definition(definition_id: str, db: Session = Depends(get_db)):
    definition = service.get_test_definition(db, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Test definition not found")
    def_data = TestDefinitionRead.model_validate(definition)
    return ResponseEnvelope.create_success(data=def_data)


@router.post(
    "/test-definitions",
    response_model=ResponseEnvelope[TestDefinitionRead],
    status_code=201,
    summary="Create a test definition",
)
def create_definition(
    body: TestDefinitionCreate,
    db: Session = Depends(get_db),
):
    definition = service.create_test_definition(db, body)
    def_data = TestDefinitionRead.model_validate(definition)
    return ResponseEnvelope.create_success(data=def_data, message="Test definition created")


@router.patch(
    "/test-definitions/{definition_id}",
    response_model=ResponseEnvelope[TestDefinitionRead],
    summary="Update a test definition",
)
def update_definition(
    definition_id: str,
    body: TestDefinitionUpdate,
    db: Session = Depends(get_db),
):
    definition = service.update_test_definition(db, definition_id, body)
    if not definition:
        raise HTTPException(status_code=404, detail="Test definition not found")
    def_data = TestDefinitionRead.model_validate(definition)
    return ResponseEnvelope.create_success(data=def_data, message="Test definition updated")
