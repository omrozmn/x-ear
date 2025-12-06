"""
Activity Logs API

Two-level activity logging system:
1. Platform Admin: GET /api/admin/activity-logs - See all tenant logs
2. Tenant Admin: GET /api/activity-logs - See own tenant's logs

Both endpoints support filtering and pagination.
"""
from flask import Blueprint, request, jsonify
from models.user import ActivityLog, User
from models.tenant import Tenant
from models.branch import Branch
from models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
import logging
import json

from utils.idempotency import idempotent
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

activity_logs_bp = Blueprint('activity_logs', __name__)


def _is_super_admin():
    """Check if current user is platform super admin (admin@x-ear.com)"""
    try:
        user_id = get_jwt_identity()
        jwt_claims = get_jwt()
        
        # Check if this is an admin panel JWT
        if jwt_claims.get('type') == 'admin':
            return True
        
        # Check for super admin email
        user = User.query.get(user_id)
        if user and user.email == 'admin@x-ear.com':
            return True
        
        return False
    except Exception:
        return False


def _is_tenant_admin():
    """Check if current user is tenant admin"""
    try:
        user_id = get_jwt_identity()
        jwt_claims = get_jwt()
        
        # Check role from JWT
        role = jwt_claims.get('effective_role') or jwt_claims.get('role')
        if role in ('tenant_admin', 'admin'):
            return True
        
        # Check from database
        user = User.query.get(user_id)
        if user and user.role in ('tenant_admin', 'admin'):
            return True
        
        return False
    except Exception:
        return False


def _get_current_tenant_id():
    """Get current user's tenant ID from JWT"""
    try:
        jwt_claims = get_jwt()
        return jwt_claims.get('tenant_id')
    except Exception:
        return None


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
        # Filter by action prefix (e.g., "patient" to get patient.*, "invoice" to get invoice.*)
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
# PLATFORM ADMIN ENDPOINT
# =============================================================================

