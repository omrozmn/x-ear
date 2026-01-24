"""
AI Layer Configuration

Loads configuration from environment variables and provides
phase enforcement decorators.

Environment Variables:
- AI_PHASE: A (read_only), B (proposal), C (execution) - default: A
- AI_MODEL_PROVIDER: local (default)
- AI_MODEL_ID: qwen2.5-7b-instruct (default)
- AI_MODEL_BASE_URL: http://localhost:11434 (default)
- AI_MODEL_TIMEOUT_SECONDS: 90 (default)
- AI_ENABLED: true/false - default: true
- AI_RATE_LIMIT_PER_MINUTE: 60 (default)
- AI_QUOTA_DEFAULT: 1000 (default requests per billing period)
"""

import os
from enum import Enum
from functools import wraps
from typing import Callable, Any
from dataclasses import dataclass


class AIPhase(Enum):
    """
    AI Layer operational phases.
    
    Phase A: Read-only mode - suggestions only, no execution
    Phase B: Proposal mode - proposals with approval gates
    Phase C: Execution mode - approved actions via Tool API
    """
    A = "read_only"
    B = "proposal"
    C = "execution"
    
    @classmethod
    def from_string(cls, value: str) -> "AIPhase":
        """Convert string to AIPhase enum."""
        value = value.upper().strip()
        if value in ("A", "READ_ONLY"):
            return cls.A
        elif value in ("B", "PROPOSAL"):
            return cls.B
        elif value in ("C", "EXECUTION"):
            return cls.C
        else:
            # Default to safest phase
            return cls.A


class AIExecutionDisabled(Exception):
    """Raised when execution is attempted in a phase that doesn't allow it."""
    pass


class AIUnavailableError(Exception):
    """Raised when AI features are unavailable (model unreachable, disabled, etc.)."""
    pass


class AITimeoutError(Exception):
    """Raised when model inference times out."""
    pass


class AIQuotaExceededError(Exception):
    """Raised when tenant AI quota is exceeded."""
    pass


class AIRateLimitError(Exception):
    """Raised when rate limit is exceeded."""
    pass


@dataclass(frozen=True)
class ModelConfig:
    """Configuration for the AI model."""
    provider: str
    model_id: str
    base_url: str
    timeout_seconds: int
    max_tokens: int
    temperature: float


@dataclass(frozen=True)
class GuardrailConfig:
    """Configuration for inference guardrails."""
    max_input_tokens: int
    max_output_tokens: int
    max_reasoning_steps: int
    intent_latency_budget_ms: int
    planning_latency_budget_ms: int
    execution_latency_budget_ms: int


@dataclass(frozen=True)
class QuotaConfig:
    """Configuration for usage quotas."""
    default_requests_per_period: int
    rate_limit_per_minute: int
    rate_limit_per_user_per_minute: int


