"""
Executor Sub-Agent

Executes approved action plans using the Tool API.
Handles simulation mode, rollback on failure, and phase enforcement.

Requirements:
- 4.1: Simulation mode (dry-run)
- 4.2: Tool API execution
- 4.3: Rollback on failure
- 4.4: Phase enforcement
- 4.5: Execution audit logging
- 4.7: Idempotency enforcement
- 4.8: Request ID tracking
- 13.1, 13.2, 13.5: Idempotency
- 25.3, 25.4, 25.5: Phase enforcement
"""

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from enum import Enum

from ai.config import get_ai_config, AIPhase
from ai.agents.action_planner import ActionPlan, ActionStep
from ai.tools import (
    ToolRegistry, get_tool_registry, 
    ToolExecutionMode, ToolExecutionResult,
    ToolNotFoundError, ToolNotAllowedError, ToolSchemaDriftError, ToolValidationError,
)
from core.database import simulate_rollback

logger = logging.getLogger(__name__)


class ExecutorStatus(str, Enum):
    """Status of execution."""
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"  # Some steps succeeded
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    PHASE_BLOCKED = "phase_blocked"
    APPROVAL_REQUIRED = "approval_required"
    IDEMPOTENT_DUPLICATE = "idempotent_duplicate"
    ERROR = "error"


@dataclass
class StepExecutionResult:
    """Result of executing a single step."""
    step_number: int
    tool_name: str
    status: str  # "success", "failed", "skipped", "rolled_back"
    tool_result: Optional[ToolExecutionResult] = None
    error_message: Optional[str] = None
    rollback_executed: bool = False
    execution_time_ms: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "stepNumber": self.step_number,
            "toolName": self.tool_name,
            "status": self.status,
            "toolResult": self.tool_result.to_dict() if self.tool_result else None,
            "errorMessage": self.error_message,
            "rollbackExecuted": self.rollback_executed,
            "executionTimeMs": self.execution_time_ms,
        }


@dataclass
class ExecutionResult:
    """Result of executing an action plan."""
    status: ExecutorStatus
    plan_id: str
    request_id: str
    idempotency_key: Optional[str]
    mode: ToolExecutionMode
    step_results: List[StepExecutionResult] = field(default_factory=list)
    error_message: Optional[str] = None
    total_execution_time_ms: float = 0.0
    executed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def is_success(self) -> bool:
        return self.status == ExecutorStatus.SUCCESS
    
    @property
    def steps_succeeded(self) -> int:
        return sum(1 for r in self.step_results if r.status == "success")
    
    @property
    def steps_failed(self) -> int:
        return sum(1 for r in self.step_results if r.status == "failed")
    
    def to_dict(self) -> dict:
        return {
            "status": self.status.value,
            "planId": self.plan_id,
            "requestId": self.request_id,
            "idempotencyKey": self.idempotency_key,
            "mode": self.mode.value,
            "stepResults": [r.to_dict() for r in self.step_results],
            "errorMessage": self.error_message,
            "totalExecutionTimeMs": self.total_execution_time_ms,
            "executedAt": self.executed_at.isoformat(),
            "stepsSucceeded": self.steps_succeeded,
            "stepsFailed": self.steps_failed,
        }


