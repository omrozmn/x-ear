"""
Imaging Service Router
REST endpoints for imaging orders, radiology reports, viewer, and templates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError

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

router = APIRouter(prefix="/hbys/imaging", tags=["HBYS Imaging"])


# ─── Helper ──────────────────────────────────────────────────────────────────


def _ensure_tenant(access: UnifiedAccess) -> str:
    if not access.tenant_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
        )
    return access.tenant_id


def _not_found(entity: str = "Resource"):
    raise HTTPException(
        status_code=404,
        detail=ApiError(message=f"{entity} not found", code=f"{entity.upper()}_NOT_FOUND").model_dump(mode="json"),
    )


def _build_meta(total: int, page: int, per_page: int) -> ResponseMeta:
    total_pages = max(1, (total + per_page - 1) // per_page)
    return ResponseMeta(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List imaging orders with optional filters."""
    tenant_id = _ensure_tenant(access)
    orders, total = ImagingService.list_orders(
        db_session, tenant_id, patient_id, encounter_id, modality, status, priority, page, per_page
    )
    return ResponseEnvelope.create_success(
        data=[ImagingOrderRead.model_validate(o) for o in orders],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/orders/{order_id}", operation_id="getImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead])
def get_order(
    order_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single imaging order by ID."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.get_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(data=ImagingOrderRead.model_validate(order))


@router.post("/orders", operation_id="createImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead], status_code=201)
def create_order(
    body: ImagingOrderCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Create a new imaging order."""
    tenant_id = _ensure_tenant(access)
    if not body.ordered_by and access.user:
        body.ordered_by = access.user.get("id") if isinstance(access.user, dict) else getattr(access.user, "id", None)
    order = ImagingService.create_order(db_session, tenant_id, body)
    return ResponseEnvelope.create_success(
        data=ImagingOrderRead.model_validate(order), message="Imaging order created"
    )


@router.put("/orders/{order_id}", operation_id="updateImagingOrder", response_model=ResponseEnvelope[ImagingOrderRead])
def update_order(
    order_id: str,
    body: ImagingOrderUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update an existing imaging order."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.update_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(data=ImagingOrderRead.model_validate(order))


@router.delete("/orders/{order_id}", operation_id="deleteImagingOrder", response_model=ResponseEnvelope)
def delete_order(
    order_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete an imaging order."""
    tenant_id = _ensure_tenant(access)
    deleted = ImagingService.delete_order(db_session, tenant_id, order_id)
    if not deleted:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(message="Imaging order deleted")


@router.post(
    "/orders/{order_id}/schedule",
    operation_id="scheduleImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def schedule_order(
    order_id: str,
    body: ImagingOrderSchedule,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Schedule an imaging order."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.schedule_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(
        data=ImagingOrderRead.model_validate(order), message="Imaging order scheduled"
    )


@router.post(
    "/orders/{order_id}/complete",
    operation_id="completeImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def complete_order(
    order_id: str,
    body: ImagingOrderComplete,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Mark an imaging order as completed."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.complete_order(db_session, tenant_id, order_id, body)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(
        data=ImagingOrderRead.model_validate(order), message="Imaging order completed"
    )


@router.post(
    "/orders/{order_id}/cancel",
    operation_id="cancelImagingOrder",
    response_model=ResponseEnvelope[ImagingOrderRead],
)
def cancel_order(
    order_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Cancel an imaging order."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.cancel_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")
    return ResponseEnvelope.create_success(
        data=ImagingOrderRead.model_validate(order), message="Imaging order cancelled"
    )


# ─── Viewer ───────────────────────────────────────────────────────────────────


@router.get(
    "/orders/{order_id}/viewer",
    operation_id="getImagingViewerUrl",
    response_model=ResponseEnvelope[ViewerUrlResponse],
)
def get_viewer_url(
    order_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get OHIF/DICOM viewer URL for an imaging order."""
    tenant_id = _ensure_tenant(access)
    order = ImagingService.get_order(db_session, tenant_id, order_id)
    if not order:
        _not_found("Imaging order")

    viewer_url = ImagingService.get_viewer_url(db_session, tenant_id, order_id)
    if not viewer_url:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                message="No DICOM study linked to this order", code="NO_DICOM_STUDY"
            ).model_dump(mode="json"),
        )
    return ResponseEnvelope.create_success(
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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get imaging history for a specific patient."""
    tenant_id = _ensure_tenant(access)
    orders, total = ImagingService.get_patient_history(
        db_session, tenant_id, patient_id, page, per_page
    )
    return ResponseEnvelope.create_success(
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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List radiology reports."""
    tenant_id = _ensure_tenant(access)
    reports, total = ImagingService.list_reports(
        db_session, tenant_id, imaging_order_id, status, page, per_page
    )
    return ResponseEnvelope.create_success(
        data=[RadiologyReportRead.model_validate(r) for r in reports],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/reports/{report_id}", operation_id="getRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead])
def get_report(
    report_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single radiology report."""
    tenant_id = _ensure_tenant(access)
    report = ImagingService.get_report(db_session, tenant_id, report_id)
    if not report:
        _not_found("Radiology report")
    return ResponseEnvelope.create_success(data=RadiologyReportRead.model_validate(report))


@router.post("/reports", operation_id="createRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead], status_code=201)
def create_report(
    body: RadiologyReportCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Create a new radiology report for an imaging order."""
    tenant_id = _ensure_tenant(access)
    if not body.reported_by and access.user:
        body.reported_by = access.user.get("id") if isinstance(access.user, dict) else getattr(access.user, "id", None)
    report = ImagingService.create_report(db_session, tenant_id, body)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Imaging order not found", code="ORDER_NOT_FOUND").model_dump(mode="json"),
        )
    return ResponseEnvelope.create_success(
        data=RadiologyReportRead.model_validate(report), message="Radiology report created"
    )


@router.put("/reports/{report_id}", operation_id="updateRadiologyReport", response_model=ResponseEnvelope[RadiologyReportRead])
def update_report(
    report_id: str,
    body: RadiologyReportUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update a radiology report."""
    tenant_id = _ensure_tenant(access)
    report = ImagingService.update_report(db_session, tenant_id, report_id, body)
    if not report:
        _not_found("Radiology report")
    return ResponseEnvelope.create_success(data=RadiologyReportRead.model_validate(report))


@router.delete("/reports/{report_id}", operation_id="deleteRadiologyReport", response_model=ResponseEnvelope)
def delete_report(
    report_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete a radiology report."""
    tenant_id = _ensure_tenant(access)
    deleted = ImagingService.delete_report(db_session, tenant_id, report_id)
    if not deleted:
        _not_found("Radiology report")
    return ResponseEnvelope.create_success(message="Radiology report deleted")


@router.post(
    "/reports/{report_id}/verify",
    operation_id="verifyRadiologyReport",
    response_model=ResponseEnvelope[RadiologyReportRead],
)
def verify_report(
    report_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Verify (finalize) a radiology report. Sets status to final."""
    tenant_id = _ensure_tenant(access)
    verified_by = None
    if access.user:
        verified_by = access.user.get("id") if isinstance(access.user, dict) else getattr(access.user, "id", None)
    if not verified_by:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Verifier identity required", code="VERIFIER_REQUIRED").model_dump(mode="json"),
        )
    report = ImagingService.verify_report(db_session, tenant_id, report_id, verified_by)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                message="Report not found or not in verifiable state",
                code="REPORT_NOT_VERIFIABLE",
            ).model_dump(mode="json"),
        )
    return ResponseEnvelope.create_success(
        data=RadiologyReportRead.model_validate(report), message="Report verified"
    )


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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """List radiology report templates. Templates are shared globally (not tenant-scoped)."""
    templates, total = ImagingService.list_templates(
        db_session, modality, body_part, active_only, page, per_page
    )
    return ResponseEnvelope.create_success(
        data=[ReportTemplateRead.model_validate(t) for t in templates],
        meta=_build_meta(total, page, per_page),
    )


@router.get("/templates/{template_id}", operation_id="getReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead])
def get_template(
    template_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Get a single report template."""
    template = ImagingService.get_template(db_session, template_id)
    if not template:
        _not_found("Report template")
    return ResponseEnvelope.create_success(data=ReportTemplateRead.model_validate(template))


@router.post("/templates", operation_id="createReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead], status_code=201)
def create_template(
    body: ReportTemplateCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Create a new report template."""
    template = ImagingService.create_template(db_session, body)
    return ResponseEnvelope.create_success(
        data=ReportTemplateRead.model_validate(template), message="Report template created"
    )


@router.put("/templates/{template_id}", operation_id="updateReportTemplate", response_model=ResponseEnvelope[ReportTemplateRead])
def update_template(
    template_id: str,
    body: ReportTemplateUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Update a report template."""
    template = ImagingService.update_template(db_session, template_id, body)
    if not template:
        _not_found("Report template")
    return ResponseEnvelope.create_success(data=ReportTemplateRead.model_validate(template))


@router.delete("/templates/{template_id}", operation_id="deleteReportTemplate", response_model=ResponseEnvelope)
def delete_template(
    template_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db),
):
    """Delete a report template."""
    deleted = ImagingService.delete_template(db_session, template_id)
    if not deleted:
        _not_found("Report template")
    return ResponseEnvelope.create_success(message="Report template deleted")
