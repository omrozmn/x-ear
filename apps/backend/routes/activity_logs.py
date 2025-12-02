from flask import Blueprint, request, jsonify
from models.user import ActivityLog
from models.base import db
from utils.authorization import jwt_required
from flask_jwt_extended import get_jwt_identity
import logging
import json
from utils.idempotency import idempotent

logger = logging.getLogger(__name__)

activity_logs_bp = Blueprint('activity_logs', __name__)


@idempotent(methods=['POST'])
@activity_logs_bp.route('/activity-logs', methods=['POST'])
def create_activity_log():
    """Create a new activity log entry"""
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
        
        # Convert details to JSON string if it's a dict, otherwise use as string
        if isinstance(details, dict):
            details_str = json.dumps(details)
            logger.info(f"Converted dict to JSON string: {details_str}")
        elif details is not None:
            details_str = str(details)
            logger.info(f"Converted to string: {details_str}")
        else:
            details_str = "{}"
            logger.info("Using empty JSON object")
        
        logger.info(f"Details type: {type(details_str)}, value: {details_str}")
        
        if not action or not entity_type:
            return jsonify({
                'success': False, 
                'error': 'action and entity_type are required'
            }), 400
        
        # Create activity log entry
        activity_log = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details_str,  # Use the properly converted string
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


@activity_logs_bp.route('/activity-logs', methods=['GET'])
def get_activity_logs():
    """Get activity logs with optional filtering"""
    try:
        # Get query parameters
        entity_type = request.args.get('entity_type')
        entity_id = request.args.get('entity_id')
        user_id = request.args.get('user_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 100))
        offset = (page - 1) * limit
        
        # Build query
        query = ActivityLog.query.order_by(ActivityLog.created_at.desc())
        
        if entity_type:
            query = query.filter(ActivityLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(ActivityLog.entity_id == entity_id)
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)
        
        # Get total count
        total = query.count()
        
        # Apply limit and offset
        activity_logs = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [log.to_dict() for log in activity_logs],
            'count': total,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'totalPages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch activity logs: {str(e)}'
        }), 500