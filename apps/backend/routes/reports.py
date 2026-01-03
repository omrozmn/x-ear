from flask import Blueprint, request, jsonify, g
from models.base import db
from models.patient import Patient
from models.appointment import Appointment
from models.sales import Sale
from models.campaign import Campaign, SMSLog
from models.promissory_note import PromissoryNote
from models.enums import AppointmentStatus
from datetime import datetime, timedelta
import logging
from sqlalchemy import func, extract, and_, or_, case

logger = logging.getLogger(__name__)

reports_bp = Blueprint('reports', __name__)


from utils.decorators import unified_access
from utils.access_context import AccessContext

def get_user_branch_filter(ctx):
    """Get branch IDs that current user has access to"""
    requested_branch_id = request.args.get('branch_id')
    
    # 1. Super Admin (Global Access)
    if ctx.is_super_admin:
        # Can request any branch or see all
        if requested_branch_id:
            return [requested_branch_id]
        return None
        
    # 2. Tenant User / Admin
    # Should be scoped to their tenant automatically by tenant_id filter on models,
    # but for branches specifically:
    
    # If user has specific branch assignments
    user = ctx.user
    allowed_branch_ids = []
    if user and user.branches:
        allowed_branch_ids = [str(b.id) for b in user.branches]
        
    if requested_branch_id:
        # If user is restricted to specific branches, verify access
        if allowed_branch_ids and requested_branch_id not in allowed_branch_ids:
            # Requested branch not in allowed list -> Empty result or Error?
            # Let's return a dummy ID to ensure 0 results
            return ["00000000-0000-0000-0000-000000000000"]
        return [requested_branch_id]
        
    # If no specific branch requested, return allowed branches (if any restriction exists)
    if allowed_branch_ids:
        return allowed_branch_ids
        
    # If no branch restriction, return None (All branches in tenant)
    return None


def apply_branch_filter(query, model, branch_ids):
    """Apply branch filter to a query if branch_ids is provided"""
    if branch_ids and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id.in_(branch_ids))
    return query

