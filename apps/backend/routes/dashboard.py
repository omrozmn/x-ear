"""
Dashboard Management
--------------------
Dashboard KPIs and analytics with unified access control.
"""

from flask import Blueprint, request, jsonify
from models.base import db
from models.user import ActivityLog
from models.patient import Patient
from models.device import Device
from models.sales import Sale
from datetime import datetime, timedelta
import logging

from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/dashboard', methods=['GET'])
@unified_access(resource='dashboard', action='read')
def get_dashboard(ctx):
    """Main dashboard endpoint - Unified Access"""
    try:
        from models.appointment import Appointment
        
        # Get KPIs with tenant scoping
        try:
            total_patients = tenant_scoped_query(ctx, Patient).count()
            logger.info(f"DEBUG: Dashboard total_patients count: {total_patients}")
        except Exception as e:
            logger.error(f"KPI total_patients error: {e}")
            total_patients = 0

        try:
            total_devices = tenant_scoped_query(ctx, Device).count()
        except Exception as e:
            logger.error(f"KPI total_devices error: {e}")
            total_devices = 0

        try:
            available_devices = tenant_scoped_query(ctx, Device).filter(
                (Device.status == 'IN_STOCK') | 
                (Device.patient_id == None) | 
                (Device.patient_id == '')
            ).count()
        except Exception:
            available_devices = 0

        try:
            base_query = tenant_scoped_query(ctx, Sale)
            estimated_revenue = float(db.session.query(
                db.func.coalesce(db.func.sum(Sale.total_amount), 0)
            ).filter(Sale.id.in_([s.id for s in base_query.all()])).scalar() or 0.0)
        except Exception:
            estimated_revenue = 0.0

        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            today_appointments = tenant_scoped_query(ctx, Appointment).filter(
                Appointment.date >= today_start,
                Appointment.date < today_end
            ).count()
        except Exception:
            today_appointments = 0

        try:
            active_trials = tenant_scoped_query(ctx, Device).filter(
                Device.status == 'TRIAL'
            ).count()
        except Exception:
            active_trials = 0

        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            daily_sales = tenant_scoped_query(ctx, Sale).filter(Sale.sale_date >= today_start).all()
            daily_revenue = float(sum(s.total_amount or 0 for s in daily_sales))
        except Exception:
            daily_revenue = 0.0

        try:
            pending_appointments = tenant_scoped_query(ctx, Appointment).filter(
                Appointment.status == 'SCHEDULED'
            ).count()
        except Exception:
            pending_appointments = 0
            
        try:
            today = datetime.now()
            next_week = today + timedelta(days=7)
            ending_trials = tenant_scoped_query(ctx, Device).filter(
                Device.status == 'TRIAL',
                Device.trial_end_date <= next_week,
                Device.trial_end_date >= today
            ).count()
        except Exception:
            ending_trials = 0

        # Recent activity with tenant scoping
        try:
            log_query = tenant_scoped_query(ctx, ActivityLog)
            
            # If not admin, show only own activities
            if ctx._principal and ctx._principal.user:
                user = ctx._principal.user
                if user.role not in ['admin', 'manager', 'platform_admin', 'owner']:
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
                    "todayAppointments": today_appointments,
                    "activeTrials": active_trials,
                    "dailyRevenue": daily_revenue,
                    "pendingAppointments": pending_appointments,
                    "endingTrials": ending_trials,
                    "todaysAppointments": today_appointments,
                    "activePatients": total_patients,
                    "monthlyRevenue": estimated_revenue
                },
                "recentActivity": recent_activity
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get dashboard error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/kpis', methods=['GET'])
@unified_access(resource='dashboard', action='read')
def get_kpis(ctx):
    """Get KPIs - Unified Access"""
    try:
        total_patients = tenant_scoped_query(ctx, Patient).count()
        total_devices = tenant_scoped_query(ctx, Device).count()
        available_devices = tenant_scoped_query(ctx, Device).filter(
            (Device.patient_id == None) | (Device.patient_id == '')
        ).count()
        
        sales = tenant_scoped_query(ctx, Sale).all()
        estimated_revenue = float(sum(s.total_net_payable or s.total_amount or 0 for s in sales))

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
@unified_access(resource='dashboard', action='read')
def patient_trends(ctx):
    """Patient trends chart - Unified Access"""
    try:
        now = datetime.utcnow()
        labels = []
        data = []
        
        base_query = tenant_scoped_query(ctx, Patient)
        
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                count = base_query.filter(
                    db.func.strftime('%Y-%m', Patient.created_at) == label
                ).count()
                data.append(int(count or 0))
            except Exception:
                data.append(0)

        return jsonify({"success": True, "data": {"labels": labels, "monthly": data}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Patient trends error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/charts/revenue-trends', methods=['GET'])
@unified_access(resource='dashboard', action='read')
def revenue_trends(ctx):
    """Revenue trends chart - Unified Access"""
    try:
        now = datetime.utcnow()
        labels = []
        data = []
        
        base_query = tenant_scoped_query(ctx, Sale)
        
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                sales = base_query.filter(
                    db.func.strftime('%Y-%m', Sale.created_at) == label,
                    Sale.status == 'completed'
                ).all()
                total = sum(float(s.total_net_payable or s.total_amount or 0) for s in sales)
                data.append(total)
            except Exception:
                data.append(0.0)

        return jsonify({"success": True, "data": {"labels": labels, "monthly": data}, "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Revenue trends error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/recent-activity', methods=['GET'])
@unified_access(resource='dashboard', action='read')
def recent_activity(ctx):
    """Recent activity - Unified Access"""
    try:
        logs = tenant_scoped_query(ctx, ActivityLog).order_by(ActivityLog.id.desc()).limit(20).all()
        return jsonify({"success": True, "activity": [l.to_dict_with_user() for l in logs], "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@dashboard_bp.route('/dashboard/charts/patient-distribution', methods=['GET'])
@unified_access(resource='dashboard', action='read')
def patient_distribution(ctx):
    """Patient distribution by branch - Unified Access"""
    try:
        from models.branch import Branch
        
        branch_query = tenant_scoped_query(ctx, Branch)
        branch_objs = branch_query.all()

        results = []
        for br in branch_objs:
            b_id = br.id
            
            try:
                patient_query = tenant_scoped_query(ctx, Patient).filter(Patient.branch_id == b_id)
                status_counts = db.session.query(
                    Patient.status, db.func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if ctx.tenant_id:
                    status_counts = status_counts.filter(Patient.tenant_id == ctx.tenant_id)
                    
                status_counts = status_counts.group_by(Patient.status).all()
                status_map = {s.value if hasattr(s, 'value') else str(s): int(c) for s, c in status_counts}
            except Exception:
                status_map = {}

            try:
                seg_counts = db.session.query(
                    Patient.segment, db.func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if ctx.tenant_id:
                    seg_counts = seg_counts.filter(Patient.tenant_id == ctx.tenant_id)
                    
                seg_counts = seg_counts.group_by(Patient.segment).all()
                seg_map = {s: int(c) for s, c in seg_counts}
            except Exception:
                seg_map = {}

            try:
                acq_counts = db.session.query(
                    Patient.acquisition_type, db.func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if ctx.tenant_id:
                    acq_counts = acq_counts.filter(Patient.tenant_id == ctx.tenant_id)
                    
                acq_counts = acq_counts.group_by(Patient.acquisition_type).all()
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
