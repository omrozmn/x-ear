"""
Pure SQLAlchemy Database Configuration
No Flask dependency - works with FastAPI
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, event, literal, bindparam
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from sqlalchemy.pool import StaticPool
from contextvars import ContextVar
from datetime import datetime, timezone
from uuid import uuid4
import json
import logging

logger = logging.getLogger(__name__)

# Database URL from environment
# Default to a persistent sqlite file under backend/instance/ to avoid accidental in-memory DB.
_default_sqlite_path = Path(__file__).resolve().parent / "instance" / "xear_crm.db"
DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{_default_sqlite_path.as_posix()}")

# Ensure instance directory exists for file-based sqlite
try:
    _default_sqlite_path.parent.mkdir(parents=True, exist_ok=True)
except Exception:
    # Best-effort; if this fails, sqlite will error on connect and readiness will report it.
    pass

# Handle SQLite for development
if DATABASE_URL.startswith('sqlite'):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
else:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Scoped session for thread safety
ScopedSession = scoped_session(SessionLocal)

# Base class for models
Base = declarative_base()

# Context variables for tenant isolation
_current_tenant_id: ContextVar[str | None] = ContextVar('tenant_id', default=None)
_skip_tenant_filter: ContextVar[bool] = ContextVar('skip_filter', default=False)


def get_current_tenant_id() -> str | None:
    """Get current tenant ID from context"""
    return _current_tenant_id.get()


def set_current_tenant_id(tenant_id: str | None):
    """Set current tenant ID in context"""
    _current_tenant_id.set(tenant_id)


class UnboundSession:
    """Context manager to bypass tenant filter"""
    def __enter__(self):
        self.token = _skip_tenant_filter.set(True)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        _skip_tenant_filter.reset(self.token)


def should_skip_tenant_filter() -> bool:
    """Check if tenant filter should be skipped"""
    return _skip_tenant_filter.get()


# Utility functions
def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)


def gen_id(prefix: str) -> str:
    """Generate unique ID with prefix"""
    return f"{prefix}_{uuid4().hex[:8]}"


def gen_sale_id(db_session=None) -> str:
    """Generate sale ID in format YYMMDDKKNN (e.g., 2510040101).

    This is a Flask-free replacement for legacy `models.base.gen_sale_id`.
    IDs are globally unique across all tenants.

    If `db_session` is provided, it is used to find the max sale id for today
    to keep the sequence stable; otherwise it falls back to NN="01".
    """
    from datetime import datetime
    from sqlalchemy import func

    now = datetime.now()
    yy = str(now.year)[-2:]
    mm = f"{now.month:02d}"
    dd = f"{now.day:02d}"
    kk = "01"  # Category for hearing aid sales

    today_prefix = f"{yy}{mm}{dd}{kk}"

    nn = "01"
    if db_session is not None:
        try:
            from models.sales import Sale
            max_id = (
                db_session.query(func.max(Sale.id))
                .filter(Sale.id.like(f"{today_prefix}%"))
                .scalar()
            )
            if max_id:
                last_seq = int(str(max_id)[-2:])
                nn = f"{last_seq + 1:02d}"
        except Exception:
            nn = "01"

    return f"{today_prefix}{nn}"


def format_datetime_utc(dt: datetime | None) -> str | None:
    """Format datetime as ISO-8601 with UTC timezone"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# Dependency for FastAPI
def get_db():
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Initialize database tables
def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


# JSON utilities
def json_dump(value) -> str:
    """Safely serialize value to JSON string"""
    return json.dumps(value or {})


def json_load(raw) -> dict:
    """Safely deserialize JSON string"""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}

# Tenant Isolation Logic
from sqlalchemy.orm import with_loader_criteria

@event.listens_for(SessionLocal, 'do_orm_execute')
def receive_do_orm_execute(execute_state):
    """
    Automatically apply tenant filter to all SELECT queries.
    Pass 'skip_filter' context var to bypass.
    """
    if should_skip_tenant_filter():
        print("DEBUG: filter skipped")
        return

    # Only apply to SELECT
    if not execute_state.is_select:
        return

    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return
        
    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            # Apply to all models inheriting from Base
            Base, 
            lambda cls, t_id=tenant_id: cls.tenant_id == t_id if hasattr(cls, 'tenant_id') else None,
            include_aliases=True
        )
    )