class AIConfig:
    """
    Central configuration for the AI Layer.
    
    All configuration is loaded from environment variables.
    This class is a singleton - use AIConfig.get() to access.
    """
    
    _instance: "AIConfig | None" = None
    
    def __init__(self):
        # Phase configuration
        self._phase = AIPhase.from_string(os.getenv("AI_PHASE", "A"))
        self._enabled = os.getenv("AI_ENABLED", "true").lower() == "true"
        
        # Model configuration
        # Support separated Text/Vision endpoints
        text_endpoint = os.getenv("TEXT_MODEL_ENDPOINT")
        vision_endpoint = os.getenv("VISION_MODEL_ENDPOINT")
        
        # Default base URL if specific ones aren't set
        default_base_url = os.getenv("AI_MODEL_BASE_URL", "http://localhost:11434")

        self._model = ModelConfig(
            provider=os.getenv("AI_MODEL_PROVIDER", "local"),
            model_id=os.getenv("AI_MODEL_ID", "qwen2.5:7b-instruct"), # Default Smart
            base_url=vision_endpoint or default_base_url, # Vision/Smart model uses Vision Endpoint
            timeout_seconds=int(os.getenv("AI_MODEL_TIMEOUT_SECONDS", "180")),
            max_tokens=int(os.getenv("AI_MODEL_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("AI_MODEL_TEMPERATURE", "0.1")),
        )
        
        self._fast_model = ModelConfig(
            provider=os.getenv("AI_MODEL_PROVIDER", "local"),
            model_id=os.getenv("AI_FAST_MODEL_ID", "qwen2.5:3b"), # Default Fast
            base_url=text_endpoint or default_base_url, # Fast/Text model uses Text Endpoint
            timeout_seconds=int(os.getenv("AI_FAST_MODEL_TIMEOUT_SECONDS", "3")),  # 3 second timeout for fast model
            max_tokens=1024,
            temperature=0.1,
        )
        
        # Guardrail configuration
        self._guardrails = GuardrailConfig(
            max_input_tokens=int(os.getenv("AI_MAX_INPUT_TOKENS", "4096")),
            max_output_tokens=int(os.getenv("AI_MAX_OUTPUT_TOKENS", "2048")),
            max_reasoning_steps=int(os.getenv("AI_MAX_REASONING_STEPS", "10")),
            intent_latency_budget_ms=int(os.getenv("AI_INTENT_LATENCY_MS", "2000")),
            planning_latency_budget_ms=int(os.getenv("AI_PLANNING_LATENCY_MS", "5000")),
            execution_latency_budget_ms=int(os.getenv("AI_EXECUTION_LATENCY_MS", "10000")),
        )
        
        # Quota configuration
        self._quota = QuotaConfig(
            default_requests_per_period=int(os.getenv("AI_QUOTA_DEFAULT", "1000")),
            rate_limit_per_minute=int(os.getenv("AI_RATE_LIMIT_PER_MINUTE", "60")),
            rate_limit_per_user_per_minute=int(os.getenv("AI_RATE_LIMIT_PER_USER_PER_MINUTE", "20")),
        )
    
    @classmethod
    def get(cls) -> "AIConfig":
        """Get the singleton AIConfig instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    @property
    def phase(self) -> AIPhase:
        """Current AI phase."""
        return self._phase
    
    @property
    def enabled(self) -> bool:
        """Whether AI features are enabled."""
        return self._enabled
    
    @property
    def model(self) -> ModelConfig:
        """Model configuration (Smart/Default)."""
        return self._model

    @property
    def fast_model(self) -> ModelConfig:
        """Fast model configuration."""
        return self._fast_model
    
    @property
    def guardrails(self) -> GuardrailConfig:
        """Guardrail configuration."""
        return self._guardrails
    
    @property
    def quota(self) -> QuotaConfig:
        """Quota configuration."""
        return self._quota
    
    def is_execution_allowed(self) -> bool:
        """Check if execution is allowed in current phase."""
        return self._phase == AIPhase.C
    
    def is_proposal_allowed(self) -> bool:
        """Check if proposals are allowed in current phase."""
        return self._phase in (AIPhase.B, AIPhase.C)
    
    def is_read_only(self) -> bool:
        """Check if AI is in read-only mode."""
        return self._phase == AIPhase.A


def require_phase(minimum_phase: AIPhase) -> Callable:
    """
    Decorator to enforce minimum phase requirement.
    
    Usage:
        @require_phase(AIPhase.C)
        def execute_action(plan):
            ...
    
    Raises:
        AIExecutionDisabled: If current phase is below minimum required
    """
    phase_order = {AIPhase.A: 0, AIPhase.B: 1, AIPhase.C: 2}
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            config = AIConfig.get()
            current_order = phase_order[config.phase]
            required_order = phase_order[minimum_phase]
            
            if current_order < required_order:
                raise AIExecutionDisabled(
                    f"Operation requires phase {minimum_phase.name} ({minimum_phase.value}), "
                    f"but current phase is {config.phase.name} ({config.phase.value}). "
                    f"Update AI_PHASE environment variable and restart service."
                )
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_ai_enabled(func: Callable) -> Callable:
    """
    Decorator to check if AI is enabled.
    
    Usage:
        @require_ai_enabled
        def ai_chat(prompt):
            ...
    
    Raises:
        AIUnavailableError: If AI is disabled
    """
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        config = AIConfig.get()
        if not config.enabled:
            raise AIUnavailableError("AI features are disabled")
        return func(*args, **kwargs)
    return wrapper


# Convenience function to get current phase
def get_current_phase() -> AIPhase:
    """Get the current AI phase."""
    return AIConfig.get().phase


# Convenience function to check if AI is enabled
def is_ai_enabled() -> bool:
    """Check if AI features are enabled."""
    return AIConfig.get().enabled


def get_ai_config() -> AIConfig:
    """Get the AI configuration instance."""
    return AIConfig.get()
