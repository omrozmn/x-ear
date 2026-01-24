"""Property-Based Tests for AI Email Approval Gate.

Tests Property 32: AI Email Approval Gate
Validates Requirements 9.2, 9.7

These tests verify that AI-generated emails are properly classified by risk
and that high-risk emails require human approval before sending.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from services.ai_email_safety_service import AIEmailSafetyService


class TestAIApprovalGateProperty:
    """Property-based tests for AI email approval gate."""
    
    @pytest.fixture
    def ai_safety_service(self):
        """Create AI email safety service instance."""
        return AIEmailSafetyService()
    
    @given(
        content=st.text(min_size=10, max_size=2000),
        scenario=st.sampled_from([
            "invoice_created", "marketing_campaign", "newsletter",
            "password_reset", "user_invite", "system_notification"
        ])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_risk_level_is_valid(self, ai_safety_service, content, scenario):
        """
        **Property 32.1: Valid Risk Levels**
        
        Risk level must be one of: LOW, MEDIUM, HIGH, CRITICAL.
        
        **Validates: Requirements 9.2**
        """
        risk_level = ai_safety_service.classify_risk_level(content, scenario)
        
        assert risk_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"], \
            f"Invalid risk level: {risk_level}"
    
    @given(
        content=st.text(min_size=10, max_size=2000),
        scenario=st.sampled_from([
            "invoice_created", "marketing_campaign", "newsletter",
            "password_reset", "user_invite", "system_notification"
        ])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_risk_classification_is_deterministic(self, ai_safety_service, content, scenario):
        """
        **Property 32.2: Deterministic Classification**
        
        Same content must always produce same risk level.
        
        **Validates: Requirements 9.2**
        """
        risk1 = ai_safety_service.classify_risk_level(content, scenario)
        risk2 = ai_safety_service.classify_risk_level(content, scenario)
        
        assert risk1 == risk2, "Risk classification must be deterministic"
    
    @given(
        content=st.text(min_size=10, max_size=2000),
        scenario=st.sampled_from([
            "invoice_created", "marketing_campaign", "newsletter",
            "password_reset", "user_invite", "system_notification"
        ])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_high_and_critical_require_approval(self, ai_safety_service, content, scenario):
        """
        **Property 32.3: Approval Requirement**
        
        HIGH and CRITICAL risk emails must require approval.
        LOW and MEDIUM must not require approval.
        
        **Validates: Requirements 9.2, 9.7**
        """
        risk_level = ai_safety_service.classify_risk_level(content, scenario)
        requires_approval = ai_safety_service.requires_approval(risk_level)
        
        if risk_level in ["HIGH", "CRITICAL"]:
            assert requires_approval is True, \
                f"{risk_level} must require approval"
        else:
            assert requires_approval is False, \
                f"{risk_level} must not require approval"
    
    def test_blocked_patterns_increase_risk(self, ai_safety_service):
        """
        **Property 32.4: Blocked Pattern Detection**
        
        Content with blocked patterns must have higher risk than clean content.
        
        **Validates: Requirements 9.2**
        """
        # Clean content
        clean_risk = ai_safety_service.classify_risk_level(
            content="Hello, this is a friendly reminder about your appointment.",
            scenario="system_notification"
        )
        
        # Content with blocked patterns
        risky_risk = ai_safety_service.classify_risk_level(
            content="URGENT! Act now to get this amazing loan offer! Click here immediately!",
            scenario="marketing_campaign"
        )
        
        # Define risk order
        risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        
        assert risk_order[risky_risk] > risk_order[clean_risk], \
            "Blocked patterns must increase risk level"
    
    def test_financial_keywords_trigger_high_risk(self, ai_safety_service):
        """
        **Property 32.5: Financial Pattern Detection**
        
        Financial keywords must trigger HIGH or CRITICAL risk.
        
        **Validates: Requirements 9.2**
        """
        financial_content = "Get a loan now! Bitcoin investment opportunity! Credit card offer!"
        
        risk_level = ai_safety_service.classify_risk_level(
            content=financial_content,
            scenario="marketing_campaign"
        )
        
        assert risk_level in ["HIGH", "CRITICAL"], \
            "Financial keywords must trigger HIGH or CRITICAL risk"
    
    def test_urgent_language_triggers_high_risk(self, ai_safety_service):
        """
        **Property 32.6: Urgency Detection**
        
        Urgent language must trigger HIGH or CRITICAL risk.
        
        **Validates: Requirements 9.2**
        """
        urgent_content = "URGENT! Act immediately! Limited time offer expires now!"
        
        risk_level = ai_safety_service.classify_risk_level(
            content=urgent_content,
            scenario="marketing_campaign"
        )
        
        assert risk_level in ["HIGH", "CRITICAL"], \
            "Urgent language must trigger HIGH or CRITICAL risk"
    
    def test_external_links_trigger_high_risk(self, ai_safety_service):
        """
        **Property 32.7: External Link Detection**
        
        External links (non-x-ear.com) must trigger HIGH or CRITICAL risk.
        
        **Validates: Requirements 9.2**
        """
        external_link_content = "Click here: https://suspicious-site.com/offer"
        
        risk_level = ai_safety_service.classify_risk_level(
            content=external_link_content,
            scenario="marketing_campaign"
        )
        
        assert risk_level in ["HIGH", "CRITICAL"], \
            "External links must trigger HIGH or CRITICAL risk"
    
    def test_internal_links_are_safe(self, ai_safety_service):
        """
        **Property 32.8: Internal Link Safety**
        
        Internal x-ear.com links should not trigger high risk.
        
        **Validates: Requirements 9.2**
        """
        internal_link_content = "Visit your dashboard: https://x-ear.com/dashboard"
        
        risk_level = ai_safety_service.classify_risk_level(
            content=internal_link_content,
            scenario="system_notification"
        )
        
        # Should be LOW or MEDIUM, not HIGH/CRITICAL
        assert risk_level in ["LOW", "MEDIUM"], \
            "Internal links should not trigger high risk"
    
    def test_long_content_increases_risk(self, ai_safety_service):
        """
        **Property 32.9: Content Length Risk**
        
        Very long content (>1000 chars) should increase risk to at least MEDIUM.
        
        **Validates: Requirements 9.2**
        """
        long_content = "A" * 1500  # 1500 characters
        
        risk_level = ai_safety_service.classify_risk_level(
            content=long_content,
            scenario="marketing_campaign"
        )
        
        # Long content should be at least MEDIUM risk
        risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        assert risk_order[risk_level] >= risk_order["MEDIUM"], \
            "Long content should be at least MEDIUM risk"
    
    def test_promotional_scenario_increases_risk(self, ai_safety_service):
        """
        **Property 32.10: Promotional Scenario Risk**
        
        Promotional scenarios should have higher risk than transactional.
        
        **Validates: Requirements 9.2**
        """
        content = "Check out our latest updates and features."
        
        # Promotional scenario
        promo_risk = ai_safety_service.classify_risk_level(
            content=content,
            scenario="marketing_campaign"
        )
        
        # Transactional scenario
        trans_risk = ai_safety_service.classify_risk_level(
            content=content,
            scenario="password_reset"
        )
        
        risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        
        # Promotional should be equal or higher risk
        assert risk_order[promo_risk] >= risk_order[trans_risk], \
            "Promotional scenarios should have equal or higher risk"
    
    def test_multiple_blocked_patterns_trigger_critical(self, ai_safety_service):
        """
        **Property 32.11: Multiple Pattern Detection**
        
        Content with 3+ blocked patterns must trigger CRITICAL risk.
        
        **Validates: Requirements 9.2**
        """
        # Content with multiple blocked patterns
        multi_pattern_content = (
            "URGENT loan offer! "
            "Act immediately to get this credit card! "
            "Bitcoin investment expires now! "
            "Click https://external-site.com"
        )
        
        risk_level = ai_safety_service.classify_risk_level(
            content=multi_pattern_content,
            scenario="marketing_campaign"
        )
        
        assert risk_level == "CRITICAL", \
            "3+ blocked patterns must trigger CRITICAL risk"
    
    @given(
        content=st.text(min_size=10, max_size=2000),
        scenario=st.sampled_from([
            "invoice_created", "marketing_campaign", "newsletter",
            "password_reset", "user_invite", "system_notification"
        ])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_blocked_patterns_list_is_valid(self, ai_safety_service, content, scenario):
        """
        **Property 32.12: Pattern List Validity**
        
        Blocked patterns check must return a list.
        
        **Validates: Requirements 9.2**
        """
        patterns = ai_safety_service.check_blocked_patterns(content)
        
        assert isinstance(patterns, list), "Blocked patterns must return a list"
        assert all(isinstance(p, str) for p in patterns), \
            "All patterns must be strings"
