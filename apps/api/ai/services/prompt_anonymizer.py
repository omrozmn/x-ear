"""
Prompt Anonymization Service for AI Layer (FUTURE USE - NOT CURRENTLY ACTIVE).

⚠️ STATUS: This module is NOT currently used in production and is reserved for future implementation.

PURPOSE:
This service will be activated when we implement model improvement and training pipelines
that require anonymized prompt data. It provides anonymization of prompts to remove all
PII/PHI while preserving semantic structure for model training purposes.

WHY NOT CURRENTLY USED:
1. Phase A (read-only) does not require model training/improvement
2. Full anonymization requires NER (Named Entity Recognition) model integration
3. Current PII redaction in Intent Refiner is sufficient for operational needs
4. Model improvement pipeline is planned for Phase B/C rollout

PLANNED ACTIVATION:
- Target: Q2 2025 (Phase B implementation)
- Dependency: NER model integration for entity detection
- Use case: Anonymized prompt corpus for fine-tuning local models
- Requirements: 10.4 (Anonymize prompts before using them for model improvement)

RELATED MODULES:
- ai.utils.pii_redactor: Operational PII/PHI redaction (currently active)
- ai.agents.intent_refiner: Uses pii_redactor for real-time redaction

DO NOT DELETE: This module contains production-ready code that will be activated
when model improvement features are implemented.

Requirements:
- 10.4: Anonymize prompts before using them for model improvement

This service provides anonymization of prompts to remove all PII/PHI
while preserving the semantic structure for model training purposes.
"""

import re
import hashlib
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

from ai.utils.pii_redactor import get_redactor, PIIRedactor, PIIType, PHIType


logger = logging.getLogger(__name__)


class AnonymizationLevel(str, Enum):
    """Level of anonymization to apply."""
    BASIC = "basic"  # Replace PII with generic placeholders
    STANDARD = "standard"  # Replace PII with type-specific placeholders
    STRICT = "strict"  # Replace PII and generalize all entities


@dataclass
class AnonymizedPrompt:
    """Container for an anonymized prompt with metadata."""
    id: str
    original_hash: str  # SHA-256 hash of original prompt (for deduplication)
    anonymized_text: str
    anonymization_level: AnonymizationLevel
    pii_types_found: List[str]
    phi_types_found: List[str]
    entity_map: Dict[str, str]  # Maps placeholder to entity type
    created_at: datetime
    source_tenant_id: Optional[str] = None  # Removed for privacy
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "originalHash": self.original_hash,
            "anonymizedText": self.anonymized_text,
            "anonymizationLevel": self.anonymization_level.value,
            "piiTypesFound": self.pii_types_found,
            "phiTypesFound": self.phi_types_found,
            "entityCount": len(self.entity_map),
            "createdAt": self.created_at.isoformat(),
        }


@dataclass
class AnonymizationResult:
    """Result of an anonymization operation."""
    success: bool
    anonymized_prompt: Optional[AnonymizedPrompt] = None
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "anonymizedPrompt": self.anonymized_prompt.to_dict() if self.anonymized_prompt else None,
            "errorMessage": self.error_message,
        }


