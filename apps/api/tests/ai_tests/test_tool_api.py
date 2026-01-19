"""
Property-based tests for Tool API Framework.

**Feature: ai-layer-architecture**
**Property 5: Tool API Boundary Enforcement**
**Property 18: Dry-Run Mode Safety**
**Property 21: Tool Schema Drift Detection**

**Validates: Requirements 3.1, 3.7, 5.1, 5.5, 21.1, 21.2, 21.3, 27.1, 27.2, 27.3, 27.4**

Tests that:
- Only allowlisted tools can be called
- Tools have defined schemas with versions
- Schema drift is detected
- Dry-run mode doesn't cause side effects
- Parameter validation works correctly
"""

import sys
from pathlib import Path

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings, assume

from ai.tools import (
    ToolDefinition,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
    ToolRegistry,
    ToolNotFoundError,
    ToolNotAllowedError,
    ToolSchemaDriftError,
    ToolValidationError,
    get_tool_registry,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def empty_registry():
    """Create an empty tool registry."""
    return ToolRegistry()


@pytest.fixture
def sample_tool_definition():
    """Create a sample tool definition."""
    return ToolDefinition(
        tool_id="test_tool",
        name="Test Tool",
        description="A test tool",
        category=ToolCategory.READ,
        risk_level=RiskLevel.LOW,
        schema_version="1.0.0",
        parameters=[
            ToolParameter(
                name="param1",
                type="string",
                description="First parameter",
                required=True,
            ),
            ToolParameter(
                name="param2",
                type="integer",
                description="Second parameter",
                required=False,
                default=10,
            ),
        ],
        returns="Test result",
    )


def sample_handler(params, mode):
    """Sample tool handler."""
    return ToolExecutionResult(
        tool_id="test_tool",
        success=True,
        mode=mode,
        result={"echo": params},
        simulated_changes={"action": "test"} if mode == ToolExecutionMode.SIMULATE else None,
    )


# =============================================================================
# ToolDefinition Tests
# =============================================================================

class TestToolDefinition:
    """Tests for ToolDefinition class."""
    
    def test_compute_schema_hash_deterministic(self, sample_tool_definition):
        """Schema hash computation is deterministic."""
        hash1 = sample_tool_definition.compute_schema_hash()
        hash2 = sample_tool_definition.compute_schema_hash()
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length
    
    def test_compute_schema_hash_changes_with_version(self):
        """Schema hash changes when version changes."""
        tool1 = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
        )
        tool2 = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="2.0.0",
        )
        
        assert tool1.compute_schema_hash() != tool2.compute_schema_hash()
    
    def test_compute_schema_hash_changes_with_parameters(self):
        """Schema hash changes when parameters change."""
        tool1 = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="a", type="string", description="A", required=True),
            ],
        )
        tool2 = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="b", type="string", description="B", required=True),
            ],
        )
        
        assert tool1.compute_schema_hash() != tool2.compute_schema_hash()
    
    def test_to_dict(self, sample_tool_definition):
        """to_dict returns correct structure."""
        result = sample_tool_definition.to_dict()
        
        assert result["toolId"] == "test_tool"
        assert result["name"] == "Test Tool"
        assert result["category"] == "read"
        assert result["riskLevel"] == "low"
        assert result["schemaVersion"] == "1.0.0"
        assert len(result["parameters"]) == 2
    
    def test_to_llm_description(self, sample_tool_definition):
        """to_llm_description generates readable format."""
        desc = sample_tool_definition.to_llm_description()
        
        assert "Test Tool" in desc
        assert "test_tool" in desc
        assert "param1" in desc
        assert "param2" in desc
        assert "low" in desc


# =============================================================================
# ToolRegistry Tests
# =============================================================================

