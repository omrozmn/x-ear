import sys
import os
import pytest
import asyncio

# Add apps/backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "apps/backend"))

from ai.agents.intent_refiner import IntentRefiner, RefinerStatus
from ai.schemas.llm_outputs import IntentType

@pytest.fixture
def intent_refiner():
    return IntentRefiner()

@pytest.mark.asyncio
class TestUXSafety:
    """Test Suite for Goal 6: UX & Conversation Safety."""

    async def test_clarification_on_ambiguous_input(self, intent_refiner):
        # Input that is too short or ambiguous
        message = "ekle"
        result = await intent_refiner.refine_intent(message, "t1", "u1")
        
        assert result.status == RefinerStatus.SUCCESS or result.status == RefinerStatus.NEEDS_CLARIFICATION
        assert result.intent.clarification_needed is True

    async def test_cancellation_stability(self, intent_refiner):
        # Triggering a cancellation mid-thought (via keyword)
        message = "aslında vazgeçtim iptal et"
        result = await intent_refiner.refine_intent(message, "t1", "u1")
        
        assert result.intent.intent_type == IntentType.CANCEL
        assert "iptal" in result.intent.conversational_response.lower()

    async def test_capability_inquiry(self, intent_refiner):
        # "What can you do?"
        message = "neler yapabilirsin?"
        result = await intent_refiner.refine_intent(message, "t1", "u1")
        
        assert result.intent.intent_type == IntentType.CAPABILITY_INQUIRY
        assert result.intent.confidence > 0.8

if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__]))