class PromptAnonymizer:
    """
    Service for anonymizing prompts before model improvement use.
    
    This service:
    1. Detects and replaces all PII/PHI with consistent placeholders
    2. Preserves semantic structure for training purposes
    3. Generates consistent placeholders for the same entity within a prompt
    4. Removes any tenant/user identifying information
    """
    
    # Additional patterns for entity anonymization
    ENTITY_PATTERNS = {
        # Names (Turkish and international)
        "person_name": r"\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+\b",
        # Company names
        "company": r"\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]*(?:\s+(?:A\.Ş\.|Ltd\.|Inc\.|Corp\.|GmbH|LLC))\b",
        # Addresses
        "address": r"\b(?:Cad\.|Sok\.|Mah\.|Apt\.|No:?\s*\d+)[^,\n]*\b",
        # Dates (various formats)
        "date": r"\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b",
        # Times
        "time": r"\b\d{1,2}:\d{2}(?::\d{2})?\b",
        # Currency amounts
        "amount": r"\b\d+(?:[.,]\d+)?\s*(?:TL|₺|USD|\$|EUR|€)\b",
        # Product codes/serial numbers
        "product_code": r"\b[A-Z]{2,4}-?\d{4,10}\b",
    }
    
    def __init__(
        self,
        pii_redactor: Optional[PIIRedactor] = None,
        default_level: AnonymizationLevel = AnonymizationLevel.STANDARD
    ):
        """
        Initialize the prompt anonymizer.
        
        Args:
            pii_redactor: Optional PII redactor instance
            default_level: Default anonymization level
        """
        self.pii_redactor = pii_redactor or get_redactor()
        self.default_level = default_level
    
    def anonymize(
        self,
        prompt: str,
        level: Optional[AnonymizationLevel] = None,
        tenant_id: Optional[str] = None
    ) -> AnonymizationResult:
        """
        Anonymize a prompt for model improvement use.
        
        Args:
            prompt: The prompt to anonymize
            level: Anonymization level (defaults to instance default)
            tenant_id: Optional tenant ID (will be removed from result)
            
        Returns:
            AnonymizationResult with anonymized prompt
        """
        level = level or self.default_level
        
        try:
            # Step 1: Hash original prompt for deduplication
            original_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
            
            # Step 2: Apply PII/PHI redaction
            redacted_text, detected_types = self.pii_redactor.redact(prompt)
            
            # Separate PII and PHI types
            pii_types = [t for t in detected_types if hasattr(PIIType, t.upper())]
            phi_types = [t for t in detected_types if hasattr(PHIType, t.upper())]
            
            # Step 3: Apply additional entity anonymization based on level
            anonymized_text, entity_map = self._apply_entity_anonymization(
                redacted_text, level
            )
            
            # Step 4: Create anonymized prompt object
            anonymized_prompt = AnonymizedPrompt(
                id=f"anon_{uuid4().hex[:16]}",
                original_hash=original_hash,
                anonymized_text=anonymized_text,
                anonymization_level=level,
                pii_types_found=pii_types,
                phi_types_found=phi_types,
                entity_map=entity_map,
                created_at=datetime.utcnow(),
                source_tenant_id=None,  # Explicitly removed for privacy
            )
            
            logger.debug(
                f"Anonymized prompt {anonymized_prompt.id}: "
                f"found {len(pii_types)} PII types, {len(phi_types)} PHI types, "
                f"{len(entity_map)} entities"
            )
            
            return AnonymizationResult(
                success=True,
                anonymized_prompt=anonymized_prompt,
            )
            
        except Exception as e:
            logger.error(f"Failed to anonymize prompt: {e}")
            return AnonymizationResult(
                success=False,
                error_message=str(e),
            )
    
    def _apply_entity_anonymization(
        self,
        text: str,
        level: AnonymizationLevel
    ) -> Tuple[str, Dict[str, str]]:
        """
        Apply entity-level anonymization based on level.
        
        Args:
            text: Text with PII already redacted
            level: Anonymization level
            
        Returns:
            Tuple of (anonymized_text, entity_map)
        """
        entity_map: Dict[str, str] = {}
        anonymized = text
        
        if level == AnonymizationLevel.BASIC:
            # Basic: Just use generic [REDACTED] for everything
            # PII redactor already handles this
            return anonymized, entity_map
        
        # Standard and Strict: Apply entity-specific placeholders
        entity_counters: Dict[str, int] = {}
        
        for entity_type, pattern in self.ENTITY_PATTERNS.items():
            matches = list(re.finditer(pattern, anonymized, re.IGNORECASE))
            
            for match in reversed(matches):  # Reverse to preserve indices
                original = match.group()
                
                # Skip if already redacted
                if "[REDACTED" in original:
                    continue
                
                # Generate consistent placeholder
                counter = entity_counters.get(entity_type, 0) + 1
                entity_counters[entity_type] = counter
                
                placeholder = f"[{entity_type.upper()}_{counter}]"
                entity_map[placeholder] = entity_type
                
                # Replace in text
                anonymized = (
                    anonymized[:match.start()] +
                    placeholder +
                    anonymized[match.end():]
                )
        
        if level == AnonymizationLevel.STRICT:
            # Strict: Also generalize numbers and specific terms
            anonymized = self._generalize_numbers(anonymized)
            anonymized = self._generalize_specific_terms(anonymized)
        
        return anonymized, entity_map
    
    def _generalize_numbers(self, text: str) -> str:
        """Replace specific numbers with generalized placeholders."""
        # Replace standalone numbers (not part of placeholders)
        def replace_number(match):
            num = match.group()
            if len(num) <= 2:
                return "[SMALL_NUMBER]"
            elif len(num) <= 4:
                return "[MEDIUM_NUMBER]"
            else:
                return "[LARGE_NUMBER]"
        
        # Only replace numbers not inside brackets
        result = []
        in_bracket = False
        i = 0
        while i < len(text):
            if text[i] == '[':
                in_bracket = True
                result.append(text[i])
            elif text[i] == ']':
                in_bracket = False
                result.append(text[i])
            elif not in_bracket and text[i].isdigit():
                # Collect the full number
                num_start = i
                while i < len(text) and text[i].isdigit():
                    i += 1
                num = text[num_start:i]
                if len(num) <= 2:
                    result.append("[SMALL_NUMBER]")
                elif len(num) <= 4:
                    result.append("[MEDIUM_NUMBER]")
                else:
                    result.append("[LARGE_NUMBER]")
                continue
            else:
                result.append(text[i])
            i += 1
        
        return ''.join(result)
    
    def _generalize_specific_terms(self, text: str) -> str:
        """Replace specific terms with generalized versions."""
        # Medical terms
        medical_terms = [
            (r"\b(?:işitme\s+cihazı|hearing\s+aid)\b", "[HEARING_DEVICE]"),
            (r"\b(?:odyometri|audiometry)\b", "[HEARING_TEST]"),
            (r"\b(?:kulak|ear)\b", "[BODY_PART]"),
        ]
        
        result = text
        for pattern, replacement in medical_terms:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        
        return result
    
    def batch_anonymize(
        self,
        prompts: List[str],
        level: Optional[AnonymizationLevel] = None
    ) -> List[AnonymizationResult]:
        """
        Anonymize multiple prompts.
        
        Args:
            prompts: List of prompts to anonymize
            level: Anonymization level
            
        Returns:
            List of AnonymizationResult objects
        """
        return [self.anonymize(prompt, level) for prompt in prompts]
    
    def is_safe_for_training(self, anonymized_prompt: AnonymizedPrompt) -> bool:
        """
        Check if an anonymized prompt is safe for model training.
        
        Args:
            anonymized_prompt: The anonymized prompt to check
            
        Returns:
            True if safe for training
        """
        # Check that no raw PII patterns remain
        text = anonymized_prompt.anonymized_text
        
        # Re-run PII detection on anonymized text
        _, detected = self.pii_redactor.redact(text)
        
        if detected:
            logger.warning(
                f"Anonymized prompt {anonymized_prompt.id} still contains PII: {detected}"
            )
            return False
        
        # Check for common PII patterns that might have been missed
        suspicious_patterns = [
            r"\b[1-9]\d{10}\b",  # TC Kimlik
            r"\b0?[5][0-9]{9}\b",  # Phone
            r"\b[\w.-]+@[\w.-]+\.\w+\b",  # Email
            r"\bTR\d{24}\b",  # IBAN
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text):
                logger.warning(
                    f"Anonymized prompt {anonymized_prompt.id} contains suspicious pattern"
                )
                return False
        
        return True