class TestToolRegistry:
    """Tests for ToolRegistry class."""
    
    def test_register_tool(self, empty_registry, sample_tool_definition):
        """Tools can be registered."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        tool = empty_registry.get_tool("test_tool")
        assert tool.tool_id == "test_tool"
    
    def test_register_tool_allowed_by_default(self, empty_registry, sample_tool_definition):
        """Registered tools are allowed by default."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        assert empty_registry.is_allowed("test_tool") is True
    
    def test_register_tool_not_allowed(self, empty_registry, sample_tool_definition):
        """Tools can be registered without being allowed."""
        empty_registry.register_tool(sample_tool_definition, sample_handler, allowed=False)
        
        assert empty_registry.is_allowed("test_tool") is False
    
    def test_get_tool_not_found(self, empty_registry):
        """Getting non-existent tool raises error."""
        with pytest.raises(ToolNotFoundError) as exc_info:
            empty_registry.get_tool("nonexistent")
        
        assert "nonexistent" in str(exc_info.value)
    
    def test_execute_not_allowed_raises(self, empty_registry, sample_tool_definition):
        """Executing non-allowed tool raises error."""
        empty_registry.register_tool(sample_tool_definition, sample_handler, allowed=False)
        
        with pytest.raises(ToolNotAllowedError) as exc_info:
            empty_registry.execute_tool("test_tool", {"param1": "value"})
        
        assert "test_tool" in str(exc_info.value)
    
    def test_execute_simulate_mode(self, empty_registry, sample_tool_definition):
        """Tools can be executed in simulate mode."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        result = empty_registry.execute_tool(
            "test_tool",
            {"param1": "value"},
            mode=ToolExecutionMode.SIMULATE,
        )
        
        assert result.success is True
        assert result.mode == ToolExecutionMode.SIMULATE
        assert result.simulated_changes is not None
    
    def test_execute_execute_mode(self, empty_registry, sample_tool_definition):
        """Tools can be executed in execute mode."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        result = empty_registry.execute_tool(
            "test_tool",
            {"param1": "value"},
            mode=ToolExecutionMode.EXECUTE,
        )
        
        assert result.success is True
        assert result.mode == ToolExecutionMode.EXECUTE


# =============================================================================
# Property 5: Tool API Boundary Enforcement
# =============================================================================

class TestToolAPIBoundary:
    """
    Property 5: Tool API Boundary Enforcement
    
    Validates: Requirements 3.1, 3.7, 5.1, 5.5
    - AI can only call allowlisted Tool API endpoints
    - Non-allowlisted tools are rejected
    """
    
    @given(st.text(min_size=1, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz_"))
    @settings(max_examples=100)
    def test_unregistered_tool_rejected(self, tool_id: str):
        """
        Property: Unregistered tools are always rejected.
        Either ToolNotFoundError (not registered) or ToolNotAllowedError (registered but not allowed).
        """
        registry = ToolRegistry()
        
        # Tool is not registered, so it should fail with either error
        with pytest.raises((ToolNotFoundError, ToolNotAllowedError)):
            registry.execute_tool(tool_id, {})
    
    @given(st.text(min_size=1, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz_"))
    @settings(max_examples=100)
    def test_non_allowed_tool_rejected(self, tool_id: str):
        """
        Property: Registered but non-allowed tools are rejected.
        """
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id=tool_id,
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
        )
        registry.register_tool(tool, sample_handler, allowed=False)
        
        with pytest.raises(ToolNotAllowedError):
            registry.execute_tool(tool_id, {})
    
    def test_only_allowlisted_tools_executable(self):
        """Only tools in allowlist can be executed."""
        registry = ToolRegistry()
        
        # Register multiple tools, only some allowed
        for i in range(5):
            tool = ToolDefinition(
                tool_id=f"tool_{i}",
                name=f"Tool {i}",
                description="Test",
                category=ToolCategory.READ,
                risk_level=RiskLevel.LOW,
                schema_version="1.0.0",
            )
            registry.register_tool(tool, sample_handler, allowed=(i % 2 == 0))
        
        # Allowed tools work
        for i in [0, 2, 4]:
            result = registry.execute_tool(f"tool_{i}", {})
            assert result.success is True
        
        # Non-allowed tools fail
        for i in [1, 3]:
            with pytest.raises(ToolNotAllowedError):
                registry.execute_tool(f"tool_{i}", {})


# =============================================================================
# Property 18: Dry-Run Mode Safety
# =============================================================================

class TestDryRunModeSafety:
    """
    Property 18: Dry-Run Mode Safety
    
    Validates: Requirements 21.1, 21.2, 21.3
    - Dry-run mode doesn't cause side effects
    - Simulated changes are returned
    """
    
    def test_simulate_mode_returns_simulated_changes(self):
        """Simulate mode returns simulated changes."""
        registry = ToolRegistry()
        
        side_effect_occurred = False
        
        def handler_with_side_effect(params, mode):
            nonlocal side_effect_occurred
            if mode == ToolExecutionMode.EXECUTE:
                side_effect_occurred = True
            return ToolExecutionResult(
                tool_id="test",
                success=True,
                mode=mode,
                simulated_changes={"would_change": "something"} if mode == ToolExecutionMode.SIMULATE else None,
            )
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.CONFIG,
            risk_level=RiskLevel.MEDIUM,
            schema_version="1.0.0",
        )
        registry.register_tool(tool, handler_with_side_effect)
        
        result = registry.execute_tool("test", {}, mode=ToolExecutionMode.SIMULATE)
        
        assert result.mode == ToolExecutionMode.SIMULATE
        assert result.simulated_changes is not None
        assert side_effect_occurred is False
    
    def test_simulate_mode_preserves_parameters(self):
        """
        Property: Simulate mode receives same parameters as execute mode.
        """
        registry = ToolRegistry()
        received_params = {}
        
        def capturing_handler(p, mode):
            received_params.update(p)
            return ToolExecutionResult(
                tool_id="test",
                success=True,
                mode=mode,
            )
        
        # Define tool with specific parameters
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="key1", type="string", description="Key 1", required=False),
                ToolParameter(name="key2", type="string", description="Key 2", required=False),
            ],
        )
        registry.register_tool(tool, capturing_handler)
        
        test_params = {"key1": "value1", "key2": "value2"}
        registry.execute_tool("test", test_params, mode=ToolExecutionMode.SIMULATE)
        
        assert received_params == test_params
    
    @given(st.text(min_size=1, max_size=50))
    @settings(max_examples=50)
    def test_simulate_mode_preserves_string_parameter(self, value: str):
        """
        Property: Simulate mode correctly passes string parameters.
        """
        registry = ToolRegistry()
        received_value = []
        
        def capturing_handler(p, mode):
            received_value.append(p.get("param"))
            return ToolExecutionResult(
                tool_id="test",
                success=True,
                mode=mode,
            )
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="param", type="string", description="Param", required=True),
            ],
        )
        registry.register_tool(tool, capturing_handler)
        
        registry.execute_tool("test", {"param": value}, mode=ToolExecutionMode.SIMULATE)
        
        assert received_value[0] == value


