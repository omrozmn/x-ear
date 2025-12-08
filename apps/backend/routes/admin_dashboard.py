"""
Admin Dashboard routes for metrics and analytics
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.admin_user import AdminUser
from models.user import User
from models.tenant import Tenant
from models.plan import Plan
from models.appointment import Appointment
from models.patient import Patient
from models.device import Device
from utils.admin_permissions import require_admin_permission, AdminPermissions
from sqlalchemy import func
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

admin_dashboard_bp = Blueprint('admin_dashboard', __name__, url_prefix='/api/admin/dashboard')

@admin_dashboard_bp.route('/metrics', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.DASHBOARD_VIEW)
def get_dashboard_metrics():
    """Get dashboard metrics"""
    try:
        # Total tenants (active only)
        total_tenants = Tenant.query.filter(
            Tenant.deleted_at.is_(None),
            Tenant.status == 'active'
        ).count()
        
        # Total users (Tenant Users)
        total_users = User.query.filter_by(is_active=True).count()
        
        # Total plans
        total_plans = Plan.query.filter_by(is_active=True).count()
        
        # Tenants by status
        tenants_by_status = db.session.query(
            Tenant.status,
            func.count(Tenant.id)
        ).filter(
            Tenant.deleted_at.is_(None)
        ).group_by(Tenant.status).all()
        
        status_breakdown = {status: count for status, count in tenants_by_status}
        
        # Recent tenants (last 5)
        recent_tenants = Tenant.query.filter(
            Tenant.deleted_at.is_(None)
        ).order_by(Tenant.created_at.desc()).limit(5).all()
        
        # --- New Metrics ---
        
        # Today's Appointments
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_appointments = Appointment.query.filter(
            Appointment.date >= today_start,
            Appointment.date <= today_end
        ).count()
        
        # Fitted Patients (Patients with devices)
        fitted_patients = db.session.query(Patient).join(Device).distinct().count()
        
        # Daily Uploads and Recent Errors from ActivityLog (with error handling)
        daily_uploads = 0
        recent_errors_data = []
        
        try:
            from models.user import ActivityLog
            daily_uploads = ActivityLog.query.filter(
                (ActivityLog.action.in_(['document_upload', 'file_upload_init'])),
                ActivityLog.created_at >= today_start,
                ActivityLog.created_at <= today_end
            ).count()
            
            # Recent Errors (Last 5 errors from ActivityLog)
            recent_errors = ActivityLog.query.filter(
                (ActivityLog.action.ilike('%error%')) | 
                (ActivityLog.action.ilike('%fail%')) |
                (ActivityLog.details.ilike('%error%'))
            ).order_by(ActivityLog.created_at.desc()).limit(5).all()
            
            recent_errors_data = [{
                'id': log.id,
                'action': log.action,
                'details': log.details,
                'created_at': log.created_at.isoformat(),
                'user_id': log.user_id
            } for log in recent_errors]
        except Exception as e:
            logger.warning(f"ActivityLog query failed (table may not exist): {e}")

        # Calculate Revenue (MRR - Last 30 days)
        from models.invoice import Invoice
        last_30_days = datetime.utcnow() - timedelta(days=30)
        mrr = db.session.query(func.sum(Invoice.device_price)).filter(
            Invoice.created_at >= last_30_days,
            Invoice.status != 'cancelled'
        ).scalar() or 0.0

        return jsonify({
            'success': True,
            'data': {
                'metrics': {
                    'overview': {
                        'total_tenants': total_tenants,
                        'active_tenants': status_breakdown.get('active', 0),
                        'total_users': total_users,
                        'active_users': total_users,
                        'total_plans': total_plans
                    },
                    'daily_stats': {
                        'today_appointments': today_appointments,
                        'fitted_patients': fitted_patients,
                        'daily_uploads': daily_uploads,
                        'pending_ocr': 0, # Placeholder
                        'sgk_processed': 0 # Placeholder
                    },
                    'recent_errors': recent_errors_data,
                    'revenue': {
                        'monthly_recurring_revenue': float(mrr)
                    },
                    'alerts': {
                        'expiring_soon': 0,
                        'high_churn': 0,
                        'low_utilization': 0
                    },
                    'health_metrics': {
                        'churn_rate_percent': 0,
                        'avg_seat_utilization_percent': 0
                    },
                    'recent_activity': {
                        'new_tenants_7d': 0,
                        'expiring_memberships_30d': 0
                    }
                },
                'recent_tenants': [
                    {
                        'id': t.id,
                        'name': t.name,
                        'status': t.status,
                        'current_plan': t.current_plan,
                        'created_at': t.created_at.isoformat()
                    }
                    for t in recent_tenants
                ]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard metrics error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
