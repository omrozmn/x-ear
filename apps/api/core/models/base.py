# Base Model and Common Utilities - Pure SQLAlchemy (No Flask)
from datetime import datetime, timezone
from uuid import uuid4
import json
from sqlalchemy import Column, DateTime, event, String
from sqlalchemy.orm import declarative_base, Query as BaseQuery
from sqlalchemy.types import TypeDecorator

# Import from centralized database module
from database import (
    engine, SessionLocal, ScopedSession,
    get_current_tenant_id, set_current_tenant_id,
    should_skip_tenant_filter, UnboundSession,
    now_utc, gen_id, format_datetime_utc,
    json_dump, json_load
)

# Re-export Base from database module for backward compatibility
from database import Base

# Context var for skip filter (backward compatibility alias)
from database import _skip_tenant_filter as _skip_filter


class LowercaseEnum(TypeDecorator):
    """Custom type that stores enum values as lowercase strings.
    
    This ensures DB compatibility with existing lowercase values
    while maintaining Python enum type safety.
    """
    impl = String(20)
    cache_ok = True
    
    def __init__(self, enum_class, *args, **kwargs):
        self.enum_class = enum_class
        super().__init__(*args, **kwargs)
    
    def process_bind_param(self, value, dialect):
        """Convert enum to lowercase string for DB storage"""
        if value is None:
            return None
        if hasattr(value, 'value'):
            return value.value.lower()
        return str(value).lower()
    
    def process_result_value(self, value, dialect):
        """Convert DB string to enum"""
        if value is None:
            return None
        value_lower = value.lower()
        for member in self.enum_class:
            if member.value == value_lower:
                return member
        # Fallback: return first enum member
        return list(self.enum_class)[0]


def gen_sale_id(tenant_id=None):
    """Generate sale ID in format YYMMDDKKNN (e.g., 2510040101)
    
    Note: Sale IDs are globally unique across all tenants to comply with
    database UNIQUE constraint. The tenant_id parameter is kept for backward
    compatibility but not used in ID generation.
    """
    from datetime import datetime, timezone
    from sqlalchemy import func
    now = datetime.now(timezone.utc)
    yy = str(now.year)[-2:]
    mm = f"{now.month:02d}"
    dd = f"{now.day:02d}"
    kk = "01"  # Category for hearing aid sales
    
    today_prefix = f"{yy}{mm}{dd}{kk}"
    nn = "01"
    
    try:
        from models.sales import Sale
        # Use a fresh session for the query
        with SessionLocal() as session:
            max_id = (
                session.query(func.max(Sale.id))
                .filter(Sale.id.like(f"{today_prefix}%"))
                .scalar()
            )
            if max_id:
                last_seq = int(str(max_id)[-2:])
                nn = f"{last_seq + 1:02d}"
    except Exception:
        nn = "01"
    
    return f"{today_prefix}{nn}"


