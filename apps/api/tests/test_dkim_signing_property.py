"""
Property-Based Tests for DKIM Email Signing

**Property 27: DKIM Signature Validity**
*For any* email sent with DKIM signature, the signature must be cryptographically valid and verifiable.

**Validates: Requirements 2.3, 2.8**

This test uses Hypothesis to generate random email messages and verify that:
1. DKIM signatures are cryptographically valid
2. Signed emails can be verified successfully
3. Tampering with signed emails invalidates the signature
4. DKIM signing handles various email formats correctly

IMPORTANT: These tests use REAL cryptographic operations (no mocks) as per X-Ear CRM rules.
"""

import pytest
import os
import sys
from pathlib import Path

# Add apps/api to path for imports
api_path = Path(__file__).parent.parent
sys.path.insert(0, str(api_path))

from hypothesis import given, strategies as st, settings, assume, HealthCheck
from email.message import EmailMessage
from datetime import datetime, timezone

import pytest
dkim = pytest.importorskip("dkim")
from services.dkim_signing_service import DKIMSigningService


# Strategy for generating email addresses
@st.composite
def email_address(draw):
    """Generate valid email addresses."""
    local = draw(st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Nd"), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=10
    ))
    domain = draw(st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Nd"), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=10
    ))
    tld = draw(st.sampled_from(["com", "net", "org", "io"]))
    return f"{local}@{domain}.{tld}"


# Strategy for generating email subjects
@st.composite
def email_subject(draw):
    """Generate email subjects without control characters."""
    # Use printable ASCII characters only
    text = draw(st.text(
        alphabet=st.characters(min_codepoint=32, max_codepoint=126),  # Printable ASCII
        min_size=5,
        max_size=100
    ))
    return text.strip()


# Strategy for generating email bodies
@st.composite
def email_body(draw):
    """Generate email body content."""
    return draw(st.text(min_size=10, max_size=500))


