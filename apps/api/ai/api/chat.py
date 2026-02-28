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
from typing import Any, Dict, Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

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
from ai.services.conversation_memory import (
    ConversationMemory,
    get_conversation_memory,
)
from ai.services.request_logger import get_request_logger
from ai.models.ai_usage import UsageType
from ai.middleware.rate_limiter import check_rate_limit, RateLimitExceededError
from ai.api.errors import (
    AIErrorResponse,
    AIErrorCode,
    create_error_response,
)
from ai.agents.action_planner import (
    ActionPlanner,
    get_action_planner,
    ActionPlannerResult,
    PlannerStatus
)
from ai.schemas.llm_outputs import IntentType, RiskLevel
from ai.capability_registry import (
    get_all_capabilities,
    filter_capabilities_by_permissions,
    filter_capabilities_by_phase,
)
from ai.api.capabilities import _format_capabilities_for_chat
from ai.models.ai_request import RequestStatus
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access

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





class ActionStepResponse(BaseModel):
    """Step in an action plan."""
    step_number: int
    tool_name: str
    description: str
    parameters: Dict[str, Any]
    risk_level: str
    requires_approval: bool


class ActionPlanResponse(BaseModel):
    """Action plan to be executed."""
    plan_id: str
    steps: List[ActionStepResponse]
    overall_risk_level: str
    requires_approval: bool
    estimated_duration_seconds: Optional[int] = None


class MatchedSlotResponse(BaseModel):
    """Slot definition for UI rendering."""
    name: str
    prompt: str
    ui_type: str  # entity_search, enum, date, number, text, file, boolean, time
    source_endpoint: Optional[str] = None
    enum_options: Optional[List[str]] = None
    validation_rules: Optional[Dict[str, Any]] = None


class MatchedCapabilityResponse(BaseModel):
    """Matched capability with slots for frontend slot-filling UI."""
    name: str
    description: str
    category: str
    slots: List[MatchedSlotResponse] = []


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    request_id: str = Field(description="Unique request identifier")
    status: str = Field(description="Processing status")
    intent: Optional[IntentResponse] = Field(default=None, description="Classified intent")
    action_plan: Optional[ActionPlanResponse] = Field(default=None, description="Generated action plan if applicable")
    matched_capability: Optional[MatchedCapabilityResponse] = Field(default=None, description="Matched capability with slots for UI rendering")
    response: Optional[str] = Field(default=None, description="Response message")
    needs_clarification: bool = Field(default=False, description="Whether clarification is needed")
    clarification_question: Optional[str] = Field(default=None, description="Question for clarification")
    processing_time_ms: float = Field(description="Processing time in milliseconds")
    pii_detected: bool = Field(default=False, description="Whether PII was detected and redacted")
    phi_detected: bool = Field(default=False, description="Whether PHI was detected and redacted")


# =============================================================================
# Dependencies
# =============================================================================

