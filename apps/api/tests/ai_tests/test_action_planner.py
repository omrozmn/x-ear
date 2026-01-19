"""
Tests for Action Planner Sub-Agent.

**Feature: ai-layer-architecture**
**Property: RBAC Permission Enforcement, Tenant Isolation**

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.4, 6.5, 27.2**

Tests that:
- Action Planner correctly maps intents to tools
- Risk levels are calculated correctly
- RBAC permissions are enforced
- Tenant isolation is maintained
- Tool schema versions are recorded
- Plan integrity can be verified
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
from unittest.mock import AsyncMock, MagicMock, patch
from hypothesis import given, strategies as st, settings

from ai.agents.action_planner import (
    ActionPlanner,
    ActionPlannerResult,
    ActionPlan,
    ActionStep,
    PlannerStatus,
    get_action_planner,
)
from ai.schemas.llm_outputs import IntentOutput, IntentType
from ai.tools import RiskLevel, ToolDefinition, ToolRegistry
from ai.runtime.model_client import ModelResponse
from ai.runtime.circuit_breaker import CircuitBreakerOpenError
from datetime import datetime, timezone


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_model_client():
    """Create a mock model client."""
    client = MagicMock()
    client.generate = AsyncMock()
    return client


@pytest.fixture
def mock_tool_registry():
    """Create a mock tool registry with test tools."""
    from ai.tools import ToolParameter, ToolCategory
    
    registry = ToolRegistry()
    
    # Register test tools
    def dummy_handler(params, mode):
        from ai.tools import ToolExecutionResult, ToolExecutionMode
        return ToolExecutionResult(
            tool_id="test",
            success=True,
            mode=mode,
            result={"status": "ok"},
        )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="test_read_tool",
            name="Test Read Tool",
            description="A read-only test tool",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="id", type="string", description="ID to read", required=True),
            ],
            requires_permissions=["read:data"],
        ),
        dummy_handler,
    )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="test_write_tool",
            name="Test Write Tool",
            description="A write test tool",
            category=ToolCategory.CONFIG,
            risk_level=RiskLevel.MEDIUM,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="data", type="object", description="Data to write", required=True),
            ],
            requires_permissions=["write:data"],
        ),
        dummy_handler,
    )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="test_admin_tool",
            name="Test Admin Tool",
            description="An admin test tool",
            category=ToolCategory.ADMIN,
            risk_level=RiskLevel.HIGH,
            schema_version="2.0.0",
            parameters=[
                ToolParameter(name="action", type="string", description="Action to perform", required=True),
            ],
            requires_permissions=["admin:system"],
            requires_approval=True,
        ),
        dummy_handler,
    )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="test_critical_tool",
            name="Test Critical Tool",
            description="A critical test tool",
            category=ToolCategory.ADMIN,
            risk_level=RiskLevel.CRITICAL,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="confirm", type="boolean", description="Confirmation", required=True),
            ],
            requires_permissions=["admin:critical"],
            requires_approval=True,
        ),
        dummy_handler,
    )
    
    return registry


@pytest.fixture
def planner(mock_model_client, mock_tool_registry):
    """Create an Action Planner with mocks."""
    return ActionPlanner(
        tool_registry=mock_tool_registry,
        model_client=mock_model_client,
    )


def create_model_response(content: str) -> ModelResponse:
    """Create a mock model response."""
    return ModelResponse(
        content=content,
        model="qwen2.5:7b-instruct",
        created_at=datetime.now(timezone.utc),
        total_duration_ms=100.0,
    )


def create_intent(
    intent_type: IntentType = IntentType.ACTION,
    confidence: float = 0.9,
    entities: dict = None,
) -> IntentOutput:
    """Create a test intent."""
    return IntentOutput(
        intent_type=intent_type,
        confidence=confidence,
        entities=entities or {},
        reasoning="Test intent",
    )


# =============================================================================
# Basic Planning Tests
# =============================================================================

class TestBasicPlanning:
    """Tests for basic action planning."""
    
    def test_query_intent_no_actions(self, planner):
        """Query intents don't generate actions."""
        import asyncio
        
        intent = create_intent(intent_type=IntentType.QUERY)
        
        result = asyncio.run(planner.create_plan(
            intent=intent,
            tenant_id="tenant_1",
            user_id="user_1",
            user_permissions={"read:data"},
        ))
        
        assert result.status == PlannerStatus.NO_ACTIONS_NEEDED
    
    def test_clarification_intent_no_actions(self, planner):
        """Clarification intents don't generate actions."""
        import asyncio
        
        intent = create_intent(intent_type=IntentType.CLARIFICATION)
        
        result = asyncio.run(planner.create_plan(
            intent=intent,
            tenant_id="tenant_1",
            user_id="user_1",
            user_permissions={"read:data"},
        ))
        
        assert result.status == PlannerStatus.NO_ACTIONS_NEEDED
    
    def test_action_intent_generates_plan(self, planner, mock_model_client):
        """Action intents generate action plans."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "User wants to read data",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert result.plan is not None
        assert result.plan.step_count == 1


# =============================================================================
# RBAC Permission Tests
# =============================================================================

class TestRBACEnforcement:
    """Tests for RBAC permission enforcement."""
    
    def test_permission_denied_without_required_permission(self, planner, mock_model_client):
        """Plan creation fails without required permissions."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_write_tool",
                        "parameters": {"data": {}},
                        "description": "Write data",
                    }
                ],
                "reasoning": "User wants to write data",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},  # Missing write:data
            ))
        
        assert result.status == PlannerStatus.PERMISSION_DENIED
        assert "write:data" in result.denied_permissions
    
    def test_permission_granted_with_required_permission(self, planner, mock_model_client):
        """Plan creation succeeds with required permissions."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_write_tool",
                        "parameters": {"data": {}},
                        "description": "Write data",
                    }
                ],
                "reasoning": "User wants to write data",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data", "write:data"},
            ))
        
        assert result.is_success
    
    def test_multiple_permissions_required(self, planner, mock_model_client):
        """Plan with multiple tools requires all permissions."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    },
                    {
                        "tool_name": "test_write_tool",
                        "parameters": {"data": {}},
                        "description": "Write data",
                    }
                ],
                "reasoning": "User wants to read and write data",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            # Only read permission
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.status == PlannerStatus.PERMISSION_DENIED
        assert "write:data" in result.denied_permissions


