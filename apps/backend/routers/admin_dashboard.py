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
from models.admin_user import AdminUser
from models.user import User
from models.tenant import Tenant
from models.plan import Plan
from models.appointment import Appointment
from models.patient import Patient
from models.device import Device
from models.invoice import Invoice
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("")
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
        fitted_patients = db_session.query(Patient).join(Device).distinct().count()
        
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
                    except:
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
        
        # MRR
        last_30_days = datetime.utcnow() - timedelta(days=30)
        mrr = db_session.query(func.sum(Invoice.device_price)).filter(
            Invoice.created_at >= last_30_days,
            Invoice.status != 'cancelled'
        ).scalar() or 0.0
        
        return ResponseEnvelope(data={
            "metrics": {
                "overview": {
                    "total_tenants": total_tenants,
                    "active_tenants": status_breakdown.get('active', 0),
                    "total_users": total_users,
                    "active_users": total_users,
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
                "alerts": {"expiring_soon": 0, "high_churn": 0, "low_utilization": 0},
                "health_metrics": {"churn_rate_percent": 0, "avg_seat_utilization_percent": 0},
                "recent_activity": {"new_tenants_7d": 0, "expiring_memberships_30d": 0}
            },
            "recent_tenants": [
                {"id": t.id, "name": t.name, "status": t.status, "current_plan": t.current_plan, "created_at": t.created_at.isoformat()}
                for t in recent_tenants
            ]
        })
    except Exception as e:
        logger.error(f"Dashboard metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
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
        total_patients = db_session.query(Patient).count()
        
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
        
        return ResponseEnvelope(data={
            "totalTenants": total_tenants,
            "activeTenants": active_tenants,
            "totalUsers": total_users,
            "totalPatients": total_patients,
            "todayAppointments": today_appointments,
            "monthlyRevenue": float(monthly_revenue)
        })
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