# Authenticated user context is now handled by require_access dependency


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
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    Process a natural language chat message.
    Args:
        request: Chat request with prompt and optional context
        user_context: Current user context from auth
    """
    start_time = time.time()
    request_id = f"chat_{uuid4().hex[:16]}"
    tenant_id = access.tenant_id
    user_id = access.user_id
    if not tenant_id or not user_id:
        logger.error("Missing tenant_id or user_id in access context")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    logger.info(
        f"Chat request received",
        extra={
            "request_id": request_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "prompt_length": len(request.prompt),
        }
    )
    
    # Log AI request to database with user_id for audit trail (Requirement 2.7)
    request_logger = get_request_logger(db)
    ai_request = request_logger.log_request(
        tenant_id=tenant_id,
        user_id=user_id,  # Requirement 9.1: Store user_id for audit trail
        prompt=request.prompt,
        session_id=request.session_id,
        idempotency_key=request.idempotency_key,
    )
    
    # Use the database-generated request ID for consistency
    request_id = ai_request.id
    
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
        # Get conversation history for context (Requirement 4.6)
        memory = get_conversation_memory()
        session_id = request.session_id or f"session_{tenant_id}_{user_id}"
        conversation_history = memory.get_history(session_id, max_turns=3)
        
        # Check for pending action plan (for slot-filling and timeout)
        pending_plan = None
        awaiting_slot_fill = False
        slot_name = None
        
        # Build context with conversation history and pending plan
        full_context = request.context or {}
        full_context["conversation_history"] = [turn.to_dict() for turn in conversation_history]
        
        # Check if we have a pending action plan from previous turn
        pending_plan_id = None
        if conversation_history:
            last_turn = conversation_history[-1]
            if last_turn.entities:
                pending_plan_id = last_turn.entities.get("pending_plan_id") or last_turn.entities.get("prepared_plan_id")
                
                if last_turn.entities.get("pending_plan_id"):
                    awaiting_slot_fill = True
                    slot_name = last_turn.entities.get("missing_parameter")
                    full_context["awaiting_slot_fill"] = awaiting_slot_fill
                    full_context["slot_name"] = slot_name
                    
                if pending_plan_id:
                    full_context["pending_plan_id"] = pending_plan_id
                    logger.info(f"Context detected pending plan: {pending_plan_id}")
        
        refiner = get_intent_refiner()
        result: IntentRefinerResult = await refiner.refine_intent(
            user_message=request.prompt,
            tenant_id=tenant_id,
            user_id=user_id,
            context=full_context,
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
        # Update request status to rejected
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.REJECTED,
            error_message=result.error_message or "Message blocked by security filters",
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.GUARDRAIL_VIOLATION,
                message=result.error_message or "Message blocked by security filters",
                request_id=request_id,
            ).model_dump(),
        )
    
    if result.status == RefinerStatus.CIRCUIT_OPEN:
        # Update request status to failed
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.FAILED,
            error_message=result.error_message or "AI service temporarily unavailable",
        )
        
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
        # Update request status to failed
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.FAILED,
            error_message=result.error_message or "Failed to process message",
        )
        
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
    
    # Handle cancellation (Requirement 4.2)
    if result.is_success and result.intent and result.intent.intent_type in [IntentType.CANCEL, IntentType.CANCELLATION]:
        # Clear conversation context
        memory.clear_session(session_id)
        
        # Log cancellation event (Requirement 4.7)
        logger.info(
            f"Operation cancelled by user",
            extra={
                "tenant_id": tenant_id,
                "user_id": user_id,
                "conversation_id": session_id,
                "reason": "user_cancelled",
            }
        )
        
        # Update request status to completed
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.COMPLETED,
            intent_type=result.intent.intent_type.value,
            intent_confidence=result.intent.confidence,
            latency_ms=int(processing_time_ms),
        )
        
        return ChatResponse(
            request_id=request_id,
            status=result.status.value,
            intent=intent_response,
            response="İşlem iptal edildi.",
            needs_clarification=False,
            processing_time_ms=processing_time_ms,
            pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
            phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
        )
    
    # Handle capability inquiry (Requirement 5.2)
    if result.is_success and result.intent and result.intent.intent_type == IntentType.CAPABILITY_INQUIRY:
        # Reuse capabilities endpoint logic (Single Source of Truth)
        # Get user permissions from context (no fallback allowed)
        user_permissions = access.permissions
        if not user_permissions:
            # No permissions: do not show any capabilities
            permitted_capabilities = []
        else:
            # Get current AI phase
            ai_phase = config.phase.name  # "A", "B", or "C"
            # Load all capabilities
            all_capabilities = get_all_capabilities()
            # Filter by user permissions
            permitted_capabilities = filter_capabilities_by_permissions(
                all_capabilities,
                user_permissions
            )
            # Filter by AI phase
            permitted_capabilities = filter_capabilities_by_phase(
                permitted_capabilities,
                ai_phase
            )
        # Format capabilities for chat response
        capabilities_message = _format_capabilities_for_chat(permitted_capabilities)
        # Store conversation turn
        memory.add_turn(
            session_id=session_id,
            user_message=request.prompt,
            ai_response=capabilities_message,
            intent_type=result.intent.intent_type.value if result.intent else None,
            entities=result.intent.entities if result.intent else {},
        )
        # Update request status to completed
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.COMPLETED,
            intent_type=result.intent.intent_type.value,
            intent_confidence=result.intent.confidence,
            latency_ms=int(processing_time_ms),
        )
        logger.info(
            f"Capability inquiry handled",
            extra={
                "tenant_id": tenant_id,
                "user_id": user_id,
                "conversation_id": session_id,
                "total_capabilities": len(permitted_capabilities),
            }
        )
        return ChatResponse(
            request_id=request_id,
            status=result.status.value,
            intent=intent_response,
            response=capabilities_message,
            needs_clarification=False,
            processing_time_ms=processing_time_ms,
            pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
            phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
        )
    
    # Handle slot-filling response (Requirement 4.4)
    if result.is_success and result.intent and result.intent.intent_type == IntentType.SLOT_FILL:
        # Update pending action plan with filled slot
        # For now, we'll just acknowledge the slot value
        # In a full implementation, this would update the action plan and check if all slots are filled
        
        slot_value = result.intent.entities.get(slot_name, "")
        response_message = f"{slot_name} bilgisi alındı: {slot_value}. Devam ediyorum..."
        
        # Store conversation turn
        memory.add_turn(
            session_id=session_id,
            user_message=request.prompt,
            ai_response=response_message,
            intent_type=result.intent.intent_type.value if result.intent else None,
            entities=result.intent.entities if result.intent else {},
        )
        
        # Update request status to completed
        request_logger.update_request_status(
            request_id=request_id,
            status=RequestStatus.COMPLETED,
            intent_type=result.intent.intent_type.value,
            intent_confidence=result.intent.confidence,
            intent_data=result.intent.entities,
            latency_ms=int(processing_time_ms),
        )
        
        return ChatResponse(
            request_id=request_id,
            status=result.status.value,
            intent=intent_response,
            response=response_message,
            needs_clarification=False,
            processing_time_ms=processing_time_ms,
            pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
            phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
        )
    
    # Action Planning (Layer 2)
    action_plan_response = None
    if (
        result.is_success 
        and result.intent 
        and result.intent.intent_type == IntentType.ACTION
        and not result.intent.clarification_needed
    ):
        try:
            planner = get_action_planner()
            # Extract permissions from access context
            permissions = access.permissions
            
            # Check for timeout on pending plan (Requirement 4.5)
            if pending_plan:
                if planner.is_expired(pending_plan):
                    # Plan has expired
                    memory.clear_session(session_id)
                    
                    # Log timeout event (Requirement 4.7)
                    logger.info(
                        f"Action plan timed out",
                        extra={
                            "tenant_id": tenant_id,
                            "user_id": user_id,
                            "conversation_id": session_id,
                            "plan_id": pending_plan.plan_id,
                            "reason": "timeout",
                        }
                    )
                    
                    # Update request status to timeout
                    request_logger.update_request_status(
                        request_id=request_id,
                        status=RequestStatus.TIMEOUT,
                        error_message="Action plan timed out",
                        latency_ms=int(processing_time_ms),
                    )
                    
                    return ChatResponse(
                        request_id=request_id,
                        status="timeout",
                        intent=intent_response,
                        response="Action plan timed out. Please start over.",
                        needs_clarification=False,
                        processing_time_ms=processing_time_ms,
                        pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
                        phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
                    )
            
            # Try LLM-based planning first
            plan_result = await planner.create_plan(
                intent=result.intent,
                tenant_id=tenant_id,
                user_id=user_id,
                user_permissions=permissions,
                context=full_context,
            )
            
            # If LLM planning failed or returned no actions, try fallback
            if plan_result.status == PlannerStatus.NO_ACTIONS_NEEDED and result.intent.entities:
                logger.info("LLM planning returned no actions, trying fallback with entities")
                plan_result = planner.create_plan_without_llm(
                    intent=result.intent,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    user_permissions=permissions,
                )
            
            if plan_result.is_success and plan_result.plan:
                plan = plan_result.plan
                
                # Check for missing parameters (Requirement 4.3)
                if plan.missing_parameters and plan.slot_filling_prompt:
                    # Store pending plan in conversation memory
                    memory.add_turn(
                        session_id=session_id,
                        user_message=request.prompt,
                        ai_response=plan.slot_filling_prompt,
                        intent_type=result.intent.intent_type.value,
                        entities={
                            "pending_plan_id": plan.plan_id,
                            "missing_parameter": plan.missing_parameters[0],
                        },
                    )
                    
                    return ChatResponse(
                        request_id=request_id,
                        status=result.status.value,
                        intent=intent_response,
                        response=plan.slot_filling_prompt,
                        needs_clarification=True,
                        clarification_question=plan.slot_filling_prompt,
                        processing_time_ms=processing_time_ms,
                        pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
                        phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
                    )
                
                # Plan is complete - generate action plan response
                action_plan_response = ActionPlanResponse(
                    plan_id=plan.plan_id,
                    steps=[
                        ActionStepResponse(
                            step_number=s.step_number,
                            tool_name=s.tool_name,
                            description=s.description,
                            parameters=s.parameters,
                            risk_level=s.risk_level.value,
                            requires_approval=s.requires_approval
                        )
                        for s in plan.steps
                    ],
                    overall_risk_level=plan.overall_risk_level.value,
                    requires_approval=plan.requires_approval
                )
                logger.info(f"Action plan generated: {plan.plan_id}")
            elif plan_result.status == PlannerStatus.PERMISSION_DENIED:
                logger.warning(f"Action planning permission denied: {plan_result.denied_permissions}")
                # We could add a specific message here
        except Exception as e:
            logger.error(f"Action planning failed: {e}")
            # Non-blocking error, we still return the chat response but logs capture the failure
    
    # Match intent to capability for slot-filling UI
    matched_capability_response = None
    has_required_slots = False
    if result.is_success and result.intent and result.intent.intent_type in (IntentType.ACTION, IntentType.QUERY):
        matched_cap = _match_capability_from_intent(result.intent.entities)
        if matched_cap:
            matched_capability_response = MatchedCapabilityResponse(
                name=matched_cap.name,
                description=matched_cap.description,
                category=matched_cap.category,
                slots=[
                    MatchedSlotResponse(
                        name=s.name,
                        prompt=s.prompt,
                        ui_type=s.ui_type,
                        source_endpoint=s.source_endpoint,
                        enum_options=s.enum_options,
                        validation_rules=s.validation_rules,
                    )
                    for s in matched_cap.slots
                ]
            )
            # Check if capability has required slots that need filling
            has_required_slots = any(
                s.validation_rules and s.validation_rules.get("required", True)
                for s in matched_cap.slots
            )
            logger.info(f"Matched capability: {matched_cap.name} with {len(matched_cap.slots)} slots (has_required={has_required_slots})")

    # CRITICAL: If the matched capability has required slots to fill,
    # suppress the action_plan. Frontend slot-filling UI must collect
    # parameters FIRST, then the plan is generated on a follow-up call.
    if has_required_slots and matched_capability_response:
        action_plan_response = None
        logger.info("Suppressed action_plan because matched capability has required slots to fill first")

    # Generate response message
    response_message = None
    if result.intent:
        response_message = result.intent.conversational_response or result.intent.reasoning
        
        # If it's a vague query and we have a pending plan, remind the user
        if result.intent.intent_type == IntentType.QUERY and pending_plan_id:
            if "?" in request.prompt or len(request.prompt) < 15:
                response_message = f"Az önceki işleminiz (Plan: {pending_plan_id}) için onayınızı bekliyorum. Devam etmek ister misiniz?"
        
        # If we have an action plan (not suppressed), append a confirmation message
        if action_plan_response and "plan" not in (response_message or "").lower() and "hazırlan" not in (response_message or "").lower():
            response_message += f"\n\nİşleminiz için bir plan hazırladım. (Plan ID: {action_plan_response.plan_id})"
        
        # If slot-filling is needed, use a clean Turkish message acknowledging intent
        if has_required_slots and matched_capability_response:
            tr_name = _CAPABILITY_DISPLAY_TR.get(matched_capability_response.name, matched_capability_response.name)
            response_message = f"{tr_name} için gerekli bilgileri topluyorum."
    
    # Store conversation turn in memory
    memory_entities = result.intent.entities.copy() if result.intent and result.intent.entities else {}
    if action_plan_response:
        memory_entities["prepared_plan_id"] = action_plan_response.plan_id

    memory.add_turn(
        session_id=session_id,
        user_message=request.prompt,
        ai_response=response_message or "No response generated",
        intent_type=result.intent.intent_type.value if result.intent else None,
        entities=memory_entities,
    )
    
    # Update request status to completed with intent classification
    request_logger.update_request_status(
        request_id=request_id,
        status=RequestStatus.COMPLETED,
        intent_type=result.intent.intent_type.value if result.intent else None,
        intent_confidence=result.intent.confidence if result.intent else None,
        intent_data=result.intent.entities if result.intent else None,
        latency_ms=int(processing_time_ms),
    )

    return ChatResponse(
        request_id=request_id,
        status=result.status.value,
        intent=intent_response,
        action_plan=action_plan_response,
        matched_capability=matched_capability_response,
        response=response_message,
        needs_clarification=has_required_slots,
        clarification_question=matched_capability_response.slots[0].prompt if has_required_slots and matched_capability_response and matched_capability_response.slots else result.clarification_question,
        processing_time_ms=processing_time_ms,
        pii_detected=result.redaction_result.has_pii if result.redaction_result else False,
        phi_detected=result.redaction_result.has_phi if result.redaction_result else False,
    )


# =============================================================================
# Helper: Match Intent to Capability
# =============================================================================

# Maps action_type / query_type from intent entities to capability names in the registry
_ACTION_TYPE_TO_CAPABILITY = {
    # Action types
    "sale_create": "Create Sales Opportunity",
    "appointment_create": "Schedule Appointment",
    "device_assign": "Assign Device to Party",
    "collection_create": "Create Sales Opportunity",  # collections go through sales
    "party_create": "Create Party Record",
    "party_update": "Update Party Information",
    "cancel_appointment": "Cancel Appointment",
    "reschedule_appointment": "Reschedule Appointment",
    "generate_and_send_e_invoice": "Generate & Send E-Invoice",
    "report_generate": "Generate Reports",
    # Query types
    "appointments_list": "View Appointments",
    "invoices_list": "View Sales Information",
    "inventory_list": "View Device Inventory",
    "party_view": "View Party Information",
    "check_appointment_availability": "Check Appointment Availability",
    "get_party_comprehensive_summary": "Get Comprehensive Party Summary",
    "get_daily_cash_summary": "View Daily Cash Summary",
    "get_low_stock_alerts": "Low Stock Alerts",
    "query_sgk_patient_rights": "Query SGK Patient Rights",
    "query_sgk_e_receipt": "Query SGK E-Receipt",
}

# Turkish user-facing display names for capabilities
_CAPABILITY_DISPLAY_TR = {
    "Create Sales Opportunity": "Satış kaydı oluşturma",
    "Schedule Appointment": "Randevu oluşturma",
    "Assign Device to Party": "Cihaz atama",
    "Create Party Record": "Hasta/kişi kaydı oluşturma",
    "Update Party Information": "Hasta/kişi bilgisi güncelleme",
    "Cancel Appointment": "Randevu iptal etme",
    "Reschedule Appointment": "Randevu erteleme",
    "Generate & Send E-Invoice": "E-fatura gönderme",
    "Generate Reports": "Rapor oluşturma",
    "View Appointments": "Randevuları görüntüleme",
    "View Sales Information": "Satış bilgilerini görüntüleme",
    "View Device Inventory": "Cihaz envanterini görüntüleme",
    "View Party Information": "Hasta/kişi bilgilerini görüntüleme",
    "Check Appointment Availability": "Randevu uygunluğu kontrolü",
    "Get Comprehensive Party Summary": "Hasta/kişi özet raporu",
    "View Daily Cash Summary": "Günlük kasa özeti",
    "Low Stock Alerts": "Düşük stok uyarıları",
    "Query SGK Patient Rights": "SGK hasta hakları sorgulama",
    "Query SGK E-Receipt": "SGK e-reçete sorgulama",
}


def _match_capability_from_intent(entities: Dict[str, Any]) -> Optional[Any]:
    """
    Match intent entities to a capability from the registry.
    Returns the matched Capability or None.
    """
    action_type = entities.get("action_type") or entities.get("query_type")
    if not action_type:
        return None
    
    target_name = _ACTION_TYPE_TO_CAPABILITY.get(action_type)
    if not target_name:
        return None
    
    all_caps = get_all_capabilities()
    for cap in all_caps:
        if cap.name == target_name:
            return cap
    
    return None

