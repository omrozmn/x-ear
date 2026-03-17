"""
FastAPI Reports Router - Migrated from Flask routes/reports.py
Report endpoints for analytics and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case

from schemas.base import ResponseEnvelope
from schemas.reports import (
    ReportOverviewResponse, ReportPatientsResponse, ReportFinancialResponse,
    ReportCampaignsResponse, ReportRevenueResponse, ReportPromissoryNotesResponse,
    ReportCashflowResponse, PosMovementItem, PosMovementSummary,
    PatientSegments, ProductSalesData, PaymentMethodData, CampaignReportItem,
    PromissoryNotesSummary, MonthlyCount, MonthlyRevenue, PromissoryNotePatientItem,
    PromissoryNoteListItem, RemainingPaymentItem, RemainingPaymentsSummary,
    DailyCashflow, ReportTrackingItem
)

from core.models.party import Party
from core.models.branch import Branch
from models.appointment import Appointment
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.device import Device
from models.campaign import Campaign, SmsLog as SMSLog
from models.promissory_note import PromissoryNote
from models.enums import AppointmentStatus
from middleware.unified_access import UnifiedAccess, require_access
from database import get_db
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reports"])

OVERVIEW_FINANCIAL_PERMISSION = "sensitive.reports.overview.financials.view"
SALES_FINANCIAL_PERMISSION = "sensitive.reports.sales.financials.view"
PROMISSORY_FINANCIAL_PERMISSION = "sensitive.reports.promissory.financials.view"
PROMISSORY_CONTACT_PERMISSION = "sensitive.parties.list.contact.view"
PATIENT_REPORT_IDENTITY_PERMISSION = "sensitive.reports.parties.identity.view"
REMAINING_FINANCIAL_PERMISSION = "sensitive.reports.remaining.financials.view"
POS_FINANCIAL_PERMISSION = "sensitive.reports.pos_movements.financials.view"
TRACKING_DETAILS_PERMISSION = "sensitive.reports.report_tracking.details.view"
REPORT_CONTACT_PERMISSION = "sensitive.parties.list.contact.view"

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def get_user_branch_filter(access: UnifiedAccess, request_branch_id: Optional[str] = None) -> Optional[List[str]]:
    """Get branch IDs that current user has access to"""
    requested_branch_ids = [branch_id.strip() for branch_id in request_branch_id.split(',')] if request_branch_id else []
    requested_branch_ids = [branch_id for branch_id in requested_branch_ids if branch_id]

    if access.is_super_admin:
        if requested_branch_ids:
            return requested_branch_ids
        return None
    
    user = access.user
    allowed_branch_ids = []
    if user and hasattr(user, 'branches') and user.branches:
        allowed_branch_ids = [str(b.id) for b in user.branches]
    
    if requested_branch_ids:
        if allowed_branch_ids and any(branch_id not in allowed_branch_ids for branch_id in requested_branch_ids):
            return ["00000000-0000-0000-0000-000000000000"]
        return requested_branch_ids
    
    if allowed_branch_ids:
        return allowed_branch_ids
    
    return None

def should_include_unassigned_branch(access: UnifiedAccess, request_branch_id: Optional[str] = None) -> bool:
    """Include null branch rows when user is implicitly scoped by branch access and no branch is explicitly selected."""
    requested_branch_ids = [branch_id.strip() for branch_id in request_branch_id.split(',')] if request_branch_id else []
    requested_branch_ids = [branch_id for branch_id in requested_branch_ids if branch_id]
    if requested_branch_ids or access.is_super_admin:
        return False

    user = access.user
    return bool(user and hasattr(user, 'branches') and user.branches)

def build_branch_filter_condition(column, branch_ids: Optional[List[str]], include_unassigned: bool = False):
    """Build a reusable branch filter condition."""
    if not branch_ids:
        return None

    condition = column.in_(branch_ids)
    if include_unassigned:
        condition = or_(condition, column.is_(None))
    return condition

def apply_branch_filter(query, model, branch_ids: Optional[List[str]], include_unassigned: bool = False):
    """Apply branch filter to a query"""
    if branch_ids and hasattr(model, 'branch_id'):
        condition = build_branch_filter_condition(model.branch_id, branch_ids, include_unassigned)
        if condition is not None:
            return query.filter(condition)
    return query

def tenant_filter(query, model, access: UnifiedAccess):
    """Apply tenant filter"""
    if access.tenant_id and hasattr(model, 'tenant_id'):
        return query.filter(model.tenant_id == access.tenant_id)
    return query

def parse_report_date(raw_value: Optional[str], end_of_day: bool = False) -> Optional[datetime]:
    if not raw_value:
        return None

    parsed = datetime.fromisoformat(raw_value.replace('Z', '+00:00'))
    if end_of_day and len(raw_value) <= 10:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed

def resolve_report_window(
    days: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> tuple[datetime, datetime]:
    resolved_end = parse_report_date(end_date, end_of_day=True) or datetime.now()
    resolved_start = parse_report_date(start_date) or (resolved_end - timedelta(days=days))
    return resolved_start, resolved_end


def mask_remaining_payment_item(item: dict, access: UnifiedAccess) -> dict:
    masked = dict(item)
    if not access.has_permission(REPORT_CONTACT_PERMISSION):
        masked["phone"] = None
    if not access.has_permission(REMAINING_FINANCIAL_PERMISSION):
        masked["total_amount"] = 0.0
        masked["paid_amount"] = 0.0
        masked["remaining_amount"] = 0.0
    return masked


def mask_overview_response(data: dict, access: UnifiedAccess) -> dict:
    masked = dict(data)
    if not access.has_permission(OVERVIEW_FINANCIAL_PERMISSION):
        masked["total_revenue"] = 0.0
        masked["conversion_rate"] = 0.0
    return masked


def mask_financial_response(data: dict, access: UnifiedAccess) -> dict:
    masked = dict(data)
    if not access.has_permission(SALES_FINANCIAL_PERMISSION):
        masked["revenue_trend"] = {}
        masked["product_sales"] = {
            brand: {"sales": item.get("sales", 0), "revenue": 0.0}
            for brand, item in data.get("product_sales", {}).items()
        }
        masked["payment_methods"] = {
            method: {"count": item.get("count", 0), "amount": 0.0}
            for method, item in data.get("payment_methods", {}).items()
        }
    return masked


def mask_patients_report_response(data: dict, access: UnifiedAccess) -> dict:
    masked = dict(data)
    if not access.has_permission(PATIENT_REPORT_IDENTITY_PERMISSION):
        masked["segment_breakdown"] = {}
        masked["acquisition_breakdown"] = {}
    return masked


def mask_promissory_summary_response(data: dict, access: UnifiedAccess) -> dict:
    masked = dict(data)
    if not access.has_permission(PROMISSORY_FINANCIAL_PERMISSION):
        summary = dict(masked.get("summary", {}))
        summary["total_amount"] = 0.0
        summary["total_collected"] = 0.0
        masked["summary"] = summary
        masked["monthly_revenue"] = []
    return masked


def mask_promissory_party_item(item: dict, access: UnifiedAccess) -> dict:
    masked = dict(item)
    if not access.has_permission(PROMISSORY_CONTACT_PERMISSION):
        masked["phone"] = None
    if not access.has_permission(PROMISSORY_FINANCIAL_PERMISSION):
        masked["total_amount"] = 0.0
        masked["paid_amount"] = 0.0
        masked["remaining_amount"] = 0.0
    return masked


def mask_promissory_note_item(item: dict, access: UnifiedAccess) -> dict:
    masked = dict(item)
    if not access.has_permission(PROMISSORY_FINANCIAL_PERMISSION):
        masked["amount"] = 0.0
        masked["paidAmount"] = 0.0
        masked["remainingAmount"] = 0.0
    if not access.has_permission(PROMISSORY_CONTACT_PERMISSION):
        party = dict(masked.get("party") or {})
        if party:
            party["phone"] = None
            masked["party"] = party
    return masked


def mask_pos_movement_item(item: dict, access: UnifiedAccess) -> dict:
    masked = dict(item)
    if not access.has_permission(POS_FINANCIAL_PERMISSION):
        masked["amount"] = 0.0
        masked["sale_id"] = None
        masked["party_name"] = None
        masked["pos_transaction_id"] = None
        masked["error_message"] = None
    return masked


def mask_report_tracking_item(item: dict, access: UnifiedAccess) -> dict:
    masked = dict(item)
    if not access.has_permission(TRACKING_DETAILS_PERMISSION):
        masked["saleId"] = None
        masked["partyId"] = None
        masked["partyName"] = "Bu rol icin gizli"
        masked["deviceName"] = None
        masked["serialNumber"] = None
        masked["brand"] = None
        masked["model"] = None
        masked["ear"] = None
    return masked

# --- Routes ---

@router.get("/reports/overview", operation_id="listReportOverview", response_model=ResponseEnvelope[ReportOverviewResponse])
def report_overview(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.overview.view")),
    db_session: Session = Depends(get_db)
):
    """General report overview"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        # Party stats
        patient_q = tenant_filter(db_session.query(Party), Party, access)
        total_patients = patient_q.count()
        new_patients = patient_q.filter(Party.created_at >= start_date, Party.created_at <= end_date).count()
        
        # Appointment stats
        appointments_query = tenant_filter(db_session.query(Appointment), Appointment, access).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointments_query = apply_branch_filter(appointments_query, Appointment, branch_ids, include_unassigned_branch)
        total_appointments = appointments_query.count()
        
        completed_query = tenant_filter(db_session.query(Appointment), Appointment, access).filter(
            and_(
                Appointment.date >= start_date,
                Appointment.date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
        completed_query = apply_branch_filter(completed_query, Appointment, branch_ids, include_unassigned_branch)
        completed_appointments = completed_query.count()
        
        appointment_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
        
        # Sales stats
        sales_query = tenant_filter(db_session.query(Sale), Sale, access).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids, include_unassigned_branch)
        total_sales = sales_query.count()
        
        revenue_query = db_session.query(func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if access.tenant_id:
            revenue_query = revenue_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            revenue_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if revenue_condition is not None:
                revenue_query = revenue_query.filter(revenue_condition)
        total_revenue = revenue_query.scalar() or 0
        
        conversion_rate = (total_sales / completed_appointments * 100) if completed_appointments > 0 else 0
        
        overview_data = mask_overview_response({
            "total_patients": total_patients,
            "new_patients": new_patients,
            "total_appointments": total_appointments,
            "appointment_rate": round(appointment_rate, 1),
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "conversion_rate": round(conversion_rate, 1),
        }, access)

        return ResponseEnvelope(data=ReportOverviewResponse(**overview_data))
    except Exception as e:
        logger.error(f"Overview report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/patients", operation_id="listReportPatients", response_model=ResponseEnvelope[ReportPatientsResponse])
def report_patients(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.parties.view")),
    db_session: Session = Depends(get_db)
):
    """Patient analysis report"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)

        age_data = {"18-30": 0, "31-50": 0, "51-65": 0, "65+": 0, "Bilinmiyor": 0}

        party_query = tenant_scoped_query(access, Party, db_session)
        if branch_ids:
            party_condition = build_branch_filter_condition(Party.branch_id, branch_ids, include_unassigned_branch)
            if party_condition is not None:
                party_query = party_query.filter(party_condition)

        parties = party_query.all()
        for party in parties:
            if not party.birth_date:
                age_data["Bilinmiyor"] += 1
                continue
            age = max(0, (end_date.date() - party.birth_date.date()).days // 365)
            if age <= 30:
                age_data["18-30"] += 1
            elif age <= 50:
                age_data["31-50"] += 1
            elif age <= 65:
                age_data["51-65"] += 1
            else:
                age_data["65+"] += 1
        
        # Status distribution
        appointment_query = tenant_scoped_query(access, Appointment, db_session).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointment_query = apply_branch_filter(appointment_query, Appointment, branch_ids, include_unassigned_branch)
        status_distribution = appointment_query.with_entities(
            Appointment.status,
            func.count(Appointment.id)
        ).group_by(Appointment.status).all()
        
        status_data = {}
        for status, count in status_distribution:
            status_str = status.value if hasattr(status, 'value') else str(status)
            status_data[status_str] = count

        new_patients_query = tenant_scoped_query(access, Party, db_session).filter(
            Party.created_at >= start_date,
            Party.created_at <= end_date
        )
        if branch_ids:
            new_patients_condition = build_branch_filter_condition(Party.branch_id, branch_ids, include_unassigned_branch)
            if new_patients_condition is not None:
                new_patients_query = new_patients_query.filter(new_patients_condition)
        new_patients = new_patients_query.count()

        active_patients_query = tenant_scoped_query(access, Party, db_session).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date,
            Appointment.status == AppointmentStatus.COMPLETED
        )
        if branch_ids:
            active_patients_condition = build_branch_filter_condition(Party.branch_id, branch_ids, include_unassigned_branch)
            if active_patients_condition is not None:
                active_patients_query = active_patients_query.filter(active_patients_condition)
        active_patients = active_patients_query.count()

        trial_patients_query = tenant_scoped_query(access, Party, db_session).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date,
            Appointment.status == AppointmentStatus.SCHEDULED
        )
        if branch_ids:
            trial_patients_condition = build_branch_filter_condition(Party.branch_id, branch_ids, include_unassigned_branch)
            if trial_patients_condition is not None:
                trial_patients_query = trial_patients_query.filter(trial_patients_condition)
        trial_patients = trial_patients_query.count()

        appt_subquery = tenant_scoped_query(access, Appointment, db_session).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        ).with_entities(Appointment.party_id)
        appt_subquery = apply_branch_filter(appt_subquery, Appointment, branch_ids, include_unassigned_branch)

        inactive_patients_query = tenant_scoped_query(access, Party, db_session).filter(
            ~Party.id.in_(appt_subquery)
        )
        if branch_ids:
            inactive_patients_condition = build_branch_filter_condition(Party.branch_id, branch_ids, include_unassigned_branch)
            if inactive_patients_condition is not None:
                inactive_patients_query = inactive_patients_query.filter(inactive_patients_condition)
        inactive_patients = inactive_patients_query.count()

        sales_query = tenant_filter(db_session.query(Sale), Sale, access)
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids, include_unassigned_branch)
        patients_with_sales = sales_query.with_entities(func.count(func.distinct(Sale.party_id))).scalar() or 0

        upcoming_appointments = tenant_filter(db_session.query(Appointment), Appointment, access).filter(
            Appointment.date >= end_date,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
        )
        upcoming_appointments = apply_branch_filter(upcoming_appointments, Appointment, branch_ids, include_unassigned_branch)
        patients_with_upcoming = upcoming_appointments.with_entities(func.count(func.distinct(Appointment.party_id))).scalar() or 0

        high_priority_query = party_query.filter(Party.priority_score >= 70)
        high_priority_count = high_priority_query.count()

        acquisition_rows = party_query.with_entities(
            Party.acquisition_type,
            func.count(Party.id)
        ).group_by(Party.acquisition_type).all()
        acquisition_breakdown = {
            (source or "belirsiz"): count for source, count in acquisition_rows
        }

        segment_rows = party_query.with_entities(
            Party.segment,
            func.count(Party.id)
        ).group_by(Party.segment).all()
        segment_breakdown = {
            (segment or "belirsiz"): count for segment, count in segment_rows
        }

        patients_data = mask_patients_report_response({
            "age_distribution": age_data,
            "status_distribution": status_data,
            "patient_segments": PatientSegments(
                new=new_patients,
                active=active_patients,
                trial=trial_patients,
                inactive=inactive_patients
            ),
            "summary": {
                "totalPatients": len(parties),
                "newPatients": new_patients,
                "patientsWithSales": int(patients_with_sales),
                "patientsWithUpcomingAppointments": int(patients_with_upcoming),
                "highPriorityPatients": high_priority_count,
            },
            "acquisition_breakdown": acquisition_breakdown,
            "segment_breakdown": segment_breakdown,
        }, access)

        return ResponseEnvelope(data=ReportPatientsResponse(**patients_data))
    except Exception as e:
        logger.error(f"Patients report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/financial", operation_id="listReportFinancial", response_model=ResponseEnvelope[ReportFinancialResponse])
def report_financial(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.sales.view")),
    db_session: Session = Depends(get_db)
):
    """Financial report"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        # Monthly revenue trend
        revenue_query = db_session.query(
            extract('month', Sale.created_at),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if access.tenant_id:
            revenue_query = revenue_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            revenue_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if revenue_condition is not None:
                revenue_query = revenue_query.filter(revenue_condition)
        
        monthly_revenue = revenue_query.group_by(
            extract('month', Sale.created_at)
        ).order_by(
            extract('month', Sale.created_at)
        ).all()
        
        revenue_trend = {int(month): float(amount) for month, amount in monthly_revenue}
        
        # Product sales
        product_query = db_session.query(
            Device.brand,
            func.count(DeviceAssignment.id),
            func.sum(DeviceAssignment.net_payable)
        ).join(
            DeviceAssignment, Device.id == DeviceAssignment.device_id
        ).filter(
            DeviceAssignment.created_at >= start_date,
            DeviceAssignment.created_at <= end_date
        )
        if access.tenant_id:
            product_query = product_query.filter(DeviceAssignment.tenant_id == access.tenant_id)
        if branch_ids:
            product_condition = build_branch_filter_condition(DeviceAssignment.branch_id, branch_ids, include_unassigned_branch)
            if product_condition is not None:
                product_query = product_query.filter(product_condition)
        
        product_sales = product_query.group_by(Device.brand).all()
        
        product_data = {}
        for brand, count, revenue in product_sales:
            if brand:
                product_data[brand] = {
                    "sales": count,
                    "revenue": float(revenue) if revenue else 0.0
                }
        
        # Payment methods
        payment_query = db_session.query(
            Sale.payment_method,
            func.count(Sale.id),
            func.sum(Sale.total_amount)
        ).filter(Sale.created_at >= start_date, Sale.created_at <= end_date)
        if access.tenant_id:
            payment_query = payment_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            payment_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if payment_condition is not None:
                payment_query = payment_query.filter(payment_condition)
        
        payment_methods = payment_query.group_by(Sale.payment_method).all()
        
        payment_data = {}
        for method, count, amount in payment_methods:
            if method:
                payment_data[method] = {
                    "count": count,
                    "amount": float(amount)
                }
        
        financial_payload = mask_financial_response({
            "revenue_trend": revenue_trend,
            "product_sales": product_data,
            "payment_methods": payment_data,
        }, access)

        return ResponseEnvelope(
            data=ReportFinancialResponse(
                revenue_trend=financial_payload["revenue_trend"],
                product_sales={k: ProductSalesData(**v) for k, v in financial_payload["product_sales"].items()},
                payment_methods={k: PaymentMethodData(**v) for k, v in financial_payload["payment_methods"].items()}
            )
        )
    except Exception as e:
        logger.error(f"Financial report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/campaigns", operation_id="listReportCampaigns", response_model=ResponseEnvelope[ReportCampaignsResponse])
def report_campaigns(
    days: int = Query(30, ge=1, le=365),
    access: UnifiedAccess = Depends(require_access("reports.sales.view")),
    db_session: Session = Depends(get_db)
):
    """Campaign report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        campaigns = tenant_scoped_query(access, Campaign, db_session).filter(
            Campaign.created_at >= start_date
        ).all()
        
        campaign_data = []
        for campaign in campaigns:
            sms_logs = tenant_scoped_query(access, SMSLog, db_session).filter(
                SMSLog.campaign_id == campaign.id
            ).all()
            
            sent_count = len(sms_logs)
            delivered_count = sum(1 for log in sms_logs if log.status == 'delivered')
            opened_count = sum(1 for log in sms_logs if log.opened_at is not None)
            clicked_count = sum(1 for log in sms_logs if log.clicked_at is not None)
            
            delivery_rate = (delivered_count / sent_count * 100) if sent_count > 0 else 0
            open_rate = (opened_count / delivered_count * 100) if delivered_count > 0 else 0
            click_rate = (clicked_count / delivered_count * 100) if delivered_count > 0 else 0
            
            campaign_data.append({
                "id": campaign.id,
                "name": campaign.name,
                "sent_count": sent_count,
                "delivered_count": delivered_count,
                "delivery_rate": round(delivery_rate, 1),
                "open_rate": round(open_rate, 1),
                "click_rate": round(click_rate, 1),
                "status": campaign.status
            })
        
        # SMS trends
        sms_trends_q = db_session.query(
            func.date(SMSLog.created_at),
            func.count(SMSLog.id)
        ).filter(SMSLog.created_at >= start_date)
        if access.tenant_id:
            sms_trends_q = sms_trends_q.filter(SMSLog.tenant_id == access.tenant_id)
        
        sms_trends = sms_trends_q.group_by(
            func.date(SMSLog.created_at)
        ).order_by(
            func.date(SMSLog.created_at)
        ).all()
        
        trend_data = {str(date): count for date, count in sms_trends}
        
        return ResponseEnvelope(
            data=ReportCampaignsResponse(
                campaigns=[CampaignReportItem(**c) for c in campaign_data],
                sms_trends=trend_data
            )
        )
    except Exception as e:
        logger.error(f"Campaigns report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/revenue", operation_id="listReportRevenue", response_model=ResponseEnvelope[ReportRevenueResponse])
def report_revenue(
    access: UnifiedAccess = Depends(require_access("reports.sales.view")),
    db_session: Session = Depends(get_db)
):
    """Revenue report placeholder"""
    return ResponseEnvelope(
        data=ReportRevenueResponse(monthly=[12000, 15000, 15500])
    )

@router.get("/reports/appointments", operation_id="listReportAppointments")
def report_appointments(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access("reports.overview.view")),
    db_session: Session = Depends(get_db)
):
    """Appointments report placeholder"""
    return ResponseEnvelope(
        data=[],
        meta={"total": 0, "page": page, "per_page": per_page, "total_pages": 0}
    )

@router.get("/reports/promissory-notes", operation_id="listReportPromissoryNotes", response_model=ResponseEnvelope[ReportPromissoryNotesResponse])
def report_promissory_notes(
    days: int = Query(365, ge=1),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.promissory.view")),
    db_session: Session = Depends(get_db)
):
    """Promissory notes report"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        # Summary stats
        base_notes = tenant_scoped_query(access, PromissoryNote, db_session)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            base_notes = base_notes.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )

        total_notes = base_notes.filter(
            PromissoryNote.created_at >= start_date,
            PromissoryNote.created_at <= end_date
        ).count()
        
        active_notes = base_notes.filter(
            PromissoryNote.status == 'active'
        ).count()
        
        overdue_notes = base_notes.filter(
            PromissoryNote.status == 'overdue'
        ).count()
        
        paid_notes = base_notes.filter(
            PromissoryNote.status == 'paid',
            PromissoryNote.paid_date >= start_date,
            PromissoryNote.paid_date <= end_date
        ).count()
        
        # Monthly counts
        count_query = db_session.query(
            extract('year', PromissoryNote.created_at).label('year'),
            extract('month', PromissoryNote.created_at).label('month'),
            func.count(PromissoryNote.id).label('count')
        ).filter(
            PromissoryNote.created_at >= start_date,
            PromissoryNote.created_at <= end_date
        )
        if access.tenant_id:
            count_query = count_query.filter(PromissoryNote.tenant_id == access.tenant_id)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            count_query = count_query.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )
            
        monthly_counts = count_query.group_by(
            extract('year', PromissoryNote.created_at),
            extract('month', PromissoryNote.created_at)
        ).order_by('year', 'month').all()

        # Monthly revenue
        revenue_query = db_session.query(
            extract('year', PromissoryNote.paid_date).label('year'),
            extract('month', PromissoryNote.paid_date).label('month'),
            func.sum(PromissoryNote.paid_amount).label('revenue')
        ).filter(
            PromissoryNote.paid_date >= start_date,
            PromissoryNote.paid_date <= end_date,
            PromissoryNote.status.in_(['paid', 'partial'])
        )
        if access.tenant_id:
            revenue_query = revenue_query.filter(PromissoryNote.tenant_id == access.tenant_id)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            revenue_query = revenue_query.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )
            
        monthly_revenue = revenue_query.group_by(
            extract('year', PromissoryNote.paid_date),
            extract('month', PromissoryNote.paid_date)
        ).order_by('year', 'month').all()
        
        # Total amounts
        total_amount_q = db_session.query(func.sum(PromissoryNote.amount)).filter(
            PromissoryNote.status.in_(['active', 'overdue'])
        )
        if access.tenant_id:
            total_amount_q = total_amount_q.filter(PromissoryNote.tenant_id == access.tenant_id)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            total_amount_q = total_amount_q.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )
        total_amount = total_amount_q.scalar() or 0
        
        total_collected_q = db_session.query(func.sum(PromissoryNote.paid_amount)).filter(
            PromissoryNote.paid_date >= start_date,
            PromissoryNote.paid_date <= end_date
        )
        if access.tenant_id:
            total_collected_q = total_collected_q.filter(PromissoryNote.tenant_id == access.tenant_id)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            total_collected_q = total_collected_q.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )
        total_collected = total_collected_q.scalar() or 0
        
        # Format monthly data
        monthly_counts_data = []
        for row in monthly_counts:
            monthly_counts_data.append({
                "year": int(row.year),
                "month": int(row.month),
                "count": row.count
            })
        
        monthly_revenue_data = []
        for row in monthly_revenue:
            monthly_revenue_data.append({
                "year": int(row.year),
                "month": int(row.month),
                "revenue": float(row.revenue) if row.revenue else 0
            })
        
        promissory_payload = mask_promissory_summary_response({
            "summary": {
                "total_notes": total_notes,
                "active_notes": active_notes,
                "overdue_notes": overdue_notes,
                "paid_notes": paid_notes,
                "total_amount": float(total_amount),
                "total_collected": float(total_collected),
            },
            "monthly_counts": monthly_counts_data,
            "monthly_revenue": monthly_revenue_data,
        }, access)

        return ResponseEnvelope(
            data=ReportPromissoryNotesResponse(
                summary=PromissoryNotesSummary(**promissory_payload["summary"]),
                monthly_counts=[MonthlyCount(**r) for r in promissory_payload["monthly_counts"]],
                monthly_revenue=[MonthlyRevenue(**r) for r in promissory_payload["monthly_revenue"]]
            )
        )
    except Exception as e:
        logger.error(f"Promissory notes report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/promissory-notes/by-patient", operation_id="listReportPromissoryNoteByPatient", response_model=ResponseEnvelope[List[PromissoryNotePatientItem]])
