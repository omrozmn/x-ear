"""
Property-based tests for LLM Output Validator.

**Feature: ai-layer-architecture**
**Property 22: LLM Output Validation**

**Validates: Requirements 28.1, 28.2, 28.3, 28.4, 28.5**

Tests that:
- LLM outputs are validated with Pydantic
- Invalid outputs are rejected
- PII leakage is detected
- Validation failures are logged
"""

import sys
from pathlib import Path
import json

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings

from ai.schemas.llm_outputs import (
    IntentOutput,
    IntentType,
    OperationOutput,
    ActionPlanOutput,
    ChatResponseOutput,
    RiskLevel,
    OperationParameter,
)
from ai.utils.llm_validator import (
    LLMOutputValidator,
    LLMOutputValidationError,
    validate_llm_output,
    safe_validate_llm_output,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def validator():
    """Create a validator instance."""
    return LLMOutputValidator()


@pytest.fixture
def valid_intent_json():
    """Valid intent output JSON."""
    return json.dumps({
        "intent_type": "query",
        "confidence": 0.95,
        "entities": {"product": "hearing_aid"},
        "clarification_needed": False,
    })


@pytest.fixture
def valid_operation_json():
    """Valid operation output JSON."""
    return json.dumps({
        "operation_id": "op_123",
        "tool_id": "feature_flag_toggle",
        "description": "Toggle feature flag",
        "parameters": [
            {"name": "flag_name", "value": "new_feature", "source": "user"}
        ],
        "risk_level": "low",
    })


@pytest.fixture
def valid_action_plan_json():
    """Valid action plan output JSON."""
    return json.dumps({
        "plan_id": "plan_123",
        "description": "Enable new feature",
        "operations": [
            {
                "operation_id": "op_1",
                "tool_id": "feature_flag_toggle",
                "description": "Toggle flag",
                "parameters": [],
                "risk_level": "low",
            }
        ],
        "overall_risk_level": "low",
    })


# =============================================================================
# Intent Output Tests
# =============================================================================

class TestIntentOutput:
    """Tests for IntentOutput validation."""
    
    def test_valid_intent(self, validator, valid_intent_json):
        """Valid intent output is accepted."""
        result = validator.validate_intent(valid_intent_json)
        
        assert result.intent_type == IntentType.QUERY
        assert result.confidence == 0.95
        assert result.entities["product"] == "hearing_aid"
    
    def test_invalid_intent_type(self, validator):
        """Invalid intent type is rejected."""
        invalid_json = json.dumps({
            "intent_type": "invalid_type",
            "confidence": 0.5,
        })
        
        with pytest.raises(LLMOutputValidationError) as exc_info:
            validator.validate_intent(invalid_json)
        
        assert len(exc_info.value.errors) > 0
    
    def test_confidence_out_of_range(self, validator):
        """Confidence outside 0-1 range is rejected."""
        invalid_json = json.dumps({
            "intent_type": "query",
            "confidence": 1.5,  # Invalid
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_intent(invalid_json)
    
    def test_confidence_level_property(self):
        """Confidence level is calculated correctly."""
        high = IntentOutput(intent_type=IntentType.QUERY, confidence=0.9)
        medium = IntentOutput(intent_type=IntentType.QUERY, confidence=0.6)
        low = IntentOutput(intent_type=IntentType.QUERY, confidence=0.3)
        
        assert high.confidence_level.value == "high"
        assert medium.confidence_level.value == "medium"
        assert low.confidence_level.value == "low"
    
    def test_entities_with_suspicious_patterns(self, validator):
        """Entities with suspicious patterns are rejected."""
        invalid_json = json.dumps({
            "intent_type": "query",
            "confidence": 0.5,
            "entities": {"script": "<script>alert('xss')</script>"},
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_intent(invalid_json)


# =============================================================================
# Operation Output Tests
# =============================================================================

class TestOperationOutput:
    """Tests for OperationOutput validation."""
    
    def test_valid_operation(self, validator, valid_operation_json):
        """Valid operation output is accepted."""
        result = validator.validate_operation(valid_operation_json)
        
        assert result.operation_id == "op_123"
        assert result.tool_id == "feature_flag_toggle"
        assert result.risk_level == RiskLevel.LOW
    
    def test_invalid_tool_id_format(self, validator):
        """Invalid tool_id format is rejected."""
        invalid_json = json.dumps({
            "operation_id": "op_123",
            "tool_id": "Invalid-Tool-ID",  # Invalid format
            "description": "Test",
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_operation(invalid_json)
    
    def test_invalid_operation_id_format(self, validator):
        """Invalid operation_id format is rejected."""
        invalid_json = json.dumps({
            "operation_id": "op 123 invalid",  # Invalid format
            "tool_id": "valid_tool",
            "description": "Test",
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_operation(invalid_json)


# =============================================================================
# Action Plan Output Tests
# =============================================================================

class TestActionPlanOutput:
    """Tests for ActionPlanOutput validation."""
    
    def test_valid_action_plan(self, validator, valid_action_plan_json):
        """Valid action plan output is accepted."""
        result = validator.validate_action_plan(valid_action_plan_json)
        
        assert result.plan_id == "plan_123"
        assert len(result.operations) == 1
        assert result.overall_risk_level == RiskLevel.LOW
    
    def test_empty_operations_rejected(self, validator):
        """Action plan with no operations is rejected."""
        invalid_json = json.dumps({
            "plan_id": "plan_123",
            "description": "Empty plan",
            "operations": [],  # Empty
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_action_plan(invalid_json)
    
    def test_risk_level_auto_calculated(self, validator):
        """Overall risk level is auto-calculated from operations."""
        plan_json = json.dumps({
            "plan_id": "plan_123",
            "description": "High risk plan",
            "operations": [
                {
                    "operation_id": "op_1",
                    "tool_id": "low_risk_tool",
                    "description": "Low risk",
                    "risk_level": "low",
                },
                {
                    "operation_id": "op_2",
                    "tool_id": "high_risk_tool",
                    "description": "High risk",
                    "risk_level": "high",
                },
            ],
            "overall_risk_level": "low",  # Will be upgraded
        })
        
        result = validator.validate_action_plan(plan_json)
        
        # Should be upgraded to high
        assert result.overall_risk_level == RiskLevel.HIGH
        assert result.requires_approval is True
    
    def test_high_risk_requires_approval(self, validator):
        """High risk plans require approval."""
        plan_json = json.dumps({
            "plan_id": "plan_123",
            "description": "Critical plan",
            "operations": [
                {
                    "operation_id": "op_1",
                    "tool_id": "critical_tool",
                    "description": "Critical",
                    "risk_level": "critical",
                },
            ],
            "overall_risk_level": "critical",
        })
        
        result = validator.validate_action_plan(plan_json)
        
        assert result.requires_approval is True


# =============================================================================
# Chat Response Output Tests
# =============================================================================

class TestChatResponseOutput:
    """Tests for ChatResponseOutput validation."""
    
    def test_valid_chat_response(self, validator):
        """Valid chat response is accepted."""
        response_json = json.dumps({
            "message": "Hello! How can I help you today?",
            "suggestions": ["Check order status", "Schedule appointment"],
        })
        
        result = validator.validate_chat_response(response_json)
        
        assert "Hello" in result.message
        assert len(result.suggestions) == 2
    
    def test_message_with_script_rejected(self, validator):
        """Message with script tags is rejected."""
        invalid_json = json.dumps({
            "message": "Hello <script>alert('xss')</script>",
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_chat_response(invalid_json)
    
    def test_message_with_javascript_rejected(self, validator):
        """Message with javascript: is rejected."""
        invalid_json = json.dumps({
            "message": "Click here: javascript:alert('xss')",
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_chat_response(invalid_json)


# =============================================================================
# PII Detection Tests
# =============================================================================

class TestPIIDetection:
    """Tests for PII detection in LLM outputs."""
    
    def test_pii_detected_in_message(self, validator):
        """PII in message is detected."""
        response_json = json.dumps({
            "message": "Your TC Kimlik is 12345678901",
        })
        
        result = validator.safe_validate(response_json, ChatResponseOutput, check_pii=True)
        
        assert result.valid is True
        assert result.pii_detected is True
        assert "tc_kimlik" in result.pii_types
    
    def test_pii_detected_in_entities(self, validator):
        """PII in entities is detected."""
        intent_json = json.dumps({
            "intent_type": "query",
            "confidence": 0.9,
            "entities": {"phone": "+90 532 123 4567"},
        })
        
        result = validator.safe_validate(intent_json, IntentOutput, check_pii=True)
        
        assert result.valid is True
        assert result.pii_detected is True
        assert "phone" in result.pii_types
    
    def test_no_pii_when_clean(self, validator):
        """No PII detected in clean output."""
        response_json = json.dumps({
            "message": "Your order has been shipped.",
        })
        
        result = validator.safe_validate(response_json, ChatResponseOutput, check_pii=True)
        
        assert result.valid is True
        assert result.pii_detected is False


# =============================================================================
# JSON Parsing Tests
# =============================================================================

class TestJSONParsing:
    """Tests for JSON parsing."""
    
    def test_invalid_json_rejected(self, validator):
        """Invalid JSON is rejected."""
        invalid_json = "not valid json {"
        
        with pytest.raises(LLMOutputValidationError) as exc_info:
            validator.validate_intent(invalid_json)
        
        assert "Invalid JSON" in exc_info.value.errors[0]
    
    def test_missing_required_field(self, validator):
        """Missing required field is rejected."""
        incomplete_json = json.dumps({
            "intent_type": "query",
            # Missing confidence
        })
        
        with pytest.raises(LLMOutputValidationError):
            validator.validate_intent(incomplete_json)


# =============================================================================
# Safe Validate Tests
# =============================================================================

class TestSafeValidate:
    """Tests for safe_validate method."""
    
    def test_safe_validate_valid(self, validator, valid_intent_json):
        """safe_validate returns success for valid output."""
        result = validator.safe_validate(valid_intent_json, IntentOutput)
        
        assert result.valid is True
        assert result.output_type == "IntentOutput"
        assert len(result.errors) == 0
    
    def test_safe_validate_invalid(self, validator):
        """safe_validate returns errors for invalid output."""
        invalid_json = json.dumps({
            "intent_type": "invalid",
            "confidence": 2.0,
        })
        
        result = validator.safe_validate(invalid_json, IntentOutput)
        
        assert result.valid is False
        assert len(result.errors) > 0
    
    def test_safe_validate_invalid_json(self, validator):
        """safe_validate handles invalid JSON."""
        result = validator.safe_validate("not json", IntentOutput)
        
        assert result.valid is False
        assert "Invalid JSON" in result.errors[0]


# =============================================================================
# Convenience Function Tests
# =============================================================================

class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def test_validate_llm_output(self, valid_intent_json):
        """validate_llm_output works correctly."""
        result = validate_llm_output(valid_intent_json, IntentOutput)
        
        assert result.intent_type == IntentType.QUERY
    
    def test_safe_validate_llm_output(self, valid_intent_json):
        """safe_validate_llm_output works correctly."""
        result = safe_validate_llm_output(valid_intent_json, IntentOutput)
        
        assert result.valid is True


# =============================================================================
# Property-Based Tests
# =============================================================================

class TestValidationProperties:
    """Property-based tests for validation."""
    
    @given(
        intent_type=st.sampled_from(["query", "action", "clarification", "confirmation", "cancellation", "unknown"]),
        confidence=st.floats(min_value=0.0, max_value=1.0),
    )
    @settings(max_examples=50)
    def test_valid_intent_always_accepted(self, intent_type: str, confidence: float):
        """
        Property: Valid intent outputs are always accepted.
        """
        intent_json = json.dumps({
            "intent_type": intent_type,
            "confidence": confidence,
        })
        
        result = safe_validate_llm_output(intent_json, IntentOutput)
        assert result.valid is True
    
    @given(confidence=st.floats(min_value=1.01, max_value=100.0))
    @settings(max_examples=20)
    def test_invalid_confidence_rejected(self, confidence: float):
        """
        Property: Confidence > 1.0 is always rejected.
        """
        intent_json = json.dumps({
            "intent_type": "query",
            "confidence": confidence,
        })
        
        result = safe_validate_llm_output(intent_json, IntentOutput)
        assert result.valid is False
    
    @given(
        tool_id=st.text(min_size=1, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyz_"),
    )
    @settings(max_examples=50)
    def test_valid_tool_id_accepted(self, tool_id: str):
        """
        Property: Valid tool_id format is accepted.
        """
        # Ensure starts with letter
        if not tool_id[0].isalpha():
            tool_id = "a" + tool_id
        
        operation_json = json.dumps({
            "operation_id": "op_1",
            "tool_id": tool_id,
            "description": "Test",
        })
        
        result = safe_validate_llm_output(operation_json, OperationOutput)
        assert result.valid is True
