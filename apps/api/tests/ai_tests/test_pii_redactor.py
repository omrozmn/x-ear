"""
Property-based tests for PII/PHI Redactor.

**Feature: ai-layer-architecture, Property 3: PII/PHI Redaction Completeness**
**Validates: Requirements 2.3, 9.5, 9.6**

Tests that:
- TC Kimlik numbers are detected and redacted
- Phone numbers are detected and redacted
- Email addresses are detected and redacted
- IBAN numbers are detected and redacted
- Credit card numbers are detected and redacted
- PHI (diagnosis, medication) is detected and redacted
- Safe tokens are preserved
- Redaction is deterministic
"""

import sys
from pathlib import Path

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings, assume

from ai.utils.pii_redactor import (
    PIIRedactor,
    PIIType,
    PHIType,
    RedactionResult,
    redact_text,
    detect_pii_phi,
    redact_for_logging,
)


# =============================================================================
# Test Data Generators
# =============================================================================

def valid_tc_kimlik() -> st.SearchStrategy[str]:
    """Generate valid-looking TC Kimlik numbers (11 digits, first not 0)."""
    return st.from_regex(r'[1-9]\d{10}', fullmatch=True)


def valid_phone() -> st.SearchStrategy[str]:
    """Generate valid Turkish phone numbers."""
    return st.sampled_from([
        "05321234567",
        "0532 123 45 67",
        "+905321234567",
        "+90 532 123 45 67",
        "532-123-45-67",
    ])


def valid_email() -> st.SearchStrategy[str]:
    """Generate valid email addresses."""
    return st.from_regex(r'[a-z]{3,10}@[a-z]{3,10}\.(com|net|org)', fullmatch=True)


def valid_iban() -> st.SearchStrategy[str]:
    """Generate valid Turkish IBAN numbers."""
    return st.from_regex(r'TR\d{24}', fullmatch=True)


def valid_credit_card() -> st.SearchStrategy[str]:
    """Generate valid-looking credit card numbers."""
    return st.sampled_from([
        "4111111111111111",
        "4111 1111 1111 1111",
        "4111-1111-1111-1111",
        "5500000000000004",
    ])


# =============================================================================
# TC Kimlik Tests
# =============================================================================

class TestTCKimlikRedaction:
    """Tests for TC Kimlik number detection and redaction."""
    
    @given(tc=valid_tc_kimlik())
    @settings(max_examples=100)
    def test_tc_kimlik_detected(self, tc: str):
        """TC Kimlik numbers are detected."""
        text = f"Hasta TC: {tc}"
        result = redact_text(text)
        
        assert result.has_pii
        assert PIIType.TC_KIMLIK in result.pii_types
    
    @given(tc=valid_tc_kimlik())
    @settings(max_examples=100)
    def test_tc_kimlik_redacted(self, tc: str):
        """TC Kimlik numbers are redacted."""
        text = f"TC Kimlik: {tc}"
        result = redact_text(text)
        
        assert tc not in result.redacted_text
        assert "[TC_KIMLIK]" in result.redacted_text
    
    def test_tc_kimlik_with_context(self):
        """TC Kimlik in context is properly redacted."""
        text = "Hastanın TC kimlik numarası 12345678901 olarak kayıtlıdır."
        result = redact_text(text)
        
        assert "12345678901" not in result.redacted_text
        assert "[TC_KIMLIK]" in result.redacted_text
        assert "Hastanın TC kimlik numarası" in result.redacted_text
    
    def test_invalid_tc_not_detected(self):
        """Invalid TC Kimlik (starting with 0) is not detected."""
        text = "Numara: 01234567890"  # Starts with 0
        result = redact_text(text)
        
        # Should not be detected as TC Kimlik
        assert PIIType.TC_KIMLIK not in result.pii_types


# =============================================================================
# Phone Number Tests
# =============================================================================

class TestPhoneRedaction:
    """Tests for phone number detection and redaction."""
    
    @given(phone=valid_phone())
    @settings(max_examples=50)
    def test_phone_detected(self, phone: str):
        """Phone numbers are detected."""
        text = f"Telefon: {phone}"
        result = redact_text(text)
        
        assert result.has_pii
        assert PIIType.PHONE in result.pii_types
    
    @given(phone=valid_phone())
    @settings(max_examples=50)
    def test_phone_redacted(self, phone: str):
        """Phone numbers are redacted."""
        text = f"İletişim: {phone}"
        result = redact_text(text)
        
        # Original phone should not be in redacted text
        # (accounting for format variations)
        digits = ''.join(c for c in phone if c.isdigit())
        assert digits not in result.redacted_text.replace(" ", "").replace("-", "")
        assert "[TELEFON]" in result.redacted_text
    
    def test_multiple_phones(self):
        """Multiple phone numbers are all redacted."""
        text = "Ev: 0212 123 45 67, Cep: 0532 987 65 43"
        result = redact_text(text)
        
        assert result.redacted_text.count("[TELEFON]") == 2


