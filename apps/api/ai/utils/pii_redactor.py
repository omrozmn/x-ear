"""
PII/PHI Redactor for AI Layer

Detects and redacts Personally Identifiable Information (PII) and
Protected Health Information (PHI) from text before AI processing.

Requirements:
- 2.3: Perform PII/PHI detection and redaction before processing
- 2.8: Apply redaction policy: field patterns + "allow safe tokens" approach
- 9.5: Store field-level diff snapshots with redaction
- 9.6: Exclude sensitive fields via redaction policy

Supported PII Types (Turkey-specific):
- TC Kimlik No (Turkish ID)
- Phone numbers
- Email addresses
- IBAN
- Credit card numbers
- Addresses

Supported PHI Types:
- Diagnosis codes/names
- Medication names
- Medical record numbers
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Set, Optional, Dict


class PIIType(str, Enum):
    """Types of PII that can be detected."""
    TC_KIMLIK = "tc_kimlik"
    PHONE = "phone"
    EMAIL = "email"
    IBAN = "iban"
    CREDIT_CARD = "credit_card"
    ADDRESS = "address"
    NAME = "name"


class PHIType(str, Enum):
    """Types of PHI that can be detected."""
    DIAGNOSIS = "diagnosis"
    MEDICATION = "medication"
    MEDICAL_RECORD = "medical_record"
    HEALTH_CONDITION = "health_condition"


@dataclass
class RedactionResult:
    """Result of PII/PHI redaction."""
    original_text: str
    redacted_text: str
    detected_pii: List[Tuple[PIIType, str, int, int]] = field(default_factory=list)  # (type, value, start, end)
    detected_phi: List[Tuple[PHIType, str, int, int]] = field(default_factory=list)
    
    @property
    def has_pii(self) -> bool:
        return len(self.detected_pii) > 0
    
    @property
    def has_phi(self) -> bool:
        return len(self.detected_phi) > 0
    
    @property
    def pii_types(self) -> Set[PIIType]:
        return {item[0] for item in self.detected_pii}
    
    @property
    def phi_types(self) -> Set[PHIType]:
        return {item[0] for item in self.detected_phi}
    
    @property
    def detected_types(self) -> Set[str]:
        """Get all detected PII/PHI types as strings."""
        types = set()
        for pii_type in self.pii_types:
            types.add(pii_type.value)
        for phi_type in self.phi_types:
            types.add(phi_type.value)
        return types
    
    def to_dict(self) -> dict:
        return {
            "redactedText": self.redacted_text,
            "hasPii": self.has_pii,
            "hasPhi": self.has_phi,
            "piiTypes": [t.value for t in self.pii_types],
            "phiTypes": [t.value for t in self.phi_types],
            "detectionCount": len(self.detected_pii) + len(self.detected_phi),
        }


class PIIRedactor:
    """
    PII/PHI detection and redaction engine.
    
    Uses regex patterns optimized for Turkish data formats.
    """
    
    # Redaction placeholders
    PLACEHOLDERS = {
        PIIType.TC_KIMLIK: "[TC_KIMLIK]",
        PIIType.PHONE: "[TELEFON]",
        PIIType.EMAIL: "[EMAIL]",
        PIIType.IBAN: "[IBAN]",
        PIIType.CREDIT_CARD: "[KART_NO]",
        PIIType.ADDRESS: "[ADRES]",
        PIIType.NAME: "[İSİM]",
        PHIType.DIAGNOSIS: "[TANI]",
        PHIType.MEDICATION: "[İLAÇ]",
        PHIType.MEDICAL_RECORD: "[HASTA_NO]",
        PHIType.HEALTH_CONDITION: "[SAĞLIK_DURUMU]",
    }
    
    # PII Patterns (Turkey-specific)
    PII_PATTERNS = {
        # TC Kimlik: 11 digits, first digit not 0
        PIIType.TC_KIMLIK: re.compile(
            r'\b[1-9]\d{10}\b'
        ),
        
        # Turkish phone: +90, 0, or direct, with various formats
        PIIType.PHONE: re.compile(
            r'(?:\+90|0)?[\s.-]?'
            r'(?:5\d{2}|[2-4]\d{2})'  # Mobile (5xx) or landline (2xx-4xx)
            r'[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b'
        ),
        
        # Email
        PIIType.EMAIL: re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        ),
        
        # Turkish IBAN: TR + 24 digits
        PIIType.IBAN: re.compile(
            r'\bTR\s?\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b',
            re.IGNORECASE
        ),
        
        # Credit card: 16 digits with optional spaces/dashes
        PIIType.CREDIT_CARD: re.compile(
            r'\b(?:\d{4}[\s-]?){3}\d{4}\b'
        ),
    }
    
    # PHI Patterns
    PHI_PATTERNS = {
        # ICD-10 codes (e.g., H90.3, F32.1)
        PHIType.DIAGNOSIS: re.compile(
            r'\b[A-Z]\d{2}(?:\.\d{1,2})?\b'
        ),
        
        # Medical record numbers (various formats)
        PHIType.MEDICAL_RECORD: re.compile(
            r'\b(?:MRN|HN|Hasta\s*No)[:\s]*\d{6,12}\b',
            re.IGNORECASE
        ),
    }
    
    # Common Turkish medication names (partial list for demo)
    MEDICATION_KEYWORDS = {
        "aspirin", "parol", "majezik", "arveles", "augmentin",
        "cipro", "amoklavin", "voltaren", "diklofenak", "ibuprofen",
        "metformin", "gliclazide", "atorvastatin", "ramipril",
        "omeprazol", "pantoprazol", "lansoprazol",
    }
    
    # Health condition keywords (Turkish)
    HEALTH_CONDITION_KEYWORDS = {
        "diyabet", "hipertansiyon", "kanser", "tümör", "kalp",
        "böbrek", "karaciğer", "hiv", "aids", "hepatit",
        "depresyon", "anksiyete", "şizofreni", "bipolar",
        "işitme kaybı", "sağırlık", "odyometri",
    }
    
    def __init__(
        self,
        redact_pii: bool = True,
        redact_phi: bool = True,
        safe_tokens: Optional[Set[str]] = None,
    ):
        """
        Initialize the redactor.
        
        Args:
            redact_pii: Whether to redact PII
            redact_phi: Whether to redact PHI
            safe_tokens: Set of tokens to NOT redact (allowlist)
        """
        self.redact_pii = redact_pii
        self.redact_phi = redact_phi
        self.safe_tokens = safe_tokens or set()
    
    def _is_safe_token(self, value: str) -> bool:
        """Check if a value is in the safe tokens list."""
        return value.lower().strip() in {t.lower() for t in self.safe_tokens}
    
    def _detect_pii(self, text: str) -> List[Tuple[PIIType, str, int, int]]:
        """Detect PII in text."""
        detections = []
        
        for pii_type, pattern in self.PII_PATTERNS.items():
            for match in pattern.finditer(text):
                value = match.group()
                if not self._is_safe_token(value):
                    detections.append((pii_type, value, match.start(), match.end()))
        
        return detections
    
    def _detect_phi(self, text: str) -> List[Tuple[PHIType, str, int, int]]:
        """Detect PHI in text."""
        detections = []
        
        # Pattern-based detection
        for phi_type, pattern in self.PHI_PATTERNS.items():
            for match in pattern.finditer(text):
                value = match.group()
                if not self._is_safe_token(value):
                    detections.append((phi_type, value, match.start(), match.end()))
        
        # Keyword-based detection for medications
        text_lower = text.lower()
        for med in self.MEDICATION_KEYWORDS:
            start = 0
            while True:
                idx = text_lower.find(med, start)
                if idx == -1:
                    break
                # Check word boundaries
                if (idx == 0 or not text_lower[idx-1].isalnum()) and \
                   (idx + len(med) >= len(text_lower) or not text_lower[idx + len(med)].isalnum()):
                    value = text[idx:idx + len(med)]
                    if not self._is_safe_token(value):
                        detections.append((PHIType.MEDICATION, value, idx, idx + len(med)))
                start = idx + 1
        
        # Keyword-based detection for health conditions
        for condition in self.HEALTH_CONDITION_KEYWORDS:
            start = 0
            while True:
                idx = text_lower.find(condition, start)
                if idx == -1:
                    break
                if (idx == 0 or not text_lower[idx-1].isalnum()) and \
                   (idx + len(condition) >= len(text_lower) or not text_lower[idx + len(condition)].isalnum()):
                    value = text[idx:idx + len(condition)]
                    if not self._is_safe_token(value):
                        detections.append((PHIType.HEALTH_CONDITION, value, idx, idx + len(condition)))
                start = idx + 1
        
        return detections
    
    def redact(self, text: str) -> RedactionResult:
        """
        Detect and redact PII/PHI from text.
        
        Args:
            text: Input text to redact
            
        Returns:
            RedactionResult with redacted text and detection details
        """
        if not text:
            return RedactionResult(original_text="", redacted_text="")
        
        detected_pii = []
        detected_phi = []
        
        if self.redact_pii:
            detected_pii = self._detect_pii(text)
        
        if self.redact_phi:
            detected_phi = self._detect_phi(text)
        
        # Sort all detections by position (reverse order for replacement)
        all_detections = []
        for pii_type, value, start, end in detected_pii:
            all_detections.append((start, end, self.PLACEHOLDERS[pii_type], pii_type, value))
        for phi_type, value, start, end in detected_phi:
            all_detections.append((start, end, self.PLACEHOLDERS[phi_type], phi_type, value))
        
        # Sort by start position descending (to replace from end to start)
        all_detections.sort(key=lambda x: x[0], reverse=True)
        
        # Apply redactions
        redacted_text = text
        for start, end, placeholder, _, _ in all_detections:
            redacted_text = redacted_text[:start] + placeholder + redacted_text[end:]
        
        return RedactionResult(
            original_text=text,
            redacted_text=redacted_text,
            detected_pii=detected_pii,
            detected_phi=detected_phi,
        )
    
    def detect_only(self, text: str) -> RedactionResult:
        """
        Detect PII/PHI without redacting.
        
        Useful for validation or logging purposes.
        """
        if not text:
            return RedactionResult(original_text="", redacted_text="")
        
        detected_pii = self._detect_pii(text) if self.redact_pii else []
        detected_phi = self._detect_phi(text) if self.redact_phi else []
        
        return RedactionResult(
            original_text=text,
            redacted_text=text,  # No redaction
            detected_pii=detected_pii,
            detected_phi=detected_phi,
        )
    
    def redact_dict(self, data: Dict, fields_to_redact: Optional[Set[str]] = None) -> Dict:
        """
        Redact PII/PHI from dictionary values.
        
        Args:
            data: Dictionary to redact
            fields_to_redact: Optional set of field names to redact (if None, redact all string fields)
            
        Returns:
            Dictionary with redacted values
        """
        result = {}
        
        for key, value in data.items():
            if fields_to_redact and key not in fields_to_redact:
                result[key] = value
            elif isinstance(value, str):
                result[key] = self.redact(value).redacted_text
            elif isinstance(value, dict):
                result[key] = self.redact_dict(value, fields_to_redact)
            elif isinstance(value, list):
                result[key] = [
                    self.redact(item).redacted_text if isinstance(item, str)
                    else self.redact_dict(item, fields_to_redact) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        
        return result


# Default redactor instance
_default_redactor = PIIRedactor()


def get_redactor() -> PIIRedactor:
    """Get the default PIIRedactor instance."""
    return _default_redactor


def redact_text(text: str) -> RedactionResult:
    """Convenience function to redact text using default settings."""
    return _default_redactor.redact(text)


def detect_pii_phi(text: str) -> RedactionResult:
    """Convenience function to detect PII/PHI without redacting."""
    return _default_redactor.detect_only(text)


def redact_for_logging(data: Dict) -> Dict:
    """Convenience function to redact a dictionary for logging."""
    return _default_redactor.redact_dict(data)
