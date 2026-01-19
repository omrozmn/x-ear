"""
Property-based tests for Policy Engine.

**Feature: ai-layer-architecture**
**Property 10: Policy Engine Determinism**

**Validates: Requirements 7.1, 7.2, 7.4**

Tests that:
- Policy Engine is deterministic (same input = same output)
- RBAC rules are evaluated correctly
- Compliance rules are evaluated correctly
- Risk thresholds are enforced
- Tenant isolation is enforced
"""

import sys
from pathlib import Path

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings

from ai.policies.policy_engine import (
    PolicyEngine,
    PolicyDecision,
    PolicyDecisionType,
    PolicyContext,
    PolicyViolation,
    PolicyRuleType,
)
from ai.policies.rules import (
    RBACRule,
    TenantIsolationRule,
    ComplianceRule,
    RiskThresholdRule,
    DataAccessRule,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def empty_engine():
    """Create an empty policy engine."""
    return PolicyEngine()


@pytest.fixture
def basic_context():
    """Create a basic policy context."""
    return PolicyContext(
        user_id="user_1",
        tenant_id="tenant_1",
        user_roles={"user"},
        user_permissions={"read", "write"},
        action_type="test_action",
    )


@pytest.fixture
def admin_context():
    """Create an admin policy context."""
    return PolicyContext(
        user_id="admin_1",
        tenant_id="tenant_1",
        user_roles={"admin", "user"},
        user_permissions={"read", "write", "admin", "delete"},
        action_type="admin_action",
    )


# =============================================================================
# PolicyEngine Basic Tests
# =============================================================================

class TestPolicyEngineBasic:
    """Basic tests for PolicyEngine."""
    
    def test_empty_engine_allows_all(self, empty_engine, basic_context):
        """Empty engine with no rules allows all actions."""
        decision = empty_engine.evaluate(basic_context)
        
        assert decision.is_allowed
        assert decision.decision == PolicyDecisionType.ALLOW
        assert len(decision.violations) == 0
    
    def test_register_rule(self, empty_engine):
        """Rules can be registered."""
        rule = RBACRule(
            rule_id="test_rule",
            version="1.0.0",
            description="Test rule",
            required_permissions={"test_permission"},
        )
        
        empty_engine.register_rule(rule)
        
        retrieved = empty_engine.get_rule("test_rule")
        assert retrieved is not None
        assert retrieved.rule_id == "test_rule"
    
    def test_list_rules(self, empty_engine):
        """Rules can be listed."""
        for i in range(3):
            rule = RBACRule(
                rule_id=f"rule_{i}",
                version="1.0.0",
                description=f"Rule {i}",
                required_permissions=set(),
            )
            empty_engine.register_rule(rule)
        
        rules = empty_engine.list_rules()
        assert len(rules) == 3
    
    def test_decision_to_dict(self, empty_engine, basic_context):
        """Decision can be serialized to dict."""
        decision = empty_engine.evaluate(basic_context)
        
        result = decision.to_dict()
        
        assert "decision" in result
        assert "isAllowed" in result
        assert "violations" in result
        assert "evaluatedRules" in result


# =============================================================================
# Property 10: Policy Engine Determinism
# =============================================================================

class TestPolicyEngineDeterminism:
    """
    Property 10: Policy Engine Determinism
    
    Validates: Requirements 7.1, 7.2, 7.4
    - Same input always produces same output
    - No randomness in decision making
    """
    
    def test_same_context_same_decision(self, empty_engine):
        """Same context produces same decision."""
        rule = RBACRule(
            rule_id="test_rule",
            version="1.0.0",
            description="Test rule",
            required_permissions={"special_permission"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions={"read"},
            action_type="test_action",
        )
        
        # Evaluate multiple times
        decisions = [empty_engine.evaluate(context) for _ in range(10)]
        
        # All decisions should be the same
        first_decision = decisions[0].decision
        for d in decisions[1:]:
            assert d.decision == first_decision
    
    @given(
        user_id=st.text(min_size=1, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
        tenant_id=st.text(min_size=1, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
    )
    @settings(max_examples=100)
    def test_determinism_property(self, user_id: str, tenant_id: str):
        """
        Property: Policy evaluation is deterministic.
        Same context always produces same decision.
        """
        engine = PolicyEngine()
        
        rule = RBACRule(
            rule_id="test_rule",
            version="1.0.0",
            description="Test rule",
            required_permissions={"permission_a"},
        )
        engine.register_rule(rule)
        
        context = PolicyContext(
            user_id=user_id,
            tenant_id=tenant_id,
            user_roles={"user"},
            user_permissions={"read"},
            action_type="test",
        )
        
        decision1 = engine.evaluate(context)
        decision2 = engine.evaluate(context)
        
        assert decision1.decision == decision2.decision
        assert len(decision1.violations) == len(decision2.violations)
    
    def test_no_llm_involvement(self, empty_engine, basic_context):
        """Policy engine makes decisions without LLM."""
        # This is a design test - the engine should not have any LLM calls
        # We verify by checking that evaluation is fast and deterministic
        import time
        
        rule = RBACRule(
            rule_id="test_rule",
            version="1.0.0",
            description="Test rule",
            required_permissions=set(),
        )
        empty_engine.register_rule(rule)
        
        start = time.time()
        for _ in range(1000):
            empty_engine.evaluate(basic_context)
        elapsed = time.time() - start
        
        # 1000 evaluations should complete in under 1 second (no network calls)
        assert elapsed < 1.0


# =============================================================================
# RBAC Rule Tests
# =============================================================================

class TestRBACRules:
    """Tests for RBAC rules."""
    
    def test_missing_permission_denied(self, empty_engine):
        """Missing required permission results in denial."""
        rule = RBACRule(
            rule_id="require_admin",
            version="1.0.0",
            description="Require admin permission",
            required_permissions={"admin"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions={"read", "write"},  # No admin
            action_type="admin_action",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert decision.is_denied
        assert len(decision.violations) == 1
        assert "admin" in decision.violations[0].message
    
    def test_has_permission_allowed(self, empty_engine):
        """Having required permission results in allow."""
        rule = RBACRule(
            rule_id="require_read",
            version="1.0.0",
            description="Require read permission",
            required_permissions={"read"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions={"read", "write"},
            action_type="read_action",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert decision.is_allowed
    
    def test_missing_role_denied(self, empty_engine):
        """Missing required role results in denial."""
        rule = RBACRule(
            rule_id="require_admin_role",
            version="1.0.0",
            description="Require admin role",
            required_roles={"admin"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},  # No admin role
            user_permissions={"read"},
            action_type="admin_action",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert decision.is_denied
    
    def test_action_pattern_matching(self, empty_engine):
        """Action pattern matching works correctly."""
        rule = RBACRule(
            rule_id="admin_actions",
            version="1.0.0",
            description="Admin actions require admin role",
            required_roles={"admin"},
            action_pattern="admin_*",
        )
        empty_engine.register_rule(rule)
        
        # Non-matching action should be allowed
        context1 = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="read_data",  # Doesn't match admin_*
        )
        assert empty_engine.evaluate(context1).is_allowed
        
        # Matching action without role should be denied
        context2 = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="admin_delete",  # Matches admin_*
        )
        assert empty_engine.evaluate(context2).is_denied
    
    @given(
        permissions=st.sets(st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnopqrstuvwxyz"), max_size=5),
        required=st.sets(st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnopqrstuvwxyz"), max_size=3),
    )
    @settings(max_examples=100)
    def test_permission_check_property(self, permissions: set, required: set):
        """
        Property: Permission check is correct.
        Allow if user has all required permissions, deny otherwise.
        """
        engine = PolicyEngine()
        
        rule = RBACRule(
            rule_id="test",
            version="1.0.0",
            description="Test",
            required_permissions=required,
        )
        engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user",
            tenant_id="tenant",
            user_roles=set(),
            user_permissions=permissions,
            action_type="test",
        )
        
        decision = engine.evaluate(context)
        
        if required <= permissions:
            assert decision.is_allowed
        else:
            assert decision.is_denied


# =============================================================================
# Tenant Isolation Tests
# =============================================================================

class TestTenantIsolation:
    """Tests for tenant isolation rules."""
    
    def test_same_tenant_allowed(self, empty_engine):
        """Same tenant access is allowed."""
        rule = TenantIsolationRule(
            rule_id="tenant_isolation",
            version="1.0.0",
            description="Enforce tenant isolation",
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="read",
            target_tenant_id="tenant_1",  # Same tenant
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_allowed
    
    def test_cross_tenant_denied(self, empty_engine):
        """Cross-tenant access is denied by default."""
        rule = TenantIsolationRule(
            rule_id="tenant_isolation",
            version="1.0.0",
            description="Enforce tenant isolation",
            allow_cross_tenant=False,
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="read",
            target_tenant_id="tenant_2",  # Different tenant
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_denied
    
    def test_super_admin_cross_tenant_allowed(self, empty_engine):
        """Super admin can access cross-tenant."""
        rule = TenantIsolationRule(
            rule_id="tenant_isolation",
            version="1.0.0",
            description="Enforce tenant isolation",
            allow_cross_tenant=True,
            cross_tenant_roles={"super_admin"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="admin_1",
            tenant_id="tenant_1",
            user_roles={"super_admin"},
            user_permissions=set(),
            action_type="read",
            target_tenant_id="tenant_2",
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_allowed
    
    @given(
        user_tenant=st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
        target_tenant=st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
    )
    @settings(max_examples=100)
    def test_tenant_isolation_property(self, user_tenant: str, target_tenant: str):
        """
        Property: Tenant isolation is enforced.
        Cross-tenant access is denied unless explicitly allowed.
        """
        engine = PolicyEngine()
        
        rule = TenantIsolationRule(
            rule_id="tenant_isolation",
            version="1.0.0",
            description="Enforce tenant isolation",
            allow_cross_tenant=False,
        )
        engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user",
            tenant_id=user_tenant,
            user_roles={"user"},
            user_permissions=set(),
            action_type="test",
            target_tenant_id=target_tenant,
        )
        
        decision = engine.evaluate(context)
        
        if user_tenant == target_tenant:
            assert decision.is_allowed
        else:
            assert decision.is_denied


# =============================================================================
# Risk Threshold Tests
# =============================================================================

class TestRiskThreshold:
    """Tests for risk threshold rules."""
    
    def test_low_risk_allowed(self, empty_engine):
        """Low risk actions are allowed."""
        rule = RiskThresholdRule(
            rule_id="risk_threshold",
            version="1.0.0",
            description="Risk threshold",
            max_risk_without_approval="medium",
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="read",
            risk_level="low",
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_allowed
    
    def test_high_risk_requires_approval(self, empty_engine):
        """High risk actions require approval."""
        rule = RiskThresholdRule(
            rule_id="risk_threshold",
            version="1.0.0",
            description="Risk threshold",
            max_risk_without_approval="medium",
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="delete",
            risk_level="high",
        )
        
        decision = empty_engine.evaluate(context)
        # High risk generates a warning, and the engine sets requires_approval
        assert decision.requires_approval or len(decision.warnings) > 0
    
    def test_blocked_risk_level_denied(self, empty_engine):
        """Blocked risk levels are denied."""
        rule = RiskThresholdRule(
            rule_id="risk_threshold",
            version="1.0.0",
            description="Risk threshold",
            blocked_risk_levels={"critical"},
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="delete_all",
            risk_level="critical",
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_denied


# =============================================================================
# Compliance Rule Tests
# =============================================================================

class TestComplianceRules:
    """Tests for compliance rules."""
    
    def test_blocked_action_denied(self, empty_engine):
        """Blocked actions are denied."""
        rule = ComplianceRule(
            rule_id="gdpr_compliance",
            version="1.0.0",
            description="GDPR compliance",
            blocked_actions={"export_all_user_data"},
            compliance_type="gdpr",
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"admin"},
            user_permissions={"admin"},
            action_type="export_all_user_data",
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_denied
        assert "gdpr" in decision.violations[0].message.lower()
    
    def test_blocked_resource_denied(self, empty_engine):
        """Blocked resources are denied."""
        rule = ComplianceRule(
            rule_id="pci_compliance",
            version="1.0.0",
            description="PCI compliance",
            blocked_resources={"credit_card_numbers"},
            compliance_type="pci",
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="read",
            target_resource="credit_card_numbers",
        )
        
        decision = empty_engine.evaluate(context)
        assert decision.is_denied


# =============================================================================
# Multiple Rules Tests
# =============================================================================

class TestMultipleRules:
    """Tests for multiple rules evaluation."""
    
    def test_all_rules_evaluated(self, empty_engine):
        """All applicable rules are evaluated."""
        rules = [
            RBACRule(
                rule_id="rule_1",
                version="1.0.0",
                description="Rule 1",
                required_permissions=set(),
            ),
            RBACRule(
                rule_id="rule_2",
                version="1.0.0",
                description="Rule 2",
                required_permissions=set(),
            ),
            RBACRule(
                rule_id="rule_3",
                version="1.0.0",
                description="Rule 3",
                required_permissions=set(),
            ),
        ]
        
        for rule in rules:
            empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="test",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert len(decision.evaluated_rules) == 3
    
    def test_first_violation_stops_allow(self, empty_engine):
        """Any violation results in denial."""
        rules = [
            RBACRule(
                rule_id="allow_rule",
                version="1.0.0",
                description="Allow rule",
                required_permissions=set(),  # No requirements
            ),
            RBACRule(
                rule_id="deny_rule",
                version="1.0.0",
                description="Deny rule",
                required_permissions={"special"},  # Missing permission
            ),
        ]
        
        for rule in rules:
            empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions={"read"},  # No 'special'
            action_type="test",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert decision.is_denied
        assert len(decision.violations) >= 1
    
    def test_disabled_rules_skipped(self, empty_engine):
        """Disabled rules are not evaluated."""
        rule = RBACRule(
            rule_id="disabled_rule",
            version="1.0.0",
            description="Disabled rule",
            required_permissions={"impossible"},
            enabled=False,  # Disabled
        )
        empty_engine.register_rule(rule)
        
        context = PolicyContext(
            user_id="user_1",
            tenant_id="tenant_1",
            user_roles={"user"},
            user_permissions=set(),
            action_type="test",
        )
        
        decision = empty_engine.evaluate(context)
        
        assert decision.is_allowed
        assert "disabled_rule" not in decision.evaluated_rules
