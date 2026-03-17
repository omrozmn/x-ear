"""
Database session dependency for hbys-realtime microservice.
"""
from hbys_common.database import create_db_engine, create_session_factory, Base

engine = create_db_engine("realtime")
SessionLocal = create_session_factory(engine)


def get_db():
    """FastAPI dependency that yields a DB session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db():
    """Create all tables on startup."""
    Base.metadata.create_all(bind=engine)
