"""
Admin Dashboard routes for metrics and analytics
"""
from flask import Blueprint, jsonify
from models.base import db
from models.admin_user import AdminUser
from models.user import User
from models.tenant import Tenant
from models.plan import Plan
from models.appointment import Appointment
from models.patient import Patient
from models.device import Device
from utils.decorators import unified_access
from utils.admin_permissions import AdminPermissions
from sqlalchemy import func
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

admin_dashboard_bp = Blueprint('admin_dashboard', __name__, url_prefix='/api/admin/dashboard')

@admin_dashboard_bp.route('/', methods=['GET'])
@unified_access(permission=AdminPermissions.DASHBOARD_VIEW)
def get_dashboard_metrics(ctx):
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
            
            # Recent Errors (Last 10 errors from ActivityLog)
            # Fetch errors, failures, exceptions, and critical system events
            recent_errors_query = db.session.query(ActivityLog, User, Tenant).outerjoin(
                User, ActivityLog.user_id == User.id
            ).outerjoin(
                Tenant, ActivityLog.tenant_id == Tenant.id
            ).filter(
                (ActivityLog.action.ilike('%error%')) | 
                (ActivityLog.action.ilike('%fail%')) |
                (ActivityLog.action.ilike('%exception%')) |
                (ActivityLog.action.ilike('%critical%')) |
                (ActivityLog.details.ilike('%error%')) |
                (ActivityLog.details.ilike('%traceback%'))
            ).order_by(ActivityLog.created_at.desc()).limit(10)

            recent_errors_results = recent_errors_query.all()
            
            recent_errors_data = []
            import json
            for log, user, tenant in recent_errors_results:
                # Parse details if it's JSON string
                details_parsed = log.details
                if details_parsed and isinstance(details_parsed, str):
                    try:
                        # Try to load as JSON to check if it's structured data
                        # If simple string, keep as is. If json object, maybe format or extract message
                        json_data = json.loads(details_parsed)
                        if isinstance(json_data, dict):
                            # prioritize 'message' or 'error' keys
                            details_parsed = json_data.get('message') or json_data.get('error') or str(json_data)
                    except:
                        pass # Keep original string if not valid JSON

                recent_errors_data.append({
                    'id': log.id,
                    'action': log.action,
                    'details': details_parsed or 'No details provided',
                    'created_at': log.created_at.isoformat(),
                    'user_id': log.user_id,
                    'user_name': f"{user.first_name} {user.last_name}" if user else 'System / Unknown',
                    'user_email': user.email if user else None,
                    'tenant_name': tenant.name if tenant else 'System'
                })
        except Exception as e:
            logger.warning(f"ActivityLog query failed: {e}")
            import traceback
            traceback.print_exc()

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
