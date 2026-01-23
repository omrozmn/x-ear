import os
import logging
import json
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

# Load environment from .env FIRST (so JWT_SECRET_KEY etc. are available for middleware)
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)  # Override to ensure .env values are used
except Exception:
    # Optional dependency / best-effort load; env vars can still be provided by the process manager.
    pass

from fastapi_app.middleware import envelope_error, request_id_middleware

# Centralized permission enforcement (Flask-free)
from middleware.permission_middleware import FastAPIPermissionMiddleware

# Tenant context cleanup middleware (G-02 security fix)
# CRITICAL: Use function-based middleware, NOT BaseHTTPMiddleware
from middleware.tenant_context import register_tenant_context_middleware

# ============================================================================
# Structured JSON Logging Setup with Rotation
# ============================================================================
class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    def format(self, record):
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, 'request_id'):
            log_obj["requestId"] = record.request_id
        if hasattr(record, 'tenant_id'):
            log_obj["tenantId"] = record.tenant_id
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

# Configure root logger with JSON format
json_formatter = JSONFormatter()

# Console handler (for stdout/stderr)
console_handler = logging.StreamHandler()
console_handler.setFormatter(json_formatter)

# File handler with rotation (prevents log bloat)
# Max 50MB per file, keep 5 backup files (total max ~300MB)
from logging.handlers import RotatingFileHandler
log_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(log_dir, 'server.log')
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=50 * 1024 * 1024,  # 50MB per file
    backupCount=5,               # Keep 5 old files
    encoding='utf-8'
)
file_handler.setFormatter(json_formatter)

# Configure logging with both handlers
logging.basicConfig(level=logging.INFO, handlers=[console_handler, file_handler])
logger = logging.getLogger("x-ear")

# Create FastAPI app - operation_ids are now explicit in each endpoint
# separate_input_output_schemas=False: Fixes Orval generating 'unknown' types
# by avoiding OpenAPI 3.1 anyOf syntax for nullable fields
app = FastAPI(
    title="X-Ear CRM API",
    description="Auto-generated from Flask backend routes",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    separate_input_output_schemas=False,  # Critical: Orval compatibility
)

# ============================================================================
# Health & Readiness Endpoints (Observability)
# ============================================================================
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and orchestrators"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0"
    }

@app.get("/readiness", tags=["Health"])
async def readiness_check():
    """Readiness check - verifies database connectivity"""
    from core.database import engine
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ready" if db_status == "connected" else "not_ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status
        }
    }

# ============================================================================
# Idempotency-Key Middleware
# ============================================================================
# ============================================================================
# Idempotency-Key Middleware (G-04 Spec)
# ============================================================================
from middleware.idempotency import IdempotencyMiddleware

app.add_middleware(IdempotencyMiddleware)

# ============================================================================
# AI JWT Authentication Middleware (P0 - CRITICAL)
# ============================================================================
# JWT authentication for AI endpoints (/ai/*)
# Validates JWT tokens and sets tenant context for AI requests
# Requirements: 2.1, 2.7 (AI Security Fixes)
from ai.middleware.auth import ai_auth_middleware

app.middleware("http")(ai_auth_middleware)

# Permission middleware should run early (after request-id) to ensure consistent errors/logs.
app.add_middleware(FastAPIPermissionMiddleware)

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
    # Log the actual error for debugging
    import traceback
    import sys
    error_msg = f"Unhandled exception: {exc}"
    tb = traceback.format_exc()
    # Print to stderr to ensure visibility
    print(f"ERROR: {error_msg}", file=sys.stderr)
    print(f"Traceback: {tb}", file=sys.stderr)
    logger.error(error_msg)
    logger.error(f"Traceback: {tb}")
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
    allow_origin_regex=r"http(s)?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Idempotency-Key", "X-Request-Id"],
    # TODO: Add "sentry-trace" and "baggage" when Sentry is installed (GAP-L1)
    expose_headers=["X-Request-Id", "X-Response-Time", "X-Idempotency-Replayed"],
)

# CRITICAL: Tenant context cleanup middleware (G-02 security fix)
# Must be registered after CORS to ensure it wraps all request processing
# Ensures ContextVar is cleared after each request to prevent cross-tenant leaks
# NOTE: Using function-based middleware, NOT BaseHTTPMiddleware (which can cause context leaks)
register_tenant_context_middleware(app)

# Import all FastAPI routers
from routers import parties, auth, users
from routers import sms, campaigns, inventory, sales
from routers import appointments, dashboard, devices
from routers import notifications, branches, reports, roles
from routers import payments, tenant_users, suppliers, settings
# Admin routers
from routers import admin, admin_tenants, admin_dashboard, admin_plans, admin_addons, admin_analytics
# Additional routers
from routers import invoices, sgk
# Newly migrated routers
from routers import activity_logs, permissions, ocr
from routers import upload, documents
from routers import cash_records, unified_cash, payment_integrations

