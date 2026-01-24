"""Tool API endpoint for AI Layer email notifications.

This module provides a secure interface for the AI Layer to request email
notifications without direct access to Email_Service or core business logic.

Key Features:
- Permission allowlist validation
- Quota enforcement (max 100 per hour per tenant)
- Action plan hash logging for audit
- Fail-safe error handling (errors don't cascade to AI)
- Complete isolation from core services
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from pydantic import EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.models.email import SMTPEmailLog
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import AppBaseModel, ResponseEnvelope
from services.email_service import EmailService
from services.email_template_service import EmailTemplateService
from services.smtp_config_service import SMTPConfigService
from services.encryption_service import EncryptionService
from services.ai_email_safety_service import get_ai_email_safety_service
from services.email_approval_service import get_email_approval_service
from services.rate_limit_service import get_rate_limit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tool-api/email", tags=["tool-api"])


# Schemas
class ToolAPIEmailRequest(AppBaseModel):
    """Request schema for AI Layer email notifications."""
    
    scenario: str = Field(
        ...,
        description="Email scenario (must be in allowlist)",
        min_length=1,
        max_length=100
    )
    recipient: EmailStr = Field(..., description="Email recipient")
    variables: Dict[str, str] = Field(
        default_factory=dict,
        description="Template variables"
    )
    language: str = Field(default="tr", description="Email language (tr/en)")
    action_plan_hash: str = Field(
        ...,
        description="Hash of AI action plan for audit trail",
        min_length=1,
        max_length=255
    )


class ToolAPIEmailResponse(AppBaseModel):
    """Response schema for AI Layer email notifications."""
    
    email_log_id: str = Field(..., description="Email log ID for tracking")
    queued: bool = Field(..., description="Whether email was queued successfully")
    message: str = Field(..., description="Status message")


# Permission allowlist for AI email scenarios
AI_EMAIL_SCENARIO_ALLOWLIST = {
    "ai_proposal_created",
    "ai_execution_approval",
    "ai_action_completed",
    "ai_quota_exceeded",
    "ai_error_notification"
}


def _check_quota(tenant_id: str, db: Session) -> tuple[bool, str]:
    """Check if tenant has exceeded AI email quota.
    
    During warm-up (first 14 days), AI emails are limited to 10 per hour.
    After warm-up, limit is 100 per hour.
    
    Args:
        tenant_id: Tenant ID to check quota for
        db: Database session
        
    Returns:
        Tuple of (within_quota, error_message)
    """
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    
    # Count AI emails sent in last hour
    count = db.query(func.count(SMTPEmailLog.id)).filter(
        SMTPEmailLog.tenant_id == tenant_id,
        SMTPEmailLog.scenario.in_(AI_EMAIL_SCENARIO_ALLOWLIST),
        SMTPEmailLog.created_at >= one_hour_ago
    ).scalar()
    
    # Check warm-up status
    rate_limit_service = get_rate_limit_service(db)
    warmup_phase = rate_limit_service.get_current_warmup_phase()
    
    # Stricter limits during warm-up
    if warmup_phase != "COMPLETE":
        ai_limit = 10  # 10 per hour during warm-up
        if count >= ai_limit:
            return False, f"AI email quota exceeded during warm-up ({ai_limit} per hour)"
    else:
        ai_limit = 100  # 100 per hour after warm-up
        if count >= ai_limit:
            return False, f"AI email quota exceeded ({ai_limit} per hour)"
    
    return True, ""


def _log_ai_email_request(
    tenant_id: str,
    scenario: str,
    recipient: str,
    action_plan_hash: str,
    success: bool,
    error_message: str = None
):
    """Log AI email request for audit trail.
    
    This is a fail-safe logging function that never raises exceptions.
    """
    try:
        logger.info(
            "AI email request",
            extra={
                "tenant_id": tenant_id,
                "scenario": scenario,
                "recipient": recipient,
                "action_plan_hash": action_plan_hash,
                "success": success,
                "error_message": error_message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        # Fail-safe: log error but don't raise
        logger.error(f"Failed to log AI email request: {e}")


@router.post(
    "/notify",
    response_model=ResponseEnvelope[ToolAPIEmailResponse],
    operation_id="sendAIEmailNotification",
    summary="Send email notification from AI Layer",
    description=(
        "Allows AI Layer to request email notifications through a secure, "
        "validated interface. Enforces permission allowlist and quota limits."
    )
)
async def send_ai_email_notification(
    request: ToolAPIEmailRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
) -> ResponseEnvelope[ToolAPIEmailResponse]:
    """Send email notification from AI Layer.
    
    This endpoint provides a secure interface for the AI Layer to request
    email notifications without direct access to Email_Service.
    
    Security Features:
    - Scenario must be in allowlist
    - Quota enforcement (100 per hour per tenant)
    - Action plan hash logging for audit
    - Fail-safe error handling (errors don't cascade to AI)
    
    Args:
        request: Email notification request
        background_tasks: FastAPI background tasks
        db: Database session
        access: Unified access context with tenant_id
        
    Returns:
        ResponseEnvelope with email log ID and status
    """
    tenant_id = access.tenant_id
    
    # Log request for audit (fail-safe)
    _log_ai_email_request(
        tenant_id=tenant_id,
        scenario=request.scenario,
        recipient=request.recipient,
        action_plan_hash=request.action_plan_hash,
        success=False  # Will update to True if successful
    )
    
    try:
        # Validate scenario against allowlist
        if request.scenario not in AI_EMAIL_SCENARIO_ALLOWLIST:
            error_msg = (
                f"Scenario '{request.scenario}' not in AI email allowlist. "
                f"Allowed scenarios: {', '.join(sorted(AI_EMAIL_SCENARIO_ALLOWLIST))}"
            )
            logger.warning(
                f"AI email request rejected: {error_msg}",
                extra={
                    "tenant_id": tenant_id,
                    "scenario": request.scenario,
                    "action_plan_hash": request.action_plan_hash
                }
            )
            
            # Return error but don't cascade to AI Layer
            response.status_code = 400
            return ResponseEnvelope(
                success=False,
                error={"message": error_msg, "code": "INVALID_SCENARIO"},
                message=error_msg
            )
        
        # Check quota
        within_quota, quota_error = _check_quota(tenant_id, db)
        if not within_quota:
            logger.warning(
                f"AI email quota exceeded",
                extra={
                    "tenant_id": tenant_id,
                    "scenario": request.scenario,
                    "action_plan_hash": request.action_plan_hash
                }
            )
            
            # Return error but don't cascade to AI Layer
            response.status_code = 429
            return ResponseEnvelope(
                success=False,
                error={"message": quota_error, "code": "QUOTA_EXCEEDED"},
                message=quota_error
            )
        
        # Initialize services
        encryption_service = EncryptionService()
        smtp_config_service = SMTPConfigService(db, encryption_service)
        template_service = EmailTemplateService()
        email_service = EmailService(db, smtp_config_service, template_service)
        ai_safety_service = get_ai_email_safety_service()
        approval_service = get_email_approval_service(db)
        
        # Render template to get email content for AI safety check
        template = template_service.get_template(request.scenario, request.language)
        if not template:
            error_msg = f"Email template not found for scenario: {request.scenario}"
            logger.error(error_msg, extra={"tenant_id": tenant_id, "scenario": request.scenario})
            response.status_code = 404
            return ResponseEnvelope(
                success=False,
                error={"message": error_msg, "code": "TEMPLATE_NOT_FOUND"},
                message=error_msg
            )
        
        # Render subject and body
        subject = template_service.render_template(template.subject, request.variables)
        body_text = template_service.render_template(template.body_text, request.variables)
        body_html = template_service.render_template(template.body_html, request.variables) if template.body_html else None
        
        # AI safety check
        requires_approval, risk_level, risk_reasons = approval_service.requires_approval(
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            scenario=request.scenario
        )
        
        # If HIGH or CRITICAL risk, create approval request and block sending
        if requires_approval:
            approval = approval_service.create_approval_request(
                tenant_id=tenant_id,
                recipient=request.recipient,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                scenario=request.scenario,
                action_plan_hash=request.action_plan_hash
            )
            
            logger.warning(
                f"AI email requires approval due to {risk_level} risk",
                extra={
                    "tenant_id": tenant_id,
                    "scenario": request.scenario,
                    "action_plan_hash": request.action_plan_hash,
                    "approval_id": approval.id,
                    "risk_level": risk_level,
                    "risk_reasons": risk_reasons
                }
            )
            
            # Return success but indicate approval required
            response.status_code = 202  # Accepted but not processed
            return ResponseEnvelope(
                success=True,
                data=ToolAPIEmailResponse(
                    email_log_id=approval.id,  # Use approval ID as tracking ID
                    queued=False,
                    message=f"Email requires manual approval due to {risk_level} risk. Approval ID: {approval.id}"
                ),
                message="Email requires manual approval"
            )
        
        # Queue email
        email_log_id = email_service.queue_email(
            scenario=request.scenario,
            recipient=request.recipient,
            variables=request.variables,
            tenant_id=tenant_id,
            language=request.language
        )
        
        # Add background task for sending
        # Note: send_email_task is decorated with @tenant_task_async
        # We use a lambda to ensure all arguments are keyword-only
        background_tasks.add_task(
            lambda: email_service.send_email_task(
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                scenario=request.scenario,
                recipient=request.recipient,
                variables=request.variables,
                language=request.language
            )
        )
        
        # Commit transaction
        db.commit()
        
        # Log success
        _log_ai_email_request(
            tenant_id=tenant_id,
            scenario=request.scenario,
            recipient=request.recipient,
            action_plan_hash=request.action_plan_hash,
            success=True
        )
        
        response_data = ToolAPIEmailResponse(
            email_log_id=email_log_id,
            queued=True,
            message=f"Email notification queued successfully for scenario: {request.scenario}"
        )
        
        return ResponseEnvelope(
            success=True,
            data=response_data,
            message="AI email notification queued"
        )
        
    except Exception as e:
        # Fail-safe: log error but return graceful response to AI Layer
        error_msg = f"Failed to queue AI email notification: {str(e)}"
        logger.error(
            error_msg,
            extra={
                "tenant_id": tenant_id,
                "scenario": request.scenario,
                "action_plan_hash": request.action_plan_hash,
                "error": str(e)
            },
            exc_info=True
        )
        
        # Log failure
        _log_ai_email_request(
            tenant_id=tenant_id,
            scenario=request.scenario,
            recipient=request.recipient,
            action_plan_hash=request.action_plan_hash,
            success=False,
            error_message=str(e)
        )
        
        # Return error but don't cascade to AI Layer
        # Use 500 status but with graceful message
        response.status_code = 500
        return ResponseEnvelope(
            success=False,
            error={"message": "Email notification service temporarily unavailable", "code": "SERVICE_ERROR"},
            message="Email notification service temporarily unavailable"
        )