# =============================================================================
# Email Tests
# =============================================================================

class TestEmailRedaction:
    """Tests for email address detection and redaction."""
    
    @given(email=valid_email())
    @settings(max_examples=50)
    def test_email_detected(self, email: str):
        """Email addresses are detected."""
        text = f"Email: {email}"
        result = redact_text(text)
        
        assert result.has_pii
        assert PIIType.EMAIL in result.pii_types
    
    @given(email=valid_email())
    @settings(max_examples=50)
    def test_email_redacted(self, email: str):
        """Email addresses are redacted."""
        text = f"İletişim: {email}"
        result = redact_text(text)
        
        assert email not in result.redacted_text
        assert "[EMAIL]" in result.redacted_text
    
    def test_email_in_sentence(self):
        """Email in a sentence is properly redacted."""
        text = "Lütfen test@example.com adresine mail atın."
        result = redact_text(text)
        
        assert "test@example.com" not in result.redacted_text
        assert "[EMAIL]" in result.redacted_text
        assert "Lütfen" in result.redacted_text


# =============================================================================
# IBAN Tests
# =============================================================================

class TestIBANRedaction:
    """Tests for IBAN detection and redaction."""
    
    @given(iban=valid_iban())
    @settings(max_examples=50)
    def test_iban_detected(self, iban: str):
        """IBAN numbers are detected."""
        text = f"IBAN: {iban}"
        result = redact_text(text)
        
        assert result.has_pii
        assert PIIType.IBAN in result.pii_types
    
    @given(iban=valid_iban())
    @settings(max_examples=50)
    def test_iban_redacted(self, iban: str):
        """IBAN numbers are redacted."""
        text = f"Hesap: {iban}"
        result = redact_text(text)
        
        assert iban not in result.redacted_text
        assert "[IBAN]" in result.redacted_text
    
    def test_iban_with_spaces(self):
        """IBAN with spaces is detected."""
        text = "IBAN: TR12 3456 7890 1234 5678 9012 34"
        result = redact_text(text)
        
        assert "[IBAN]" in result.redacted_text


# =============================================================================
# Credit Card Tests
# =============================================================================

class TestCreditCardRedaction:
    """Tests for credit card number detection and redaction."""
    
    @given(card=valid_credit_card())
    @settings(max_examples=50)
    def test_credit_card_detected(self, card: str):
        """Credit card numbers are detected."""
        text = f"Kart: {card}"
        result = redact_text(text)
        
        assert result.has_pii
        assert PIIType.CREDIT_CARD in result.pii_types
    
    @given(card=valid_credit_card())
    @settings(max_examples=50)
    def test_credit_card_redacted(self, card: str):
        """Credit card numbers are redacted."""
        text = f"Ödeme kartı: {card}"
        result = redact_text(text)
        
        digits = ''.join(c for c in card if c.isdigit())
        assert digits not in result.redacted_text.replace(" ", "").replace("-", "")
        assert "[KART_NO]" in result.redacted_text


# =============================================================================
# PHI Tests
# =============================================================================

class TestPHIRedaction:
    """Tests for PHI (Protected Health Information) detection and redaction."""
    
    def test_diagnosis_code_detected(self):
        """ICD-10 diagnosis codes are detected."""
        text = "Tanı: H90.3 (Bilateral sensorinöral işitme kaybı)"
        result = redact_text(text)
        
        assert result.has_phi
        assert PHIType.DIAGNOSIS in result.phi_types
    
    def test_medication_detected(self):
        """Medication names are detected."""
        text = "Reçete: Parol 500mg, günde 3 kez"
        result = redact_text(text)
        
        assert result.has_phi
        assert PHIType.MEDICATION in result.phi_types
        assert "[İLAÇ]" in result.redacted_text
    
    def test_health_condition_detected(self):
        """Health condition keywords are detected."""
        text = "Hasta diyabet ve hipertansiyon tanılı"
        result = redact_text(text)
        
        assert result.has_phi
        assert PHIType.HEALTH_CONDITION in result.phi_types
    
    def test_multiple_phi_types(self):
        """Multiple PHI types are all detected."""
        text = "Tanı: H90.3, İlaç: Aspirin, Durum: diyabet"
        result = redact_text(text)
        
        assert PHIType.DIAGNOSIS in result.phi_types
        assert PHIType.MEDICATION in result.phi_types
        assert PHIType.HEALTH_CONDITION in result.phi_types


