import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.wsgi import WSGIMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app import app as flask_app
from routers import sms

from fastapi_app.middleware import envelope_error, envelope_success, request_id_middleware

# Create FastAPI app
app = FastAPI(
    title="X-Ear CRM API",
    description="FastAPI + Flask Hybrid Backend",
    version="1.0.0",
    # Disable default docs to avoid conflict with legacy swagger if needed, 
    # but usually we want them at /docs
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# RequestId middleware (parity with Flask envelope expectations)
app.middleware("http")(request_id_middleware)


def _get_request_id(request: Request) -> str | None:
    return getattr(getattr(request, "state", None), "request_id", None)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # FastAPI/Starlette raises this for explicit HTTP errors.
    # We convert to the standard envelope while preserving status codes.
    detail = exc.detail
    if isinstance(detail, dict) and "message" in detail and "code" in detail:
        return envelope_error(
            str(detail.get("message") or "Request failed"),
            request_id=_get_request_id(request),
            code=str(detail.get("code") or "HTTP_ERROR"),
            status_code=exc.status_code,
            details=detail.get("details"),
        )

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "Request failed"
        details = detail
    else:
        message = str(detail) if detail is not None else "Request failed"
        details = None

    return envelope_error(
        message,
        request_id=_get_request_id(request),
        code="HTTP_ERROR",
        status_code=exc.status_code,
        details=details,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Pydantic validation errors for request body/query/path.
    return envelope_error(
        "Validation error",
        request_id=_get_request_id(request),
        code="VALIDATION_ERROR",
        status_code=422,
        details=exc.errors(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Avoid leaking internal details; log is handled elsewhere.
    return envelope_error(
        "Internal server error",
        request_id=_get_request_id(request),
        code="INTERNAL_ERROR",
        status_code=500,
    )

# Configure CORS for FastAPI 
# (Flask CORS handles its own, but FastAPI needs its own for new routes)
origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081", 
    "http://localhost:8082",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import all FastAPI routers
from routers import sms, campaigns, patients, inventory, sales
from routers import auth, appointments, dashboard, devices
from routers import notifications, branches, reports, roles
from routers import payments, users, tenant_users, suppliers
# Admin routers
from routers import admin, admin_tenants, admin_dashboard, admin_plans, admin_addons, admin_analytics
# Additional routers
from routers import invoices, sgk

# Include FastAPI Routers
# All routers use /api prefix to match existing Flask structure
app.include_router(sms.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(sales.router, prefix="/api")

# New migrated routers
app.include_router(auth.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(devices.router, prefix="/api")

# Additional migrated routers
app.include_router(notifications.router, prefix="/api")
app.include_router(branches.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tenant_users.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")

# Admin panel routers
app.include_router(admin.router, prefix="/api")
app.include_router(admin_tenants.router, prefix="/api")
app.include_router(admin_dashboard.router, prefix="/api")
app.include_router(admin_plans.router, prefix="/api")
app.include_router(admin_addons.router, prefix="/api")
app.include_router(admin_analytics.router, prefix="/api")

# Additional routers
app.include_router(invoices.router, prefix="/api")
app.include_router(sgk.router, prefix="/api")

# ============================================================================
# FLASK FALLBACK - MIGRATION STATUS
# ============================================================================
# As of 2026-01-04, ALL MODULES have been migrated to FastAPI:
# ✅ auth (login, logout, refresh, OTP, password reset)
# ✅ patients (CRUD, search, devices, sales)
# ✅ appointments (CRUD, reschedule, cancel, availability)
# ✅ dashboard (KPIs, charts, activity)
# ✅ devices (CRUD, categories, brands, stock)
# ✅ inventory (CRUD, search, stats, movements)
# ✅ sales (CRUD, payments, payment plans)
# ✅ campaigns (CRUD)
# ✅ sms (send, templates)
# ✅ notifications (CRUD, settings, stats)
# ✅ branches (CRUD)
# ✅ reports (overview, financial, patients, campaigns, promissory notes)
# ✅ roles (CRUD, permissions)
# ✅ payments (payment records, promissory notes)
# ✅ users (CRUD, profile, password)
# ✅ tenant_users (tenant user management, company settings)
# ✅ suppliers (CRUD, search, stats)
# ✅ admin (admin auth, users, tickets, debug)
# ✅ admin_tenants (tenant management)
# ✅ admin_dashboard (admin metrics)
# ✅ admin_plans (subscription plans)
# ✅ admin_addons (add-on packages)
# ✅ admin_analytics (analytics data)
# ✅ invoices (invoice CRUD)
# ✅ sgk (SGK documents, OCR)
#
# Flask fallback is DISABLED by default.
# Set ENABLE_FLASK_FALLBACK=1 only for legacy integrations (birfatura, uts).
# ============================================================================
if os.getenv("ENABLE_FLASK_FALLBACK", "0") == "1":
    import logging
    logging.getLogger(__name__).warning(
        "Flask fallback is ENABLED. This is deprecated and will be removed. "
        "Please migrate remaining endpoints to FastAPI."
    )
    app.mount("/", WSGIMiddleware(flask_app))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5003, reload=True)