@dataclass
class AnonymizedPromptStore:
    """
    In-memory store for anonymized prompts.
    
    In production, this would be backed by a database table
    specifically for model improvement data.
    """
    prompts: Dict[str, AnonymizedPrompt] = field(default_factory=dict)
    
    def add(self, prompt: AnonymizedPrompt) -> None:
        """Add an anonymized prompt to the store."""
        self.prompts[prompt.id] = prompt
    
    def get(self, prompt_id: str) -> Optional[AnonymizedPrompt]:
        """Get an anonymized prompt by ID."""
        return self.prompts.get(prompt_id)
    
    def get_by_hash(self, original_hash: str) -> Optional[AnonymizedPrompt]:
        """Get an anonymized prompt by original hash (for deduplication)."""
        for prompt in self.prompts.values():
            if prompt.original_hash == original_hash:
                return prompt
        return None
    
    def list_all(self) -> List[AnonymizedPrompt]:
        """List all anonymized prompts."""
        return list(self.prompts.values())
    
    def count(self) -> int:
        """Get count of stored prompts."""
        return len(self.prompts)
    
    def clear(self) -> None:
        """Clear all stored prompts."""
        self.prompts.clear()


# Singleton instances
_anonymizer: Optional[PromptAnonymizer] = None
_prompt_store: Optional[AnonymizedPromptStore] = None


def get_prompt_anonymizer() -> PromptAnonymizer:
    """Get the singleton PromptAnonymizer instance."""
    global _anonymizer
    if _anonymizer is None:
        _anonymizer = PromptAnonymizer()
    return _anonymizer


def get_anonymized_prompt_store() -> AnonymizedPromptStore:
    """Get the singleton AnonymizedPromptStore instance."""
    global _prompt_store
    if _prompt_store is None:
        _prompt_store = AnonymizedPromptStore()
    return _prompt_store


def anonymize_prompt(
    prompt: str,
    level: Optional[AnonymizationLevel] = None,
    store: bool = True
) -> AnonymizationResult:
    """
    Convenience function to anonymize a prompt.
    
    Args:
        prompt: The prompt to anonymize
        level: Anonymization level
        store: Whether to store the result
        
    Returns:
        AnonymizationResult
    """
    anonymizer = get_prompt_anonymizer()
    result = anonymizer.anonymize(prompt, level)
    
    if result.success and store and result.anonymized_prompt:
        store_instance = get_anonymized_prompt_store()
        store_instance.add(result.anonymized_prompt)
    
    return result


def reset_anonymizer_singletons() -> None:
    """Reset singleton instances (for testing)."""
    global _anonymizer, _prompt_store
    _anonymizer = None
    _prompt_store = None
