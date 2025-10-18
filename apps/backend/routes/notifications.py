from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.notification import Notification
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from datetime import datetime, timezone
import logging
from models.system import Settings
from uuid import uuid4

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications', methods=['POST'])
def create_notification():
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        notif = Notification.from_dict(data)
        if not notif.id:
            notif.id = f"notif_{now_utc().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        notif.user_id = notif.user_id or data.get('userId') or 'system'

        db.session.add(notif)
        db.session.commit()

        from app import log_activity
        log_activity(notif.user_id, 'create_notification', 'notification', notif.id, {'title': notif.title, 'type': notif.type}, request)

        resp = make_response(jsonify({"success": True, "data": notif.to_dict(), "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/notifications/{notif.id}"
        return resp

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create notification error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@notifications_bp.route('/notifications', methods=['GET'])
def list_notifications():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "user_id required"}), 400
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        pagination = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        notifications = [n.to_dict() for n in pagination.items]
        return jsonify({
            "success": True,
            "data": notifications,
            "meta": {
                "total": pagination.total,
                "page": page,
                "perPage": per_page,
                "totalPages": pagination.pages
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"List notifications error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@notifications_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(Notification, id_param='notification_id')
@with_transaction
def mark_notification_read(notification_id):
    try:
        n = db.session.get(Notification, notification_id)
        if not n:
            return jsonify({"success": False, "error": "Notification not found"}), 404
        n.read = True
        db.session.commit()
        return jsonify({"success": True, "data": n.to_dict(), "timestamp": datetime.now().isoformat()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mark notification read error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@notifications_bp.route('/notifications/stats', methods=['GET'])
def notification_stats():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "user_id required"}), 400
        total = Notification.query.filter_by(user_id=user_id).count()
        unread = Notification.query.filter_by(user_id=user_id, read=False).count()
        return jsonify({"success": True, "data": {"total": total, "unread": unread}, "timestamp": datetime.now().isoformat()}), 200
    except Exception as e:
        logger.error(f"Notification stats error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@notifications_bp.route('/notifications/<notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    try:
        n = db.session.get(Notification, notification_id)
        if not n:
            return jsonify({"success": False, "error": "Notification not found"}), 404
        db.session.delete(n)
        db.session.commit()
        return jsonify({"success": True, "message": "Notification deleted", "timestamp": datetime.now().isoformat()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete notification error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@notifications_bp.route('/notifications/settings', methods=['GET'])
def get_user_notification_settings():
    try:
        user_id = request.args.get('user_id') or request.json and request.json.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id required'}), 400

        
        settings_record = Settings.get_system_settings()
        user_settings = settings_record.get_setting(f'userNotifications.{user_id}', default=None)
        if user_settings is None:
            # return default notification pref from system settings
            default_notifications = settings_record.get_setting('notifications', {})
            return jsonify({'success': True, 'data': default_notifications}), 200

        return jsonify({'success': True, 'data': user_settings}), 200
    except Exception as e:
        logger.error(f"Get user notification settings error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/notifications/settings', methods=['PUT'])
@idempotent(methods=['PUT'])
def set_user_notification_settings():
    try:
        data = request.get_json() or {}
        user_id = data.get('userId')
        prefs = data.get('preferences') or data.get('settings')
        if not user_id or prefs is None:
            return jsonify({'success': False, 'error': 'userId and preferences required'}), 400

        
        settings_record = Settings.get_system_settings()
        settings = settings_record.settings_json
        user_map = settings.get('userNotifications', {})
        user_map[user_id] = prefs
        settings['userNotifications'] = user_map
        settings_record.settings_json = settings
        db.session.add(settings_record)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Preferences updated', 'data': prefs}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Set user notification settings error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
