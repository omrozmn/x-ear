"""
Tests for Executor Sub-Agent.

**Feature: ai-layer-architecture**
**Property: Idempotency Enforcement, Rollback on Failure, Phase Enforcement**

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 13.1, 13.2, 13.5, 25.3, 25.4, 25.5**

Tests that:
- Executor correctly executes action plans
- Simulation mode works without side effects
- Rollback is performed on failure
- Phase restrictions are enforced
- Idempotency is maintained
"""

import sys
from pathlib import Path
import json
import os

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from unittest.mock import MagicMock, patch
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone

from ai.agents.executor import (
    Executor,
    ExecutionResult,
    StepExecutionResult,
    ExecutorStatus,
    get_executor,
)
from ai.agents.action_planner import ActionPlan, ActionStep
from ai.tools import (
    ToolRegistry, ToolDefinition, ToolParameter, ToolCategory,
    RiskLevel, ToolExecutionMode, ToolExecutionResult,
)
from ai.schemas.llm_outputs import IntentOutput, IntentType
from ai.config import AIPhase


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_tool_registry():
    """Create a mock tool registry with test tools."""
    registry = ToolRegistry()
    
    def success_handler(params, mode):
        return ToolExecutionResult(
            tool_id="test_tool",
            success=True,
            mode=mode,
            result={"status": "ok", "params": params},
            simulated_changes={"changed": True} if mode == ToolExecutionMode.SIMULATE else None,
        )
    
    def failing_handler(params, mode):
        return ToolExecutionResult(
            tool_id="failing_tool",
            success=False,
            mode=mode,
            error="Simulated failure",
        )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="test_tool",
            name="Test Tool",
            description="A test tool",
            category=ToolCategory.READ,
            risk_level=RiskLevel.LOW,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="id", type="string", description="ID", required=True),
            ],
            requires_permissions=["read:data"],
        ),
        success_handler,
    )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="failing_tool",
            name="Failing Tool",
            description="A tool that fails",
            category=ToolCategory.CONFIG,
            risk_level=RiskLevel.MEDIUM,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="data", type="object", description="Data", required=True),
            ],
            requires_permissions=["write:data"],
        ),
        failing_handler,
    )
    
    registry.register_tool(
        ToolDefinition(
            tool_id="high_risk_tool",
            name="High Risk Tool",
            description="A high risk tool",
            category=ToolCategory.ADMIN,
            risk_level=RiskLevel.HIGH,
            schema_version="1.0.0",
            parameters=[
                ToolParameter(name="action", type="string", description="Action", required=True),
            ],
            requires_permissions=["admin:system"],
            requires_approval=True,
        ),
        success_handler,
    )
    
    return registry


@pytest.fixture
def executor(mock_tool_registry):
    """Create an Executor with mock registry."""
    exec = Executor(tool_registry=mock_tool_registry)
    exec.clear_idempotency_cache()
    return exec


def create_intent() -> IntentOutput:
    """Create a test intent."""
    return IntentOutput(
        intent_type=IntentType.ACTION,
        confidence=0.9,
        entities={},
        reasoning="Test intent",
    )


def create_plan(
    steps: list = None,
    requires_approval: bool = False,
    plan_id: str = "plan_test_123",
) -> ActionPlan:
    """Create a test action plan."""
    if steps is None:
        steps = [
            ActionStep(
                step_number=1,
                tool_name="test_tool",
                tool_schema_version="1.0.0",
                parameters={"id": "123"},
                description="Test step",
                risk_level=RiskLevel.LOW,
                requires_approval=False,
            )
        ]
    
    return ActionPlan(
        plan_id=plan_id,
        tenant_id="tenant_1",
        user_id="user_1",
        intent=create_intent(),
        steps=steps,
        overall_risk_level=RiskLevel.LOW,
        requires_approval=requires_approval,
        plan_hash="abc123",
        tool_schema_versions={"test_tool": "1.0.0"},
    )


# =============================================================================
# Basic Execution Tests
# =============================================================================

