"""Email Approval Service.

Manages approval workflow for HIGH and CRITICAL risk AI-generated emails.
"""
import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from core.models.email_deliverability import EmailApproval
from core.models.base import gen_id
from services.ai_email_safety_service import get_ai_email_safety_service
from services.spam_filter_service import get_spam_filter_service

logger = logging.getLogger(__name__)


class EmailApprovalService:
    """Service for managing email approval workflow."""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_safety = get_ai_email_safety_service()
        self.spam_filter = get_spam_filter_service()
    
    def requires_approval(
        self,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        scenario: str = "UNKNOWN"
    ) -> tuple[bool, str, List[str]]:
        """
        Check if email requires approval.
        
        Args:
            subject: Email subject
            body_text: Email body (plain text)
            body_html: Email body (HTML)
            scenario: Email scenario
        
        Returns:
            Tuple of (requires_approval, risk_level, risk_reasons)
        """
        # Check AI safety risk
        risk_result = self.ai_safety.classify_risk_level(subject, body_text, body_html)
        risk_level = risk_result["risk_level"]
        risk_reasons = risk_result["reasons"]
        
        # HIGH and CRITICAL risk emails require approval
        requires_approval = risk_level in ["HIGH", "CRITICAL"]
        
        return requires_approval, risk_level, risk_reasons
    
    def create_approval_request(
        self,
        tenant_id: str,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str],
        scenario: str,
        action_plan_hash: Optional[str] = None
    ) -> EmailApproval:
        """
        Create approval request for email.
        
        Args:
            tenant_id: Tenant ID
            recipient: Email recipient
            subject: Email subject
            body_text: Email body (plain text)
            body_html: Email body (HTML)
            scenario: Email scenario
            action_plan_hash: Action plan hash (for AI emails)
        
        Returns:
            EmailApproval record
        """
        # Check risk level
        requires_approval, risk_level, risk_reasons = self.requires_approval(
            subject, body_text, body_html, scenario
        )
        
        # Calculate spam score
        spam_result = self.spam_filter.analyze_content(subject, body_text, body_html)
        spam_score = spam_result["spam_score"]
        
        # Create approval request
        approval = EmailApproval(
            id=gen_id("approval"),
            tenant_id=tenant_id,
            recipient=recipient,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            scenario=scenario,
            risk_level=risk_level,
            risk_reasons=json.dumps(risk_reasons),
            spam_score=spam_score,
            status='pending',
            action_plan_hash=action_plan_hash,
            requested_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        self.db.add(approval)
        self.db.commit()
        
        logger.info(
            f"Email approval request created",
            extra={
                "tenant_id": tenant_id,
                "approval_id": approval.id,
                "risk_level": risk_level,
                "spam_score": spam_score
            }
        )
        
        return approval
    
    def approve_email(
        self,
        approval_id: str,
        tenant_id: str,
        reviewed_by: str,
        review_notes: Optional[str] = None
    ) -> bool:
        """
        Approve email for sending.
        
        Args:
            approval_id: Approval ID
            tenant_id: Tenant ID
            reviewed_by: User ID of reviewer
            review_notes: Optional review notes
        
        Returns:
            True if approved successfully
        """
        approval = self.db.query(EmailApproval).filter(
            EmailApproval.id == approval_id,
            EmailApproval.tenant_id == tenant_id,
            EmailApproval.status == 'pending'
        ).first()
        
        if not approval:
            logger.warning(f"Approval request not found or already processed: {approval_id}")
            return False
        
        approval.status = 'approved'
        approval.reviewed_at = datetime.now(timezone.utc)
        approval.reviewed_by = reviewed_by
        approval.review_notes = review_notes
        approval.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        
        logger.info(
            f"Email approved",
            extra={
                "tenant_id": tenant_id,
                "approval_id": approval_id,
                "reviewed_by": reviewed_by
            }
        )
        
        return True
    
    def reject_email(
        self,
        approval_id: str,
        tenant_id: str,
        reviewed_by: str,
        review_notes: Optional[str] = None
    ) -> bool:
        """
        Reject email (will not be sent).
        
        Args:
            approval_id: Approval ID
            tenant_id: Tenant ID
            reviewed_by: User ID of reviewer
            review_notes: Optional review notes
        
        Returns:
            True if rejected successfully
        """
        approval = self.db.query(EmailApproval).filter(
            EmailApproval.id == approval_id,
            EmailApproval.tenant_id == tenant_id,
            EmailApproval.status == 'pending'
        ).first()
        
        if not approval:
            logger.warning(f"Approval request not found or already processed: {approval_id}")
            return False
        
        approval.status = 'rejected'
        approval.reviewed_at = datetime.now(timezone.utc)
        approval.reviewed_by = reviewed_by
        approval.review_notes = review_notes
        approval.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        
        logger.info(
            f"Email rejected",
            extra={
                "tenant_id": tenant_id,
                "approval_id": approval_id,
                "reviewed_by": reviewed_by
            }
        )
        
        return True
    
    def is_approved(self, approval_id: str, tenant_id: str) -> bool:
        """
        Check if email is approved.
        
        Args:
            approval_id: Approval ID
            tenant_id: Tenant ID
        
        Returns:
            True if approved
        """
        approval = self.db.query(EmailApproval).filter(
            EmailApproval.id == approval_id,
            EmailApproval.tenant_id == tenant_id
        ).first()
        
        return approval is not None and approval.status == 'approved'
    
    def list_pending_approvals(
        self,
        tenant_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[EmailApproval]:
        """
        List pending approval requests.
        
        Args:
            tenant_id: Tenant ID
            limit: Maximum number of results
            offset: Offset for pagination
        
        Returns:
            List of pending EmailApproval records
        """
        approvals = self.db.query(EmailApproval).filter(
            EmailApproval.tenant_id == tenant_id,
            EmailApproval.status == 'pending'
        ).order_by(
            EmailApproval.requested_at.desc()
        ).limit(limit).offset(offset).all()
        
        return approvals
    
    def get_approval_stats(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get approval statistics.
        
        Args:
            tenant_id: Tenant ID
        
        Returns:
            Dictionary with approval stats
        """
        from sqlalchemy import func
        
        # Count by status
        status_counts = self.db.query(
            EmailApproval.status,
            func.count(EmailApproval.id).label('count')
        ).filter(
            EmailApproval.tenant_id == tenant_id
        ).group_by(EmailApproval.status).all()
        
        stats = {
            'pending': 0,
            'approved': 0,
            'rejected': 0
        }
        
        for status, count in status_counts:
            stats[status] = count
        
        # Count by risk level
        risk_counts = self.db.query(
            EmailApproval.risk_level,
            func.count(EmailApproval.id).label('count')
        ).filter(
            EmailApproval.tenant_id == tenant_id
        ).group_by(EmailApproval.risk_level).all()
        
        stats['by_risk_level'] = {
            risk_level: count
            for risk_level, count in risk_counts
        }
        
        return stats


def get_email_approval_service(db: Session) -> EmailApprovalService:
    """Get EmailApprovalService instance."""
    return EmailApprovalService(db)
