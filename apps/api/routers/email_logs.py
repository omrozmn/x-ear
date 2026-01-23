"""
Email Logs Router - FastAPI

This router handles email log viewing and manual email sending endpoints.
Provides pagination, filtering, and tenant-isolated access to email logs.

Requirements:
- 9.1: GET /admin/integrations/smtp/logs endpoint with pagination
- 9.2: Pagination support (page, per_page, total, total_pages)
- 9.3: Filtering support (status, recipient, date_from, date_to)
- 9.4: Tenant isolation filtering
- 9.5: POST /admin/emails/send endpoint for manual email sending
- 9.6: require_access dependencies for permissions
- 17.4: Email logs endpoint for admin panel
- 17.5: Manual email sending endpoint
- 17.8: Explicit operationId for Orval code generation
- 18.2: Tenant isolation on email log queries
"""

import logging
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Header
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from database import get_db
from core.models.email import SMTPEmailLog
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope
from schemas.email import (
    EmailLogListRequest,
    EmailLogListResponse,
    EmailLogResponse,
    SendEmailRequest,
    SendEmailResponse,
)
from services.email_service import EmailService
from services.email_template_service import EmailTemplateService
from services.encryption_service import EncryptionService
from services.smtp_config_service import SMTPConfigService
from datetime import timedelta, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Email Logs"])


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
# Email Logs Endpoints
# ============================================================================

