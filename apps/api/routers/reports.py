"""
FastAPI Reports Router - Migrated from Flask routes/reports.py
Report endpoints for analytics and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case

from schemas.base import ResponseEnvelope, ApiError, ResponseMeta
from schemas.reports import (
    ReportOverviewResponse, ReportPatientsResponse, ReportFinancialResponse,
    ReportCampaignsResponse, ReportRevenueResponse, ReportPromissoryNotesResponse,
    ReportPromissoryNotesByPatientResponse, ReportRemainingPaymentsResponse,
    ReportCashflowResponse, PosMovementItem, PosMovementSummary,
    PatientSegments, ProductSalesData, PaymentMethodData, CampaignReportItem,
    PromissoryNotesSummary, MonthlyCount, MonthlyRevenue, PromissoryNotePatientItem,
    PromissoryNoteListItem, RemainingPaymentItem, RemainingPaymentsSummary,
    DailyCashflow
)

from core.models.party import Party
from models.appointment import Appointment
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.device import Device
from models.campaign import Campaign, SMSLog
from models.promissory_note import PromissoryNote
from models.enums import AppointmentStatus
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reports"])

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def get_user_branch_filter(access: UnifiedAccess, request_branch_id: Optional[str] = None) -> Optional[List[str]]:
    """Get branch IDs that current user has access to"""
    if access.is_super_admin:
        if request_branch_id:
            return [request_branch_id]
        return None
    
    user = access.user
    allowed_branch_ids = []
    if user and hasattr(user, 'branches') and user.branches:
        allowed_branch_ids = [str(b.id) for b in user.branches]
    
    if request_branch_id:
        if allowed_branch_ids and request_branch_id not in allowed_branch_ids:
            return ["00000000-0000-0000-0000-000000000000"]
        return [request_branch_id]
    
    if allowed_branch_ids:
        return allowed_branch_ids
    
    return None

def apply_branch_filter(query, model, branch_ids: Optional[List[str]]):
    """Apply branch filter to a query"""
    if branch_ids and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id.in_(branch_ids))
    return query

def tenant_filter(query, model, access: UnifiedAccess):
    """Apply tenant filter"""
    if access.tenant_id and hasattr(model, 'access.tenant_id'):
        return query.filter(model.tenant_id == access.tenant_id)
    return query

# --- Routes ---

@router.get("/reports/overview", operation_id="listReportOverview", response_model=ResponseEnvelope[ReportOverviewResponse])
def report_overview(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """General report overview"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(access, branch_id)
        
        # Party stats
        patient_q = tenant_filter(db_session.query(Party), Party, access)
        total_patients = patient_q.count()
        new_patients = patient_q.filter(Party.created_at >= start_date).count()
        
        # Appointment stats
        appointments_query = tenant_filter(db_session.query(Appointment), Appointment, access).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointments_query = apply_branch_filter(appointments_query, Appointment, branch_ids)
        total_appointments = appointments_query.count()
        
        completed_query = tenant_filter(db_session.query(Appointment), Appointment, access).filter(
            and_(
                Appointment.date >= start_date,
                Appointment.date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
        completed_query = apply_branch_filter(completed_query, Appointment, branch_ids)
        completed_appointments = completed_query.count()
        
        appointment_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
        
        # Sales stats
        sales_query = tenant_filter(db_session.query(Sale), Sale, access).filter(Sale.created_at >= start_date)
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids)
        total_sales = sales_query.count()
        
        revenue_query = db_session.query(func.sum(Sale.total_amount)).filter(Sale.created_at >= start_date)
        if access.tenant_id:
            revenue_query = revenue_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
        total_revenue = revenue_query.scalar() or 0
        
        conversion_rate = (total_sales / completed_appointments * 100) if completed_appointments > 0 else 0
        
        return ResponseEnvelope(
            data=ReportOverviewResponse(
                total_patients=total_patients,
                new_patients=new_patients,
                total_appointments=total_appointments,
                appointment_rate=round(appointment_rate, 1),
                total_sales=total_sales,
                total_revenue=float(total_revenue),
                conversion_rate=round(conversion_rate, 1)
            )
        )
    except Exception as e:
        logger.error(f"Overview report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/patients", operation_id="listReportPatients", response_model=ResponseEnvelope[ReportPatientsResponse])
def report_patients(
    days: int = Query(30, ge=1, le=365),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient analysis report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Age distribution (simplified)
        age_data = {"18-30": 0, "31-50": 0, "51-65": 0, "Other": 0}
        
        # Status distribution
        status_distribution = tenant_scoped_query(access, Appointment, db_session).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        ).with_entities(
            Appointment.status,
            func.count(Appointment.id)
        ).group_by(Appointment.status).all()
        
        status_data = {}
        for status, count in status_distribution:
            status_str = status.value if hasattr(status, 'value') else str(status)
            status_data[status_str] = count
        
        # Patient segments
        new_patients = tenant_scoped_query(access, Party, db_session).filter(Party.created_at >= start_date).count()
        
        active_patients = tenant_scoped_query(access, Party, db_session).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.COMPLETED
        ).count()
        
        trial_patients = tenant_scoped_query(access, Party, db_session).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.SCHEDULED
        ).count()
        
        appt_subquery = tenant_scoped_query(access, Appointment, db_session).filter(
            Appointment.date >= start_date
        ).with_entities(Appointment.party_id)
        
        inactive_patients = tenant_scoped_query(access, Party, db_session).filter(
            ~Party.id.in_(appt_subquery)
        ).count()
        
        return ResponseEnvelope(
            data=ReportPatientsResponse(
                age_distribution=age_data,
                status_distribution=status_data,
                patient_segments=PatientSegments(
                    new=new_patients,
                    active=active_patients,
                    trial=trial_patients,
                    inactive=inactive_patients
                )
            )
        )
    except Exception as e:
        logger.error(f"Patients report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/financial", operation_id="listReportFinancial", response_model=ResponseEnvelope[ReportFinancialResponse])