def report_promissory_notes_by_patient(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.promissory.view")),
    db_session: Session = Depends(get_db)
):
    """Patient promissory notes summary"""
    try:
        parsed_start_date = parse_report_date(start_date)
        parsed_end_date = parse_report_date(end_date, end_of_day=True)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        # Base query - patient notes summary
        subquery = db_session.query(
            PromissoryNote.party_id,
            func.count(PromissoryNote.id).label('total_notes'),
            func.count(case((PromissoryNote.status == 'active', 1))).label('active_notes'),
            func.count(case((PromissoryNote.status == 'overdue', 1))).label('overdue_notes'),
            func.count(case((PromissoryNote.status == 'paid', 1))).label('paid_notes'),
            func.sum(PromissoryNote.amount).label('total_amount'),
            func.sum(PromissoryNote.paid_amount).label('paid_amount'),
            func.sum(PromissoryNote.amount - PromissoryNote.paid_amount).label('remaining_amount'),
            func.min(PromissoryNote.due_date).label('first_due_date'),
            func.max(PromissoryNote.due_date).label('last_due_date')
        ).group_by(PromissoryNote.party_id)
        
        if access.tenant_id:
             subquery = subquery.filter(PromissoryNote.tenant_id == access.tenant_id)
        if parsed_start_date:
             subquery = subquery.filter(PromissoryNote.created_at >= parsed_start_date)
        if parsed_end_date:
             subquery = subquery.filter(PromissoryNote.created_at <= parsed_end_date)
        if branch_ids:
             sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
             subquery = subquery.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                 or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
             )
        
        # Apply status filter
        if status == 'active':
            subquery = subquery.having(func.count(case((PromissoryNote.status == 'active', 1))) > 0)
        elif status == 'overdue':
            subquery = subquery.having(func.count(case((PromissoryNote.status == 'overdue', 1))) > 0)
        elif status != 'all':
            # Default: show only patients with active/overdue notes
            subquery = subquery.having(
                (
                    func.count(case((PromissoryNote.status == 'active', 1))) +
                    func.count(case((PromissoryNote.status == 'overdue', 1)))
                ) > 0
            )
        
        subquery = subquery.subquery()
        
        # Join with Party to get party info
        query = db_session.query(
            Party.id,
            Party.first_name,
            Party.last_name,
            Party.phone,
            subquery.c.total_notes,
            subquery.c.active_notes,
            subquery.c.overdue_notes,
            subquery.c.paid_notes,
            subquery.c.total_amount,
            subquery.c.paid_amount,
            subquery.c.remaining_amount,
            subquery.c.first_due_date,
            subquery.c.last_due_date
        ).join(subquery, Party.id == subquery.c.party_id)
        
        # Order by remaining amount descending
        query = query.order_by(subquery.c.remaining_amount.desc())
        
        # Get total count before pagination
        total = query.count()
        
        # Paginate
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        patients_data = []
        for row in results:
            patients_data.append({
                "party_id": row.id,
                "party_name": f"{row.first_name or ''} {row.last_name or ''}".strip(),
                "phone": row.phone,
                "total_notes": row.total_notes or 0,
                "active_notes": row.active_notes or 0,
                "overdue_notes": row.overdue_notes or 0,
                "paid_notes": row.paid_notes or 0,
                "total_amount": float(row.total_amount) if row.total_amount else 0,
                "paid_amount": float(row.paid_amount) if row.paid_amount else 0,
                "remaining_amount": float(row.remaining_amount) if row.remaining_amount else 0,
                "first_due_date": row.first_due_date.isoformat() if row.first_due_date else None,
                "last_due_date": row.last_due_date.isoformat() if row.last_due_date else None
            })
        
        masked_patients = [mask_promissory_party_item(p, access) for p in patients_data]

        return ResponseEnvelope(
            data=[PromissoryNotePatientItem(**p) for p in masked_patients],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Promissory notes by patient report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/promissory-notes/list", operation_id="listReportPromissoryNoteList", response_model=ResponseEnvelope[List[PromissoryNoteListItem]])
def report_promissory_notes_list(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    search: Optional[str] = Query(None),
    access: UnifiedAccess = Depends(require_access("reports.promissory.view")),
    db_session: Session = Depends(get_db)
):
    """Detailed promissory notes list report"""
    try:
        query = tenant_scoped_query(access, PromissoryNote, db_session)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        if branch_ids:
            sale_branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            query = query.join(Sale, PromissoryNote.sale_id == Sale.id, isouter=True).filter(
                or_(PromissoryNote.sale_id.is_(None), sale_branch_condition)
            )
        
        # Filters
        if status and status != 'all':
            query = query.filter(PromissoryNote.status == status)
            
        if start_date:
            s_date = parse_report_date(start_date)
            query = query.filter(PromissoryNote.created_at >= s_date)
            
        if end_date:
            e_date = parse_report_date(end_date, end_of_day=True)
            query = query.filter(PromissoryNote.created_at <= e_date)
            
        if search:
            query = query.join(Party).filter(
                or_(
                    Party.first_name.ilike(f"%{search}%"),
                    Party.last_name.ilike(f"%{search}%"),
                    Party.phone.ilike(f"%{search}%"),
                    PromissoryNote.note_number.ilike(f"%{search}%")
                )
            )
            
        # Order by due date
        query = query.order_by(PromissoryNote.due_date.asc())
        
        total = query.count()
        notes = query.offset((page - 1) * per_page).limit(per_page).all()
        
        results = []
        for note in notes:
            # Eager load party relationship to avoid lazy loading issues
            party_data = None
            if note.party_id:
                party = db_session.query(Party).filter_by(id=note.party_id).first()
                if party:
                    party_data = {
                        "id": party.id,
                        "name": f"{party.first_name} {party.last_name}",
                        "phone": party.phone
                    }
            
            # Build dict manually to avoid Pydantic validation issues with lazy-loaded relationships
            note_dict = {
                "id": note.id,
                "noteNumber": str(note.note_number) if note.note_number is not None else None,
                "amount": float(note.amount) if note.amount else 0.0,
                "paidAmount": float(note.paid_amount) if note.paid_amount else 0.0,
                "remainingAmount": float(note.amount - note.paid_amount) if note.amount and note.paid_amount else float(note.amount or 0),
                "dueDate": note.due_date.isoformat() if note.due_date else None,
                "status": note.status.value if hasattr(note.status, 'value') else str(note.status),
                "party": party_data
            }
            results.append(note_dict)
            
        masked_results = [mask_promissory_note_item(note, access) for note in results]

        return ResponseEnvelope(
            data=masked_results,
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Promissory notes list report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/remaining-payments", operation_id="listReportRemainingPayments", response_model=ResponseEnvelope[List[RemainingPaymentItem]])
def report_remaining_payments(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(50, ge=1, le=100),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    min_amount: float = Query(0, ge=0, alias="min_amount"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.remaining.view")),
    db_session: Session = Depends(get_db)
):
    """Remaining payments report"""
    try:
        parsed_start_date = parse_report_date(start_date)
        parsed_end_date = parse_report_date(end_date, end_of_day=True)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        query = db_session.query(
            Party.id.label('party_id'),
            Party.first_name,
            Party.last_name,
            Party.phone,
            func.count(Sale.id).label('sale_count'),
            func.sum(Sale.final_amount).label('total_amount'),
            func.sum(Sale.paid_amount).label('paid_amount'),
            func.sum(Sale.final_amount - Sale.paid_amount).label('remaining_amount')
        ).join(
            Sale, Party.id == Sale.party_id
        ).filter(
            Sale.final_amount > Sale.paid_amount,
            Sale.status != 'cancelled'
        )
        if parsed_start_date:
            query = query.filter(Sale.created_at >= parsed_start_date)
        if parsed_end_date:
            query = query.filter(Sale.created_at <= parsed_end_date)
        
        if access.tenant_id:
            query = query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            branch_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if branch_condition is not None:
                query = query.filter(branch_condition)
        
        query = query.group_by(Party.id, Party.first_name, Party.last_name, Party.phone)
        
        if min_amount > 0:
            query = query.having(func.sum(Sale.final_amount - Sale.paid_amount) >= min_amount)
        
        query = query.order_by(func.sum(Sale.final_amount - Sale.paid_amount).desc())
        
        # Get total
        count_query = query.subquery()
        total = db_session.query(func.count()).select_from(count_query).scalar() or 0
        
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        patients_data = []
        for row in results:
            patients_data.append({
                "party_id": row.party_id,
                "party_name": f"{row.first_name or ''} {row.last_name or ''}".strip(),
                "phone": row.phone,
                "sale_count": row.sale_count or 0,
                "total_amount": float(row.total_amount) if row.total_amount else 0,
                "paid_amount": float(row.paid_amount) if row.paid_amount else 0,
                "remaining_amount": float(row.remaining_amount) if row.remaining_amount else 0
            })
        
        # Summary totals
        summary_query = db_session.query(
            func.count(func.distinct(Party.id)).label('party_count'),
            func.sum(Sale.final_amount - Sale.paid_amount).label('total_remaining')
        ).join(
            Sale, Party.id == Sale.party_id
        ).filter(
            Sale.final_amount > Sale.paid_amount,
            Sale.status != 'cancelled'
        )
        if parsed_start_date:
            summary_query = summary_query.filter(Sale.created_at >= parsed_start_date)
        if parsed_end_date:
            summary_query = summary_query.filter(Sale.created_at <= parsed_end_date)
        
        if access.tenant_id:
            summary_query = summary_query.filter(Sale.tenant_id == access.tenant_id)

        if branch_ids:
            summary_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if summary_condition is not None:
                summary_query = summary_query.filter(summary_condition)
        summary = summary_query.first()
        
        masked_data = [mask_remaining_payment_item(p, access) for p in patients_data]
        can_view_financials = access.has_permission(REMAINING_FINANCIAL_PERMISSION)

        return ResponseEnvelope(
            data=[RemainingPaymentItem(**p) for p in masked_data],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "summary": RemainingPaymentsSummary(
                    total_parties=summary.party_count or 0 if summary else 0,
                    total_remaining=float(summary.total_remaining) if can_view_financials and summary and summary.total_remaining else 0
                )
            }
        )
    except Exception as e:
        logger.error(f"Remaining payments report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/cashflow-summary", operation_id="listReportCashflowSummary", response_model=ResponseEnvelope[ReportCashflowResponse])
def report_cashflow_summary(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.sales.view")),
    db_session: Session = Depends(get_db)
):
    """Cashflow summary report"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        # Income (Revenue)
        revenue_query = db_session.query(func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if access.tenant_id:
             revenue_query = revenue_query.filter(Sale.tenant_id == access.tenant_id)
             
        if branch_ids:
            revenue_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if revenue_condition is not None:
                revenue_query = revenue_query.filter(revenue_condition)
            
        total_revenue = revenue_query.scalar() or 0
        
        # Expenses (Placeholder)
        total_expenses = 0
        
        # Net Cash
        net_cash = float(total_revenue) - float(total_expenses)
        
        # Daily breakdown
        daily_query = db_session.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.total_amount).label('income')
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        
        if access.tenant_id:
            daily_query = daily_query.filter(Sale.tenant_id == access.tenant_id)

        if branch_ids:
            daily_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if daily_condition is not None:
                daily_query = daily_query.filter(daily_condition)
            
        daily_stats = daily_query.group_by(
            func.date(Sale.created_at)
        ).order_by('date').all()
        
        daily_data = []
        for row in daily_stats:
            daily_data.append({
                "date": str(row.date),
                "income": float(row.income) if row.income else 0,
                "expense": 0
            })
            
        can_view_financials = access.has_permission(REPORT_FINANCIAL_PERMISSION)

        return ResponseEnvelope(
            data=ReportCashflowResponse(
                total_revenue=float(total_revenue) if can_view_financials else 0.0,
                total_expenses=float(total_expenses) if can_view_financials else 0.0,
                net_cash=float(net_cash) if can_view_financials else 0.0,
                daily_breakdown=[DailyCashflow(**d) for d in daily_data] if can_view_financials else []
            )
        )
    except Exception as e:
        logger.error(f"Cashflow summary report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/pos-movements", operation_id="listReportPosMovements", response_model=ResponseEnvelope[List[PosMovementItem]])
def report_pos_movements(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("reports.pos_movements.view")),
    db_session: Session = Depends(get_db)
):
    """POS movements report"""
    try:
        start_date, end_date = resolve_report_window(days, start_date, end_date)
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        
        query = db_session.query(
            PaymentRecord,
            Sale,
            Party
        ).join(
            Sale, PaymentRecord.sale_id == Sale.id
        ).join(
            Party, Sale.party_id == Party.id, isouter=True
        ).filter(
            PaymentRecord.created_at >= start_date,
            PaymentRecord.created_at <= end_date,
            PaymentRecord.pos_provider != None
        )
        
        if access.tenant_id:
             query = query.filter(Sale.tenant_id == access.tenant_id)
        
        if branch_ids:
            query_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
            if query_condition is not None:
                query = query.filter(query_condition)
            
        # Total count
        total = query.count()
            
        query = query.order_by(PaymentRecord.created_at.desc())
        
        # Paginated results
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        data = []
        for payment, sale, party in results:
            data.append({
                'id': payment.id,
                'date': payment.created_at.isoformat(),
                'amount': float(payment.amount or 0),
                'status': payment.status,
                'pos_provider': payment.pos_provider,
                'pos_transaction_id': payment.pos_transaction_id,
                'installment': payment.installment_count,
                'error_message': payment.error_message,
                'sale_id': sale.id if sale else None,
                'party_name': f"{party.first_name} {party.last_name}" if party else "Bilinmiyor"
            })
            
        # Summary
        summary = {
            'total_volume': 0,
            'success_count': 0,
            'fail_count': 0
        }
        
        # Aggregation for summary
        agg_query = db_session.query(
            func.count(PaymentRecord.id),
            func.sum(PaymentRecord.amount)
        ).join(
            Sale, PaymentRecord.sale_id == Sale.id
        ).filter(
            PaymentRecord.created_at >= start_date,
            PaymentRecord.created_at <= end_date,
            PaymentRecord.pos_provider != None,
            PaymentRecord.status == 'paid'
        )
        
        if access.tenant_id:
             agg_query = agg_query.filter(Sale.tenant_id == access.tenant_id)
             
        if branch_ids:
             agg_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
             if agg_condition is not None:
                 agg_query = agg_query.filter(agg_condition)
        
        success_c, total_vol = agg_query.first()
        summary['total_volume'] = float(total_vol or 0)
        summary['success_count'] = success_c or 0
        
        # Fail count
        fail_query = db_session.query(func.count(PaymentRecord.id)).join(
            Sale, PaymentRecord.sale_id == Sale.id
        ).filter(
             PaymentRecord.created_at >= start_date,
             PaymentRecord.created_at <= end_date,
             PaymentRecord.pos_provider != None,
             PaymentRecord.status != 'paid'
        )
        if access.tenant_id:
             fail_query = fail_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
             fail_condition = build_branch_filter_condition(Sale.branch_id, branch_ids, include_unassigned_branch)
             if fail_condition is not None:
                 fail_query = fail_query.filter(fail_condition)
             
        summary['fail_count'] = fail_query.scalar() or 0
            
        return ResponseEnvelope(
            data=[PosMovementItem(**mask_pos_movement_item(d, access)) for d in data],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "summary": PosMovementSummary(
                    total_volume=summary['total_volume'] if access.has_permission(POS_FINANCIAL_PERMISSION) else 0.0,
                    success_count=summary['success_count'],
                    fail_count=summary['fail_count']
                )
            }
        )
    except Exception as e:
        logger.error(f"POS movements report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/report-tracking", operation_id="listReportTracking", response_model=ResponseEnvelope[List[ReportTrackingItem]])
def report_tracking(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    report_status: Optional[str] = Query(None, alias="report_status"),
    delivery_status: Optional[str] = Query(None, alias="delivery_status"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    search: Optional[str] = Query(None),
    access: UnifiedAccess = Depends(require_access("reports.report_tracking.view")),
    db_session: Session = Depends(get_db)
):
    """Track device-assignment report and delivery status"""
    try:
        branch_ids = get_user_branch_filter(access, branch_id)
        include_unassigned_branch = should_include_unassigned_branch(access, branch_id)
        query = db_session.query(
            DeviceAssignment,
            Sale.sale_date.label("sale_date"),
            Party.first_name.label("party_first_name"),
            Party.last_name.label("party_last_name"),
            Branch.name.label("branch_name"),
        ).join(
            Party, Party.id == DeviceAssignment.party_id
        ).outerjoin(
            Sale, Sale.id == DeviceAssignment.sale_id
        ).outerjoin(
            Branch, Branch.id == DeviceAssignment.branch_id
        )

        if access.tenant_id:
            query = query.filter(DeviceAssignment.tenant_id == access.tenant_id)
        if branch_ids:
            branch_condition = build_branch_filter_condition(DeviceAssignment.branch_id, branch_ids, include_unassigned_branch)
            if branch_condition is not None:
                query = query.filter(branch_condition)
        if report_status and report_status != "all":
            query = query.filter(DeviceAssignment.report_status == report_status)
        if delivery_status and delivery_status != "all":
            query = query.filter(DeviceAssignment.delivery_status == delivery_status)
        if start_date:
            parsed_start = parse_report_date(start_date)
            query = query.filter(DeviceAssignment.created_at >= parsed_start)
        if end_date:
            parsed_end = parse_report_date(end_date, end_of_day=True)
            query = query.filter(DeviceAssignment.created_at <= parsed_end)
        if search:
            pattern = f"%{search}%"
            query = query.filter(or_(
                Party.first_name.ilike(pattern),
                Party.last_name.ilike(pattern),
                DeviceAssignment.assignment_uid.ilike(pattern),
                DeviceAssignment.serial_number.ilike(pattern),
                DeviceAssignment.serial_number_left.ilike(pattern),
                DeviceAssignment.serial_number_right.ilike(pattern),
            ))

        total = query.count()
        rows = query.order_by(DeviceAssignment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

        data = []
        for assignment, sale_date, party_first_name, party_last_name, branch_name in rows:
            serial_number = assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right
            brand = assignment.device.brand if assignment.device else (assignment.inventory.brand if assignment.inventory else assignment.loaner_brand)
            model = assignment.device.model if assignment.device else (assignment.inventory.model if assignment.inventory else assignment.loaner_model)
            data.append({
                "id": assignment.id,
                "saleId": assignment.sale_id,
                "partyId": assignment.party_id,
                "partyName": f"{party_first_name or ''} {party_last_name or ''}".strip() or "Bilinmiyor",
                "branchId": assignment.branch_id,
                "branchName": branch_name,
                "brand": brand,
                "model": model,
                "deviceName": " ".join([part for part in [brand, model] if part]).strip() or None,
                "serialNumber": serial_number,
                "ear": assignment.ear,
                "reportStatus": assignment.report_status,
                "deliveryStatus": assignment.delivery_status,
                "assignedDate": assignment.created_at.isoformat() if assignment.created_at else None,
                "saleDate": sale_date.isoformat() if sale_date else None,
                "updatedAt": assignment.updated_at.isoformat() if assignment.updated_at else None,
            })

        return ResponseEnvelope(
            data=[ReportTrackingItem(**mask_report_tracking_item(item, access)) for item in data],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            }
        )
    except Exception as e:
        logger.error(f"Report tracking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
