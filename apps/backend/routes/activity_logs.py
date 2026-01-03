"""
Activity Logs API

Unified access pattern for activity logging system:
- Super Admin: See all tenant logs
- Tenant Admin: See own tenant's logs

Both support filtering and pagination.
"""
from flask import Blueprint, request, jsonify
from models.user import ActivityLog, User
from models.tenant import Tenant
from models.branch import Branch
from models.base import db
from datetime import datetime, timedelta
import logging
import json

from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

activity_logs_bp = Blueprint('activity_logs', __name__)


def _build_activity_query(
    tenant_id: str = None,
    branch_id: str = None,
    user_id: str = None,
    role: str = None,
    action: str = None,
    action_prefix: str = None,
    date_from: str = None,
    date_to: str = None,
    critical_only: bool = False,
    search: str = None
):
    """Build SQLAlchemy query with filters"""
    query = ActivityLog.query
    
    if tenant_id:
        query = query.filter(ActivityLog.tenant_id == tenant_id)
    
    if branch_id:
        query = query.filter(ActivityLog.branch_id == branch_id)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    if role:
        query = query.filter(ActivityLog.role == role)
    
    if action:
        query = query.filter(ActivityLog.action == action)
    
    if action_prefix:
        query = query.filter(ActivityLog.action.like(f"{action_prefix}.%"))
    
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
    
    if critical_only:
        query = query.filter(ActivityLog.is_critical == True)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                ActivityLog.message.ilike(search_pattern),
                ActivityLog.action.ilike(search_pattern),
                ActivityLog.entity_id.ilike(search_pattern)
            )
        )
    
    return query


# =============================================================================
# UNIFIED ACTIVITY LOGS ENDPOINT (Super Admin + Tenant Admin)
# =============================================================================

