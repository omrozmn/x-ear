from flask import Blueprint, request, jsonify
from models.base import db
from models.user import ActivityLog, User
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.patient import Patient
from models.device import Device
from models.sales import Sale
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Main dashboard endpoint that returns all dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        from models.appointment import Appointment
        from models.enums import AppointmentStatus, DeviceSide, DeviceStatus
        
        # Get KPIs - Filter by tenant_id
        # 1. Total Patients
        try:
            total_patients = Patient.query.filter_by(tenant_id=user.tenant_id).count()
        except Exception:
            total_patients = 0

        # 2. Total Devices (All devices in system)
        try:
            total_devices = Device.query.filter_by(tenant_id=user.tenant_id).count()
        except Exception:
            total_devices = 0

        # 3. Available Devices (In stock/inventory)
        try:
            # Check for IN_STOCK status explicitly
            available_devices = Device.query.filter(
                (Device.tenant_id == user.tenant_id) &
                ((Device.status == 'IN_STOCK') | 
                (Device.patient_id == None) | 
                (Device.patient_id == ''))
            ).count()
        except Exception:
            available_devices = 0

        # 4. Estimated/Total Revenue (All time or monthly based on frontend expectation)
        try:
            # This seems to be total revenue all time based on previous code
            estimated_revenue = float(db.session.query(db.func.coalesce(db.func.sum(Sale.total_amount), 0)).filter_by(tenant_id=user.tenant_id).scalar() or 0.0)
        except Exception:
            estimated_revenue = 0.0

        # 5. Today's Appointments
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            # Filter appointments for today
            today_appointments = Appointment.query.filter(
                Appointment.tenant_id == user.tenant_id,
                Appointment.date >= today_start,
                Appointment.date < today_end
            ).count()
        except Exception:
            today_appointments = 0

        # 6. Active Trials
        try:
            # Count devices that are currently in TRIAL status
            active_trials = Device.query.filter(
                Device.tenant_id == user.tenant_id,
                Device.status == 'TRIAL'
            ).count()
        except Exception:
            active_trials = 0

        # 7. Daily Revenue
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            # Sum sales created today
            daily_revenue = float(db.session.query(db.func.coalesce(db.func.sum(Sale.total_amount), 0)).filter(
                Sale.tenant_id == user.tenant_id,
                Sale.sale_date >= today_start
            ).scalar() or 0.0)
        except Exception:
            daily_revenue = 0.0

        # 8. Pending Appointments
        try:
            # Count appointments that are scheduled but not yet completed/cancelled
            pending_appointments = Appointment.query.filter(
                Appointment.tenant_id == user.tenant_id,
                Appointment.status == 'SCHEDULED'
            ).count()
        except Exception:
            pending_appointments = 0
            
        # 9. Ending Trials (Next 7 days)
        try:
            today = datetime.now()
            next_week = today + timedelta(days=7)
            ending_trials = Device.query.filter(
                Device.tenant_id == user.tenant_id,
                Device.status == 'TRIAL',
                Device.trial_end_date <= next_week,
                Device.trial_end_date >= today
            ).count()
        except Exception:
            ending_trials = 0

        # Get recent activity with RBAC
        try:
            log_query = ActivityLog.query.filter_by(tenant_id=user.tenant_id)
            
            # If not admin, only show own activities
            if user.role not in ['admin', 'manager', 'platform_admin']:
                log_query = log_query.filter_by(user_id=user.id)
                
            logs = log_query.order_by(ActivityLog.id.desc()).limit(20).all()
            recent_activity = [l.to_dict_with_user() for l in logs]
        except Exception:
            recent_activity = []

        return jsonify({
            "success": True,
            "data": {
                "kpis": {
                    "totalPatients": total_patients,
                    "totalDevices": total_devices,
                    "availableDevices": available_devices,
                    "estimatedRevenue": estimated_revenue,
                    # New field mappings
                    "todayAppointments": today_appointments,
                    "activeTrials": active_trials,
                    "dailyRevenue": daily_revenue,
                    "pendingAppointments": pending_appointments,
                    "endingTrials": ending_trials,
                    # Aliases for frontend compatibility if needed
                    "todaysAppointments": today_appointments,
                    "activePatients": total_patients, # Assuming active patients roughly equals total for now
                    "monthlyRevenue": estimated_revenue # Frontend might expect this key
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
@jwt_required()
def recent_activity():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401
            
        logs = ActivityLog.query.filter_by(tenant_id=user.tenant_id).order_by(ActivityLog.id.desc()).limit(20).all()
        return jsonify({"success": True, "activity": [l.to_dict_with_user() for l in logs], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/charts/patient-distribution', methods=['GET'])
def patient_distribution():
    try:
        # Get list of branches
        from models.branch import Branch
        branch_objs = Branch.query.all()

        results = []
        for br in branch_objs:
            b_id = br.id
            # status breakdown
            try:
                status_counts = db.session.query(Patient.status, db.func.count(Patient.id)).filter(Patient.branch_id == b_id).group_by(Patient.status).all()
                status_map = {s.value if hasattr(s, 'value') else str(s): int(c) for s, c in status_counts}
            except Exception:
                status_map = {}

            # segment breakdown
            try:
                seg_counts = db.session.query(Patient.segment, db.func.count(Patient.id)).filter(Patient.branch_id == b_id).group_by(Patient.segment).all()
                seg_map = {s: int(c) for s, c in seg_counts}
            except Exception:
                seg_map = {}

            # acquisition_type breakdown
            try:
                acq_counts = db.session.query(Patient.acquisition_type, db.func.count(Patient.id)).filter(Patient.branch_id == b_id).group_by(Patient.acquisition_type).all()
                acq_map = {s: int(c) for s, c in acq_counts}
            except Exception:
                acq_map = {}

            results.append({
                'branchId': b_id,
                'branch': br.name,
                'breakdown': {
                    'status': status_map,
                    'segment': seg_map,
                    'acquisitionType': acq_map
                }
            })

        return jsonify({"success": True, "data": results, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Patient distribution error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500
