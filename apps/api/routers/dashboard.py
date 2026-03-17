"""
FastAPI Dashboard Router - Migrated from Flask routes/dashboard.py
Dashboard KPIs and analytics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, or_, extract, cast, String

from schemas.base import ResponseEnvelope

from models.user import ActivityLog
from core.models.user import User
from core.models.party import Party
from models.device import Device
from models.sales import Sale
from models.appointment import Appointment
from models.tenant import Tenant
from models.branch import Branch
from middleware.unified_access import UnifiedAccess, require_access
from database import get_db

from schemas.audit import AuditLogRead
from schemas.dashboard import (
    DashboardData, DashboardKPIs, ChartData,
    RecentActivityResponse, BranchDistribution
)
from schemas.enums import SectorCode

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dashboard"])


def _resolve_tenant_sector(access: UnifiedAccess, db_session: Session) -> str:
    """Resolve the sector for current tenant."""
    tenant_id = access.tenant_id
    if not tenant_id and access.user:
        tenant_id = access.user.tenant_id
    if tenant_id:
        tenant = db_session.get(Tenant, tenant_id)
        if tenant:
            sector = getattr(tenant, 'sector', None) or SectorCode.from_product_code(
                getattr(tenant, 'product_code', '') or ''
            ).value
            return sector
    return 'hearing'


def _get_enabled_modules(sector: str) -> list:
    """Return enabled module IDs for a given sector."""
    try:
        from config.module_registry import get_enabled_module_ids
        return list(get_enabled_module_ids(sector))
    except Exception:
        return []

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    # CRITICAL: Use access.tenant_id from JWT token (supports impersonation)
    # Fallback to user.tenant_id only if access.tenant_id is None
    tenant_id = access.tenant_id
    if not tenant_id and access.user:
        tenant_id = access.user.tenant_id
        logger.warning(f"tenant_scoped_query: access.tenant_id is None, using user.tenant_id={tenant_id}")
    
    if tenant_id:
        logger.debug(f"tenant_scoped_query: Filtering {model.__name__} by tenant_id={tenant_id}")
        query = query.filter_by(tenant_id=tenant_id)
    else:
        logger.error(f"tenant_scoped_query: No tenant_id available for {model.__name__}")
    
    return query


def normalize_breakdown_key(value: Any, fallback: str = "Bilinmiyor") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def get_user_branch_filter(access: UnifiedAccess, request_branch_id: Optional[str] = None) -> Optional[List[str]]:
    requested_branch_ids = [branch_id.strip() for branch_id in request_branch_id.split(',')] if request_branch_id else []
    requested_branch_ids = [branch_id for branch_id in requested_branch_ids if branch_id]

    if access.is_super_admin:
        return requested_branch_ids or None

    user = access.user
    allowed_branch_ids: List[str] = []
    if user and hasattr(user, 'branches') and user.branches:
        allowed_branch_ids = [str(b.id) for b in user.branches]

    if requested_branch_ids:
        if allowed_branch_ids and any(branch_id not in allowed_branch_ids for branch_id in requested_branch_ids):
            return ["00000000-0000-0000-0000-000000000000"]
        return requested_branch_ids

    if allowed_branch_ids:
        return allowed_branch_ids

    return None


def build_branch_filter_condition(column, branch_ids: Optional[List[str]]):
    if not branch_ids:
        return None
    return column.in_(branch_ids)

def enrich_activity_logs(logs: List[ActivityLog], session: Session) -> List[Dict[str, Any]]:
    """Enrich activity logs with user, tenant, branch details - batch fetched to avoid N+1"""
    if not logs:
        return []

    # Collect all unique IDs
    user_ids = {log.user_id for log in logs if log.user_id}
    tenant_ids = {log.tenant_id for log in logs if log.tenant_id}
    branch_ids = {log.branch_id for log in logs if log.branch_id}
    party_ids = {log.entity_id for log in logs if log.entity_type == 'patient' and log.entity_id}

    # Batch fetch all related entities (4 queries instead of up to 4*N)
    users_map = {u.id: u for u in session.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    tenants_map = {t.id: t for t in session.query(Tenant).filter(Tenant.id.in_(tenant_ids)).all()} if tenant_ids else {}
    branches_map = {b.id: b for b in session.query(Branch).filter(Branch.id.in_(branch_ids)).all()} if branch_ids else {}
    parties_map = {p.id: p for p in session.query(Party).filter(Party.id.in_(party_ids)).all()} if party_ids else {}

    results = []
    for log in logs:
        data = AuditLogRead.model_validate(log).model_dump(by_alias=True)

        if log.user_id and log.user_id in users_map:
            user = users_map[log.user_id]
            data['userName'] = f"{user.first_name} {user.last_name}" if user.first_name else user.username
            data['userEmail'] = user.email

        if log.tenant_id and log.tenant_id in tenants_map:
            data['tenantName'] = tenants_map[log.tenant_id].name

        if log.branch_id and log.branch_id in branches_map:
            data['branchName'] = branches_map[log.branch_id].name

        if log.entity_type == 'patient' and log.entity_id and log.entity_id in parties_map:
            party = parties_map[log.entity_id]
            data['patientName'] = f"{party.first_name} {party.last_name}"

        results.append(data)
    return results


def sum_sale_amounts(sales: List[Sale]) -> float:
    return float(sum(float(s.final_amount or s.total_amount or 0) for s in sales))


def sum_manual_income(records: List[Any]) -> float:
    return float(sum(float(r.amount or 0) for r in records if float(r.amount or 0) > 0))

# --- Routes ---

@router.get("/dashboard", operation_id="listDashboard", response_model=ResponseEnvelope[DashboardData])
def get_dashboard(
    access: UnifiedAccess = Depends(require_access("dashboard:read")),
    db_session: Session = Depends(get_db)
):
    """Main dashboard endpoint with KPIs and recent activity"""
    try:
        from core.models.sales import PaymentRecord

        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)

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
            sale_revenue = tenant_scoped_query(access, Sale, db_session).with_entities(
                func.coalesce(func.sum(func.coalesce(Sale.final_amount, Sale.total_amount, 0)), 0)
            ).scalar() or 0
            manual_revenue = tenant_scoped_query(access, PaymentRecord, db_session).filter(
                PaymentRecord.sale_id == None,
                PaymentRecord.amount > 0
            ).with_entities(func.coalesce(func.sum(PaymentRecord.amount), 0)).scalar() or 0
            estimated_revenue = float(sale_revenue) + float(manual_revenue)
        except Exception:
            estimated_revenue = 0.0

        try:
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
            daily_sale_rev = tenant_scoped_query(access, Sale, db_session).filter(
                Sale.sale_date >= today_start,
                Sale.sale_date < today_end
            ).with_entities(func.coalesce(func.sum(func.coalesce(Sale.final_amount, Sale.total_amount, 0)), 0)).scalar() or 0
            daily_manual_rev = tenant_scoped_query(access, PaymentRecord, db_session).filter(
                PaymentRecord.sale_id == None,
                PaymentRecord.amount > 0,
                PaymentRecord.payment_date >= today_start,
                PaymentRecord.payment_date < today_end
            ).with_entities(func.coalesce(func.sum(PaymentRecord.amount), 0)).scalar() or 0
            daily_revenue = float(daily_sale_rev) + float(daily_manual_rev)
        except Exception:
            daily_revenue = 0.0

        try:
            monthly_sale_rev = tenant_scoped_query(access, Sale, db_session).filter(
                Sale.sale_date >= month_start,
                Sale.sale_date < next_month
            ).with_entities(func.coalesce(func.sum(func.coalesce(Sale.final_amount, Sale.total_amount, 0)), 0)).scalar() or 0
            monthly_manual_rev = tenant_scoped_query(access, PaymentRecord, db_session).filter(
                PaymentRecord.sale_id == None,
                PaymentRecord.amount > 0,
                PaymentRecord.payment_date >= month_start,
                PaymentRecord.payment_date < next_month
            ).with_entities(func.coalesce(func.sum(PaymentRecord.amount), 0)).scalar() or 0
            monthly_revenue = float(monthly_sale_rev) + float(monthly_manual_rev)
        except Exception:
            monthly_revenue = 0.0

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

        # Resolve sector and enabled modules
        sector = _resolve_tenant_sector(access, db_session)
        enabled_modules = _get_enabled_modules(sector)
        has_devices_module = 'devices' in enabled_modules

        kpis = {
            "totalPatients": total_patients,
            "estimatedRevenue": estimated_revenue,
            "todayAppointments": today_appointments,
            "dailyRevenue": daily_revenue,
            "pendingAppointments": pending_appointments,
            "todaysAppointments": today_appointments,
            "activePatients": total_patients,
            "monthlyRevenue": monthly_revenue
        }

        # Conditional KPIs: only include device-related metrics when devices module is enabled
        if has_devices_module:
            kpis["totalDevices"] = total_devices
            kpis["availableDevices"] = available_devices
            kpis["activeTrials"] = active_trials
            kpis["endingTrials"] = ending_trials

        return ResponseEnvelope(
            data={
                "kpis": kpis,
                "recentActivity": recent_activity,
                "sector": sector,
                "enabledModules": enabled_modules
            }
        )
    except Exception as e:
        logger.error(f"Get dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/dashboard/charts/patient-trends", operation_id="listDashboardChartPatientTrends", response_model=ResponseEnvelope[ChartData])
def patient_trends(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient trends chart data"""
    try:
        now = datetime.utcnow()
        labels = []
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            labels.append(month_dt.strftime('%Y-%m'))

        six_months_ago = (now.replace(day=1) - timedelta(days=30*5)).replace(day=1)

        yr = extract('year', Party.created_at)
        mo = extract('month', Party.created_at)
        rows = tenant_scoped_query(access, Party, db_session).filter(
            Party.created_at >= six_months_ago,
        ).with_entities(
            yr.label('yr'),
            mo.label('mo'),
            func.count(Party.id).label('cnt')
        ).group_by(yr, mo).all()

        count_map = {f"{int(r.yr)}-{int(r.mo):02d}": int(r.cnt) for r in rows}
        data = [count_map.get(label, 0) for label in labels]

        return ResponseEnvelope(
            data={"labels": labels, "monthly": data}
        )
    except Exception as e:
        logger.error(f"Patient trends error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/dashboard/charts/revenue-trends", operation_id="listDashboardChartRevenueTrends", response_model=ResponseEnvelope[ChartData])
