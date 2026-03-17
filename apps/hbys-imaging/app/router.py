"""
Imaging Service Router
REST endpoints for imaging orders, radiology reports, viewer, and templates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope, ResponseMeta

from .schemas import (
    ImagingOrderCreate,
    ImagingOrderUpdate,
    ImagingOrderSchedule,
    ImagingOrderComplete,
    ImagingOrderRead,
    RadiologyReportCreate,
    RadiologyReportUpdate,
    RadiologyReportRead,
    ReportTemplateCreate,
    ReportTemplateUpdate,
    ReportTemplateRead,
    ViewerUrlResponse,
)
from .service import ImagingService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["HBYS Imaging"])


# ─── DB Dependency (wired at import time from main.py) ────────────────────────


def _get_db():
    """Placeholder – replaced at app startup via main.py's get_db_dependency."""
    raise RuntimeError("DB dependency not wired")


def set_db_dependency(dep):
    """Called from main.py to inject the real get_db dependency."""
    global _get_db
    _get_db = dep


def get_db():
    """Proxy so Depends(get_db) works as a generator dependency."""
    yield from _get_db()


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _ensure_tenant(user: CurrentUser) -> str:
    if not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail={"message": "Tenant context required", "code": "TENANT_REQUIRED"},
        )
    return user.tenant_id


def _not_found(entity: str = "Resource"):
    raise HTTPException(
        status_code=404,
        detail={"message": f"{entity} not found", "code": f"{entity.upper()}_NOT_FOUND"},
    )


