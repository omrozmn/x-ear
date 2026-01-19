"""
AI Chat Endpoint

POST /ai/chat - Natural language chat interface

Integrates Intent Refiner to process user messages and return
structured responses with intent classification and confidence.

Requirements:
- 14.1: REST endpoints with OpenAPI documentation at /ai/*
- 2.1: Parse and classify user intent
- 2.4: Output structured intent with confidence scores
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ai.config import get_ai_config, AIUnavailableError
from ai.agents.intent_refiner import (
    IntentRefiner, 
    get_intent_refiner, 
    IntentRefinerResult,
    RefinerStatus,
)
from ai.services.kill_switch import (
    KillSwitch, 
    get_kill_switch, 
    AICapability,
    KillSwitchActiveError,
)
from ai.services.usage_tracker import (
    UsageTracker,
    get_usage_tracker,
)
from ai.models.ai_usage import UsageType
from ai.middleware.rate_limiter import check_rate_limit, RateLimitExceededError
from ai.api.errors import (
    AIErrorResponse,
    AIErrorCode,
    create_error_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Chat"])


# =============================================================================
# Request/Response Models
# =============================================================================

class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="User's natural language message"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional context (conversation history, etc.)"
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Optional idempotency key for duplicate detection"
    )
    session_id: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Optional session ID for conversation context"
    )


class IntentResponse(BaseModel):
    """Intent classification result."""
    intent_type: str = Field(description="Classified intent type")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    clarification_needed: bool = Field(default=False, description="Whether clarification is needed")
    clarification_question: Optional[str] = Field(default=None, description="Clarification question if needed")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    request_id: str = Field(description="Unique request identifier")
    status: str = Field(description="Processing status")
    intent: Optional[IntentResponse] = Field(default=None, description="Classified intent")
    response: Optional[str] = Field(default=None, description="Response message")
    needs_clarification: bool = Field(default=False, description="Whether clarification is needed")
    clarification_question: Optional[str] = Field(default=None, description="Question for clarification")
    processing_time_ms: float = Field(description="Processing time in milliseconds")
    pii_detected: bool = Field(default=False, description="Whether PII was detected and redacted")
    phi_detected: bool = Field(default=False, description="Whether PHI was detected and redacted")


# =============================================================================
# Dependencies
# =============================================================================

async def get_current_user_context() -> Dict[str, str]:
    """
    Get current user context from request.
    
    In production, this would extract user info from JWT token.
    For now, returns placeholder values.
    """
    # TODO: Integrate with actual auth system
    return {
        "user_id": "user_placeholder",
        "tenant_id": "tenant_placeholder",
        "permissions": [],
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        200: {"description": "Successful response with intent classification"},
        400: {"description": "Invalid request"},
        429: {"description": "Rate limit exceeded"},
        503: {"description": "AI service unavailable"},
    },
    summary="Process natural language chat message",
    description="""
    Process a natural language message and return intent classification.
    
    The endpoint:
    1. Checks kill switch and rate limits
    2. Sanitizes input and redacts PII/PHI
    3. Classifies user intent using local LLM
    4. Returns structured response with confidence score
    
    If clarification is needed, the response will include a clarification question.
    """,
)
async def chat(
    request: ChatRequest,
    user_context: Dict[str, str] = Depends(get_current_user_context),
) -> ChatResponse:
    """
    Process a natural language chat message.
    
    Args:
        request: Chat request with prompt and optional context
        user_context: Current user context from auth
        
    Returns:
        ChatResponse with intent classification and response
        
    Raises:
        HTTPException: On various error conditions
    """
    start_time = time.time()
    request_id = f"chat_{uuid4().hex[:16]}"
    
    tenant_id = user_context.get("tenant_id", "unknown")
    user_id = user_context.get("user_id", "unknown")
    
    logger.info(
        f"Chat request received",
        extra={
            "request_id": request_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "prompt_length": len(request.prompt),
        }
    )
    
    # Check AI is enabled
    config = get_ai_config()
    if not config.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=create_error_response(
                code=AIErrorCode.AI_DISABLED,
                request_id=request_id,
            ).model_dump(),
        )
    
    # Check kill switch
    try:
        kill_switch = get_kill_switch()
        kill_switch.require_not_blocked(
            tenant_id=tenant_id,
            capability=AICapability.CHAT,
        )
    except KillSwitchActiveError as e:
        logger.warning(f"Kill switch active: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=create_error_response(
                code=AIErrorCode.AI_DISABLED,
                message=str(e),
                request_id=request_id,
            ).model_dump(),
        )
    
    # Check rate limit
    try:
        check_rate_limit(tenant_id=tenant_id, user_id=user_id)
    except RateLimitExceededError as e:
        logger.warning(f"Rate limit exceeded: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=create_error_response(
                code=AIErrorCode.RATE_LIMITED,
                message=str(e),
                request_id=request_id,
                retry_after=e.retry_after_seconds,
            ).model_dump(),
        )
    
    # Track usage
    try:
        usage_tracker = get_usage_tracker()
        usage_tracker.acquire_quota(
            tenant_id=tenant_id,
            usage_type=UsageType.CHAT,
        )
    except Exception as e:
        logger.warning(f"Quota exceeded: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=create_error_response(
                code=AIErrorCode.QUOTA_EXCEEDED,
                message=str(e),
                request_id=request_id,
            ).model_dump(),
        )
    
    # Process with Intent Refiner
    try:
        refiner = get_intent_refiner()
        result: IntentRefinerResult = await refiner.refine_intent(
            user_message=request.prompt,
            tenant_id=tenant_id,
            user_id=user_id,
            context=request.context,
        )
    except Exception as e:
        logger.error(f"Intent refiner error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                code=AIErrorCode.INFERENCE_ERROR,
                message=f"Failed to process message: {str(e)}",
                request_id=request_id,
            ).model_dump(),
        )
    
    processing_time_ms = (time.time() - start_time) * 1000
    
    # Build response based on result status
    if result.status == RefinerStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.GUARDRAIL_VIOLATION,
                message=result.error_message or "Message blocked by security filters",
                request_id=request_id,
            ).model_dump(),
        )
    
    if result.status == RefinerStatus.CIRCUIT_OPEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=create_error_response(
                code=AIErrorCode.INFERENCE_TIMEOUT,
                message=result.error_message or "AI service temporarily unavailable",
                request_id=request_id,
                retry_after=60,
            ).model_dump(),
        )
    
    if result.status == RefinerStatus.ERROR:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                code=AIErrorCode.INFERENCE_ERROR,
                message=result.error_message or "Failed to process message",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Build intent response
    intent_response = None
    if result.intent:
        intent_response = IntentResponse(
            intent_type=result.intent.intent_type.value,
            confidence=result.intent.confidence,
            entities=result.intent.entities,
            clarification_needed=result.intent.clarification_needed,
            clarification_question=result.intent.clarification_question,
        )
    
    # Generate response message
    response_message = None
    if result.intent and result.intent.reasoning:
        response_message = result.intent.reasoning
    
    return ChatResponse(
        request_id=request_id,
        status=result.status.value,
        intent=intent_response,
        response=response_message,
        needs_clarification=result.needs_clarification,
        clarification_question=result.clarification_question,
        processing_time_ms=processing_time_ms,
        pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
        phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
    )
