"""
AI Actions Endpoint

POST /ai/actions - Generate action plan from intent
POST /ai/actions/{id}/approve - Approve an action
POST /ai/actions/{id}/execute - Execute an approved action

Integrates Action Planner and Executor for action management.

Requirements:
- 14.1: REST endpoints with OpenAPI documentation at /ai/*
- 14.2: Support both synchronous and asynchronous modes
- 3.1: Generate action plans using ONLY Tool_API operations
- 4.1: Simulation mode (dry-run)
- 8.1: High/critical risk actions require explicit admin approval
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from pydantic import BaseModel, Field

from ai.config import get_ai_config, AIPhase
from ai.agents.action_planner import (
    ActionPlanner,
    get_action_planner,
    ActionPlannerResult,
    PlannerStatus,
    ActionPlan,
)
from ai.agents.executor import (
    Executor,
    get_executor,
    ExecutionResult,
    ExecutorStatus,
)
from ai.schemas.llm_outputs import IntentOutput, IntentType
from ai.tools import ToolExecutionMode
from ai.services.kill_switch import (
    get_kill_switch,
    AICapability,
    KillSwitchActiveError,
)
from ai.services.usage_tracker import get_usage_tracker
from ai.models.ai_usage import UsageType
from ai.services.approval_gate import (
    ApprovalGate,
    get_approval_gate,
    ApprovalRequest,
    ApprovalResult,
    ApprovalDecision,
)
from ai.utils.approval_token import (
    ApprovalToken,
    validate_approval_token,
    _compute_action_plan_hash,
)
from ai.middleware.rate_limiter import check_rate_limit, RateLimitExceededError
from ai.api.errors import (
    AIErrorCode,
    create_error_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Actions"])


# =============================================================================
# Request/Response Models
# =============================================================================

class IntentRequest(BaseModel):
    """Intent for action planning."""
    intent_type: str = Field(description="Type of intent")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")


class CreateActionRequest(BaseModel):
    """Request to create an action plan."""
    intent: IntentRequest = Field(description="Classified intent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional context")
    idempotency_key: Optional[str] = Field(default=None, max_length=128, description="Idempotency key")


class ActionStepResponse(BaseModel):
    """Response for a single action step."""
    step_number: int = Field(description="Step number in sequence")
    tool_name: str = Field(description="Tool to execute")
    tool_schema_version: str = Field(description="Schema version of the tool")
    parameters: Dict[str, Any] = Field(description="Tool parameters")
    description: str = Field(description="Step description")
    risk_level: str = Field(description="Risk level of this step")
    requires_approval: bool = Field(description="Whether this step requires approval")


class ActionPlanResponse(BaseModel):
    """Response containing an action plan."""
    plan_id: str = Field(description="Unique plan identifier")
    status: str = Field(description="Plan status")
    steps: List[ActionStepResponse] = Field(description="Action steps")
    overall_risk_level: str = Field(description="Overall risk level")
    requires_approval: bool = Field(description="Whether approval is required")
    plan_hash: str = Field(description="Hash of the plan for integrity")
    approval_token: Optional[str] = Field(default=None, description="Approval token if required")
    created_at: str = Field(description="Creation timestamp")


class CreateActionResponse(BaseModel):
    """Response from action creation."""
    request_id: str = Field(description="Request identifier")
    status: str = Field(description="Processing status")
    plan: Optional[ActionPlanResponse] = Field(default=None, description="Generated action plan")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    processing_time_ms: float = Field(description="Processing time in milliseconds")


class ApproveActionRequest(BaseModel):
    """Request to approve an action."""
    approval_token: str = Field(description="Approval token from plan creation")
    approver_comment: Optional[str] = Field(default=None, max_length=500, description="Optional comment")


class ApproveActionResponse(BaseModel):
    """Response from action approval."""
    action_id: str = Field(description="Action identifier")
    status: str = Field(description="Approval status")
    approved_by: Optional[str] = Field(default=None, description="Approver ID")
    approved_at: Optional[str] = Field(default=None, description="Approval timestamp")
    error_message: Optional[str] = Field(default=None, description="Error if rejected")


class ExecuteActionRequest(BaseModel):
    """Request to execute an action."""
    mode: str = Field(default="simulate", description="Execution mode: simulate or execute")
    approval_token: Optional[str] = Field(default=None, description="Approval token for high-risk actions")
    idempotency_key: Optional[str] = Field(default=None, max_length=128, description="Idempotency key")


class StepExecutionResponse(BaseModel):
    """Response for a single step execution."""
    step_number: int = Field(description="Step number")
    tool_name: str = Field(description="Tool executed")
    status: str = Field(description="Execution status")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Execution result")
    error_message: Optional[str] = Field(default=None, description="Error if failed")
    execution_time_ms: float = Field(description="Execution time")


class ExecuteActionResponse(BaseModel):
    """Response from action execution."""
    action_id: str = Field(description="Action identifier")
    request_id: str = Field(description="Request identifier")
    status: str = Field(description="Execution status")
    mode: str = Field(description="Execution mode used")
    step_results: List[StepExecutionResponse] = Field(description="Results per step")
    total_execution_time_ms: float = Field(description="Total execution time")
    error_message: Optional[str] = Field(default=None, description="Error if failed")


class GetActionResponse(BaseModel):
    """Response for getting action details."""
    action_id: str = Field(description="Action identifier")
    status: str = Field(description="Current status")
    plan: Optional[ActionPlanResponse] = Field(default=None, description="Action plan")
    approval_status: Optional[str] = Field(default=None, description="Approval status")
    execution_result: Optional[Dict[str, Any]] = Field(default=None, description="Execution result")
    created_at: str = Field(description="Creation timestamp")


# =============================================================================
# In-memory storage for actions (in production, use database)
# =============================================================================

_actions_store: Dict[str, Dict[str, Any]] = {}


def _store_action(action_id: str, data: Dict[str, Any]) -> None:
    """Store action data."""
    _actions_store[action_id] = data


def _get_action(action_id: str) -> Optional[Dict[str, Any]]:
    """Get action data."""
    return _actions_store.get(action_id)


def _update_action(action_id: str, updates: Dict[str, Any]) -> None:
    """Update action data."""
    if action_id in _actions_store:
        _actions_store[action_id].update(updates)


# =============================================================================
# Dependencies
# =============================================================================

async def get_current_user_context() -> Dict[str, Any]:
    """Get current user context from request."""
    # TODO: Integrate with actual auth system
    return {
        "user_id": "user_placeholder",
        "tenant_id": "tenant_placeholder",
        "permissions": {"reports:read", "feature_flags:write"},
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.post(
    "/actions",
    response_model=CreateActionResponse,
    responses={
        200: {"description": "Action plan created successfully"},
        400: {"description": "Invalid request"},
        429: {"description": "Rate limit exceeded"},
        503: {"description": "AI service unavailable"},
    },
    summary="Create an action plan from intent",
    description="""
    Generate an action plan from a classified intent.
    
    The endpoint:
    1. Validates the intent
    2. Maps intent to Tool API operations
    3. Calculates risk levels
    4. Generates approval token if required
    
    High-risk actions require approval before execution.
    """,
)
async def create_action(
    request: CreateActionRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> CreateActionResponse:
    """Create an action plan from intent."""
    start_time = time.time()
    request_id = f"act_{uuid4().hex[:16]}"
    
    tenant_id = user_context.get("tenant_id", "unknown")
    user_id = user_context.get("user_id", "unknown")
    user_permissions: Set[str] = set(user_context.get("permissions", []))
    
    logger.info(
        f"Create action request received",
        extra={
            "request_id": request_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "intent_type": request.intent.intent_type,
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
            capability=AICapability.ACTIONS,
        )
    except KillSwitchActiveError as e:
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
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=create_error_response(
                code=AIErrorCode.RATE_LIMITED,
                message=str(e),
                request_id=request_id,
                retry_after=e.retry_after_seconds,
            ).model_dump(),
        )
    
    # Convert request intent to IntentOutput
    try:
        intent = IntentOutput(
            intent_type=IntentType(request.intent.intent_type),
            confidence=request.intent.confidence,
            entities=request.intent.entities,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message=f"Invalid intent type: {request.intent.intent_type}",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Create action plan
    try:
        planner = get_action_planner()
        result: ActionPlannerResult = await planner.create_plan(
            intent=intent,
            tenant_id=tenant_id,
            user_id=user_id,
            user_permissions=user_permissions,
            context=request.context,
        )
    except Exception as e:
        logger.error(f"Action planner error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                code=AIErrorCode.INFERENCE_ERROR,
                message=f"Failed to create action plan: {str(e)}",
                request_id=request_id,
            ).model_dump(),
        )
    
    processing_time_ms = (time.time() - start_time) * 1000
    
    # Handle different planner statuses
    if result.status == PlannerStatus.NO_ACTIONS_NEEDED:
        return CreateActionResponse(
            request_id=request_id,
            status="no_actions_needed",
            plan=None,
            processing_time_ms=processing_time_ms,
        )
    
    if result.status == PlannerStatus.PERMISSION_DENIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.PERMISSION_DENIED,
                message=result.error_message,
                details={"denied_permissions": result.denied_permissions},
                request_id=request_id,
            ).model_dump(),
        )
    
    if result.status == PlannerStatus.TENANT_VIOLATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.TENANT_VIOLATION,
                message=result.error_message,
                request_id=request_id,
            ).model_dump(),
        )
    
    if result.status in [PlannerStatus.ERROR, PlannerStatus.CIRCUIT_OPEN]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                code=AIErrorCode.INFERENCE_ERROR,
                message=result.error_message,
                request_id=request_id,
            ).model_dump(),
        )
    
    # Build response
    plan = result.plan
    approval_token = None
    
    # If approval required, generate token via approval gate
    if plan.requires_approval:
        approval_gate = get_approval_gate()
        approval_request = ApprovalRequest(
            action_id=plan.plan_id,
            action_plan=plan.to_dict(),
            risk_level=plan.overall_risk_level.value,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        approval_result = approval_gate.evaluate(approval_request)
        if approval_result.approval_token:
            approval_token = approval_result.approval_token.encode()
    
    # Store action for later retrieval
    _store_action(plan.plan_id, {
        "plan": plan,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "status": "pending_approval" if plan.requires_approval else "ready",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Build step responses
    step_responses = [
        ActionStepResponse(
            step_number=step.step_number,
            tool_name=step.tool_name,
            tool_schema_version=step.tool_schema_version,
            parameters=step.parameters,
            description=step.description,
            risk_level=step.risk_level.value,
            requires_approval=step.requires_approval,
        )
        for step in plan.steps
    ]
    
    plan_response = ActionPlanResponse(
        plan_id=plan.plan_id,
        status="pending_approval" if plan.requires_approval else "ready",
        steps=step_responses,
        overall_risk_level=plan.overall_risk_level.value,
        requires_approval=plan.requires_approval,
        plan_hash=plan.plan_hash,
        approval_token=approval_token,
        created_at=plan.created_at.isoformat(),
    )
    
    return CreateActionResponse(
        request_id=request_id,
        status="success",
        plan=plan_response,
        processing_time_ms=processing_time_ms,
    )


@router.get(
    "/actions/{action_id}",
    response_model=GetActionResponse,
    responses={
        200: {"description": "Action details retrieved"},
        404: {"description": "Action not found"},
    },
    summary="Get action details",
)
async def get_action(
    action_id: str = Path(..., description="Action identifier"),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> GetActionResponse:
    """Get details of an action."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    action_data = _get_action(action_id)
    if not action_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
            ).model_dump(),
        )
    
    # Check tenant access
    if action_data.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
            ).model_dump(),
        )
    
    plan: ActionPlan = action_data.get("plan")
    step_responses = [
        ActionStepResponse(
            step_number=step.step_number,
            tool_name=step.tool_name,
            tool_schema_version=step.tool_schema_version,
            parameters=step.parameters,
            description=step.description,
            risk_level=step.risk_level.value,
            requires_approval=step.requires_approval,
        )
        for step in plan.steps
    ] if plan else []
    
    plan_response = ActionPlanResponse(
        plan_id=plan.plan_id,
        status=action_data.get("status", "unknown"),
        steps=step_responses,
        overall_risk_level=plan.overall_risk_level.value,
        requires_approval=plan.requires_approval,
        plan_hash=plan.plan_hash,
        created_at=plan.created_at.isoformat(),
    ) if plan else None
    
    return GetActionResponse(
        action_id=action_id,
        status=action_data.get("status", "unknown"),
        plan=plan_response,
        approval_status=action_data.get("approval_status"),
        execution_result=action_data.get("execution_result"),
        created_at=action_data.get("created_at", ""),
    )