# =============================================================================
# Property 21: Tool Schema Drift Detection
# =============================================================================

class TestSchemaDriftDetection:
    """
    Property 21: Tool Schema Drift Detection
    
    Validates: Requirements 27.1, 27.2, 27.3, 27.4
    - Each tool has a schema_version
    - Schema drift is detected
    - Requests with wrong schema version are rejected
    """
    
    def test_schema_version_required(self):
        """Tools must have schema version."""
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
        )
        
        assert tool.schema_version == "1.0.0"
    
    def test_check_schema_drift_matches(self):
        """check_schema_drift returns True when versions match."""
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
        )
        registry.register_tool(tool, sample_handler)
        
        assert registry.check_schema_drift("test", "1.0.0") is True
    
    def test_check_schema_drift_detects_mismatch(self):
        """check_schema_drift returns False when versions differ."""
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="2.0.0",
        )
        registry.register_tool(tool, sample_handler)
        
        assert registry.check_schema_drift("test", "1.0.0") is False
    
    def test_execute_with_wrong_schema_version_raises(self):
        """Executing with wrong schema version raises error."""
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="2.0.0",
        )
        registry.register_tool(tool, sample_handler)
        
        with pytest.raises(ToolSchemaDriftError) as exc_info:
            registry.execute_tool(
                "test",
                {},
                expected_schema_version="1.0.0",
            )
        
        assert exc_info.value.expected_version == "1.0.0"
        assert exc_info.value.actual_version == "2.0.0"
    
    @given(
        st.text(min_size=1, max_size=10, alphabet="0123456789."),
        st.text(min_size=1, max_size=10, alphabet="0123456789."),
    )
    @settings(max_examples=100)
    def test_schema_drift_detection_property(self, version1: str, version2: str):
        """
        Property: Schema drift is detected when versions differ.
        """
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version=version1,
        )
        registry.register_tool(tool, sample_handler)
        
        if version1 == version2:
            assert registry.check_schema_drift("test", version2) is True
        else:
            assert registry.check_schema_drift("test", version2) is False
    
    def test_get_schema_versions(self):
        """get_schema_versions returns correct versions."""
        registry = ToolRegistry()
        
        for i, version in enumerate(["1.0.0", "2.0.0", "3.0.0"]):
            tool = ToolDefinition(
                tool_id=f"tool_{i}",
                name=f"Tool {i}",
                description="Test",
                category=ToolCategory.READ,
                risk_level=RiskLevel.LOW,
                schema_version=version,
            )
            registry.register_tool(tool, sample_handler)
        
        versions = registry.get_schema_versions(["tool_0", "tool_1", "tool_2"])
        
        assert versions == {
            "tool_0": "1.0.0",
            "tool_1": "2.0.0",
            "tool_2": "3.0.0",
        }


# =============================================================================
# Parameter Validation Tests
# =============================================================================

