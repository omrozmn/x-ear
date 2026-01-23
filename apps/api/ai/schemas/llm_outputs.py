"""
Pydantic models for LLM outputs.

All LLM outputs MUST be validated through these schemas.
LLM output is untrusted - always validate with Pydantic.

Requirements:
- 28.1: Define Pydantic models for LLM outputs
- 28.2: Validate all LLM outputs
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator
import re


class IntentType(str, Enum):
    """Types of user intents."""
    QUERY = "query"                 # Information request
    ACTION = "action"               # Request to perform action
    CLARIFICATION = "clarification" # Need more information
    CONFIRMATION = "confirmation"   # Confirm previous action
    CANCELLATION = "cancellation"   # Cancel previous action (alias: CANCEL)
    CANCEL = "cancellation"         # Alias for CANCELLATION
    CAPABILITY_INQUIRY = "capability_inquiry"  # Ask what AI can do
    SLOT_FILL = "slot_fill"         # Provide missing information
    UNKNOWN = "unknown"             # Cannot determine intent
    GREETING = "greeting"           # Social greeting


class ConfidenceLevel(str, Enum):
    """Confidence levels for LLM outputs."""
    HIGH = "high"       # > 0.8
    MEDIUM = "medium"   # 0.5 - 0.8
    LOW = "low"         # < 0.5


class RiskLevel(str, Enum):
    """Risk levels for operations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# =============================================================================
# Intent Classification Output
# =============================================================================

class IntentOutput(BaseModel):
    """
    Output from intent classification.
    
    Validates that LLM correctly identified user intent.
    """
    intent_type: IntentType = Field(
        description="Type of user intent"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score (0-1)"
    )
    entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extracted entities from user input"
    )
    clarification_needed: bool = Field(
        default=False,
        description="Whether clarification is needed"
    )
    clarification_question: Optional[str] = Field(
        default=None,
        description="Question to ask for clarification"
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="LLM's reasoning for the classification"
    )
    conversational_response: Optional[str] = Field(
        default=None,
        description="Friendly response to the user in their language"
    )
    
    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Get confidence level category."""
        if self.confidence > 0.8:
            return ConfidenceLevel.HIGH
        elif self.confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        return ConfidenceLevel.LOW
    
    @field_validator('entities')
    @classmethod
    def validate_entities(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure entities don't contain suspicious patterns."""
        # Check for potential injection in entity values
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'data:text/html',
            r'\{\{.*\}\}',  # Template injection
        ]
        
        def check_value(val: Any) -> bool:
            if isinstance(val, str):
                for pattern in suspicious_patterns:
                    if re.search(pattern, val, re.IGNORECASE):
                        return False
            elif isinstance(val, dict):
                return all(check_value(v) for v in val.values())
            elif isinstance(val, list):
                return all(check_value(item) for item in val)
            return True
        
        if not check_value(v):
            raise ValueError("Entities contain suspicious patterns")
        
        return v


# =============================================================================
# Operation Output
# =============================================================================

class OperationParameter(BaseModel):
    """A parameter for an operation."""
    name: str = Field(description="Parameter name")
    value: Any = Field(description="Parameter value")
    source: str = Field(
        default="user",
        description="Source of the value (user, inferred, default)"
    )


class OperationOutput(BaseModel):
    """
    Output describing a single operation to perform.
    """
    operation_id: str = Field(
        description="Unique identifier for this operation"
    )
    tool_id: str = Field(
        description="ID of the tool to use"
    )
    description: str = Field(
        description="Human-readable description of the operation"
    )
    parameters: List[OperationParameter] = Field(
        default_factory=list,
        description="Parameters for the operation"
    )
    risk_level: RiskLevel = Field(
        default=RiskLevel.LOW,
        description="Risk level of the operation"
    )
    requires_confirmation: bool = Field(
        default=False,
        description="Whether user confirmation is required"
    )
    rollback_possible: bool = Field(
        default=True,
        description="Whether the operation can be rolled back"
    )
    
    @field_validator('tool_id')
    @classmethod
    def validate_tool_id(cls, v: str) -> str:
        """Validate tool_id format."""
        if not re.match(r'^[a-z][a-z0-9_]*$', v):
            raise ValueError("Invalid tool_id format")
        return v
    
    @field_validator('operation_id')
    @classmethod
    def validate_operation_id(cls, v: str) -> str:
        """Validate operation_id format."""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Invalid operation_id format")
        return v