@router.post(
    "/actions/{action_id}/approve",
    response_model=ApproveActionResponse,
    responses={
        200: {"description": "Action approved"},
        400: {"description": "Invalid approval token"},
        404: {"description": "Action not found"},
    },
    summary="Approve an action",
)
async def approve_action(
    action_id: str = Path(..., description="Action identifier"),
    request: ApproveActionRequest = ...,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> ApproveActionResponse:
    """Approve an action for execution."""
    tenant_id = user_context.get("tenant_id", "unknown")
    user_id = user_context.get("user_id", "unknown")
    
    action_data = _get_action(action_id)
    if not action_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
            ).model_dump(),
        )
    
    # Check tenant access
    if action_data.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
            ).model_dump(),
        )
    
    plan: ActionPlan = action_data.get("plan")
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message="Action has no plan",
            ).model_dump(),
        )
    
    # Decode and validate approval token
    try:
        token = ApprovalToken.decode(request.approval_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.APPROVAL_INVALID,
                message=f"Invalid approval token: {str(e)}",
            ).model_dump(),
        )
    
    # Validate token against current plan
    validation = validate_approval_token(
        token=token,
        action_plan=plan.to_dict(),
        consume=True,
        expected_action_id=action_id,
    )
    
    if not validation.valid:
        error_code = AIErrorCode.APPROVAL_INVALID
        if validation.error_type == "expired":
            error_code = AIErrorCode.APPROVAL_EXPIRED
        elif validation.error_type == "plan_drift":
            error_code = AIErrorCode.PLAN_DRIFT
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=error_code,
                message=validation.error,
            ).model_dump(),
        )
    
    # Update action status
    _update_action(action_id, {
        "status": "approved",
        "approval_status": "approved",
        "approved_by": user_id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return ApproveActionResponse(
        action_id=action_id,
        status="approved",
        approved_by=user_id,
        approved_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/actions/{action_id}/execute",
    response_model=ExecuteActionResponse,
    responses={
        200: {"description": "Action executed"},
        400: {"description": "Invalid request"},
        403: {"description": "Approval required"},
        404: {"description": "Action not found"},
    },
    summary="Execute an action",
)
async def execute_action(
    action_id: str = Path(..., description="Action identifier"),
    request: ExecuteActionRequest = ...,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> ExecuteActionResponse:
    """Execute an action plan."""
    start_time = time.time()
    request_id = f"exec_{uuid4().hex[:16]}"
    
    tenant_id = user_context.get("tenant_id", "unknown")
    user_id = user_context.get("user_id", "unknown")
    
    action_data = _get_action(action_id)
    if not action_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Check tenant access
    if action_data.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Action {action_id} not found",
                request_id=request_id,
            ).model_dump(),
        )
    
    plan: ActionPlan = action_data.get("plan")
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message="Action has no plan",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Determine execution mode
    try:
        mode = ToolExecutionMode(request.mode)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message=f"Invalid execution mode: {request.mode}. Use 'simulate' or 'execute'",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Check phase allows execution
    config = get_ai_config()
    if mode == ToolExecutionMode.EXECUTE and config.phase != AIPhase.C:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.PHASE_BLOCKED,
                message=f"Execution not allowed in phase {config.phase.value}. Current phase is {config.phase.name}.",
                request_id=request_id,
            ).model_dump(),
        )
    
    # Execute the plan
    executor = get_executor()
    result: ExecutionResult = executor.execute_plan(
        plan=plan,
        mode=mode,
        approval_token=request.approval_token,
        idempotency_key=request.idempotency_key,
    )
    
    # Handle execution result
    if result.status == ExecutorStatus.PHASE_BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.PHASE_BLOCKED,
                message=result.error_message,
                request_id=request_id,
            ).model_dump(),
        )
    
    if result.status == ExecutorStatus.APPROVAL_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.APPROVAL_REQUIRED,
                message=result.error_message,
                request_id=request_id,
            ).model_dump(),
        )
    
    # Update action status
    _update_action(action_id, {
        "status": result.status.value,
        "execution_result": result.to_dict(),
    })
    
    # Build step results
    step_results = [
        StepExecutionResponse(
            step_number=sr.step_number,
            tool_name=sr.tool_name,
            status=sr.status,
            result=sr.tool_result.to_dict() if sr.tool_result else None,
            error_message=sr.error_message,
            execution_time_ms=sr.execution_time_ms,
        )
        for sr in result.step_results
    ]
    
    return ExecuteActionResponse(
        action_id=action_id,
        request_id=request_id,
        status=result.status.value,
        mode=mode.value,
        step_results=step_results,
        total_execution_time_ms=result.total_execution_time_ms,
        error_message=result.error_message,
    )
