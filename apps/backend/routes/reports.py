from flask import Blueprint, request, jsonify
from models.base import db
from models.patient import Patient
from models.appointment import Appointment
from models.sales import Sale
from models.campaign import Campaign, SMSLog
from models.enums import AppointmentStatus
from datetime import datetime, timedelta
import logging
from sqlalchemy import func, extract, and_, or_

logger = logging.getLogger(__name__)

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports/overview', methods=['GET'])
def report_overview():
    """Genel rapor özeti"""
    try:
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Hasta istatistikleri
        total_patients = Patient.query.count()
        new_patients = Patient.query.filter(Patient.created_at >= start_date).count()

        # Randevu istatistikleri
        total_appointments = Appointment.query.filter(
            Appointment.date >= start_date,
            Appointment.date <= end_date
        ).count()

        completed_appointments = Appointment.query.filter(
            and_(
                Appointment.date >= start_date,
                Appointment.date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        ).count()

        appointment_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0

        # Satış istatistikleri
        total_sales = Sale.query.filter(Sale.created_at >= start_date).count()
        total_revenue = db.session.query(func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_date
        ).scalar() or 0

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

        # Aylık gelir trendi
        monthly_revenue = db.session.query(
            extract('month', Sale.created_at),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        ).group_by(
            extract('month', Sale.created_at)
        ).order_by(
            extract('month', Sale.created_at)
        ).all()

        revenue_trend = {int(month): float(amount) for month, amount in monthly_revenue}

        # Ürün satış dağılımı (DeviceAssignment üzerinden)
        from models import DeviceAssignment, Device
        product_sales = db.session.query(
            Device.brand,
            func.count(DeviceAssignment.id),
            func.sum(DeviceAssignment.net_payable)
        ).join(
            DeviceAssignment, Device.id == DeviceAssignment.device_id
        ).filter(
            DeviceAssignment.created_at >= start_date
        ).group_by(Device.brand).all()

        product_data = {}
        for brand, count, revenue in product_sales:
            if brand:
                product_data[brand] = {
                    "sales": count,
                    "revenue": float(revenue) if revenue else 0.0
                }

        # Ödeme yöntemleri
        payment_methods = db.session.query(
            Sale.payment_method,
            func.count(Sale.id),
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_date
        ).group_by(Sale.payment_method).all()

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