# =============================================================================
# Safe Tokens Tests
# =============================================================================

class TestSafeTokens:
    """Tests for safe token preservation."""
    
    def test_safe_token_not_redacted(self):
        """Safe tokens are not redacted."""
        redactor = PIIRedactor(safe_tokens={"test@example.com"})
        text = "Email: test@example.com"
        result = redactor.redact(text)
        
        assert "test@example.com" in result.redacted_text
        assert "[EMAIL]" not in result.redacted_text
    
    def test_safe_token_case_insensitive(self):
        """Safe token matching is case-insensitive."""
        redactor = PIIRedactor(safe_tokens={"TEST@EXAMPLE.COM"})
        text = "Email: test@example.com"
        result = redactor.redact(text)
        
        assert "test@example.com" in result.redacted_text
    
    def test_partial_safe_token(self):
        """Only exact matches are preserved."""
        redactor = PIIRedactor(safe_tokens={"test"})
        text = "Email: test@example.com"
        result = redactor.redact(text)
        
        # Email should still be redacted (safe token is just "test")
        assert "[EMAIL]" in result.redacted_text


# =============================================================================
# Redaction Properties
# =============================================================================

class TestRedactionProperties:
    """Property-based tests for redaction behavior."""
    
    @given(st.text(min_size=0, max_size=1000))
    @settings(max_examples=100)
    def test_redaction_is_deterministic(self, text: str):
        """
        Property: Redaction is deterministic.
        Same input always produces same output.
        """
        result1 = redact_text(text)
        result2 = redact_text(text)
        
        assert result1.redacted_text == result2.redacted_text
        assert result1.has_pii == result2.has_pii
        assert result1.has_phi == result2.has_phi
    
    @given(st.text(min_size=0, max_size=500))
    @settings(max_examples=100)
    def test_redacted_text_not_longer(self, text: str):
        """
        Property: Redacted text is not significantly longer than original.
        (Placeholders may be longer than original values in some cases)
        """
        result = redact_text(text)
        
        # Allow some growth due to placeholders, but not excessive
        max_growth = len(text) + (result.has_pii or result.has_phi) * 100
        assert len(result.redacted_text) <= max_growth
    
    def test_empty_text(self):
        """Empty text returns empty result."""
        result = redact_text("")
        
        assert result.redacted_text == ""
        assert not result.has_pii
        assert not result.has_phi
    
    def test_no_pii_text_unchanged(self):
        """Text without PII/PHI is unchanged."""
        text = "Bu bir test mesajıdır. Hiçbir kişisel bilgi içermez."
        result = redact_text(text)
        
        assert result.redacted_text == text
        assert not result.has_pii
        assert not result.has_phi


# =============================================================================
# Dictionary Redaction Tests
# =============================================================================

class TestDictRedaction:
    """Tests for dictionary redaction."""
    
    def test_dict_redaction(self):
        """Dictionary values are redacted."""
        data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "05321234567",
        }
        result = redact_for_logging(data)
        
        assert "[EMAIL]" in result["email"]
        assert "[TELEFON]" in result["phone"]
    
    def test_nested_dict_redaction(self):
        """Nested dictionary values are redacted."""
        data = {
            "user": {
                "email": "test@example.com",
            }
        }
        result = redact_for_logging(data)
        
        assert "[EMAIL]" in result["user"]["email"]
    
    def test_list_in_dict_redaction(self):
        """List values in dictionary are redacted."""
        data = {
            "emails": ["a@test.com", "b@test.com"]
        }
        result = redact_for_logging(data)
        
        assert all("[EMAIL]" in email for email in result["emails"])


# =============================================================================
# RedactionResult Tests
# =============================================================================

class TestRedactionResult:
    """Tests for RedactionResult dataclass."""
    
    def test_to_dict(self):
        """RedactionResult.to_dict() returns correct structure."""
        text = "TC: 12345678901, Email: test@example.com"
        result = redact_text(text)
        
        result_dict = result.to_dict()
        
        assert "redactedText" in result_dict
        assert "hasPii" in result_dict
        assert "hasPhi" in result_dict
        assert "piiTypes" in result_dict
        assert "detectionCount" in result_dict
        
        assert result_dict["hasPii"] is True
        assert "tc_kimlik" in result_dict["piiTypes"]
        assert "email" in result_dict["piiTypes"]
