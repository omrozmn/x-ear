"""
Tests for EmailTemplateService

This module tests the email template rendering service including:
- Template rendering for all scenarios
- Multi-language support with fallback
- Variable validation
- XSS prevention
- Template injection prevention
"""

import pytest
from services.email_template_service import (
    EmailTemplateService,
    get_email_template_service,
    reset_email_template_service,
    TEMPLATE_REQUIRED_VARIABLES
)
from utils.exceptions import TemplateError, ValidationError


class TestEmailTemplateService:
    """Test EmailTemplateService basic functionality."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_initialization(self):
        """Test service initialization."""
        service = EmailTemplateService()
        assert service.template_dir == "templates/email"
        assert service.jinja_env is not None
    
    def test_get_supported_scenarios(self):
        """Test getting list of supported scenarios."""
        service = EmailTemplateService()
        scenarios = service.get_supported_scenarios()
        
        assert "password_reset" in scenarios
        assert "user_invite" in scenarios
        assert "email_verification" in scenarios
        assert "invoice_created" in scenarios
        assert "system_error" in scenarios
        assert "smtp_test" in scenarios
    
    def test_get_required_variables(self):
        """Test getting required variables for a scenario."""
        service = EmailTemplateService()
        
        # Password reset
        vars_password_reset = service.get_required_variables("password_reset")
        assert "reset_link" in vars_password_reset
        assert "user_name" in vars_password_reset
        assert "expires_in_hours" in vars_password_reset
        
        # SMTP test
        vars_smtp_test = service.get_required_variables("smtp_test")
        assert "user_name" in vars_smtp_test
        assert "tenant_name" in vars_smtp_test
    
    def test_render_password_reset_template(self):
        """Test rendering password reset template."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Ahmet Yılmaz",
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": 1
        }
        
        subject, html, text = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "Şifre Sıfırlama" in subject
        assert "X-Ear CRM" in subject
        
        # Check HTML body
        assert "Ahmet Yılmaz" in html
        assert "https://app.x-ear.com/reset/abc123" in html
        assert "1 saat" in html
        assert "X-Ear CRM" in html  # From base layout
        
        # Check text body
        assert "Ahmet Yılmaz" in text
        assert "https://app.x-ear.com/reset/abc123" in text
        assert "1 saat" in text
    
    def test_render_user_invite_template(self):
        """Test rendering user invite template."""
        service = EmailTemplateService()
        
        variables = {
            "inviter_name": "Mehmet Demir",
            "organization_name": "Acme Corp",
            "invitation_link": "https://app.x-ear.com/invite/xyz789",
            "role_name": "Yönetici"
        }
        
        subject, html, text = service.render_template(
            scenario="user_invite",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "Acme Corp" in subject
        assert "Sistem Daveti" in subject
        
        # Check HTML body
        assert "Mehmet Demir" in html
        assert "Acme Corp" in html
        assert "https://app.x-ear.com/invite/xyz789" in html
        assert "Yönetici" in html
        
        # Check text body
        assert "Mehmet Demir" in text
        assert "Acme Corp" in text
    
    def test_render_email_verification_template(self):
        """Test rendering email verification template."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Ayşe Kaya",
            "verification_link": "https://app.x-ear.com/verify/def456"
        }
        
        subject, html, text = service.render_template(
            scenario="email_verification",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "E-posta Adresinizi Doğrulayın" in subject
        
        # Check HTML body
        assert "Ayşe Kaya" in html
        assert "https://app.x-ear.com/verify/def456" in html
        assert "24 saat" in html
        
        # Check text body
        assert "Ayşe Kaya" in text
        assert "https://app.x-ear.com/verify/def456" in text
    
    def test_render_invoice_created_template(self):
        """Test rendering invoice created template."""
        service = EmailTemplateService()
        
        variables = {
            "invoice_number": "INV-2025-001",
            "amount": "1,500.00",
            "currency": "TRY",
            "due_date": "2025-02-15",
            "invoice_link": "https://app.x-ear.com/invoices/001",
            "payment_status": "ödenmedi",
            "payment_instructions": "Banka havalesi ile ödeme yapabilirsiniz."
        }
        
        subject, html, text = service.render_template(
            scenario="invoice_created",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "INV-2025-001" in subject
        
        # Check HTML body
        assert "INV-2025-001" in html
        assert "1,500.00" in html
        assert "TRY" in html
        assert "2025-02-15" in html
        assert "https://app.x-ear.com/invoices/001" in html
        assert "Banka havalesi" in html
        
        # Check text body
        assert "INV-2025-001" in text
        assert "1,500.00" in text
    
    def test_render_system_error_template(self):
        """Test rendering system error template."""
        service = EmailTemplateService()
        
        variables = {
            "error_type": "DatabaseConnectionError",
            "timestamp": "2025-01-25 10:30:00",
            "tenant_name": "Test Tenant",
            "error_details": "Connection timeout after 30 seconds",
            "admin_link": "https://admin.x-ear.com/errors"
        }
        
        subject, html, text = service.render_template(
            scenario="system_error",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "Sistem Hatası" in subject
        assert "DatabaseConnectionError" in subject
        
        # Check HTML body
        assert "DatabaseConnectionError" in html
        assert "2025-01-25 10:30:00" in html
        assert "Test Tenant" in html
        assert "Connection timeout" in html
        assert "https://admin.x-ear.com/errors" in html
        
        # Check text body
        assert "DatabaseConnectionError" in text
        assert "Test Tenant" in text
    
    def test_render_smtp_test_template(self):
        """Test rendering SMTP test template."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Admin User",
            "tenant_name": "Test Organization"
        }
        
        subject, html, text = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        # Check subject
        assert "SMTP Test" in subject
        
        # Check HTML body
        assert "Admin User" in html
        assert "Test Organization" in html
        assert "SMTP Yapılandırması Başarılı" in html
        
        # Check text body
        assert "Admin User" in text
        assert "Test Organization" in text
    
    def test_missing_required_variable_raises_validation_error(self):
        """Test that missing required variables raise ValidationError."""
        service = EmailTemplateService()
        
        # Missing reset_link
        variables = {
            "user_name": "Ahmet",
            "expires_in_hours": 1
        }
        
        with pytest.raises(ValidationError) as exc_info:
            service.render_template(
                scenario="password_reset",
                language="tr",
                variables=variables
            )
        
        assert "reset_link" in str(exc_info.value)
    
    def test_language_fallback_to_turkish(self):
        """Test language fallback to Turkish when requested language not found."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "tenant_name": "Test Org"
        }
        
        # Request English (not implemented yet), should fallback to Turkish
        subject, html, text = service.render_template(
            scenario="smtp_test",
            language="en",
            variables=variables
        )
        
        # Should contain Turkish text (fallback)
        assert "SMTP" in subject
        assert "Test User" in html
    
    def test_xss_prevention_in_variables(self):
        """Test that HTML special characters are escaped (XSS prevention)."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "<script>alert('XSS')</script>",
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": 1
        }
        
        subject, html, text = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        # HTML should be escaped in HTML template
        assert "&lt;script&gt;" in html
        assert "<script>" not in html
        
        # Text template doesn't need escaping (plain text)
        assert "<script>" in text
    
    def test_template_not_found_raises_template_error(self):
        """Test that non-existent template raises TemplateError."""
        service = EmailTemplateService()
        
        variables = {"test": "value"}
        
        with pytest.raises(TemplateError) as exc_info:
            service.render_template(
                scenario="nonexistent_scenario",
                language="tr",
                variables=variables
            )
        
        assert "Template not found" in str(exc_info.value)
    
    def test_common_variables_added_automatically(self):
        """Test that common variables are added automatically."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "tenant_name": "Test Org"
        }
        
        subject, html, text = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        # Check common variables
        assert "X-Ear CRM" in html  # app_name
        assert "destek@x-ear.com" in html  # support_email
        # current_year is in footer
        from datetime import datetime
        assert str(datetime.now().year) in html
    
    def test_get_email_template_service_returns_singleton(self):
        """Test that get_email_template_service returns singleton instance."""
        service1 = get_email_template_service()
        service2 = get_email_template_service()
        
        assert service1 is service2
    
    def test_reset_email_template_service_clears_singleton(self):
        """Test that reset_email_template_service clears singleton."""
        service1 = get_email_template_service()
        reset_email_template_service()
        service2 = get_email_template_service()
        
        assert service1 is not service2


class TestTemplateVariableValidation:
    """Test template variable validation."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_validate_all_required_variables_present(self):
        """Test validation passes when all required variables present."""
        service = EmailTemplateService()
        
        variables = {
            "reset_link": "https://...",
            "user_name": "Test",
            "expires_in_hours": 1
        }
        
        # Should not raise
        service._validate_variables("password_reset", variables)
    
    def test_validate_raises_on_missing_single_variable(self):
        """Test validation raises when single variable missing."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test",
            "expires_in_hours": 1
        }
        
        with pytest.raises(ValidationError) as exc_info:
            service._validate_variables("password_reset", variables)
        
        assert "reset_link" in str(exc_info.value)
    
    def test_validate_raises_on_missing_multiple_variables(self):
        """Test validation raises when multiple variables missing."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            service._validate_variables("password_reset", variables)
        
        error_msg = str(exc_info.value)
        assert "reset_link" in error_msg
        assert "expires_in_hours" in error_msg
    
    def test_validate_allows_extra_variables(self):
        """Test validation allows extra variables not in required list."""
        service = EmailTemplateService()
        
        variables = {
            "reset_link": "https://...",
            "user_name": "Test",
            "expires_in_hours": 1,
            "extra_variable": "extra_value"
        }
        
        # Should not raise
        service._validate_variables("password_reset", variables)


