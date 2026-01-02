# Base Model and Common Utilities
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from uuid import uuid4
import json
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

def gen_id(prefix):
    """Generate unique ID with prefix"""
    return f"{prefix}_{uuid4().hex[:8]}"

def gen_sale_id(tenant_id=None):
    """Generate sale ID in format YYMMDDKKNN (e.g., 2510040101)
    
    Note: Sale IDs are globally unique across all tenants to comply with
    database UNIQUE constraint. The tenant_id parameter is kept for backward
    compatibility but not used in ID generation.
    """
    from datetime import datetime
    from sqlalchemy import func
    now = datetime.now()
    # YYMMDDKKNN format: YY=year, MM=month, DD=day, KK=category (01 for hearing aid), NN=sequence
    yy = str(now.year)[-2:]  # Last 2 digits of year
    mm = f"{now.month:02d}"
    dd = f"{now.day:02d}"
    kk = "01"  # Category for hearing aid sales
    
    # For sequence number, get the highest existing ID for today across ALL tenants
    # (IDs must be globally unique due to database constraint)
    try:
        from .sales import Sale
        # Get highest sale ID created today with same YYMMDD prefix
        today_prefix = f"{yy}{mm}{dd}{kk}"
        max_id = Sale.query.filter(Sale.id.like(f"{today_prefix}%")).with_entities(func.max(Sale.id)).scalar()
        
        if max_id:
            # Extract sequence number from max_id and increment
            last_seq = int(max_id[-2:])
            nn = f"{last_seq + 1:02d}"
        else:
            # First sale of the day
            nn = "01"
    except:
        # Fallback if database query fails
        nn = "01"
    
    return f"{yy}{mm}{dd}{kk}{nn}"

# Initialize SQLAlchemy instance
db = SQLAlchemy()

# Patch db.session.get to use tenant-aware logic
_original_get = db.session.__class__.get

def _tenant_aware_get(self, entity, ident, **kwargs):
    """Tenant-aware session.get() replacement"""
    from utils.tenant_security import get_current_tenant_id, _skip_filter
    from sqlalchemy import inspect as sqla_inspect
    
    # Skip filter if in UnboundSession context
    if _skip_filter.get():
        return _original_get(self, entity, ident, **kwargs)
    
    # Get the object using original method
    obj = _original_get(self, entity, ident, **kwargs)
    
    # Check tenant if object exists and has tenant_id
    if obj is not None:
        try:
            # Use inspector to check if entity has tenant_id column
            mapper = sqla_inspect(entity)
            if 'tenant_id' in [c.key for c in mapper.columns]:
                tenant_id = get_current_tenant_id()
                if tenant_id is not None:
                    obj_tenant = getattr(obj, 'tenant_id', None)
                    if obj_tenant != tenant_id:
                        # Tenant mismatch - return None
                        return None
        except Exception:
            # If inspection fails, return object as-is
            pass
    
    return obj

# Apply patch
db.session.__class__.get = _tenant_aware_get

# Patch db.session.query to auto-apply tenant filter
_original_query = db.session.__class__.query

def _tenant_aware_query(self, *entities, **kwargs):
    """Tenant-aware session.query() replacement"""
    from utils.tenant_security import get_current_tenant_id, _skip_filter
    
    # Create query using original method
    q = _original_query(self, *entities, **kwargs)
    
    # Skip filter if in UnboundSession context
    if _skip_filter.get():
        return q
    
    # Get current tenant
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return q
    
    # Apply filter for each entity that has tenant_id
    for entity in entities:
        # Check if this is a mapped class (has __tablename__)
        if hasattr(entity, '__tablename__') and hasattr(entity, 'tenant_id'):
            q = q.filter(entity.tenant_id == tenant_id)
    
    return q

# Apply query patch
db.session.__class__.query = _tenant_aware_query


# Custom Query class for automatic tenant filtering
from sqlalchemy.orm import Query as BaseQuery

