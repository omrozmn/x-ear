from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from models.base import db
from models.tenant import Tenant
from models.user import User
from models.plan import Plan
from sqlalchemy import func

admin_analytics_bp = Blueprint('admin_analytics', __name__, url_prefix='/api/admin/analytics')

@admin_analytics_bp.route('', methods=['GET'])
@jwt_required()
def get_admin_analytics():
    """Get admin analytics data"""
    try:
        # Mock data for now, or simple aggregations
        
        # Overview
        total_revenue = 150000.00 # Placeholder
        active_tenants = Tenant.query.filter_by(status='active').count()
        monthly_active_users = User.query.filter(User.last_login >= datetime.utcnow() - timedelta(days=30)).count()
        
        overview = {
            "total_revenue": total_revenue,
            "revenue_growth": 12.5,
            "active_tenants": active_tenants,
            "tenants_growth": 5.2,
            "monthly_active_users": monthly_active_users,
            "mau_growth": 8.4,
            "churn_rate": 2.1,
            "churn_growth": -0.5
        }
        
        # Revenue Trend (Mock)
        revenue_trend = [
            {"month": "Jan", "revenue": 12000, "growth": 10},
            {"month": "Feb", "revenue": 15000, "growth": 25},
            {"month": "Mar", "revenue": 18000, "growth": 20},
            {"month": "Apr", "revenue": 22000, "growth": 22},
            {"month": "May", "revenue": 25000, "growth": 13},
            {"month": "Jun", "revenue": 30000, "growth": 20},
        ]
        
        # User Engagement (Mock)
        user_engagement = [
            {"date": "2023-06-01", "dau": 120, "wau": 450, "mau": 1200},
            {"date": "2023-06-02", "dau": 130, "wau": 460, "mau": 1210},
            {"date": "2023-06-03", "dau": 125, "wau": 455, "mau": 1205},
            {"date": "2023-06-04", "dau": 140, "wau": 470, "mau": 1220},
            {"date": "2023-06-05", "dau": 150, "wau": 480, "mau": 1230},
        ]
        
        # Plan Distribution
        plans = db.session.query(Tenant.current_plan, func.count(Tenant.id)).group_by(Tenant.current_plan).all()
        plan_distribution = []
        colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']
        for i, (plan_name, count) in enumerate(plans):
            if plan_name:
                plan_distribution.append({
                    "name": plan_name,
                    "value": count,
                    "color": colors[i % len(colors)]
                })
        
        if not plan_distribution:
             plan_distribution = [
                {"name": "Basic", "value": 40, "color": "#0088FE"},
                {"name": "Pro", "value": 30, "color": "#00C49F"},
                {"name": "Enterprise", "value": 20, "color": "#FFBB28"},
            ]

        # Top Tenants (Mock)
        top_tenants = [
            {"id": "1", "name": "Acme Corp", "revenue": 5000, "growth": 15, "users": 25},
            {"id": "2", "name": "Globex", "revenue": 3500, "growth": 10, "users": 15},
            {"id": "3", "name": "Soylent Corp", "revenue": 2000, "growth": 5, "users": 10},
        ]
        
        return jsonify({
            "data": {
                "overview": overview,
                "revenue_trend": revenue_trend,
                "user_engagement": user_engagement,
                "plan_distribution": plan_distribution,
                "top_tenants": top_tenants,
                "domain_metrics": {
                    "sgk_submissions": [
                        {"month": "Jan", "count": 45, "approved": 40},
                        {"month": "Feb", "count": 52, "approved": 48},
                        {"month": "Mar", "count": 48, "approved": 45},
                        {"month": "Apr", "count": 60, "approved": 55},
                        {"month": "May", "count": 65, "approved": 62},
                        {"month": "Jun", "count": 70, "approved": 68},
                    ],
                    "device_fittings": [
                        {"month": "Jan", "count": 30},
                        {"month": "Feb", "count": 35},
                        {"month": "Mar", "count": 32},
                        {"month": "Apr", "count": 40},
                        {"month": "May", "count": 45},
                        {"month": "Jun", "count": 50},
                    ],
                    "appointment_conversion": 85.5, # Percentage
                    "avg_fitting_time": 45, # Minutes
                    "total_patients_fitted": 1250
                }
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
