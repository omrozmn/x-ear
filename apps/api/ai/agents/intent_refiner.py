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
from ai.runtime.model_client import LocalModelClient, get_model_client, ModelResponse
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


# Intent classification prompt template
INTENT_CLASSIFICATION_PROMPT = """You are an intent classifier for a hearing aid management system.

Analyze the user's message and classify their intent.

User message: {user_message}

Respond with a JSON object containing:
- intent_type: one of "query", "action", "clarification", "confirmation", "cancellation", "unknown"
- confidence: a number between 0 and 1 indicating your confidence
- entities: extracted entities from the message (e.g., product names, dates, etc.)
- clarification_needed: true if you need more information
- clarification_question: if clarification_needed is true, what question to ask
- reasoning: brief explanation of your classification

Example response:
{{"intent_type": "query", "confidence": 0.95, "entities": {{"product": "hearing_aid"}}, "clarification_needed": false, "reasoning": "User is asking about product information"}}

Respond ONLY with the JSON object, no other text."""


class IntentRefiner:
    """
    Intent Refiner Sub-Agent.
    
    Responsibilities:
    - Parse and sanitize user input
    - Detect and redact PII/PHI
    - Classify user intent using local LLM
    - Calculate confidence scores
    - Request clarification when needed
    
    This agent is READ-ONLY and never modifies data.
    """
    
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
        self.model_client = model_client or get_model_client()
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
            context: Optional context (conversation history, etc.)
            
        Returns:
            IntentRefinerResult with classified intent
        """
        start_time = time.time()
        
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
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            user_message=sanitization_result.sanitized_input
        )
        
        # Step 4: Call LLM with circuit breaker
        try:
            model_response = await self.circuit_breaker.execute(
                self.model_client.generate,
                prompt=prompt,
                system_prompt="You are a helpful intent classifier. Always respond with valid JSON.",
                max_tokens=512,
                temperature=0.3,
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
    
    def classify_without_llm(
        self,
        user_message: str,
    ) -> IntentOutput:
        """
        Simple rule-based classification without LLM.
        
        Used as fallback when LLM is unavailable.
        """
        message_lower = user_message.lower()
        
        # Simple keyword-based classification
        # Check action keywords first (before query check)
        if any(word in message_lower for word in ["do", "make", "create", "yap", "oluştur", "ekle"]):
            return IntentOutput(
                intent_type=IntentType.ACTION,
                confidence=0.5,
                entities={},
                reasoning="Keyword-based classification (fallback)",
            )
        
        if any(word in message_lower for word in ["cancel", "iptal", "vazgeç"]):
            return IntentOutput(
                intent_type=IntentType.CANCELLATION,
                confidence=0.6,
                entities={},
                reasoning="Keyword-based classification (fallback)",
            )
        
        if any(word in message_lower for word in ["yes", "evet", "confirm", "onayla", "tamam"]):
            return IntentOutput(
                intent_type=IntentType.CONFIRMATION,
                confidence=0.6,
                entities={},
                reasoning="Keyword-based classification (fallback)",
            )
        
        if any(word in message_lower for word in ["?", "what", "how", "ne", "nasıl", "nedir"]):
            return IntentOutput(
                intent_type=IntentType.QUERY,
                confidence=0.5,
                entities={},
                reasoning="Keyword-based classification (fallback)",
            )
        
        return IntentOutput(
            intent_type=IntentType.UNKNOWN,
            confidence=0.3,
            entities={},
            clarification_needed=True,
            clarification_question="Could you please clarify what you would like to do?",
            reasoning="Could not determine intent (fallback)",
        )


# Global instance
_refiner: Optional[IntentRefiner] = None


def get_intent_refiner() -> IntentRefiner:
    """Get the global Intent Refiner instance."""
    global _refiner
    if _refiner is None:
        _refiner = IntentRefiner()
    return _refiner