@router.get(
    "/integrations/smtp/logs",
    response_model=ResponseEnvelope[EmailLogListResponse],
    operation_id="getEmailLogs",
    status_code=200
)
async def get_email_logs(
    page: int = 1,
    per_page: int = Query(25, alias="perPage"),  # Accept perPage from query string
    status: Optional[str] = None,
    recipient: Optional[str] = None,
    date_from: Optional[datetime] = Query(None, alias="dateFrom"),
    date_to: Optional[datetime] = Query(None, alias="dateTo"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.smtp.logs.view"))
) -> ResponseEnvelope[EmailLogListResponse]:
    """
    Get email logs with pagination and filtering.
    
    Returns a paginated list of email logs for the current tenant.
    Supports filtering by status, recipient, and date range.
    
    **Permissions Required:** `integrations.smtp.logs.view`
    
    **Query Parameters:**
    - page: Page number (default: 1, min: 1)
    - perPage: Items per page (default: 25, min: 10, max: 100)
    - status: Filter by status (pending, sent, failed, bounced)
    - recipient: Filter by recipient email (partial match)
    - dateFrom: Filter by date from (ISO-8601 format)
    - dateTo: Filter by date to (ISO-8601 format)
    
    **Response:**
    - items: List of email logs
    - total: Total number of items matching filters
    - page: Current page number
    - perPage: Items per page
    - totalPages: Total number of pages
    
    **Example Response:**
    ```json
    {
      "success": true,
      "data": {
        "items": [
          {
            "id": "log_123",
            "tenantId": "tenant_456",
            "recipient": "user@example.com",
            "subject": "Password Reset Request",
            "bodyPreview": "You requested a password reset...",
            "status": "sent",
            "sentAt": "2025-01-23T10:00:00Z",
            "errorMessage": null,
            "retryCount": 0,
            "templateName": "password_reset",
            "scenario": "password_reset",
            "createdAt": "2025-01-23T09:59:00Z",
            "updatedAt": "2025-01-23T10:00:00Z"
          }
        ],
        "total": 150,
        "page": 1,
        "perPage": 25,
        "totalPages": 6
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
        
        # Validate pagination parameters
        if page < 1:
            raise HTTPException(
                status_code=400,
                detail="Page must be >= 1"
            )
        
        if not 10 <= per_page <= 100:
            raise HTTPException(
                status_code=400,
                detail="perPage must be between 10 and 100"
            )
        
        # Build query with tenant isolation
        query = db.query(SMTPEmailLog).filter(
            SMTPEmailLog.tenant_id == tenant_id
        )
        
        # Apply filters
        filters = []
        
        if status:
            filters.append(SMTPEmailLog.status == status)
        
        if recipient:
            # Partial match on recipient
            filters.append(SMTPEmailLog.recipient.ilike(f"%{recipient}%"))
        
        if date_from:
            filters.append(SMTPEmailLog.created_at >= date_from)
        
        if date_to:
            filters.append(SMTPEmailLog.created_at <= date_to)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Get total count
        total = query.count()
        
        # Calculate pagination
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        
        # Get paginated results (ordered by created_at desc)
        logs = query.order_by(SMTPEmailLog.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Serialize response
        items = [EmailLogResponse.model_validate(log) for log in logs]
        
        response_data = EmailLogListResponse(
            items=[item.model_dump(by_alias=True) for item in items],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
        logger.debug(
            f"Retrieved {len(logs)} email logs for tenant {tenant_id}",
            extra={
                "tenant_id": tenant_id,
                "page": page,
                "per_page": per_page,
                "total": total,
                "filters": {
                    "status": status,
                    "recipient": recipient,
                    "date_from": date_from,
                    "date_to": date_to
                }
            }
        )
        
        return ResponseEnvelope(
            success=True,
            data=response_data.model_dump(by_alias=True)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving email logs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve email logs: {str(e)}"
        )


@router.post(
    "/emails/send",
    response_model=ResponseEnvelope[SendEmailResponse],
    operation_id="sendManualEmail",
    status_code=202
)
async def send_manual_email(
    request: SendEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("emails.send")),
    smtp_config_service: SMTPConfigService = Depends(get_smtp_config_service),
    email_service: EmailService = Depends(get_email_service),
    idempotency_key: str = Header(None, alias="Idempotency-Key")
) -> ResponseEnvelope[SendEmailResponse]:
    """
    Send manual email to one or more recipients.
    
    Allows administrators to send custom emails using the configured SMTP settings.
    Emails are queued and sent asynchronously in the background.
    
    **Permissions Required:** `emails.send`
    
    **Request Body:**
    - recipients: List of email addresses (1-100)
    - subject: Email subject (1-500 characters)
    - bodyHtml: HTML email body (required)
    - bodyText: Plain text email body (optional, auto-generated if not provided)
    - templateName: Template name if using template (optional)
    - templateVariables: Template variables (optional)
    
    **Response:**
    - emailIds: List of email log IDs for tracking
    - queuedCount: Number of emails queued for sending
    - message: Status message
    - Returns 202 Accepted (emails queued for sending)
    - Returns 404 if no SMTP configuration exists
    
    **Example Request:**
    ```json
    {
      "recipients": ["user1@example.com", "user2@example.com"],
      "subject": "Important Announcement",
      "bodyHtml": "<h1>Hello</h1><p>This is an important announcement.</p>",
      "bodyText": "Hello\n\nThis is an important announcement."
    }
    ```
    
    **Example Response:**
    ```json
    {
      "success": true,
      "data": {
        "emailIds": ["log_123", "log_456"],
        "queuedCount": 2,
        "message": "2 emails queued successfully"
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
            raise HTTPException(
                status_code=404,
                detail="No SMTP configuration found. Please configure SMTP first."
            )
        
        # Validate recipients count
        if not request.recipients or len(request.recipients) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one recipient is required"
            )
        
        if len(request.recipients) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 recipients allowed"
            )
        
        # Generate plain text body if not provided
        body_text = request.body_text
        if not body_text:
            # Simple HTML to text conversion (strip tags)
            import re
            body_text = re.sub('<[^<]+?>', '', request.body_html)
        
        # Queue emails for each recipient
        email_ids = []
        
        for recipient in request.recipients:
            # Check for duplicate if idempotency_key provided
            if idempotency_key:
                existing = db.query(SMTPEmailLog).filter(
                    SMTPEmailLog.tenant_id == tenant_id,
                    SMTPEmailLog.idempotency_key == idempotency_key,
                    SMTPEmailLog.recipient == recipient,
                    SMTPEmailLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
                ).first()
                
                if existing:
                    email_ids.append(existing.id)
                    logger.info(
                        f"Duplicate manual email request detected",
                        extra={
                            "tenant_id": tenant_id,
                            "recipient": recipient,
                            "idempotency_key": idempotency_key,
                            "email_log_id": existing.id
                        }
                    )
                    continue
            
            # Create email log entry
            email_log = SMTPEmailLog(
                tenant_id=tenant_id,
                recipient=recipient,
                subject=request.subject,
                body_preview=body_text[:500] if body_text else None,
                status="pending",
                scenario="manual",
                template_name=request.template_name,
                retry_count=0,
                idempotency_key=idempotency_key
            )
            
            db.add(email_log)
            db.flush()
            
            email_ids.append(email_log.id)
            
            # Add background task for sending
            # Note: We'll need to create a simpler send method that doesn't use templates
            # For now, we'll use the existing send_email_task but with direct HTML/text
            background_tasks.add_task(
                _send_manual_email_task,
                tenant_id=tenant_id,
                email_log_id=email_log.id,
                recipient=recipient,
                subject=request.subject,
                html_body=request.body_html,
                text_body=body_text,
                smtp_config_service=smtp_config_service,
                email_service=email_service
            )
        
        # Commit all email log entries
        db.commit()
        
        logger.info(
            f"Manual emails queued for tenant {tenant_id}",
            extra={
                "tenant_id": tenant_id,
                "recipient_count": len(request.recipients),
                "email_ids": email_ids
            }
        )
        
        # Return response
        response_data = SendEmailResponse(
            email_ids=email_ids,
            queued_count=len(email_ids),
            message=f"{len(email_ids)} email(s) queued successfully"
        )
        
        return ResponseEnvelope(
            success=True,
            data=response_data.model_dump(by_alias=True),
            message=f"{len(email_ids)} email(s) queued successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Error sending manual email: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send manual email: {str(e)}"
        )


# ============================================================================
# Helper Functions
# ============================================================================

async def _send_manual_email_task(
    tenant_id: str,
    email_log_id: str,
    recipient: str,
    subject: str,
    html_body: str,
    text_body: str,
    smtp_config_service: SMTPConfigService,
    email_service: EmailService
):
    """
    Background task for sending manual email.
    
    This is a simplified version of send_email_task that doesn't use templates.
    """
    from database import get_db
    from datetime import timezone
    import asyncio
    from aiosmtplib.errors import (
        SMTPAuthenticationError,
        SMTPConnectError,
        SMTPRecipientsRefused,
        SMTPServerDisconnected,
    )
    
    db = next(get_db())
    
    try:
        max_retries = 3
        retry_delays = [2, 4, 8]
        
        for attempt in range(max_retries + 1):
            try:
                # Get SMTP config with decrypted password
                smtp_config = smtp_config_service.get_config_with_decrypted_password(tenant_id)
                
                # Send email
                await email_service._send_smtp(
                    smtp_config=smtp_config,
                    recipient=recipient,
                    subject=subject,
                    html_body=html_body,
                    text_body=text_body
                )
                
                # Update log as sent
                email_service._update_email_log(
                    db,
                    email_log_id,
                    status="sent",
                    subject=subject,
                    body_preview=text_body[:500],
                    sent_at=datetime.now(timezone.utc),
                    retry_count=attempt
                )
                
                logger.info(f"Manual email sent successfully: {email_log_id} (attempt {attempt + 1})")
                return
                
            except (SMTPConnectError, SMTPServerDisconnected, asyncio.TimeoutError) as e:
                # Retryable errors
                if attempt < max_retries:
                    delay = retry_delays[attempt]
                    logger.warning(f"Manual email send failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    email_service._update_email_log(
                        db,
                        email_log_id,
                        status="failed",
                        error_message=f"Max retries exhausted: {str(e)}",
                        retry_count=attempt
                    )
                    logger.error(f"Manual email send failed after {max_retries} retries: {email_log_id}")
                    
            except (SMTPAuthenticationError, SMTPRecipientsRefused) as e:
                # Non-retryable errors
                email_service._update_email_log(
                    db,
                    email_log_id,
                    status="failed",
                    error_message=f"Permanent error: {str(e)}",
                    retry_count=attempt
                )
                logger.error(f"Manual email send failed with permanent error: {email_log_id}")
                return
                
            except Exception as e:
                email_service._update_email_log(
                    db,
                    email_log_id,
                    status="failed",
                    error_message=f"Unexpected error: {str(e)}",
                    retry_count=attempt
                )
                logger.exception(f"Unexpected error sending manual email: {email_log_id}")
                return
    finally:
        db.close()
