"""
AI Layer Error Response Handling

Defines structured error response format and all AI error codes.

Requirements:
- 14.4: Return structured error responses with actionable messages
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AIErrorCode(str, Enum):
    """AI Layer error codes."""
    # Service availability
    AI_DISABLED = "AI_DISABLED"
    AI_UNAVAILABLE = "AI_UNAVAILABLE"
    
    # Rate limiting and quotas
    RATE_LIMITED = "RATE_LIMITED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    
    # Approval and authorization
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    APPROVAL_EXPIRED = "APPROVAL_EXPIRED"
    APPROVAL_INVALID = "APPROVAL_INVALID"
    PLAN_DRIFT = "PLAN_DRIFT"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    TENANT_VIOLATION = "TENANT_VIOLATION"
    
    # Tool and execution
    TOOL_NOT_ALLOWED = "TOOL_NOT_ALLOWED"
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
    SCHEMA_DRIFT = "SCHEMA_DRIFT"
    EXECUTION_FAILED = "EXECUTION_FAILED"
    ROLLBACK_FAILED = "ROLLBACK_FAILED"
    
    # Inference and processing
    INFERENCE_TIMEOUT = "INFERENCE_TIMEOUT"
    INFERENCE_ERROR = "INFERENCE_ERROR"
    GUARDRAIL_VIOLATION = "GUARDRAIL_VIOLATION"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    
    # Phase enforcement
    PHASE_BLOCKED = "PHASE_BLOCKED"
    
    # Idempotency
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    
    # General
    INVALID_REQUEST = "INVALID_REQUEST"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Human-readable messages for each error code
AI_ERROR_MESSAGES: Dict[AIErrorCode, str] = {
    AIErrorCode.AI_DISABLED: "AI features are currently disabled",
    AIErrorCode.AI_UNAVAILABLE: "AI service is temporarily unavailable",
    AIErrorCode.RATE_LIMITED: "Too many requests, please try again later",
    AIErrorCode.QUOTA_EXCEEDED: "AI quota exceeded for this billing period",
    AIErrorCode.APPROVAL_REQUIRED: "This action requires admin approval",
    AIErrorCode.APPROVAL_EXPIRED: "Approval token has expired",
    AIErrorCode.APPROVAL_INVALID: "Invalid approval token",
    AIErrorCode.PLAN_DRIFT: "Action plan changed since approval was granted",
    AIErrorCode.PERMISSION_DENIED: "Insufficient permissions for this action",
    AIErrorCode.TENANT_VIOLATION: "Cannot access resources outside your tenant",
    AIErrorCode.TOOL_NOT_ALLOWED: "Requested operation is not in the allowlist",
    AIErrorCode.TOOL_NOT_FOUND: "Requested tool does not exist",
    AIErrorCode.SCHEMA_DRIFT: "Tool schema has changed since plan was created",
    AIErrorCode.EXECUTION_FAILED: "Action execution failed",
    AIErrorCode.ROLLBACK_FAILED: "Rollback procedure failed",
    AIErrorCode.INFERENCE_TIMEOUT: "Model inference timed out",
    AIErrorCode.INFERENCE_ERROR: "Model inference failed",
    AIErrorCode.GUARDRAIL_VIOLATION: "Request exceeded safety guardrails",
    AIErrorCode.VALIDATION_ERROR: "Request validation failed",
    AIErrorCode.PHASE_BLOCKED: "Operation not allowed in current AI phase",
    AIErrorCode.DUPLICATE_REQUEST: "Duplicate request detected",
    AIErrorCode.INVALID_REQUEST: "Invalid request format",
    AIErrorCode.NOT_FOUND: "Resource not found",
    AIErrorCode.INTERNAL_ERROR: "Internal server error",
}


class AIErrorResponse(BaseModel):
    """
    Structured error response for AI Layer.
    
    All AI errors return this format for consistent handling.
    """
    error_code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error context"
    )
    request_id: Optional[str] = Field(
        default=None,
        description="Request ID for debugging"
    )
    retry_after: Optional[int] = Field(
        default=None,
        description="Seconds until retry is allowed (for rate limiting)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "error_code": "RATE_LIMITED",
                "message": "Too many requests, please try again later",
                "details": {"limit": 60, "window": "1 minute"},
                "request_id": "chat_abc123",
                "retry_after": 30
            }
        }
    }


def create_error_response(
    code: AIErrorCode,
    message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
    retry_after: Optional[int] = None,
) -> AIErrorResponse:
    """
    Create a structured error response.
    
    Args:
        code: Error code
        message: Optional custom message (defaults to standard message)
        details: Optional additional context
        request_id: Optional request ID for debugging
        retry_after: Optional retry delay in seconds
        
    Returns:
        AIErrorResponse instance
    """
    return AIErrorResponse(
        error_code=code.value,
        message=message or AI_ERROR_MESSAGES.get(code, "Unknown error"),
        details=details,
        request_id=request_id,
        retry_after=retry_after,
    )


class AILayerException(Exception):
    """Base exception for AI Layer errors."""
    
    def __init__(
        self,
        code: AIErrorCode,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        retry_after: Optional[int] = None,
    ):
        self.code = code
        self.message = message or AI_ERROR_MESSAGES.get(code, "Unknown error")
        self.details = details
        self.request_id = request_id
        self.retry_after = retry_after
        super().__init__(self.message)
    
    def to_response(self) -> AIErrorResponse:
        """Convert to AIErrorResponse."""
        return create_error_response(
            code=self.code,
            message=self.message,
            details=self.details,
            request_id=self.request_id,
            retry_after=self.retry_after,
        )


class AIDisabledException(AILayerException):
    """AI features are disabled."""
    def __init__(self, message: Optional[str] = None, **kwargs):
        super().__init__(AIErrorCode.AI_DISABLED, message, **kwargs)


class RateLimitedException(AILayerException):
    """Rate limit exceeded."""
    def __init__(self, message: Optional[str] = None, retry_after: int = 60, **kwargs):
        super().__init__(AIErrorCode.RATE_LIMITED, message, retry_after=retry_after, **kwargs)


class QuotaExceededException(AILayerException):
    """Quota exceeded."""
    def __init__(self, message: Optional[str] = None, **kwargs):
        super().__init__(AIErrorCode.QUOTA_EXCEEDED, message, **kwargs)


class ApprovalRequiredException(AILayerException):
    """Approval required for action."""
    def __init__(self, message: Optional[str] = None, **kwargs):
        super().__init__(AIErrorCode.APPROVAL_REQUIRED, message, **kwargs)


class PermissionDeniedException(AILayerException):
    """Permission denied."""
    def __init__(self, message: Optional[str] = None, **kwargs):
        super().__init__(AIErrorCode.PERMISSION_DENIED, message, **kwargs)


class PhaseBlockedException(AILayerException):
    """Operation blocked by current phase."""
    def __init__(self, message: Optional[str] = None, **kwargs):
        super().__init__(AIErrorCode.PHASE_BLOCKED, message, **kwargs)
