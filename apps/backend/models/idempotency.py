from datetime import datetime
import json
from uuid import uuid4

from .base import db, now_utc


def _gen_id():
    return uuid4().hex


class IdempotencyKey(db.Model):
    __tablename__ = 'idempotency_keys'

    id = db.Column(db.String(36), primary_key=True, default=_gen_id)
    idempotency_key = db.Column(db.String(128), nullable=False)
    endpoint = db.Column(db.String(256), nullable=False)
    user_id = db.Column(db.String(128), nullable=True)

    processing = db.Column(db.Boolean, nullable=False, default=False)
    status_code = db.Column(db.Integer, nullable=True)
    response_json = db.Column(db.Text, nullable=True)
    headers_json = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=now_utc, nullable=False)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('idempotency_key', 'endpoint', 'user_id', name='uix_idempotency_key_endpoint_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'idempotency_key': self.idempotency_key,
            'endpoint': self.endpoint,
            'user_id': self.user_id,
            'processing': self.processing,
            'status_code': self.status_code,
            'response': json.loads(self.response_json) if self.response_json else None,
            'headers': json.loads(self.headers_json) if self.headers_json else None,
            'created_at': (self.created_at.isoformat() if self.created_at else None),
            'updated_at': (self.updated_at.isoformat() if self.updated_at else None)
        }