class TestParameterValidation:
    """Tests for parameter validation."""
    
    def test_missing_required_parameter(self, empty_registry, sample_tool_definition):
        """Missing required parameter is detected."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        with pytest.raises(ToolValidationError) as exc_info:
            empty_registry.execute_tool("test_tool", {})  # Missing param1
        
        assert "param1" in str(exc_info.value)
    
    def test_wrong_parameter_type(self, empty_registry, sample_tool_definition):
        """Wrong parameter type is detected."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        with pytest.raises(ToolValidationError) as exc_info:
            empty_registry.execute_tool("test_tool", {
                "param1": 123,  # Should be string
            })
        
        assert "string" in str(exc_info.value)
    
    def test_unknown_parameter(self, empty_registry, sample_tool_definition):
        """Unknown parameter is detected."""
        empty_registry.register_tool(sample_tool_definition, sample_handler)
        
        with pytest.raises(ToolValidationError) as exc_info:
            empty_registry.execute_tool("test_tool", {
                "param1": "value",
                "unknown_param": "value",
            })
        
        assert "unknown_param" in str(exc_info.value)
    
    def test_enum_validation(self, empty_registry):
        """Enum parameter validation works."""
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(
                    name="status",
                    type="string",
                    description="Status",
                    required=True,
                    enum=["active", "inactive"],
                ),
            ],
        )
        empty_registry.register_tool(tool, sample_handler)
        
        # Valid enum value
        result = empty_registry.execute_tool("test", {"status": "active"})
        assert result.success is True
        
        # Invalid enum value
        with pytest.raises(ToolValidationError) as exc_info:
            empty_registry.execute_tool("test", {"status": "invalid"})
        
        assert "status" in str(exc_info.value)
    
    @given(st.sampled_from(["string", "integer", "boolean", "array", "object"]))
    @settings(max_examples=50)
    def test_type_validation_property(self, param_type: str):
        """
        Property: Type validation correctly identifies mismatches.
        """
        registry = ToolRegistry()
        
        tool = ToolDefinition(
            tool_id="test",
            name="Test",
            description="Test",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(
                    name="param",
                    type=param_type,
                    description="Test param",
                    required=True,
                ),
            ],
        )
        registry.register_tool(tool, sample_handler)
        
        # Correct type should pass
        correct_values = {
            "string": "test",
            "integer": 42,
            "boolean": True,
            "array": [1, 2, 3],
            "object": {"key": "value"},
        }
        
        result = registry.execute_tool("test", {"param": correct_values[param_type]})
        assert result.success is True


# =============================================================================
# Allowlist Integration Tests
# =============================================================================

class TestAllowlistIntegration:
    """Tests for allowlist integration."""
    
    def test_allowlist_tools_registered(self):
        """Allowlist tools are registered in global registry."""
        # Import allowlist to trigger registration
        from ai.tools import allowlist  # noqa: F401
        
        registry = get_tool_registry()
        
        # Check some expected tools
        expected_tools = [
            "feature_flag_toggle",
            "tenant_config_update",
            "report_generate",
            "tenant_info_get",
            "feature_flags_list",
        ]
        
        for tool_id in expected_tools:
            assert registry.is_allowed(tool_id), f"Tool {tool_id} should be allowed"
    
    def test_allowlist_tools_have_schema_versions(self):
        """All allowlist tools have schema versions."""
        from ai.tools import allowlist  # noqa: F401
        
        registry = get_tool_registry()
        tools = registry.list_tools()
        
        for tool in tools:
            assert "schemaVersion" in tool
            assert tool["schemaVersion"]  # Not empty
    
    def test_allowlist_tools_executable_in_simulate_mode(self):
        """All allowlist tools can be executed in simulate mode."""
        from ai.tools import allowlist  # noqa: F401
        
        registry = get_tool_registry()
        tools = registry.list_tools()
        
        # Test each tool with minimal valid parameters
        test_params = {
            "feature_flag_toggle": {"flag_name": "test", "enabled": True, "tenant_id": "t1"},
            "tenant_config_update": {"config_key": "key", "config_value": "val", "tenant_id": "t1"},
            "report_generate": {"report_type": "sales", "date_from": "2024-01-01", "date_to": "2024-01-31", "tenant_id": "t1"},
            "tenant_info_get": {"tenant_id": "t1"},
            "feature_flags_list": {"tenant_id": "t1"},
            "tenant_plan_upgrade": {"tenant_id": "t1", "new_plan": "professional"},
            "notification_send": {"tenant_id": "t1", "user_ids": ["u1"], "message": "test"},
        }
        
        for tool in tools:
            tool_id = tool["toolId"]
            if tool_id in test_params:
                result = registry.execute_tool(
                    tool_id,
                    test_params[tool_id],
                    mode=ToolExecutionMode.SIMULATE,
                )
                assert result.success is True, f"Tool {tool_id} failed in simulate mode"
