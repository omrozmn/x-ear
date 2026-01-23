"""
Integration Tests for AI Capabilities Feature

Tests the complete capability disclosure flow from intent detection
through filtering to response generation.
"""

import pytest
from unittest.mock import Mock, patch

from ai.agents.intent_refiner import IntentRefiner
from ai.schemas.llm_outputs import IntentType
from ai.capability_registry import (
    get_all_capabilities,
    filter_capabilities_by_permissions,
    filter_capabilities_by_phase,
)
from ai.api.capabilities import _format_capabilities_for_chat


def test_capability_inquiry_detection():
    """Test that capability inquiry is correctly detected."""
    refiner = IntentRefiner()
    
    # Test various capability inquiry phrases
    test_phrases = [
        "what can you do?",
        "help me",
        "show me your capabilities",
        "ne yapabilirsin?",
        "yardım",
    ]
    
    for phrase in test_phrases:
        intent = refiner.classify_without_llm(phrase)
        assert intent.intent_type == IntentType.CAPABILITY_INQUIRY, \
            f"Failed to detect capability inquiry for: {phrase}"


def test_permission_filtering():
    """Test that capabilities are correctly filtered by permissions."""
    all_capabilities = get_all_capabilities()
    
    # User with only view permissions
    view_only_permissions = ["parties.view", "sales.view", "devices.view"]
    filtered = filter_capabilities_by_permissions(all_capabilities, view_only_permissions)
    
    # All filtered capabilities should only require view permissions
    for cap in filtered:
        for perm in cap.required_permissions:
            assert perm in view_only_permissions, \
                f"Capability {cap.name} requires {perm} which user doesn't have"


def test_phase_filtering():
    """Test that capabilities are correctly filtered by AI phase."""
    all_capabilities = get_all_capabilities()
    
    # Phase A (read-only) should only show view operations
    phase_a_filtered = filter_capabilities_by_phase(all_capabilities, "A")
    
    for cap in phase_a_filtered:
        for perm in cap.required_permissions:
            assert perm.endswith(".view") or perm.endswith(".read"), \
                f"Phase A should only include read operations, but {cap.name} has {perm}"
    
    # Phase B and C should show all capabilities
    phase_b_filtered = filter_capabilities_by_phase(all_capabilities, "B")
    phase_c_filtered = filter_capabilities_by_phase(all_capabilities, "C")
    
    assert len(phase_b_filtered) == len(all_capabilities)
    assert len(phase_c_filtered) == len(all_capabilities)


def test_capability_formatting():
    """Test that capabilities are correctly formatted for chat."""
    all_capabilities = get_all_capabilities()
    
    # Get a subset of capabilities
    test_capabilities = all_capabilities[:3]
    
    # Format for chat
    formatted = _format_capabilities_for_chat(test_capabilities)
    
    # Should contain category headers
    assert "**" in formatted, "Should contain category headers"
    
    # Should contain capability names
    for cap in test_capabilities:
        assert cap.name in formatted, f"Should contain capability name: {cap.name}"
    
    # Should contain disclaimer
    assert "AI" in formatted or "api" in formatted.lower(), \
        "Should contain disclaimer about AI operations"


def test_empty_capabilities_handling():
    """Test handling of empty capabilities list."""
    formatted = _format_capabilities_for_chat([])
    
    # Should return a helpful message
    assert "kullanabileceğiniz" in formatted.lower() or "yönetici" in formatted.lower(), \
        "Should provide helpful message when no capabilities available"


def test_full_capability_flow_with_permissions():
    """Test the complete flow with different permission sets."""
    refiner = IntentRefiner()
    
    # Step 1: Detect capability inquiry
    intent = refiner.classify_without_llm("what can you do?")
    assert intent.intent_type == IntentType.CAPABILITY_INQUIRY
    
    # Step 2: Load capabilities
    all_capabilities = get_all_capabilities()
    
    # Test with different permission sets
    permission_sets = [
        ["parties.view"],  # Only party viewing
        ["parties.view", "parties.create"],  # Party viewing and creation
        ["sales.view", "devices.view"],  # Sales and devices viewing
        [],  # No permissions
    ]
    
    for permissions in permission_sets:
        # Filter by permissions
        filtered = filter_capabilities_by_permissions(all_capabilities, permissions)
        
        # Verify all returned capabilities are accessible
        for cap in filtered:
            for perm in cap.required_permissions:
                assert perm in permissions, \
                    f"Capability {cap.name} should not be accessible with permissions {permissions}"


