"""
Property-based tests for Approval Token Security.

**Property 9: Approval Token Security**
**Validates: Requirements 8.3, 8.4, 8.5**

Requirements:
- 8.3: Approval token is single-use, HMAC-signed, bound to action_plan_hash + tenant_id + approver_id
- 8.4: Approval token expires within 24 hours
- 8.5: Token invalidated if action_plan changes (plan drift detection)
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
import hashlib
import json

from ai.utils.approval_token import (
    ApprovalToken,
    ApprovalTokenRegistry,
    ApprovalTokenValidator,
    TokenValidationResult,
    generate_approval_token,
    validate_approval_token,
    get_token_registry,
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


@pytest.fixture(autouse=True)
def reset_registry():
    """Reset the token registry before each test."""
    reset_token_registry()
    yield
    reset_token_registry()


class TestApprovalTokenGeneration:
    """Tests for token generation."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_token_generation_creates_valid_signature(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.1: For any valid inputs, generated token has valid signature.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Token should have valid signature
        assert token.verify_signature(), "Generated token should have valid signature"
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_token_bound_to_action_plan_hash(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.2: Token is bound to action_plan_hash.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Token should contain the action plan hash
        assert token.action_plan_hash == action_plan_hash
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_token_bound_to_tenant_and_approver(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.3: Token is bound to tenant_id and approver_id.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Token should contain tenant and approver IDs
        assert token.tenant_id == tenant_id
        assert token.approver_id == approver_id


class TestApprovalTokenExpiration:
    """Tests for token expiration."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        expiration_hours=st.integers(min_value=1, max_value=48),
    )
    @settings(max_examples=100)
    def test_token_expiration_capped_at_24_hours(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
        expiration_hours: int,
    ):
        """
        Property 9.4: Token expiration is capped at 24 hours.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.4**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
            expiration_hours=expiration_hours,
        )
        
        # Expiration should be at most 24 hours from now
        max_expiration = datetime.now(timezone.utc) + timedelta(hours=24, seconds=5)
        assert token.expires_at <= max_expiration, "Token expiration should be capped at 24 hours"
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_expired_token_is_detected(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.5: Expired tokens are correctly detected.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.4**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        # Create token with past expiration
        token = ApprovalToken(
            token_id=f"aptok_test",
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
            issued_at=datetime.now(timezone.utc) - timedelta(hours=25),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            signature="dummy",  # Will be invalid but we're testing expiration
        )
        
        assert token.is_expired(), "Token with past expiration should be detected as expired"


class TestApprovalTokenPlanDrift:
    """Tests for plan drift detection."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        modified_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_plan_drift_detected_when_plan_changes(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
        modified_plan: dict,
    ):
        """
        Property 9.6: Plan drift is detected when action plan changes.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.5**
        """
        # Ensure plans are different
        assume(action_plan != modified_plan)
        
        original_hash = _compute_action_plan_hash(action_plan)
        modified_hash = _compute_action_plan_hash(modified_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=original_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Plan drift should be detected
        assert token.check_plan_drift(modified_hash), "Plan drift should be detected when plan changes"
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_no_plan_drift_when_plan_unchanged(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.7: No plan drift when action plan is unchanged.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.5**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # No plan drift when hash is the same
        assert not token.check_plan_drift(action_plan_hash), "No plan drift when plan is unchanged"


class TestApprovalTokenSingleUse:
    """Tests for single-use enforcement."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_token_can_only_be_used_once(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.8: Token can only be used once (single-use enforcement).
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        # Generate and register token
        token = generate_approval_token(
            action_id=action_id,
            action_plan=action_plan,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # First validation and consumption should succeed
        result1 = validate_approval_token(
            token=token,
            action_plan=action_plan,
            consume=True,
        )
        assert result1.valid, "First use of token should be valid"
        
        # Second use should fail
        result2 = validate_approval_token(
            token=token,
            action_plan=action_plan,
            consume=True,
        )
        assert not result2.valid, "Second use of token should fail"
        assert result2.error_type == "already_used", "Error should indicate token already used"


class TestApprovalTokenSignatureSecurity:
    """Tests for signature security."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_tampered_signature_is_rejected(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.9: Tampered signatures are rejected.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Tamper with signature
        tampered_token = ApprovalToken(
            token_id=token.token_id,
            action_id=token.action_id,
            action_plan_hash=token.action_plan_hash,
            tenant_id=token.tenant_id,
            approver_id=token.approver_id,
            issued_at=token.issued_at,
            expires_at=token.expires_at,
            signature="tampered_signature_12345",
        )
        
        assert not tampered_token.verify_signature(), "Tampered signature should be rejected"
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
        different_tenant=tenant_id_strategy,
    )
    @settings(max_examples=100)
    def test_modified_tenant_invalidates_signature(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
        different_tenant: str,
    ):
        """
        Property 9.10: Modifying tenant_id invalidates signature.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        assume(tenant_id != different_tenant)
        
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        token = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Modify tenant_id but keep original signature
        modified_token = ApprovalToken(
            token_id=token.token_id,
            action_id=token.action_id,
            action_plan_hash=token.action_plan_hash,
            tenant_id=different_tenant,  # Changed
            approver_id=token.approver_id,
            issued_at=token.issued_at,
            expires_at=token.expires_at,
            signature=token.signature,  # Original signature
        )
        
        assert not modified_token.verify_signature(), "Modified tenant should invalidate signature"


class TestApprovalTokenEncodeDecode:
    """Tests for token encoding/decoding."""
    
    @given(
        action_id=action_id_strategy,
        tenant_id=tenant_id_strategy,
        approver_id=user_id_strategy,
        action_plan=action_plan_strategy,
    )
    @settings(max_examples=100)
    def test_encode_decode_roundtrip(
        self,
        action_id: str,
        tenant_id: str,
        approver_id: str,
        action_plan: dict,
    ):
        """
        Property 9.11: Encoding then decoding produces equivalent token.
        
        **Feature: ai-layer-architecture, Property 9: Approval Token Security**
        **Validates: Requirements 8.3**
        """
        action_plan_hash = _compute_action_plan_hash(action_plan)
        
        original = ApprovalToken.generate(
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
        )
        
        # Encode and decode
        encoded = original.encode()
        decoded = ApprovalToken.decode(encoded)
        
        # Should be equivalent
        assert decoded.token_id == original.token_id
        assert decoded.action_id == original.action_id
        assert decoded.action_plan_hash == original.action_plan_hash
        assert decoded.tenant_id == original.tenant_id
        assert decoded.approver_id == original.approver_id
        assert decoded.signature == original.signature
        
        # Decoded token should still have valid signature
        assert decoded.verify_signature()