@activity_logs_bp.route('/activity-logs', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def get_activity_logs(ctx):
    """
    Get activity logs with unified access.
    
    Super Admin: Can see all tenants' logs (optionally filter by tenant_id)
    Tenant Admin: Only sees own tenant's logs
    
    Query params:
        page: int - Page number (default 1)
        page_size/limit: int - Items per page (default 20, max 100)
        tenant_id: str - Filter by tenant (Super Admin only)
        branch_id: str - Filter by branch
        user_id: str - Filter by user
        role: str - Filter by role
        action: str - Filter by exact action
        action_type/entity_type: str - Filter by action prefix
        date_from: str - ISO date string
        date_to: str - ISO date string
        critical_only: bool - Only show critical actions
        search: str - Search in message, action, entity_id
    """
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        page_size = min(
            request.args.get('page_size', request.args.get('limit', 20, type=int), type=int),
            100
        )
        
        # Tenant filtering - Super Admin can specify tenant_id, others are auto-filtered
        tenant_filter = None
        if ctx.tenant_id:
            # Tenant user - always filter by their tenant
            tenant_filter = ctx.tenant_id
        elif ctx.is_super_admin:
            # Super Admin - can optionally filter by tenant
            tenant_filter = request.args.get('tenant_id')
        
        branch_id = request.args.get('branch_id')
        user_id_filter = request.args.get('user_id')
        role = request.args.get('role')
        action = request.args.get('action')
        action_type = request.args.get('action_type') or request.args.get('entity_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        critical_only = request.args.get('critical_only', 'false').lower() == 'true'
        search = request.args.get('search')
        
        # Build query
        query = _build_activity_query(
            tenant_id=tenant_filter,
            branch_id=branch_id,
            user_id=user_id_filter,
            role=role,
            action=action,
            action_prefix=action_type,
            date_from=date_from,
            date_to=date_to,
            critical_only=critical_only,
            search=search
        )
        
        # Order by created_at descending
        query = query.order_by(ActivityLog.created_at.desc())
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        logs = query.offset(offset).limit(page_size).all()
        
        # Enhance with user names
        logs_data = [log.to_dict_with_user() for log in logs]
        
        return success_response(
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
        return error_response(f'Aktivite logları alınamadı: {str(e)}', 500)


@activity_logs_bp.route('/activity-logs/<log_id>', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def get_activity_log_detail(ctx, log_id):
    """Get a single activity log entry with full details"""
    try:
        log = ActivityLog.query.get(log_id)
        if not log:
            return error_response('Log bulunamadı', 404)
        
        # Tenant scoping check
        if ctx.tenant_id and log.tenant_id != ctx.tenant_id:
            return error_response('Bu log erişiminiz dışında', 403)
        
        return success_response(data=log.to_dict_with_user())
        
    except Exception as e:
        logger.error(f"Error fetching activity log: {e}")
        return error_response(str(e), 500)


@activity_logs_bp.route('/activity-logs/filter-options', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def get_filter_options(ctx):
    """Get available filter options for activity logs"""
    try:
        # Get distinct actions
        actions_query = db.session.query(ActivityLog.action.distinct())
        if ctx.tenant_id:
            actions_query = actions_query.filter(ActivityLog.tenant_id == ctx.tenant_id)
        actions = [a[0] for a in actions_query.all() if a[0]]
        
        # Get distinct roles
        roles_query = db.session.query(ActivityLog.role.distinct())
        if ctx.tenant_id:
            roles_query = roles_query.filter(ActivityLog.tenant_id == ctx.tenant_id)
        roles = [r[0] for r in roles_query.all() if r[0]]
        
        # Get action types (prefixes)
        action_types = list(set(a.split('.')[0] for a in actions if '.' in a))
        
        result = {
            'actions': sorted(actions),
            'actionTypes': sorted(action_types),
            'roles': sorted(roles)
        }
        
        # Add tenants for super admin
        if ctx.is_admin:
            tenants = Tenant.query.all()
            result['tenants'] = [{'id': t.id, 'name': t.name} for t in tenants]
        
        # Add branches
        branches_query = Branch.query
        if ctx.tenant_id:
            branches_query = branches_query.filter(Branch.tenant_id == ctx.tenant_id)
        branches = branches_query.all()
        result['branches'] = [{'id': b.id, 'name': b.name} for b in branches]
        
        # Add users
        users_query = User.query
        if ctx.tenant_id:
            users_query = users_query.filter(User.tenant_id == ctx.tenant_id)
        users = users_query.limit(100).all()
        result['users'] = [
            {'id': u.id, 'name': f"{u.first_name} {u.last_name}" if u.first_name else u.username}
            for u in users
        ]
        
        return success_response(data=result)
        
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return error_response(str(e), 500)


@activity_logs_bp.route('/activity-logs/stats', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def get_activity_stats(ctx):
    """
    Get activity statistics.
    Super Admin sees global stats, Tenant Admin sees tenant stats.
    """
    try:
        base_query = ActivityLog.query
        if ctx.tenant_id:
            base_query = base_query.filter(ActivityLog.tenant_id == ctx.tenant_id)
        
        # Total logs
        total = base_query.count()
        
        # Logs in last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        last_24h_query = base_query.filter(ActivityLog.created_at >= yesterday)
        last_24h = last_24h_query.count()
        
        # Critical logs
        critical_query = base_query.filter(ActivityLog.is_critical == True)
        critical = critical_query.count()
        
        # Top actions
        top_actions_query = db.session.query(
            ActivityLog.action,
            db.func.count(ActivityLog.id).label('count')
        )
        if ctx.tenant_id:
            top_actions_query = top_actions_query.filter(ActivityLog.tenant_id == ctx.tenant_id)
        top_actions = top_actions_query.group_by(
            ActivityLog.action
        ).order_by(db.desc('count')).limit(10).all()
        
        result = {
            'total': total,
            'last24Hours': last_24h,
            'critical': critical,
            'topActions': [{'action': a, 'count': c} for a, c in top_actions]
        }
        
        # Add top tenants for super admin only
        if ctx.is_admin:
            top_tenants = db.session.query(
                ActivityLog.tenant_id,
                db.func.count(ActivityLog.id).label('count')
            ).filter(
                ActivityLog.tenant_id.isnot(None)
            ).group_by(
                ActivityLog.tenant_id
            ).order_by(db.desc('count')).limit(5).all()
            result['topTenants'] = [{'tenantId': t, 'count': c} for t, c in top_tenants]
        
        return success_response(data=result)
        
    except Exception as e:
        logger.error(f"Error fetching activity stats: {e}")
        return error_response(str(e), 500)


# =============================================================================
# LEGACY ADMIN ENDPOINTS (for backward compatibility)
# =============================================================================

@activity_logs_bp.route('/admin/activity-logs', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def admin_get_activity_logs(ctx):
    """
    Legacy admin endpoint - redirects to unified endpoint.
    Kept for backward compatibility with admin panel.
    """
    if not ctx.is_super_admin:
        return error_response('Bu endpoint sadece platform yöneticileri için kullanılabilir', 403)
    
    # Delegate to unified endpoint
    return get_activity_logs(ctx)


@activity_logs_bp.route('/admin/activity-logs/filter-options', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def admin_get_filter_options(ctx):
    """Legacy admin filter options endpoint"""
    if not ctx.is_admin:
        return error_response('Bu endpoint sadece platform yöneticileri için kullanılabilir', 403)
    
    return get_filter_options(ctx)


@activity_logs_bp.route('/admin/activity-logs/stats', methods=['GET'])
@unified_access(resource='activity_logs', action='read')
def admin_get_activity_stats(ctx):
    """Legacy admin stats endpoint"""
    if not ctx.is_admin:
        return error_response('Bu endpoint sadece platform yöneticileri için kullanılabilir', 403)
    
    return get_activity_stats(ctx)


# =============================================================================
# CREATE ACTIVITY LOG (POST - no auth requirement for internal logging)
# =============================================================================

@idempotent(methods=['POST'])
@activity_logs_bp.route('/activity-logs', methods=['POST'])
def create_activity_log():
    """Create a new activity log entry (internal/system use)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Extract required fields
        user_id = data.get('user_id', 'system')
        action = data.get('action')
        entity_type = data.get('entity_type')
        entity_id = data.get('entity_id')
        details = data.get('details')
        message = data.get('message')
        tenant_id = data.get('tenant_id')
        
        # Convert details to JSON string if it's a dict
        details_str = None
        if isinstance(details, dict):
            details_str = json.dumps(details)
        elif details is not None:
            details_str = str(details)
        
        if not action:
            return jsonify({
                'success': False, 
                'error': 'action is required'
            }), 400
        
        # Create activity log entry
        activity_log = ActivityLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details_str,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        
        db.session.add(activity_log)
        db.session.commit()
        
        logger.info(f"Activity log created: {action} {entity_type} {entity_id}")
        
        return jsonify({
            'success': True,
            'data': activity_log.to_dict(),
            'message': 'Activity log created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating activity log: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to create activity log: {str(e)}'
        }), 500
