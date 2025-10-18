from flask import Blueprint, request, jsonify
from models.base import db
from models.user import ActivityLog
from models.patient import Patient
from models.device import Device
from models.sales import Sale
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """Main dashboard endpoint that returns all dashboard data"""
    try:
        # Get KPIs
        try:
            total_patients = Patient.query.count()
        except Exception:
            total_patients = 0

        try:
            total_devices = Device.query.count()
        except Exception:
            total_devices = 0

        try:
            available_devices = Device.query.filter((Device.patient_id == None) | (Device.patient_id == '')).count()
        except Exception:
            available_devices = 0

        try:
            estimated_revenue = float(db.session.query(db.func.coalesce(db.func.sum(Sale.total_amount), 0)).scalar() or 0.0)
        except Exception:
            estimated_revenue = 0.0

        # Get recent activity
        try:
            logs = ActivityLog.query.order_by(ActivityLog.id.desc()).limit(10).all()
            recent_activity = [l.to_dict() for l in logs]
        except Exception:
            recent_activity = []

        return jsonify({
            "success": True,
            "data": {
                "kpis": {
                    "totalPatients": total_patients,
                    "totalDevices": total_devices,
                    "availableDevices": available_devices,
                    "estimatedRevenue": estimated_revenue
                },
                "recentActivity": recent_activity
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get dashboard error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@dashboard_bp.route('/dashboard/kpis', methods=['GET'])
def get_kpis():
    try:
        # Use real model counts where possible
        try:
            total_patients = Patient.query.count()
        except Exception:
            total_patients = 0

        try:
            total_devices = Device.query.count()
        except Exception:
            total_devices = 0

        try:
            available_devices = Device.query.filter((Device.patient_id == None) | (Device.patient_id == '')).count()
        except Exception:
            available_devices = 0

        try:
            estimated_revenue = float(db.session.query(db.func.coalesce(db.func.sum(Sale.total_net_payable), 0)).scalar() or 0.0)
        except Exception:
            estimated_revenue = 0.0

        return jsonify({
            "success": True,
            "totalPatients": total_patients,
            "totalDevices": total_devices,
            "availableDevices": available_devices,
            "estimatedRevenue": estimated_revenue,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get KPIs error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/charts/patient-trends', methods=['GET'])
def patient_trends():
    try:
        # Return monthly new patient counts for last 6 months
        now = datetime.utcnow()
        six_months_ago = now.replace(day=1)
        # Build last 6 months labels
        labels = []
        data = []
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                count = db.session.query(db.func.count(Patient.id)).filter(db.func.strftime('%Y-%m', Patient.created_at) == label).scalar()
                data.append(int(count or 0))
            except Exception:
                data.append(0)

        return jsonify({"success": True, "data": {"labels": labels, "monthly": data}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Patient trends error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/charts/revenue-trends', methods=['GET'])
def revenue_trends():
    try:
        # Aggregate monthly completed sales net payable for last 6 months
        now = datetime.utcnow()
        labels = []
        data = []
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                total = db.session.query(db.func.coalesce(db.func.sum(Sale.total_net_payable), 0)).filter(db.func.strftime('%Y-%m', Sale.created_at) == label, Sale.status == 'completed').scalar()
                data.append(float(total or 0.0))
            except Exception:
                data.append(0.0)

        return jsonify({"success": True, "data": {"labels": labels, "monthly": data}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Revenue trends error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/recent-activity', methods=['GET'])
def recent_activity():
    try:
        logs = ActivityLog.query.order_by(ActivityLog.id.desc()).limit(20).all()
        return jsonify({"success": True, "activity": [l.to_dict() for l in logs], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500
