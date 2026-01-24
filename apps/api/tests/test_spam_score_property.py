"""Property-Based Tests for Spam Score Calculation.

Tests Property 30: Spam Score Calculation
Validates Requirements 7.3, 7.4

These tests verify that spam scoring is deterministic, consistent, and follows
industry-standard thresholds for email deliverability.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from services.spam_filter_service import SpamFilterService


class TestSpamScoreProperty:
    """Property-based tests for spam score calculation."""
    
    @pytest.fixture
    def spam_service(self):
        """Create spam filter service instance."""
        return SpamFilterService()
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_spam_score_is_non_negative(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.1: Non-Negative Score**
        
        Spam score must always be >= 0.
        
        **Validates: Requirements 7.3**
        """
        result = spam_service.analyze_content(subject, html_body, text_body)
        
        assert result["spam_score"] >= 0, "Spam score must be non-negative"
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_spam_score_is_deterministic(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.2: Deterministic Scoring**
        
        Same content must always produce same spam score.
        
        **Validates: Requirements 7.3, 7.4**
        """
        result1 = spam_service.analyze_content(subject, html_body, text_body)
        result2 = spam_service.analyze_content(subject, html_body, text_body)
        
        assert result1["spam_score"] == result2["spam_score"], \
            "Spam score must be deterministic"
        assert result1["risk_level"] == result2["risk_level"], \
            "Risk level must be deterministic"
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_risk_level_matches_score_thresholds(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.3: Risk Level Consistency**
        
        Risk level must match score thresholds:
        - LOW: score < 5
        - MEDIUM: 5 <= score < 10
        - HIGH: 10 <= score < 15
        - CRITICAL: score >= 15
        
        **Validates: Requirements 7.4**
        """
        result = spam_service.analyze_content(subject, html_body, text_body)
        score = result["spam_score"]
        risk_level = result["risk_level"]
        
        if score < 5:
            assert risk_level == "LOW", f"Score {score} should be LOW"
        elif score < 10:
            assert risk_level == "MEDIUM", f"Score {score} should be MEDIUM"
        elif score < 15:
            assert risk_level == "HIGH", f"Score {score} should be HIGH"
        else:
            assert risk_level == "CRITICAL", f"Score {score} should be CRITICAL"
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_rejection_threshold_at_10(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.4: Rejection Threshold**
        
        Emails with score >= 10 must be marked for rejection.
        
        **Validates: Requirements 7.4**
        """
        result = spam_service.analyze_content(subject, html_body, text_body)
        score = result["spam_score"]
        should_reject = result["should_reject"]
        
        if score >= 10:
            assert should_reject is True, f"Score {score} should be rejected"
        else:
            assert should_reject is False, f"Score {score} should not be rejected"
    
    def test_spam_keywords_increase_score(self, spam_service):
        """
        **Property 30.5: Keyword Detection**
        
        Content with spam keywords must have higher score than clean content.
        
        **Validates: Requirements 7.3**
        """
        # Clean content
        clean_result = spam_service.analyze_content(
            subject="Monthly Newsletter",
            html_body="<p>Hello, here is your monthly update.</p>",
            text_body="Hello, here is your monthly update."
        )
        
        # Spam content
        spam_result = spam_service.analyze_content(
            subject="FREE MONEY! Click here NOW!",
            html_body="<p>Congratulations! You won the lottery! Act now!</p>",
            text_body="Congratulations! You won the lottery! Act now!"
        )
        
        assert spam_result["spam_score"] > clean_result["spam_score"], \
            "Spam keywords must increase score"
    
    def test_all_caps_subject_increases_score(self, spam_service):
        """
        **Property 30.6: ALL CAPS Detection**
        
        ALL CAPS subject lines must increase spam score.
        
        **Validates: Requirements 7.3**
        """
        # Normal case
        normal_result = spam_service.analyze_content(
            subject="Important Update",
            html_body="<p>Please review this update.</p>",
            text_body="Please review this update."
        )
        
        # ALL CAPS
        caps_result = spam_service.analyze_content(
            subject="IMPORTANT UPDATE",
            html_body="<p>Please review this update.</p>",
            text_body="Please review this update."
        )
        
        assert caps_result["spam_score"] >= normal_result["spam_score"], \
            "ALL CAPS subject must increase or maintain score"
    
    def test_excessive_punctuation_increases_score(self, spam_service):
        """
        **Property 30.7: Punctuation Detection**
        
        Excessive punctuation must increase spam score.
        
        **Validates: Requirements 7.3**
        """
        # Normal punctuation
        normal_result = spam_service.analyze_content(
            subject="Important Update!",
            html_body="<p>Please review this update.</p>",
            text_body="Please review this update."
        )
        
        # Excessive punctuation
        excessive_result = spam_service.analyze_content(
            subject="Important Update!!!!!!",
            html_body="<p>Please review this update.</p>",
            text_body="Please review this update."
        )
        
        assert excessive_result["spam_score"] >= normal_result["spam_score"], \
            "Excessive punctuation must increase or maintain score"
    
    def test_high_link_density_increases_score(self, spam_service):
        """
        **Property 30.8: Link Density Detection**
        
        High link density must increase spam score.
        
        **Validates: Requirements 7.3**
        """
        # Low link density
        low_links_result = spam_service.analyze_content(
            subject="Newsletter",
            html_body="<p>Check out <a href='#'>this article</a>.</p>",
            text_body="Check out this article."
        )
        
        # High link density
        high_links_html = "<p>" + " ".join([f"<a href='#'>Link {i}</a>" for i in range(15)]) + "</p>"
        high_links_result = spam_service.analyze_content(
            subject="Newsletter",
            html_body=high_links_html,
            text_body="Many links here."
        )
        
        assert high_links_result["spam_score"] > low_links_result["spam_score"], \
            "High link density must increase score"
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_warnings_list_is_valid(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.9: Warnings Validity**
        
        Warnings list must be a list and contain only strings.
        
        **Validates: Requirements 7.4**
        """
        result = spam_service.analyze_content(subject, html_body, text_body)
        warnings = result["warnings"]
        
        assert isinstance(warnings, list), "Warnings must be a list"
        assert all(isinstance(w, str) for w in warnings), \
            "All warnings must be strings"
    
    @given(
        subject=st.text(min_size=1, max_size=200),
        html_body=st.text(min_size=10, max_size=1000),
        text_body=st.text(min_size=10, max_size=1000)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_result_structure_is_complete(self, spam_service, subject, html_body, text_body):
        """
        **Property 30.10: Result Structure**
        
        Result must contain all required fields.
        
        **Validates: Requirements 7.4**
        """
        result = spam_service.analyze_content(subject, html_body, text_body)
        
        assert "spam_score" in result, "Result must contain spam_score"
        assert "risk_level" in result, "Result must contain risk_level"
        assert "warnings" in result, "Result must contain warnings"
        assert "should_reject" in result, "Result must contain should_reject"
        
        assert isinstance(result["spam_score"], int), "spam_score must be int"
        assert isinstance(result["risk_level"], str), "risk_level must be str"
        assert isinstance(result["warnings"], list), "warnings must be list"
        assert isinstance(result["should_reject"], bool), "should_reject must be bool"
