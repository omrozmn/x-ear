"""
LLM Output Validator for AI Layer

Validates all LLM outputs using Pydantic models.
LLM output is untrusted - always validate before use.

Requirements:
- 28.3: Validate all LLM outputs with Pydantic
- 28.4: Scan outputs for PII leakage
- 28.5: Log validation failures
"""

import json
import logging
from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel, ValidationError

from ai.schemas.llm_outputs import (
    IntentOutput,
    OperationOutput,
    ActionPlanOutput,
    ChatResponseOutput,
    ErrorOutput,
    ValidationResult,
)
from ai.utils.pii_redactor import PIIRedactor, get_redactor

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class LLMOutputValidationError(Exception):
    """Raised when LLM output validation fails."""
    def __init__(
        self,
        message: str,
        errors: List[str],
        raw_output: Optional[str] = None,
    ):
        self.errors = errors
        self.raw_output = raw_output
        super().__init__(message)


class LLMOutputValidator:
    """
    Validator for LLM outputs.
    
    Provides:
    - Pydantic validation for structured outputs
    - PII leakage detection
    - Validation failure logging
    """
    
    def __init__(self, pii_redactor: Optional[PIIRedactor] = None):
        """
        Initialize the validator.
        
        Args:
            pii_redactor: PII redactor instance (uses global if None)
        """
        self.pii_redactor = pii_redactor or get_redactor()
    
    def validate_json(
        self,
        raw_output: str,
        output_type: Type[T],
        check_pii: bool = True,
    ) -> T:
        """
        Validate JSON output from LLM.
        
        Args:
            raw_output: Raw JSON string from LLM
            output_type: Pydantic model type to validate against
            check_pii: Whether to check for PII leakage
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            LLMOutputValidationError: If validation fails
        """
        errors = []
        
        # Parse JSON
        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON: {str(e)}")
            self._log_validation_failure(output_type.__name__, errors, raw_output)
            raise LLMOutputValidationError(
                "Failed to parse LLM output as JSON",
                errors,
                raw_output,
            )
        
        # Validate with Pydantic
        try:
            result = output_type.model_validate(data)
        except ValidationError as e:
            for error in e.errors():
                loc = ".".join(str(l) for l in error["loc"])
                errors.append(f"{loc}: {error['msg']}")
            
            self._log_validation_failure(output_type.__name__, errors, raw_output)
            raise LLMOutputValidationError(
                f"LLM output validation failed for {output_type.__name__}",
                errors,
                raw_output,
            )
        
        # Check for PII leakage
        if check_pii:
            pii_result = self._check_pii_leakage(result)
            if pii_result["detected"]:
                logger.warning(
                    f"PII detected in LLM output: {pii_result['types']}",
                    extra={
                        "output_type": output_type.__name__,
                        "pii_types": pii_result["types"],
                    }
                )
        
        return result
    
    def validate_dict(
        self,
        data: Dict[str, Any],
        output_type: Type[T],
        check_pii: bool = True,
    ) -> T:
        """
        Validate dictionary output from LLM.
        
        Args:
            data: Dictionary data from LLM
            output_type: Pydantic model type to validate against
            check_pii: Whether to check for PII leakage
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            LLMOutputValidationError: If validation fails
        """
        errors = []
        
        # Validate with Pydantic
        try:
            result = output_type.model_validate(data)
        except ValidationError as e:
            for error in e.errors():
                loc = ".".join(str(l) for l in error["loc"])
                errors.append(f"{loc}: {error['msg']}")
            
            self._log_validation_failure(output_type.__name__, errors, str(data))
            raise LLMOutputValidationError(
                f"LLM output validation failed for {output_type.__name__}",
                errors,
                str(data),
            )
        
        # Check for PII leakage
        if check_pii:
            pii_result = self._check_pii_leakage(result)
            if pii_result["detected"]:
                logger.warning(
                    f"PII detected in LLM output: {pii_result['types']}",
                    extra={
                        "output_type": output_type.__name__,
                        "pii_types": pii_result["types"],
                    }
                )
        
        return result
    
    def validate_intent(
        self,
        raw_output: str,
        check_pii: bool = True,
    ) -> IntentOutput:
        """Validate intent classification output."""
        return self.validate_json(raw_output, IntentOutput, check_pii)
    
    def validate_operation(
        self,
        raw_output: str,
        check_pii: bool = True,
    ) -> OperationOutput:
        """Validate operation output."""
        return self.validate_json(raw_output, OperationOutput, check_pii)
    
    def validate_action_plan(
        self,
        raw_output: str,
        check_pii: bool = True,
    ) -> ActionPlanOutput:
        """Validate action plan output."""
        return self.validate_json(raw_output, ActionPlanOutput, check_pii)
    
    def validate_chat_response(
        self,
        raw_output: str,
        check_pii: bool = True,
    ) -> ChatResponseOutput:
        """Validate chat response output."""
        return self.validate_json(raw_output, ChatResponseOutput, check_pii)
    
    def safe_validate(
        self,
        raw_output: str,
        output_type: Type[T],
        check_pii: bool = True,
    ) -> ValidationResult:
        """
        Safely validate output, returning result instead of raising.
        
        Args:
            raw_output: Raw output from LLM
            output_type: Pydantic model type
            check_pii: Whether to check for PII
            
        Returns:
            ValidationResult with validation status
        """
        errors = []
        warnings = []
        pii_detected = False
        pii_types = []
        
        # Parse JSON
        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError as e:
            return ValidationResult(
                valid=False,
                output_type=output_type.__name__,
                errors=[f"Invalid JSON: {str(e)}"],
            )
        
        # Validate with Pydantic
        try:
            result = output_type.model_validate(data)
        except ValidationError as e:
            for error in e.errors():
                loc = ".".join(str(l) for l in error["loc"])
                errors.append(f"{loc}: {error['msg']}")
            
            return ValidationResult(
                valid=False,
                output_type=output_type.__name__,
                errors=errors,
            )
        
        # Check for PII leakage
        if check_pii:
            pii_result = self._check_pii_leakage(result)
            pii_detected = pii_result["detected"]
            pii_types = pii_result["types"]
            
            if pii_detected:
                warnings.append(f"PII detected: {', '.join(pii_types)}")
        
        return ValidationResult(
            valid=True,
            output_type=output_type.__name__,
            errors=[],
            warnings=warnings,
            pii_detected=pii_detected,
            pii_types=pii_types,
        )
    
    def _check_pii_leakage(self, model: BaseModel) -> Dict[str, Any]:
        """
        Check for PII leakage in model fields.
        
        Args:
            model: Pydantic model to check
            
        Returns:
            Dict with 'detected' bool and 'types' list
        """
        detected_types = set()
        
        def check_value(value: Any) -> None:
            if isinstance(value, str):
                result = self.pii_redactor.redact(value)
                detected_types.update(result.detected_types)
            elif isinstance(value, dict):
                for v in value.values():
                    check_value(v)
            elif isinstance(value, list):
                for item in value:
                    check_value(item)
            elif isinstance(value, BaseModel):
                for field_value in value.model_dump().values():
                    check_value(field_value)
        
        # Check all fields
        for field_value in model.model_dump().values():
            check_value(field_value)
        
        return {
            "detected": len(detected_types) > 0,
            "types": list(detected_types),
        }
    
    def _log_validation_failure(
        self,
        output_type: str,
        errors: List[str],
        raw_output: str,
    ) -> None:
        """Log validation failure for audit."""
        # Truncate raw output for logging
        truncated = raw_output[:500] + "..." if len(raw_output) > 500 else raw_output
        
        logger.error(
            f"LLM output validation failed for {output_type}",
            extra={
                "output_type": output_type,
                "errors": errors,
                "raw_output_preview": truncated,
            }
        )


# Global validator instance
_validator: Optional[LLMOutputValidator] = None


def get_validator() -> LLMOutputValidator:
    """Get the global LLM output validator instance."""
    global _validator
    if _validator is None:
        _validator = LLMOutputValidator()
    return _validator


def validate_llm_output(
    raw_output: str,
    output_type: Type[T],
    check_pii: bool = True,
) -> T:
    """
    Convenience function to validate LLM output.
    
    Args:
        raw_output: Raw output from LLM
        output_type: Pydantic model type
        check_pii: Whether to check for PII
        
    Returns:
        Validated Pydantic model instance
    """
    return get_validator().validate_json(raw_output, output_type, check_pii)


def safe_validate_llm_output(
    raw_output: str,
    output_type: Type[T],
    check_pii: bool = True,
) -> ValidationResult:
    """
    Convenience function to safely validate LLM output.
    
    Args:
        raw_output: Raw output from LLM
        output_type: Pydantic model type
        check_pii: Whether to check for PII
        
    Returns:
        ValidationResult with validation status
    """
    return get_validator().safe_validate(raw_output, output_type, check_pii)
