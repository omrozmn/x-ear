# Base Model and Common Utilities
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from uuid import uuid4
import json

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

def gen_id(prefix):
    """Generate unique ID with prefix"""
    return f"{prefix}_{uuid4().hex[:8]}"

def gen_sale_id():
    """Generate sale ID in format YYMMDDKKNN (e.g., 2510040101)"""
    from datetime import datetime
    now = datetime.now()
    # YYMMDDKKNN format: YY=year, MM=month, DD=day, KK=category (01 for hearing aid), NN=sequence
    yy = str(now.year)[-2:]  # Last 2 digits of year
    mm = f"{now.month:02d}"
    dd = f"{now.day:02d}"
    kk = "01"  # Category for hearing aid sales
    
    # For sequence number, we need to count existing sales for today
    # This is a simple implementation - in production you'd want better sequence handling
    try:
        from .sales import Sale
        # Count sales created today with same YYMMDD prefix
        today_prefix = f"{yy}{mm}{dd}{kk}"
        today_sales = Sale.query.filter(Sale.id.like(f"{today_prefix}%")).count()
        nn = f"{today_sales + 1:02d}"  # Next sequence number
    except:
        # Fallback if database query fails
        nn = "01"
    
    return f"{yy}{mm}{dd}{kk}{nn}"

# Initialize SQLAlchemy instance
db = SQLAlchemy()

class BaseModel(db.Model):
    """Base model with common fields and methods"""
    __abstract__ = True
    
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)
    
    def to_dict_base(self):
        """Base to_dict implementation with common fields"""
        return {
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class JSONMixin:
    """Mixin for handling JSON fields safely"""
    
    @staticmethod
    def json_dump(value):
        """Safely serialize value to JSON string"""
        return json.dumps(value or {})
    
    @staticmethod
    def json_load(raw):
        """Safely deserialize JSON string to value.

        Returns empty dict on invalid JSON or falsy input.
        """
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {}
    
    def create_json_property(self, field_name):
        """Create a property for JSON field access"""
        def getter(self):
            raw_value = getattr(self, field_name)
            return self.json_load(raw_value)
        
        def setter(self, value):
            setattr(self, field_name, self.json_dump(value))
        
        return property(getter, setter)