"""
Property-based tests for Approval Gate.

**Property 16: High-Risk Action Approval Requirement**
**Validates: Requirements 4.6, 8.1**

Requirements:
- 4.6: Executor never executes without approval for high-risk operations
- 8.1: High/critical risk actions require explicit admin approval
"""

# Path setup MUST come before any other imports
import sys
from pathlib import Path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
sys.path.insert(0, str(_api_dir))

import os
# Set test secret key before imports
os.environ["AI_APPROVAL_SECRET_KEY"] = "test_secret_key_for_approval_tokens_12345"

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timedelta, timezone

from ai.services.approval_gate import (
    ApprovalGate,
    ApprovalDecision,
    ApprovalRequest,
    ApprovalResult,
    ApprovalQueueItem,
    get_approval_gate,
    reset_approval_gate,
    requires_approval,
)
from ai.models.ai_action import RiskLevel
from ai.utils.approval_token import (
    ApprovalToken,
    reset_token_registry,
    _compute_action_plan_hash,
)


# Strategies for generating test data
action_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-'),
    min_size=1,
    max_size=64
).map(lambda x: f"aiact_{x}")

tenant_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-'),
    min_size=1,
    max_size=64
).map(lambda x: f"tenant_{x}")

user_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_-'),
    min_size=1,
    max_size=64
).map(lambda x: f"user_{x}")

# Strategy for action plans
action_plan_strategy = st.fixed_dictionaries({
    "operations": st.lists(
        st.fixed_dictionaries({
            "tool_name": st.sampled_from(["feature_flag_toggle", "tenant_config_update", "report_generate"]),
            "parameters": st.dictionaries(
                st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('L',))),
                st.one_of(st.text(max_size=50), st.integers(), st.booleans()),
                max_size=5
            ),
        }),
        min_size=1,
        max_size=5
    ),
    "risk_level": st.sampled_from(["low", "medium", "high", "critical"]),
})

# Risk level strategies
low_risk_strategy = st.sampled_from([RiskLevel.LOW.value, RiskLevel.MEDIUM.value])
high_risk_strategy = st.sampled_from([RiskLevel.HIGH.value, RiskLevel.CRITICAL.value])
any_risk_strategy = st.sampled_from([r.value for r in RiskLevel])


@pytest.fixture(autouse=True)
def reset_state():
    """Reset approval gate and token registry before each test."""
    reset_approval_gate()
    reset_token_registry()
    yield
    reset_approval_gate()
    reset_token_registry()


