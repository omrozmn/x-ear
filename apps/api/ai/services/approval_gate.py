"""
Approval Gate Service

Determines approval requirements based on risk level and manages
the approval workflow for AI actions.

Requirements:
- 8.1: High/critical risk actions require explicit admin approval
- 8.2: Approval gate displays full action plan, risk analysis, and rollback procedure
- 8.6: Rejected approvals are logged with reason
- 4.6: Executor never executes without approval for high-risk operations
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import uuid4

from ai.models.ai_action import RiskLevel, ActionStatus
from ai.utils.approval_token import (
    ApprovalToken,
    ApprovalTokenValidator,
    TokenValidationResult,
    generate_approval_token,
    validate_approval_token,
    get_token_registry,
    _compute_action_plan_hash,
)

logger = logging.getLogger(__name__)


class ApprovalDecision(str, Enum):
    """Approval decision types."""
    AUTO_APPROVED = "auto_approved"      # Low/medium risk - no approval needed
    PENDING_APPROVAL = "pending_approval"  # High/critical risk - needs approval
    APPROVED = "approved"                # Explicitly approved by admin
    REJECTED = "rejected"                # Explicitly rejected by admin
    EXPIRED = "expired"                  # Approval token expired


@dataclass
class ApprovalRequest:
    """Request for approval of an AI action."""
    action_id: str
    action_plan: dict
    risk_level: str
    tenant_id: str
    user_id: str
    risk_reasoning: Optional[str] = None
    rollback_plan: Optional[dict] = None
    required_permissions: Optional[List[str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ApprovalResult:
    """Result of approval gate evaluation."""
    decision: ApprovalDecision
    requires_approval: bool
    approval_token: Optional[ApprovalToken] = None
    reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "decision": self.decision.value,
            "requiresApproval": self.requires_approval,
            "approvalToken": self.approval_token.encode() if self.approval_token else None,
            "reason": self.reason,
            "approvedBy": self.approved_by,
            "approvedAt": self.approved_at.isoformat() if self.approved_at else None,
            "rejectionReason": self.rejection_reason,
        }


@dataclass
class ApprovalQueueItem:
    """Item in the approval queue."""
    id: str
    action_id: str
    action_plan: dict
    action_plan_hash: str
    risk_level: str
    risk_reasoning: Optional[str]
    rollback_plan: Optional[dict]
    required_permissions: Optional[List[str]]
    tenant_id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    status: ApprovalDecision
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "actionId": self.action_id,
            "actionPlan": self.action_plan,
            "actionPlanHash": self.action_plan_hash,
            "riskLevel": self.risk_level,
            "riskReasoning": self.risk_reasoning,
            "rollbackPlan": self.rollback_plan,
            "requiredPermissions": self.required_permissions,
            "tenantId": self.tenant_id,
            "userId": self.user_id,
            "createdAt": self.created_at.isoformat(),
            "expiresAt": self.expires_at.isoformat(),
            "status": self.status.value,
            "approvedBy": self.approved_by,
            "approvedAt": self.approved_at.isoformat() if self.approved_at else None,
            "rejectionReason": self.rejection_reason,
        }


class ApprovalGate:
    """
    Approval gate for AI actions.
    
    Determines whether an action requires approval based on risk level
    and manages the approval workflow.
    """
    
    # Risk levels that require approval
    HIGH_RISK_LEVELS = {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}
    
    def __init__(self):
        # In-memory queue for pending approvals
        # In production, this should be backed by database
        self._pending_approvals: Dict[str, ApprovalQueueItem] = {}
        self._approval_history: List[ApprovalQueueItem] = []
    
    def evaluate(self, request: ApprovalRequest) -> ApprovalResult:
        """
        Evaluate whether an action requires approval.
        
        Args:
            request: The approval request
            
        Returns:
            ApprovalResult with decision and optional token
        """
        requires_approval = self._requires_approval(request.risk_level)
        
        if not requires_approval:
            # Auto-approve low/medium risk actions
            logger.info(
                f"Auto-approving action {request.action_id} with risk level {request.risk_level}",
                extra={
                    "action_id": request.action_id,
                    "risk_level": request.risk_level,
                    "tenant_id": request.tenant_id,
                }
            )
            return ApprovalResult(
                decision=ApprovalDecision.AUTO_APPROVED,
                requires_approval=False,
                reason=f"Auto-approved: {request.risk_level} risk level does not require approval",
            )
        
        # Generate approval token for high-risk actions
        token = generate_approval_token(
            action_id=request.action_id,
            action_plan=request.action_plan,
            tenant_id=request.tenant_id,
            approver_id=request.user_id,  # Initially set to requesting user
        )
        
        # Add to pending approvals queue
        queue_item = ApprovalQueueItem(
            id=f"apq_{uuid4().hex}",
            action_id=request.action_id,
            action_plan=request.action_plan,
            action_plan_hash=_compute_action_plan_hash(request.action_plan),
            risk_level=request.risk_level,
            risk_reasoning=request.risk_reasoning,
            rollback_plan=request.rollback_plan,
            required_permissions=request.required_permissions,
            tenant_id=request.tenant_id,
            user_id=request.user_id,
            created_at=datetime.now(timezone.utc),
            expires_at=token.expires_at,
            status=ApprovalDecision.PENDING_APPROVAL,
        )
        self._pending_approvals[request.action_id] = queue_item
        
        logger.info(
            f"Action {request.action_id} requires approval (risk level: {request.risk_level})",
            extra={
                "action_id": request.action_id,
                "risk_level": request.risk_level,
                "tenant_id": request.tenant_id,
                "token_id": token.token_id,
            }
        )
        
        return ApprovalResult(
            decision=ApprovalDecision.PENDING_APPROVAL,
            requires_approval=True,
            approval_token=token,
            reason=f"Approval required: {request.risk_level} risk level requires admin approval",
        )
    
    def approve(
        self,
        action_id: str,
        approver_id: str,
        token: ApprovalToken,
        current_action_plan: dict,
    ) -> ApprovalResult:
        """
        Approve an action.
        
        Args:
            action_id: ID of the action to approve
            approver_id: ID of the user approving
            token: The approval token
            current_action_plan: Current action plan (for drift detection)
            
        Returns:
            ApprovalResult with decision
        """
        # Validate the token
        validation = validate_approval_token(
            token=token,
            action_plan=current_action_plan,
            consume=True,
            expected_action_id=action_id,
        )
        
        if not validation.valid:
            logger.warning(
                f"Approval token validation failed for action {action_id}: {validation.error}",
                extra={
                    "action_id": action_id,
                    "approver_id": approver_id,
                    "error": validation.error,
                    "error_type": validation.error_type,
                }
            )
            return ApprovalResult(
                decision=ApprovalDecision.REJECTED,
                requires_approval=True,
                reason=f"Token validation failed: {validation.error}",
                rejection_reason=validation.error,
            )
        
        # Update queue item
        queue_item = self._pending_approvals.get(action_id)
        if queue_item:
            queue_item.status = ApprovalDecision.APPROVED
            queue_item.approved_by = approver_id
            queue_item.approved_at = datetime.now(timezone.utc)
            
            # Move to history
            self._approval_history.append(queue_item)
            del self._pending_approvals[action_id]
        
        logger.info(
            f"Action {action_id} approved by {approver_id}",
            extra={
                "action_id": action_id,
                "approver_id": approver_id,
                "token_id": token.token_id,
            }
        )
        
        return ApprovalResult(
            decision=ApprovalDecision.APPROVED,
            requires_approval=False,
            approved_by=approver_id,
            approved_at=datetime.now(timezone.utc),
            reason="Action approved",
        )
    
    def reject(
        self,
        action_id: str,
        rejector_id: str,
        reason: str,
    ) -> ApprovalResult:
        """
        Reject an action.
        
        Args:
            action_id: ID of the action to reject
            rejector_id: ID of the user rejecting
            reason: Reason for rejection
            
        Returns:
            ApprovalResult with decision
        """
        # Update queue item
        queue_item = self._pending_approvals.get(action_id)
        if queue_item:
            queue_item.status = ApprovalDecision.REJECTED
            queue_item.approved_by = rejector_id
            queue_item.approved_at = datetime.now(timezone.utc)
            queue_item.rejection_reason = reason
            
            # Move to history
            self._approval_history.append(queue_item)
            del self._pending_approvals[action_id]
        
        logger.info(
            f"Action {action_id} rejected by {rejector_id}: {reason}",
            extra={
                "action_id": action_id,
                "rejector_id": rejector_id,
                "reason": reason,
            }
        )
        
        return ApprovalResult(
            decision=ApprovalDecision.REJECTED,
            requires_approval=True,
            rejection_reason=reason,
            reason=f"Action rejected: {reason}",
        )
    
    def get_pending_approvals(
        self,
        tenant_id: Optional[str] = None,
    ) -> List[ApprovalQueueItem]:
        """
        Get pending approvals, optionally filtered by tenant.
        
        Args:
            tenant_id: Optional tenant ID to filter by
            
        Returns:
            List of pending approval queue items
        """
        items = list(self._pending_approvals.values())
        
        if tenant_id:
            items = [item for item in items if item.tenant_id == tenant_id]
        
        # Sort by created_at (oldest first)
        items.sort(key=lambda x: x.created_at)
        
        return items
    
    def get_approval_status(self, action_id: str) -> Optional[ApprovalQueueItem]:
        """
        Get the approval status for an action.
        
        Args:
            action_id: ID of the action
            
        Returns:
            ApprovalQueueItem if found, None otherwise
        """
        # Check pending
        if action_id in self._pending_approvals:
            return self._pending_approvals[action_id]
        
        # Check history
        for item in self._approval_history:
            if item.action_id == action_id:
                return item
        
        return None
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired pending approvals.
        
        Returns:
            Number of expired items cleaned up
        """
        now = datetime.now(timezone.utc)
        expired = []
        
        for action_id, item in self._pending_approvals.items():
            if item.expires_at < now:
                item.status = ApprovalDecision.EXPIRED
                expired.append(action_id)
                self._approval_history.append(item)
        
        for action_id in expired:
            del self._pending_approvals[action_id]
            logger.info(f"Expired pending approval for action {action_id}")
        
        return len(expired)
    
    def _requires_approval(self, risk_level: str) -> bool:
        """Check if a risk level requires approval."""
        return risk_level in self.HIGH_RISK_LEVELS
    
    def clear(self) -> None:
        """Clear all approvals (for testing)."""
        self._pending_approvals.clear()
        self._approval_history.clear()


# Global approval gate instance
_gate: Optional[ApprovalGate] = None


def get_approval_gate() -> ApprovalGate:
    """Get the global approval gate instance."""
    global _gate
    if _gate is None:
        _gate = ApprovalGate()
    return _gate


def reset_approval_gate() -> None:
    """Reset the global approval gate (for testing)."""
    global _gate
    _gate = None


def requires_approval(risk_level: str) -> bool:
    """
    Convenience function to check if a risk level requires approval.
    
    Args:
        risk_level: The risk level to check
        
    Returns:
        True if approval is required, False otherwise
    """
    return risk_level in ApprovalGate.HIGH_RISK_LEVELS
