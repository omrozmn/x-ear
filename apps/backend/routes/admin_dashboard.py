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
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

admin_dashboard_bp = Blueprint('admin_dashboard', __name__, url_prefix='/api/admin/dashboard')

@admin_dashboard_bp.route('/metrics', methods=['GET'])
@jwt_required()
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
        
        # Calculate mock revenue and other metrics for now
        # In a real app, these would come from actual data
        
        return jsonify({
            'success': True,
            'data': {
                'metrics': {
                    'overview': {
                        'total_tenants': total_tenants,
                        'active_tenants': status_breakdown.get('active', 0),
                        'total_users': total_users, # This is currently AdminUser count, should be Tenant User count ideally
                        'active_users': total_users, # Placeholder
                        'total_plans': total_plans
                    },
                    'revenue': {
                        'monthly_recurring_revenue': 0 # Placeholder
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