# =============================================================================
# Action Plan Output
# =============================================================================

class ActionPlanOutput(BaseModel):
    """
    Output describing a complete action plan.
    
    An action plan consists of one or more operations to be executed.
    """
    plan_id: str = Field(
        description="Unique identifier for this plan"
    )
    description: str = Field(
        description="Human-readable description of the plan"
    )
    operations: List[OperationOutput] = Field(
        description="List of operations in execution order"
    )
    overall_risk_level: RiskLevel = Field(
        default=RiskLevel.LOW,
        description="Overall risk level of the plan"
    )
    requires_approval: bool = Field(
        default=False,
        description="Whether admin approval is required"
    )
    estimated_duration_seconds: Optional[int] = Field(
        default=None,
        description="Estimated execution duration"
    )
    rollback_plan: Optional[str] = Field(
        default=None,
        description="Description of rollback procedure"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings about the plan"
    )
    
    @model_validator(mode='after')
    def validate_plan(self) -> 'ActionPlanOutput':
        """Validate the overall plan."""
        # Ensure at least one operation
        if not self.operations:
            raise ValueError("Action plan must have at least one operation")
        
        # Calculate overall risk level from operations
        risk_order = {
            RiskLevel.LOW: 0,
            RiskLevel.MEDIUM: 1,
            RiskLevel.HIGH: 2,
            RiskLevel.CRITICAL: 3,
        }
        
        max_risk = max(risk_order[op.risk_level] for op in self.operations)
        risk_levels = list(RiskLevel)
        calculated_risk = risk_levels[max_risk]
        
        # Overall risk should be at least as high as max operation risk
        if risk_order[self.overall_risk_level] < max_risk:
            self.overall_risk_level = calculated_risk
        
        # High/critical risk requires approval
        if self.overall_risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            self.requires_approval = True
        
        return self
    
    @field_validator('plan_id')
    @classmethod
    def validate_plan_id(cls, v: str) -> str:
        """Validate plan_id format."""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Invalid plan_id format")
        return v


# =============================================================================
# Chat Response Output
# =============================================================================

class ChatResponseOutput(BaseModel):
    """
    Output for chat/conversational responses.
    """
    message: str = Field(
        description="Response message to user"
    )
    intent: Optional[IntentOutput] = Field(
        default=None,
        description="Detected intent if applicable"
    )
    action_plan: Optional[ActionPlanOutput] = Field(
        default=None,
        description="Action plan if action is requested"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="Suggested follow-up actions"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate message doesn't contain dangerous content."""
        # Check for potential XSS
        if re.search(r'<script|javascript:|on\w+\s*=', v, re.IGNORECASE):
            raise ValueError("Message contains potentially dangerous content")
        return v


# =============================================================================
# Error Output
# =============================================================================

class ErrorOutput(BaseModel):
    """
    Output for error responses from LLM.
    """
    error_code: str = Field(
        description="Error code"
    )
    error_message: str = Field(
        description="Human-readable error message"
    )
    recoverable: bool = Field(
        default=True,
        description="Whether the error is recoverable"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="Suggestions for recovery"
    )


# =============================================================================
# Validation Result
# =============================================================================

class ValidationResult(BaseModel):
    """
    Result of LLM output validation.
    """
    valid: bool = Field(
        description="Whether the output is valid"
    )
    output_type: str = Field(
        description="Type of output validated"
    )
    errors: List[str] = Field(
        default_factory=list,
        description="Validation errors"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Validation warnings"
    )
    pii_detected: bool = Field(
        default=False,
        description="Whether PII was detected in output"
    )
    pii_types: List[str] = Field(
        default_factory=list,
        description="Types of PII detected"
    )
