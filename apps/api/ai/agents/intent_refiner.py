"""
Intent Refiner Sub-Agent

Parses user input and classifies intent using local LLM.
Performs PII/PHI redaction before processing.

Requirements:
- 2.1: Parse user input and classify intent
- 2.4: Confidence score calculation
- 2.5: Clarification request logic
- 2.6: Intent Refiner never modifies data (read-only)
- 2.7: Log all requests to AI_Audit_Storage
"""

import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from enum import Enum

from ai.config import get_ai_config, AIPhase
from ai.utils.pii_redactor import PIIRedactor, get_redactor, RedactionResult
from ai.utils.prompt_sanitizer import PromptSanitizer, sanitize_prompt, SanitizationResult
from ai.runtime.prompt_registry import get_registry, PromptTemplate
from ai.runtime.model_client import LocalModelClient, get_model_client, get_fast_model_client, ModelResponse, ModelTimeoutError
from ai.runtime.circuit_breaker import get_inference_circuit_breaker, CircuitBreakerOpenError
from ai.schemas.llm_outputs import IntentOutput, IntentType, ConfidenceLevel

logger = logging.getLogger(__name__)


class RefinerStatus(str, Enum):
    """Status of intent refinement."""
    SUCCESS = "success"
    NEEDS_CLARIFICATION = "needs_clarification"
    BLOCKED = "blocked"  # Blocked by sanitizer
    ERROR = "error"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class IntentRefinerResult:
    """Result of intent refinement."""
    status: RefinerStatus
    intent: Optional[IntentOutput] = None
    redaction_result: Optional[RedactionResult] = None
    sanitization_result: Optional[SanitizationResult] = None
    clarification_question: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: float = 0.0
    model_response: Optional[ModelResponse] = None
    
    @property
    def is_success(self) -> bool:
        return self.status == RefinerStatus.SUCCESS
    
    @property
    def needs_clarification(self) -> bool:
        return self.status == RefinerStatus.NEEDS_CLARIFICATION
    
    @property
    def is_blocked(self) -> bool:
        return self.status == RefinerStatus.BLOCKED
    
    def to_dict(self) -> dict:
        return {
            "status": self.status.value,
            "intent": self.intent.model_dump() if self.intent else None,
            "needsClarification": self.needs_clarification,
            "clarificationQuestion": self.clarification_question,
            "errorMessage": self.error_message,
            "processingTimeMs": self.processing_time_ms,
            "piiDetected": self.redaction_result.has_pii if self.redaction_result else False,
            "phiDetected": self.redaction_result.has_phi if self.redaction_result else False,
        }


# Optimized short Turkish prompt with required fields check
INTENT_CLASSIFICATION_PROMPT = """Kullanıcı mesajını sınıflandır:

MESAJ: {user_message}

TİPLER:
- action: İşlem yap (oluştur, ekle, sil, güncelle)
- query: Soru sor, bilgi al
- greeting: Selam, merhaba
- unknown: Belirsiz

GEREKLİ BİLGİLER (action için):
- Hasta oluştur: ad, soyad, telefon
- Randevu oluştur: hasta adı, tarih, saat
- Stok ekle: ürün adı, marka, fiyat

JSON DÖNDÜR:
{{
  "intent_type": "action|query|greeting|unknown",
  "confidence": 0.0-1.0,
  "entities": {{}},
  "clarification_needed": true/false,
  "clarification_question": "eksik bilgi varsa sor",
  "conversational_response": "kısa yanıt",
  "reasoning": "neden"
}}

KISA VE NET!"""