def revenue_trends(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Revenue trends chart data"""
    try:
        now = datetime.utcnow()
        # Build labels for last 6 months
        labels = []
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=30*i))
            labels.append(month_dt.strftime('%Y-%m'))

        # Calculate date range for the query (6 months ago to now)
        six_months_ago = (now.replace(day=1) - timedelta(days=30*5)).replace(day=1)

        # Single GROUP BY query instead of 6 separate .all() calls
        yr = extract('year', Sale.created_at)
        mo = extract('month', Sale.created_at)
        rows = tenant_scoped_query(access, Sale, db_session).filter(
            Sale.status == 'completed',
            Sale.created_at >= six_months_ago,
        ).with_entities(
            yr.label('yr'),
            mo.label('mo'),
            func.coalesce(func.sum(func.coalesce(Sale.final_amount, Sale.total_amount, 0)), 0).label('total')
        ).group_by(yr, mo).all()

        revenue_map = {f"{int(r.yr)}-{int(r.mo):02d}": float(r.total) for r in rows}
        data = [revenue_map.get(label, 0.0) for label in labels]

        return ResponseEnvelope(
            data={"labels": labels, "monthly": data}
        )
    except Exception as e:
        logger.error(f"Revenue trends error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/dashboard/charts/patient-distribution", operation_id="listDashboardChartPatientDistribution", response_model=ResponseEnvelope[List[BranchDistribution]])
def patient_distribution(
    branch_id: Optional[str] = Query(None, alias="branch_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Patient distribution by branch"""
    try:
        branch_ids = get_user_branch_filter(access, branch_id)
        branch_query = tenant_scoped_query(access, Branch, db_session)
        if branch_ids:
            branch_query = branch_query.filter(Branch.id.in_(branch_ids))
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
                seg_map = {normalize_breakdown_key(s): int(c) for s, c in seg_counts}
            except Exception:
                seg_map = {}

            try:
                acq_counts = db_session.query(
                    Party.acquisition_type, func.count(Party.id)
                ).filter(Party.branch_id == b_id)
                
                if access.tenant_id:
                    acq_counts = acq_counts.filter(Party.tenant_id == access.tenant_id)
                
                acq_counts = acq_counts.group_by(Party.acquisition_type).all()
                acq_map = {normalize_breakdown_key(s): int(c) for s, c in acq_counts}
            except Exception:
                acq_map = {}

            results.append({
                'branchId': b_id,
                'branch': br.name or 'Sube',
                'breakdown': {
                    'status': status_map,
                    'segment': seg_map,
                    'acquisitionType': acq_map
                }
            })

        if not results:
            scoped_parties = tenant_scoped_query(access, Party, db_session)
            if branch_ids:
                scoped_parties = scoped_parties.filter(Party.branch_id.in_(branch_ids))

            try:
                status_counts = scoped_parties.with_entities(
                    Party.status, func.count(Party.id)
                ).group_by(Party.status).all()
                status_map = {s.value if hasattr(s, 'value') else str(s): int(c) for s, c in status_counts}
            except Exception:
                status_map = {}

            try:
                segment_counts = scoped_parties.with_entities(
                    Party.segment, func.count(Party.id)
                ).group_by(Party.segment).all()
                seg_map = {normalize_breakdown_key(s): int(c) for s, c in segment_counts}
            except Exception:
                seg_map = {}

            try:
                acquisition_counts = scoped_parties.with_entities(
                    Party.acquisition_type, func.count(Party.id)
                ).group_by(Party.acquisition_type).all()
                acq_map = {normalize_breakdown_key(s): int(c) for s, c in acquisition_counts}
            except Exception:
                acq_map = {}

            if status_map or seg_map or acq_map:
                results.append({
                    'branchId': branch_ids[0] if branch_ids and len(branch_ids) == 1 else 'scope',
                    'branch': 'Secili Kapsam',
                    'breakdown': {
                        'status': status_map,
                        'segment': seg_map,
                        'acquisitionType': acq_map
                    }
                })

        return ResponseEnvelope(data=results)
    except Exception as e:
        logger.error(f"Patient distribution error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