def _build_meta(total: int, page: int, per_page: int) -> ResponseMeta:
    total_pages = max(1, (total + per_page - 1) // per_page)
    return ResponseMeta(
        total=total,
        page=page,
        per_page=per_page,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGING ORDERS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/orders", operation_id="listImagingOrders", response_model=ResponseEnvelope[List[ImagingOrderRead]])
def list_orders(
    patient_id: Optional[str] = Query(None, alias="patientId"),
    encounter_id: Optional[str] = Query(None, alias="encounterId"),
    modality: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """List imaging orders with optional filters."""
    tenant_id = _ensure_tenant(user)
    orders, total = ImagingService.list_orders(
        db_session, tenant_id, patient_id, encounter_id, modality, status, priority, page, per_page
    )
    return ResponseEnvelope.ok(
        data=[ImagingOrderRead.model_validate(o) for o in orders],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/orders/{order_id}", operation_id="getImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead])
def get_order(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Get a single imaging order by ID."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.get_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


@router.post("/orders", operation_id="createImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead], status_code=201)
def create_order(
    body: ImagingOrderCreate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Create a new imaging order."""
    tenant_id = _ensure_tenant(user)
    if not body.ordered_by:
        body.ordered_by = user.user_id
    order = ImagingService.create_order(db_session, tenant_id, body)
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


@router.put("/orders/{order_id}", operation_id="updateImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead])
def update_order(
    order_id: str,
    body: ImagingOrderUpdate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Update an existing imaging order."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.update_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


@router.delete("/orders/{order_id}", operation_id="deleteImagingOrder", response_model=ResponseEnvelope)
def delete_order(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Delete an imaging order."""
    tenant_id = _ensure_tenant(user)
    deleted = ImagingService.delete_order(db_session, tenant_id, order_id)
    if not deleted:
        _not_found("Imaging order")
    return ResponseEnvelope.ok()


@router.post(
    "/orders/{order_id}/schedule",
    operation_id="scheduleImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def schedule_order(
    order_id: str,
    body: ImagingOrderSchedule,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Schedule an imaging order."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.schedule_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


@router.post(
    "/orders/{order_id}/complete",
    operation_id="completeImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def complete_order(
    order_id: str,
    body: ImagingOrderComplete,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Mark an imaging order as completed."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.complete_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


@router.post(
    "/orders/{order_id}/cancel",
    operation_id="cancelImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def cancel_order(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Cancel an imaging order."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.cancel_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.ok(data=ImagingOrderRead.model_validate(order))


# ─── Viewer ───────────────────────────────────────────────────────────────────


@router.get(
    "/orders/{order_id}/viewer",
    operation_id="getImagingViewerUrl",
    response_model=ResponseEnvelope[ViewerUrlResponse],
)
def get_viewer_url(
    order_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Get OHIF/DICOM viewer URL for an imaging order."""
    tenant_id = _ensure_tenant(user)
    order = ImagingService.get_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")

    viewer_url = ImagingService.get_viewer_url(db_session, tenant_id, order_id)
    if not viewer_url:
        raise HTTPException(
            status_code=404,
            detail={"message": "No DICOM study linked to this order", "code": "NO_DICOM_STUDY"},
        )
    return ResponseEnvelope.ok(
        data=ViewerUrlResponse(
            viewer_url=viewer_url,
            orthanc_study_id=order.orthanc_study_id,
            dicom_study_uid=order.dicom_study_uid,
        )
    )


# ─── Patient History ─────────────────────────────────────────────────────────


@router.get(
    "/patients/{patient_id}/history",
    operation_id="getPatientImagingHistory",
    response_model=ResponseEnvelope[List[ImagingOrderRead]],
)
def get_patient_history(
    patient_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Get imaging history for a specific patient."""
    tenant_id = _ensure_tenant(user)
    orders, total = ImagingService.get_patient_history(
        db_session, tenant_id, patient_id, page, per_page
    )
    return ResponseEnvelope.ok(
        data=[ImagingOrderRead.model_validate(o) for o in orders],
        meta=_build_meta(total, page, per_page),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# RADIOLOGY REPORTS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/reports", operation_id="listRadiologyReports", response_model=ResponseEnvelope[List[RadiologyReportRead]])
def list_reports(
    imaging_order_id: Optional[str] = Query(None, alias="imagingOrderId"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """List radiology reports."""
    tenant_id = _ensure_tenant(user)
    reports, total = ImagingService.list_reports(
        db_session, tenant_id, imaging_order_id, status, page, per_page
    )
    return ResponseEnvelope.ok(
        data=[RadiologyReportRead.model_validate(r) for r in reports],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/reports/{report_id}", operation_id="getRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead])
def get_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Get a single radiology report."""
    tenant_id = _ensure_tenant(user)
    report = ImagingService.get_report(db_session, tenant_id, report_id)
    if not report:
        _not_found("Radiology report")
    return ResponseEnvelope.ok(data=RadiologyReportRead.model_validate(report))


@router.post("/reports", operation_id="createRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead], status_code=201)
def create_report(
    body: RadiologyReportCreate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Create a new radiology report for an imaging order."""
    tenant_id = _ensure_tenant(user)
    if not body.reported_by:
        body.reported_by = user.user_id
    report = ImagingService.create_report(db_session, tenant_id, body)
    if not report:
        raise HTTPException(
            status_code=404,
            detail={"message": "Imaging order not found", "code": "ORDER_NOT_FOUND"},
        )
    return ResponseEnvelope.ok(data=RadiologyReportRead.model_validate(report))


@router.put("/reports/{report_id}", operation_id="updateRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead])
def update_report(
    report_id: str,
    body: RadiologyReportUpdate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Update a radiology report."""
    tenant_id = _ensure_tenant(user)
    report = ImagingService.update_report(db_session, tenant_id, report_id, body)
    if not report:
        _not_found("Radiology report")
    return ResponseEnvelope.ok(data=RadiologyReportRead.model_validate(report))


@router.delete("/reports/{report_id}", operation_id="deleteRadiologyReport", response_model=ResponseEnvelope)
def delete_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Delete a radiology report."""
    tenant_id = _ensure_tenant(user)
    deleted = ImagingService.delete_report(db_session, tenant_id, report_id)
    if not deleted:
        _not_found("Radiology report")
    return ResponseEnvelope.ok()


@router.post(
    "/reports/{report_id}/verify",
    operation_id="verifyRadiologyReport",
    response_model=ResponseEnvelope[RadiologyReportRead],
)
def verify_report(
    report_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Verify (finalize) a radiology report. Sets status to final."""
    tenant_id = _ensure_tenant(user)
    verified_by = user.user_id
    if not verified_by:
        raise HTTPException(
            status_code=400,
            detail={"message": "Verifier identity required", "code": "VERIFIER_REQUIRED"},
        )
    report = ImagingService.verify_report(db_session, tenant_id, report_id, verified_by)
    if not report:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Report not found or not in verifiable state",
                "code": "REPORT_NOT_VERIFIABLE",
            },
        )
    return ResponseEnvelope.ok(data=RadiologyReportRead.model_validate(report))


# ═══════════════════════════════════════════════════════════════════════════════
# REPORT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/templates", operation_id="listReportTemplates", response_model=ResponseEnvelope[List[ReportTemplateRead]])
def list_templates(
    modality: Optional[str] = None,
    body_part: Optional[str] = Query(None, alias="bodyPart"),
    active_only: bool = Query(True, alias="activeOnly"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200, alias="perPage"),
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """List radiology report templates. Templates are shared globally (not tenant-scoped)."""
    templates, total = ImagingService.list_templates(
        db_session, modality, body_part, active_only, page, per_page
    )
    return ResponseEnvelope.ok(
        data=[ReportTemplateRead.model_validate(t) for t in templates],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/templates/{template_id}", operation_id="getReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead])
def get_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Get a single report template."""
    template = ImagingService.get_template(db_session, template_id)
    if not template:
        _not_found("Report template")
    return ResponseEnvelope.ok(data=ReportTemplateRead.model_validate(template))


@router.post("/templates", operation_id="createReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead], status_code=201)
def create_template(
    body: ReportTemplateCreate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Create a new report template."""
    template = ImagingService.create_template(db_session, body)
    return ResponseEnvelope.ok(data=ReportTemplateRead.model_validate(template))


@router.put("/templates/{template_id}", operation_id="updateReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead])
def update_template(
    template_id: str,
    body: ReportTemplateUpdate,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Update a report template."""
    template = ImagingService.update_template(db_session, template_id, body)
    if not template:
        _not_found("Report template")
    return ResponseEnvelope.ok(data=ReportTemplateRead.model_validate(template))


@router.delete("/templates/{template_id}", operation_id="deleteReportTemplate", response_model=ResponseEnvelope)
def delete_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Delete a report template."""
    deleted = ImagingService.delete_template(db_session, template_id)
    if not deleted:
        _not_found("Report template")
    return ResponseEnvelope.ok()
