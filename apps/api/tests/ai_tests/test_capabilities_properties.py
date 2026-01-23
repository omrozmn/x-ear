"""
Property-Based Tests for AI Capabilities Endpoint

Tests Properties 22-27 from the design document.

Requirements:
- 5.2: Capability inquiry recognition
- 5.3: Capability grouping structure
- 5.4: Permission-based capability filtering
- 5.5: Capability schema completeness
- 5.6: Response envelope compliance
- 5.7: Phase-based capability filtering
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from typing import List, Dict

from ai.agents.intent_refiner import IntentRefiner
from ai.schemas.llm_outputs import IntentType
from ai.capability_registry import (
    Capability,
    get_all_capabilities,
    get_capabilities_by_category,
    filter_capabilities_by_permissions,
    filter_capabilities_by_phase,
)


# =============================================================================
# Property 22: Capability inquiry recognition
# Feature: ai-security-fixes, Property 22: Capability inquiry recognition
# =============================================================================

@given(
    inquiry_phrase=st.sampled_from([
        "what can you do",
        "help",
        "capabilities",
        "what do you do",
        "ne yapabilirsin",
        "yardım",
        "yetenekler",
        "neler yapabilirsin"
    ]),
    prefix=st.text(alphabet=st.characters(whitelist_categories=("L",)), max_size=20),
    suffix=st.text(alphabet=st.characters(whitelist_categories=("L",)), max_size=20),
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_22_capability_inquiry_recognition(inquiry_phrase, prefix, suffix):
    """
    Property 22: Capability inquiry recognition
    
    For any user message matching capability inquiry patterns, the Intent Refiner
    should classify the intent as "CAPABILITY_INQUIRY".
    
    Validates: Requirements 5.2
    """
    refiner = IntentRefiner()
    
    # Build message with capability inquiry phrase
    message = f"{prefix} {inquiry_phrase} {suffix}".strip()
    
    # Classify without LLM (fast, deterministic)
    intent = refiner.classify_without_llm(message)
    
    # Assert capability inquiry detected
    assert intent.intent_type == IntentType.CAPABILITY_INQUIRY, \
        f"Expected CAPABILITY_INQUIRY intent for message '{message}', got {intent.intent_type}"
    assert intent.confidence >= 0.6, \
        f"Expected high confidence for capability inquiry, got {intent.confidence}"


# =============================================================================
# Property 23: Capability grouping structure
# Feature: ai-security-fixes, Property 23: Capability grouping structure
# =============================================================================

@pytest.mark.property_test
def test_property_23_capability_grouping_structure():
    """
    Property 23: Capability grouping structure
    
    For any capability inquiry response, the returned capabilities should be
    grouped by category with consistent structure.
    
    Validates: Requirements 5.3
    """
    # Get capabilities grouped by category
    capabilities_by_category = get_capabilities_by_category()
    
    # Assert we have at least one category
    assert len(capabilities_by_category) > 0, \
        "Expected at least one capability category"
    
    # Assert each category has at least one capability
    for category, caps in capabilities_by_category.items():
        assert len(caps) > 0, \
            f"Category '{category}' should have at least one capability"
        
        # Assert all capabilities in category have the same category field
        for cap in caps:
            assert cap.category == category, \
                f"Capability '{cap.name}' has category '{cap.category}' but is in group '{category}'"


# =============================================================================
# Property 24: Permission-based capability filtering
# Feature: ai-security-fixes, Property 24: Permission-based capability filtering
# =============================================================================

@given(
    # Generate a subset of available permissions
    user_permissions=st.lists(
        st.sampled_from([
            "parties.view",
            "parties.create",
            "parties.edit",
            "sales.view",
            "sales.create",
            "devices.view",
            "devices.assign",
            "appointments.view",
            "appointments.create",
            "reports.view",
        ]),
        min_size=0,
        max_size=10,
        unique=True
    )
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_24_permission_based_filtering(user_permissions):
    """
    Property 24: Permission-based capability filtering
    
    For any user with a specific set of role permissions, the capabilities endpoint
    should return only capabilities where the user has all required permissions.
    
    Validates: Requirements 5.4
    """
    # Get all capabilities
    all_capabilities = get_all_capabilities()
    
    # Filter by user permissions
    filtered_capabilities = filter_capabilities_by_permissions(
        all_capabilities,
        user_permissions
    )
    
    # Assert all returned capabilities have permissions satisfied
    for cap in filtered_capabilities:
        for required_perm in cap.required_permissions:
            assert required_perm in user_permissions, \
                f"Capability '{cap.name}' requires permission '{required_perm}' " \
                f"but user only has {user_permissions}"
    
    # Assert no capability was incorrectly excluded
    for cap in all_capabilities:
        has_all_perms = all(perm in user_permissions for perm in cap.required_permissions)
        is_included = cap in filtered_capabilities
        
        if has_all_perms:
            assert is_included, \
                f"Capability '{cap.name}' should be included (user has all permissions)"
        else:
            assert not is_included, \
                f"Capability '{cap.name}' should be excluded (user missing permissions)"


# =============================================================================
# Property 25: Capability schema completeness
# Feature: ai-security-fixes, Property 25: Capability schema completeness
# =============================================================================

@pytest.mark.property_test
def test_property_25_capability_schema_completeness():
    """
    Property 25: Capability schema completeness
    
    For any capability returned by the endpoint, it should include all required
    fields: name, description, example phrases, required permissions, and limitations.
    
    Validates: Requirements 5.5
    """
    # Get all capabilities
    all_capabilities = get_all_capabilities()
    
    # Assert we have at least one capability
    assert len(all_capabilities) > 0, "Expected at least one capability"
    
    # Check each capability has all required fields
    for cap in all_capabilities:
        # Required string fields
        assert cap.name, f"Capability missing name"
        assert cap.description, f"Capability '{cap.name}' missing description"
        assert cap.category, f"Capability '{cap.name}' missing category"
        
        # Required list fields
        assert isinstance(cap.example_phrases, list), \
            f"Capability '{cap.name}' example_phrases should be a list"
        assert len(cap.example_phrases) > 0, \
            f"Capability '{cap.name}' should have at least one example phrase"
        
        assert isinstance(cap.required_permissions, list), \
            f"Capability '{cap.name}' required_permissions should be a list"
        assert len(cap.required_permissions) > 0, \
            f"Capability '{cap.name}' should have at least one required permission"
        
        assert isinstance(cap.tool_operations, list), \
            f"Capability '{cap.name}' tool_operations should be a list"
        assert len(cap.tool_operations) > 0, \
            f"Capability '{cap.name}' should have at least one tool operation"
        
        assert isinstance(cap.limitations, list), \
            f"Capability '{cap.name}' limitations should be a list"
        # Limitations can be empty, but should be a list


# =============================================================================
# Property 26: Response envelope compliance
# Feature: ai-security-fixes, Property 26: Response envelope compliance
# =============================================================================

@pytest.mark.property_test
def test_property_26_response_envelope_compliance():
    """
    Property 26: Response envelope compliance
    
    For any capabilities endpoint response, it should follow the ResponseEnvelope
    format with camelCase field names.
    
    Validates: Requirements 5.6
    """
    from ai.capability_registry import Capability
    
    # Create a sample capability
    cap = Capability(
        name="Test Capability",
        description="Test description",
        category="Test Category",
        example_phrases=["test phrase"],
        required_permissions=["test.view"],
        tool_operations=["testOperation"],
        limitations=["test limitation"]
    )
    
    # Serialize to dict with aliases (camelCase)
    cap_dict = cap.model_dump(by_alias=True)
    
    # Assert camelCase field names
    assert "name" in cap_dict, "Expected 'name' field"
    assert "description" in cap_dict, "Expected 'description' field"
    assert "category" in cap_dict, "Expected 'category' field"
    assert "examplePhrases" in cap_dict, "Expected 'examplePhrases' (camelCase)"
    assert "requiredPermissions" in cap_dict, "Expected 'requiredPermissions' (camelCase)"
    assert "toolOperations" in cap_dict, "Expected 'toolOperations' (camelCase)"
    assert "limitations" in cap_dict, "Expected 'limitations' field"
    
    # Assert snake_case fields are NOT present
    assert "example_phrases" not in cap_dict, "Should not have snake_case 'example_phrases'"
    assert "required_permissions" not in cap_dict, "Should not have snake_case 'required_permissions'"
    assert "tool_operations" not in cap_dict, "Should not have snake_case 'tool_operations'"


# =============================================================================
# Property 27: Phase-based capability filtering
# Feature: ai-security-fixes, Property 27: Phase-based capability filtering
# =============================================================================

@given(
    ai_phase=st.sampled_from(["A", "B", "C"])
)
@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@pytest.mark.property_test
def test_property_27_phase_based_filtering(ai_phase):
    """
    Property 27: Phase-based capability filtering
    
    For any AI_PHASE configuration value, when set to "A" (read-only), the
    capabilities list should contain only read operations; for phases "B" and "C",
    all capabilities should be included.
    
    Validates: Requirements 5.7
    """
    # Get all capabilities
    all_capabilities = get_all_capabilities()
    
    # Filter by phase
    filtered_capabilities = filter_capabilities_by_phase(
        all_capabilities,
        ai_phase
    )
    
    if ai_phase == "A":
        # Phase A: Only read operations
        for cap in filtered_capabilities:
            # All required permissions should be read-only
            for perm in cap.required_permissions:
                assert perm.endswith(".view") or perm.endswith(".read"), \
                    f"Phase A should only include read operations, but capability '{cap.name}' " \
                    f"has permission '{perm}'"
        
        # Assert write operations are excluded
        for cap in all_capabilities:
            has_write_perm = any(
                not (perm.endswith(".view") or perm.endswith(".read"))
                for perm in cap.required_permissions
            )
            is_included = cap in filtered_capabilities
            
            if has_write_perm:
                assert not is_included, \
                    f"Phase A should exclude write capability '{cap.name}'"
    
    else:
        # Phase B and C: All capabilities allowed
        assert len(filtered_capabilities) == len(all_capabilities), \
            f"Phase {ai_phase} should include all capabilities"


# =============================================================================
# Integration Test: Full Capability Flow
# =============================================================================

@pytest.mark.property_test
def test_full_capability_flow():
    """
    Integration test for the full capability disclosure flow.
    
    Tests the complete flow from capability inquiry detection to filtered response.
    """
    refiner = IntentRefiner()
    
    # Step 1: Detect capability inquiry
    message = "what can you do?"
    intent = refiner.classify_without_llm(message)
    assert intent.intent_type == IntentType.CAPABILITY_INQUIRY
    
    # Step 2: Load capabilities
    all_capabilities = get_all_capabilities()
    assert len(all_capabilities) > 0
    
    # Step 3: Filter by permissions (simulate user with limited permissions)
    user_permissions = ["parties.view", "sales.view"]
    filtered_by_perms = filter_capabilities_by_permissions(
        all_capabilities,
        user_permissions
    )
    
    # Step 4: Filter by phase (simulate Phase A - read-only)
    filtered_by_phase = filter_capabilities_by_phase(
        filtered_by_perms,
        "A"
    )
    
    # Step 5: Verify final result
    for cap in filtered_by_phase:
        # Should have permissions
        for perm in cap.required_permissions:
            assert perm in user_permissions
        
        # Should be read-only
        for perm in cap.required_permissions:
            assert perm.endswith(".view") or perm.endswith(".read")
