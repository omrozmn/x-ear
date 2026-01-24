import sys
import os
import pytest
import asyncio
from unittest.mock import MagicMock, patch

# Add apps/backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "apps/backend"))

from ai.agents.intent_refiner import IntentRefiner, IntentRefinerResult, RefinerStatus
from ai.schemas.llm_outputs import IntentType, ConfidenceLevel
from ai.config import AIConfig, AIPhase
from ai.capability_registry import get_allowed_tool_names

@pytest.fixture
def intent_refiner():
    return IntentRefiner()

@pytest.mark.asyncio
class TestIntentAccuracy:
    """Test Suite for Goal 2: Intent -> Operator Accuracy."""
    
    async def test_positive_match_patient_creation(self, intent_refiner):
        # We test the rule-based fallback first to ensure deterministic behavior in CI
        # Or mock the model client for LLM testing
        message = "Yeni hasta oluştur: Ahmet Yılmaz, 05321112233"
        result = await intent_refiner.refine_intent(message, "tenant1", "user1")
        
        assert result.status == RefinerStatus.SUCCESS
        assert result.intent.intent_type == IntentType.ACTION
        assert result.intent.entities["first_name"] == "Ahmet"
        assert result.intent.entities["phone"] == "05321112233"

    async def test_slot_filling_trigger(self, intent_refiner):
        message = "Hasta kaydı yapmak istiyorum"
        result = await intent_refiner.refine_intent(message, "tenant1", "user1")
        
        # Should ask for missing info (first_name, phone)
        assert result.intent.clarification_needed is True
        assert "ad" in result.intent.clarification_question.lower()

    async def test_cancellation_intent(self, intent_refiner):
        message = "vazgeçtim kalsın"
        result = await intent_refiner.refine_intent(message, "tenant1", "user1")
        assert result.intent.intent_type == IntentType.CANCEL

class TestSecurityRBAC:
    """Test Suite for Goal 3: Security & RBAC."""

    def test_phase_a_read_only_enforcement(self):
        # Override config for test
        with patch.dict(os.environ, {"AI_PHASE": "A"}):
            AIConfig.reset()
            config = AIConfig.get()
            assert config.phase == AIPhase.A
            
            # Check allowed tools in Phase A
            # Only .view and .read permissions should allow tools
            allowed_tools = get_allowed_tool_names(["parties.view", "parties.create"], "A")
            
            # createParty uses parties.create, so it should NOT be in allowed_tools for Phase A
            assert "createParty" not in allowed_tools
            assert "getPartyById" in allowed_tools

    def test_rbac_permission_filtering(self):
        # User with ONLY view permissions
        allowed = get_allowed_tool_names(["parties.view"], "C")
        assert "getPartyById" in allowed
        assert "createParty" not in allowed
        
        # User with admin permissions
        allowed_admin = get_allowed_tool_names(["parties.create", "parties.view"], "C")
        assert "createParty" in allowed_admin

if __name__ == "__main__":
    # If run directly, run pytest
    import pytest
    sys.exit(pytest.main([__file__]))
