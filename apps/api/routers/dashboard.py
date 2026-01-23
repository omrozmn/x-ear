"""
FastAPI Dashboard Router - Migrated from Flask routes/dashboard.py
Dashboard KPIs and analytics
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from schemas.base import ResponseEnvelope, ApiError

from models.user import ActivityLog
from core.models.user import User
from core.models.party import Party
from models.device import Device
from models.sales import Sale
from models.appointment import Appointment
from models.tenant import Tenant
from models.branch import Branch
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

from schemas.audit import AuditLogRead
from schemas.dashboard import (
    DashboardData, DashboardKPIs, ChartData, 
    RecentActivityResponse, BranchDistribution
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dashboard"])

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def enrich_activity_logs(logs: List[ActivityLog], session: Session) -> List[Dict[str, Any]]:
    """Enrich activity logs with user, tenant, branch details (replacing to_dict_with_user)"""
    results = []
    # Collect IDs for bulk fetch could be optimized here, but keeping it simple for now (N+1) as per original implementation
    for log in logs:
        data = AuditLogRead.model_validate(log).model_dump(by_alias=True)
        
        # User details
        if log.user_id:
            user = session.get(User, log.user_id)
            if user:
                data['userName'] = f"{user.first_name} {user.last_name}" if user.first_name else user.username
                data['userEmail'] = user.email
        
        # Tenant details
        if log.tenant_id:
            tenant = session.get(Tenant, log.tenant_id)
            if tenant:
                data['tenantName'] = tenant.name
        
        # Branch details
        if log.branch_id:
            branch = session.get(Branch, log.branch_id)
            if branch:
                data['branchName'] = branch.name
        
        # Patient details
        if log.entity_type == 'patient' and log.entity_id:
            party = session.get(Party, log.entity_id)
            if party:
                data['patientName'] = f"{party.first_name} {party.last_name}"
        
        results.append(data)
    return results

# --- Routes ---

@router.get("/dashboard", operation_id="listDashboard", response_model=ResponseEnvelope[DashboardData])
def get_dashboard(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Main dashboard endpoint with KPIs and recent activity"""
    try:
        # KPIs
        try:
            total_patients = tenant_scoped_query(access, Party, db_session).count()
        except Exception as e:
            logger.error(f"KPI total_patients error: {e}")
            total_patients = 0

        try:
            total_devices = tenant_scoped_query(access, Device, db_session).count()
        except Exception as e:
            logger.error(f"KPI total_devices error: {e}")
            total_devices = 0

        try:
            available_devices = tenant_scoped_query(access, Device, db_session).filter(
                (Device.status == 'IN_STOCK') | 
                (Device.party_id == None) | 
                (Device.party_id == '')
            ).count()
        except Exception:
            available_devices = 0

        try:
            base_query = tenant_scoped_query(access, Sale, db_session)
            estimated_revenue = float(db_session.query(
                func.coalesce(func.sum(Sale.total_amount), 0)
            ).filter(Sale.id.in_([s.id for s in base_query.all()])).scalar() or 0.0)
        except Exception:
            estimated_revenue = 0.0

        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            today_appointments = tenant_scoped_query(access, Appointment, db_session).filter(
                Appointment.date >= today_start,
                Appointment.date < today_end
            ).count()
        except Exception:
            today_appointments = 0

        try:
            active_trials = tenant_scoped_query(access, Device, db_session).filter(
                Device.status == 'TRIAL'
            ).count()
        except Exception:
            active_trials = 0

        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            daily_sales = tenant_scoped_query(access, Sale, db_session).filter(Sale.sale_date >= today_start).all()
            daily_revenue = float(sum(s.total_amount or 0 for s in daily_sales))
        except Exception:
            daily_revenue = 0.0

        try:
            pending_appointments = tenant_scoped_query(access, Appointment, db_session).filter(
                Appointment.status == 'SCHEDULED'
            ).count()
        except Exception:
            pending_appointments = 0

        try:
            today = datetime.now()
            next_week = today + timedelta(days=7)
            ending_trials = tenant_scoped_query(access, Device, db_session).filter(
                Device.status == 'TRIAL',
                Device.trial_end_date <= next_week,
                Device.trial_end_date >= today
            ).count()
        except Exception:
            ending_trials = 0

        # Recent activity
        try:
            log_query = tenant_scoped_query(access, ActivityLog, db_session)
            
            if access.user and access.user.role not in ['admin', 'manager', 'platform_admin', 'owner']:
                log_query = log_query.filter_by(user_id=access.user.id)
            
            logs = log_query.order_by(ActivityLog.id.desc()).limit(20).all()
            recent_activity = enrich_activity_logs(logs, db_session)
        except Exception:
            recent_activity = []

        return ResponseEnvelope(
            data={
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
            }
        )
    except Exception as e:
        logger.error(f"Get dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/kpis", operation_id="listDashboardKpis", response_model=ResponseEnvelope[DashboardKPIs])
