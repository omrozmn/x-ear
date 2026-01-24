"""Bounce Handler Service for Email Deliverability.

Handles email bounces and maintains recipient blacklist to protect sender reputation.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timezone, timedelta

from core.models.email_deliverability import EmailBounce
from core.models.communication import EmailLog
from core.models.base import gen_id

logger = logging.getLogger(__name__)


class BounceHandlerService:
    """Service for handling email bounces and blacklisting."""
    
    BOUNCE_BLACKLIST_THRESHOLD = 3  # Blacklist after 3 hard bounces
    
    def __init__(self, db: Session):
        self.db = db
    
    def classify_bounce(self, smtp_code: int, message: str) -> str:
        """Classify bounce as hard, soft, or block.
        
        Args:
            smtp_code: SMTP error code
            message: SMTP error message
            
        Returns:
            str: "hard", "soft", or "block"
        """
        # Hard bounces (permanent failures)
        if smtp_code in [550, 551, 552, 553, 554]:
            return "hard"
        
        # Soft bounces (temporary failures)
        if smtp_code in [421, 450, 451, 452]:
            return "soft"
        
        # Blocks (policy/spam)
        if smtp_code in [521, 541, 554]:
            return "block"
        
        # Default to soft bounce
        return "soft"
    
    def is_blacklisted(self, recipient: str, tenant_id: str) -> bool:
        """Check if recipient is blacklisted.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            
        Returns:
            bool: True if blacklisted
        """
        bounce = self.db.query(EmailBounce).filter(
            and_(
                EmailBounce.tenant_id == tenant_id,
                EmailBounce.recipient == recipient,
                EmailBounce.is_blacklisted == True
            )
        ).first()
        
        return bounce is not None
    
    def get_bounce_record(self, recipient: str, tenant_id: str) -> Optional[EmailBounce]:
        """Get existing bounce record for recipient.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            
        Returns:
            EmailBounce or None
        """
        return self.db.query(EmailBounce).filter(
            and_(
                EmailBounce.tenant_id == tenant_id,
                EmailBounce.recipient == recipient
            )
        ).first()
    
    def process_bounce(
        self,
        email_log_id: str,
        recipient: str,
        tenant_id: str,
        smtp_code: int,
        smtp_message: str
    ):
        """Process bounce notification and update blacklist.
        
        Args:
            email_log_id: Email log ID
            recipient: Email address
            tenant_id: Tenant ID
            smtp_code: SMTP error code
            smtp_message: SMTP error message
        """
        bounce_type = self.classify_bounce(smtp_code, smtp_message)
        now = datetime.now(timezone.utc)
        
        logger.info(
            "Processing email bounce",
            extra={
                "email_log_id": email_log_id,
                "recipient": recipient,
                "smtp_code": smtp_code,
                "bounce_type": bounce_type
            }
        )
        
        # Get or create bounce record
        bounce = self.get_bounce_record(recipient, tenant_id)
        
        if bounce:
            # Update existing bounce record
            bounce.bounce_count += 1
            bounce.last_bounce_at = now
            bounce.bounce_type = bounce_type  # Update to latest type
            bounce.bounce_reason = smtp_message
            bounce.smtp_code = smtp_code
            bounce.email_log_id = email_log_id
            bounce.updated_at = now
            
            # Auto-blacklist after threshold hard bounces
            if bounce_type == "hard" and bounce.bounce_count >= self.BOUNCE_BLACKLIST_THRESHOLD:
                bounce.is_blacklisted = True
                logger.warning(
                    "Recipient blacklisted after hard bounces",
                    extra={
                        "recipient": recipient,
                        "tenant_id": tenant_id,
                        "bounce_count": bounce.bounce_count
                    }
                )
        else:
            # Create new bounce record
            bounce = EmailBounce(
                id=gen_id("bounce"),
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                recipient=recipient,
                bounce_type=bounce_type,
                bounce_reason=smtp_message,
                smtp_code=smtp_code,
                bounce_count=1,
                first_bounce_at=now,
                last_bounce_at=now,
                is_blacklisted=False,  # Don't blacklist on first bounce
                created_at=now,
                updated_at=now
            )
            self.db.add(bounce)
        
        # Update email_log status
        email_log = self.db.query(EmailLog).filter(EmailLog.id == email_log_id).first()
        if email_log:
            email_log.status = "bounced"
            email_log.bounced_at = now
            email_log.error_message = smtp_message
            email_log.updated_at = now
        
        self.db.commit()
        
        logger.info(
            "Bounce processed successfully",
            extra={
                "recipient": recipient,
                "bounce_count": bounce.bounce_count,
                "is_blacklisted": bounce.is_blacklisted
            }
        )
    
    def unblacklist_recipient(self, recipient: str, tenant_id: str) -> bool:
        """Manually unblacklist a recipient.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            
        Returns:
            bool: True if unblacklisted, False if not found
        """
        bounce = self.get_bounce_record(recipient, tenant_id)
        
        if not bounce:
            return False
        
        bounce.is_blacklisted = False
        bounce.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        logger.info(
            "Recipient manually unblacklisted",
            extra={
                "recipient": recipient,
                "tenant_id": tenant_id
            }
        )
        
        return True
    
    def get_bounce_rate(self, tenant_id: str, hours: int = 1) -> float:
        """Calculate bounce rate over last N hours.
        
        Args:
            tenant_id: Tenant ID
            hours: Number of hours to look back
            
        Returns:
            float: Bounce rate (0.0 to 1.0)
        """
        from sqlalchemy import func
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Count total emails sent
        total_sent = self.db.query(func.count(EmailLog.id)).filter(
            and_(
                EmailLog.tenant_id == tenant_id,
                EmailLog.sent_at >= cutoff
            )
        ).scalar() or 0
        
        if total_sent == 0:
            return 0.0
        
        # Count bounced emails
        total_bounced = self.db.query(func.count(EmailLog.id)).filter(
            and_(
                EmailLog.tenant_id == tenant_id,
                EmailLog.status == "bounced",
                EmailLog.bounced_at >= cutoff
            )
        ).scalar() or 0
        
        return total_bounced / total_sent


def get_bounce_handler_service(db: Session) -> BounceHandlerService:
    """Get BounceHandlerService instance."""
    return BounceHandlerService(db)