# =============================================================================
# Risk Level Tests
# =============================================================================

class TestRiskLevelCalculation:
    """Tests for risk level calculation."""
    
    def test_low_risk_no_approval(self, planner, mock_model_client):
        """Low risk actions don't require approval."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Low risk read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert result.plan.overall_risk_level == RiskLevel.LOW
        assert not result.plan.requires_approval
    
    def test_high_risk_requires_approval(self, planner, mock_model_client):
        """High risk actions require approval."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_admin_tool",
                        "parameters": {"action": "reset"},
                        "description": "Admin action",
                    }
                ],
                "reasoning": "High risk admin operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"admin:system"},
            ))
        
        assert result.is_success
        assert result.plan.overall_risk_level == RiskLevel.HIGH
        assert result.plan.requires_approval
    
    def test_overall_risk_is_max_of_steps(self, planner, mock_model_client):
        """Overall risk is the maximum of all step risks."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    },
                    {
                        "tool_name": "test_admin_tool",
                        "parameters": {"action": "check"},
                        "description": "Admin check",
                    }
                ],
                "reasoning": "Mixed risk operations",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data", "admin:system"},
            ))
        
        assert result.is_success
        assert result.plan.overall_risk_level == RiskLevel.HIGH


# =============================================================================
# Schema Version Tests
# =============================================================================

class TestSchemaVersionTracking:
    """Tests for tool schema version tracking."""
    
    def test_schema_versions_recorded(self, planner, mock_model_client):
        """Tool schema versions are recorded in plan."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert "test_read_tool" in result.plan.tool_schema_versions
        assert result.plan.tool_schema_versions["test_read_tool"] == "1.0.0"
    
    def test_step_has_schema_version(self, planner, mock_model_client):
        """Each step has its tool's schema version."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_admin_tool",
                        "parameters": {"action": "check"},
                        "description": "Admin check",
                    }
                ],
                "reasoning": "Admin operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"admin:system"},
            ))
        
        assert result.is_success
        assert result.plan.steps[0].tool_schema_version == "2.0.0"


# =============================================================================
# Plan Integrity Tests
# =============================================================================

class TestPlanIntegrity:
    """Tests for plan integrity verification."""
    
    def test_plan_hash_computed(self, planner, mock_model_client):
        """Plan hash is computed."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert result.plan.plan_hash is not None
        assert len(result.plan.plan_hash) == 16
    
    def test_plan_integrity_validation(self, planner, mock_model_client):
        """Plan integrity can be validated."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert planner.validate_plan_integrity(result.plan)
    
    def test_tampered_plan_detected(self, planner, mock_model_client):
        """Tampered plans are detected."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        # Tamper with the plan
        result.plan.steps[0].parameters["id"] = "456"
        
        assert not planner.validate_plan_integrity(result.plan)


# =============================================================================
# Schema Drift Detection Tests
# =============================================================================