class TestHighRiskApprovalRequirement:
    """
    Property 16: High-Risk Action Approval Requirement
    
    Tests that high/critical risk actions always require approval.
    """
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
    )
    @settings(max_examples=100)
    def test_high_risk_actions_require_approval(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        action_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.1: High/critical risk actions always require approval.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 4.6, 8.1**
        """
        gate = get_approval_gate()
        
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        result = gate.evaluate(request)
        
        # High-risk actions MUST require approval
        assert result.requires_approval, f"High-risk action ({risk_level}) should require approval"
        assert result.decision == ApprovalDecision.PENDING_APPROVAL
        assert result.approval_token is not None, "Approval token should be generated"
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=low_risk_strategy,
    )
    @settings(max_examples=100)
    def test_low_risk_actions_auto_approved(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        action_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.2: Low/medium risk actions are auto-approved.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        gate = get_approval_gate()
        
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        result = gate.evaluate(request)
        
        # Low-risk actions should be auto-approved
        assert not result.requires_approval, f"Low-risk action ({risk_level}) should not require approval"
        assert result.decision == ApprovalDecision.AUTO_APPROVED
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
    )
    @settings(max_examples=100)
    def test_high_risk_generates_valid_token(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        action_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.3: High-risk actions generate valid approval tokens.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        gate = get_approval_gate()
        
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        result = gate.evaluate(request)
        
        # Token should be valid
        assert result.approval_token is not None
        assert result.approval_token.verify_signature()
        assert result.approval_token.action_id == action_id
        assert result.approval_token.tenant_id == tenant_id
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
    )
    @settings(max_examples=100)
    def test_high_risk_added_to_pending_queue(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        approver_id: str,
        action_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.4: High-risk actions are added to pending approval queue.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        gate = get_approval_gate()
        
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        gate.evaluate(request)
        
        # Action should be in pending queue
        pending = gate.get_pending_approvals(tenant_id=tenant_id)
        action_ids = [item.action_id for item in pending]
        assert action_id in action_ids, "High-risk action should be in pending queue"


class TestApprovalWorkflow:
    """Tests for the approval workflow."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
    )
    @settings(max_examples=100)
    def test_approval_with_valid_token_succeeds(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        approver_id: str,
        action_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.5: Approval with valid token succeeds.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        gate = get_approval_gate()
        
        # Create request and get token
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        eval_result = gate.evaluate(request)
        token = eval_result.approval_token
        
        # Approve with valid token
        approve_result = gate.approve(
            action_id=action_id,
            approver_id=approver_id,
            token=token,
            current_action_plan=action_plan,
        )
        
        assert approve_result.decision == ApprovalDecision.APPROVED
        assert approve_result.approved_by == approver_id
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        modified_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
    )
    @settings(max_examples=100)
    def test_approval_with_plan_drift_fails(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        approver_id: str,
        action_plan: dict,
        modified_plan: dict,
        risk_level: str,
    ):
        """
        Property 16.6: Approval fails if action plan has changed (plan drift).
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        # Ensure plans are different
        assume(action_plan != modified_plan)
        
        gate = get_approval_gate()
        
        # Create request and get token
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        eval_result = gate.evaluate(request)
        token = eval_result.approval_token
        
        # Try to approve with modified plan (should fail due to drift)
        approve_result = gate.approve(
            action_id=action_id,
            approver_id=approver_id,
            token=token,
            current_action_plan=modified_plan,  # Different plan!
        )
        
        assert approve_result.decision == ApprovalDecision.REJECTED
        assert "drift" in approve_result.reason.lower() or "validation failed" in approve_result.reason.lower()
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        action_plan=action_plan_strategy,
        risk_level=high_risk_strategy,
        rejection_reason=st.text(min_size=1, max_size=200),
    )
    @settings(max_examples=100)
    def test_rejection_logs_reason(
        self,
        action_id: str,
        tenant_id: str,
        user_id: str,
        action_plan: dict,
        risk_level: str,
        rejection_reason: str,
    ):
        """
        Property 16.7: Rejection logs the reason.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.6**
        """
        gate = get_approval_gate()
        
        # Create request
        request = ApprovalRequest(
            action_id=action_id,
            action_plan=action_plan,
            risk_level=risk_level,
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        gate.evaluate(request)
        
        # Reject with reason
        reject_result = gate.reject(
            action_id=action_id,
            rejector_id=user_id,
            reason=rejection_reason,
        )
        
        assert reject_result.decision == ApprovalDecision.REJECTED
        assert reject_result.rejection_reason == rejection_reason


class TestRequiresApprovalFunction:
    """Tests for the requires_approval convenience function."""
    
    @given(risk_level=high_risk_strategy)
    @settings(max_examples=50)
    def test_high_risk_requires_approval(self, risk_level: str):
        """
        Property 16.8: requires_approval returns True for high/critical risk.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        assert requires_approval(risk_level) is True
    
    @given(risk_level=low_risk_strategy)
    @settings(max_examples=50)
    def test_low_risk_does_not_require_approval(self, risk_level: str):
        """
        Property 16.9: requires_approval returns False for low/medium risk.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        assert requires_approval(risk_level) is False


class TestApprovalQueueManagement:
    """Tests for approval queue management."""
    
    @given(
        action_ids=st.lists(action_id_strategy, min_size=1, max_size=5, unique=True),
        tenant_id=tenant_id_strategy,
        user_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=50)
    def test_pending_approvals_filtered_by_tenant(
        self,
        action_ids: list,
        tenant_id: str,
        user_id: str,
        action_plan: dict,
    ):
        """
        Property 16.10: Pending approvals can be filtered by tenant.
        
        **Feature: ai-layer-architecture, Property 16: High-Risk Action Approval Requirement**
        **Validates: Requirements 8.1**
        """
        # Reset state for each hypothesis example
        reset_approval_gate()
        reset_token_registry()
        
        gate = get_approval_gate()
        
        # Create multiple high-risk requests
        for action_id in action_ids:
            request = ApprovalRequest(
                action_id=action_id,
                action_plan=action_plan,
                risk_level=RiskLevel.HIGH.value,
                tenant_id=tenant_id,
                user_id=user_id,
            )
            gate.evaluate(request)
        
        # Get pending for this tenant
        pending = gate.get_pending_approvals(tenant_id=tenant_id)
        
        # All should be from this tenant
        assert len(pending) == len(action_ids)
        for item in pending:
            assert item.tenant_id == tenant_id
