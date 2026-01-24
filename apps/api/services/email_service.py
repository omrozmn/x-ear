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


# Scenario classification for unsubscribe management
PROMOTIONAL_SCENARIOS = {
    "invoice_created",
    "system_notification",
    "marketing_campaign",
    "newsletter",
    "product_update"
}

TRANSACTIONAL_SCENARIOS = {
    "password_reset",
    "user_invite",
    "email_verification",
    "smtp_test",
    "system_error"
}


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
        
        Checks:
        - Bounce blacklist
        - Unsubscribe preferences
        - Rate limits
        """
        # Import services here to avoid circular imports
        from services.bounce_handler_service import get_bounce_handler_service
        from services.unsubscribe_service import get_unsubscribe_service
        from services.rate_limit_service import get_rate_limit_service
        
        # Check bounce blacklist
        bounce_service = get_bounce_handler_service(self.db)
        if bounce_service.is_blacklisted(recipient, tenant_id):
            logger.warning(
                "Email rejected: recipient is blacklisted",
                extra={
                    "tenant_id": tenant_id,
                    "recipient": mask_email(recipient),
                    "scenario": scenario,
                    **({"request_id": request_id} if request_id else {})
                }
            )
            raise ValueError(f"Recipient {recipient} is blacklisted due to hard bounces")
        
        # Check unsubscribe preferences
        unsubscribe_service = get_unsubscribe_service(self.db)
        if unsubscribe_service.is_unsubscribed(recipient, tenant_id, scenario):
            logger.info(
                "Email skipped: recipient unsubscribed",
                extra={
                    "tenant_id": tenant_id,
                    "recipient": mask_email(recipient),
                    "scenario": scenario,
                    **({"request_id": request_id} if request_id else {})
                }
            )
            # Return a special status instead of raising error
            raise ValueError(f"Recipient {recipient} has unsubscribed from {scenario} emails")
        
        # Check rate limits
        rate_limit_service = get_rate_limit_service(self.db)
        can_send, reason = rate_limit_service.check_rate_limit(tenant_id)
        if not can_send:
            logger.warning(
                "Email rejected: rate limit exceeded",
                extra={
                    "tenant_id": tenant_id,
                    "recipient": mask_email(recipient),
                    "scenario": scenario,
                    "reason": reason,
                    **({"request_id": request_id} if request_id else {})
                }
            )
            raise ValueError(f"Rate limit exceeded: {reason}")
        
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
        
        # Determine if email is promotional
        is_promotional = scenario in PROMOTIONAL_SCENARIOS
        
        # Generate unsubscribe token for promotional emails
        unsubscribe_token = None
        if is_promotional:
            unsubscribe_service = get_unsubscribe_service(self.db)
            _, unsubscribe_token = unsubscribe_service.generate_unsubscribe_link(
                recipient=recipient,
                tenant_id=tenant_id,
                scenario=scenario
            )
        
        email_log = SMTPEmailLog(
            tenant_id=tenant_id,
            recipient=recipient,
            subject="",
            body_preview=None,
            status="pending",
            scenario=scenario,
            template_name=scenario,
            retry_count=0,
            idempotency_key=idempotency_key,
            is_promotional=is_promotional,
            unsubscribe_token=unsubscribe_token
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
                    
                    # Get email log to check if promotional
                    email_log = db.get(SMTPEmailLog, email_log_id)
                    
                    # Inject unsubscribe link for promotional emails
                    if email_log and email_log.is_promotional and email_log.unsubscribe_token:
                        from services.unsubscribe_service import get_unsubscribe_service
                        unsubscribe_service = get_unsubscribe_service(db)
                        
                        # Generate unsubscribe URL
                        unsubscribe_url, _ = unsubscribe_service.generate_unsubscribe_link(
                            recipient=recipient,
                            tenant_id=tenant_id,
                            scenario=scenario
                        )
                        
                        # Inject unsubscribe link into email footer
                        unsubscribe_footer_html = f'''
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
                            <p>Bu e-postayı almak istemiyorsanız, <a href="{unsubscribe_url}" style="color: #0066cc;">buraya tıklayarak</a> abonelikten çıkabilirsiniz.</p>
                            <p>If you no longer wish to receive these emails, you can <a href="{unsubscribe_url}" style="color: #0066cc;">unsubscribe here</a>.</p>
                        </div>
                        '''
                        
                        unsubscribe_footer_text = f'''
                        
---
Bu e-postayı almak istemiyorsanız, aşağıdaki bağlantıyı kullanarak abonelikten çıkabilirsiniz:
{unsubscribe_url}

If you no longer wish to receive these emails, you can unsubscribe here:
{unsubscribe_url}
                        '''
                        
                        # Inject into HTML (before closing </body> tag if exists, otherwise append)
                        if '</body>' in html_body:
                            html_body = html_body.replace('</body>', f'{unsubscribe_footer_html}</body>')
                        else:
                            html_body += unsubscribe_footer_html
                        
                        # Inject into text
                        text_body += unsubscribe_footer_text
                    
                    # Spam filter check
                    from services.spam_filter_service import get_spam_filter_service
                    spam_service = get_spam_filter_service()
                    spam_result = spam_service.analyze_content(subject, html_body, text_body)
                    
                    # Update email log with spam score
                    if email_log and hasattr(email_log, 'spam_score'):
                        email_log.spam_score = spam_result["spam_score"]
                        db.commit()
                    
                    # Reject if spam score too high
                    if spam_result["should_reject"]:
                        self._update_email_log(
                            db,
                            email_log_id,
                            status="rejected",
                            error_message=f"Spam filter rejected: {', '.join(spam_result['warnings'])}",
                            retry_count=attempt
                        )
                        
                        logger.warning(
                            "Email rejected by spam filter",
                            extra={
                                "email_log_id": email_log_id,
                                "tenant_id": tenant_id,
                                "recipient": mask_email(recipient),
                                "spam_score": spam_result["spam_score"],
                                "risk_level": spam_result["risk_level"],
                                "warnings": spam_result["warnings"],
                                **({"request_id": request_id} if request_id else {})
                            }
                        )
                        return
                    
                    # Send email with timing
                    send_start = time.time()
                    await self._send_smtp(
                        smtp_config=smtp_config,
                        recipient=recipient,
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body,
                        email_log_id=email_log_id,
                        db=db,
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
                        # Max retries exhausted - treat as soft bounce
                        from services.bounce_handler_service import get_bounce_handler_service
                        bounce_service = get_bounce_handler_service(db)
                        
                        # Classify as soft bounce (temporary failure)
                        smtp_code = 421  # Service not available
                        smtp_message = f"{error_type}: {str(e)}"
                        
                        bounce_service.process_bounce(
                            email_log_id=email_log_id,
                            recipient=recipient,
                            tenant_id=tenant_id,
                            smtp_code=smtp_code,
                            smtp_message=smtp_message
                        )
                        
                        # Update log as failed
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
                    
                    # Process bounce for SMTPRecipientsRefused
                    if isinstance(e, SMTPRecipientsRefused):
                        from services.bounce_handler_service import get_bounce_handler_service
                        bounce_service = get_bounce_handler_service(db)
                        
                        # Extract SMTP code from error
                        smtp_code = 550  # Default hard bounce code
                        smtp_message = str(e)
                        
                        # Try to extract actual SMTP code from error message
                        import re
                        code_match = re.search(r'(\d{3})', smtp_message)
                        if code_match:
                            smtp_code = int(code_match.group(1))
                        
                        bounce_service.process_bounce(
                            email_log_id=email_log_id,
                            recipient=recipient,
                            tenant_id=tenant_id,
                            smtp_code=smtp_code,
                            smtp_message=smtp_message
                        )
                        
                        logger.info(
                            "Bounce processed for recipient refusal",
                            extra={
                                "email_log_id": email_log_id,
                                "tenant_id": tenant_id,
                                "recipient": mask_email(recipient),
                                "smtp_code": smtp_code,
                                **({"request_id": request_id} if request_id else {})
                            }
                        )
                    
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
        email_log_id: str = None,
        db: Session = None,
        request_id: Optional[str] = None
    ):
        """Send email via SMTP using aiosmtplib with DKIM signing."""
        connection_start = time.time()
        
        message = MIMEMultipart("alternative")
        message["From"] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
        message["To"] = recipient
        message["Subject"] = subject
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid()
        
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))
        
        # DKIM signing
        dkim_signed = False
        try:
            from services.dkim_signing_service import get_dkim_signing_service
            dkim_service = get_dkim_signing_service()
            
            # Sign the message
            signed_message = dkim_service.sign_email(message)
            dkim_signed = True
            
            logger.debug(
                "Email DKIM signed successfully",
                extra={
                    "recipient": recipient,
                    **({"email_log_id": email_log_id} if email_log_id else {}),
                    **({"request_id": request_id} if request_id else {})
                }
            )
            
            # Use signed message
            message = signed_message
            
        except Exception as e:
            # DKIM signing is optional - log warning but continue
            logger.warning(
                "DKIM signing failed, sending without signature",
                extra={
                    "recipient": recipient,
                    "error": str(e),
                    **({"email_log_id": email_log_id} if email_log_id else {}),
                    **({"request_id": request_id} if request_id else {})
                }
            )
        
        # Update email log with DKIM status
        if email_log_id and db:
            email_log = db.get(SMTPEmailLog, email_log_id)
            if email_log and hasattr(email_log, 'dkim_signed'):
                email_log.dkim_signed = dkim_signed
                db.commit()
        
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