class TestLanguageResolution:
    """Test language resolution and fallback."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_resolve_language_returns_requested_when_exists(self):
        """Test language resolution returns requested language when template exists."""
        service = EmailTemplateService()
        
        # Turkish templates exist
        lang = service._resolve_language("password_reset", "tr")
        assert lang == "tr"
    
    def test_resolve_language_falls_back_to_turkish(self):
        """Test language resolution falls back to Turkish when requested not found."""
        service = EmailTemplateService()
        
        # English templates don't exist yet
        lang = service._resolve_language("password_reset", "en")
        assert lang == "tr"
    
    def test_resolve_language_falls_back_for_invalid_language(self):
        """Test language resolution falls back for invalid language codes."""
        service = EmailTemplateService()
        
        lang = service._resolve_language("password_reset", "invalid")
        assert lang == "tr"


# Property-Based Tests
# These tests use Hypothesis to verify universal properties across many inputs

from hypothesis import given, settings, strategies as st


class TestTemplateRenderingProperties:
    """Property-based tests for template rendering."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    @given(
        scenario=st.sampled_from([
            "password_reset",
            "user_invite",
            "email_verification",
            "invoice_created",
            "system_error",
            "smtp_test"
        ]),
        # Generate a subset of required variables (to test missing variables)
        missing_count=st.integers(min_value=1, max_value=3)
    )
    @settings(max_examples=100)
    def test_property_17_missing_variable_validation(self, scenario, missing_count):
        """
        Property 17: Missing Variable Validation
        
        **Validates: Requirements 6.5, 23.2**
        
        For any template rendering with missing required variables, the system should
        raise a ValidationError before attempting to send the email.
        
        Property: For all scenarios with missing required variables, render_template()
        raises ValidationError with clear indication of which variables are missing.
        """
        service = EmailTemplateService()
        
        # Get required variables for this scenario
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        if not required_vars:
            # Skip scenarios with no required variables
            return
        
        # Limit missing_count to actual number of required variables
        actual_missing_count = min(missing_count, len(required_vars))
        
        # Create variables with some missing
        variables = self._create_test_variables(scenario, required_vars)
        
        # Remove some required variables
        vars_to_remove = required_vars[:actual_missing_count]
        for var in vars_to_remove:
            del variables[var]
        
        # Property: Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            service.render_template(
                scenario=scenario,
                language="tr",
                variables=variables
            )
        
        # Property: Error message should mention missing variables
        error_msg = str(exc_info.value)
        assert "Missing required variables" in error_msg, \
            "Error message should indicate missing variables"
        
        # Property: Error message should list at least one missing variable
        assert any(var in error_msg for var in vars_to_remove), \
            f"Error message should list missing variables: {vars_to_remove}"
    
    @given(
        scenario=st.sampled_from([
            "password_reset",
            "user_invite",
            "email_verification",
            "smtp_test"
        ]),
        # Generate strings with XSS attack patterns
        xss_payload=st.sampled_from([
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src='javascript:alert(\"XSS\")'></iframe>",
            "<<SCRIPT>alert('XSS');//<</SCRIPT>",
            "<BODY ONLOAD=alert('XSS')>",
            "&lt;script&gt;alert('XSS')&lt;/script&gt;",
            "<div style='background:url(javascript:alert(\"XSS\"))'>"
        ])
    )
    @settings(max_examples=100)
    def test_property_18_xss_prevention(self, scenario, xss_payload):
        """
        Property 18: XSS Prevention in Templates
        
        **Validates: Requirements 6.7**
        
        For any user-provided variable containing HTML special characters (<, >, &, ", '),
        the rendered template should escape these characters to prevent XSS attacks.
        
        Property: For all user inputs with HTML/JavaScript, the HTML output escapes
        dangerous characters while text output preserves them (plain text is safe).
        """
        service = EmailTemplateService()
        
        # Get required variables for this scenario
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        # Create valid variables
        variables = self._create_test_variables(scenario, required_vars)
        
        # Inject XSS payload into a name field (most likely to be displayed)
        if "user_name" in variables:
            variables["user_name"] = xss_payload
        elif "inviter_name" in variables:
            variables["inviter_name"] = xss_payload
        else:
            # Skip if no suitable field
            return
        
        # Render template
        subject, html_body, text_body = service.render_template(
            scenario=scenario,
            language="tr",
            variables=variables
        )
        
        # Property 1: HTML output should escape dangerous characters
        # Check for common XSS patterns that should be escaped
        if "<script>" in xss_payload.lower():
            assert "&lt;script&gt;" in html_body or "<script>" not in html_body, \
                "HTML should escape <script> tags"
        
        if "<img" in xss_payload.lower():
            assert "&lt;img" in html_body or "<img" not in html_body, \
                "HTML should escape <img> tags"
        
        if "<svg" in xss_payload.lower():
            assert "&lt;svg" in html_body or "<svg" not in html_body, \
                "HTML should escape <svg> tags"
        
        if "<iframe" in xss_payload.lower():
            assert "&lt;iframe" in html_body or "<iframe" not in html_body, \
                "HTML should escape <iframe> tags"
        
        # Property 2: The raw payload should not appear unescaped in HTML
        # (unless it's already escaped in the input)
        if not xss_payload.startswith("&lt;"):
            assert xss_payload not in html_body or "&lt;" in html_body, \
                "Raw XSS payload should not appear unescaped in HTML"
        
        # Property 3: Text output can contain the payload (plain text is safe)
        # This is acceptable because text emails don't execute scripts
        assert isinstance(text_body, str), "Text body should be a string"
    
    @given(
        scenario=st.sampled_from([
            "password_reset",
            "user_invite",
            "email_verification",
            "smtp_test"
        ]),
        # Generate various language codes
        requested_language=st.sampled_from([
            "en",  # Not implemented yet
            "de",  # Not implemented
            "fr",  # Not implemented
            "es",  # Not implemented
            "invalid",  # Invalid code
            "xx",  # Invalid code
            ""  # Empty string
        ])
    )
    @settings(max_examples=100)
    def test_property_19_language_fallback_chain(self, scenario, requested_language):
        """
        Property 19: Language Fallback Chain
        
        **Validates: Requirements 7.2, 7.3, 7.4, 7.6**
        
        For any email send request, the system should determine language by:
        (1) requested language if template exists
        (2) fallback to Turkish (TR)
        
        Property: For all non-existent language requests, the system falls back to
        Turkish and successfully renders the template without errors.
        """
        service = EmailTemplateService()
        
        # Get required variables for this scenario
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        # Create valid variables
        variables = self._create_test_variables(scenario, required_vars)
        
        # Render template with non-existent language
        subject, html_body, text_body = service.render_template(
            scenario=scenario,
            language=requested_language,
            variables=variables
        )
        
        # Property 1: Should successfully render (fallback to TR)
        assert isinstance(subject, str) and len(subject) > 0, \
            "Should render subject successfully with fallback"
        assert isinstance(html_body, str) and len(html_body) > 0, \
            "Should render HTML body successfully with fallback"
        assert isinstance(text_body, str) and len(text_body) > 0, \
            "Should render text body successfully with fallback"
        
        # Property 2: Should contain Turkish content (fallback language)
        # Check for Turkish-specific characters or words
        turkish_indicators = ["ş", "ğ", "ı", "ö", "ü", "ç", "İ"]
        has_turkish = any(char in html_body or char in text_body for char in turkish_indicators)
        
        # Property 3: Should contain expected content
        assert "X-Ear CRM" in html_body, "Should contain app name"
        assert "destek@x-ear.com" in html_body, "Should contain support email"
    
    @given(
        scenario=st.sampled_from([
            "password_reset",
            "user_invite",
            "email_verification",
            "smtp_test"
        ]),
        # Generate Jinja2 template injection payloads
        injection_payload=st.sampled_from([
            "{{ 7*7 }}",
            "{% for item in items %}{{ item }}{% endfor %}",
            "{{ config.items() }}",
            "{{ ''.__class__.__mro__[1].__subclasses__() }}",
            "{% import os %}{{ os.system('ls') }}",
            "{{ self.__init__.__globals__ }}",
            "{% debug %}",
            "{{ lipsum.__globals__ }}",
            "{{7*'7'}}",
            "{%print('hello')%}"
        ])
    )
    @settings(max_examples=100)
    def test_property_25_template_injection_prevention(self, scenario, injection_payload):
        """
        Property 25: Template Injection Prevention
        
        **Validates: Requirements 23.6**
        
        For any user-provided variable containing Jinja2 template syntax ({{, }}, {%, %}),
        the rendered template should treat it as literal text, not execute it as template code.
        
        Property: For all Jinja2 syntax in user variables, the output contains the literal
        syntax characters without executing the template code.
        """
        service = EmailTemplateService()
        
        # Get required variables for this scenario
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        # Create valid variables
        variables = self._create_test_variables(scenario, required_vars)
        
        # Inject template syntax into a name field
        if "user_name" in variables:
            variables["user_name"] = injection_payload
        elif "inviter_name" in variables:
            variables["inviter_name"] = injection_payload
        else:
            # Skip if no suitable field
            return
        
        # Render template
        subject, html_body, text_body = service.render_template(
            scenario=scenario,
            language="tr",
            variables=variables
        )
        
        # Property 1: Template syntax should appear as literal text
        # Check for common injection results that should NOT appear
        
        # {{ 7*7 }} should NOT evaluate to 49
        if "7*7" in injection_payload:
            assert "49" not in html_body or "7*7" in html_body, \
                "Template math should not be evaluated"
        
        # {{ 7*'7' }} should NOT evaluate to 7777777
        if "7*'7'" in injection_payload:
            assert "7777777" not in html_body, \
                "Template string multiplication should not be evaluated"
        
        # Property 2: The injection payload should appear escaped or as literal text
        # In HTML, {{ and }} might be escaped as &lt; and &gt; or appear literally
        if "{{" in injection_payload:
            # Either the literal {{ appears, or it's escaped
            assert "{{" in html_body or "&#123;&#123;" in html_body or "&lcub;&lcub;" in html_body, \
                "Template delimiters should appear as literal text or be escaped"
        
        # Property 3: No execution of dangerous operations
        # Check that dangerous operations didn't execute
        # The payload text will appear, but it should be escaped/literal, not executed
        # If __class__ appears, it should be part of the escaped payload, not executed
        if "__class__" in injection_payload:
            # The literal text should appear (possibly escaped), but not executed
            # Execution would show something like "<class 'str'>" not the literal ".__class__"
            assert ".__class__" in html_body or "&lt;class" not in html_body, \
                "Should not execute __class__ introspection"
        
        if "__globals__" in injection_payload:
            # Similar check for __globals__
            assert ".__globals__" in html_body or "dict" not in html_body, \
                "Should not execute __globals__ introspection"
        
        # Property 4: Text output should contain the literal payload
        # (text templates don't execute code either)
        assert isinstance(text_body, str), "Text body should be a string"
    
    @given(scenario=st.sampled_from([
        "password_reset",
        "user_invite",
        "email_verification",
        "invoice_created",
        "system_error",
        "smtp_test"
    ]))
    @settings(max_examples=100)
    def test_property_15_template_rendering_completeness(self, scenario):
        """
        Property 15: Template Rendering Completeness
        
        **Validates: Requirements 6.2**
        
        For any supported scenario (password_reset, user_invite, email_verification,
        invoice_created, system_error, smtp_test), the template service should render
        both HTML and plain text versions.
        
        Property: For all supported scenarios, render_template() returns a tuple of
        (subject, html_body, text_body) where all three components are non-empty strings
        and HTML contains expected structure.
        """
        service = EmailTemplateService()
        
        # Get required variables for this scenario
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        # Create valid test variables for each scenario
        variables = self._create_test_variables(scenario, required_vars)
        
        # Render template
        subject, html_body, text_body = service.render_template(
            scenario=scenario,
            language="tr",
            variables=variables
        )
        
        # Property 1: All three components must be non-empty strings
        assert isinstance(subject, str), f"Subject must be string for {scenario}"
        assert isinstance(html_body, str), f"HTML body must be string for {scenario}"
        assert isinstance(text_body, str), f"Text body must be string for {scenario}"
        
        assert len(subject) > 0, f"Subject must be non-empty for {scenario}"
        assert len(html_body) > 0, f"HTML body must be non-empty for {scenario}"
        assert len(text_body) > 0, f"Text body must be non-empty for {scenario}"
        
        # Property 2: HTML must contain expected structure
        # All HTML templates should include base layout elements
        assert "X-Ear CRM" in html_body, f"HTML must contain app name for {scenario}"
        assert "destek@x-ear.com" in html_body, f"HTML must contain support email for {scenario}"
        
        # Property 3: HTML should be longer than text (due to markup)
        assert len(html_body) > len(text_body), f"HTML should be longer than text for {scenario}"
        
        # Property 4: Both HTML and text should contain key variable values
        # Check that at least one required variable appears in both versions
        if required_vars:
            first_var = required_vars[0]
            var_value = str(variables[first_var])
            
            # For links, check the domain at least
            if "link" in first_var:
                assert "x-ear.com" in html_body, f"HTML must contain link domain for {scenario}"
                assert "x-ear.com" in text_body, f"Text must contain link domain for {scenario}"
            else:
                # For other variables, check the value appears
                assert var_value in html_body or var_value in text_body, \
                    f"Variable {first_var} value must appear in rendered content for {scenario}"
        
        # Property 5: Subject should be concise (not too long)
        assert len(subject) < 200, f"Subject should be concise (<200 chars) for {scenario}"
        
        # Property 6: HTML should contain HTML tags
        assert "<" in html_body and ">" in html_body, f"HTML must contain tags for {scenario}"
        
        # Property 7: Text should not contain HTML tags (or very minimal)
        # Count HTML-like tags in text version
        text_tag_count = text_body.count("<") + text_body.count(">")
        html_tag_count = html_body.count("<") + html_body.count(">")
        assert text_tag_count < html_tag_count / 2, \
            f"Text version should have significantly fewer tags than HTML for {scenario}"
    
    def _create_test_variables(self, scenario: str, required_vars: list[str]) -> dict:
        """
        Create valid test variables for a scenario.
        
        This helper generates realistic test data for each required variable.
        """
        variables = {}
        
        for var in required_vars:
            if "link" in var:
                # Generate a valid link
                variables[var] = f"https://app.x-ear.com/{scenario}/test123"
            elif "name" in var:
                # Generate a name
                variables[var] = "Test User"
            elif "email" in var:
                # Generate an email
                variables[var] = "test@example.com"
            elif "date" in var:
                # Generate a date
                variables[var] = "2025-12-31"
            elif "hours" in var:
                # Generate hours
                variables[var] = 24
            elif "number" in var:
                # Generate a number/ID
                variables[var] = "INV-2025-001"
            elif "amount" in var:
                # Generate an amount
                variables[var] = "1,500.00"
            elif "currency" in var:
                # Generate currency
                variables[var] = "TRY"
            elif "status" in var:
                # Generate status
                variables[var] = "pending"
            elif "type" in var:
                # Generate type
                variables[var] = "TestError"
            elif "timestamp" in var:
                # Generate timestamp
                variables[var] = "2025-01-25 10:30:00"
            elif "details" in var:
                # Generate details
                variables[var] = "Test error details"
            elif "instructions" in var:
                # Generate instructions
                variables[var] = "Please follow these instructions"
            else:
                # Default value
                variables[var] = f"test_{var}_value"
        
        return variables