def test_capability_categories():
    """Test that capabilities are properly categorized."""
    all_capabilities = get_all_capabilities()
    
    # Check that we have multiple categories
    categories = set(cap.category for cap in all_capabilities)
    assert len(categories) > 1, "Should have multiple capability categories"
    
    # Check expected categories exist
    expected_categories = [
        "Party Management",
        "Sales Operations",
        "Device Management",
        "Appointments",
        "Reporting",
    ]
    
    for expected in expected_categories:
        assert expected in categories, f"Should have category: {expected}"


def test_capability_schema_validation():
    """Test that all capabilities have valid schemas."""
    all_capabilities = get_all_capabilities()
    
    for cap in all_capabilities:
        # Check required fields
        assert cap.name, "Capability must have a name"
        assert cap.description, "Capability must have a description"
        assert cap.category, "Capability must have a category"
        assert cap.example_phrases, "Capability must have example phrases"
        assert cap.required_permissions, "Capability must have required permissions"
        assert cap.tool_operations, "Capability must have tool operations"
        
        # Check field types
        assert isinstance(cap.example_phrases, list)
        assert isinstance(cap.required_permissions, list)
        assert isinstance(cap.tool_operations, list)
        assert isinstance(cap.limitations, list)
        
        # Check non-empty lists
        assert len(cap.example_phrases) > 0, f"{cap.name} must have at least one example phrase"
        assert len(cap.required_permissions) > 0, f"{cap.name} must have at least one permission"
        assert len(cap.tool_operations) > 0, f"{cap.name} must have at least one tool operation"


@pytest.mark.asyncio
async def test_chat_endpoint_capability_inquiry():
    """Test capability inquiry through the chat endpoint."""
    from ai.api.chat import chat, ChatRequest
    from unittest.mock import AsyncMock, Mock
    
    # Mock user context
    user_context = {
        "user_id": "test_user",
        "tenant_id": "test_tenant",
        "permissions": ["parties.view", "sales.view"],
    }
    
    # Create request
    request = ChatRequest(
        prompt="what can you do?",
        session_id="test_session",
    )
    
    # Mock dependencies to avoid database/external calls
    with patch("ai.api.chat.get_kill_switch") as mock_kill_switch, \
         patch("ai.api.chat.check_rate_limit"), \
         patch("ai.api.chat.get_usage_tracker") as mock_usage_tracker, \
         patch("ai.api.chat.get_conversation_memory") as mock_memory, \
         patch("ai.api.chat.get_request_logger") as mock_request_logger:
        
        # Setup mocks
        mock_kill_switch.return_value.require_not_blocked = Mock()
        mock_usage_tracker.return_value.acquire_quota = Mock()
        
        mock_memory_instance = Mock()
        mock_memory_instance.get_history.return_value = []
        mock_memory_instance.add_turn = Mock()
        mock_memory.return_value = mock_memory_instance
        
        # Mock request logger
        mock_logger = Mock()
        mock_request = Mock()
        mock_request.id = "test-request-id"
        mock_logger.log_request.return_value = mock_request
        mock_logger.update_request_status = Mock()
        mock_request_logger.return_value = mock_logger
        
        # Call endpoint
        response = await chat(request, user_context)
        
        # Verify response
        assert response.status == "success"
        assert response.intent is not None
        assert response.intent.intent_type == "capability_inquiry"
        assert response.response is not None
        assert len(response.response) > 0
        
        # Verify conversation was stored
        assert mock_memory_instance.add_turn.called


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
