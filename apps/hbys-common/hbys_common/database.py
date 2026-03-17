"""
Database setup for HBYS microservices.
Each microservice gets its own DB connection with tenant isolation support.
"""
import os
from contextvars import ContextVar
from datetime import datetime, timezone
from sqlalchemy import create_engine, event, Column, String, DateTime
from sqlalchemy.orm import sessionmaker, Session, declared_attr, DeclarativeBase
from contextlib import contextmanager
import uuid
import json


# Context variables for multi-tenancy
_current_tenant_id: ContextVar[str | None] = ContextVar("current_tenant_id", default=None)
_skip_tenant_filter: ContextVar[bool] = ContextVar("skip_tenant_filter", default=False)


def get_current_tenant_id() -> str | None:
    return _current_tenant_id.get()


def set_current_tenant_id(tenant_id: str | None):
    _current_tenant_id.set(tenant_id)


def should_skip_tenant_filter() -> bool:
    return _skip_tenant_filter.get()


def now_utc():
    return datetime.now(timezone.utc)


def gen_id(prefix: str = "") -> str:
    """Generate a prefixed UUID-based ID."""
    short_uuid = uuid.uuid4().hex[:24]
    if prefix:
        return f"{prefix}_{short_uuid}"
    return short_uuid


def format_datetime_utc(dt) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def json_dump(value) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, default=str)


def json_load(raw) -> dict | list | None:
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    return json.loads(raw)


class Base(DeclarativeBase):
    pass


class BaseModel(Base):
    """Base model with created_at/updated_at timestamps."""
    __abstract__ = True

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)

    @staticmethod
    def _format_datetime_utc(dt):
        return format_datetime_utc(dt)


class TenantScopedMixin:
    """Mixin for models requiring tenant isolation."""

    @declared_attr
    def tenant_id(cls):
        return Column(String(36), nullable=False, index=True)


class JSONMixin:
    """Mixin for handling JSON fields safely."""

    @staticmethod
    def json_dump(value):
        return json_dump(value)

    @staticmethod
    def json_load(raw):
        return json_load(raw)


def create_db_engine(service_name: str):
    """Create a database engine for a microservice."""
    db_url = os.getenv(
        f"HBYS_{service_name.upper()}_DATABASE_URL",
        os.getenv("HBYS_DATABASE_URL", "sqlite:///./hbys.db")
    )

    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        echo=os.getenv("HBYS_SQL_ECHO", "false").lower() == "true",
    )
    return engine


def create_session_factory(engine) -> sessionmaker:
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def unbound_session(session_factory: sessionmaker):
    """Context manager for queries that bypass tenant filtering."""
    token = _skip_tenant_filter.set(True)
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        _skip_tenant_filter.reset(token)
