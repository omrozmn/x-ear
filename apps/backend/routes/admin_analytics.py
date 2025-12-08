from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from models.base import db
from models.tenant import Tenant
from models.user import User
from models.plan import Plan
from models.invoice import Invoice
from utils.admin_permissions import require_admin_permission, AdminPermissions
from sqlalchemy import func

admin_analytics_bp = Blueprint('admin_analytics', __name__, url_prefix='/api/admin/analytics')

@admin_analytics_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.ANALYTICS_READ)
def get_admin_analytics():
    """Get admin analytics data"""
    try:
        # Total Revenue
        total_revenue = db.session.query(func.sum(Invoice.device_price)).scalar() or 0
        
        # Active Tenants
        active_tenants = Tenant.query.filter_by(status='active').count()
        
        # Monthly Active Users (Users logged in within last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        monthly_active_users = User.query.filter(User.last_login >= thirty_days_ago).count()
        
        # Calculate growth (comparing to previous period) - Simplified for now
        # Ideally, we would query previous period data as well
        
        overview = {
            "total_revenue": float(total_revenue),
            "revenue_growth": 0, # TODO: Calculate real growth
            "active_tenants": active_tenants,
            "tenants_growth": 0,
            "monthly_active_users": monthly_active_users,
            "mau_growth": 0,
            "churn_rate": 0,
            "churn_growth": 0
        }
        
        # 2. Revenue Trend (Last 6 months)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        
        # Group by year and month
        # Note: This uses extract which works across DBs mostly, but syntax might vary slightly
        revenue_trend_query = db.session.query(
            func.extract('year', Invoice.created_at).label('year'),
            func.extract('month', Invoice.created_at).label('month'),
            func.sum(Invoice.device_price).label('revenue')
        ).filter(Invoice.created_at >= six_months_ago)\
         .group_by(func.extract('year', Invoice.created_at), func.extract('month', Invoice.created_at))\
         .order_by(func.extract('year', Invoice.created_at), func.extract('month', Invoice.created_at)).all()
        
        revenue_trend = []
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        for year, month, revenue in revenue_trend_query:
            month_idx = int(month) - 1
            month_name = months[month_idx] if 0 <= month_idx < 12 else str(month)
            
            revenue_trend.append({
                "month": f"{month_name}",
                "revenue": float(revenue or 0),
                "growth": 0 # Can be calculated in loop
            })
            
        # Calculate growth
        for i in range(1, len(revenue_trend)):
            prev = revenue_trend[i-1]["revenue"]
            curr = revenue_trend[i]["revenue"]
            if prev > 0:
                growth = ((curr - prev) / prev) * 100
                revenue_trend[i]["growth"] = round(growth, 1)
        
        # 3. User Engagement (Last 7 days)
        # We can use User.last_login distribution or created_at
        # For now, let's use created_at as a proxy for "New Users" trend
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        new_users_query = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(User.created_at >= seven_days_ago)\
         .group_by(func.date(User.created_at))\
         .order_by('date').all()
         
        user_engagement = []
        for date_str, count in new_users_query:
            user_engagement.append({
                "date": str(date_str),
                "new_users": count,
                "dau": 0, # Requires activity log
                "wau": 0,
                "mau": 0
            })

        # 4. Plan Distribution (Real Data)
        plans = db.session.query(Tenant.current_plan_id, func.count(Tenant.id)).group_by(Tenant.current_plan_id).all()
        plan_distribution = []
        colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
        
        for i, (plan_id, count) in enumerate(plans):
            plan_name = "Unknown"
            if plan_id:
                plan = db.session.get(Plan, plan_id)
                if plan:
                    plan_name = plan.name
            else:
                plan_name = "No Plan"
            
            plan_distribution.append({
                "name": plan_name,
                "value": count,
                "color": colors[i % len(colors)]
            })
            
        if not plan_distribution:
             plan_distribution = [
                {"name": "No Data", "value": 0, "color": "#e0e0e0"}
            ]

        # 5. Top Tenants by Revenue (Real Data)
        # Note: Invoice.device_price might not be the correct field for subscription revenue. 
        # Assuming Invoice.amount is the total invoice amount.
        top_tenants_query = db.session.query(
            Tenant.id,
            Tenant.name,
            func.sum(Invoice.device_price).label('total_revenue'),
            func.count(User.id).label('user_count')
        ).join(Invoice, Invoice.tenant_id == Tenant.id)\
         .outerjoin(User, User.tenant_id == Tenant.id)\
         .group_by(Tenant.id, Tenant.name)\
         .order_by(func.sum(Invoice.device_price).desc())\
         .limit(5).all()
         
        top_tenants = []
        for t_id, t_name, t_rev, t_users in top_tenants_query:
            top_tenants.append({
                "id": t_id,
                "name": t_name,
                "revenue": float(t_rev or 0),
                "growth": 0, 
                "users": t_users or 0
            })
            
        # 6. Domain Metrics (Real Data)
        from models.medical import EReceipt, HearingTest
        from models.appointment import Appointment
        from models.patient import Patient
        
        ereceipt_count = EReceipt.query.count()
        hearing_test_count = HearingTest.query.count()
        appointment_count = Appointment.query.count()
        patient_count = Patient.query.count()
        
        # Calculate conversion rate (Appointments with hearing tests / Total appointments)
        # This is an approximation
        conversion_rate = 0
        if appointment_count > 0:
            # Assuming logic: appointments that resulted in a test
            # Ideally we check linked records
            conversion_rate = (hearing_test_count / appointment_count) * 100

        return jsonify({
            "data": {
                "overview": overview,
                "revenue_trend": revenue_trend,
                "user_engagement": user_engagement,
                "plan_distribution": plan_distribution,
                "top_tenants": top_tenants,
                "domain_metrics": {
                    "ereceipt_count": ereceipt_count,
                    "hearing_test_count": hearing_test_count,
                    "appointment_count": appointment_count,
                    "patient_count": patient_count,
                    "appointment_conversion": round(conversion_rate, 1),
                    "total_patients": patient_count
                }
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
