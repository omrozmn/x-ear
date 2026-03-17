"""
AI Admin Endpoints

POST /ai/admin/kill-switch - Manage kill switch
GET /ai/admin/pending-approvals - Get pending approvals queue

Admin-only endpoints for AI management.

Requirements:
- 15.3: Kill_Switch with three scopes: global, tenant-level, capability-level
- 15.4: WHEN Kill_Switch is activated, reject all new requests immediately
- 8.7: Admin panel provides queue view of pending AI approvals
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, Field
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ai.config import get_ai_config
from ai.services.kill_switch import (
    get_kill_switch,
    KillSwitchState,
    KillSwitchScope,
    AICapability,
)
from ai.services.approval_gate import (
    get_approval_gate,
)
from ai.api.errors import AIErrorCode, create_error_response
from database import get_db

logger = logging.getLogger(__name__)
from core.security import get_jwt_secret, JWT_ALGORITHM
SECRET_KEY = get_jwt_secret()
ALGORITHM = JWT_ALGORITHM

router = APIRouter(prefix="/ai/admin", tags=["AI Admin"])


# =============================================================================
# Request/Response Models
# =============================================================================

class KillSwitchRequest(BaseModel):
    """Request to activate/deactivate kill switch."""
    action: str = Field(description="Action: activate or deactivate")
    scope: str = Field(description="Scope: global, tenant, or capability")
    target_id: Optional[str] = Field(
        default=None,
        description="Target ID (tenant_id for tenant scope, capability name for capability scope)"
    )
    reason: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Reason for activation (required for activate)"
    )


class KillSwitchResponse(BaseModel):
    """Response from kill switch operation."""
    success: bool = Field(description="Whether operation succeeded")
    scope: str = Field(description="Scope affected")
    target_id: Optional[str] = Field(default=None, description="Target ID if applicable")
    active: bool = Field(description="Whether kill switch is now active")
    activated_by: Optional[str] = Field(default=None, description="User who activated")
    activated_at: Optional[str] = Field(default=None, description="Activation timestamp")
    reason: Optional[str] = Field(default=None, description="Activation reason")


class KillSwitchStatusResponse(BaseModel):
    """Kill switch status response."""
    global_switch: Dict[str, Any] = Field(description="Global kill switch status")
    tenant_switches: List[Dict[str, Any]] = Field(description="Tenant kill switches")
    capability_switches: List[Dict[str, Any]] = Field(description="Capability kill switches")
    any_active: bool = Field(description="Whether any kill switch is active")


class PendingApprovalResponse(BaseModel):
    """Pending approval item."""
    id: str = Field(description="Queue item ID")
    action_id: str = Field(description="Action ID")
    risk_level: str = Field(description="Risk level")
    risk_reasoning: Optional[str] = Field(default=None, description="Risk reasoning")
    tenant_id: str = Field(description="Tenant ID")
    user_id: str = Field(description="Requesting user ID")
    created_at: str = Field(description="Creation timestamp")
    expires_at: str = Field(description="Expiration timestamp")
    status: str = Field(description="Current status")


class PendingApprovalsListResponse(BaseModel):
    """List of pending approvals."""
    items: List[PendingApprovalResponse] = Field(description="Pending approvals")
    total: int = Field(description="Total count")


class AiSettingsResponse(BaseModel):
    """AI settings response."""
    enabled: bool = Field(description="Whether AI is enabled")
    phase: str = Field(description="Current phase")
    model_provider: str = Field(description="Model provider")
    model_id: str = Field(description="Model ID")
    rate_limit_per_minute: int = Field(description="Rate limit per minute")
    default_quota: int = Field(description="Default quota per period")


# =============================================================================
# Dependencies
# =============================================================================

async def get_admin_user_context(request: Request) -> Dict[str, Any]:
    """
    Get admin user context from request.
    
    In production, this should verify admin permissions.
    """
    # TODO: Integrate with actual auth system and verify admin role
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)
    access_context = getattr(request.state, "access_context", None)

    if access_context:
        tenant_id = tenant_id or getattr(access_context, "tenant_id", None)
        user_id = user_id or getattr(access_context, "user_id", None)
    is_super_admin = bool(getattr(access_context, "is_super_admin", False))

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            tenant_id = tenant_id or payload.get("tenant_id")
            user_id = user_id or payload.get("sub")
            is_super_admin = is_super_admin or payload.get("role") == "super_admin" or bool(payload.get("is_admin"))
        except JWTError:
            logger.warning("AI admin fallback JWT decode failed")

    return {
        "user_id": user_id or "admin_placeholder",
        "tenant_id": tenant_id,
        "is_admin": True,
        "is_super_admin": is_super_admin,
    }


async def require_admin(
    user_context: Dict[str, Any] = Depends(get_admin_user_context),
) -> Dict[str, Any]:
    """Require admin permissions."""
    if not user_context.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=create_error_response(
                code=AIErrorCode.PERMISSION_DENIED,
                message="Admin permissions required",
            ).model_dump(),
        )
    return user_context


# =============================================================================
# Kill Switch Endpoints
# =============================================================================

@router.post(
    "/kill-switch",
    response_model=KillSwitchResponse,
    responses={
        200: {"description": "Kill switch operation successful"},
        400: {"description": "Invalid request"},
        403: {"description": "Admin permissions required"},
    },
    summary="Manage kill switch",
    description="""
    Activate or deactivate the AI kill switch.
    
    Scopes:
    - global: Affects all tenants and capabilities
    - tenant: Affects a specific tenant (requires target_id)
    - capability: Affects a specific capability (requires target_id: chat, actions, ocr, all)
    
    When activated, all new AI requests for the affected scope are rejected immediately.
    """,
)
async def manage_kill_switch(
    request: KillSwitchRequest,
    user_context: Dict[str, Any] = Depends(require_admin),
) -> KillSwitchResponse:
    """Activate or deactivate kill switch."""
    user_id = user_context.get("user_id", "unknown")
    
    kill_switch = get_kill_switch()
    
    # Validate action
    if request.action not in ["activate", "deactivate"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message="Action must be 'activate' or 'deactivate'",
            ).model_dump(),
        )
    
    # Validate scope
    try:
        scope = KillSwitchScope(request.scope)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message=f"Invalid scope: {request.scope}. Use 'global', 'tenant', or 'capability'",
            ).model_dump(),
        )
    
    # Validate target_id for non-global scopes
    if scope != KillSwitchScope.GLOBAL and not request.target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message=f"target_id is required for {scope.value} scope",
            ).model_dump(),
        )
    
    # Validate reason for activation
    if request.action == "activate" and not request.reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=create_error_response(
                code=AIErrorCode.INVALID_REQUEST,
                message="reason is required for activation",
            ).model_dump(),
        )
    
    # Execute operation
    state: KillSwitchState
    
    if scope == KillSwitchScope.GLOBAL:
        if request.action == "activate":
            state = kill_switch.activate_global(user_id=user_id, reason=request.reason)
        else:
            state = kill_switch.deactivate_global(user_id=user_id)
    
    elif scope == KillSwitchScope.TENANT:
        if request.action == "activate":
            state = kill_switch.activate_tenant(
                tenant_id=request.target_id,
                user_id=user_id,
                reason=request.reason,
            )
        else:
            state = kill_switch.deactivate_tenant(
                tenant_id=request.target_id,
                user_id=user_id,
            )
    
    elif scope == KillSwitchScope.CAPABILITY:
        try:
            capability = AICapability(request.target_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=create_error_response(
                    code=AIErrorCode.INVALID_REQUEST,
                    message=f"Invalid capability: {request.target_id}. Use 'chat', 'actions', 'ocr', or 'all'",
                ).model_dump(),
            )
        
        if request.action == "activate":
            state = kill_switch.activate_capability(
                capability=capability,
                user_id=user_id,
                reason=request.reason,
            )
        else:
            state = kill_switch.deactivate_capability(
                capability=capability,
                user_id=user_id,
            )
    
    return KillSwitchResponse(
        success=True,
        scope=scope.value,
        target_id=request.target_id,
        active=state.active,
        activated_by=state.activated_by,
        activated_at=state.activated_at.isoformat() if state.activated_at else None,
        reason=state.reason,
    )


@router.get(
    "/kill-switch",
    response_model=KillSwitchStatusResponse,
    responses={
        200: {"description": "Kill switch status retrieved"},
        403: {"description": "Admin permissions required"},
    },
    summary="Get kill switch status",
)
async def get_kill_switch_status(
    user_context: Dict[str, Any] = Depends(require_admin),
) -> KillSwitchStatusResponse:
    """Get current kill switch status."""
    kill_switch = get_kill_switch()
    
    # Global switch
    global_state = kill_switch.get_global_state()
    global_switch = {
        "active": global_state.active,
        "activated_by": global_state.activated_by,
        "activated_at": global_state.activated_at.isoformat() if global_state.activated_at else None,
        "reason": global_state.reason,
    }
    
    # Tenant switches
    tenant_states = kill_switch.get_all_tenant_states()
    tenant_switches = [
        {
            "tenant_id": tenant_id,
            "active": state.active,
            "activated_by": state.activated_by,
            "activated_at": state.activated_at.isoformat() if state.activated_at else None,
            "reason": state.reason,
        }
        for tenant_id, state in tenant_states.items()
        if state.active
    ]
    
    # Capability switches
    capability_states = kill_switch.get_all_capability_states()
    capability_switches = [
        {
            "capability": cap.value,
            "active": state.active,
            "activated_by": state.activated_by,
            "activated_at": state.activated_at.isoformat() if state.activated_at else None,
            "reason": state.reason,
        }
        for cap, state in capability_states.items()
        if state.active
    ]
    
    return KillSwitchStatusResponse(
        global_switch=global_switch,
        tenant_switches=tenant_switches,
        capability_switches=capability_switches,
        any_active=kill_switch.is_any_active(),
    )


# =============================================================================
# Approval Queue Endpoints
# =============================================================================

@router.get(
    "/pending-approvals",
    response_model=PendingApprovalsListResponse,
    responses={
        200: {"description": "Pending approvals retrieved"},
        403: {"description": "Admin permissions required"},
    },
    summary="Get pending approvals queue",
    description="Get list of AI actions pending approval.",
)
async def get_pending_approvals(
    tenant_id: Optional[str] = Query(default=None, description="Filter by tenant ID"),
    user_context: Dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PendingApprovalsListResponse:
    """Get pending approvals queue."""
    try:
        from ai.models.ai_action import AIAction, ActionStatus

        query = db.query(AIAction).filter(AIAction.status == ActionStatus.PENDING_APPROVAL.value)
        if tenant_id:
            query = query.filter(AIAction.tenant_id == tenant_id)
        elif not user_context.get("is_super_admin") and user_context.get("tenant_id"):
            query = query.filter(AIAction.tenant_id == user_context["tenant_id"])

        pending = query.order_by(AIAction.created_at.desc()).limit(100).all()
    except Exception:
        approval_gate = get_approval_gate()
        pending = approval_gate.get_pending_approvals(tenant_id=tenant_id)

    items = [
        PendingApprovalResponse(
            id=item.id,
            action_id=getattr(item, "action_id", None) or item.id,
            risk_level=item.risk_level,
            risk_reasoning=getattr(item, "risk_reasoning", None),
            tenant_id=item.tenant_id,
            user_id=item.user_id,
            created_at=item.created_at.isoformat(),
            expires_at=(
                getattr(item, "expires_at", None) or getattr(item, "approval_expires_at", None) or item.created_at
            ).isoformat(),
            status=getattr(item.status, "value", item.status),
        )
        for item in pending
    ]
    
    return PendingApprovalsListResponse(
        items=items,
        total=len(items),
    )


@router.post(
    "/cleanup-expired",
    responses={
        200: {"description": "Cleanup completed"},
        403: {"description": "Admin permissions required"},
    },
    summary="Cleanup expired approvals",
    description="Remove expired pending approvals from the queue.",
)
async def cleanup_expired_approvals(
    user_context: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """Cleanup expired pending approvals."""
    approval_gate = get_approval_gate()
    
    cleaned = approval_gate.cleanup_expired()
    
    return {
        "success": True,
        "cleaned_count": cleaned,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Settings Endpoints
# =============================================================================

@router.get(
    "/settings",
    response_model=AiSettingsResponse,
    responses={
        200: {"description": "Settings retrieved"},
        403: {"description": "Admin permissions required"},
    },
    summary="Get AI settings",
)
async def get_ai_settings(
    user_context: Dict[str, Any] = Depends(require_admin),
) -> AiSettingsResponse:
    """Get current AI settings."""
    config = get_ai_config()
    
    return AiSettingsResponse(
        enabled=config.enabled,
        phase=config.phase.name,
        model_provider=config.model.provider,
        model_id=config.model.ai_model_id,
        rate_limit_per_minute=config.quota.rate_limit_per_minute,
        default_quota=config.quota.default_requests_per_period,
    )
