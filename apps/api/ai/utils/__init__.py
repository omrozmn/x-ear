"""
AI Layer Utilities

Helper modules:
- pii_redactor: PII/PHI detection and redaction
- prompt_sanitizer: Prompt injection prevention
- approval_token: HMAC-signed approval token generation/validation
- llm_validator: LLM output validation with Pydantic
- db_isolation: Database isolation verification
- encryption: Prompt encryption and data retention
"""

from ai.utils.db_isolation import (
    verify_ai_layer_isolation,
    is_using_restricted_role,
    require_ai_isolation,
    AILayerIsolationError,
    TableAccessLevel,
    TablePermission,
)

from ai.utils.pii_redactor import (
    PIIRedactor,
    PIIType,
    PHIType,
    RedactionResult,
    redact_text,
    detect_pii_phi,
    redact_for_logging,
    get_redactor,
)

from ai.utils.prompt_sanitizer import (
    PromptSanitizer,
    InjectionType,
    SanitizationResult,
    sanitize_prompt,
    build_safe_prompt,
    detect_injection,
    is_prompt_safe,
)

from ai.utils.llm_validator import (
    LLMOutputValidator,
    LLMOutputValidationError,
    validate_llm_output,
    safe_validate_llm_output,
    get_validator,
)

from ai.utils.approval_token import (
    ApprovalToken,
    ApprovalTokenRegistry,
    ApprovalTokenValidator,
    TokenValidationResult,
    ApprovalTokenError,
    TokenExpiredError,
    TokenAlreadyUsedError,
    TokenInvalidSignatureError,
    PlanDriftError,
    TokenNotFoundError,
    generate_approval_token,
    validate_approval_token,
    get_token_registry,
    reset_token_registry,
)

from ai.utils.encryption import (
    PromptEncryptor,
    EncryptedData,
    EncryptionError,
    EncryptionKeyMissingError,
    RetentionConfig,
    encrypt_prompt,
    decrypt_prompt,
    get_encryptor,
    get_retention_config,
    reset_singletons as reset_encryption_singletons,
)

__all__ = [
    # DB Isolation
    "verify_ai_layer_isolation",
    "is_using_restricted_role",
    "require_ai_isolation",
    "AILayerIsolationError",
    "TableAccessLevel",
    "TablePermission",
    # PII Redactor
    "PIIRedactor",
    "PIIType",
    "PHIType",
    "RedactionResult",
    "redact_text",
    "detect_pii_phi",
    "redact_for_logging",
    "get_redactor",
    # Prompt Sanitizer
    "PromptSanitizer",
    "InjectionType",
    "SanitizationResult",
    "sanitize_prompt",
    "build_safe_prompt",
    "detect_injection",
    "is_prompt_safe",
    # LLM Validator
    "LLMOutputValidator",
    "LLMOutputValidationError",
    "validate_llm_output",
    "safe_validate_llm_output",
    "get_validator",
    # Approval Token
    "ApprovalToken",
    "ApprovalTokenRegistry",
    "ApprovalTokenValidator",
    "TokenValidationResult",
    "ApprovalTokenError",
    "TokenExpiredError",
    "TokenAlreadyUsedError",
    "TokenInvalidSignatureError",
    "PlanDriftError",
    "TokenNotFoundError",
    "generate_approval_token",
    "validate_approval_token",
    "get_token_registry",
    "reset_token_registry",
    # Encryption
    "PromptEncryptor",
    "EncryptedData",
    "EncryptionError",
    "EncryptionKeyMissingError",
    "RetentionConfig",
    "encrypt_prompt",
    "decrypt_prompt",
    "get_encryptor",
    "get_retention_config",
    "reset_encryption_singletons",
]
