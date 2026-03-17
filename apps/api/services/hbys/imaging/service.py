"""
Imaging Service
Business logic for imaging orders, radiology reports, and templates.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from database import gen_id
from .models.imaging_order import ImagingOrder
from .models.radiology_report import RadiologyReport
from .models.report_template import ReportTemplate
from .orthanc_client import orthanc_client
from .schemas import (
    ImagingOrderCreate,
    ImagingOrderUpdate,
    ImagingOrderSchedule,
    ImagingOrderComplete,
    RadiologyReportCreate,
    RadiologyReportUpdate,
    ReportTemplateCreate,
    ReportTemplateUpdate,
)

logger = logging.getLogger(__name__)


class ImagingService:
    """Service layer for imaging operations."""

    # ─── Imaging Orders ───────────────────────────────────────────────────

    @staticmethod
    def list_orders(
        db: Session,
        tenant_id: str,
        patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None,
        modality: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[ImagingOrder], int]:
        query = db.query(ImagingOrder).filter(ImagingOrder.tenant_id == tenant_id)

        if patient_id:
            query = query.filter(ImagingOrder.patient_id == patient_id)
        if encounter_id:
            query = query.filter(ImagingOrder.encounter_id == encounter_id)
        if modality:
            query = query.filter(ImagingOrder.modality == modality)
        if status:
            query = query.filter(ImagingOrder.status == status)
        if priority:
            query = query.filter(ImagingOrder.priority == priority)

        total = query.count()
        orders = (
            query.order_by(ImagingOrder.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return orders, total

    @staticmethod
    def get_order(db: Session, tenant_id: str, order_id: str) -> Optional[ImagingOrder]:
        return (
            db.query(ImagingOrder)
            .filter(ImagingOrder.id == order_id, ImagingOrder.tenant_id == tenant_id)
            .first()
        )

    @staticmethod
    def create_order(db: Session, tenant_id: str, data: ImagingOrderCreate) -> ImagingOrder:
        order = ImagingOrder(
            tenant_id=tenant_id,
            encounter_id=data.encounter_id,
            patient_id=data.patient_id,
            ordered_by=data.ordered_by,
            modality=data.modality,
            body_part=data.body_part,
            laterality=data.laterality,
            clinical_indication=data.clinical_indication,
            priority=data.priority,
            status="ordered",
        )
        # Generate a unique accession number
        order.accession_number = gen_id("ACC")
        db.add(order)
        db.commit()
        db.refresh(order)
        logger.info("Created imaging order %s for patient %s", order.id, order.patient_id)
        return order

    @staticmethod
    def update_order(
        db: Session, tenant_id: str, order_id: str, data: ImagingOrderUpdate
    ) -> Optional[ImagingOrder]:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(order, field, value)

        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def delete_order(db: Session, tenant_id: str, order_id: str) -> bool:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return False
        db.delete(order)
        db.commit()
        return True

    @staticmethod
    def schedule_order(
        db: Session, tenant_id: str, order_id: str, data: ImagingOrderSchedule
    ) -> Optional[ImagingOrder]:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return None
        order.scheduled_date = data.scheduled_date
        order.status = "scheduled"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def complete_order(
        db: Session, tenant_id: str, order_id: str, data: ImagingOrderComplete
    ) -> Optional[ImagingOrder]:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return None

        order.performed_by = data.performed_by
        order.performed_date = data.performed_date or datetime.now(timezone.utc)
        order.status = "completed"
        if data.orthanc_study_id:
            order.orthanc_study_id = data.orthanc_study_id
        if data.dicom_study_uid:
            order.dicom_study_uid = data.dicom_study_uid
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def cancel_order(db: Session, tenant_id: str, order_id: str) -> Optional[ImagingOrder]:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return None
        order.status = "cancelled"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return order

    # ─── Patient History ──────────────────────────────────────────────────

    @staticmethod
    def get_patient_history(
        db: Session,
        tenant_id: str,
        patient_id: str,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[ImagingOrder], int]:
        query = (
            db.query(ImagingOrder)
            .filter(
                ImagingOrder.tenant_id == tenant_id,
                ImagingOrder.patient_id == patient_id,
            )
        )
        total = query.count()
        orders = (
            query.order_by(ImagingOrder.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return orders, total

    # ─── Radiology Reports ────────────────────────────────────────────────

    @staticmethod
    def list_reports(
        db: Session,
        tenant_id: str,
        imaging_order_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[List[RadiologyReport], int]:
        query = db.query(RadiologyReport).filter(RadiologyReport.tenant_id == tenant_id)
        if imaging_order_id:
            query = query.filter(RadiologyReport.imaging_order_id == imaging_order_id)
        if status:
            query = query.filter(RadiologyReport.status == status)

        total = query.count()
        reports = (
            query.order_by(RadiologyReport.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return reports, total

    @staticmethod
    def get_report(db: Session, tenant_id: str, report_id: str) -> Optional[RadiologyReport]:
        return (
            db.query(RadiologyReport)
            .filter(RadiologyReport.id == report_id, RadiologyReport.tenant_id == tenant_id)
            .first()
        )

    @staticmethod
    def create_report(
        db: Session, tenant_id: str, data: RadiologyReportCreate
    ) -> Optional[RadiologyReport]:
        # Verify the imaging order exists and belongs to tenant
        order = ImagingService.get_order(db, tenant_id, data.imaging_order_id)
        if not order:
            return None

        report = RadiologyReport(
            tenant_id=tenant_id,
            imaging_order_id=data.imaging_order_id,
            findings=data.findings,
            impression=data.impression,
            recommendation=data.recommendation,
            reported_by=data.reported_by,
            reported_at=datetime.now(timezone.utc),
            is_critical=data.is_critical,
            status="draft",
        )
        db.add(report)

        # Update order status to "reported" if it was completed
        if order.status == "completed":
            order.status = "reported"

        db.commit()
        db.refresh(report)
        logger.info("Created radiology report %s for order %s", report.id, report.imaging_order_id)
        return report

    @staticmethod
    def update_report(
        db: Session, tenant_id: str, report_id: str, data: RadiologyReportUpdate
    ) -> Optional[RadiologyReport]:
        report = ImagingService.get_report(db, tenant_id, report_id)
        if not report:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(report, field, value)

        report.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def delete_report(db: Session, tenant_id: str, report_id: str) -> bool:
        report = ImagingService.get_report(db, tenant_id, report_id)
        if not report:
            return False
        db.delete(report)
        db.commit()
        return True

    @staticmethod
    def verify_report(
        db: Session, tenant_id: str, report_id: str, verified_by: str
    ) -> Optional[RadiologyReport]:
        report = ImagingService.get_report(db, tenant_id, report_id)
        if not report:
            return None
        if report.status not in ("draft", "preliminary"):
            return None

        report.verified_by = verified_by
        report.verified_at = datetime.now(timezone.utc)
        report.status = "final"
        report.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(report)
        logger.info("Verified report %s by user %s", report.id, verified_by)
        return report

    # ─── Viewer URL ───────────────────────────────────────────────────────

    @staticmethod
    def get_viewer_url(db: Session, tenant_id: str, order_id: str) -> Optional[str]:
        order = ImagingService.get_order(db, tenant_id, order_id)
        if not order:
            return None
        return orthanc_client.get_viewer_url(
            orthanc_study_id=order.orthanc_study_id,
            dicom_study_uid=order.dicom_study_uid,
        )

    # ─── Report Templates ────────────────────────────────────────────────

    @staticmethod
    def list_templates(
        db: Session,
        modality: Optional[str] = None,
        body_part: Optional[str] = None,
        active_only: bool = True,
        page: int = 1,
        per_page: int = 50,
    ) -> Tuple[List[ReportTemplate], int]:
        query = db.query(ReportTemplate)
        if active_only:
            query = query.filter(ReportTemplate.is_active.is_(True))
        if modality:
            query = query.filter(ReportTemplate.modality == modality)
        if body_part:
            query = query.filter(ReportTemplate.body_part == body_part)

        total = query.count()
        templates = (
            query.order_by(ReportTemplate.name_tr)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return templates, total

    @staticmethod
    def get_template(db: Session, template_id: str) -> Optional[ReportTemplate]:
        return db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()

    @staticmethod
    def create_template(db: Session, data: ReportTemplateCreate) -> ReportTemplate:
        template = ReportTemplate(
            name_tr=data.name_tr,
            modality=data.modality,
            body_part=data.body_part,
            template_content=data.template_content,
            is_active=data.is_active,
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def update_template(
        db: Session, template_id: str, data: ReportTemplateUpdate
    ) -> Optional[ReportTemplate]:
        template = ImagingService.get_template(db, template_id)
        if not template:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        template.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def delete_template(db: Session, template_id: str) -> bool:
        template = ImagingService.get_template(db, template_id)
        if not template:
            return False
        db.delete(template)
        db.commit()
        return True
