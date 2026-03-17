"""
Pure SQLAlchemy Database Configuration
No Flask dependency - works with FastAPI
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base, Session
from contextvars import ContextVar
from typing import Optional
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
print(f"DEBUG: DATABASE_URL loaded in core.database: {DATABASE_URL}")

# Ensure instance directory exists for file-based sqlite
try:
    _default_sqlite_path.parent.mkdir(parents=True, exist_ok=True)
except Exception:
    # Best-effort; if this fails, sqlite will error on connect and readiness will report it.
    pass

# Handle SQLite for development
if DATABASE_URL.startswith('sqlite'):
    _engine_kwargs = dict(
        connect_args={"check_same_thread": False},
        echo=False,
    )
    # In-memory SQLite needs StaticPool so that all connections share the
    # same database; otherwise each connection gets its own empty DB.
    if ":memory:" in DATABASE_URL:
        _engine_kwargs["poolclass"] = StaticPool
    engine = create_engine(DATABASE_URL, **_engine_kwargs)
else:
    # PostgreSQL with increased connection pool for testing
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=20,  # Increased from default 5 to 20
        max_overflow=40,  # Increased from default 10 to 40
        pool_recycle=3600  # Recycle connections after 1 hour
    )

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
_current_tenant_id: ContextVar[Optional[str]] = ContextVar('tenant_id', default=None)
_skip_tenant_filter: ContextVar[bool] = ContextVar('skip_filter', default=False)

# Type alias for context token
from contextvars import Token
TenantContextToken = Token[Optional[str]]
SkipFilterToken = Token[bool]


def get_current_tenant_id() -> Optional[str]:
    """
    Get current tenant ID from context.
    
    Tries ContextVar first (fastest), but ContextVar doesn't propagate
    across async contexts in FastAPI, so this often returns None.
    
    For proper tenant isolation in FastAPI, use request.state.tenant_id
    which is set by unified_access middleware.
    """
    return _current_tenant_id.get()


def set_current_tenant_id(tenant_id: Optional[str]):
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


def format_datetime_utc(dt: Optional[datetime]) -> Optional[str]:
    """Format datetime as ISO-8601 with UTC timezone"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# Dependency for FastAPI
def get_db():
    """
    FastAPI dependency for database session.
    
    CRITICAL: Tries multiple sources for tenant_id:
    1. ContextVar (fastest, but may not propagate across async contexts)
    2. Thread-local storage (fallback for async context issues)
    
    The tenant_id is set by access_dependency() in unified_access.py.
    """
    from middleware.unified_access import _thread_local
    
    db = SessionLocal()
    try:
        # PRIORITY 1: Try ContextVar first (fastest)
        tenant_id = get_current_tenant_id()
        
        # PRIORITY 2: Fallback to thread-local if ContextVar is None
        if not tenant_id and hasattr(_thread_local, 'tenant_id'):
            tenant_id = _thread_local.tenant_id
            logger.info(f"🔑 [GET_DB] Using tenant_id from thread-local: {tenant_id}")
        
        # Set in session.info for SQLAlchemy event listener
        if tenant_id:
            db.info['tenant_id'] = tenant_id
            logger.info(f"🔑 [GET_DB] Set session.info['tenant_id']: {tenant_id}")
        else:
            logger.debug("⚠️ [GET_DB] No tenant_id available from any source")
        
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_with_context(access: "UnifiedAccess" = None):
    """
    FastAPI dependency for database session with guaranteed tenant context.
    
    This dependency explicitly depends on UnifiedAccess, ensuring it's
    called AFTER access_dependency() has set the tenant context.
    
    Usage:
        from middleware.unified_access import UnifiedAccess, require_access
        from core.database import get_db_with_context
        
        @router.get("/parties")
        def list_parties(
            access: UnifiedAccess = Depends(require_access("parties.view")),
            db: Session = Depends(get_db_with_context)
        ):
            # db queries will be automatically filtered by tenant_id
            parties = db.query(Party).all()
    
    Args:
        access: UnifiedAccess object from require_access() dependency
    
    Yields:
        Database session with tenant_id set in session.info
    """
    db = SessionLocal()
    try:
        # CRITICAL: Set tenant_id in session.info for SQLAlchemy event listener
        if access and access.tenant_id:
            db.info['tenant_id'] = access.tenant_id
            logger.info(f"🔑 [GET_DB_WITH_CONTEXT] Set session.info['tenant_id'] = {access.tenant_id}")
        else:
            # Also try ContextVar as fallback
            tenant_id = get_current_tenant_id()
            if tenant_id:
                db.info['tenant_id'] = tenant_id
                logger.info(f"🔑 [GET_DB_WITH_CONTEXT] Set session.info['tenant_id'] from ContextVar: {tenant_id}")
            else:
                logger.warning("⚠️ [GET_DB_WITH_CONTEXT] No tenant_id available")
        
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Initialize database tables
def init_db():
    """Create all tables - imports all models first to register them with Base"""
    import core.models  # noqa: F401 - ensures all models are in Base.metadata
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

@event.listens_for(Session, 'do_orm_execute')
def receive_do_orm_execute(execute_state):
    """
    Automatically apply tenant filter to all SELECT queries on TenantScopedMixin models.
    
    CRITICAL: In FastAPI, ContextVar doesn't propagate across async contexts,
    so we prioritize session.info['tenant_id'] which is set by get_db() dependency.
    """
    if should_skip_tenant_filter() or not execute_state.is_select:
        return

    # PRIORITY 1: Get tenant_id from session.info (set by get_db() dependency)
    tenant_id = None
    if hasattr(execute_state.session, 'info'):
        tenant_id = execute_state.session.info.get('tenant_id')
        if tenant_id:
            logger.debug(f"🔍 [TENANT FILTER] Using tenant_id from session.info: {tenant_id}")
    
    # PRIORITY 2: Fallback to ContextVar (for same-context access)
    if not tenant_id:
        tenant_id = get_current_tenant_id()
        if tenant_id:
            logger.debug(f"🔍 [TENANT FILTER] Using tenant_id from ContextVar: {tenant_id}")
    
    # DEBUG: Log tenant filter application
    if not tenant_id:
        logger.warning("⚠️ [TENANT FILTER] No tenant_id in context for SELECT query!")
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
