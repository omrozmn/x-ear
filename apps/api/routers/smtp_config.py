"""
SMTP Configuration Router - FastAPI

This router handles SMTP email integration configuration endpoints.
Provides CRUD operations for tenant-specific SMTP configurations,
test email sending, and configuration validation.

Requirements:
- 1.5: Validate configuration by attempting test connection
- 8.4: Create or update SMTP configuration
- 8.5: Get active SMTP configuration
- 8.6: Send test email
- 17.1-17.3: Admin panel integration endpoints
- 17.8: Explicit operationId for Orval code generation
- 22.7: SMTP connection test before saving config
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope
from schemas.email import (
    SMTPConfigCreate,
    SMTPConfigResponse,
    SendTestEmailRequest,
    SendTestEmailResponse,
)
from services.email_service import EmailService
from services.email_template_service import EmailTemplateService
from services.encryption_service import EncryptionService
from services.smtp_config_service import SMTPConfigService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/integrations/smtp", tags=["SMTP Configuration"])


# ============================================================================
# Dependency Injection Helpers
# ============================================================================

def get_smtp_config_service(db: Session = Depends(get_db)) -> SMTPConfigService:
    """Get SMTPConfigService instance for dependency injection."""
    encryption_service = EncryptionService()
    return SMTPConfigService(db, encryption_service)


def get_email_service(
    db: Session = Depends(get_db),
    smtp_config_service: SMTPConfigService = Depends(get_smtp_config_service)
) -> EmailService:
    """Get EmailService instance for dependency injection."""
    template_service = EmailTemplateService()
    return EmailService(db, smtp_config_service, template_service)


# ============================================================================
# SMTP Configuration Endpoints
# ============================================================================

@router.post(
    "/config",
    response_model=ResponseEnvelope[SMTPConfigResponse],
    operation_id="createOrUpdateSMTPConfig",
    status_code=200
)
async def create_or_update_smtp_config(
    config: SMTPConfigCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.smtp.manage")),
    smtp_config_service: SMTPConfigService = Depends(get_smtp_config_service),
    email_service: EmailService = Depends(get_email_service)
) -> ResponseEnvelope[SMTPConfigResponse]:
    """
    Create or update SMTP configuration for current tenant.

    Password is encrypted before storage using AES-256-GCM.
    Configuration is validated by attempting a test connection.

    **Permissions Required:** `integrations.smtp.manage`

    **Request Body:**
    - host: SMTP server hostname or IP
    - port: SMTP server port (1-65535)
    - username: SMTP authentication username
    - password: SMTP authentication password (will be encrypted)
    - fromEmail: From email address
    - fromName: From display name
    - useTls: Use STARTTLS (default: false)
    - useSsl: Use SSL/TLS (default: true)
    - timeout: Connection timeout in seconds (5-120, default: 30)

    **Response:**
    - Returns the created/updated configuration (password excluded)
    - Returns 400 if validation fails
    - Returns 400 if SMTP connection test fails

    **Example:**
    ```json
    {
      "host": "mail.example.com",
      "port": 465,
      "username": "info@example.com",
      "password": "secret123",
      "fromEmail": "info@example.com",
      "fromName": "Example Company",
      "useSsl": true,
      "timeout": 30
    }
    ```
    """
    try:
        tenant_id = access.tenant_id

        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Tenant context required"
            )

        # Validate configuration fields
        config_dict = config.model_dump()
        is_valid, error_msg = smtp_config_service.validate_config(config_dict)
        if not is_valid:
            logger.warning(
                f"SMTP config validation failed for tenant {tenant_id}: {error_msg}"
            )
            return ResponseEnvelope.error(error_msg, status_code=400)

        # Create/update config (password will be encrypted)
        config_model = smtp_config_service.create_or_update_config(
            config_dict,
            tenant_id
        )

        # Test connection before committing
        test_config = smtp_config_service.get_config_with_decrypted_password(tenant_id)
        success, message = await email_service.test_connection(test_config)

        if not success:
            db.rollback()
            logger.error(
                f"SMTP connection test failed for tenant {tenant_id}: {message}"
            )
            return ResponseEnvelope.error(
                f"Configuration test failed: {message}",
                status_code=400
            )

        # Commit transaction
        db.commit()
        db.refresh(config_model)

        # Serialize response (password excluded by schema)
        response_data = SMTPConfigResponse.model_validate(config_model)

        logger.info(
            f"SMTP configuration saved successfully for tenant {tenant_id}",
            extra={"tenant_id": tenant_id, "config_id": config_model.id}
        )

        return ResponseEnvelope.success(
            response_data.model_dump(by_alias=True),
            message="SMTP configuration saved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating/updating SMTP config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save SMTP configuration: {str(e)}"
        )


@router.get(
    "/config",
    response_model=ResponseEnvelope[Optional[SMTPConfigResponse]],
    operation_id="getSMTPConfig",
    status_code=200
)
async def get_smtp_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.smtp.view")),
    smtp_config_service: SMTPConfigService = Depends(get_smtp_config_service)
) -> ResponseEnvelope[Optional[SMTPConfigResponse]]:
    """
    Get active SMTP configuration for current tenant.

    Password is never included in response for security.
    Returns null if no configuration exists (will use global fallback).

    **Permissions Required:** `integrations.smtp.view`

    **Response:**
    - Returns the active configuration (password excluded)
    - Returns null if no configuration exists

    **Example Response:**
    ```json
    {
      "success": true,
      "data": {
        "id": "config_123",
        "tenantId": "tenant_456",
        "host": "mail.example.com",
        "port": 465,
        "username": "info@example.com",
        "fromEmail": "info@example.com",
        "fromName": "Example Company",
        "useTls": false,
        "useSsl": true,
        "timeout": 30,
        "isActive": true,
        "createdAt": "2025-01-23T10:00:00Z",
        "updatedAt": "2025-01-23T10:00:00Z"
      }
    }
    ```
    """
    try:
        tenant_id = access.tenant_id

        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Tenant context required"
            )

        # Get active configuration
        config = smtp_config_service.get_active_config(tenant_id)

        if not config:
            logger.debug(f"No SMTP configuration found for tenant {tenant_id}")
            return ResponseEnvelope.success(
                None,
                message="No SMTP configuration found. Using global fallback."
            )

        # Serialize response (password excluded by schema)
        response_data = SMTPConfigResponse.model_validate(config)

        logger.debug(
            f"Retrieved SMTP configuration for tenant {tenant_id}",
            extra={"tenant_id": tenant_id, "config_id": config.id}
        )

        return ResponseEnvelope.success(response_data.model_dump(by_alias=True))

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving SMTP config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve SMTP configuration: {str(e)}"
        )


@router.post(
    "/test",
    response_model=ResponseEnvelope[SendTestEmailResponse],
    operation_id="sendTestEmail",
    status_code=202
)
async def send_test_email(
    request: SendTestEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.smtp.test")),
    smtp_config_service: SMTPConfigService = Depends(get_smtp_config_service),
    email_service: EmailService = Depends(get_email_service),
    idempotency_key: str = Header(None, alias="Idempotency-Key")
) -> ResponseEnvelope[SendTestEmailResponse]:
    """
    Send a test email to verify SMTP configuration.

    Uses a simple test template with current configuration.
    Email is sent asynchronously in the background.

    **Permissions Required:** `integrations.smtp.test`

    **Request Body:**
    - recipient: Email address to send test email to

    **Response:**
    - Returns 202 Accepted (email queued for sending)
    - Returns 404 if no SMTP configuration exists

    **Example Request:**
    ```json
    {
      "recipient": "test@example.com"
    }
    ```

    **Example Response:**
    ```json
    {
      "success": true,
      "data": {
        "success": true,
        "message": "Test email queued successfully",
        "sentAt": "2025-01-23T10:00:00Z"
      }
    }
    ```
    """
    try:
        tenant_id = access.tenant_id

        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Tenant context required"
            )

        # Check if SMTP config exists
        config = smtp_config_service.get_active_config(tenant_id)
        if not config:
            logger.warning(f"No SMTP configuration found for tenant {tenant_id}")
            return ResponseEnvelope.error(
                "No SMTP configuration found. Please configure SMTP first.",
                status_code=404
            )

        # Get user information for template variables
        user_name = getattr(access.user, 'full_name', None) or getattr(access.user, 'email', 'User')
        tenant_name = "X-Ear CRM"  # Default, could be fetched from tenant model

        # Queue email (creates log entry with idempotency support)
        email_log_id = email_service.queue_email(
            scenario="smtp_test",
            recipient=request.recipient,
            variables={
                "user_name": user_name,
                "tenant_name": tenant_name
            },
            tenant_id=tenant_id,
            language="tr",
            idempotency_key=idempotency_key
        )

        # Add background task (router manages BackgroundTasks lifecycle)
        # Note: send_email_task is decorated with @tenant_task, so tenant context
        # will be automatically set in the background task
        background_tasks.add_task(
            email_service.send_email_task,
            tenant_id=tenant_id,
            email_log_id=email_log_id,
            scenario="smtp_test",
            recipient=request.recipient,
            variables={
                "user_name": user_name,
                "tenant_name": tenant_name
            },
            language="tr"
        )

        logger.info(
            f"Test email queued for tenant {tenant_id}",
            extra={
                "tenant_id": tenant_id,
                "recipient": request.recipient,
                "email_log_id": email_log_id
            }
        )

        # Return immediate response (email will be sent in background)
        from datetime import datetime, timezone
        response_data = SendTestEmailResponse(
            success=True,
            message="Test email queued successfully",
            sent_at=datetime.now(timezone.utc)
        )

        return ResponseEnvelope.success(
            response_data.model_dump(by_alias=True),
            message="Test email queued successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error sending test email: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test email: {str(e)}"
        )