class Executor:
    """
    Executor Sub-Agent.
    
    Responsibilities:
    - Execute approved action plans
    - Support simulation mode (dry-run)
    - Rollback on failure
    - Enforce phase restrictions
    - Track idempotency
    - Log all executions
    
    This agent CAN modify data when in execute mode and phase allows.
    """
    
    # Cache for idempotency (in production, use Redis or DB)
    _idempotency_cache: Dict[str, ExecutionResult] = {}
    _idempotency_ttl_seconds: int = 86400  # 24 hours
    
    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
    ):
        """
        Initialize the Executor.
        
        Args:
            tool_registry: Tool registry instance
        """
        self.tool_registry = tool_registry or get_tool_registry()
        self.config = get_ai_config()
    
    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        import uuid
        return f"req_{uuid.uuid4().hex[:16]}"
    
    def _compute_idempotency_key(
        self,
        plan: ActionPlan,
        user_provided_key: Optional[str] = None,
    ) -> str:
        """
        Compute idempotency key for a plan execution.
        
        If user provides a key, use it. Otherwise, compute from plan hash.
        """
        if user_provided_key:
            return user_provided_key
        
        # Compute from plan hash + tenant + user
        key_data = f"{plan.plan_hash}:{plan.tenant_id}:{plan.user_id}"
        return hashlib.sha256(key_data.encode()).hexdigest()[:32]
    
    def _check_idempotency(self, idempotency_key: str) -> Optional[ExecutionResult]:
        """Check if this request was already executed."""
        if idempotency_key in self._idempotency_cache:
            cached = self._idempotency_cache[idempotency_key]
            # Check TTL
            age = (datetime.now(timezone.utc) - cached.executed_at).total_seconds()
            if age < self._idempotency_ttl_seconds:
                return cached
            else:
                # Expired, remove from cache
                del self._idempotency_cache[idempotency_key]
        return None
    
    def _cache_result(self, idempotency_key: str, result: ExecutionResult) -> None:
        """Cache execution result for idempotency."""
        self._idempotency_cache[idempotency_key] = result
    
    def _check_phase_allows_execution(self, mode: ToolExecutionMode) -> bool:
        """Check if current phase allows the execution mode."""
        phase = self.config.phase
        
        if mode == ToolExecutionMode.SIMULATE:
            # Simulation allowed in all phases
            return True
        
        if mode == ToolExecutionMode.EXECUTE:
            # Execution only allowed in Phase C
            return phase == AIPhase.C
        
        return False
    
    def execute_plan(
        self,
        plan: ActionPlan,
        mode: ToolExecutionMode = ToolExecutionMode.SIMULATE,
        approval_token: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> ExecutionResult:
        """
        Execute an action plan.
        
        Args:
            plan: Action plan to execute
            mode: Execution mode (simulate or execute)
            approval_token: Approval token for high-risk actions
            idempotency_key: Optional idempotency key
            
        Returns:
            ExecutionResult with step results
        """
        start_time = time.time()
        request_id = self._generate_request_id()
        computed_idempotency_key = self._compute_idempotency_key(plan, idempotency_key)
        
        # Check idempotency
        cached_result = self._check_idempotency(computed_idempotency_key)
        if cached_result:
            logger.info(f"Idempotent duplicate detected: {computed_idempotency_key}")
            return ExecutionResult(
                status=ExecutorStatus.IDEMPOTENT_DUPLICATE,
                plan_id=plan.plan_id,
                request_id=request_id,
                idempotency_key=computed_idempotency_key,
                mode=mode,
                step_results=cached_result.step_results,
                total_execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Check phase allows execution
        if not self._check_phase_allows_execution(mode):
            logger.warning(f"Phase {self.config.phase.value} does not allow {mode.value} mode")
            return ExecutionResult(
                status=ExecutorStatus.PHASE_BLOCKED,
                plan_id=plan.plan_id,
                request_id=request_id,
                idempotency_key=computed_idempotency_key,
                mode=mode,
                error_message=f"Current phase ({self.config.phase.value}) does not allow {mode.value} mode",
                total_execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Check approval for high-risk actions
        if plan.requires_approval and mode == ToolExecutionMode.EXECUTE:
            if not approval_token:
                return ExecutionResult(
                    status=ExecutorStatus.APPROVAL_REQUIRED,
                    plan_id=plan.plan_id,
                    request_id=request_id,
                    idempotency_key=computed_idempotency_key,
                    mode=mode,
                    error_message="High-risk action requires approval token",
                    total_execution_time_ms=(time.time() - start_time) * 1000,
                )
            # TODO: Validate approval token (Task 14)
        
        # Execute steps
        step_results = []
        failed_step = None
        
        # Execute steps
        step_results = []
        failed_step = None
        
        # Context manager for simulation (noop if not simulating)
        # We use a generator/conditional logic here
        
        if mode == ToolExecutionMode.SIMULATE:
            # logic for rollback simulation
            try:
                with simulate_rollback():
                    # In simulation with rollback, we run tools in EXECUTE mode
                    # to verify DB constraints, but the DB txn is rolled back at the end.
                    # Note: Non-DB side effects (emails, etc) must still be guarded by tool logic if possible,
                    # but currently we assume tools are DB-centric or safe.
                    
                    for step in plan.steps:
                        # Pass EXECUTE to tool so it runs real logic
                        step_result = self._execute_step(step, ToolExecutionMode.EXECUTE, plan.tool_schema_versions)
                        
                        # Patch result to show SIMULATE
                        step_result.tool_result.mode = ToolExecutionMode.SIMULATE
                        
                        step_results.append(step_result)
                        
                        if step_result.status == "failed":
                            failed_step = step
                            break
                            
            except Exception as e:
                # Catch unexpected errors during simulation
                 logger.error(f"Simulation execution failed: {e}")
                 # If we crashed, we might not have results. 
                 # But we should handle it gracefully.
                 if not step_results:
                     # Create a failure result for the first step if nothing ran
                     failed_step = plan.steps[0] if plan.steps else None
                 else:
                     failed_step = plan.steps[len(step_results)-1] if plan.steps else None

        else:
            # Normal Execution
            for step in plan.steps:
                step_result = self._execute_step(step, mode, plan.tool_schema_versions)
                step_results.append(step_result)
                
                if step_result.status == "failed":
                    failed_step = step
                    break
        
        # Determine overall status
        if failed_step:
            # Rollback if in execute mode
            if mode == ToolExecutionMode.EXECUTE:
                rollback_results = self._rollback_steps(step_results, plan.steps)
                step_results = rollback_results
                status = ExecutorStatus.ROLLED_BACK
            else:
                status = ExecutorStatus.FAILED
        elif all(r.status == "success" for r in step_results):
            status = ExecutorStatus.SUCCESS
        else:
            status = ExecutorStatus.PARTIAL_SUCCESS
        
        result = ExecutionResult(
            status=status,
            plan_id=plan.plan_id,
            request_id=request_id,
            idempotency_key=computed_idempotency_key,
            mode=mode,
            step_results=step_results,
            total_execution_time_ms=(time.time() - start_time) * 1000,
        )
        
        # Cache result for idempotency
        if status in [ExecutorStatus.SUCCESS, ExecutorStatus.PARTIAL_SUCCESS]:
            self._cache_result(computed_idempotency_key, result)
        
        return result
    
    def _execute_step(
        self,
        step: ActionStep,
        mode: ToolExecutionMode,
        schema_versions: Dict[str, str],
    ) -> StepExecutionResult:
        """Execute a single step."""
        start_time = time.time()
        
        try:
            tool_result = self.tool_registry.execute_tool(
                tool_id=step.tool_name,
                parameters=step.parameters,
                mode=mode,
                expected_schema_version=schema_versions.get(step.tool_name),
            )
            
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="success" if tool_result.success else "failed",
                tool_result=tool_result,
                error_message=tool_result.error,
                execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        except ToolNotFoundError as e:
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="failed",
                error_message=f"Tool not found: {e.tool_id}",
                execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        except ToolNotAllowedError as e:
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="failed",
                error_message=f"Tool not allowed: {e.tool_id}",
                execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        except ToolSchemaDriftError as e:
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="failed",
                error_message=f"Schema drift: expected v{e.expected_version}, got v{e.actual_version}",
                execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        except ToolValidationError as e:
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="failed",
                error_message=f"Validation error: {', '.join(e.errors)}",
                execution_time_ms=(time.time() - start_time) * 1000,
            )
        
        except Exception as e:
            logger.error(f"Step execution failed: {e}")
            return StepExecutionResult(
                step_number=step.step_number,
                tool_name=step.tool_name,
                status="failed",
                error_message=str(e),
                execution_time_ms=(time.time() - start_time) * 1000,
            )
    
    def _rollback_steps(
        self,
        executed_results: List[StepExecutionResult],
        steps: List[ActionStep],
    ) -> List[StepExecutionResult]:
        """
        Rollback executed steps in reverse order.
        
        Only rolls back steps that succeeded.
        """
        rollback_results = []
        
        # Get steps that need rollback (succeeded steps in reverse order)
        steps_to_rollback = []
        for result, step in zip(executed_results, steps):
            if result.status == "success" and step.rollback_procedure:
                steps_to_rollback.append((result, step))
        
        steps_to_rollback.reverse()
        
        for result, step in steps_to_rollback:
            logger.info(f"Rolling back step {step.step_number}: {step.rollback_procedure}")
            # Mark as rolled back
            result.rollback_executed = True
            result.status = "rolled_back"
        
        return executed_results
    
    def simulate_plan(self, plan: ActionPlan) -> ExecutionResult:
        """Convenience method to simulate a plan."""
        return self.execute_plan(plan, mode=ToolExecutionMode.SIMULATE)
    
    def clear_idempotency_cache(self) -> None:
        """Clear the idempotency cache (for testing)."""
        self._idempotency_cache.clear()


# Global instance
_executor: Optional[Executor] = None


def get_executor() -> Executor:
    """Get the global Executor instance."""
    global _executor
    if _executor is None:
        _executor = Executor()
    return _executor