def report_financial(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Financial report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(access, branch_id)
        
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
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
        
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
            DeviceAssignment.created_at >= start_date
        )
        if access.tenant_id:
            product_query = product_query.filter(DeviceAssignment.tenant_id == access.tenant_id)
        if branch_ids:
            product_query = product_query.filter(DeviceAssignment.branch_id.in_(branch_ids))
        
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
        ).filter(Sale.created_at >= start_date)
        if access.tenant_id:
            payment_query = payment_query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            payment_query = payment_query.filter(Sale.branch_id.in_(branch_ids))
        
        payment_methods = payment_query.group_by(Sale.payment_method).all()
        
        payment_data = {}
        for method, count, amount in payment_methods:
            if method:
                payment_data[method] = {
                    "count": count,
                    "amount": float(amount)
                }
        
        return ResponseEnvelope(
            data=ReportFinancialResponse(
                revenue_trend=revenue_trend,
                product_sales={k: ProductSalesData(**v) for k, v in product_data.items()},
                payment_methods={k: PaymentMethodData(**v) for k, v in payment_data.items()}
            )
        )
    except Exception as e:
        logger.error(f"Financial report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/campaigns", operation_id="listReportCampaigns", response_model=ResponseEnvelope[ReportCampaignsResponse])
def report_campaigns(
    days: int = Query(30, ge=1, le=365),
    access: UnifiedAccess = Depends(require_access()),
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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Revenue report placeholder"""
    return ResponseEnvelope(
        data=ReportRevenueResponse(monthly=[12000, 15000, 15500])
    )

@router.get("/reports/appointments", operation_id="listReportAppointments")
def report_appointments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
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
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Promissory notes report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Summary stats
        total_notes = tenant_scoped_query(access, PromissoryNote, db_session).filter(
            PromissoryNote.created_at >= start_date
        ).count()
        
        active_notes = tenant_scoped_query(access, PromissoryNote, db_session).filter(
            PromissoryNote.status == 'active'
        ).count()
        
        overdue_notes = tenant_scoped_query(access, PromissoryNote, db_session).filter(
            PromissoryNote.status == 'overdue'
        ).count()
        
        paid_notes = tenant_scoped_query(access, PromissoryNote, db_session).filter(
            PromissoryNote.status == 'paid',
            PromissoryNote.paid_date >= start_date
        ).count()
        
        # Monthly counts
        count_query = db_session.query(
            extract('year', PromissoryNote.due_date).label('year'),
            extract('month', PromissoryNote.due_date).label('month'),
            func.count(PromissoryNote.id).label('count')
        ).filter(
            PromissoryNote.due_date >= start_date,
            PromissoryNote.due_date <= end_date
        )
        if access.tenant_id:
            count_query = count_query.filter(PromissoryNote.tenant_id == access.tenant_id)
            
        monthly_counts = count_query.group_by(
            extract('year', PromissoryNote.due_date),
            extract('month', PromissoryNote.due_date)
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
        total_amount = total_amount_q.scalar() or 0
        
        total_collected_q = db_session.query(func.sum(PromissoryNote.paid_amount)).filter(
            PromissoryNote.paid_date >= start_date
        )
        if access.tenant_id:
            total_collected_q = total_collected_q.filter(PromissoryNote.tenant_id == access.tenant_id)
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
        
        return ResponseEnvelope(
            data=ReportPromissoryNotesResponse(
                summary=PromissoryNotesSummary(
                    total_notes=total_notes,
                    active_notes=active_notes,
                    overdue_notes=overdue_notes,
                    paid_notes=paid_notes,
                    total_amount=float(total_amount),
                    total_collected=float(total_collected)
                ),
                monthly_counts=[MonthlyCount(**r) for r in monthly_counts_data],
                monthly_revenue=[MonthlyRevenue(**r) for r in monthly_revenue_data]
            )
        )
    except Exception as e:
        logger.error(f"Promissory notes report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/promissory-notes/by-patient", operation_id="listReportPromissoryNoteByPatient", response_model=ResponseEnvelope[List[PromissoryNotePatientItem]])
def report_promissory_notes_by_patient(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient promissory notes summary"""
    try:
        # Base query - patient notes summary
        subquery = db_session.query(
            PromissoryNote.party_id,
            func.count(PromissoryNote.id).label('total_notes'),
            func.count(case((PromissoryNote.status == 'active', 1))).label('active_notes'),
            func.count(case((PromissoryNote.status == 'overdue', 1))).label('overdue_notes'),
            func.count(case((PromissoryNote.status == 'paid', 1))).label('paid_notes'),
            func.sum(PromissoryNote.amount).label('total_amount'),
            func.sum(PromissoryNote.paid_amount).label('paid_amount'),
            func.sum(PromissoryNote.amount - PromissoryNote.paid_amount).label('remaining_amount')
        ).group_by(PromissoryNote.party_id)
        
        if access.tenant_id:
             subquery = subquery.filter(PromissoryNote.tenant_id == access.tenant_id)
        
        # Apply status filter
        if status == 'active':
            subquery = subquery.filter(PromissoryNote.status == 'active')
        elif status == 'overdue':
            subquery = subquery.filter(PromissoryNote.status == 'overdue')
        elif status != 'all':
            # Default: show only patients with active/overdue notes
            subquery = subquery.filter(PromissoryNote.status.in_(['active', 'overdue']))
        
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
            subquery.c.remaining_amount
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
                "remaining_amount": float(row.remaining_amount) if row.remaining_amount else 0
            })
        
        return ResponseEnvelope(
            data=[PromissoryNotePatientItem(**p) for p in patients_data],
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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    search: Optional[str] = Query(None),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Detailed promissory notes list report"""
    try:
        query = tenant_scoped_query(access, PromissoryNote, db_session)
        
        # Filters
        if status and status != 'all':
            query = query.filter(PromissoryNote.status == status)
            
        if start_date:
            s_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(PromissoryNote.due_date >= s_date)
            
        if end_date:
            e_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(PromissoryNote.due_date <= e_date)
            
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
            results.append({
                "id": note.id,
                "note_number": note.note_number,
                "amount": float(note.amount),
                "paid_amount": float(note.paid_amount),
                "remaining_amount": float(note.amount - note.paid_amount),
                "due_date": note.due_date.isoformat(),
                "status": note.status.value if hasattr(note.status, 'value') else note.status,
                "party": {
                    "id": note.party.id,
                    "name": f"{note.party.first_name} {note.party.last_name}",
                    "phone": note.party.phone
                } if note.party else None
            })
            
        return ResponseEnvelope(
            data=[PromissoryNoteListItem(**r) for r in results],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Promissory notes list report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/remaining-payments", operation_id="listReportRemainingPayments", response_model=ResponseEnvelope[List[RemainingPaymentItem]])
def report_remaining_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    min_amount: float = Query(0, ge=0, alias="min_amount"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Remaining payments report"""
    try:
        branch_ids = get_user_branch_filter(access, branch_id)
        
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
        
        if access.tenant_id:
            query = query.filter(Sale.tenant_id == access.tenant_id)
        if branch_ids:
            query = query.filter(Sale.branch_id.in_(branch_ids))
        
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
        
        if access.tenant_id:
            summary_query = summary_query.filter(Sale.tenant_id == access.tenant_id)

        if branch_ids:
            summary_query = summary_query.filter(Sale.branch_id.in_(branch_ids))
        summary = summary_query.first()
        
        return ResponseEnvelope(
            data=[RemainingPaymentItem(**p) for p in patients_data],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "summary": RemainingPaymentsSummary(
                    total_parties=summary.party_count or 0 if summary else 0,
                    total_remaining=float(summary.total_remaining) if summary and summary.total_remaining else 0
                )
            }
        )
    except Exception as e:
        logger.error(f"Remaining payments report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/cashflow-summary", operation_id="listReportCashflowSummary", response_model=ResponseEnvelope[ReportCashflowResponse])