class IntentRefiner:
    """
    Intent Refiner Sub-Agent.
    
    Responsibilities:
    - Parse and sanitize user input
    - Detect and redact PII/PHI
    - Classify user intent using local LLM
    - Calculate confidence scores
    - Request clarification when needed
    - Detect cancellation keywords
    - Detect capability inquiry patterns
    - Extract slot-filling values
    
    This agent is READ-ONLY and never modifies data.
    """
    
    # Cancellation keywords (Requirement 4.1)
    CANCELLATION_KEYWORDS = ["cancel", "stop", "nevermind", "abort", "quit", "iptal", "vazgeç", "dur"]
    
    # Capability inquiry keywords (Requirement 5.2)
    CAPABILITY_KEYWORDS = [
        "what can you do", "help", "capabilities", "what do you do",
        "ne yapabilirsin", "yardım", "yetenekler", "neler yapabilirsin"
    ]
    
    def __init__(
        self,
        pii_redactor: Optional[PIIRedactor] = None,
        prompt_sanitizer: Optional[PromptSanitizer] = None,
        model_client: Optional[LocalModelClient] = None,
    ):
        """
        Initialize the Intent Refiner.
        
        Args:
            pii_redactor: PII redactor instance
            prompt_sanitizer: Prompt sanitizer instance
            model_client: Model client instance
        """
        self.pii_redactor = pii_redactor or get_redactor()
        self.prompt_sanitizer = prompt_sanitizer or PromptSanitizer()
        self.model_client = model_client or get_fast_model_client()
        self.circuit_breaker = get_inference_circuit_breaker()
        self.config = get_ai_config()
    
    async def refine_intent(
        self,
        user_message: str,
        tenant_id: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> IntentRefinerResult:
        """
        Refine user intent from message.
        
        Args:
            user_message: Raw user message
            tenant_id: Tenant identifier
            user_id: User identifier
            context: Optional context (conversation history, pending action plans, etc.)
            
        Returns:
            IntentRefinerResult with classified intent
        """
        start_time = time.time()
        
        # Normalize message for keyword detection
        normalized_message = user_message.lower().strip()
        
        # Step 0: Early detection for cancellation (Requirement 4.1)
        if any(keyword in normalized_message for keyword in self.CANCELLATION_KEYWORDS):
            logger.info(
                f"Cancellation keyword detected",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                }
            )
            return IntentRefinerResult(
                status=RefinerStatus.SUCCESS,
                intent=IntentOutput(
                    intent_type=IntentType.CANCEL,
                    confidence=0.95,
                    entities={},
                    conversational_response="İşlem iptal ediliyor.",
                    reasoning="Cancellation keyword detected",
                ),
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 0b: Early detection for capability inquiry (Requirement 5.2)
        if any(keyword in normalized_message for keyword in self.CAPABILITY_KEYWORDS):
            logger.info(
                f"Capability inquiry detected",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                }
            )
            return IntentRefinerResult(
                status=RefinerStatus.SUCCESS,
                intent=IntentOutput(
                    intent_type=IntentType.CAPABILITY_INQUIRY,
                    confidence=0.95,
                    entities={},
                    conversational_response="Size yeteneklerimi göstereyim.",
                    reasoning="Capability inquiry pattern detected",
                ),
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 0c: Check if this is a slot-filling response (Requirement 4.4)
        if context and context.get("awaiting_slot_fill"):
            slot_name = context.get("slot_name")
            extracted_value = self._extract_slot_value(user_message, slot_name)
            
            logger.info(
                f"Slot-filling response detected",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "slot_name": slot_name,
                }
            )
            
            return IntentRefinerResult(
                status=RefinerStatus.SUCCESS,
                intent=IntentOutput(
                    intent_type=IntentType.SLOT_FILL,
                    confidence=0.85,
                    entities={slot_name: extracted_value},
                    conversational_response=f"{slot_name} bilgisi alındı.",
                    reasoning=f"Slot-filling response for {slot_name}",
                ),
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 1: Redact PII/PHI
        redaction_result = self.pii_redactor.redact(user_message)
        redacted_message = redaction_result.redacted_text
        
        if redaction_result.has_pii or redaction_result.has_phi:
            logger.info(
                f"PII/PHI redacted from user message",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "pii_types": list(redaction_result.pii_types),
                    "phi_types": list(redaction_result.phi_types),
                }
            )
        
        # Step 2: Sanitize prompt
        sanitization_result = self.prompt_sanitizer.sanitize(redacted_message)
        
        if not sanitization_result.is_safe:
            logger.warning(
                f"Prompt blocked by sanitizer",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "risk_score": sanitization_result.risk_score,
                    "injection_types": [t.value for t in sanitization_result.injection_types],
                }
            )
            return IntentRefinerResult(
                status=RefinerStatus.BLOCKED,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                error_message="Message blocked due to security concerns",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 3: Build prompt for LLM (simplified, short prompt)
        # NOTE: We pass the UNREDACTED message to the local LLM so it can extract entities (like phone numbers).
        # Since the model runs locally within the secure boundary, this is acceptable.
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            user_message=user_message,
        )
        
        # Step 4: Call LLM with circuit breaker and optimized timeout
        # Use 3B fast model with 7-second timeout and 100 token limit
        try:
            model_response = await self.circuit_breaker.execute(
                self.model_client.generate,
                prompt=prompt,
                system_prompt="Sen bir Türkçe konuşan niyet sınıflandırma asistanısın. YALNIZCA TÜRKÇE YANIT VER. SADECE JSON döndür.",
                num_predict=100,  # Increased to 100 tokens for complete JSON
                temperature=0.1,  # Low temperature for consistent classification
                timeout_override=7.0,  # 7-second timeout
            )
            
            # Validate JSON response
            try:
                # Try to parse as JSON first
                response_text = model_response.content.strip()
                if not response_text:
                    raise ValueError("Empty response from model")
                
                # Check if it's valid JSON
                json.loads(response_text)
                
            except (json.JSONDecodeError, ValueError) as e:
                # JSON validation failed - discard and use fallback
                logger.warning(
                    f"Invalid JSON from model, using fallback classification",
                    extra={
                        "tenant_id": tenant_id,
                        "user_id": user_id,
                        "error": str(e),
                        "response_preview": model_response.content[:100] if model_response.content else "empty",
                    }
                )
                # Use rule-based fallback
                intent = self.classify_without_llm(user_message)
                return IntentRefinerResult(
                    status=RefinerStatus.SUCCESS,
                    intent=intent,
                    redaction_result=redaction_result,
                    sanitization_result=sanitization_result,
                    model_response=None,
                    processing_time_ms=(time.time() - start_time) * 1000,
                )
                
        except ModelTimeoutError as e:
            # Timeout exceeded - use fallback
            logger.warning(
                f"Model timeout after {e.timeout_seconds}s, using fallback classification",
                extra={
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                }
            )
            # Use rule-based fallback
            intent = self.classify_without_llm(user_message)
            return IntentRefinerResult(
                status=RefinerStatus.SUCCESS,
                intent=intent,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                model_response=None,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        except CircuitBreakerOpenError as e:
            logger.error(f"Circuit breaker open: {e}")
            return IntentRefinerResult(
                status=RefinerStatus.CIRCUIT_OPEN,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                error_message=f"Service temporarily unavailable. Retry after {e.retry_after_seconds:.0f}s",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        except Exception as e:
            logger.error(f"Model call failed: {e}")
            return IntentRefinerResult(
                status=RefinerStatus.ERROR,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                error_message=str(e),
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 5: Parse LLM response
        try:
            intent = self._parse_intent_response(model_response.content)
            
            # Validate: If action intent but missing required entities, use fallback
            if (intent.intent_type == IntentType.ACTION and 
                not intent.clarification_needed and
                "first_name" not in intent.entities and
                "phone" not in intent.entities):
                logger.info("LLM returned action without required entities, using fallback")
                intent = self.classify_without_llm(user_message)
                
        except Exception as e:
            logger.error(f"Failed to parse intent response: {e}")
            return IntentRefinerResult(
                status=RefinerStatus.ERROR,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                model_response=model_response,
                error_message=f"Failed to parse model response: {e}",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Step 6: Check if clarification needed
        if intent.clarification_needed:
            return IntentRefinerResult(
                status=RefinerStatus.NEEDS_CLARIFICATION,
                intent=intent,
                redaction_result=redaction_result,
                sanitization_result=sanitization_result,
                model_response=model_response,
                clarification_question=intent.clarification_question,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Success
        return IntentRefinerResult(
            status=RefinerStatus.SUCCESS,
            intent=intent,
            redaction_result=redaction_result,
            sanitization_result=sanitization_result,
            model_response=model_response,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    
    def refine_intent_sync(
        self,
        user_message: str,
        tenant_id: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> IntentRefinerResult:
        """Synchronous version of refine_intent."""
        import asyncio
        return asyncio.run(self.refine_intent(user_message, tenant_id, user_id, context))
    
    def _parse_intent_response(self, response: str) -> IntentOutput:
        """
        Parse LLM response into IntentOutput.
        
        Args:
            response: Raw LLM response
            
        Returns:
            Validated IntentOutput
        """
        # Try to extract JSON from response
        response = response.strip()
        
        # Handle markdown code blocks
        if response.startswith("```"):
            lines = response.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```") and not in_json:
                    in_json = True
                    continue
                elif line.startswith("```") and in_json:
                    break
                elif in_json:
                    json_lines.append(line)
            response = "\n".join(json_lines)
        
        # Parse JSON
        data = json.loads(response)
        
        # Validate with Pydantic
        return IntentOutput.model_validate(data)
    
    def _extract_slot_value(self, message: str, slot_name: str) -> str:
        """
        Extract value for a specific slot from user message.
        
        NOTE: Slot extraction is best-effort; validation happens in Action Planner.
        This simple implementation handles basic cases. Future enhancements may include:
        - NER (Named Entity Recognition) for complex extractions
        - Type-specific parsing (dates, numbers, entities)
        - Multi-value extraction
        
        Args:
            message: User's message
            slot_name: Name of the slot to extract
            
        Returns:
            Extracted value as string (best-effort)
        """
        # Strip whitespace from message
        stripped = message.strip()
        
        # If stripping results in empty string, return original message
        # This allows Action Planner to validate and reject invalid inputs
        # rather than silently converting them to empty strings
        if not stripped:
            return message
        
        return stripped
    
    def classify_without_llm(
        self,
        user_message: str,
    ) -> IntentOutput:
        """
        Simple rule-based classification without LLM.
        
        Used as fallback when LLM is unavailable.
        Includes basic required field detection and entity extraction.
        """
        import re
        
        message_lower = user_message.lower()
        entities = {}
        
        # Check for cancellation (Requirement 4.1)
        if any(keyword in message_lower for keyword in self.CANCELLATION_KEYWORDS):
            return IntentOutput(
                intent_type=IntentType.CANCEL,
                confidence=0.9,
                entities=entities,
                conversational_response="İşlem iptal ediliyor.",
                reasoning="Cancellation keyword detected",
            )
        
        # Check for capability inquiry (Requirement 5.2)
        if any(keyword in message_lower for keyword in self.CAPABILITY_KEYWORDS):
            return IntentOutput(
                intent_type=IntentType.CAPABILITY_INQUIRY,
                confidence=0.9,
                entities=entities,
                conversational_response="Size yeteneklerimi göstereyim.",
                reasoning="Capability inquiry pattern detected",
            )
        
        # Extract phone number (Turkish format)
        phone_pattern = r'0?5\d{9}|0?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}'
        phone_match = re.search(phone_pattern, user_message)
        if phone_match:
            entities["phone"] = phone_match.group().replace(" ", "")
        
        # Extract name (case-insensitive, handles both uppercase and lowercase)
        # Look for 2-3 words that could be names (before phone or standalone)
        # First try capitalized pattern
        name_pattern_caps = r'\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,2})\b'
        name_matches = re.findall(name_pattern_caps, user_message)
        
        # If no capitalized names found, try lowercase pattern (2-3 words before phone)
        if not name_matches and phone_match:
            # Get text before phone number
            text_before_phone = user_message[:phone_match.start()].strip()
            # Remove common words and punctuation
            text_before_phone = re.sub(r'\b(hasta|patient|kayıt|ekle|oluştur|yeni|için|adı|ismi)\b', '', text_before_phone, flags=re.IGNORECASE)
            text_before_phone = re.sub(r'[:\-,]', '', text_before_phone)
            # Extract remaining words
            words = [w.strip() for w in text_before_phone.strip().split() if w.strip()]
            if len(words) >= 2:
                # Take last 2-3 words as name
                name_words = words[-3:] if len(words) >= 3 else words[-2:]
                # Capitalize first letter of each word
                name_words = [w.capitalize() for w in name_words if w]
                if len(name_words) >= 2:
                    entities["first_name"] = name_words[0]
                    entities["last_name"] = " ".join(name_words[1:])
                    name_matches = [" ".join(name_words)]
        
        if name_matches and "first_name" not in entities:
            # Take the first match as full name
            full_name = name_matches[0]
            name_parts = full_name.split()
            if len(name_parts) >= 2:
                entities["first_name"] = name_parts[0]
                entities["last_name"] = " ".join(name_parts[1:])
        
        # Check for patient/party creation
        if any(word in message_lower for word in ["hasta", "patient", "kayıt", "ekle", "oluştur", "yeni"]):
            # Check for required fields
            has_name = "first_name" in entities and "last_name" in entities
            has_phone = "phone" in entities
            
            missing_fields = []
            if not has_name:
                missing_fields.append("ad ve soyad")
            if not has_phone:
                missing_fields.append("telefon numarası")
            
            if missing_fields:
                return IntentOutput(
                    intent_type=IntentType.ACTION,
                    confidence=0.7,
                    entities=entities,
                    clarification_needed=True,
                    clarification_question=f"Hasta kaydı için {' ve '.join(missing_fields)} gerekli. Lütfen bu bilgileri paylaşır mısınız?",
                    conversational_response=f"Hasta kaydı için {' ve '.join(missing_fields)} gerekli.",
                    reasoning="Hasta kaydı için gerekli bilgiler eksik",
                )
            
            # All required fields present
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.8,
                entities=entities,
                conversational_response=f"{entities.get('first_name', '')} {entities.get('last_name', '')} için hasta kaydı hazırlanıyor.",
                reasoning="Hasta kaydı için tüm gerekli bilgiler mevcut",
            )
        
        # Check for confirmation
        if any(word in message_lower for word in ["yes", "evet", "confirm", "onayla", "tamam"]):
            return IntentOutput(
                intent_type=IntentType.CONFIRMATION,
                confidence=0.6,
                entities=entities,
                conversational_response="Anlaşıldı, devam ediyorum.",
                reasoning="Onay tespit edildi",
            )
        
        # Check for query
        if any(word in message_lower for word in ["?", "what", "how", "ne", "nasıl", "nedir", "kim", "nerede"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.5,
                entities=entities,
                conversational_response="Size bu konuda yardımcı olabilirim.",
                reasoning="Soru tespit edildi",
            )
        
        # Check for greeting
        if any(word in message_lower for word in ["merhaba", "selam", "hello", "hi", "naber", "nasılsın"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.7,
                entities=entities,
                conversational_response="Merhaba! Size nasıl yardımcı olabilirim?",
                reasoning="Selamlama tespit edildi",
            )
        
        # If we have name and phone but no clear intent, assume patient creation
        if "first_name" in entities and "phone" in entities:
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.6,
                entities=entities,
                conversational_response=f"{entities.get('first_name', '')} {entities.get('last_name', '')} için hasta kaydı hazırlanıyor.",
                reasoning="Ad ve telefon bilgisinden hasta kaydı çıkarıldı",
            )
        
        return IntentOutput(
            intent_type=IntentType.UNKNOWN,
            confidence=0.3,
            entities=entities,
            clarification_needed=True,
            clarification_question="Ne yapmak istediğinizi anlayamadım. Lütfen daha detaylı açıklar mısınız?",
            conversational_response="Ne yapmak istediğinizi anlayamadım.",
            reasoning="Niyet belirlenemedi",
        )


# Global instance
_refiner: Optional[IntentRefiner] = None


def get_intent_refiner() -> IntentRefiner:
    """Get the global Intent Refiner instance."""
    global _refiner
    if _refiner is None:
        _refiner = IntentRefiner()
    return _refiner