class TestSchemaDriftDetection:
    """Tests for schema drift detection."""
    
    def test_no_drift_detected(self, planner, mock_model_client):
        """No drift when schemas match."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        drift_status = planner.check_schema_drift(result.plan)
        
        assert not drift_status["test_read_tool"]


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestErrorHandling:
    """Tests for error handling."""
    
    def test_circuit_breaker_open(self, planner):
        """Circuit breaker open is handled gracefully."""
        import asyncio
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        async def run_test():
            with patch.object(
                planner.circuit_breaker,
                'execute',
                new=AsyncMock(side_effect=CircuitBreakerOpenError("inference", 30.0))
            ):
                return await planner.create_plan(
                    intent=intent,
                    tenant_id="tenant_1",
                    user_id="user_1",
                    user_permissions={"read:data"},
                )
        
        result = asyncio.run(run_test())
        assert result.status == PlannerStatus.CIRCUIT_OPEN
    
    def test_model_error_handled(self, planner):
        """Model errors are handled gracefully."""
        import asyncio
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        async def run_test():
            with patch.object(
                planner.circuit_breaker,
                'execute',
                new=AsyncMock(side_effect=Exception("Model connection failed"))
            ):
                return await planner.create_plan(
                    intent=intent,
                    tenant_id="tenant_1",
                    user_id="user_1",
                    user_permissions={"read:data"},
                )
        
        result = asyncio.run(run_test())
        assert result.status == PlannerStatus.ERROR
    
    def test_invalid_json_response(self, planner, mock_model_client):
        """Invalid JSON response is handled."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            "This is not valid JSON"
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        async def run_test():
            with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
                return await planner.create_plan(
                    intent=intent,
                    tenant_id="tenant_1",
                    user_id="user_1",
                    user_permissions={"read:data"},
                )
        
        result = asyncio.run(run_test())
        assert result.status == PlannerStatus.ERROR


# =============================================================================
# Tenant Isolation Tests
# =============================================================================

class TestTenantIsolation:
    """Tests for tenant isolation."""
    
    def test_tenant_id_in_plan(self, planner, mock_model_client):
        """Plan includes tenant ID."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_123",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        assert result.is_success
        assert result.plan.tenant_id == "tenant_123"
    
    def test_validate_tenant_access_same_tenant(self, planner):
        """User can access their own tenant."""
        assert planner._validate_tenant_access("tenant_1", "tenant_1")
    
    def test_validate_tenant_access_different_tenant(self, planner):
        """User cannot access different tenant."""
        assert not planner._validate_tenant_access("tenant_1", "tenant_2")


# =============================================================================
# Serialization Tests
# =============================================================================

class TestSerialization:
    """Tests for result serialization."""
    
    def test_result_to_dict(self, planner, mock_model_client):
        """Result can be serialized to dict."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        result_dict = result.to_dict()
        
        assert "status" in result_dict
        assert "plan" in result_dict
        assert "processingTimeMs" in result_dict
    
    def test_plan_to_dict(self, planner, mock_model_client):
        """Plan can be serialized to dict."""
        import asyncio
        
        mock_model_client.generate.return_value = create_model_response(
            json.dumps({
                "actions": [
                    {
                        "tool_name": "test_read_tool",
                        "parameters": {"id": "123"},
                        "description": "Read data",
                    }
                ],
                "reasoning": "Read operation",
            })
        )
        
        intent = create_intent(intent_type=IntentType.ACTION)
        
        with patch.object(planner.circuit_breaker, 'execute', new=AsyncMock(return_value=mock_model_client.generate.return_value)):
            result = asyncio.run(planner.create_plan(
                intent=intent,
                tenant_id="tenant_1",
                user_id="user_1",
                user_permissions={"read:data"},
            ))
        
        plan_dict = result.plan.to_dict()
        
        assert "planId" in plan_dict
        assert "steps" in plan_dict
        assert "toolSchemaVersions" in plan_dict


# =============================================================================
# Global Instance Tests
# =============================================================================

class TestGlobalInstance:
    """Tests for global instance."""
    
    def test_get_action_planner(self):
        """Global instance is created correctly."""
        planner = get_action_planner()
        
        assert planner is not None
        assert isinstance(planner, ActionPlanner)


# =============================================================================
# Property-Based Tests
# =============================================================================

class TestRBACProperty:
    """Property-based tests for RBAC enforcement."""
    
    @given(
        required_perms=st.sets(st.sampled_from(["read:data", "write:data", "admin:system"]), min_size=1, max_size=3),
        user_perms=st.sets(st.sampled_from(["read:data", "write:data", "admin:system"]), min_size=0, max_size=3),
    )
    @settings(max_examples=50)
    def test_permission_check_property(self, required_perms, user_perms):
        """Permission check correctly identifies missing permissions."""
        planner = ActionPlanner()
        
        denied = planner._check_permissions(user_perms, required_perms)
        
        # All denied permissions should be in required but not in user
        for perm in denied:
            assert perm in required_perms
            assert perm not in user_perms
        
        # If no denied, user has all required
        if not denied:
            assert required_perms.issubset(user_perms)