def report_cashflow_summary(
    days: int = Query(30, ge=1, le=365),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Cashflow summary report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(access)
        
        # Income (Revenue)
        revenue_query = db_session.query(func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if access.tenant_id:
             revenue_query = revenue_query.filter(Sale.tenant_id == access.tenant_id)
             
        if branch_ids:
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
            
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
            daily_query = daily_query.filter(Sale.branch_id.in_(branch_ids))
            
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
            
        return ResponseEnvelope(
            data=ReportCashflowResponse(
                total_revenue=float(total_revenue),
                total_expenses=float(total_expenses),
                net_cash=float(net_cash),
                daily_breakdown=[DailyCashflow(**d) for d in daily_data]
            )
        )
    except Exception as e:
        logger.error(f"Cashflow summary report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/pos-movements", operation_id="listReportPosMovements", response_model=ResponseEnvelope[List[PosMovementItem]])
def report_pos_movements(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    days: int = Query(30, ge=1, le=365),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """POS movements report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(access)
        
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
            query = query.filter(Sale.branch_id.in_(branch_ids))
            
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
                'patient_name': f"{party.first_name} {party.last_name}" if party else "Bilinmiyor"
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
             agg_query = agg_query.filter(Sale.branch_id.in_(branch_ids))
        
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
             fail_query = fail_query.filter(Sale.branch_id.in_(branch_ids))
             
        summary['fail_count'] = fail_query.scalar() or 0
            
        return ResponseEnvelope(
            data=[PosMovementItem(**d) for d in data],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
                "summary": PosMovementSummary(
                    total_volume=summary['total_volume'],
                    success_count=summary['success_count'],
                    fail_count=summary['fail_count']
                )
            }
        )
    except Exception as e:
        logger.error(f"POS movements report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