@activity_logs_bp.route('/admin/activity-logs', methods=['GET'])
@jwt_required()
def admin_get_activity_logs():
    """
    Get all activity logs for platform admin.
    
    Query params:
        page: int - Page number (default 1)
        page_size: int - Items per page (default 20, max 100)
        tenant_id: str - Filter by tenant
        branch_id: str - Filter by branch
        user_id: str - Filter by user
        role: str - Filter by role
        action: str - Filter by exact action
        action_type: str - Filter by action prefix (e.g., "patient", "invoice")
        date_from: str - ISO date string
        date_to: str - ISO date string
        critical_only: bool - Only show critical actions
        search: str - Search in message, action, entity_id
    
    Returns:
        {
            success: true,
            data: {
                logs: [...],
                meta: { total, page, pageSize, totalPages }
            }
        }
    """
    # Check super admin access
    if not _is_super_admin():
        return jsonify({
            'success': False,
            'error': 'Bu endpoint sadece platform yöneticileri için kullanılabilir'
        }), 403
    
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        page_size = min(request.args.get('page_size', 20, type=int), 100)
        
        tenant_id = request.args.get('tenant_id')
        branch_id = request.args.get('branch_id')
        user_id = request.args.get('user_id')
        role = request.args.get('role')
        action = request.args.get('action')
        action_type = request.args.get('action_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        critical_only = request.args.get('critical_only', 'false').lower() == 'true'
        search = request.args.get('search')
        
        # Build query - use UnboundSession to bypass tenant filter
        with UnboundSession():
            query = _build_activity_query(
                tenant_id=tenant_id,
                branch_id=branch_id,
                user_id=user_id,
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
            
            # Enhance with user/tenant names
            logs_data = [log.to_dict_with_user() for log in logs]
        
        return jsonify({
            'success': True,
            'data': {
                'logs': logs_data,
                'meta': {
                    'total': total,
                    'page': page,
                    'pageSize': page_size,
                    'totalPages': (total + page_size - 1) // page_size
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching admin activity logs: {e}")
        return jsonify({
            'success': False,
            'error': f'Aktivite logları alınamadı: {str(e)}'
        }), 500


@activity_logs_bp.route('/admin/activity-logs/filter-options', methods=['GET'])
@jwt_required()
def admin_get_filter_options():
    """Get filter options for admin panel activity logs"""
    if not _is_super_admin():
        return jsonify({
            'success': False,
            'error': 'Bu endpoint sadece platform yöneticileri için kullanılabilir'
        }), 403
    
    try:
        with UnboundSession():
            # Get distinct actions
            actions = [a[0] for a in db.session.query(ActivityLog.action.distinct()).all() if a[0]]
            
            # Get distinct roles
            roles = [r[0] for r in db.session.query(ActivityLog.role.distinct()).all() if r[0]]
            
            # Get action types (prefixes)
            action_types = list(set(a.split('.')[0] for a in actions if '.' in a))
            
            # Get all tenants
            tenants = Tenant.query.all()
            
            # Get all branches
            branches = Branch.query.all()
            
            # Get users (limit for performance)
            users = User.query.limit(200).all()
        
        return jsonify({
            'success': True,
            'data': {
                'actions': sorted(actions),
                'actionTypes': sorted(action_types),
                'roles': sorted(roles),
                'tenants': [{'id': t.id, 'name': t.name} for t in tenants],
                'branches': [{'id': b.id, 'name': b.name, 'tenantId': b.tenant_id} for b in branches],
                'users': [
                    {'id': u.id, 'name': f"{u.first_name} {u.last_name}" if u.first_name else u.username, 'tenantId': u.tenant_id}
                    for u in users
                ]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching admin filter options: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@activity_logs_bp.route('/admin/activity-logs/stats', methods=['GET'])
@jwt_required()
def admin_get_activity_stats():
    """
    Get activity statistics for platform admin.
    
    Returns action counts, top users, etc.
    """
    if not _is_super_admin():
        return jsonify({
            'success': False,
            'error': 'Bu endpoint sadece platform yöneticileri için kullanılabilir'
        }), 403
    
    try:
        with UnboundSession():
            # Total logs
            total = ActivityLog.query.count()
            
            # Logs in last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            last_24h = ActivityLog.query.filter(ActivityLog.created_at >= yesterday).count()
            
            # Critical logs
            critical = ActivityLog.query.filter(ActivityLog.is_critical == True).count()
            
            # Top actions
            top_actions = db.session.query(
                ActivityLog.action,
                db.func.count(ActivityLog.id).label('count')
            ).group_by(ActivityLog.action).order_by(db.desc('count')).limit(10).all()
            
            # Top tenants
            top_tenants = db.session.query(
                ActivityLog.tenant_id,
                db.func.count(ActivityLog.id).label('count')
            ).filter(ActivityLog.tenant_id.isnot(None)).group_by(ActivityLog.tenant_id).order_by(db.desc('count')).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total': total,
                'last24Hours': last_24h,
                'critical': critical,
                'topActions': [{'action': a, 'count': c} for a, c in top_actions],
                'topTenants': [{'tenantId': t, 'count': c} for t, c in top_tenants]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching activity stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# =============================================================================
# TENANT (CRM) ENDPOINT
# =============================================================================

@activity_logs_bp.route('/activity-logs', methods=['GET'])
@jwt_required()
def get_activity_logs():
    """
    Get activity logs for tenant admin.
    Only shows logs for the current tenant.
    
    Query params:
        page: int - Page number (default 1)
        page_size/limit: int - Items per page (default 20, max 100)
        branch_id: str - Filter by branch
        user_id: str - Filter by user
        role: str - Filter by role
        action: str - Filter by exact action
        action_type/entity_type: str - Filter by action prefix
        date_from: str - ISO date string
        date_to: str - ISO date string
        critical_only: bool - Only show critical actions
        search: str - Search in message, action, entity_id
    
    Returns:
        {
            success: true,
            data: [...],
            count: number,
            pagination: { total, page, limit, totalPages }
        }
    """
    # Check tenant admin access
    if not _is_tenant_admin():
        return jsonify({
            'success': False,
            'error': 'Bu özellik sadece yöneticiler için kullanılabilir'
        }), 403
    
    try:
        # Get current tenant
        current_tenant_id = _get_current_tenant_id()
        if not current_tenant_id:
            # Try to get from user
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if user:
                current_tenant_id = user.tenant_id
        
        if not current_tenant_id:
            return jsonify({
                'success': False,
                'error': 'Tenant bilgisi bulunamadı'
            }), 400
        
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        page_size = min(
            request.args.get('page_size', request.args.get('limit', 20, type=int), type=int),
            100
        )
        
        branch_id = request.args.get('branch_id')
        user_id_filter = request.args.get('user_id')
        role = request.args.get('role')
        action = request.args.get('action')
        action_type = request.args.get('action_type') or request.args.get('entity_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        critical_only = request.args.get('critical_only', 'false').lower() == 'true'
        search = request.args.get('search')
        
        # Build query - force tenant filter
        query = _build_activity_query(
            tenant_id=current_tenant_id,  # Always filter by current tenant
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
        
        return jsonify({
            'success': True,
            'data': logs_data,
            'count': total,
            'pagination': {
                'total': total,
                'page': page,
                'limit': page_size,
                'totalPages': (total + page_size - 1) // page_size
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        return jsonify({
            'success': False,
            'error': f'Aktivite logları alınamadı: {str(e)}'
        }), 500


@activity_logs_bp.route('/activity-logs/<log_id>', methods=['GET'])
@jwt_required()
def get_activity_log_detail(log_id):
    """Get a single activity log entry with full details"""
    if not _is_tenant_admin():
        return jsonify({
            'success': False,
            'error': 'Bu özellik sadece yöneticiler için kullanılabilir'
        }), 403
    
    try:
        log = ActivityLog.query.get(log_id)
        if not log:
            return jsonify({
                'success': False,
                'error': 'Log bulunamadı'
            }), 404
        
        # Check tenant access
        current_tenant_id = _get_current_tenant_id()
        if current_tenant_id and log.tenant_id != current_tenant_id:
            return jsonify({
                'success': False,
                'error': 'Bu log erişiminiz dışında'
            }), 403
        
        return jsonify({
            'success': True,
            'data': log.to_dict_with_user()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching activity log: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# =============================================================================
# LEGACY ENDPOINT (for backward compatibility)
# =============================================================================

@idempotent(methods=['POST'])
@activity_logs_bp.route('/activity-logs', methods=['POST'])
def create_activity_log():
    """Create a new activity log entry (legacy endpoint)"""
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
        
        # Get tenant from JWT if available
        tenant_id = None
        try:
            jwt_claims = get_jwt()
            tenant_id = jwt_claims.get('tenant_id')
        except Exception:
            pass
        
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


# =============================================================================
# FILTER OPTIONS ENDPOINT
# =============================================================================

@activity_logs_bp.route('/activity-logs/filter-options', methods=['GET'])
@jwt_required()
def get_filter_options():
    """Get available filter options for activity logs"""
    try:
        current_tenant_id = _get_current_tenant_id()
        is_admin = _is_super_admin()
        
        # Get distinct actions
        actions_query = db.session.query(ActivityLog.action.distinct())
        if not is_admin and current_tenant_id:
            actions_query = actions_query.filter(ActivityLog.tenant_id == current_tenant_id)
        actions = [a[0] for a in actions_query.all() if a[0]]
        
        # Get distinct roles
        roles_query = db.session.query(ActivityLog.role.distinct())
        if not is_admin and current_tenant_id:
            roles_query = roles_query.filter(ActivityLog.tenant_id == current_tenant_id)
        roles = [r[0] for r in roles_query.all() if r[0]]
        
        # Get action types (prefixes)
        action_types = list(set(a.split('.')[0] for a in actions if '.' in a))
        
        result = {
            'actions': sorted(actions),
            'actionTypes': sorted(action_types),
            'roles': sorted(roles)
        }
        
        # Add tenants for super admin
        if is_admin:
            with UnboundSession():
                tenants = Tenant.query.all()
                result['tenants'] = [{'id': t.id, 'name': t.name} for t in tenants]
        
        # Add branches
        if is_admin or current_tenant_id:
            branches_query = Branch.query
            if not is_admin and current_tenant_id:
                branches_query = branches_query.filter(Branch.tenant_id == current_tenant_id)
            branches = branches_query.all()
            result['branches'] = [{'id': b.id, 'name': b.name} for b in branches]
        
        # Add users
        if is_admin or current_tenant_id:
            users_query = User.query
            if not is_admin and current_tenant_id:
                users_query = users_query.filter(User.tenant_id == current_tenant_id)
            users = users_query.limit(100).all()
            result['users'] = [
                {'id': u.id, 'name': f"{u.first_name} {u.last_name}" if u.first_name else u.username}
                for u in users
            ]
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
