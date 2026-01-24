"""EmailService for SMTP Email Integration"""

import asyncio
import logging
import time
import time
from datetime import datetime, timezone, timedelta, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Dict, Optional, Tuple

from aiosmtplib import SMTP
from aiosmtplib.errors import (
    SMTPAuthenticationError,
    SMTPConnectError,
    SMTPRecipientsRefused,
    SMTPServerDisconnected,
)
from sqlalchemy.orm import Session

from core.database import get_db
from core.models.email import SMTPEmailLog
from services.email_template_service import EmailTemplateService
from services.smtp_config_service import SMTPConfigService
from utils.background_task import tenant_task_async
from utils.email_monitoring import (
    email_metrics,
    log_email_operation,
    log_metrics_summary,
    log_smtp_connection_stats,
    mask_email,
    mask_smtp_config,
)

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP with retry logic and audit logging."""
    
    def __init__(
        self,
        db: Session,
        smtp_config_service: SMTPConfigService,
        template_service: EmailTemplateService
    ):
        self.db = db
        self.smtp_config_service = smtp_config_service
        self.template_service = template_service

    
    def queue_email(
        self,
        scenario: str,
        recipient: str,
        variables: Dict[str, str],
        tenant_id: str,
        language: str = "tr",
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> str:
        """Queue email for background sending with idempotency support.
        
        If idempotency_key is provided, checks for duplicate requests within 24 hours.
        Returns existing email_log_id if duplicate found.
        """
        # Check for duplicate request if idempotency_key provided
        if idempotency_key:
            existing = self.db.query(SMTPEmailLog).filter(
                SMTPEmailLog.tenant_id == tenant_id,
                SMTPEmailLog.idempotency_key == idempotency_key,
                SMTPEmailLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
            ).first()
            
            if existing:
                logger.info(
                    "Duplicate email request detected, returning existing log",
                    extra={
                        "email_log_id": existing.id,
                        "tenant_id": tenant_id,
                        "recipient": mask_email(recipient),
                        "idempotency_key": idempotency_key,
                        **({"request_id": request_id} if request_id else {})
                    }
                )
                return existing.id
        
        email_log = SMTPEmailLog(
            tenant_id=tenant_id,
            recipient=recipient,
            subject="",
            body_preview=None,
            status="pending",
            scenario=scenario,
            template_name=scenario,
            retry_count=0,
            idempotency_key=idempotency_key
        )
        
        self.db.add(email_log)
        self.db.flush()
        
        logger.info(
            "Email queued for sending",
            extra={
                "email_log_id": email_log.id,
                "tenant_id": tenant_id,
                "recipient": mask_email(recipient),
                "scenario": scenario,
                "idempotency_key": idempotency_key,
                **({"request_id": request_id} if request_id else {})
            }
        )
        
        return email_log.id

    async def test_connection(
        self, 
        smtp_config: dict, 
        request_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Test SMTP connection and authentication."""
        start_time = time.time()
        
        try:
            async with SMTP(
                hostname=smtp_config["host"],
                port=smtp_config["port"],
                use_tls=smtp_config["use_ssl"],
                timeout=smtp_config["timeout"]
            ) as smtp:
                if smtp_config["use_tls"] and not smtp_config["use_ssl"]:
                    await smtp.starttls()
                
                await smtp.login(smtp_config["username"], smtp_config["password"])
                
                connection_time_ms = (time.time() - start_time) * 1000
                
                log_smtp_connection_stats(
                    host=smtp_config["host"],
                    port=smtp_config["port"],
                    connection_time_ms=connection_time_ms,
                    success=True,
                    request_id=request_id
                )
                
                logger.info(
                    "SMTP connection test successful",
                    extra={
                        "host": smtp_config["host"],
                        "port": smtp_config["port"],
                        "connection_time_ms": round(connection_time_ms, 2),
                        **({"request_id": request_id} if request_id else {})
                    }
                )
                return True, "SMTP connection successful"
                
        except SMTPAuthenticationError as e:
            connection_time_ms = (time.time() - start_time) * 1000
            log_smtp_connection_stats(
                host=smtp_config["host"],
                port=smtp_config["port"],
                connection_time_ms=connection_time_ms,
                success=False,
                request_id=request_id
            )
            logger.warning(
                "SMTP authentication failed",
                extra={
                    "host": smtp_config["host"],
                    "port": smtp_config["port"],
                    "error_type": "SMTPAuthenticationError",
                    **({"request_id": request_id} if request_id else {})
                }
            )
            return False, "SMTP authentication failed. Please check username and password."
        except (SMTPConnectError, asyncio.TimeoutError) as e:
            connection_time_ms = (time.time() - start_time) * 1000
            log_smtp_connection_stats(
                host=smtp_config["host"],
                port=smtp_config["port"],
                connection_time_ms=connection_time_ms,
                success=False,
                request_id=request_id
            )
            logger.warning(
                "SMTP connection failed",
                extra={
                    "host": smtp_config["host"],
                    "port": smtp_config["port"],
                    "error_type": type(e).__name__,
                    **({"request_id": request_id} if request_id else {})
                }
            )
            return False, "Cannot connect to SMTP server. Please check host and port."
        except Exception as e:
            connection_time_ms = (time.time() - start_time) * 1000
            log_smtp_connection_stats(
                host=smtp_config["host"],
                port=smtp_config["port"],
                connection_time_ms=connection_time_ms,
                success=False,
                request_id=request_id
            )
            logger.error(
                "SMTP test failed with unexpected error",
                extra={
                    "host": smtp_config["host"],
                    "port": smtp_config["port"],
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    **({"request_id": request_id} if request_id else {})
                }
            )
            return False, f"SMTP test failed: {str(e)}"

    @tenant_task_async
    async def send_email_task(
        self,
        *,
        tenant_id: str,
        email_log_id: str,
        scenario: str,
        recipient: str,
        variables: Dict[str, str],
        language: str,
        request_id: Optional[str] = None
    ):
        """Background task for sending email with retry logic."""
        db = next(get_db())
        start_time = time.time()
        
        try:
            max_retries = 3
            retry_delays = [2, 4, 8]
            
            for attempt in range(max_retries + 1):
                try:
                    # Get SMTP configuration
                    smtp_config = self.smtp_config_service.get_config_with_decrypted_password(tenant_id)
                    
                    # Log masked config for debugging
                    logger.debug(
                        "Using SMTP configuration",
                        extra={
                            "smtp_config": mask_smtp_config(smtp_config),
                            "tenant_id": tenant_id,
                            "email_log_id": email_log_id,
                            **({"request_id": request_id} if request_id else {})
                        }
                    )
                    
                    # Render template
                    subject, html_body, text_body = self.template_service.render_template(
                        scenario, language, variables
                    )
                    
                    # Send email with timing
                    send_start = time.time()
                    await self._send_smtp(
                        smtp_config=smtp_config,
                        recipient=recipient,
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body,
                        request_id=request_id
                    )
                    send_duration_ms = (time.time() - send_start) * 1000
                    
                    # Update log as successful
                    self._update_email_log(
                        db,
                        email_log_id,
                        status="sent",
                        subject=subject,
                        body_preview=text_body[:500],
                        sent_at=datetime.now(timezone.utc),
                        retry_count=attempt
                    )
                    
                    # Record metrics
                    email_metrics.record_success(send_duration_ms, retry_count=attempt)
                    
                    total_duration_ms = (time.time() - start_time) * 1000
                    logger.info(
                        "Email sent successfully",
                        extra={
                            "email_log_id": email_log_id,
                            "tenant_id": tenant_id,
                            "recipient": mask_email(recipient),
                            "scenario": scenario,
                            "attempt": attempt + 1,
                            "send_duration_ms": round(send_duration_ms, 2),
                            "total_duration_ms": round(total_duration_ms, 2),
                            **({"request_id": request_id} if request_id else {})
                        }
                    )
                    
                    # Log metrics summary periodically
                    if email_metrics._metrics["emails_sent"] % 10 == 0:
                        log_metrics_summary(request_id)
                    
                    return
                    
                except (SMTPConnectError, SMTPServerDisconnected, asyncio.TimeoutError) as e:
                    error_type = type(e).__name__
                    
                    if attempt < max_retries:
                        delay = retry_delays[attempt]
                        logger.warning(
                            "Email send failed, retrying",
                            extra={
                                "email_log_id": email_log_id,
                                "tenant_id": tenant_id,
                                "recipient": mask_email(recipient),
                                "attempt": attempt + 1,
                                "max_retries": max_retries,
                                "retry_delay_seconds": delay,
                                "error_type": error_type,
                                "error_message": str(e),
                                **({"request_id": request_id} if request_id else {})
                            }
                        )
                        await asyncio.sleep(delay)
                    else:
                        # Max retries exhausted
                        self._update_email_log(
                            db,
                            email_log_id,
                            status="failed",
                            error_message=f"Max retries exhausted: {str(e)}",
                            retry_count=attempt
                        )
                        
                        # Record failure metrics
                        email_metrics.record_failure(error_type)
                        
                        total_duration_ms = (time.time() - start_time) * 1000
                        logger.error(
                            "Email send failed after max retries",
                            extra={
                                "email_log_id": email_log_id,
                                "tenant_id": tenant_id,
                                "recipient": mask_email(recipient),
                                "scenario": scenario,
                                "max_retries": max_retries,
                                "total_duration_ms": round(total_duration_ms, 2),
                                "error_type": error_type,
                                "error_message": str(e),
                                **({"request_id": request_id} if request_id else {})
                            }
                        )
                        
                        # Check for failure rate alert
                        if email_metrics.check_failure_rate_alert():
                            log_metrics_summary(request_id)
                        
                except (SMTPAuthenticationError, SMTPRecipientsRefused) as e:
                    error_type = type(e).__name__
                    
                    # Non-retryable errors
                    self._update_email_log(
                        db,
                        email_log_id,
                        status="failed",
                        error_message=f"Permanent error: {str(e)}",
                        retry_count=attempt
                    )
                    
                    # Record failure metrics
                    email_metrics.record_failure(error_type)
                    
                    total_duration_ms = (time.time() - start_time) * 1000
                    logger.error(
                        "Email send failed with permanent error",
                        extra={
                            "email_log_id": email_log_id,
                            "tenant_id": tenant_id,
                            "recipient": mask_email(recipient),
                            "scenario": scenario,
                            "attempt": attempt + 1,
                            "total_duration_ms": round(total_duration_ms, 2),
                            "error_type": error_type,
                            "error_message": str(e),
                            **({"request_id": request_id} if request_id else {})
                        }
                    )
                    
                    # Check for failure rate alert
                    if email_metrics.check_failure_rate_alert():
                        log_metrics_summary(request_id)
                    
                    return
                    
                except Exception as e:
                    error_type = type(e).__name__
                    
                    # Unexpected errors
                    self._update_email_log(
                        db,
                        email_log_id,
                        status="failed",
                        error_message=f"Unexpected error: {str(e)}",
                        retry_count=attempt
                    )
                    
                    # Record failure metrics
                    email_metrics.record_failure(error_type)
                    
                    total_duration_ms = (time.time() - start_time) * 1000
                    logger.exception(
                        "Unexpected error sending email",
                        extra={
                            "email_log_id": email_log_id,
                            "tenant_id": tenant_id,
                            "recipient": mask_email(recipient),
                            "scenario": scenario,
                            "attempt": attempt + 1,
                            "total_duration_ms": round(total_duration_ms, 2),
                            "error_type": error_type,
                            "error_message": str(e),
                            **({"request_id": request_id} if request_id else {})
                        }
                    )
                    
                    # Check for failure rate alert
                    if email_metrics.check_failure_rate_alert():
                        log_metrics_summary(request_id)
                    
                    return
        finally:
            db.close()

    async def _send_smtp(
        self,
        smtp_config: dict,
        recipient: str,
        subject: str,
        html_body: str,
        text_body: str,
        request_id: Optional[str] = None
    ):
        """Send email via SMTP using aiosmtplib."""
        connection_start = time.time()
        
        message = MIMEMultipart("alternative")
        message["From"] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
        message["To"] = recipient
        message["Subject"] = subject
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid()
        
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))
        
        async with SMTP(
            hostname=smtp_config["host"],
            port=smtp_config["port"],
            use_tls=smtp_config["use_ssl"],
            timeout=smtp_config["timeout"]
        ) as smtp:
            if smtp_config["use_tls"] and not smtp_config["use_ssl"]:
                await smtp.starttls()
            
            await smtp.login(smtp_config["username"], smtp_config["password"])
            
            connection_time_ms = (time.time() - connection_start) * 1000
            
            # Log connection stats
            log_smtp_connection_stats(
                host=smtp_config["host"],
                port=smtp_config["port"],
                connection_time_ms=connection_time_ms,
                success=True,
                request_id=request_id
            )
            
            await smtp.send_message(message)

    def _update_email_log(
        self,
        db: Session,
        email_log_id: str,
        status: str,
        subject: str = None,
        body_preview: str = None,
        sent_at: datetime = None,
        error_message: str = None,
        retry_count: int = 0
    ):
        """Update email log entry."""
        email_log = db.get(SMTPEmailLog, email_log_id)
        if email_log:
            email_log.status = status
            if subject:
                email_log.subject = subject
            if body_preview:
                email_log.body_preview = body_preview
            if sent_at:
                email_log.sent_at = sent_at
            if error_message:
                email_log.error_message = error_message
            email_log.retry_count = retry_count
            db.commit()
    
    def get_metrics(self) -> Dict:
        """Get current email metrics for monitoring."""
        return email_metrics.get_metrics()
    
    def reset_metrics(self):
        """Reset email metrics (for testing or periodic reset)."""
        email_metrics.reset()
        logger.info("Email metrics reset")