# Include all FastAPI Routers
# All routers use /api prefix to match existing Flask structure
app.include_router(sms.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(parties.router, prefix="/api")
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
app.include_router(settings.router, prefix="/api")

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

# Newly migrated routers (Phase 2)
app.include_router(activity_logs.router, prefix="/api")
app.include_router(permissions.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
# Party subresources router (devices, notes, hearing tests, ereceipts, appointments)
from routers import party_subresources, hearing_profiles
app.include_router(party_subresources.router, prefix="/api")
app.include_router(hearing_profiles.router, prefix="/api")
app.include_router(cash_records.router, prefix="/api")
app.include_router(unified_cash.router, prefix="/api")
app.include_router(payment_integrations.router, prefix="/api")

# Phase 3 migrated routers
from routers import timeline, plans, addons, subscriptions
app.include_router(timeline.router, prefix="/api")
app.include_router(plans.router, prefix="/api")  # Has /plans prefix built-in
app.include_router(addons.router, prefix="/api")  # Has /addons prefix built-in
app.include_router(subscriptions.router, prefix="/api")  # Has /subscriptions prefix built-in

# Phase 4 migrated routers
from routers import admin_settings, admin_roles, config
app.include_router(admin_settings.router, prefix="/api")  # Has /admin/settings prefix built-in
app.include_router(admin_roles.router, prefix="/api")  # Has /admin prefix built-in
app.include_router(config.router, prefix="/api")

# Phase 5 migrated routers
from routers import registration
# sms_packages removed - endpoints already in sms.py
app.include_router(registration.router, prefix="/api")

# Phase 6 migrated routers - Admin modules
from routers import (
    admin_api_keys, admin_appointments, admin_birfatura,
    admin_integrations, admin_inventory, admin_invoices,
    admin_marketplaces, admin_notifications, admin_parties, admin_payments, admin_production,
    admin_scan_queue, admin_suppliers
)
# Pending Future Implementation:
# from routers import admin_campaigns, admin_tickets, orders

app.include_router(admin_api_keys.router)
app.include_router(admin_appointments.router)
app.include_router(admin_birfatura.router)
app.include_router(admin_integrations.router, prefix="/api")
app.include_router(admin_inventory.router)
app.include_router(admin_invoices.router)
app.include_router(admin_marketplaces.router)
app.include_router(admin_notifications.router)
app.include_router(admin_parties.router)
app.include_router(admin_payments.router)
app.include_router(admin_production.router)
app.include_router(admin_scan_queue.router)
app.include_router(admin_suppliers.router)
# app.include_router(admin_campaigns.router) # Pending - Redundant with campaigns.py?
# app.include_router(admin_tickets.router) # Pending

# Phase 6 migrated routers - Other modules
from routers import audit, automation, affiliates, checkout, replacements, birfatura
from routers import apps, pos_commission, uts, sms_packages
app.include_router(audit.router)
app.include_router(automation.router)
app.include_router(affiliates.router)
app.include_router(checkout.router)
app.include_router(replacements.router)
app.include_router(birfatura.router)
app.include_router(apps.router)
app.include_router(pos_commission.router)
app.include_router(uts.router)
app.include_router(sms_packages.router, prefix="/api") # Active: SMS Package Management
# app.include_router(orders.router, prefix="/api") # Pending: Marketplace Orders

# Phase 7 migrated routers - Final modules
from routers import invoice_management, invoices_actions, communications, sms_integration, smtp_config, email_logs
app.include_router(sms_integration.router)
app.include_router(invoice_management.router)
app.include_router(invoices_actions.router)
app.include_router(communications.router)
app.include_router(smtp_config.router)
app.include_router(email_logs.router)

# Tool API routers (AI Layer integration)
from routers.tool_api import email_notifications as tool_api_email
app.include_router(tool_api_email.router)  # No /api prefix - router already has /tool-api prefix

from routers import commissions
app.include_router(commissions.router)

from routers import schema_registry
app.include_router(schema_registry.router, prefix="/api") # Active: Developer Schema Registry

# AI Layer routers
from ai.api import (
    chat_router as ai_chat_router,
    actions_router as ai_actions_router,
    audit_router as ai_audit_router,
    status_router as ai_status_router,
    admin_router as ai_admin_router,
)
app.include_router(ai_chat_router, prefix="/api")
app.include_router(ai_actions_router, prefix="/api")
app.include_router(ai_audit_router, prefix="/api")
app.include_router(ai_status_router, prefix="/api")
app.include_router(ai_admin_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5003, reload=True)