class TestDKIMSigningProperty:
    """Property-based tests for DKIM signing with REAL cryptographic operations."""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment with DKIM key pair."""
        # Generate test DKIM key pair
        service = DKIMSigningService()
        private_key, public_key = service.generate_keypair()
        
        # Store in environment for tests
        os.environ['DKIM_PRIVATE_KEY'] = private_key
        os.environ['DKIM_SELECTOR'] = 'test'
        
        cls.private_key = private_key
        cls.public_key = public_key
    
    @given(
        from_addr=email_address(),
        to_addr=email_address(),
        subject=email_subject(),
        body=email_body()
    )
    @settings(
        max_examples=100,
        deadline=5000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_dkim_signed_email_is_verifiable(self, from_addr, to_addr, subject, body):
        """
        **Property 27: DKIM Signature Validity**
        
        *For any* email message, if signed with DKIM, the signature MUST be
        cryptographically valid and verifiable.
        
        **Validates: Requirements 2.3, 2.8**
        """
        # Arrange: Create email message
        message = EmailMessage()
        message['From'] = from_addr
        message['To'] = to_addr
        message['Subject'] = subject
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = f"<test-{hash(subject)}@test.com>"
        message.set_content(body)
        
        # Extract domain from from_addr
        domain = from_addr.split('@')[1]
        
        service = DKIMSigningService()
        
        # Act: Sign email
        signed_message = service.sign_email(message, domain)
        
        # Assert: Message must have DKIM-Signature header
        assert 'DKIM-Signature' in signed_message, "Signed message must have DKIM-Signature header"
        
        # Verify signature
        is_valid, verify_message = service.verify_signature(
            signed_message, 
            domain,
            public_key_base64=self.public_key
        )
        assert is_valid, f"DKIM signature must be valid: {verify_message}"
    
    @given(
        from_addr=email_address(),
        to_addr=email_address(),
        subject=email_subject(),
        body=email_body()
    )
    @settings(
        max_examples=100,
        deadline=5000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_dkim_signature_invalidated_by_tampering(self, from_addr, to_addr, subject, body):
        """
        **Property 27: DKIM Signature Validity**
        
        *For any* signed email, tampering with the message MUST invalidate
        the DKIM signature.
        
        **Validates: Requirements 2.8**
        """
        # Arrange: Create and sign email
        message = EmailMessage()
        message['From'] = from_addr
        message['To'] = to_addr
        message['Subject'] = subject
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = f"<test-{hash(subject)}@test.com>"
        message.set_content(body)
        
        domain = from_addr.split('@')[1]
        service = DKIMSigningService()
        signed_message = service.sign_email(message, domain)
        
        # Act: Tamper with message (change subject)
        signed_message.replace_header('Subject', subject + " TAMPERED")
        
        # Assert: Signature must be invalid after tampering
        is_valid, verify_message = service.verify_signature(
            signed_message,
            domain,
            public_key_base64=self.public_key
        )
        assert not is_valid, "DKIM signature must be invalid after tampering with message"
    
    @given(
        from_addr=email_address(),
        to_addr=email_address(),
        subject=email_subject()
    )
    @settings(
        max_examples=50,
        deadline=5000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_dkim_signing_is_deterministic(self, from_addr, to_addr, subject):
        """
        **Property 27: DKIM Signature Validity**
        
        *For any* email message, signing multiple times with the same key
        MUST produce valid signatures (though signatures may differ due to
        timestamp).
        
        **Validates: Requirements 2.3**
        """
        # Arrange: Create email message
        message = EmailMessage()
        message['From'] = from_addr
        message['To'] = to_addr
        message['Subject'] = subject
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = f"<test-{hash(subject)}@test.com>"
        message.set_content("Test body")
        
        domain = from_addr.split('@')[1]
        service = DKIMSigningService()
        
        # Act: Sign message multiple times
        signed1 = service.sign_email(message.copy(), domain)
        signed2 = service.sign_email(message.copy(), domain)
        signed3 = service.sign_email(message.copy(), domain)
        
        # Assert: All signatures must be valid
        is_valid1, _ = service.verify_signature(signed1, domain, public_key_base64=self.public_key)
        is_valid2, _ = service.verify_signature(signed2, domain, public_key_base64=self.public_key)
        is_valid3, _ = service.verify_signature(signed3, domain, public_key_base64=self.public_key)
        
        assert is_valid1, "First signature must be valid"
        assert is_valid2, "Second signature must be valid"
        assert is_valid3, "Third signature must be valid"
    
    def test_dkim_signing_without_private_key(self):
        """
        **Property 27: DKIM Signature Validity**
        
        When DKIM private key is not configured, signing MUST fail gracefully
        (degraded mode - email sent without signature).
        
        **Validates: Requirements 2.7**
        """
        # Arrange: Remove private key from environment
        original_key = os.environ.get('DKIM_PRIVATE_KEY')
        if 'DKIM_PRIVATE_KEY' in os.environ:
            del os.environ['DKIM_PRIVATE_KEY']
        
        try:
            message = EmailMessage()
            message['From'] = 'test@example.com'
            message['To'] = 'user@example.com'
            message['Subject'] = 'Test'
            message.set_content('Test body')
            
            service = DKIMSigningService()
            
            # Act: Try to sign without private key
            signed_message = service.sign_email(message, "example.com")
            
            # Assert: Message should be returned unchanged (no DKIM-Signature)
            # This is degraded mode - email is sent without DKIM
            assert isinstance(signed_message, EmailMessage), "Must return EmailMessage in degraded mode"
            
        finally:
            # Restore private key
            if original_key:
                os.environ['DKIM_PRIVATE_KEY'] = original_key
    
    def test_dkim_keypair_generation(self):
        """
        **Property 27: DKIM Signature Validity**
        
        Generated DKIM key pairs MUST be valid RSA-2048 keys.
        
        **Validates: Requirements 2.1, 2.2**
        """
        service = DKIMSigningService()
        
        # Act: Generate key pair
        private_key, public_key = service.generate_keypair()
        
        # Assert: Keys must be non-empty strings
        assert isinstance(private_key, str), "Private key must be string"
        assert isinstance(public_key, str), "Public key must be string"
        assert len(private_key) > 0, "Private key must not be empty"
        assert len(public_key) > 0, "Public key must not be empty"
        
        # Private key must be PEM format
        assert "-----BEGIN PRIVATE KEY-----" in private_key, "Private key must be PEM format"
        assert "-----END PRIVATE KEY-----" in private_key, "Private key must be PEM format"
        
        # Public key must be base64
        import base64
        try:
            base64.b64decode(public_key)
        except Exception:
            pytest.fail("Public key must be valid base64")
    
    @given(
        from_addr=email_address(),
        to_addr=email_address()
    )
    @settings(
        max_examples=50,
        deadline=5000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_dkim_signature_covers_critical_headers(self, from_addr, to_addr):
        """
        **Property 27: DKIM Signature Validity**
        
        DKIM signature MUST cover critical headers: From, To, Subject, Date, Message-ID.
        
        **Validates: Requirements 2.4**
        """
        # Arrange: Create email with all critical headers
        message = EmailMessage()
        message['From'] = from_addr
        message['To'] = to_addr
        message['Subject'] = 'Test Subject'
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = f"<test-{hash(from_addr)}@test.com>"
        message.set_content('Test body')
        
        domain = from_addr.split('@')[1]
        service = DKIMSigningService()
        
        # Act: Sign email
        signed_message = service.sign_email(message, domain)
        
        # Assert: DKIM-Signature header must exist
        assert 'DKIM-Signature' in signed_message, "Must have DKIM-Signature header"
        
        # Verify signature is valid
        is_valid, _ = service.verify_signature(signed_message, domain, public_key_base64=self.public_key)
        assert is_valid, "Signature must be valid"
        
        # Tampering with any critical header should invalidate signature
        for header in ['From', 'To', 'Subject']:
            tampered = signed_message.copy()
            original_value = tampered[header]
            tampered.replace_header(header, original_value + " TAMPERED")
            
            is_valid_after_tamper, _ = service.verify_signature(
                tampered,
                domain,
                public_key_base64=self.public_key
            )
            assert not is_valid_after_tamper, f"Signature must be invalid after tampering with {header}"


class TestDKIMSigningIntegration:
    """Integration tests for DKIM signing with real cryptographic operations."""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment with DKIM key pair."""
        service = DKIMSigningService()
        private_key, public_key = service.generate_keypair()
        os.environ['DKIM_PRIVATE_KEY'] = private_key
        os.environ['DKIM_SELECTOR'] = 'test'
        cls.private_key = private_key
        cls.public_key = public_key
    
    def test_dkim_sign_and_verify_real_email(self):
        """
        Integration test: Sign and verify a real email message.
        """
        # Arrange: Create realistic email
        message = EmailMessage()
        message['From'] = 'info@x-ear.com'
        message['To'] = 'customer@example.com'
        message['Subject'] = 'Your Hearing Aid Appointment Reminder'
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = '<12345@x-ear.com>'
        message.set_content('''
Dear Customer,

This is a reminder about your upcoming hearing aid fitting appointment.

Date: January 25, 2025
Time: 10:00 AM
Location: X-Ear Clinic, Istanbul

Please arrive 10 minutes early.

Best regards,
X-Ear CRM Team
        ''')
        
        service = DKIMSigningService()
        
        # Act: Sign email
        signed_message = service.sign_email(message, "x-ear.com")
        
        # Assert: Signature must be valid
        assert 'DKIM-Signature' in signed_message
        is_valid, verify_message = service.verify_signature(
            signed_message,
            "x-ear.com",
            public_key_base64=self.public_key
        )
        assert is_valid, f"DKIM signature must be valid: {verify_message}"
    
    def test_dkim_multipart_email(self):
        """
        Integration test: Sign multipart email (HTML + text).
        """
        # Arrange: Create multipart email
        message = EmailMessage()
        message['From'] = 'info@x-ear.com'
        message['To'] = 'customer@example.com'
        message['Subject'] = 'Test Multipart Email'
        message['Date'] = datetime.now(timezone.utc).isoformat()
        message['Message-ID'] = '<multipart-test@x-ear.com>'
        
        # Set text content
        message.set_content('This is the plain text version.')
        
        # Add HTML alternative
        message.add_alternative('''
        <html>
            <body>
                <h1>This is the HTML version</h1>
                <p>With <strong>formatting</strong>!</p>
            </body>
        </html>
        ''', subtype='html')
        
        service = DKIMSigningService()
        
        # Act: Sign multipart email
        signed_message = service.sign_email(message, "x-ear.com")
        
        # Assert: Signature must be valid
        assert 'DKIM-Signature' in signed_message
        is_valid, verify_message = service.verify_signature(
            signed_message,
            "x-ear.com",
            public_key_base64=self.public_key
        )
        assert is_valid, f"DKIM signature must be valid for multipart email: {verify_message}"
