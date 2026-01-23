"""EmailService for SMTP Email Integration"""

import asyncio
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Dict, Tuple

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
    async def test_connection(self, smtp_config: dict) -> Tuple[bool, str]:
        """Test SMTP connection and authentication."""
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

                logger.info("SMTP connection test successful")
                return True, "SMTP connection successful"

        except SMTPAuthenticationError as e:
            logger.warning(f"SMTP authentication failed: {e}")
            return False, "SMTP authentication failed. Please check username and password."
        except (SMTPConnectError, asyncio.TimeoutError) as e:
            logger.warning(f"SMTP connection failed: {e}")
            return False, "Cannot connect to SMTP server. Please check host and port."
        except Exception as e:
            logger.error(f"SMTP test failed: {e}")
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
        language: str
    ):
        """Background task for sending email with retry logic."""
        db = next(get_db())

        try:
            max_retries = 3
            retry_delays = [2, 4, 8]

            for attempt in range(max_retries + 1):
                try:
                    smtp_config = self.smtp_config_service.get_config_with_decrypted_password(tenant_id)
                    subject, html_body, text_body = self.template_service.render_template(
                        scenario, language, variables
                    )

                    await self._send_smtp(
                        smtp_config=smtp_config,
                        recipient=recipient,
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body
                    )

                    self._update_email_log(
                        db, email_log_id, status="sent",
                        subject=subject, body_preview=text_body[:500],
                        sent_at=datetime.now(timezone.utc), retry_count=attempt
                    )

                    logger.info(f"Email sent: {email_log_id}")
                    return

                except (SMTPConnectError, SMTPServerDisconnected, asyncio.TimeoutError) as e:
                    if attempt < max_retries:
                        delay = retry_delays[attempt]
                        logger.warning(f"Retry {attempt + 1} in {delay}s")
                        await asyncio.sleep(delay)
                    else:
                        self._update_email_log(
                            db, email_log_id, status="failed",
                            error_message=f"Max retries: {str(e)}", retry_count=attempt
                        )

                except (SMTPAuthenticationError, SMTPRecipientsRefused) as e:
                    self._update_email_log(
                        db, email_log_id, status="failed",
                        error_message=f"Permanent: {str(e)}", retry_count=attempt
                    )
                    return

                except Exception as e:
                    self._update_email_log(
                        db, email_log_id, status="failed",
                        error_message=f"Error: {str(e)}", retry_count=attempt
                    )
                    logger.exception(f"Email error: {email_log_id}")
                    return
        finally:
            db.close()

    async def _send_smtp(self, smtp_config: dict, recipient: str, subject: str, html_body: str, text_body: str):
        """Send email via SMTP."""
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
            await smtp.send_message(message)

    def _update_email_log(self, db: Session, email_log_id: str, status: str, subject: str = None, body_preview: str = None, sent_at: datetime = None, error_message: str = None, retry_count: int = 0):
        """Update email log."""
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
