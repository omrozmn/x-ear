"""
FastAPI Activity Logs Router
Handles activity log viewing and filtering for audit purposes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.activity_logs import ActivityLogRead, ActivityLogStats
from middleware.unified_access import UnifiedAccess, require_access
logger = logging.getLogger(__name__)

router = APIRouter(tags=["ActivityLogs"])

ACTIVITY_DETAIL_PERMISSION = "sensitive.reports.activity.details.view"


def parse_activity_date(raw_value: Optional[str], end_of_day: bool = False) -> Optional[datetime]:
    if not raw_value:
        return None

    parsed = datetime.fromisoformat(raw_value.replace('Z', '+00:00'))
    if end_of_day and len(raw_value) <= 10:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed


@router.get("/activity-logs", operation_id="listActivityLogs", response_model=ResponseEnvelope[List[ActivityLogRead]])
def get_activity_logs(
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=100, alias="limit"),
    tenant_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Get activity logs with unified access"""
    try:
        from models.user import ActivityLog, User
        from core.models.branch import Branch

        query = db.query(
            ActivityLog,
            User.first_name.label("user_first_name"),
            User.last_name.label("user_last_name"),
            User.email.label("user_email"),
            User.username.label("user_username"),
            Branch.name.label("branch_name")
        ).outerjoin(User, User.id == ActivityLog.user_id).outerjoin(Branch, Branch.id == ActivityLog.branch_id)
        
        # Super admins should see cross-tenant activity by default.
        if access.is_super_admin:
            pass
        # Tenant filtering
        elif access.tenant_id:
            query = query.filter(ActivityLog.tenant_id == access.tenant_id)
        elif tenant_id:
            query = query.filter(ActivityLog.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)

        if branch_id:
            branch_ids = [item.strip() for item in branch_id.split(',') if item.strip()]
            if branch_ids:
                query = query.filter(ActivityLog.branch_id.in_(branch_ids))
        
        if action:
            query = query.filter(ActivityLog.action == action)
        
        if date_from:
            try:
                from_date = parse_activity_date(date_from)
                query = query.filter(ActivityLog.created_at >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = parse_activity_date(date_to, end_of_day=True)
                query = query.filter(ActivityLog.created_at <= to_date)
            except ValueError:
                pass
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    ActivityLog.message.ilike(search_pattern),
                    ActivityLog.action.ilike(search_pattern)
                )
            )
        
        # Order by created_at descending
        query = query.order_by(desc(ActivityLog.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        logs = query.offset(offset).limit(page_size).all()

        can_view_details = access.has_permission(ACTIVITY_DETAIL_PERMISSION)
        logs_data = []
        for log, user_first_name, user_last_name, user_email, user_username, branch_name in logs:
            full_name = " ".join([part for part in [user_first_name, user_last_name] if part]).strip()
            parsed_details = log.details_json if hasattr(log, "details_json") else log.details
            parsed_data = log.data_json if hasattr(log, "data_json") else log.data

            logs_data.append(ActivityLogRead.model_validate({
                "id": log.id,
                "createdAt": log.created_at,
                "updatedAt": log.updated_at,
                "action": log.action,
                "entityType": log.entity_type,
                "entityId": log.entity_id,
                "message": log.message,
                "details": parsed_details if can_view_details else None,
                "data": parsed_data if can_view_details else None,
                "isCritical": log.is_critical,
                "userId": log.user_id,
                "tenantId": log.tenant_id,
                "branchId": log.branch_id,
                "branchName": branch_name,
                "role": log.role,
                "ipAddress": log.ip_address if can_view_details else None,
                "userAgent": log.user_agent if can_view_details else None,
                "userName": full_name or user_username or log.user_id,
                "userEmail": user_email if can_view_details else None,
            }))
        
        return ResponseEnvelope(
            data=logs_data,
            meta={
                'total': total,
                'page': page,
                'pageSize': page_size,
                'totalPages': (total + page_size - 1) // page_size
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/activity-logs/stats", operation_id="listActivityLogStats", response_model=ResponseEnvelope[ActivityLogStats])
def get_activity_stats(
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Get activity statistics"""
    try:
        from models.user import ActivityLog
        from core.models.branch import Branch
        
        base_query = db.query(ActivityLog)
        if not access.is_super_admin and access.tenant_id:
            base_query = base_query.filter(ActivityLog.tenant_id == access.tenant_id)
        
        # Total logs
        total = base_query.count()
        
        # Logs in last 24 hours
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        last_24h = base_query.filter(ActivityLog.created_at >= yesterday).count()
        
        # Critical logs
        critical = base_query.filter(ActivityLog.is_critical == True).count()
        
        # Top actions
        top_actions_query = db.query(
            ActivityLog.action,
            func.count(ActivityLog.id).label('count')
        )
        if access.tenant_id:
            top_actions_query = top_actions_query.filter(ActivityLog.tenant_id == access.tenant_id)
        top_actions = top_actions_query.group_by(
            ActivityLog.action
        ).order_by(desc('count')).limit(10).all()
        
        return ResponseEnvelope(data={
            'total': total,
            'last24Hours': last_24h,
            'critical': critical,
            'topActions': [{'action': a, 'count': c} for a, c in top_actions]
        })
        
    except Exception as e:
        logger.error(f"Error fetching activity stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/activity-logs/filter-options", operation_id="listActivityLogFilterOptions")
def get_activity_log_filter_options(
    access: UnifiedAccess = Depends(require_access(admin_only=True, tenant_required=False)),
    db: Session = Depends(get_db)
):
    """Get available filter options for activity logs"""
    try:
        from models.user import ActivityLog
        
        base_query = db.query(ActivityLog)
        if not access.is_super_admin and access.tenant_id:
            base_query = base_query.filter(ActivityLog.tenant_id == access.tenant_id)
        
        # Get unique actions
        actions = base_query.with_entities(ActivityLog.action).distinct().all()
        action_list = [a[0] for a in actions if a[0]]
        
        # Get unique entity types
        entity_types = base_query.with_entities(ActivityLog.entity_type).distinct().all()
        entity_type_list = [e[0] for e in entity_types if e[0]]
        
        # Get unique users (with names if available)
        from models.user import User
        user_ids = base_query.with_entities(ActivityLog.user_id).distinct().limit(100).all()
        users = []
        for (uid,) in user_ids:
            if uid:
                user = db.get(User, uid)
                if user:
                    users.append({
                        'id': uid,
                        'name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
                    })
                else:
                    users.append({'id': uid, 'name': uid})
        
        branch_ids = base_query.with_entities(ActivityLog.branch_id).distinct().limit(100).all()
        branches = []
        for (bid,) in branch_ids:
            if bid:
                branch = db.get(Branch, bid)
                if branch:
                    branches.append({
                        "id": bid,
                        "name": branch.name
                    })

        return ResponseEnvelope(data={
            'actions': sorted(action_list),
            'entityTypes': sorted(entity_type_list),
            'users': users,
            'branches': branches
        })
        
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Alias endpoint for /audit (backward compatibility)
@router.get("/audit", operation_id="listAuditAlias", response_model=ResponseEnvelope[List[ActivityLogRead]])
def get_audit_logs_alias(
    page: int = Query(1, ge=1, le=10000),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    entity_type: Optional[str] = Query(None, alias="entityType"),
    entity_id: Optional[str] = Query(None, alias="entityId"),
    action: Optional[str] = None,
    user_id: Optional[str] = Query(None, alias="userId"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("activity_logs.view", admin_only=True, tenant_required=False)),
    db_session: Session = Depends(get_db)
):
    """Get audit logs (alias for activity logs)"""
    return get_activity_logs(
        page=page,
        page_size=per_page,  # Map per_page to page_size
        tenant_id=None,
        user_id=user_id,
        action=action,
        date_from=start_date,
        date_to=end_date,
        search=None,
        access=access,
        db=db_session
    )