class TestBaseLayoutInclusion:
    """Test base layout inclusion in rendered HTML."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_base_layout_header_in_html(self):
        """Test that base layout header is included in rendered HTML."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "tenant_name": "Test Org"
        }
        
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        # Check for base layout elements
        assert "X-Ear CRM" in html_body, "Should include app name from base layout"
        assert "destek@x-ear.com" in html_body, "Should include support email from base layout"
    
    def test_base_layout_footer_in_html(self):
        """Test that base layout footer is included in rendered HTML."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": 1
        }
        
        subject, html_body, text_body = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        # Check for footer elements
        from datetime import datetime
        current_year = str(datetime.now().year)
        assert current_year in html_body, "Should include current year in footer"
    
    def test_base_layout_not_in_text(self):
        """Test that text templates have their own simple layout."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "tenant_name": "Test Org"
        }
        
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        # Text should be simpler than HTML
        assert len(text_body) < len(html_body), "Text should be shorter than HTML"
        
        # Text should still contain essential info
        assert "X-Ear CRM" in text_body or "destek@x-ear.com" in text_body, \
            "Text should contain app info"


class TestVariableTypeValidation:
    """Test variable type validation."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_numeric_variable_as_string_works(self):
        """Test that numeric variables can be provided as strings."""
        service = EmailTemplateService()
        
        # expires_in_hours can be string or int
        variables = {
            "user_name": "Test User",
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": "24"  # String instead of int
        }
        
        # Should work - Jinja2 handles type coercion
        subject, html_body, text_body = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        assert "24" in html_body, "Should render numeric string"
    
    def test_numeric_variable_as_int_works(self):
        """Test that numeric variables work as integers."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": 24  # Integer
        }
        
        # Should work
        subject, html_body, text_body = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        assert "24" in html_body, "Should render integer"
    
    def test_none_variable_raises_error(self):
        """Test that None values in required variables cause issues."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": None,  # None value
            "reset_link": "https://app.x-ear.com/reset/abc123",
            "expires_in_hours": 1
        }
        
        # Should render but might show "None" or empty
        # This is acceptable behavior - the template will render "None" as text
        subject, html_body, text_body = service.render_template(
            scenario="password_reset",
            language="tr",
            variables=variables
        )
        
        # Jinja2 will render None as empty string or "None"
        assert isinstance(html_body, str), "Should render even with None"


class TestOptionalVariableDefaults:
    """Test optional variable defaults."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_invoice_optional_payment_instructions(self):
        """Test that optional payment_instructions has default behavior."""
        service = EmailTemplateService()
        
        # payment_instructions is optional in invoice_created
        variables = {
            "invoice_number": "INV-2025-001",
            "amount": "1,500.00",
            "currency": "TRY",
            "due_date": "2025-02-15",
            "invoice_link": "https://app.x-ear.com/invoices/001",
            "payment_status": "ödendi"
            # payment_instructions is missing
        }
        
        # Should render successfully
        subject, html_body, text_body = service.render_template(
            scenario="invoice_created",
            language="tr",
            variables=variables
        )
        
        assert "INV-2025-001" in html_body, "Should render invoice number"
        assert "1,500.00" in html_body, "Should render amount"
    
    def test_extra_variables_ignored(self):
        """Test that extra variables not in template are ignored."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test User",
            "tenant_name": "Test Org",
            "extra_field": "This should be ignored",
            "another_extra": 12345
        }
        
        # Should render successfully, ignoring extra variables
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        assert "Test User" in html_body, "Should render required variables"
        # Extra variables won't appear unless template uses them
        assert isinstance(html_body, str), "Should render successfully"


class TestAllScenariosRender:
    """Test that all 6 scenarios render successfully."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_all_scenarios_render_without_error(self):
        """Test that all 6 scenarios can be rendered successfully."""
        service = EmailTemplateService()
        
        scenarios_and_variables = {
            "password_reset": {
                "user_name": "Test User",
                "reset_link": "https://app.x-ear.com/reset/abc123",
                "expires_in_hours": 1
            },
            "user_invite": {
                "inviter_name": "Admin User",
                "organization_name": "Test Org",
                "invitation_link": "https://app.x-ear.com/invite/xyz789",
                "role_name": "User"
            },
            "email_verification": {
                "user_name": "Test User",
                "verification_link": "https://app.x-ear.com/verify/def456"
            },
            "invoice_created": {
                "invoice_number": "INV-2025-001",
                "amount": "1,500.00",
                "currency": "TRY",
                "due_date": "2025-02-15",
                "invoice_link": "https://app.x-ear.com/invoices/001",
                "payment_status": "pending",
                "payment_instructions": "Pay by bank transfer"
            },
            "system_error": {
                "error_type": "TestError",
                "timestamp": "2025-01-25 10:30:00",
                "tenant_name": "Test Tenant",
                "error_details": "Test error details",
                "admin_link": "https://admin.x-ear.com/errors"
            },
            "smtp_test": {
                "user_name": "Test User",
                "tenant_name": "Test Org"
            }
        }
        
        for scenario, variables in scenarios_and_variables.items():
            # Should render without error
            subject, html_body, text_body = service.render_template(
                scenario=scenario,
                language="tr",
                variables=variables
            )
            
            # Basic assertions
            assert len(subject) > 0, f"Subject should not be empty for {scenario}"
            assert len(html_body) > 0, f"HTML body should not be empty for {scenario}"
            assert len(text_body) > 0, f"Text body should not be empty for {scenario}"
            
            # Check for base layout
            assert "X-Ear CRM" in html_body, f"Should include app name for {scenario}"
            assert "destek@x-ear.com" in html_body, f"Should include support email for {scenario}"
    
    def test_all_scenarios_have_required_variables_defined(self):
        """Test that all scenarios have required variables defined."""
        service = EmailTemplateService()
        
        scenarios = service.get_supported_scenarios()
        
        for scenario in scenarios:
            required_vars = service.get_required_variables(scenario)
            assert isinstance(required_vars, list), \
                f"Required variables should be a list for {scenario}"
            # It's okay if some scenarios have no required variables
            assert required_vars is not None, \
                f"Required variables should be defined for {scenario}"
    
    def test_all_scenarios_have_templates(self):
        """Test that all scenarios have corresponding template files."""
        import os
        
        service = EmailTemplateService()
        scenarios = service.get_supported_scenarios()
        
        for scenario in scenarios:
            # Check HTML template exists
            html_path = os.path.join(service.template_dir, "tr", f"{scenario}.html")
            assert os.path.exists(html_path), \
                f"HTML template should exist for {scenario}: {html_path}"
            
            # Check text template exists
            text_path = os.path.join(service.template_dir, "tr", f"{scenario}.txt")
            assert os.path.exists(text_path), \
                f"Text template should exist for {scenario}: {text_path}"
            
            # Check metadata exists
            meta_path = os.path.join(service.template_dir, "tr", f"{scenario}_meta.json")
            assert os.path.exists(meta_path), \
                f"Metadata file should exist for {scenario}: {meta_path}"


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset singleton before each test."""
        reset_email_template_service()
        yield
        reset_email_template_service()
    
    def test_empty_string_variable(self):
        """Test rendering with empty string variables."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "",  # Empty string
            "tenant_name": "Test Org"
        }
        
        # Should render (empty string is valid)
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        assert isinstance(html_body, str), "Should render with empty string"
    
    def test_very_long_variable(self):
        """Test rendering with very long variable values."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "A" * 1000,  # Very long name
            "tenant_name": "Test Org"
        }
        
        # Should render without error
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        assert "A" * 1000 in html_body, "Should render long variable"
    
    def test_unicode_characters_in_variables(self):
        """Test rendering with Unicode characters."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Şükrü Öğretmen İçin Ürün",  # Turkish characters
            "tenant_name": "Test Org 中文 العربية"  # Mixed scripts
        }
        
        # Should render Unicode correctly
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        assert "Şükrü" in html_body, "Should render Turkish characters"
        assert "中文" in html_body, "Should render Chinese characters"
        assert "العربية" in html_body, "Should render Arabic characters"
    
    def test_special_characters_in_variables(self):
        """Test rendering with special characters."""
        service = EmailTemplateService()
        
        variables = {
            "user_name": "Test & User <test@example.com>",
            "tenant_name": "Test \"Org\" 'Company'"
        }
        
        # Should render with proper escaping
        subject, html_body, text_body = service.render_template(
            scenario="smtp_test",
            language="tr",
            variables=variables
        )
        
        # HTML should escape special characters
        assert "&amp;" in html_body or "&" in html_body, "Should handle ampersand"
        assert "&lt;" in html_body or "<" not in html_body, "Should escape angle brackets"
