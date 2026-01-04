"""
FastAPI Reports Router - Migrated from Flask routes/reports.py
Report endpoints for analytics and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.base import db
from models.patient import Patient
from models.appointment import Appointment
from models.sales import Sale, DeviceAssignment
from models.device import Device
from models.campaign import Campaign, SMSLog
from models.promissory_note import PromissoryNote
from models.enums import AppointmentStatus

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reports"])

# --- Helper Functions ---

def tenant_scoped_query(ctx: AccessContext, model):
    """Apply tenant scoping to query"""
    query = model.query
    if ctx.tenant_id:
        query = query.filter_by(tenant_id=ctx.tenant_id)
    return query

def get_user_branch_filter(ctx: AccessContext, request_branch_id: Optional[str] = None) -> Optional[List[str]]:
    """Get branch IDs that current user has access to"""
    if ctx.is_super_admin:
        if request_branch_id:
            return [request_branch_id]
        return None
    
    user = ctx.user
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

def tenant_filter(query, model, ctx: AccessContext):
    """Apply tenant filter"""
    if ctx.tenant_id and hasattr(model, 'tenant_id'):
        return query.filter(model.tenant_id == ctx.tenant_id)
    return query

# --- Routes ---

@router.get("/reports/overview")
def report_overview(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """General report overview"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx, branch_id)
        
        # Patient stats
        patient_q = tenant_filter(Patient.query, Patient, ctx)
        total_patients = patient_q.count()
        new_patients = patient_q.filter(Patient.created_at >= start_date).count()
        
        # Appointment stats
        appointments_query = tenant_filter(Appointment.query, Appointment, ctx).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointments_query = apply_branch_filter(appointments_query, Appointment, branch_ids)
        total_appointments = appointments_query.count()
        
        completed_query = tenant_filter(Appointment.query, Appointment, ctx).filter(
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
        sales_query = tenant_filter(Sale.query, Sale, ctx).filter(Sale.created_at >= start_date)
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids)
        total_sales = sales_query.count()
        
        revenue_query = db_session.query(func.sum(Sale.total_amount)).filter(Sale.created_at >= start_date)
        if ctx.tenant_id:
            revenue_query = revenue_query.filter(Sale.tenant_id == ctx.tenant_id)
        if branch_ids:
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
        total_revenue = revenue_query.scalar() or 0
        
        conversion_rate = (total_sales / completed_appointments * 100) if completed_appointments > 0 else 0
        
        return ResponseEnvelope(
            data={
                "totalPatients": total_patients,
                "newPatients": new_patients,
                "totalAppointments": total_appointments,
                "appointmentRate": round(appointment_rate, 1),
                "totalSales": total_sales,
                "totalRevenue": float(total_revenue),
                "conversionRate": round(conversion_rate, 1)
            }
        )
    except Exception as e:
        logger.error(f"Overview report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/patients")
def report_patients(
    days: int = Query(30, ge=1, le=365),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Patient analysis report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Age distribution (simplified)
        age_data = {"18-30": 0, "31-50": 0, "51-65": 0, "Other": 0}
        
        # Status distribution
        status_distribution = tenant_scoped_query(ctx, Appointment).filter(
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
        new_patients = tenant_scoped_query(ctx, Patient).filter(Patient.created_at >= start_date).count()
        
        active_patients = tenant_scoped_query(ctx, Patient).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.COMPLETED
        ).count()
        
        trial_patients = tenant_scoped_query(ctx, Patient).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.SCHEDULED
        ).count()
        
        appt_subquery = tenant_scoped_query(ctx, Appointment).filter(
            Appointment.date >= start_date
        ).with_entities(Appointment.patient_id)
        
        inactive_patients = tenant_scoped_query(ctx, Patient).filter(
            ~Patient.id.in_(appt_subquery)
        ).count()
        
        return ResponseEnvelope(
            data={
                "ageDistribution": age_data,
                "statusDistribution": status_data,
                "patientSegments": {
                    "new": new_patients,
                    "active": active_patients,
                    "trial": trial_patients,
                    "inactive": inactive_patients
                }
            }
        )
    except Exception as e:
        logger.error(f"Patients report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/financial")
def report_financial(
    days: int = Query(30, ge=1, le=365),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Financial report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx, branch_id)
        
        # Monthly revenue trend
        revenue_query = db_session.query(
            extract('month', Sale.created_at),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if ctx.tenant_id:
            revenue_query = revenue_query.filter(Sale.tenant_id == ctx.tenant_id)
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
        if ctx.tenant_id:
            product_query = product_query.filter(DeviceAssignment.tenant_id == ctx.tenant_id)
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
        if ctx.tenant_id:
            payment_query = payment_query.filter(Sale.tenant_id == ctx.tenant_id)
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
            data={
                "revenueTrend": revenue_trend,
                "productSales": product_data,
                "paymentMethods": payment_data
            }
        )
    except Exception as e:
        logger.error(f"Financial report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/campaigns")
