"""
FastAPI Admin Dashboard Router - Migrated from Flask routes/admin_dashboard.py
Handles admin panel metrics and analytics
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
import json

from schemas.base import ResponseEnvelope
from schemas.admin import (
    AdminDashboardMetrics, AdminDashboardStats,
    RecentTenantItem
)
from models.user import User
from models.tenant import Tenant
from models.plan import Plan
from models.appointment import Appointment
from core.models.party import Party
from models.device import Device
from models.invoice import Invoice
from middleware.unified_access import UnifiedAccess, require_admin
from database import get_db
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("", operation_id="getAdminDashboard", response_model=ResponseEnvelope[AdminDashboardMetrics])
def get_dashboard_metrics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get dashboard metrics"""
    try:
        # Total tenants (active only)
        total_tenants = db_session.query(Tenant).filter(
            Tenant.deleted_at.is_(None),
            Tenant.status == 'active'
        ).count()
        
        # Total users
        total_users = db_session.query(User).filter_by(is_active=True).count()
        
        # Total plans
        total_plans = db_session.query(Plan).filter_by(is_active=True).count()
        
        # Tenants by status
        tenants_by_status = db_session.query(
            Tenant.status, func.count(Tenant.id)
        ).filter(Tenant.deleted_at.is_(None)).group_by(Tenant.status).all()
        status_breakdown = {status: count for status, count in tenants_by_status}
        
        # Recent tenants
        recent_tenants = db_session.query(Tenant).filter(
            Tenant.deleted_at.is_(None)
        ).order_by(Tenant.created_at.desc()).limit(5).all()
        
        # Today's stats
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_appointments = db_session.query(Appointment).filter(
            Appointment.date >= today_start,
            Appointment.date <= today_end
        ).count()
        
        # Fitted patients
        fitted_patients = db_session.query(Party).join(Device).distinct().count()
        
        # Activity logs
        daily_uploads = 0
        recent_errors_data = []
        
        try:
            from models.user import ActivityLog
            daily_uploads = db_session.query(ActivityLog).filter(
                ActivityLog.action.in_(['document_upload', 'file_upload_init']),
                ActivityLog.created_at >= today_start,
                ActivityLog.created_at <= today_end
            ).count()
            
            recent_errors_query = db_session.query(ActivityLog, User, Tenant).outerjoin(
                User, ActivityLog.user_id == User.id
            ).outerjoin(
                Tenant, ActivityLog.tenant_id == Tenant.id
            ).filter(
                (ActivityLog.action.ilike('%error%')) |
                (ActivityLog.action.ilike('%fail%')) |
                (ActivityLog.action.ilike('%exception%'))
            ).order_by(ActivityLog.created_at.desc()).limit(10)
            
            for log, user, tenant in recent_errors_query.all():
                details_parsed = log.details
                if details_parsed and isinstance(details_parsed, str):
                    try:
                        json_data = json.loads(details_parsed)
                        if isinstance(json_data, dict):
                            details_parsed = json_data.get('message') or json_data.get('error') or str(json_data)
                    except (json.JSONDecodeError, TypeError):
                        pass
                
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
        
        # MRR - subscription-based revenue
        mrr = 0.0
        try:
            from core.models.subscription import Subscription
            from models.plan import Plan as PlanModel
            active_subs = db_session.query(Subscription).filter(
                Subscription.status.in_(['active', 'trialing'])
            ).all()
            for sub in active_subs:
                plan = db_session.get(PlanModel, sub.plan_id)
                if plan and plan.price:
                    mrr += float(plan.price)
        except Exception:
            # Fallback to invoice-based revenue if subscription model unavailable
            last_30_days = datetime.utcnow() - timedelta(days=30)
            mrr = float(db_session.query(func.sum(Invoice.device_price)).filter(
                Invoice.created_at >= last_30_days,
                Invoice.status != 'cancelled'
            ).scalar() or 0.0)

        # Alerts - real data
        # Expiring soon: tenants with subscription ending within 30 days
        expiring_soon = 0
        try:
            expiring_soon = db_session.query(Tenant).filter(
                Tenant.deleted_at.is_(None),
                Tenant.status == 'active',
                Tenant.subscription_end_date.isnot(None),
                Tenant.subscription_end_date <= datetime.utcnow() + timedelta(days=30),
                Tenant.subscription_end_date > datetime.utcnow()
            ).count()
        except Exception:
            pass

        # Health metrics - real calculations
        # Seat utilization: current_users / max_users across active tenants
        avg_seat_utilization = 0.0
        try:
            active_tenants_with_limits = db_session.query(Tenant).filter(
                Tenant.deleted_at.is_(None),
                Tenant.status == 'active',
                Tenant.max_users > 0
            ).all()
            if active_tenants_with_limits:
                utilizations = [(t.current_users or 0) / t.max_users * 100 for t in active_tenants_with_limits]
                avg_seat_utilization = sum(utilizations) / len(utilizations)
        except Exception:
            pass

        # Churn rate: cancelled tenants in last 30 days / total active at start of period
        churn_rate = 0.0
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            cancelled_recently = db_session.query(Tenant).filter(
                Tenant.status == 'cancelled',
                Tenant.updated_at >= thirty_days_ago
            ).count()
            total_at_start = total_tenants + cancelled_recently
            if total_at_start > 0:
                churn_rate = round((cancelled_recently / total_at_start) * 100, 1)
        except Exception:
            pass

        # Recent activity - real data
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        new_tenants_7d = db_session.query(Tenant).filter(
            Tenant.deleted_at.is_(None),
            Tenant.created_at >= seven_days_ago
        ).count()

        expiring_memberships_30d = expiring_soon  # Same query as alerts

        # Active users - users who logged in within last 30 days
        active_users = total_users
        try:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            active_users = db_session.query(User).filter(
                User.is_active == True,
                User.last_login_at >= thirty_days_ago
            ).count()
        except Exception:
            # last_login_at may not exist, fallback to total
            active_users = total_users

        # Low utilization alert: tenants using less than 20% of seats
        low_utilization = 0
        try:
            for t in active_tenants_with_limits:
                if t.max_users > 0 and ((t.current_users or 0) / t.max_users) < 0.2:
                    low_utilization += 1
        except Exception:
            pass

        # Tenant growth trend - last 6 months
        tenant_trend = []
        try:
            for i in range(5, -1, -1):
                month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i * 30)).replace(day=1)
                if i > 0:
                    month_end = (datetime.utcnow().replace(day=1) - timedelta(days=(i - 1) * 30)).replace(day=1)
                else:
                    month_end = datetime.utcnow()
                count = db_session.query(Tenant).filter(
                    Tenant.deleted_at.is_(None),
                    Tenant.created_at < month_end
                ).count()
                tenant_trend.append({
                    "month": month_start.strftime("%b %Y"),
                    "count": count
                })
        except Exception:
            pass

        # Revenue trend - last 6 months
        revenue_trend = []
        try:
            for i in range(5, -1, -1):
                month_start = (datetime.utcnow().replace(day=1) - timedelta(days=i * 30)).replace(day=1)
                if i > 0:
                    month_end = (datetime.utcnow().replace(day=1) - timedelta(days=(i - 1) * 30)).replace(day=1)
                else:
                    month_end = datetime.utcnow()
                month_revenue = db_session.query(func.sum(Invoice.device_price)).filter(
                    Invoice.created_at >= month_start,
                    Invoice.created_at < month_end,
                    Invoice.status != 'cancelled'
                ).scalar() or 0.0
                revenue_trend.append({
                    "month": month_start.strftime("%b %Y"),
                    "revenue": float(month_revenue)
                })
        except Exception:
            pass

        # Tenants by status for pie chart
        status_distribution = []
        status_colors = {'active': '#22c55e', 'trial': '#3b82f6', 'suspended': '#f59e0b', 'cancelled': '#ef4444'}
        status_labels = {'active': 'Aktif', 'trial': 'Deneme', 'suspended': 'Askıda', 'cancelled': 'İptal'}
        for status, count in tenants_by_status:
            status_distribution.append({
                "name": status_labels.get(status, status),
                "value": count,
                "color": status_colors.get(status, '#94a3b8')
            })

        return ResponseEnvelope(data=AdminDashboardMetrics(
            metrics={
                "overview": {
                    "total_tenants": total_tenants,
                    "active_tenants": status_breakdown.get('active', 0),
                    "total_users": total_users,
                    "active_users": active_users,
                    "total_plans": total_plans
                },
                "daily_stats": {
                    "today_appointments": today_appointments,
                    "fitted_patients": fitted_patients,
                    "daily_uploads": daily_uploads,
                    "pending_ocr": 0,
                    "sgk_processed": 0
                },
                "recent_errors": recent_errors_data,
                "revenue": {"monthly_recurring_revenue": float(mrr)},
                "alerts": {
                    "expiring_soon": expiring_soon,
                    "high_churn": 1 if churn_rate > 5.0 else 0,
                    "low_utilization": low_utilization
                },
                "health_metrics": {
                    "churn_rate_percent": churn_rate,
                    "avg_seat_utilization_percent": round(avg_seat_utilization, 1)
                },
                "recent_activity": {
                    "new_tenants_7d": new_tenants_7d,
                    "expiring_memberships_30d": expiring_memberships_30d
                },
                "tenant_trend": tenant_trend,
                "revenue_trend": revenue_trend,
                "status_distribution": status_distribution
            },
            recent_tenants=[
                RecentTenantItem(
                    id=t.id,
                    name=t.name,
                    status=t.status,
                    current_plan=t.current_plan,
                    created_at=t.created_at.isoformat()
                ) for t in recent_tenants
            ]
        ))
    except Exception as e:
        logger.error(f"Dashboard metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", operation_id="listAdminDashboardStats", response_model=ResponseEnvelope[AdminDashboardStats])
def get_dashboard_stats(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get dashboard stats - quick summary endpoint"""
    try:
        # Total counts
        total_tenants = db_session.query(Tenant).filter(Tenant.deleted_at.is_(None)).count()
        active_tenants = db_session.query(Tenant).filter(
            Tenant.deleted_at.is_(None),
            Tenant.status == 'active'
        ).count()
        total_users = db_session.query(User).filter_by(is_active=True).count()
        total_patients = db_session.query(Party).count()
        
        # Today's stats
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_appointments = db_session.query(Appointment).filter(
            Appointment.date >= today_start,
            Appointment.date <= today_end
        ).count()
        
        # Revenue (last 30 days)
        last_30_days = datetime.utcnow() - timedelta(days=30)
        monthly_revenue = db_session.query(func.sum(Invoice.device_price)).filter(
            Invoice.created_at >= last_30_days,
            Invoice.status != 'cancelled'
        ).scalar() or 0.0
        
        return ResponseEnvelope(data=AdminDashboardStats(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            total_users=total_users,
            total_patients=total_patients,
            today_appointments=today_appointments,
            monthly_revenue=float(monthly_revenue)
        ))
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