def get_kpis(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get KPIs only"""
    try:
        total_patients = tenant_scoped_query(access, Party, db_session).count()
        total_devices = tenant_scoped_query(access, Device, db_session).count()
        available_devices = tenant_scoped_query(access, Device, db_session).filter(
            (Device.party_id == None) | (Device.party_id == '')
        ).count()
        
        sales = tenant_scoped_query(access, Sale, db_session).all()
        estimated_revenue = float(sum(s.final_amount or s.total_amount or 0 for s in sales))

        return ResponseEnvelope(
            data={
                "totalPatients": total_patients,
                "totalDevices": total_devices,
                "availableDevices": available_devices,
                "estimatedRevenue": estimated_revenue
            }
        )
    except Exception as e:
        logger.error(f"Get KPIs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/charts/patient-trends", operation_id="listDashboardChartPatientTrends", response_model=ResponseEnvelope[ChartData])
def patient_trends(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient trends chart data"""
    try:
        now = datetime.utcnow()
        labels = []
        data = []
        
        base_query = tenant_scoped_query(access, Party, db_session)
        
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                count = base_query.filter(
                    func.strftime('%Y-%m', Party.created_at) == label
                ).count()
                data.append(int(count or 0))
            except Exception:
                data.append(0)

        return ResponseEnvelope(
            data={"labels": labels, "monthly": data}
        )
    except Exception as e:
        logger.error(f"Patient trends error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/charts/revenue-trends", operation_id="listDashboardChartRevenueTrends", response_model=ResponseEnvelope[ChartData])
def revenue_trends(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Revenue trends chart data"""
    try:
        now = datetime.utcnow()
        labels = []
        data = []
        
        base_query = tenant_scoped_query(access, Sale, db_session)
        
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                sales = base_query.filter(
                    func.strftime('%Y-%m', Sale.created_at) == label,
                    Sale.status == 'completed'
                ).all()
                total = sum(float(s.final_amount or s.total_amount or 0) for s in sales)
                data.append(total)
            except Exception:
                data.append(0.0)

        return ResponseEnvelope(
            data={"labels": labels, "monthly": data}
        )
    except Exception as e:
        logger.error(f"Revenue trends error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/recent-activity", operation_id="listDashboardRecentActivity", response_model=ResponseEnvelope[RecentActivityResponse])
def recent_activity(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Recent activity list"""
    try:
        logs = tenant_scoped_query(access, ActivityLog, db_session).order_by(ActivityLog.id.desc()).limit(20).all()
        return ResponseEnvelope(
            data={"activity": enrich_activity_logs(logs, db_session)}
        )
    except Exception as e:
        logger.error(f"Recent activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/charts/patient-distribution", operation_id="listDashboardChartPatientDistribution", response_model=ResponseEnvelope[List[BranchDistribution]])
def patient_distribution(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient distribution by branch"""
    try:
        branch_query = tenant_scoped_query(access, Branch, db_session)
        branch_objs = branch_query.all()

        results = []
        for br in branch_objs:
            b_id = br.id
            
            try:
                status_counts = db_session.query(
                    Party.status, func.count(Party.id)
                ).filter(Party.branch_id == b_id)
                
                if access.tenant_id:
                    status_counts = status_counts.filter(Party.tenant_id == access.tenant_id)
                
                status_counts = status_counts.group_by(Party.status).all()
                status_map = {s.value if hasattr(s, 'value') else str(s): int(c) for s, c in status_counts}
            except Exception:
                status_map = {}

            try:
                seg_counts = db_session.query(
                    Party.segment, func.count(Party.id)
                ).filter(Party.branch_id == b_id)
                
                if access.tenant_id:
                    seg_counts = seg_counts.filter(Party.tenant_id == access.tenant_id)
                
                seg_counts = seg_counts.group_by(Party.segment).all()
                seg_map = {s: int(c) for s, c in seg_counts}
            except Exception:
                seg_map = {}

            try:
                acq_counts = db_session.query(
                    Party.acquisition_type, func.count(Party.id)
                ).filter(Party.branch_id == b_id)
                
                if access.tenant_id:
                    acq_counts = acq_counts.filter(Party.tenant_id == access.tenant_id)
                
                acq_counts = acq_counts.group_by(Party.acquisition_type).all()
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

        return ResponseEnvelope(data=results)
    except Exception as e:
        logger.error(f"Patient distribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
