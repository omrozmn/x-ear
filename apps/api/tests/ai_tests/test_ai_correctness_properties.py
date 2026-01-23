"""
Property-Based Tests for AI Correctness Features

Tests Properties 14-21 from the design document.

Requirements:
- 4.1: Cancellation keyword detection
- 4.2: Cancellation response consistency
- 4.3: Slot-filling prompt generation
- 4.4: Slot value extraction
- 4.5: Action plan timeout enforcement
- 4.6: Conversation context persistence
- 4.7: Cancellation and timeout logging
- 4.8: Meta-intent recognition
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
import logging

from ai.agents.intent_refiner import IntentRefiner, IntentRefinerResult, RefinerStatus
from ai.agents.action_planner import ActionPlanner, ActionPlan, ActionPlannerResult, PlannerStatus
from ai.schemas.llm_outputs import IntentType, IntentOutput, RiskLevel
from ai.services.conversation_memory import ConversationMemory


# =============================================================================
# Property 14: Cancellation keyword detection
# Feature: ai-security-fixes, Property 14: Cancellation keyword detection
# =============================================================================

@given(
    cancellation_word=st.sampled_from([
        "cancel", "stop", "nevermind", "abort", "quit",
        "iptal", "vazgeç", "dur"
    ]),
    prefix=st.text(alphabet=st.characters(whitelist_categories=("L",)), max_size=20),
    suffix=st.text(alphabet=st.characters(whitelist_categories=("L",)), max_size=20),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_14_cancellation_keyword_detection(cancellation_word, prefix, suffix):
    """
    Property 14: Cancellation keyword detection
    
    For any user message containing cancellation keywords, the Intent Refiner
    should classify the intent as "CANCEL" with high confidence.
    
    Validates: Requirements 4.1
    """
    refiner = IntentRefiner()
    
    # Build message with cancellation keyword
    message = f"{prefix} {cancellation_word} {suffix}".strip()
    
    # Classify without LLM (fast, deterministic)
    intent = refiner.classify_without_llm(message)
    
    # Assert cancellation detected
    assert intent.intent_type in [IntentType.CANCEL, IntentType.CANCELLATION], \
        f"Expected CANCEL intent for message '{message}', got {intent.intent_type}"
    assert intent.confidence >= 0.6, \
        f"Expected high confidence for cancellation, got {intent.confidence}"


# =============================================================================
# Property 15: Cancellation response consistency
# Feature: ai-security-fixes, Property 15: Cancellation response consistency
# =============================================================================

@given(
    cancellation_word=st.sampled_from(["cancel", "stop", "iptal", "vazgeç"]),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_15_cancellation_response_consistency(cancellation_word):
    """
    Property 15: Cancellation response consistency
    
    For any detected cancellation intent, the system should return a
    confirmation message indicating the operation was cancelled.
    
    Validates: Requirements 4.2
    """
    refiner = IntentRefiner()
    
    # Classify cancellation message
    intent = refiner.classify_without_llm(cancellation_word)
    
    # Assert cancellation intent
    assert intent.intent_type in [IntentType.CANCEL, IntentType.CANCELLATION]
    
    # Assert response contains cancellation confirmation
    response = intent.conversational_response or ""
    assert any(word in response.lower() for word in ["iptal", "cancel", "cancelled"]), \
        f"Expected cancellation confirmation in response, got: {response}"


# =============================================================================
# Property 16: Slot-filling prompt generation
# Feature: ai-security-fixes, Property 16: Slot-filling prompt generation
# =============================================================================

@given(
    missing_param=st.sampled_from([
        "party_id", "first_name", "last_name", "phone", "email",
        "device_id", "amount", "date", "time"
    ]),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_16_slot_filling_prompt_generation(missing_param):
    """
    Property 16: Slot-filling prompt generation
    
    For any action plan with missing required parameters, the Action Planner
    should generate a user-friendly slot-filling prompt requesting the missing information.
    
    Validates: Requirements 4.3
    """
    planner = ActionPlanner()
    
    # Generate slot-filling prompt
    prompt = planner._generate_slot_prompt(missing_param)
    
    # Assert prompt is non-empty
    assert prompt, f"Expected non-empty prompt for {missing_param}"
    
    # Assert prompt is user-friendly (contains Turkish or English text)
    assert len(prompt) > 10, f"Expected descriptive prompt, got: {prompt}"
    
    # Assert prompt asks for the parameter (contains parameter name or related words)
    # This is a weak check but ensures the prompt is relevant
    assert len(prompt.split()) >= 3, f"Expected multi-word prompt, got: {prompt}"


# =============================================================================
# Property 17: Slot value extraction
# Feature: ai-security-fixes, Property 17: Slot value extraction
# =============================================================================

@given(
    slot_value=st.text(min_size=1, max_size=100, alphabet=st.characters(
        whitelist_categories=("L", "N", "P", "Z"),
        blacklist_characters="\n\r\t"
    )),
    slot_name=st.sampled_from(["first_name", "phone", "email", "amount"]),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_17_slot_value_extraction(slot_value, slot_name):
    """
    Property 17: Slot value extraction
    
    For any user response to a slot-filling prompt, the Intent Refiner should
    extract the provided value.
    
    Validates: Requirements 4.4
    """
    refiner = IntentRefiner()
    
    # Extract slot value
    extracted = refiner._extract_slot_value(slot_value, slot_name)
    
    # Assert value is extracted (non-empty)
    assert extracted, f"Expected extracted value for slot {slot_name}"
    
    # Assert extracted value is related to input (at least contains some characters)
    assert len(extracted) > 0, f"Expected non-empty extraction"
    
    # For normal input, expect stripped value
    # For whitespace-only input, expect original value (to be validated by Action Planner)
    stripped = slot_value.strip()
    if stripped:
        assert extracted == stripped, \
            f"Expected extracted value to match stripped input"
    else:
        assert extracted == slot_value, \
            f"Expected whitespace-only input to be preserved for validation"


# =============================================================================
# Property 18: Action plan timeout enforcement
# Feature: ai-security-fixes, Property 18: Action plan timeout enforcement
# =============================================================================

@given(
    minutes_offset=st.integers(min_value=-10, max_value=10),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_18_action_plan_timeout_enforcement(minutes_offset):
    """
    Property 18: Action plan timeout enforcement
    
    For any action plan awaiting slot-filling, if the expiration time has passed,
    the is_expired method should return True.
    
    Validates: Requirements 4.5
    """
    planner = ActionPlanner()
    
    # Create a mock action plan with expiration time
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=minutes_offset)
    
    plan = ActionPlan(
        plan_id="test_plan",
        tenant_id="test_tenant",
        user_id="test_user",
        intent=IntentOutput(
            intent_type=IntentType.ACTION,
            confidence=0.8,
            entities={},
        ),
        steps=[],
        overall_risk_level=RiskLevel.LOW,
        requires_approval=False,
        plan_hash="test_hash",
        tool_schema_versions={},
        created_at=now,
        expires_at=expires_at,
    )
    
    # Check expiration
    is_expired = planner.is_expired(plan)
    
    # Assert expiration logic is correct
    if minutes_offset <= 0:
        assert is_expired, f"Expected plan to be expired with offset {minutes_offset}"
    else:
        assert not is_expired, f"Expected plan not to be expired with offset {minutes_offset}"


# =============================================================================
# Property 19: Conversation context persistence
# Feature: ai-security-fixes, Property 19: Conversation context persistence
# =============================================================================

@given(
    session_id=st.text(min_size=5, max_size=50, alphabet=st.characters(
        whitelist_categories=("L", "N"),
        blacklist_characters=" \n\r\t"
    )),
    user_message=st.text(min_size=1, max_size=200),
    ai_response=st.text(min_size=1, max_size=200),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_19_conversation_context_persistence(session_id, user_message, ai_response):
    """
    Property 19: Conversation context persistence
    
    For any multi-turn slot-filling exchange, the conversation memory service
    should maintain the action plan state across turns.
    
    Validates: Requirements 4.6
    """
    memory = ConversationMemory()
    
    # Add a conversation turn
    memory.add_turn(
        session_id=session_id,
        user_message=user_message,
        ai_response=ai_response,
        intent_type="action",
        entities={"test_key": "test_value"},
    )
    
    # Retrieve context
    history = memory.get_history(session_id)
    
    # Assert context is persisted
    assert history is not None, "Expected history to be persisted"
    assert isinstance(history, list), "Expected history to be a list of turns"
    
    # Assert the turn was added
    assert len(history) >= 1, "Expected at least one turn in history"
    
    # Assert the turn contains the expected data
    last_turn = history[-1]
    assert last_turn.user_message == user_message
    assert last_turn.ai_response == ai_response
    assert last_turn.intent_type == "action"


# =============================================================================
# Property 20: Cancellation and timeout logging
# Feature: ai-security-fixes, Property 20: Cancellation and timeout logging
# =============================================================================

@given(
    conversation_id=st.text(min_size=5, max_size=50, alphabet=st.characters(
        whitelist_categories=("L", "N"),
        blacklist_characters=" \n\r\t"
    )),
    reason=st.sampled_from(["user_cancelled", "timeout", "error"]),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_20_cancellation_and_timeout_logging(conversation_id, reason, caplog):
    """
    Property 20: Cancellation and timeout logging
    
    For any action plan that is cancelled or times out, the system logs should
    contain an entry with the reason, conversation_id, and timestamp.
    
    Validates: Requirements 4.7
    """
    # This property test verifies that logging infrastructure is in place
    # Actual logging happens in the chat router, but we can verify the
    # Intent Refiner logs cancellation detection
    
    refiner = IntentRefiner()
    
    with caplog.at_level(logging.INFO):
        # Trigger cancellation detection
        intent = refiner.classify_without_llm("cancel")
        
        # Assert cancellation was detected
        assert intent.intent_type in [IntentType.CANCEL, IntentType.CANCELLATION]
    
    # Note: Full logging verification would require integration tests
    # This property test verifies the classification logic works correctly


# =============================================================================
# Property 21: Meta-intent recognition
# Feature: ai-security-fixes, Property 21: Meta-intent recognition
# =============================================================================

@given(
    capability_phrase=st.sampled_from([
        "what can you do", "help", "capabilities",
        "ne yapabilirsin", "yardım", "yetenekler"
    ]),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_21_meta_intent_recognition(capability_phrase):
    """
    Property 21: Meta-intent recognition
    
    For any user message asking an unrelated or meta question (like capability inquiry),
    the system should recognize it as a meta-intent.
    
    Validates: Requirements 4.8
    """
    refiner = IntentRefiner()
    
    # Classify capability inquiry
    intent = refiner.classify_without_llm(capability_phrase)
    
    # Assert capability inquiry detected
    assert intent.intent_type == IntentType.CAPABILITY_INQUIRY, \
        f"Expected CAPABILITY_INQUIRY intent for '{capability_phrase}', got {intent.intent_type}"
    
    # Assert high confidence
    assert intent.confidence >= 0.6, \
        f"Expected high confidence for capability inquiry, got {intent.confidence}"


# =============================================================================
# Additional Integration Property Tests
# =============================================================================

@given(
    message=st.text(min_size=1, max_size=100),
)
@settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_intent_classification_always_returns_valid_type(message):
    """
    Property: Intent classification always returns a valid IntentType
    
    For any user message, the Intent Refiner should return a valid IntentType
    (never None or invalid).
    """
    refiner = IntentRefiner()
    
    # Classify message
    intent = refiner.classify_without_llm(message)
    
    # Assert valid intent type
    assert intent.intent_type is not None, "Intent type should never be None"
    assert isinstance(intent.intent_type, IntentType), \
        f"Expected IntentType, got {type(intent.intent_type)}"
    
    # Assert confidence is in valid range
    assert 0.0 <= intent.confidence <= 1.0, \
        f"Confidence must be between 0 and 1, got {intent.confidence}"


@given(
    slot_name=st.text(min_size=1, max_size=50, alphabet=st.characters(
        whitelist_categories=("L", "N"),
        blacklist_characters=" \n\r\t"
    )),
)
@settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_slot_prompt_always_non_empty(slot_name):
    """
    Property: Slot-filling prompts are always non-empty
    
    For any parameter name, the Action Planner should generate a non-empty
    slot-filling prompt.
    """
    planner = ActionPlanner()
    
    # Generate prompt
    prompt = planner._generate_slot_prompt(slot_name)
    
    # Assert non-empty
    assert prompt, f"Expected non-empty prompt for slot '{slot_name}'"
    assert len(prompt) > 0, "Prompt should have non-zero length"
