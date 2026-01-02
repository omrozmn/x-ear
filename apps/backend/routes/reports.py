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


def get_user_branch_filter():
    """Get branch IDs that current user has access to"""
    branch_id = request.args.get('branch_id')
    
    # If specific branch requested, verify access
    if branch_id:
        return [branch_id]
    
    # If user has assigned branches, use those
    if hasattr(g, 'current_user') and g.current_user:
        user = g.current_user
        if user.branches:
            return [b.id for b in user.branches]
    
    # Return None to indicate no filter (all branches)
    return None


def apply_branch_filter(query, model, branch_ids):
    """Apply branch filter to a query if branch_ids is provided"""
    if branch_ids and hasattr(model, 'branch_id'):
        return query.filter(model.branch_id.in_(branch_ids))
    return query

@reports_bp.route('/reports/overview', methods=['GET'])
def report_overview():
    """Genel rapor özeti"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter()

        # Hasta istatistikleri
        total_patients = Patient.query.count()
        new_patients = Patient.query.filter(Patient.created_at >= start_date).count()

        # Randevu istatistikleri - with branch filter
        appointments_query = Appointment.query.filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        )
        appointments_query = apply_branch_filter(appointments_query, Appointment, branch_ids)
        total_appointments = appointments_query.count()

        completed_query = Appointment.query.filter(
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
        sales_query = Sale.query.filter(Sale.created_at >= start_date)
        sales_query = apply_branch_filter(sales_query, Sale, branch_ids)
        total_sales = sales_query.count()
        
        revenue_query = db.session.query(func.sum(Sale.total_amount)).filter(
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

@reports_bp.route('/reports/patients', methods=['GET'])
def report_patients():
    """Hasta analizi raporu"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Yaş dağılımı - basitleştirilmiş
        age_data = {"18-30": 0, "31-50": 0, "51-65": 0, "Other": 0}

        # Durum dağılımı
        status_distribution = Appointment.query.filter(
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
        new_patients = Patient.query.filter(Patient.created_at >= start_date).count()

        active_patients = Patient.query.join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.COMPLETED
        ).count()

        trial_patients = Patient.query.join(Appointment).filter(
            Appointment.date >= start_date,
            Appointment.status == AppointmentStatus.SCHEDULED
        ).count()

        inactive_patients = Patient.query.filter(
            ~Patient.id.in_(
                db.session.query(Appointment.patient_id).filter(
                    Appointment.date >= start_date
                )
            )
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
def report_financial():
    """Mali rapor"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter()

        # Aylık gelir trendi - with branch filter
        revenue_query = db.session.query(
            extract('month', Sale.created_at),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        )
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
def report_campaigns():
    """Kampanya raporu"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Kampanya performansı
        campaigns = Campaign.query.filter(
            Campaign.created_at >= start_date
        ).all()

        campaign_data = []
        for campaign in campaigns:
            sms_logs = SMSLog.query.filter(
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
        sms_trends = db.session.query(
            func.date(SMSLog.created_at),
            func.count(SMSLog.id)
        ).filter(
            SMSLog.created_at >= start_date
        ).group_by(
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
def report_revenue():
    try:
        # placeholder aggregated revenue calculation
        return jsonify({"success": True, "revenue": {"monthly": [12000, 15000, 15500]}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Revenue report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/appointments', methods=['GET'])
def report_appointments():
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
def report_promissory_notes():
    """Senet raporları - aylık sayı, gelir ve özet"""
    try:
        days = int(request.args.get('days', 365))  # Default 1 year for monthly view
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Monthly note count
        monthly_counts = db.session.query(
            extract('year', PromissoryNote.due_date).label('year'),
            extract('month', PromissoryNote.due_date).label('month'),
            func.count(PromissoryNote.id).label('count')
        ).filter(
            PromissoryNote.due_date >= start_date,
            PromissoryNote.due_date <= end_date
        ).group_by(
            extract('year', PromissoryNote.due_date),
            extract('month', PromissoryNote.due_date)
        ).order_by('year', 'month').all()
        
        # Monthly revenue from paid notes
        monthly_revenue = db.session.query(
            extract('year', PromissoryNote.paid_date).label('year'),
            extract('month', PromissoryNote.paid_date).label('month'),
            func.sum(PromissoryNote.paid_amount).label('revenue')
        ).filter(
            PromissoryNote.paid_date >= start_date,
            PromissoryNote.paid_date <= end_date,
            PromissoryNote.status.in_(['paid', 'partial'])
        ).group_by(
            extract('year', PromissoryNote.paid_date),
            extract('month', PromissoryNote.paid_date)
        ).order_by('year', 'month').all()
        
        # Summary stats
        total_notes = PromissoryNote.query.filter(
            PromissoryNote.created_at >= start_date
        ).count()
        
        active_notes = PromissoryNote.query.filter(
            PromissoryNote.status == 'active'
        ).count()
        
        overdue_notes = PromissoryNote.query.filter(
            PromissoryNote.status == 'overdue'
        ).count()
        
        paid_notes = PromissoryNote.query.filter(
            PromissoryNote.status == 'paid',
            PromissoryNote.paid_date >= start_date
        ).count()
        
        # Total amounts
        total_amount = db.session.query(func.sum(PromissoryNote.amount)).filter(
            PromissoryNote.status.in_(['active', 'overdue'])
        ).scalar() or 0
        
        total_collected = db.session.query(func.sum(PromissoryNote.paid_amount)).filter(
            PromissoryNote.paid_date >= start_date
        ).scalar() or 0
        
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
def report_promissory_notes_by_patient():
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
def report_remaining_payments():
    """Kalan ödemeler raporu - hangi hastanın ne kadar ödemesi kalmış"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        branch_ids = get_user_branch_filter()
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
def report_cashflow_summary():
    """Kasa özeti raporu - tahsilatlar (Sales tabanlı)"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter()
        
        # Total collections (paid_amount from Sales)
        income_query = db.session.query(func.sum(Sale.paid_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date,
            Sale.status != 'cancelled'
        )
        if branch_ids:
            income_query = income_query.filter(Sale.branch_id.in_(branch_ids))
        total_income = income_query.scalar() or 0
        
        # Total sales amount
        sales_query = db.session.query(func.sum(Sale.final_amount)).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date,
            Sale.status != 'cancelled'
        )
        if branch_ids:
            sales_query = sales_query.filter(Sale.branch_id.in_(branch_ids))
        total_sales = sales_query.scalar() or 0
        
        # Remaining amount (to be collected)
        remaining = float(total_sales) - float(total_income)
        
        # Daily breakdown - collections by date
        daily_data = db.session.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.paid_amount).label('income'),
            func.sum(Sale.final_amount).label('total_sales')
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date,
            Sale.status != 'cancelled'
        )
        if branch_ids:
            daily_data = daily_data.filter(Sale.branch_id.in_(branch_ids))
        daily_data = daily_data.group_by(
            func.date(Sale.created_at)
        ).order_by(func.date(Sale.created_at)).all()
        
        # Format daily data
        daily_breakdown = {}
        for row in daily_data:
            date_str = str(row.date)
            daily_breakdown[date_str] = {
                "income": float(row.income) if row.income else 0,
                "sales": float(row.total_sales) if row.total_sales else 0
            }
        
        # Income by payment method
        income_by_method = db.session.query(
            Sale.payment_method,
            func.sum(Sale.paid_amount).label('amount')
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date,
            Sale.status != 'cancelled'
        )
        if branch_ids:
            income_by_method = income_by_method.filter(Sale.branch_id.in_(branch_ids))
        income_by_method = income_by_method.group_by(Sale.payment_method).all()
        
        income_breakdown = {}
        for row in income_by_method:
            income_breakdown[row.payment_method or 'other'] = float(row.amount) if row.amount else 0
        
        return jsonify({
            "success": True,
            "data": {
                "summary": {
                    "totalIncome": float(total_income),
                    "totalSales": float(total_sales),
                    "remainingToCollect": remaining,
                    "collectionRate": round((float(total_income) / float(total_sales) * 100), 1) if total_sales else 0
                },
                "dailyBreakdown": daily_breakdown,
                "incomeByPaymentMethod": income_breakdown
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Cashflow summary report error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/promissory-notes/list', methods=['GET'])
def report_promissory_notes_list():
    """Toplu senet listesi - modal için"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        status_filter = request.args.get('status')  # active, overdue, paid, all
        patient_id = request.args.get('patient_id')
        
        query = PromissoryNote.query
        
        # Apply filters
        if status_filter and status_filter != 'all':
            query = query.filter(PromissoryNote.status == status_filter)
        
        if patient_id:
            query = query.filter(PromissoryNote.patient_id == patient_id)
        
        # Order by due date
        query = query.order_by(PromissoryNote.due_date.asc())
        
        # Get total
        total = query.count()
        
        # Paginate
        notes = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Get patient names for all notes
        patient_ids = list(set(n.patient_id for n in notes))
        patients = {p.id: p for p in Patient.query.filter(Patient.id.in_(patient_ids)).all()}
        
        notes_data = []
        for note in notes:
            patient = patients.get(note.patient_id)
            notes_data.append({
                "id": note.id,
                "patientId": note.patient_id,
                "patientName": f"{patient.first_name or ''} {patient.last_name or ''}".strip() if patient else '',
                "noteNumber": note.note_number,
                "totalNotes": note.total_notes,
                "amount": float(note.amount) if note.amount else 0,
                "paidAmount": float(note.paid_amount) if note.paid_amount else 0,
                "remainingAmount": float(note.amount - (note.paid_amount or 0)),
                "dueDate": note.due_date.isoformat() if note.due_date else None,
                "status": note.status,
                "debtorName": note.debtor_name
            })
        
        return jsonify({
            "success": True,
            "data": notes_data,
            "meta": {
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Promissory notes list error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@reports_bp.route('/reports/pos-movements', methods=['GET'])
def report_pos_movements():
    """POS Hareketleri Raporu"""
    try:
        from models.sales import PaymentRecord
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        branch_ids = get_user_branch_filter()
        
        # Re-build query with explicit selects and joins for performance
        query = db.session.query(
            PaymentRecord,
            Sale,
            Patient
        ).join(
            Sale, PaymentRecord.sale_id == Sale.id, isouter=True
        ).join(
            Patient, Sale.patient_id == Patient.id, isouter=True
        ).filter(
            PaymentRecord.created_at >= start_date,
            PaymentRecord.created_at <= end_date,
            PaymentRecord.pos_provider != None
        )
        
        if branch_ids:
            query = query.filter(Sale.branch_id.in_(branch_ids))
            
        total = query.count()
            
        query = query.order_by(PaymentRecord.created_at.desc())
        results = query.offset((page - 1) * per_page).limit(per_page).all()
        
        data = []
        summary = {
            'total_volume': 0,
            'success_count': 0,
            'fail_count': 0
        }
        
        # Calculate summary across ALL matching records (not just page) - simplified
        # For full summary we should run separate aggregation query, but let's do simple query first
        agg_query = db.session.query(
            func.count(PaymentRecord.id),
            func.sum(PaymentRecord.amount)
        ).filter(
             PaymentRecord.created_at >= start_date,
             PaymentRecord.created_at <= end_date,
             PaymentRecord.pos_provider != None,
             PaymentRecord.status == 'paid'
        )
        if branch_ids:
             agg_query = agg_query.join(Sale, PaymentRecord.sale_id == Sale.id).filter(Sale.branch_id.in_(branch_ids))
        
        success_count, total_vol = agg_query.first()
        summary['total_volume'] = float(total_vol or 0)
        summary['success_count'] = success_count or 0
        
        # Failed count
        fail_query = db.session.query(func.count(PaymentRecord.id)).filter(
             PaymentRecord.created_at >= start_date,
             PaymentRecord.created_at <= end_date,
             PaymentRecord.pos_provider != None,
             PaymentRecord.status != 'paid'
        )
        if branch_ids:
             fail_query = fail_query.join(Sale, PaymentRecord.sale_id == Sale.id).filter(Sale.branch_id.in_(branch_ids))
        summary['fail_count'] = fail_query.scalar() or 0
        

        for payment, sale, patient in results:
            data.append({
                'id': payment.id,
                'date': payment.created_at.isoformat(),
                'amount': float(payment.amount or 0),
                'gross_amount': float(payment.gross_amount or 0),
                'status': payment.status,
                'pos_status': payment.pos_status,
                'pos_transaction_id': payment.pos_transaction_id,
                'installment': payment.installment_count,
                'error_message': payment.error_message,
                'sale_id': sale.id if sale else None,
                'patient_name': f"{patient.first_name} {patient.last_name}" if patient else "Bilinmiyor"
            })
            
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

