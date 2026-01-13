"""
FastAPI Activity Logs Router
Handles activity log viewing and filtering for audit purposes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import logging
import json

from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.activity_logs import ActivityLogRead, ActivityLogStats
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ActivityLogs"])


@router.get("/activity-logs", operation_id="listActivityLogs", response_model=ResponseEnvelope[List[ActivityLogRead]])
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="limit"),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get activity logs with unified access"""
    try:
        from models.user import ActivityLog
        
        query = db.query(ActivityLog)
        
        # Tenant filtering
        if access.tenant_id:
            query = query.filter(ActivityLog.tenant_id == access.tenant_id)
        elif tenant_id:
            query = query.filter(ActivityLog.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)
        
        if action:
            query = query.filter(ActivityLog.action == action)
        
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(ActivityLog.created_at >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
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
        
        # Convert to dict
        logs_data = []
        for log in logs:
            log_dict = log.to_dict() if hasattr(log, 'to_dict') else {
                'id': log.id,
                'tenantId': log.tenant_id,
                'userId': log.user_id,
                'action': log.action,
                'entityType': log.entity_type,
                'entityId': log.entity_id,
                'message': log.message,
                'createdAt': log.created_at.isoformat() if log.created_at else None
            }
            logs_data.append(log_dict)
        
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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity-logs/stats", operation_id="listActivityLogStats", response_model=ResponseEnvelope[ActivityLogStats])
def get_activity_stats(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get activity statistics"""
    try:
        from models.user import ActivityLog
        
        base_query = db.query(ActivityLog)
        if access.tenant_id:
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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity-logs/filter-options", operation_id="listActivityLogFilterOptions")
def get_activity_log_filter_options(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get available filter options for activity logs"""
    try:
        from models.user import ActivityLog
        
        base_query = db.query(ActivityLog)
        if access.tenant_id:
            base_query = base_query.filter(ActivityLog.tenant_id == access.tenant_id)
        
        # Get unique actions
        actions = db.query(ActivityLog.action).distinct().all()
        action_list = [a[0] for a in actions if a[0]]
        
        # Get unique entity types
        entity_types = db.query(ActivityLog.entity_type).distinct().all()
        entity_type_list = [e[0] for e in entity_types if e[0]]
        
        # Get unique users (with names if available)
        from models.user import User
        user_ids = db.query(ActivityLog.user_id).distinct().limit(100).all()
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
        
        return ResponseEnvelope(data={
            'actions': sorted(action_list),
            'entityTypes': sorted(entity_type_list),
            'users': users
        })
        
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))
