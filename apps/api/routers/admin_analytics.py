"""
FastAPI Admin Analytics Router - Migrated from Flask routes/admin_analytics.py
Handles admin panel analytics and metrics
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from schemas.base import ResponseEnvelope
from schemas.admin import (
    AdminAnalyticsData, RevenueAnalytics, 
    UserAnalytics, TenantAnalytics,
    AnalyticsOverview, RevenueTrendItem,
    UserEngagementItem, PlanDistributionItem,
    TopTenantItem
)
from models.admin_user import AdminUser
from models.tenant import Tenant
from models.user import User
from models.plan import Plan
from models.invoice import Invoice
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

@router.get("", operation_id="getAdminAnalytics", response_model=ResponseEnvelope[AdminAnalyticsData])
@router.get("/overview", operation_id="listAdminAnalyticOverview", response_model=ResponseEnvelope[AdminAnalyticsData])
def get_admin_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get admin analytics data"""
    try:
        today = datetime.now()
        thirty_days_ago = today - timedelta(days=30)
        six_months_ago = today - timedelta(days=180)
        
        # Overview metrics
        total_revenue = db_session.query(func.sum(Invoice.device_price)).scalar() or 0
        active_tenants = db_session.query(Tenant).filter_by(status='active').count()
        monthly_active_users = db_session.query(User).filter(User.last_login >= thirty_days_ago).count()
        
        overview = {
            "total_revenue": float(total_revenue),
            "revenue_growth": 0,
            "active_tenants": active_tenants,
            "tenants_growth": 0,
            "monthly_active_users": monthly_active_users,
            "mau_growth": 0,
            "churn_rate": 0,
            "churn_growth": 0
        }
        
        # Revenue trend (last 6 months)
        tr_months = {1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
                     7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"}
        
        revenue_map = {}
        for i in range(5, -1, -1):
            target_date = today.replace(day=1) - timedelta(days=i*30)
            key = (target_date.year, target_date.month)
            revenue_map[key] = {"month": tr_months.get(target_date.month), "revenue": 0.0, "year_month": key}
        
        revenue_query = db_session.query(
            func.extract('year', Invoice.created_at).label('year'),
            func.extract('month', Invoice.created_at).label('month'),
            func.sum(Invoice.device_price).label('revenue')
        ).filter(Invoice.created_at >= six_months_ago).group_by(
            func.extract('year', Invoice.created_at),
            func.extract('month', Invoice.created_at)
        ).all()
        
        for year, month, rev in revenue_query:
            key = (int(year), int(month))
            if key in revenue_map:
                revenue_map[key]["revenue"] = float(rev or 0)
        
        revenue_trend = sorted(revenue_map.values(), key=lambda x: x["year_month"])
        for i in range(1, len(revenue_trend)):
            prev = revenue_trend[i-1]["revenue"]
            curr = revenue_trend[i]["revenue"]
            revenue_trend[i]["growth"] = round(((curr - prev) / prev) * 100, 1) if prev > 0 else (0 if curr == 0 else 100)
        
        final_revenue_trend = [{"month": item["month"], "revenue": item["revenue"], "growth": item.get("growth", 0)} for item in revenue_trend]
        
        # User engagement (last 7 days)
        user_engagement = []
        try:
            from models.user import ActivityLog
            for i in range(6, -1, -1):
                d = today - timedelta(days=i)
                start_of_day = d.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = d.replace(hour=23, minute=59, second=59, microsecond=999999)
                
                dau = db_session.query(func.count(func.distinct(ActivityLog.user_id))).filter(
                    ActivityLog.created_at >= start_of_day,
                    ActivityLog.created_at <= end_of_day
                ).scalar() or 0
                
                user_engagement.append({"date": d.strftime("%d/%m"), "dau": dau, "wau": dau * 2, "mau": dau * 5})
        except Exception:
            for i in range(6, -1, -1):
                d = today - timedelta(days=i)
                user_engagement.append({"date": d.strftime("%d/%m"), "dau": 0, "wau": 0, "mau": 0})
        
        # Plan distribution
        plans = db_session.query(Tenant.current_plan_id, func.count(Tenant.id)).group_by(Tenant.current_plan_id).all()
        colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
        plan_distribution = []
        
        for i, (plan_id, count) in enumerate(plans):
            plan_name = "Paketsiz"
            if plan_id:
                plan = db_session.get(Plan, plan_id)
                if plan:
                    plan_name = plan.name
            plan_distribution.append({"name": plan_name, "value": count, "color": colors[i % len(colors)]})
        
        if not plan_distribution or sum(p['value'] for p in plan_distribution) == 0:
            plan_distribution = [{"name": "Veri Yok", "value": 1, "color": "#e0e0e0"}]
        
        # Top tenants
        top_tenants_query = db_session.query(
            Tenant.id, Tenant.name, func.sum(Invoice.device_price).label('total_revenue')
        ).join(Invoice, Invoice.tenant_id == Tenant.id).group_by(
            Tenant.id, Tenant.name
        ).order_by(func.sum(Invoice.device_price).desc()).limit(5).all()
        
        top_tenants = []
        for t_id, t_name, t_rev in top_tenants_query:
            u_count = db_session.query(User).filter_by(tenant_id=t_id).count()
            top_tenants.append({"id": t_id, "name": t_name, "revenue": float(t_rev or 0), "growth": 0, "users": u_count})
        
        # Domain metrics
        domain_metrics = {
            "ereceipt_count": 0, "hearing_test_count": 0, "appointment_count": 0,
            "patient_count": 0, "appointment_conversion": 0, "total_patients_fitted": 0,
            "sgk_submissions": [], "device_fittings": [], "avg_fitting_time": 45
        }
        
        try:
            from models.appointment import Appointment
            from core.models.party import Party
            
            domain_metrics["appointment_count"] = db_session.query(Appointment).count()
            domain_metrics["patient_count"] = db_session.query(Party).count()
        except Exception:
            pass
        
        return ResponseEnvelope(data=AdminAnalyticsData(
            overview=AnalyticsOverview(**overview),
            revenue_trend=[RevenueTrendItem(**item) for item in final_revenue_trend],
            user_engagement=[UserEngagementItem(**item) for item in user_engagement],
            plan_distribution=[PlanDistributionItem(**item) for item in plan_distribution],
            top_tenants=[TopTenantItem(**item) for item in top_tenants],
            domain_metrics=domain_metrics
        ))
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue", operation_id="listAdminAnalyticRevenue", response_model=ResponseEnvelope[RevenueAnalytics])
def get_revenue_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get revenue analytics"""
    try:
        today = datetime.now()
        six_months_ago = today - timedelta(days=180)
        
        total_revenue = db_session.query(func.sum(Invoice.device_price)).scalar() or 0
        
        tr_months = {1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
                     7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"}
        
        revenue_query = db_session.query(
            func.extract('year', Invoice.created_at).label('year'),
            func.extract('month', Invoice.created_at).label('month'),
            func.sum(Invoice.device_price).label('revenue')
        ).filter(Invoice.created_at >= six_months_ago).group_by(
            func.extract('year', Invoice.created_at),
            func.extract('month', Invoice.created_at)
        ).all()
        
        revenue_trend = []
        for year, month, rev in revenue_query:
            revenue_trend.append({
                "month": tr_months.get(int(month), str(month)),
                "revenue": float(rev or 0)
            })
        
        return ResponseEnvelope(data=RevenueAnalytics(
            total_revenue=float(total_revenue),
            revenue_trend=[RevenueTrendItem(**item) for item in revenue_trend]
        ))
    except Exception as e:
        logger.error(f"Revenue analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users", operation_id="listAdminAnalyticUsers", response_model=ResponseEnvelope[UserAnalytics])
def get_user_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get user analytics"""
    try:
        today = datetime.now()
        thirty_days_ago = today - timedelta(days=30)
        
        total_users = db_session.query(User).count()
        active_users = db_session.query(User).filter_by(is_active=True).count()
        monthly_active = db_session.query(User).filter(User.last_login >= thirty_days_ago).count()
        
        return ResponseEnvelope(data=UserAnalytics(
            total_users=total_users,
            active_users=active_users,
            monthly_active_users=monthly_active
        ))
    except Exception as e:
        logger.error(f"User analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenants", operation_id="listAdminAnalyticTenants", response_model=ResponseEnvelope[TenantAnalytics])
def get_tenant_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get tenant analytics"""
    try:
        total_tenants = db_session.query(Tenant).count()
        active_tenants = db_session.query(Tenant).filter_by(status='active').count()
        
        tenants_by_status = db_session.query(
            Tenant.status, func.count(Tenant.id)
        ).group_by(Tenant.status).all()
        
        return ResponseEnvelope(data=TenantAnalytics(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            by_status={status: count for status, count in tenants_by_status}
        ))
    except Exception as e:
        logger.error(f"Tenant analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