@reports_bp.route('/reports/overview', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_overview(ctx):
    """Genel rapor özeti"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx)

        # Hasta istatistikleri
        # Note: Patients are usually tenant-scoped, handled by filter below or global query policy
        # If Patient model has tenant_id, we should filter by it.
        # Assuming @unified_access context is enough for multi-tenancy if we use tenant_scoped_query?
        # But reports.py uses direct Model.query. This is risky for multi-tenancy!
        # We MUST filter by tenant_id if not Super Admin.
        
        # Helper for tenant filtering
        def tenant_filter(q, m):
            if ctx.tenant_id and hasattr(m, 'tenant_id'):
                return q.filter(m.tenant_id == ctx.tenant_id)
            return q

        # Hasta istatistikleri
        patient_q = tenant_filter(Patient.query, Patient)
        total_patients = patient_q.count()
        new_patients = patient_q.filter(Patient.created_at >= start_date).count()

        # Randevu istatistikleri - with branch filter
        appointments_query = tenant_filter(Appointment.query, Appointment).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointments_query = apply_branch_filter(appointments_query, Appointment, branch_ids)
        total_appointments = appointments_query.count()

        completed_query = tenant_filter(Appointment.query, Appointment).filter(
            and_(
                Appointment.date >= start_date,
                Appointment.date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
        completed_query = apply_branch_filter(completed_query, Appointment, branch_ids)
        completed_appointments = completed_query.count()

        appointment_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0

        # Satış istatistikleri - with branch filter
        sales_query = tenant_filter(Sale.query, Sale).filter(Sale.created_at >= start_date)
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids)
        total_sales = sales_query.count()
        
        revenue_query = db.session.query(func.sum(Sale.total_amount))
        revenue_query = tenant_filter(revenue_query, Sale)
        revenue_query = revenue_query.filter(
            Sale.created_at >= start_date
        )
        if branch_ids:
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
        total_revenue = revenue_query.scalar() or 0

        # Dönüşüm oranı (randevu -> satış)
        conversion_rate = (total_sales / completed_appointments * 100) if completed_appointments > 0 else 0

        return jsonify({
            "success": True,
            "data": {
                "total_patients": total_patients,
                "new_patients": new_patients,
                "total_appointments": total_appointments,
                "appointment_rate": round(appointment_rate, 1),
                "total_sales": total_sales,
                "total_revenue": float(total_revenue),
                "conversion_rate": round(conversion_rate, 1)
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Overview report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

from utils.query_policy import tenant_scoped_query

@reports_bp.route('/reports/patients', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_patients(ctx):
    """Hasta analizi raporu"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Yaş dağılımı - basitleştirilmiş
        age_data = {"18-30": 0, "31-50": 0, "51-65": 0, "Other": 0}

        # Durum dağılımı
        status_distribution = tenant_scoped_query(ctx, Appointment).filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        ).with_entities(
            Appointment.status,
            func.count(Appointment.id)
        ).group_by(Appointment.status).all()

        status_data = {}
        for status, count in status_distribution:
            # Convert enum to string value
            status_str = status.value if hasattr(status, 'value') else str(status)
            status_data[status_str] = count

        # Hasta segmentasyonu
        new_patients = tenant_scoped_query(ctx, Patient).filter(Patient.created_at >= start_date).count()

        active_patients = tenant_scoped_query(ctx, Patient).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.COMPLETED
        ).count()

        trial_patients = tenant_scoped_query(ctx, Patient).join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.SCHEDULED
        ).count()
        
        # Note: Inactive logic is tricky with scoped query due to subquery.
        # But tenant_scoped_query returns a query object, so we can use it in IN clause if careful.
        # Alternatively, simplify: inactive = Total - Active (Roughly)
        # Or construct proper subquery.
        
        # Subquery for appointments content needs to be scoped too?
        # Yes, Appointment.patient_id... filter(Appointment.date...)
        # Constructing scoped subquery:
        appt_subquery = tenant_scoped_query(ctx, Appointment).filter(
            Appointment.date >= start_date
        ).with_entities(Appointment.patient_id)
        
        inactive_patients = tenant_scoped_query(ctx, Patient).filter(
            ~Patient.id.in_(appt_subquery)
        ).count()

        return jsonify({
            "success": True,
            "data": {
                "age_distribution": age_data,
                "status_distribution": status_data,
                "patient_segments": {
                    "new": new_patients,
                    "active": active_patients,
                    "trial": trial_patients,
                    "inactive": inactive_patients
                }
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Patients report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@reports_bp.route('/reports/financial', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_financial(ctx):
    """Mali rapor"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx)

        # Aylık gelir trendi - with branch filter
        # Note: complex aggregation needs manual scoping if not using tenant_scoped_query helper
        # because helper does Model.query...
        # So we manually filter tenant_id on db.session.query
        
        def scoped_session_query(*entities):
            q = db.session.query(*entities)
            if ctx.tenant_id:
                # Find which model has tenant_id from entities? 
                # This depends on the query structure.
                pass 
            return q

        # Revenue Query
        revenue_query = db.session.query(
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

        # Ürün satış dağılımı (DeviceAssignment üzerinden)
        from models.sales import DeviceAssignment
        from models.device import Device
        
        product_query = db.session.query(
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

        # Ödeme yöntemleri - with branch filter
        payment_query = db.session.query(
            Sale.payment_method,
            func.count(Sale.id),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date
        )
        
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

        return jsonify({
            "success": True,
            "data": {
                "revenue_trend": revenue_trend,
                "product_sales": product_data,
                "payment_methods": payment_data
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Financial report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@reports_bp.route('/reports/campaigns', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_campaigns(ctx):
    """Kampanya raporu"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Kampanya performansı
        campaigns = tenant_scoped_query(ctx, Campaign).filter(
            Campaign.created_at >= start_date
        ).all()

        campaign_data = []
        for campaign in campaigns:
            # logs are linked to campaign, campaign query is already scoped.
            # But technically SMSLog might need scoping? 
            # SMSLog belongs to tenant? Assuming yes.
            # Safer to query logs via campaign relationship or scoped query.
            # Using scoped query:
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
                "sent_count": sent_count,
                "delivered_count": delivered_count,
                "delivery_rate": round(delivery_rate, 1),
                "open_rate": round(open_rate, 1),
                "click_rate": round(click_rate, 1),
                "status": campaign.status
            })

        # SMS trendleri (günlük)
        sms_trends_q = db.session.query(
            func.date(SMSLog.created_at),
            func.count(SMSLog.id)
        ).filter(
            SMSLog.created_at >= start_date
        )
        if ctx.tenant_id:
            sms_trends_q = sms_trends_q.filter(SMSLog.tenant_id == ctx.tenant_id)
            
        sms_trends = sms_trends_q.group_by(
            func.date(SMSLog.created_at)
        ).order_by(
            func.date(SMSLog.created_at)
        ).all()

        trend_data = {str(date): count for date, count in sms_trends}

        return jsonify({
            "success": True,
            "data": {
                "campaigns": campaign_data,
                "sms_trends": trend_data
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Campaigns report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@reports_bp.route('/reports/revenue', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_revenue(ctx):
    try:
        # placeholder aggregated revenue calculation
        return jsonify({"success": True, "revenue": {"monthly": [12000, 15000, 15500]}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Revenue report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/appointments', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_appointments(ctx):
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        # placeholder: run a paginated query once real data available
        appointments = []
        total = 0
        return jsonify({
            "success": True,
            "data": appointments,
            "meta": {"total": total, "page": page, "perPage": per_page, "totalPages": 0},
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Appointments report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/promissory-notes', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_promissory_notes(ctx):
    """Senet raporları - aylık sayı, gelir ve özet"""
    try:
        days = int(request.args.get('days', 365))  # Default 1 year for monthly view
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Monthly note count
        count_query = db.session.query(
            extract('year', PromissoryNote.due_date).label('year'),
            extract('month', PromissoryNote.due_date).label('month'),
            func.count(PromissoryNote.id).label('count')
        ).filter(
            PromissoryNote.due_date >= start_date,
            PromissoryNote.due_date <= end_date
        )
        if ctx.tenant_id:
            count_query = count_query.filter(PromissoryNote.tenant_id == ctx.tenant_id)
            
        monthly_counts = count_query.group_by(
            extract('year', PromissoryNote.due_date),
            extract('month', PromissoryNote.due_date)
        ).order_by('year', 'month').all()
        
        # Monthly revenue from paid notes
        revenue_query = db.session.query(
            extract('year', PromissoryNote.paid_date).label('year'),
            extract('month', PromissoryNote.paid_date).label('month'),
            func.sum(PromissoryNote.paid_amount).label('revenue')
        ).filter(
            PromissoryNote.paid_date >= start_date,
            PromissoryNote.paid_date <= end_date,
            PromissoryNote.status.in_(['paid', 'partial'])
        )
        if ctx.tenant_id:
            revenue_query = revenue_query.filter(PromissoryNote.tenant_id == ctx.tenant_id)
            
        monthly_revenue = revenue_query.group_by(
            extract('year', PromissoryNote.paid_date),
            extract('month', PromissoryNote.paid_date)
        ).order_by('year', 'month').all()
        
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
        total_amount_q = db.session.query(func.sum(PromissoryNote.amount)).filter(
            PromissoryNote.status.in_(['active', 'overdue'])
        )
        if ctx.tenant_id:
            total_amount_q = total_amount_q.filter(PromissoryNote.tenant_id == ctx.tenant_id)
        total_amount = total_amount_q.scalar() or 0
        
        total_collected_q = db.session.query(func.sum(PromissoryNote.paid_amount)).filter(
            PromissoryNote.paid_date >= start_date
        )
        if ctx.tenant_id:
            total_collected_q = total_collected_q.filter(PromissoryNote.tenant_id == ctx.tenant_id)
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
        
        return jsonify({
            "success": True,
            "data": {
                "summary": {
                    "totalNotes": total_notes,
                    "activeNotes": active_notes,
                    "overdueNotes": overdue_notes,
                    "paidNotes": paid_notes,
                    "totalAmount": float(total_amount),
                    "totalCollected": float(total_collected)
                },
                "monthlyCounts": monthly_counts_data,
                "monthlyRevenue": monthly_revenue_data
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Promissory notes report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/promissory-notes/by-patient', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_promissory_notes_by_patient(ctx):
    """Hasta bazlı senet özeti - hangi hastanın kaç senedi kalmış"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        status_filter = request.args.get('status')  # active, overdue, all
        
        # Base query - patient notes summary
        subquery = db.session.query(
            PromissoryNote.patient_id,
            func.count(PromissoryNote.id).label('total_notes'),
            func.count(case((PromissoryNote.status == 'active', 1))).label('active_notes'),
            func.count(case((PromissoryNote.status == 'overdue', 1))).label('overdue_notes'),
            func.count(case((PromissoryNote.status == 'paid', 1))).label('paid_notes'),
            func.sum(PromissoryNote.amount).label('total_amount'),
            func.sum(PromissoryNote.paid_amount).label('paid_amount'),
            func.sum(PromissoryNote.amount - PromissoryNote.paid_amount).label('remaining_amount')
        ).group_by(PromissoryNote.patient_id)
        
        if ctx.tenant_id:
             subquery = subquery.filter(PromissoryNote.tenant_id == ctx.tenant_id)
        
        # Apply status filter
        if status_filter == 'active':
            subquery = subquery.filter(PromissoryNote.status == 'active')
        elif status_filter == 'overdue':
            subquery = subquery.filter(PromissoryNote.status == 'overdue')
        elif status_filter != 'all':
            # Default: show only patients with active/overdue notes
            subquery = subquery.filter(PromissoryNote.status.in_(['active', 'overdue']))
        
        subquery = subquery.subquery()
        
        # Join with Patient to get patient info
        query = db.session.query(
            Patient.id,
            Patient.first_name,
            Patient.last_name,
            Patient.phone,
            subquery.c.total_notes,
            subquery.c.active_notes,
            subquery.c.overdue_notes,
            subquery.c.paid_notes,
            subquery.c.total_amount,
            subquery.c.paid_amount,
            subquery.c.remaining_amount
        ).join(subquery, Patient.id == subquery.c.patient_id)
        
        # Order by remaining amount descending
        query = query.order_by(subquery.c.remaining_amount.desc())
        
        # Get total count before pagination
        total = query.count()
        
        # Paginate
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        patients_data = []
        for row in results:
            patients_data.append({
                "patientId": row.id,
                "patientName": f"{row.first_name or ''} {row.last_name or ''}".strip(),
                "phone": row.phone,
                "totalNotes": row.total_notes or 0,
                "activeNotes": row.active_notes or 0,
                "overdueNotes": row.overdue_notes or 0,
                "paidNotes": row.paid_notes or 0,
                "totalAmount": float(row.total_amount) if row.total_amount else 0,
                "paidAmount": float(row.paid_amount) if row.paid_amount else 0,
                "remainingAmount": float(row.remaining_amount) if row.remaining_amount else 0
            })
        
        return jsonify({
            "success": True,
            "data": patients_data,
            "meta": {
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Promissory notes by patient report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/remaining-payments', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_remaining_payments(ctx):
    """Kalan ödemeler raporu - hangi hastanın ne kadar ödemesi kalmış"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        branch_ids = get_user_branch_filter(ctx)
        min_amount = float(request.args.get('min_amount', 0))
        
        # Query sales with remaining payment
        query = db.session.query(
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
            Sale.final_amount > Sale.paid_amount,  # Only sales with remaining payment
            Sale.status != 'cancelled'
        )
        
        if ctx.tenant_id:
             query = query.filter(Sale.tenant_id == ctx.tenant_id)
        
        # Apply branch filter
        if branch_ids:
            query = query.filter(Sale.branch_id.in_(branch_ids))
        
        query = query.group_by(Patient.id, Patient.first_name, Patient.last_name, Patient.phone)
        
        # Filter by minimum amount
        if min_amount > 0:
            query = query.having(func.sum(Sale.final_amount - Sale.paid_amount) >= min_amount)
        
        # Order by remaining amount descending
        query = query.order_by(func.sum(Sale.final_amount - Sale.paid_amount).desc())
        
        # Get total count
        count_query = query.subquery()
        total = db.session.query(func.count()).select_from(count_query).scalar()
        
        # Paginate
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
        
        # Summary totals
        summary_query = db.session.query(
            func.count(func.distinct(Patient.id)).label('patient_count'),
            func.sum(Sale.final_amount - Sale.paid_amount).label('total_remaining')
        ).join(
            Sale, Patient.id == Sale.patient_id
        ).filter(
            Sale.final_amount > Sale.paid_amount,
            Sale.status != 'cancelled'
        )
        
        if ctx.tenant_id:
            summary_query = summary_query.filter(Sale.tenant_id == ctx.tenant_id)

        if branch_ids:
            summary_query = summary_query.filter(Sale.branch_id.in_(branch_ids))
        summary = summary_query.first()
        
        return jsonify({
            "success": True,
            "data": patients_data,
            "summary": {
                "totalPatients": summary.patient_count or 0,
                "totalRemaining": float(summary.total_remaining) if summary.total_remaining else 0
            },
            "meta": {
                "total": total or 0,
                "page": page,
                "perPage": per_page,
                "totalPages": ((total or 0) + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Remaining payments report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/cashflow-summary', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_cashflow_summary(ctx):
    """Nakit akışı özeti"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx)
        
        # Gelirler (Tahsilatlar)
        revenue_query = db.session.query(func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        if ctx.tenant_id:
             revenue_query = revenue_query.filter(Sale.tenant_id == ctx.tenant_id)
             
        if branch_ids:
            revenue_query = revenue_query.filter(Sale.branch_id.in_(branch_ids))
            
        total_revenue = revenue_query.scalar() or 0
        
        # Giderler (Expenses)
        total_expenses = 0
        
        # Net nakit
        net_cash = float(total_revenue) - float(total_expenses)
        
        # Daily breakdown
        daily_query = db.session.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.total_amount).label('income')
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
        
        if ctx.tenant_id:
            daily_query = daily_query.filter(Sale.tenant_id == ctx.tenant_id)

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
                "expense": 0  # placeholder
            })
            
        return jsonify({
            "success": True,
            "data": {
                "total_revenue": float(total_revenue),
                "total_expenses": float(total_expenses),
                "net_cash": float(net_cash),
                "daily_breakdown": daily_data
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Cashflow summary report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/promissory-notes/list', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_promissory_notes_list(ctx):
    """Detaylı senet listesi raporu"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        status = request.args.get('status')
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        search = request.args.get('search')
        
        query = tenant_scoped_query(ctx, PromissoryNote)
        
        # Filtreler
        if status and status != 'all':
            query = query.filter(PromissoryNote.status == status)
            
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            query = query.filter(PromissoryNote.due_date >= start_date)
            
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            query = query.filter(PromissoryNote.due_date <= end_date)
            
        if search:
            query = query.join(Patient).filter(
                or_(
                    Patient.first_name.ilike(f"%{search}%"),
                    Patient.last_name.ilike(f"%{search}%"),
                    Patient.phone.ilike(f"%{search}%"),
                    PromissoryNote.note_number.ilike(f"%{search}%")
                )
            )
            
        # Sıralama (vade tarihine göre)
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
                "patient": {
                    "id": note.patient.id,
                    "name": f"{note.patient.first_name} {note.patient.last_name}",
                    "phone": note.patient.phone
                } if note.patient else None
            })
            
        return jsonify({
            "success": True,
            "data": results,
            "meta": {
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Promissory notes list report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/pos-movements', methods=['GET'])
@unified_access(resource='reports', action='view')
def report_pos_movements(ctx):
    """POS hareketleri raporu"""
    try:
        from models.sales import PaymentRecord
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter(ctx)
        
        # Build query
        # Using tenant_scoped_query for PaymentRecord might be tricky if it doesn't have tenant_id
        # Let's check PaymentRecord via imports ? 
        # Usually it is child of Sale. 
        # Safer to use Sale query joined with PaymentRecord + tenant scoping on Sale.
        
        query = db.session.query(
            PaymentRecord,
            Sale,
            Patient
        ).join(
            Sale, PaymentRecord.sale_id == Sale.id
        ).join(
            Patient, Sale.patient_id == Patient.id, isouter=True
        ).filter(
            PaymentRecord.created_at >= start_date,
            PaymentRecord.created_at <= end_date,
            PaymentRecord.pos_provider != None
        )
        
        if ctx.tenant_id:
             query = query.filter(Sale.tenant_id == ctx.tenant_id)
        
        if branch_ids:
            query = query.filter(Sale.branch_id.in_(branch_ids))
            
        # Total count
        total = query.count()
            
        query = query.order_by(PaymentRecord.created_at.desc())
        
        # Paginated results
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        data = []
        for payment, sale, patient in results:
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
                'patient_name': f"{patient.first_name} {patient.last_name}" if patient else "Bilinmiyor"
            })
            
        # Summary
        summary = {
            'total_volume': 0,
            'success_count': 0,
            'fail_count': 0
        }
        
        # Aggregation for summary
        agg_query = db.session.query(
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
        
        if ctx.tenant_id:
             agg_query = agg_query.filter(Sale.tenant_id == ctx.tenant_id)
             
        if branch_ids:
             agg_query = agg_query.filter(Sale.branch_id.in_(branch_ids))
        
        success_c, total_vol = agg_query.first()
        summary['total_volume'] = float(total_vol or 0)
        summary['success_count'] = success_c or 0
        
        # Fail count
        fail_query = db.session.query(func.count(PaymentRecord.id)).join(
            Sale, PaymentRecord.sale_id == Sale.id
        ).filter(
             PaymentRecord.created_at >= start_date,
             PaymentRecord.created_at <= end_date,
             PaymentRecord.pos_provider != None,
             PaymentRecord.status != 'paid'
        )
        if ctx.tenant_id:
             fail_query = fail_query.filter(Sale.tenant_id == ctx.tenant_id)
        if branch_ids:
             fail_query = fail_query.filter(Sale.branch_id.in_(branch_ids))
             
        summary['fail_count'] = fail_query.scalar() or 0
            
        return jsonify({
            'success': True,
            'data': data,
            'summary': summary,
            'meta': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            },
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"POS movements report error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