class TestBasicExecution:
    """Tests for basic execution."""
    
    def test_simulate_plan_success(self, executor):
        """Simulation mode executes without errors."""
        plan = create_plan()
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        
        assert result.is_success
        assert result.mode == ToolExecutionMode.SIMULATE
        assert len(result.step_results) == 1
        assert result.step_results[0].status == "success"
    
    def test_simulate_returns_simulated_changes(self, executor):
        """Simulation mode returns simulated changes."""
        plan = create_plan()
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        
        assert result.is_success
        assert result.step_results[0].tool_result.simulated_changes is not None
    
    def test_execute_blocked_in_phase_a(self, executor):
        """Execute mode is blocked in Phase A."""
        plan = create_plan()
        
        with patch.dict(os.environ, {"AI_PHASE": "A"}):
            # Need to recreate config to pick up new env var
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        
        assert result.status == ExecutorStatus.PHASE_BLOCKED
        assert "phase" in result.error_message.lower()
    
    def test_execute_allowed_in_phase_c(self, executor):
        """Execute mode is allowed in Phase C."""
        plan = create_plan()
        
        with patch.dict(os.environ, {"AI_PHASE": "C"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        
        assert result.is_success


# =============================================================================
# Idempotency Tests
# =============================================================================

class TestIdempotency:
    """Tests for idempotency enforcement."""
    
    def test_duplicate_request_returns_cached(self, executor):
        """Duplicate requests return cached result."""
        plan = create_plan()
        idempotency_key = "test_key_123"
        
        # First execution
        result1 = executor.execute_plan(
            plan, 
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key=idempotency_key,
        )
        
        # Second execution with same key
        result2 = executor.execute_plan(
            plan,
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key=idempotency_key,
        )
        
        assert result1.is_success
        assert result2.status == ExecutorStatus.IDEMPOTENT_DUPLICATE
    
    def test_different_keys_execute_separately(self, executor):
        """Different idempotency keys execute separately."""
        plan = create_plan()
        
        result1 = executor.execute_plan(
            plan,
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key="key_1",
        )
        
        result2 = executor.execute_plan(
            plan,
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key="key_2",
        )
        
        assert result1.is_success
        assert result2.is_success
    
    def test_idempotency_key_computed_from_plan(self, executor):
        """Idempotency key is computed from plan if not provided."""
        plan = create_plan()
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        
        assert result.idempotency_key is not None
        assert len(result.idempotency_key) == 32


# =============================================================================
# Failure and Rollback Tests
# =============================================================================

class TestFailureAndRollback:
    """Tests for failure handling and rollback."""
    
    def test_step_failure_stops_execution(self, executor):
        """Step failure stops further execution."""
        steps = [
            ActionStep(
                step_number=1,
                tool_name="test_tool",
                tool_schema_version="1.0.0",
                parameters={"id": "123"},
                description="Step 1",
                risk_level=RiskLevel.LOW,
                requires_approval=False,
            ),
            ActionStep(
                step_number=2,
                tool_name="failing_tool",
                tool_schema_version="1.0.0",
                parameters={"data": {}},
                description="Step 2 (fails)",
                risk_level=RiskLevel.MEDIUM,
                requires_approval=False,
            ),
            ActionStep(
                step_number=3,
                tool_name="test_tool",
                tool_schema_version="1.0.0",
                parameters={"id": "456"},
                description="Step 3 (should not run)",
                risk_level=RiskLevel.LOW,
                requires_approval=False,
            ),
        ]
        
        plan = ActionPlan(
            plan_id="plan_test",
            tenant_id="tenant_1",
            user_id="user_1",
            intent=create_intent(),
            steps=steps,
            overall_risk_level=RiskLevel.MEDIUM,
            requires_approval=False,
            plan_hash="abc123",
            tool_schema_versions={
                "test_tool": "1.0.0",
                "failing_tool": "1.0.0",
            },
        )
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        
        assert result.status == ExecutorStatus.FAILED
        assert len(result.step_results) == 2  # Only 2 steps executed
        assert result.step_results[0].status == "success"
        assert result.step_results[1].status == "failed"
    
    def test_rollback_on_failure_in_execute_mode(self, executor):
        """Rollback is performed on failure in execute mode."""
        steps = [
            ActionStep(
                step_number=1,
                tool_name="test_tool",
                tool_schema_version="1.0.0",
                parameters={"id": "123"},
                description="Step 1",
                risk_level=RiskLevel.LOW,
                requires_approval=False,
                rollback_procedure="Undo step 1",
            ),
            ActionStep(
                step_number=2,
                tool_name="failing_tool",
                tool_schema_version="1.0.0",
                parameters={"data": {}},
                description="Step 2 (fails)",
                risk_level=RiskLevel.MEDIUM,
                requires_approval=False,
            ),
        ]
        
        plan = ActionPlan(
            plan_id="plan_test",
            tenant_id="tenant_1",
            user_id="user_1",
            intent=create_intent(),
            steps=steps,
            overall_risk_level=RiskLevel.MEDIUM,
            requires_approval=False,
            plan_hash="abc123",
            tool_schema_versions={
                "test_tool": "1.0.0",
                "failing_tool": "1.0.0",
            },
        )
        
        with patch.dict(os.environ, {"AI_PHASE": "C"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        
        assert result.status == ExecutorStatus.ROLLED_BACK
        assert result.step_results[0].rollback_executed


# =============================================================================
# Approval Tests
# =============================================================================

class TestApproval:
    """Tests for approval requirements."""
    
    def test_high_risk_requires_approval(self, executor):
        """High-risk plans require approval token."""
        plan = create_plan(requires_approval=True)
        
        with patch.dict(os.environ, {"AI_PHASE": "C"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        
        assert result.status == ExecutorStatus.APPROVAL_REQUIRED
    
    def test_simulation_does_not_require_approval(self, executor):
        """Simulation mode doesn't require approval."""
        plan = create_plan(requires_approval=True)
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        
        assert result.is_success


# =============================================================================
# Phase Enforcement Tests
# =============================================================================

class TestPhaseEnforcement:
    """Tests for phase enforcement."""
    
    def test_simulate_allowed_in_all_phases(self, executor):
        """Simulation is allowed in all phases."""
        for phase_value in ["A", "B", "C"]:
            # Clear idempotency cache between phases
            executor.clear_idempotency_cache()
            
            # Create fresh plan with unique ID for each phase
            plan = create_plan(plan_id=f"plan_phase_{phase_value}")
            
            with patch.dict(os.environ, {"AI_PHASE": phase_value}):
                from ai.config import AIConfig
                executor.config = AIConfig()
                result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
            
            assert result.is_success, f"Simulation should work in phase {phase_value}"
    
    def test_execute_only_in_phase_c(self, executor):
        """Execute mode only works in Phase C."""
        plan = create_plan()
        
        # Phase A - blocked
        with patch.dict(os.environ, {"AI_PHASE": "A"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        assert result.status == ExecutorStatus.PHASE_BLOCKED
        
        # Phase B - blocked
        with patch.dict(os.environ, {"AI_PHASE": "B"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        assert result.status == ExecutorStatus.PHASE_BLOCKED
        
        # Phase C - allowed
        with patch.dict(os.environ, {"AI_PHASE": "C"}):
            from ai.config import AIConfig
            executor.config = AIConfig()
            result = executor.execute_plan(plan, mode=ToolExecutionMode.EXECUTE)
        assert result.is_success


# =============================================================================
# Serialization Tests
# =============================================================================

class TestSerialization:
    """Tests for result serialization."""
    
    def test_result_to_dict(self, executor):
        """Result can be serialized to dict."""
        plan = create_plan()
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        result_dict = result.to_dict()
        
        assert "status" in result_dict
        assert "planId" in result_dict
        assert "stepResults" in result_dict
        assert "totalExecutionTimeMs" in result_dict
    
    def test_step_result_to_dict(self, executor):
        """Step result can be serialized to dict."""
        plan = create_plan()
        
        result = executor.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
        step_dict = result.step_results[0].to_dict()
        
        assert "stepNumber" in step_dict
        assert "toolName" in step_dict
        assert "status" in step_dict


# =============================================================================
# Global Instance Tests
# =============================================================================

class TestGlobalInstance:
    """Tests for global instance."""
    
    def test_get_executor(self):
        """Global instance is created correctly."""
        executor = get_executor()
        
        assert executor is not None
        assert isinstance(executor, Executor)


# =============================================================================
# Property-Based Tests
# =============================================================================

class TestIdempotencyProperty:
    """Property-based tests for idempotency."""
    
    @given(
        key=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'))),
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_same_key_always_returns_duplicate(self, key, mock_tool_registry):
        """Same idempotency key always returns duplicate on second call."""
        # Create fresh executor for each test
        executor = Executor(tool_registry=mock_tool_registry)
        executor.clear_idempotency_cache()
        
        plan = create_plan(plan_id=f"plan_{key}")
        
        # First call
        result1 = executor.execute_plan(
            plan,
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key=key,
        )
        
        # Second call
        result2 = executor.execute_plan(
            plan,
            mode=ToolExecutionMode.SIMULATE,
            idempotency_key=key,
        )
        
        if result1.is_success:
            assert result2.status == ExecutorStatus.IDEMPOTENT_DUPLICATE