# Custom Query class for automatic tenant filtering
class TenantQuery(BaseQuery):
    """Custom Query that auto-applies tenant filter.
    
    Important: This class auto-applies tenant filtering when terminal methods
    (all, first, one, iter) are called. The filter is applied lazily to avoid
    issues with SQLAlchemy's limit/offset constraints.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._tenant_filter_applied = False
    
    def _has_tenant_filter(self):
        """Check if tenant filter is already applied in the query's whereclause"""
        try:
            if self.whereclause is not None:
                whereclause_str = str(self.whereclause)
                if 'tenant_id' in whereclause_str:
                    return True
        except Exception:
            pass
        return False
    
    def _apply_tenant_filter(self):
        """Apply tenant filter if not already applied."""
        if self._tenant_filter_applied:
            return self
        
        # Skip if in UnboundSession context
        if should_skip_tenant_filter():
            self._tenant_filter_applied = True
            return self
        
        # Skip if tenant filter already exists in the query
        if self._has_tenant_filter():
            self._tenant_filter_applied = True
            return self
        
        # Check if limit/offset already applied
        try:
            has_limit = getattr(self, '_limit', None) is not None or getattr(self, '_limit_clause', None) is not None
            has_offset = getattr(self, '_offset', None) is not None or getattr(self, '_offset_clause', None) is not None
            if has_limit or has_offset:
                self._tenant_filter_applied = True
                return self
        except Exception:
            pass
        
        # Get tenant and apply filter
        tenant_id = get_current_tenant_id()
        if tenant_id and len(self.column_descriptions) > 0:
            entity = self.column_descriptions[0]['entity']
            if entity and hasattr(entity, 'tenant_id'):
                self._tenant_filter_applied = True
                return self.filter(entity.tenant_id == tenant_id)
        
        self._tenant_filter_applied = True
        return self
    
    def all(self):
        q = self._apply_tenant_filter()
        return BaseQuery.all(q)
    
    def first(self):
        q = self._apply_tenant_filter()
        return BaseQuery.first(q)
    
    def one(self):
        q = self._apply_tenant_filter()
        return BaseQuery.one(q)
    
    def one_or_none(self):
        q = self._apply_tenant_filter()
        return BaseQuery.one_or_none(q)
    
    def count(self):
        q = self._apply_tenant_filter()
        return BaseQuery.count(q)
    
    def __iter__(self):
        q = self._apply_tenant_filter()
        return BaseQuery.__iter__(q)


class JSONMixin:
    """Mixin for handling JSON fields safely"""
    
    @staticmethod
    def json_dump(value):
        return json_dump(value)
    
    @staticmethod
    def json_load(raw):
        return json_load(raw)


class BaseModel(Base):
    """Base model mixin with common fields and methods.
    
    Usage: class MyModel(Base, BaseModel): ...
    """
    __abstract__ = True
    
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    
    @staticmethod
    def _format_datetime_utc(dt):
        return format_datetime_utc(dt)
    
    def to_dict_base(self):
        """Base to_dict implementation with common fields"""
        return {
            'createdAt': self._format_datetime_utc(self.created_at),
            'updatedAt': self._format_datetime_utc(self.updated_at)
        }


# Backward compatibility: create a db-like object for legacy code
class _DBCompat:
    """Compatibility layer for code that uses db.session, db.Column, etc."""
    
    def __init__(self):
        from sqlalchemy import (
            Column, Integer, String, Boolean, Float, Text, DateTime, 
            ForeignKey, JSON, Enum, Index, UniqueConstraint,
            CheckConstraint, PrimaryKeyConstraint, Date, Time, Numeric,
            LargeBinary, Interval, BigInteger, SmallInteger
        )
        from sqlalchemy import Table as _Table
        from sqlalchemy.orm import relationship, backref
        
        self.Column = Column
        self.Integer = Integer
        self.BigInteger = BigInteger
        self.SmallInteger = SmallInteger
        self.String = String
        self.Boolean = Boolean
        self.Float = Float
        self.Numeric = Numeric
        self.Text = Text
        self.DateTime = DateTime
        self.Date = Date
        self.Time = Time
        self.Interval = Interval
        self.LargeBinary = LargeBinary
        self.ForeignKey = ForeignKey
        self.JSON = JSON
        self.Enum = Enum
        self.Index = Index
        self.UniqueConstraint = UniqueConstraint
        self.CheckConstraint = CheckConstraint
        self.PrimaryKeyConstraint = PrimaryKeyConstraint
        self.relationship = relationship
        self.backref = backref
        self.Model = Base
        self._Table = _Table
        self.metadata = Base.metadata
    
    def Table(self, name, *args, **kwargs):
        """Create a Table bound to Base.metadata"""
        return self._Table(name, self.metadata, *args, **kwargs)
    
    @property
    def session(self):
        return ScopedSession()
    
    def create_all(self):
        Base.metadata.create_all(bind=engine)
    
    def drop_all(self):
        Base.metadata.drop_all(bind=engine)


# Create compatibility object
db = _DBCompat()
