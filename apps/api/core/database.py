"""
Pure SQLAlchemy Database Configuration
No Flask dependency - works with FastAPI
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, event, literal, bindparam
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base, Session
from sqlalchemy.pool import QueuePool
from contextvars import ContextVar
from datetime import datetime, timezone
from uuid import uuid4
import json
import logging

logger = logging.getLogger(__name__)

# Database URL from environment
# Default to a persistent sqlite file under backend/instance/ to avoid accidental in-memory DB.
_default_sqlite_path = Path(__file__).resolve().parent.parent / "instance" / "xear_crm.db"
# Use plain path (spaces handled correctly by driver, encoding breaks it)
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
        echo=False
    )
else:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Scoped session for thread safety
ScopedSession = scoped_session(SessionLocal)


class RollbackSession(SessionLocal.class_):
    """
    Session that never commits, only flushes.
    Used for simulation mode to ensure no side effects.
    """
    def commit(self):
        # Only flush to ensure integrity checks run, but never commit to DB
        self.flush()
        
    def rollback(self):
        super().rollback()


# Base class for models
Base = declarative_base()

# Context variables for tenant isolation
_current_tenant_id: ContextVar[str | None] = ContextVar('tenant_id', default=None)
_skip_tenant_filter: ContextVar[bool] = ContextVar('skip_filter', default=False)

# Type alias for context token
from contextvars import Token
TenantContextToken = Token[str | None]
SkipFilterToken = Token[bool]


def get_current_tenant_id() -> str | None:
    """Get current tenant ID from context"""
    return _current_tenant_id.get()


def set_current_tenant_id(tenant_id: str | None):
    """
    Set current tenant ID in context.
    
    DEPRECATED: Use set_tenant_context() instead for proper token-based cleanup.
    This function is kept for backward compatibility but should not be used
    in new code.
    
    WARNING: Never use set_current_tenant_id(None) for cleanup!
    Always use reset_tenant_context(token) instead.
    """
    _current_tenant_id.set(tenant_id)


def set_tenant_context(tenant_id: str) -> TenantContextToken:
    """
    Set tenant context and return token for cleanup.
    
    This is the CORRECT way to set tenant context. The returned token
    MUST be used with reset_tenant_context() in a finally block.
    
    Usage:
        token = set_tenant_context(tenant_id)
        try:
            # ... do work ...
        finally:
            reset_tenant_context(token)
    
    Args:
        tenant_id: The tenant ID to set in context
        
    Returns:
        Token that MUST be passed to reset_tenant_context()
    
    CRITICAL: Never use set_current_tenant_id(None) for cleanup!
    """
    return _current_tenant_id.set(tenant_id)


def reset_tenant_context(token: TenantContextToken) -> None:
    """
    Reset tenant context using the token from set_tenant_context().
    
    This is the ONLY correct way to clean up tenant context.
    Using set_current_tenant_id(None) is FORBIDDEN because it can
    corrupt context in nested or concurrent scenarios.
    
    Args:
        token: The token returned by set_tenant_context()
    
    CRITICAL: Always call this in a finally block!
    """
    _current_tenant_id.reset(token)


class UnboundSession:
    """
    Context manager to bypass tenant filter.
    
    DEPRECATED: Use unbound_session(reason="...") instead.
    This class is kept for backward compatibility.
    """
    def __enter__(self):
        self.token = _skip_tenant_filter.set(True)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        _skip_tenant_filter.reset(self.token)


class unbound_session:
    """
    Context manager to bypass tenant filter with mandatory audit logging.
    
    All cross-tenant access MUST be audited. This context manager requires
    a 'reason' parameter that is logged for security audit purposes.
    
    Usage:
        with unbound_session(reason="admin-report-generation"):
            # Queries here bypass tenant filter
            all_parties = db.query(Party).all()
    
    Args:
        reason: Mandatory reason for bypassing tenant filter (for audit)
    
    Raises:
        UnboundSessionAuditError: If reason is not provided
    """
    
    def __init__(self, reason: str):
        if not reason or not reason.strip():
            from utils.exceptions import UnboundSessionAuditError
            raise UnboundSessionAuditError()
        self.reason = reason
        self.token: SkipFilterToken | None = None
    
    def __enter__(self):
        logger.info(f"🔓 Entering unbound session: {self.reason}")
        self.token = _skip_tenant_filter.set(True)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.token is not None:
            _skip_tenant_filter.reset(self.token)
        if exc_type:
            logger.warning(f"🔒 Exiting unbound session with error: {self.reason} - {exc_type.__name__}")
        else:
            logger.info(f"🔒 Exiting unbound session: {self.reason}")


class simulate_rollback:
    """
    Context manager for simulation mode.
    
    Wraps execution in a transaction that is ALWAYS rolled back.
    Patches SessionLocal to use RollbackSession.
    
    Usage:
        with simulate_rollback():
             # Do work...
             # All SessionLocal() calls return a session bound to the transaction
             # commit() calls are intercepted (flush only)
    """
    
    def __init__(self):
        self.connection = None
        self.transaction = None
        self.session = None
        self.original_session_factory = None
        
    def __enter__(self):
        # 1. Acquire connection
        self.connection = engine.connect()
        
        # 2. Begin transaction
        self.transaction = self.connection.begin()
        
        # 3. Create session bound to this connection
        # Use RollbackSession to prevent explicit commits
        self.session = RollbackSession(bind=self.connection)
        
        # 4. Patch SessionLocal to return our session
        self.original_session_factory = SessionLocal
        
        # We need to make sure SessionLocal() returns our session
        # or a new session bound to our connection.
        # Since SessionLocal is a class/factory, we need to be careful.
        # Ideally, we want all code using SessionLocal() to get a session 
        # that participates in this transaction.
        
        # Strategy: Use sessionmaker.configure to update the factory in-place
        # But configure() treats 'class_' as a keyword arg for __init__, so we must set it directly.
        
        # 1. Update bind
        SessionLocal.configure(bind=self.connection)
        
        # 2. Update class directly (hack support)
        self.original_class = SessionLocal.class_
        SessionLocal.class_ = RollbackSession
        
        logger.info("🎬 Entering simulation rollback mode")
        return self.session
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # 1. Rollback transaction
        if self.transaction:
            self.transaction.rollback()
            
        # 2. Close connection
        if self.connection:
            self.connection.close()
            
        # 3. Restore SessionLocal
        # Restore to default configuration
        SessionLocal.configure(bind=engine)
        if self.original_class:
            SessionLocal.class_ = self.original_class
        
        logger.info("🎬 Exiting simulation rollback mode (Rolled back)")



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
    from datetime import datetime, timezone
    from sqlalchemy import func

    now = datetime.now(timezone.utc)
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
from config.tenant_config import get_tenant_strict_mode, TenantBehavior

@event.listens_for(Session, 'do_orm_execute')
def receive_do_orm_execute(execute_state):
    """
    Automatically apply tenant filter to all SELECT queries on TenantScopedMixin models.
    """
    if should_skip_tenant_filter() or not execute_state.is_select:
        return

    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return

    from core.models.mixins import TenantScopedMixin
    
    # Apply filter targeting TenantScopedMixin
    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            TenantScopedMixin, 
            lambda cls: cls.tenant_id == tenant_id,
            include_aliases=True
        )
    )