def report_campaigns(
    days: int = Query(30, ge=1, le=365),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Campaign report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        campaigns = tenant_scoped_query(ctx, Campaign).filter(
            Campaign.created_at >= start_date
        ).all()
        
        campaign_data = []
        for campaign in campaigns:
            sms_logs = tenant_scoped_query(ctx, SMSLog).filter(
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
                "sentCount": sent_count,
                "deliveredCount": delivered_count,
                "deliveryRate": round(delivery_rate, 1),
                "openRate": round(open_rate, 1),
                "clickRate": round(click_rate, 1),
                "status": campaign.status
            })
        
        # SMS trends
        sms_trends_q = db_session.query(
            func.date(SMSLog.created_at),
            func.count(SMSLog.id)
        ).filter(SMSLog.created_at >= start_date)
        if ctx.tenant_id:
            sms_trends_q = sms_trends_q.filter(SMSLog.tenant_id == ctx.tenant_id)
        
        sms_trends = sms_trends_q.group_by(
            func.date(SMSLog.created_at)
        ).order_by(
            func.date(SMSLog.created_at)
        ).all()
        
        trend_data = {str(date): count for date, count in sms_trends}
        
        return ResponseEnvelope(
            data={
                "campaigns": campaign_data,
                "smsTrends": trend_data
            }
        )
    except Exception as e:
        logger.error(f"Campaigns report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/revenue")
def report_revenue(
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Revenue report placeholder"""
    return ResponseEnvelope(
        data={"monthly": [12000, 15000, 15500]}
    )

@router.get("/reports/appointments")
def report_appointments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Appointments report placeholder"""
    return ResponseEnvelope(
        data=[],
        meta={"total": 0, "page": page, "perPage": per_page, "totalPages": 0}
    )

@router.get("/reports/promissory-notes")
def report_promissory_notes(
    days: int = Query(365, ge=1),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Promissory notes report"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Summary stats
        total_notes = tenant_scoped_query(ctx, PromissoryNote).filter(
            PromissoryNote.created_at >= start_date
        ).count()
        
        active_notes = tenant_scoped_query(ctx, PromissoryNote).filter(
            PromissoryNote.status == 'active'
        ).count()
        
        overdue_notes = tenant_scoped_query(ctx, PromissoryNote).filter(
            PromissoryNote.status == 'overdue'
        ).count()
        
        paid_notes = tenant_scoped_query(ctx, PromissoryNote).filter(
            PromissoryNote.status == 'paid',
            PromissoryNote.paid_date >= start_date
        ).count()
        
        # Total amounts
        total_amount_q = db_session.query(func.sum(PromissoryNote.amount)).filter(
            PromissoryNote.status.in_(['active', 'overdue'])
        )
        if ctx.tenant_id:
            total_amount_q = total_amount_q.filter(PromissoryNote.tenant_id == ctx.tenant_id)
        total_amount = total_amount_q.scalar() or 0
        
        total_collected_q = db_session.query(func.sum(PromissoryNote.paid_amount)).filter(
            PromissoryNote.paid_date >= start_date
        )
        if ctx.tenant_id:
            total_collected_q = total_collected_q.filter(PromissoryNote.tenant_id == ctx.tenant_id)
        total_collected = total_collected_q.scalar() or 0
        
        return ResponseEnvelope(
            data={
                "summary": {
                    "totalNotes": total_notes,
                    "activeNotes": active_notes,
                    "overdueNotes": overdue_notes,
                    "paidNotes": paid_notes,
                    "totalAmount": float(total_amount),
                    "totalCollected": float(total_collected)
                }
            }
        )
    except Exception as e:
        logger.error(f"Promissory notes report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/remaining-payments")
def report_remaining_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    min_amount: float = Query(0, ge=0),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Remaining payments report"""
    try:
        branch_ids = get_user_branch_filter(ctx, branch_id)
        
        query = db_session.query(
            Patient.id.label('patient_id'),
            Patient.first_name,
            Patient.last_name,
            Patient.phone,
            func.count(Sale.id).label('sale_count'),
            func.sum(Sale.final_amount).label('total_amount'),
            func.sum(Sale.paid_amount).label('paid_amount'),
            func.sum(Sale.final_amount - Sale.paid_amount).label('remaining_amount')
        ).join(
            Sale, Patient.id == Sale.patient_id
        ).filter(
            Sale.final_amount > Sale.paid_amount,
            Sale.status != 'cancelled'
        )
        
        if ctx.tenant_id:
            query = query.filter(Sale.tenant_id == ctx.tenant_id)
        if branch_ids:
            query = query.filter(Sale.branch_id.in_(branch_ids))
        
        query = query.group_by(Patient.id, Patient.first_name, Patient.last_name, Patient.phone)
        
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
                "patientId": row.patient_id,
                "patientName": f"{row.first_name or ''} {row.last_name or ''}".strip(),
                "phone": row.phone,
                "saleCount": row.sale_count or 0,
                "totalAmount": float(row.total_amount) if row.total_amount else 0,
                "paidAmount": float(row.paid_amount) if row.paid_amount else 0,
                "remainingAmount": float(row.remaining_amount) if row.remaining_amount else 0
            })
        
        return ResponseEnvelope(
            data=patients_data,
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Remaining payments report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
