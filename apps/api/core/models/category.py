"""
Category Model
Simple table to store inventory categories
"""
from sqlalchemy import Column, DateTime, Integer, String
from core.models.base import Base
from datetime import datetime, timezone

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

class Category(Base):
    __tablename__ = 'categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
