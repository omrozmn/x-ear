"""Complaint Handler Service.

Handles spam complaints from Feedback Loop (FBL) providers like Gmail, Outlook, Yahoo.
Auto-unsubscribes complainers and alerts when complaint rate exceeds threshold.
"""
import logging
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from core.models.email_deliverability import EmailComplaint
from core.models.communication import EmailLog
from core.models.base import gen_id
from services.unsubscribe_service import get_unsubscribe_service

logger = logging.getLogger(__name__)


class ComplaintHandlerService:
    """Service for handling email spam complaints."""
    
    def __init__(self, db: Session):
        self.db = db
        self.unsubscribe_service = get_unsubscribe_service(db)
    
    def parse_fbl_report(self, fbl_content: str, provider: str = "unknown") -> Optional[Dict[str, Any]]:
        """
        Parse Feedback Loop (FBL) report from email providers.
        
        FBL reports are typically in ARF (Abuse Reporting Format) which is
        a multipart MIME message with XML or text content.
        
        Args:
            fbl_content: Raw FBL report content
            provider: FBL provider (gmail, outlook, yahoo, etc.)
        
        Returns:
            Dictionary with parsed complaint data or None if parsing fails
        """
        try:
            # Try to parse as XML (common format)
            if "<" in fbl_content and ">" in fbl_content:
                root = ET.fromstring(fbl_content)
                
                # Extract recipient email
                recipient = None
                for elem in root.iter():
                    if elem.tag.endswith("recipient") or elem.tag.endswith("email"):
                        recipient = elem.text
                        break
                
                # Extract complaint type
                complaint_type = "spam"  # Default
                for elem in root.iter():
                    if elem.tag.endswith("feedback-type"):
                        complaint_type = elem.text.lower()
                        break
                
                # Extract timestamp
                complained_at = datetime.now(timezone.utc)
                for elem in root.iter():
                    if elem.tag.endswith("arrival-date") or elem.tag.endswith("timestamp"):
                        try:
                            complained_at = datetime.fromisoformat(elem.text)
                        except (ValueError, AttributeError):
                            pass
                        break
                
                if recipient:
                    return {
                        "recipient": recipient,
                        "complaint_type": complaint_type,
                        "provider": provider,
                        "complained_at": complained_at
                    }
            
            # Try to parse as plain text (fallback)
            lines = fbl_content.split("\n")
            recipient = None
            complaint_type = "spam"
            
            for line in lines:
                line_lower = line.lower()
                if "recipient:" in line_lower or "to:" in line_lower:
                    # Extract email from line
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        email_part = parts[1].strip()
                        # Simple email extraction
                        if "@" in email_part:
                            recipient = email_part.split()[0].strip("<>")
                
                if "feedback-type:" in line_lower or "complaint-type:" in line_lower:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        complaint_type = parts[1].strip().lower()
            
            if recipient:
                return {
                    "recipient": recipient,
                    "complaint_type": complaint_type,
                    "provider": provider,
                    "complained_at": datetime.now(timezone.utc)
                }
            
            logger.warning(f"Failed to parse FBL report: no recipient found")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing FBL report: {e}", exc_info=True)
            return None
    
    def process_complaint(
        self,
        tenant_id: str,
        recipient: str,
        complaint_type: str = "spam",
        provider: str = "unknown",
        email_log_id: Optional[str] = None
    ) -> EmailComplaint:
        """
        Process spam complaint.
        
        Actions:
        1. Record complaint in database
        2. Auto-unsubscribe complainer from ALL scenarios
        3. Update email log status if provided
        4. Check if complaint rate exceeds threshold
        
        Args:
            tenant_id: Tenant ID
            recipient: Email address that complained
            complaint_type: Type of complaint (spam, abuse, fraud, virus, other)
            provider: FBL provider (gmail, outlook, yahoo, etc.)
            email_log_id: Optional email log ID
        
        Returns:
            EmailComplaint record
        """
        # Check if complaint already exists
        existing = self.db.query(EmailComplaint).filter(
            and_(
                EmailComplaint.tenant_id == tenant_id,
                EmailComplaint.recipient == recipient,
                EmailComplaint.email_log_id == email_log_id
            )
        ).first()
        
        if existing:
            logger.info(f"Complaint already recorded for {recipient}")
            return existing
        
        # Create complaint record
        complaint = EmailComplaint(
            id=gen_id("complaint"),
            tenant_id=tenant_id,
            email_log_id=email_log_id,
            recipient=recipient,
            complaint_type=complaint_type,
            feedback_loop_provider=provider,
            complained_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        self.db.add(complaint)
        
        # Auto-unsubscribe from ALL scenarios
        # This is critical - complainers should never receive emails again
        scenarios = ["ALL"]  # Special scenario meaning all email types
        for scenario in scenarios:
            try:
                self.unsubscribe_service.process_unsubscribe(
                    tenant_id=tenant_id,
                    recipient=recipient,
                    scenario=scenario,
                    token="complaint_auto_unsubscribe",
                    ip_address=None,
                    user_agent=f"Auto-unsubscribe due to {complaint_type} complaint"
                )
            except Exception as e:
                logger.error(f"Failed to auto-unsubscribe complainer {recipient}: {e}")
        
        # Update email log status if provided
        if email_log_id:
            email_log = self.db.query(EmailLog).filter(
                EmailLog.id == email_log_id
            ).first()
            
            if email_log:
                email_log.status = "complained"
                email_log.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        
        logger.warning(
            f"Spam complaint processed and recipient auto-unsubscribed",
            extra={
                "tenant_id": tenant_id,
                "recipient": recipient,
                "complaint_type": complaint_type,
                "provider": provider
            }
        )
        
        # Check complaint rate and alert if needed
        complaint_rate = self.get_complaint_rate(tenant_id, hours=1)
        if complaint_rate > 0.1:  # Alert if > 0.1%
            logger.critical(
                f"ALERT: Complaint rate exceeded threshold",
                extra={
                    "tenant_id": tenant_id,
                    "complaint_rate": complaint_rate,
                    "threshold": 0.1
                }
            )
        
        return complaint
    
    def get_complaint_rate(self, tenant_id: str, hours: int = 24) -> float:
        """
        Calculate complaint rate over time window.
        
        Args:
            tenant_id: Tenant ID
            hours: Time window in hours
        
        Returns:
            Complaint rate as percentage (0-100)
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Count complaints in time window
        complaint_count = self.db.query(func.count(EmailComplaint.id)).filter(
            and_(
                EmailComplaint.tenant_id == tenant_id,
                EmailComplaint.complained_at >= cutoff_time
            )
        ).scalar() or 0
        
        # Count total emails sent in time window
        total_sent = self.db.query(func.count(EmailLog.id)).filter(
            and_(
                EmailLog.tenant_id == tenant_id,
                EmailLog.status == "sent",
                EmailLog.created_at >= cutoff_time
            )
        ).scalar() or 0
        
        if total_sent == 0:
            return 0.0
        
        return (complaint_count / total_sent) * 100
    
    def list_complaints(
        self,
        tenant_id: str,
        limit: int = 50,
        offset: int = 0,
        complaint_type: Optional[str] = None
    ) -> list[EmailComplaint]:
        """
        List complaints for tenant.
        
        Args:
            tenant_id: Tenant ID
            limit: Maximum number of results
            offset: Offset for pagination
            complaint_type: Optional filter by complaint type
        
        Returns:
            List of EmailComplaint records
        """
        query = self.db.query(EmailComplaint).filter(
            EmailComplaint.tenant_id == tenant_id
        )
        
        if complaint_type:
            query = query.filter(EmailComplaint.complaint_type == complaint_type)
        
        complaints = query.order_by(
            EmailComplaint.complained_at.desc()
        ).limit(limit).offset(offset).all()
        
        return complaints


def get_complaint_handler_service(db: Session) -> ComplaintHandlerService:
    """Get ComplaintHandlerService instance."""
    return ComplaintHandlerService(db)
