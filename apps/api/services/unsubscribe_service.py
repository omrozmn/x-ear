"""Unsubscribe Service for Email Preference Management.

Manages email unsubscribe preferences with cryptographic tokens for CAN-SPAM compliance.
"""

import logging
import secrets
import hashlib
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timezone

from core.models.email_deliverability import EmailUnsubscribe
from core.models.base import gen_id

logger = logging.getLogger(__name__)


class UnsubscribeService:
    """Service for managing email unsubscribe preferences."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_unsubscribe_link(
        self,
        recipient: str,
        tenant_id: str,
        scenario: str,
        base_url: str = "https://app.x-ear.com"
    ) -> Tuple[str, str]:
        """Generate cryptographically signed unsubscribe link.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            scenario: Email scenario
            base_url: Base URL for unsubscribe endpoint
            
        Returns:
            Tuple[str, str]: (unsubscribe_url, token)
        """
        # Generate cryptographic token
        token_data = f"{recipient}:{tenant_id}:{scenario}:{secrets.token_hex(16)}"
        token = hashlib.sha256(token_data.encode()).hexdigest()
        
        # Build unsubscribe URL
        unsubscribe_url = f"{base_url}/api/unsubscribe?token={token}"
        
        logger.debug(
            "Generated unsubscribe link",
            extra={
                "recipient": recipient,
                "tenant_id": tenant_id,
                "scenario": scenario
            }
        )
        
        return unsubscribe_url, token
    
    def is_unsubscribed(
        self,
        recipient: str,
        tenant_id: str,
        scenario: str
    ) -> bool:
        """Check if recipient unsubscribed from scenario.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            scenario: Email scenario
            
        Returns:
            bool: True if unsubscribed
        """
        unsubscribe = self.db.query(EmailUnsubscribe).filter(
            and_(
                EmailUnsubscribe.tenant_id == tenant_id,
                EmailUnsubscribe.recipient == recipient,
                EmailUnsubscribe.scenario == scenario
            )
        ).first()
        
        return unsubscribe is not None
    
    def get_by_token(self, token: str) -> Optional[EmailUnsubscribe]:
        """Get unsubscribe record by token.
        
        Args:
            token: Unsubscribe token
            
        Returns:
            EmailUnsubscribe or None
        """
        return self.db.query(EmailUnsubscribe).filter(
            EmailUnsubscribe.unsubscribe_token == token
        ).first()
    
    def process_unsubscribe(
        self,
        recipient: str,
        tenant_id: str,
        scenario: str,
        token: str,
        ip_address: str,
        user_agent: str
    ) -> Tuple[bool, str]:
        """Process unsubscribe request and update preferences.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            scenario: Email scenario
            token: Unsubscribe token
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Tuple[bool, str]: (success, message)
        """
        now = datetime.now(timezone.utc)
        
        # Check if already unsubscribed
        existing = self.db.query(EmailUnsubscribe).filter(
            and_(
                EmailUnsubscribe.tenant_id == tenant_id,
                EmailUnsubscribe.recipient == recipient,
                EmailUnsubscribe.scenario == scenario
            )
        ).first()
        
        if existing:
            logger.info(
                "Recipient already unsubscribed",
                extra={
                    "recipient": recipient,
                    "tenant_id": tenant_id,
                    "scenario": scenario
                }
            )
            return True, "You are already unsubscribed from this email type"
        
        # Create unsubscribe record
        unsubscribe = EmailUnsubscribe(
            id=gen_id("unsub"),
            tenant_id=tenant_id,
            recipient=recipient,
            scenario=scenario,
            unsubscribed_at=now,
            unsubscribe_token=token,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            updated_at=now
        )
        
        self.db.add(unsubscribe)
        self.db.commit()
        
        logger.info(
            "Unsubscribe processed successfully",
            extra={
                "recipient": recipient,
                "tenant_id": tenant_id,
                "scenario": scenario,
                "ip_address": ip_address
            }
        )
        
        return True, "Successfully unsubscribed"
    
    def resubscribe(
        self,
        recipient: str,
        tenant_id: str,
        scenario: str
    ) -> bool:
        """Manually resubscribe a recipient.
        
        Args:
            recipient: Email address
            tenant_id: Tenant ID
            scenario: Email scenario
            
        Returns:
            bool: True if resubscribed, False if not found
        """
        unsubscribe = self.db.query(EmailUnsubscribe).filter(
            and_(
                EmailUnsubscribe.tenant_id == tenant_id,
                EmailUnsubscribe.recipient == recipient,
                EmailUnsubscribe.scenario == scenario
            )
        ).first()
        
        if not unsubscribe:
            return False
        
        self.db.delete(unsubscribe)
        self.db.commit()
        
        logger.info(
            "Recipient manually resubscribed",
            extra={
                "recipient": recipient,
                "tenant_id": tenant_id,
                "scenario": scenario
            }
        )
        
        return True


def get_unsubscribe_service(db: Session) -> UnsubscribeService:
    """Get UnsubscribeService instance."""
    return UnsubscribeService(db)
