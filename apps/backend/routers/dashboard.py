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
from models.patient import Patient
from models.device import Device
from models.sales import Sale
from models.appointment import Appointment
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dashboard"])

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

# --- Routes ---

@router.get("/dashboard", operation_id="listDashboard")
def get_dashboard(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Main dashboard endpoint with KPIs and recent activity"""
    try:
        # KPIs
        try:
            total_patients = tenant_scoped_query(access, Patient, db_session).count()
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
                (Device.patient_id == None) | 
                (Device.patient_id == '')
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
            recent_activity = [l.to_dict_with_user() for l in logs]
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

@router.get("/dashboard/kpis", operation_id="listDashboardKpis")
def get_kpis(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get KPIs only"""
    try:
        total_patients = tenant_scoped_query(access, Patient, db_session).count()
        total_devices = tenant_scoped_query(access, Device, db_session).count()
        available_devices = tenant_scoped_query(access, Device, db_session).filter(
            (Device.patient_id == None) | (Device.patient_id == '')
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

@router.get("/dashboard/charts/patient-trends", operation_id="listDashboardChartPatientTrends")
def patient_trends(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient trends chart data"""
    try:
        now = datetime.utcnow()
        labels = []
        data = []
        
        base_query = tenant_scoped_query(access, Patient, db_session)
        
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            label = month_dt.strftime('%Y-%m')
            labels.append(label)
            try:
                count = base_query.filter(
                    func.strftime('%Y-%m', Patient.created_at) == label
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

@router.get("/dashboard/charts/revenue-trends", operation_id="listDashboardChartRevenueTrends")
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

@router.get("/dashboard/recent-activity", operation_id="listDashboardRecentActivity")
def recent_activity(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Recent activity list"""
    try:
        logs = tenant_scoped_query(access, ActivityLog, db_session).order_by(ActivityLog.id.desc()).limit(20).all()
        return ResponseEnvelope(
            data={"activity": [l.to_dict_with_user() for l in logs]}
        )
    except Exception as e:
        logger.error(f"Recent activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/charts/patient-distribution", operation_id="listDashboardChartPatientDistribution")
def patient_distribution(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient distribution by branch"""
    try:
        from models.branch import Branch
        
        branch_query = tenant_scoped_query(access, Branch, db_session)
        branch_objs = branch_query.all()

        results = []
        for br in branch_objs:
            b_id = br.id
            
            try:
                status_counts = db_session.query(
                    Patient.status, func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if access.tenant_id:
                    status_counts = status_counts.filter(Patient.tenant_id == access.tenant_id)
                
                status_counts = status_counts.group_by(Patient.status).all()
                status_map = {s.value if hasattr(s, 'value') else str(s): int(c) for s, c in status_counts}
            except Exception:
                status_map = {}

            try:
                seg_counts = db_session.query(
                    Patient.segment, func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if access.tenant_id:
                    seg_counts = seg_counts.filter(Patient.tenant_id == access.tenant_id)
                
                seg_counts = seg_counts.group_by(Patient.segment).all()
                seg_map = {s: int(c) for s, c in seg_counts}
            except Exception:
                seg_map = {}

            try:
                acq_counts = db_session.query(
                    Patient.acquisition_type, func.count(Patient.id)
                ).filter(Patient.branch_id == b_id)
                
                if access.tenant_id:
                    acq_counts = acq_counts.filter(Patient.tenant_id == access.tenant_id)
                
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

        return ResponseEnvelope(data=results)
    except Exception as e:
        logger.error(f"Patient distribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
