"""
AI Layer Runtime Module

Provides runtime components for AI execution:
- Prompt Template Registry
- Model Client (Ollama)
- Model Registry (A/B Testing)
- Circuit Breaker
- Inference Engine
"""

from ai.runtime.prompt_registry import (
    PromptTemplate,
    PromptRegistry,
    TemplateCategory,
    PromptTemplateHashMismatchError,
    PromptTemplateNotFoundError,
    get_registry,
    get_template,
    get_template_by_hash,
)

from ai.runtime.model_client import (
    ModelConfig,
    ModelResponse,
    ModelStatus,
    LocalModelClient,
    SyncModelClient,
    ModelConnectionError,
    ModelTimeoutError,
    ModelUnavailableError,
    get_model_client,
)

from ai.runtime.model_registry import (
    ModelRegistry,
    ModelVersion,
    ModelType,
    ModelStatus as ModelVersionStatus,
    ABTestConfig,
    get_model_registry,
)

from ai.runtime.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerMetrics,
    CircuitBreakerOpenError,
    CircuitState,
    circuit_breaker,
    get_circuit_breaker,
    get_inference_circuit_breaker,
)

__all__ = [
    # Prompt Registry
    "PromptTemplate",
    "PromptRegistry",
    "TemplateCategory",
    "PromptTemplateHashMismatchError",
    "PromptTemplateNotFoundError",
    "get_registry",
    "get_template",
    "get_template_by_hash",
    # Model Client
    "ModelConfig",
    "ModelResponse",
    "ModelStatus",
    "LocalModelClient",
    "SyncModelClient",
    "ModelConnectionError",
    "ModelTimeoutError",
    "ModelUnavailableError",
    "get_model_client",
    # Model Registry
    "ModelRegistry",
    "ModelVersion",
    "ModelType",
    "ModelVersionStatus",
    "ABTestConfig",
    "get_model_registry",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitBreakerConfig",
    "CircuitBreakerMetrics",
    "CircuitBreakerOpenError",
    "CircuitState",
    "circuit_breaker",
    "get_circuit_breaker",
    "get_inference_circuit_breaker",
]
