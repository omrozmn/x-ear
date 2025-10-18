# Notification Model
from .base import db, BaseModel, gen_id, JSONMixin

class Notification(BaseModel, JSONMixin):
    __tablename__ = 'notifications'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("notif")
    
    # Target user
    user_id = db.Column(db.String(50), nullable=False)
    
    # Notification content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default='info')  # info, warning, error, success
    
    # Status and interaction
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    
    # Optional action
    action_url = db.Column(db.String(500))
    action_label = db.Column(db.String(100))
    
    # Priority and expiration
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    expires_at = db.Column(db.DateTime)
    
    # Additional data (JSON)
    extra_data = db.Column(db.Text)  # JSON for extra data

    @property
    def extra_data_json(self):
        return self.json_load(self.extra_data)
    
    @extra_data_json.setter
    def extra_data_json(self, value):
        self.extra_data = self.json_dump(value)

    def mark_as_read(self):
        """Mark notification as read"""
        from .base import now_utc
        self.is_read = True
        self.read_at = now_utc()

    def to_dict(self):
        base_dict = self.to_dict_base()
        notification_dict = {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.notification_type,
            'isRead': self.is_read,
            'readAt': self.read_at.isoformat() if self.read_at else None,
            'actionUrl': self.action_url,
            'actionLabel': self.action_label,
            'priority': self.priority,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'extraData': self.extra_data_json
        }
        notification_dict.update(base_dict)
        return notification_dict

    @staticmethod
    def create_notification(user_id, title, message, notification_type='info', **kwargs):
        """Factory method to create notifications"""
        notification = Notification()
        notification.user_id = user_id
        notification.title = title
        notification.message = message
        notification.notification_type = notification_type
        
        # Optional fields
        notification.action_url = kwargs.get('action_url')
        notification.action_label = kwargs.get('action_label')
        notification.priority = kwargs.get('priority', 'normal')
        notification.expires_at = kwargs.get('expires_at')
        notification.extra_data_json = kwargs.get('extra_data', {})
        
        return notification

    @staticmethod
    def from_dict(data: dict):
        """Create a Notification instance from a plain dict (tolerant to different key styles)."""
        n = Notification()
        # Support both camelCase and snake_case keys
        n.id = data.get('id') or data.get('notificationId') or n.id
        n.user_id = data.get('userId') or data.get('user_id') or data.get('user') or 'system'
        n.title = data.get('title') or data.get('subject') or ''
        n.message = data.get('message') or data.get('body') or ''
        # notification type mapping
        n.notification_type = data.get('type') or data.get('notification_type') or 'info'
        # optional action fields
        n.action_url = data.get('actionUrl') or data.get('action_url') or None
        n.action_label = data.get('actionLabel') or data.get('action_label') or None
        n.priority = data.get('priority') or data.get('level') or 'normal'
        # extras
        n.extra_data_json = data.get('extraData') or data.get('extra_data') or {}
        # read flags
        is_read = data.get('isRead') if 'isRead' in data else data.get('is_read') if 'is_read' in data else False
        n.is_read = bool(is_read)
        return n

    # Index suggestions
    __table_args__ = (
        db.Index('ix_notification_user', 'user_id'),
        db.Index('ix_notification_read', 'is_read'),
        db.Index('ix_notification_type', 'notification_type'),
        db.Index('ix_notification_priority', 'priority'),
    )