class TenantQuery(BaseQuery):
    """Custom Query that auto-applies tenant filter.
    
    Important: This class auto-applies tenant filtering when terminal methods
    (all, first, one, iter) are called. The filter is applied lazily to avoid
    issues with SQLAlchemy's limit/offset constraints.
    
    Note: Routes that already manually filter by tenant_id (e.g., filter_by(tenant_id=...))
    will have that filter applied; the auto-filter will detect this and skip duplicate filtering.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._tenant_filter_applied = False
    
    def _has_tenant_filter(self):
        """Check if tenant filter is already applied in the query's whereclause"""
        try:
            if self.whereclause is not None:
                # Check if tenant_id is mentioned in the where clause
                whereclause_str = str(self.whereclause)
                if 'tenant_id' in whereclause_str:
                    return True
        except Exception:
            pass
        return False
    
    def _apply_tenant_filter(self):
        """Apply tenant filter if not already applied.
        
        This method checks multiple conditions before applying:
        1. If filter was already applied by this mechanism
        2. If tenant filter exists in whereclause (manual filter_by)
        3. If query already has limit/offset (cannot add filter after)
        """
        if self._tenant_filter_applied:
            return self
        
        from utils.tenant_security import get_current_tenant_id, _skip_filter
        
        # Skip if in UnboundSession context
        if _skip_filter.get():
            self._tenant_filter_applied = True
            return self
        
        # Skip if tenant filter already exists in the query
        if self._has_tenant_filter():
            self._tenant_filter_applied = True
            return self
        
        # Check if limit/offset already applied - cannot filter after
        # In SQLAlchemy 2.x, filtering after limit raises an error
        try:
            # Access _limit and _offset attributes to check
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
        """Override all() to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.all(q)
    
    def first(self):
        """Override first() to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.first(q)
    
    def one(self):
        """Override one() to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.one(q)
    
    def one_or_none(self):
        """Override one_or_none() to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.one_or_none(q)
    
    def count(self):
        """Override count() to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.count(q)
    
    def get_or_404(self, ident, description=None):
        """Override get_or_404 to apply tenant filter.
        
        Args:
            ident: The identifier to fetch
            description: Optional custom error message
            
        Returns:
            The entity if found and belongs to tenant
            
        Raises:
            404 if not found or mismatch
        """
        # We need to manually handle this because session.get() patch handles 
        # the singleton fetch, but get_or_404 on a query usually calls 
        # session.get or similar but we want to ensure tenant filter is applied.
        
        # apply_tenant_filter returns a query object if filtering is possible
        q = self._apply_tenant_filter()
        
        # Use simple filter if it's a query, or session.get if it's raw
        # Actually, for get_or_404(ident), we can just do:
        entity = self.column_descriptions[0]['entity']
        obj = q.filter(entity.id == ident).first()
        
        if obj is None:
            from flask import abort
            abort(404, description=description)
        return obj

    def paginate(self, page=1, per_page=20, error_out=True, max_per_page=None):
        """Manual paginate implementation for TenantQuery.
        
        Flask-SQLAlchemy's paginate doesn't work with custom Query classes,
        so we implement pagination manually.
        
        Args:
            page: Current page number (1-indexed)
            per_page: Number of items per page
            error_out: Whether to raise 404 on empty page
            max_per_page: Maximum items per page (optional)
        
        Returns:
            A Pagination-like object with items, total, pages, etc.
        """
        if max_per_page is not None:
            per_page = min(per_page, max_per_page)
        
        if page < 1:
            if error_out:
                from flask import abort
                abort(404)
            page = 1
        
        if per_page < 1:
            if error_out:
                from flask import abort
                abort(404)
            per_page = 20
        
        # Apply tenant filter before counting/fetching
        q = self._apply_tenant_filter()
        
        # Get total count
        total = BaseQuery.count(q)
        
        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1
        
        if error_out and page > total_pages and total > 0:
            from flask import abort
            abort(404)
        
        # Get items for current page
        offset = (page - 1) * per_page
        items = BaseQuery.limit(q, per_page).offset(offset).all()
        
        # Return a pagination-like object
        class Pagination:
            def __init__(self, items, total, page, per_page, total_pages):
                self.items = items
                self.total = total
                self.page = page
                self.per_page = per_page
                self.pages = total_pages
                self.has_prev = page > 1
                self.has_next = page < total_pages
                self.prev_num = page - 1 if self.has_prev else None
                self.next_num = page + 1 if self.has_next else None
            
            def iter_pages(self, left_edge=2, left_current=2, right_current=5, right_edge=2):
                """Iterate over page numbers for pagination display."""
                last = 0
                for num in range(1, self.pages + 1):
                    if (num <= left_edge or 
                        (num > self.page - left_current - 1 and num < self.page + right_current) or
                        num > self.pages - right_edge):
                        if last + 1 != num:
                            yield None
                        yield num
                        last = num
        
        return Pagination(items, total, page, per_page, total_pages)
    
    def __iter__(self):
        """Override iteration to apply tenant filter"""
        q = self._apply_tenant_filter()
        return BaseQuery.__iter__(q)


class BaseModel(db.Model):
    """Base model with common fields and methods"""
    __abstract__ = True
    
    # Use custom query class for automatic tenant filtering
    query_class = TenantQuery
    
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)
    
    @staticmethod
    def _format_datetime_utc(dt):
        """Format datetime as ISO-8601 with UTC timezone suffix.
        
        Ensures consistent timezone handling across frontend/backend.
        Stored as UTC, returned with +00:00 suffix so JS can convert to local time.
        """
        if dt is None:
            return None
        # If datetime has no timezone info, assume UTC and add it
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    
    def to_dict_base(self):
        """Base to_dict implementation with common fields"""
        return {
            'createdAt': self._format_datetime_utc(self.created_at),
            'updatedAt': self._format_datetime_utc(self.updated_at)
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