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
            "intent": self.intent.model_dump() if self.intent is not None else None,
            "needsClarification": self.needs_clarification,
            "clarificationQuestion": self.clarification_question,
            "errorMessage": self.error_message,
            "processingTimeMs": self.processing_time_ms,
            "piiDetected": self.redaction_result.has_pii if self.redaction_result is not None else False,
            "phiDetected": self.redaction_result.has_phi if self.redaction_result is not None else False,
        }


# Optimized short Turkish prompt with required fields check
INTENT_CLASSIFICATION_PROMPT = """Kullanıcı mesajını sınıflandır:

MESAJ: {user_message}

BAĞLAM (SON İŞLEMLER): {context}

TİPLER:
- action: İşlem yap (oluştur, ekle, sil, güncelle, ata, teslim et)
- query: Soru sor, bilgi al (ne yapıyorsun, plan nedir, durum ne gibi)
- greeting: Selam, merhaba
- cancel: İptal et
- unknown: Belirsiz

ÖNEMLİ KURALLAR:
1. Eğer kullanıcı "ne yapıyorsun?", "neye hazırlık yapıyorsun?" gibi mevcut durumu soruyorsa, intent_type "query" olmalı ve conversational_response içinde bağlamdaki pending_plan_id veya aktif işlemi açıklamalıdır.
2. Bir işlem (action) için zorunlu alanlar eksikse "clarification_needed" true olmalı.
3. Conversational_response HER ZAMAN yapılan işleme özel olmalıdır. Örn: "Cihaz ataması hazırlıyorum", "Hasta kaydı oluşturuyorum".
4. Kullanıcı "vazgeç", "iptal" diyorsa intent_type "cancel" olmalı.

JSON DÖNDÜR:
{{
  "intent_type": "action|query|greeting|unknown|cancel",
  "confidence": 0.0-1.0,
  "entities": {{}},
  "clarification_needed": true/false,
  "clarification_question": "eksik bilgi varsa mutlaka burada sor",
  "conversational_response": "kullanıcıya verilecek net ve özel yanıt",
  "reasoning": "mantık"
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
            slot_name_obj = context.get("slot_name")
            slot_name = str(slot_name_obj) if slot_name_obj is not None else ""
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
        
        # Step 3: Build prompt for LLM
        context_str = json.dumps(context, ensure_ascii=False) if context else "Yok"
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            user_message=redacted_message,
            context=context_str
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
                intent = self.classify_without_llm(user_message, context=context)
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
            intent = self.classify_without_llm(user_message, context=context)
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
                intent = self.classify_without_llm(user_message, context=context)
                
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
        context: Optional[Dict[str, Any]] = None,
    ) -> IntentOutput:
        """
        Rule-based classification without LLM.
        
        Used as fallback when LLM is unavailable.
        """
        import re
        
        message_lower = user_message.lower().strip()
        message_clean = re.sub(r'[?!=.,;:!]+$', '', message_lower).strip()
        entities: Dict[str, Any] = {}
        
        last_action = None
        pending_plan_id = None
        if context and context.get("conversation_history"):
            history = context["conversation_history"]
            if history and isinstance(history, list):
                last_turn = history[-1] if isinstance(history[-1], dict) else {}
                turn_entities: Dict[str, Any] = last_turn.get("entities", {}) or {}
                last_action = str(turn_entities.get("action_type") or turn_entities.get("query_type") or "")
                pending_plan_id = str(turn_entities.get("pending_plan_id") or turn_entities.get("prepared_plan_id") or "")
        
        def _has_stem(stems: List[str]) -> bool:
            for stem in stems:
                if stem in message_clean: return True
            return False

        # 0. SPECIFIC CANCELLATIONS (High Priority)
        if _has_stem(["iptal et", "randevu iptal", "randevuyu iptal"]):
            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, 
                entities={"action_type": "cancel_appointment"},
                conversational_response="Randevu iptal işlemini başlatıyorum.", reasoning="İptal tespiti")

        # 1. GENERIC CANCELLATION
        def _is_cancellation():
            for kw in (self.CANCELLATION_KEYWORDS or []):
                if len(kw) <= 3:
                     # For short keywords like "dur", check if it's a stand-alone word
                     if re.search(rf"\b{kw}\b", message_lower): return True
                elif kw in message_lower:
                    return True
            return False

        if _is_cancellation():
            return IntentOutput(intent_type=IntentType.CANCEL, confidence=0.95,
                conversational_response="İşlem iptal edildi.", reasoning="İptal anahtar kelimesi")

        # 2. CONFIRMATIONS (ee, et, devam, onay, etc.)
        confirmation_keywords = ["evet", "tamam", "olur", "onayla", "ee", "et", "devam", "yap", "devam et", "oldu", "peki"]
        if any(w == message_clean or message_clean.startswith(w + " ") for w in confirmation_keywords):
            if pending_plan_id:
                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"confirm_plan": pending_plan_id, "action_type": last_action or "confirm"},
                    conversational_response="Plan onaylandı, işlemi gerçekleştiriyorum.", reasoning="Kullanıcı bekleyen planı onayladı")
            elif last_action:
                 return IntentOutput(intent_type=IntentType.ACTION, confidence=0.75, entities={"action_type": last_action},
                    conversational_response="İşleme devam ediyorum.", reasoning="Kullanıcı önceki eylemi sürdürdü")


        # 3. GREETINGS
        if any(word in message_clean for word in ["naber", "merhaba", "selam", "günaydın"]):
            return IntentOutput(intent_type=IntentType.GREETING, confidence=0.9, 
                conversational_response="Merhaba! Size nasıl yardımcı olabilirim?", reasoning="Selamlama")

        # 4. INVOICES (Action first, then Query)
        if _has_stem(["e-fatura kes", "gib'e yolla", "faturayı gönder", "fatura yolla", "faturayı yolla", "gib gönder", "gib’e yolla"]):
            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "generate_and_send_e_invoice"},
                conversational_response="E-fatura gönderim işlemini başlatıyorum.", reasoning="E-Fatura gönderim")
        
        if _has_stem(["fatur", "ödeme belge"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "invoices_list"},
                conversational_response="Faturaları listeliyorum.", reasoning="Fatura sorgusu")

        # 5. APPOINTMENT (list, create, reschedule, cancel, availability)
        if _has_stem(["randevu", "takvim", "boş yer", "boş saat", "müsaitlik", "uygunluk"]):
            if _has_stem(["iptal", "sil", "vazgeç"]):
                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.9, entities={"action_type": "cancel_appointment"},
                    conversational_response="Randevuyu iptal ediyorum.", reasoning="Appointment cancellation keyword")
            
            if _has_stem(["boş", "müsait", "uygun", "saat", "yer"]):
                 return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "check_appointment_availability"},
                    conversational_response="Uygun randevu saatlerini kontrol ediyorum.", reasoning="Appointment availability query")
            
            if _has_stem(["ertele", "kaydır", "değiştir", "başka zamana"]):
                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "reschedule_appointment"},
                    conversational_response="Randevu erteleme işlemini başlatıyorum.", reasoning="Appointment reschedule keyword")
            
            if _has_stem(["göster", "listele", "bugün", "yarın", "plan", "kontrol", "bak"]):
                return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "appointments_list"},
                    conversational_response="Randevularınızı kontrol ediyorum.", reasoning="Appointment list query")
            
            # Default to create if other specific actions not matched
            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.8, entities={"action_type": "appointment_create"},
                conversational_response="Randevu oluşturma işlemi için hazırlık yapıyorum.", reasoning="Oluşturma")

        # 6. INVENTORY (Low Stock first, then Assign/List)
        if _has_stem(["eksik", "stok uyarı", "stok uyarısı", "biten", "kritik stok", "stok az"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_low_stock_alerts"},
                conversational_response="Kritik seviyedeki stokları kontrol ediyorum.", reasoning="Stok uyarısı")

        if _has_stem(["cihaz", "stok", "envanter"]):
            if _has_stem(["ata", "ver", "teslim", "emanet"]):
                return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "device_assign"},
                    conversational_response="Cihaz atama işlemi için hazırlık yapıyorum.", reasoning="Atama")
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "inventory_list"},
                conversational_response="Cihazları listeliyorum.", reasoning="Envanter")

        # 7. SGK
        if _has_stem(["müstahaklık", "sgk hak", "cihaz hakkı"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "query_sgk_patient_rights"},
                conversational_response="SGK müstahaklık durumunu sorguluyorum.", reasoning="SGK Hak")
        if _has_stem(["e-reçete", "reçete sorgula", "sgk reçete", "reçetesi var mı"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "query_sgk_e_receipt"},
                conversational_response="SGK e-reçete durumunu sorguluyorum.", reasoning="E-Reçete")

        # 8. FINANCE
        if _has_stem(["kasa", "nakit", "tahsilat", "ödeme", "finans", "kredi kartı", "durum"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_daily_cash_summary"},
                conversational_response="Kasa durumunu özetliyorum.", reasoning="Kasa")
        if _has_stem(["tahsilat", "ödeme ekle", "para al"]):
            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "collection_create"},
                conversational_response="Yeni tahsilat girişi için hazırlık yapıyorum.", reasoning="Tahsilat")

        # 9. CRM SUMMARY
        if _has_stem(["geçmiş", "özet", "hasta detayı", "hasta özeti"]):
            return IntentOutput(intent_type=IntentType.QUERY, confidence=0.85, entities={"query_type": "get_party_comprehensive_summary"},
                conversational_response="Hasta geçmişini özetliyorum.", reasoning="Hasta özeti")

        # 10. SALES
        if _has_stem(["satış", "satıs", "satiş", "fatura kes", "satış yap"]):
            return IntentOutput(intent_type=IntentType.ACTION, confidence=0.85, entities={"action_type": "sale_create"},
                conversational_response="Yeni satış işlemi için hazırlık yapıyorum.", reasoning="Satış")

        # 6. ENTITY EXTRACTION FALBACK (Phone/Name)
        phone_pattern = r'0?5\d{9}|0?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}'
        phone_match = re.search(phone_pattern, user_message)
        if phone_match: entities["phone"] = phone_match.group().replace(" ", "")
        
        # Generic Fallback
        return IntentOutput(intent_type=IntentType.QUERY, confidence=0.1, entities=entities, 
            conversational_response="Size nasıl yardımcı olabilirim?", reasoning="Belirsiz")
# Global instance
_refiner: Optional[IntentRefiner] = None


def get_intent_refiner() -> IntentRefiner:
    """Get the global Intent Refiner instance."""
    global _refiner
    if _refiner is None:
        _refiner = IntentRefiner()
    return _refiner
