"""
Factory for creating standardized HBYS microservice FastAPI apps.
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_engine, create_session_factory, Base


def create_hbys_app(
    service_name: str,
    title: str,
    version: str = "0.1.0",
    description: str = "",
) -> FastAPI:
    """Create a standardized HBYS microservice FastAPI app."""

    app = FastAPI(
        title=f"X-EAR HBYS - {title}",
        version=version,
        description=description,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Database setup
    engine = create_db_engine(service_name)
    session_factory = create_session_factory(engine)

    # Store on app state
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.service_name = service_name

    @app.on_event("startup")
    async def startup():
        Base.metadata.create_all(bind=engine)
        logging.info(f"HBYS {service_name} started on tables created")

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok", "service": service_name}

    return app


def get_db_dependency(app: FastAPI):
    """Create a get_db dependency for a specific app."""

    def get_db():
        session = app.state.session_factory()
        try:
            yield session
        finally:
            session.close()

    return get_db
