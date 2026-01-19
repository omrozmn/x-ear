"""
AI Layer API Routers

FastAPI routers for AI endpoints:
- /ai/chat - Natural language chat interface
- /ai/actions - Action plan generation and execution
- /ai/audit - Audit log queries
- /ai/status - AI layer status
- /ai/admin - Admin controls (kill switch, settings)
"""

from ai.api.chat import router as chat_router
from ai.api.actions import router as actions_router
from ai.api.audit import router as audit_router
from ai.api.status import router as status_router
from ai.api.admin import router as admin_router
from ai.api.errors import (
    AIErrorCode,
    AIErrorResponse,
    AILayerException,
    create_error_response,
)

__all__ = [
    "chat_router",
    "actions_router",
    "audit_router",
    "status_router",
    "admin_router",
    "AIErrorCode",
    "AIErrorResponse",
    "AILayerException",
    "create_error_response",
]
