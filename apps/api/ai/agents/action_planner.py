"""
Action Planner Sub-Agent

Maps user intent to Tool API operations and generates action plans.
Validates permissions and calculates risk levels.

Requirements:
- 3.1: Map intent to Tool API operations
- 3.2: Risk level calculation
- 3.3: Permission validation
- 3.4: RBAC enforcement
- 3.5: Tenant isolation
- 3.6: Rollback procedure generation
- 27.2: Record tool_schema_versions in plan
"""

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set
from enum import Enum

from ai.config import get_ai_config, AIPhase
from ai.schemas.llm_outputs import IntentOutput, IntentType, ActionPlanOutput, OperationOutput
from ai.tools import ToolRegistry, get_tool_registry, RiskLevel, ToolDefinition, ToolExecutionMode
from ai.runtime.model_client import LocalModelClient, get_model_client, ModelResponse
from ai.runtime.circuit_breaker import get_inference_circuit_breaker, CircuitBreakerOpenError
from ai.capability_registry import get_allowed_tool_names

logger = logging.getLogger(__name__)


class PlannerStatus(str, Enum):
    """Status of action planning."""
    SUCCESS = "success"
    NO_ACTIONS_NEEDED = "no_actions_needed"
    PERMISSION_DENIED = "permission_denied"
    TENANT_VIOLATION = "tenant_violation"
    INVALID_INTENT = "invalid_intent"
    ERROR = "error"
    CIRCUIT_OPEN = "circuit_open"


@dataclass
class ActionStep:
    """A single step in an action plan."""
    step_number: int
    tool_name: str
    tool_schema_version: str
    parameters: Dict[str, Any]
    description: str
    risk_level: RiskLevel
    requires_approval: bool
    rollback_procedure: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "stepNumber": self.step_number,
            "toolName": self.tool_name,
            "toolSchemaVersion": self.tool_schema_version,
            "parameters": self.parameters,
            "description": self.description,
            "riskLevel": self.risk_level.value,
            "requiresApproval": self.requires_approval,
            "rollbackProcedure": self.rollback_procedure,
        }


@dataclass
class ActionPlan:
    """Complete action plan with steps and metadata."""
    plan_id: str
    tenant_id: str
    user_id: str
    intent: IntentOutput
    steps: List[ActionStep]
    overall_risk_level: RiskLevel
    requires_approval: bool
    plan_hash: str
    tool_schema_versions: Dict[str, str]
    missing_parameters: List[str] = field(default_factory=list)
    slot_filling_prompt: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    
    @property
    def step_count(self) -> int:
        return len(self.steps)
    
    def to_dict(self) -> dict:
        return {
            "planId": self.plan_id,
            "tenantId": self.tenant_id,
            "userId": self.user_id,
            "intent": self.intent.model_dump() if self.intent else None,
            "steps": [s.to_dict() for s in self.steps],
            "overallRiskLevel": self.overall_risk_level.value,
            "requiresApproval": self.requires_approval,
            "planHash": self.plan_hash,
            "toolSchemaVersions": self.tool_schema_versions,
            "missingParameters": self.missing_parameters,
            "slotFillingPrompt": self.slot_filling_prompt,
            "stepCount": self.step_count,
            "createdAt": self.created_at.isoformat(),
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }


@dataclass
class ActionPlannerResult:
    """Result of action planning."""
    status: PlannerStatus
    plan: Optional[ActionPlan] = None
    error_message: Optional[str] = None
    denied_permissions: Optional[List[str]] = None
    processing_time_ms: float = 0.0
    
    @property
    def is_success(self) -> bool:
        return self.status == PlannerStatus.SUCCESS
    
    @property
    def needs_approval(self) -> bool:
        return self.plan.requires_approval if self.plan else False
    
    def to_dict(self) -> dict:
        return {
            "status": self.status.value,
            "plan": self.plan.to_dict() if self.plan else None,
            "errorMessage": self.error_message,
            "deniedPermissions": self.denied_permissions,
            "processingTimeMs": self.processing_time_ms,
            "needsApproval": self.needs_approval,
        }


# Intent to tool mapping prompt
INTENT_TO_TOOL_PROMPT = """You are an action planner for a hearing aid management system.

Given the user's intent, determine which tools should be used and in what order.

Available tools:
{available_tools}

User intent:
- Type: {intent_type}
- Entities: {entities}
- Reasoning: {reasoning}

Generate a JSON action plan with the following structure:
{{
    "actions": [
        {{
            "tool_name": "tool_name_here",
            "parameters": {{"param1": "value1"}},
            "description": "What this step does",
            "rollback_procedure": "How to undo this step (if applicable)"
        }}
    ],
    "reasoning": "Why these actions were chosen"
}}

If no actions are needed (e.g., for a simple query), return:
{{"actions": [], "reasoning": "No actions needed - this is an informational query"}}

Respond ONLY with the JSON object, no other text."""


class ActionPlanner:
    """
    Action Planner Sub-Agent.
    
    Responsibilities:
    - Map user intent to Tool API operations
    - Calculate risk levels for each operation
    - Validate user permissions (RBAC)
    - Enforce tenant isolation
    - Generate rollback procedures
    - Record tool schema versions
    - Identify missing parameters and generate slot-filling prompts
    - Enforce action plan timeouts
    
    This agent is READ-ONLY and never executes actions.
    """
    
    # Risk levels that require approval
    APPROVAL_REQUIRED_RISK_LEVELS = {RiskLevel.HIGH, RiskLevel.CRITICAL}
    
    # Slot-filling timeout (Requirement 4.5)
    SLOT_FILL_TIMEOUT_MINUTES = 5
    
    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
        model_client: Optional[LocalModelClient] = None,
    ):
        """
        Initialize the Action Planner.
        
        Args:
            tool_registry: Tool registry instance
            model_client: Model client instance
        """
        self.tool_registry = tool_registry or get_tool_registry()
        self.model_client = model_client or get_model_client()
        self.circuit_breaker = get_inference_circuit_breaker()
        self.config = get_ai_config()
    
    def _generate_plan_id(self, tenant_id: str, user_id: str) -> str:
        """Generate a unique plan ID."""
        import uuid
        return f"plan_{tenant_id}_{uuid.uuid4().hex[:12]}"
    
    def _compute_plan_hash(self, steps: List[ActionStep]) -> str:
        """Compute hash of the action plan for integrity verification."""
        plan_data = json.dumps(
            [s.to_dict() for s in steps],
            sort_keys=True,
            default=str,
        )
        return hashlib.sha256(plan_data.encode()).hexdigest()[:16]
    
    def _calculate_overall_risk(self, steps: List[ActionStep]) -> RiskLevel:
        """Calculate overall risk level from all steps."""
        if not steps:
            return RiskLevel.LOW
        
        risk_order = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        max_risk = RiskLevel.LOW
        
        for step in steps:
            if risk_order.index(step.risk_level) > risk_order.index(max_risk):
                max_risk = step.risk_level
        
        return max_risk
    
    def _check_permissions(
        self,
        user_permissions: Set[str],
        required_permissions: Set[str],
    ) -> List[str]:
        """Check if user has required permissions. Returns list of denied permissions."""
        denied = []
        for perm in required_permissions:
            if perm not in user_permissions:
                denied.append(perm)
        return denied
    
    def _validate_tenant_access(
        self,
        user_tenant_id: str,
        target_tenant_id: str,
    ) -> bool:
        """Validate that user can access target tenant."""
        # Users can only access their own tenant
        return user_tenant_id == target_tenant_id
    
    def _get_available_tools_description(self, allowed_tool_names: Optional[List[str]] = None) -> str:
        """
        Get description of available tools for LLM.
        
        Args:
            allowed_tool_names: Optional list of tools to include. If None, includes all allowed in registry.
        """
        if allowed_tool_names is None:
            return self.tool_registry.get_tool_descriptions_for_llm()
            
        # Filter manually
        descriptions = []
        for tool_id in allowed_tool_names:
            try:
                tool = self.tool_registry.get_tool(tool_id)
                descriptions.append(tool.to_llm_description())
            except Exception:
                continue
                
        return "\n\n---\n\n".join(descriptions)
    
    def _get_required_parameters(self, tool_operations: List[dict]) -> List[str]:
        """
        Get list of required parameters for the given tool operations.
        
        Args:
            tool_operations: List of tool operations
            
        Returns:
            List of required parameter names
        """
        required_params = []
        for op in tool_operations:
            tool_name = op.get("tool_name")
            try:
                tool = self.tool_registry.get_tool(tool_name)
                # Get required parameters from tool schema
                # For now, we'll use a simple heuristic based on common patterns
                if tool_name == "createParty":
                    required_params.extend(["first_name", "last_name", "phone"])
                elif tool_name == "appointment_create":
                    required_params.extend(["party_id", "date", "time"])
                elif tool_name == "device_assign":
                    required_params.extend(["party_id", "device_id"])
            except Exception:
                continue
        return required_params
    
    def _generate_slot_prompt(self, parameter_name: str) -> str:
        """
        Generate user-friendly prompt for missing parameter.
        
        Args:
            parameter_name: Name of the missing parameter
            
        Returns:
            User-friendly prompt asking for the parameter
        """
        prompts = {
            "party_id": "Hangi kişi veya kuruluş için işlem yapmak istiyorsunuz? Lütfen isim veya ID belirtin.",
            "first_name": "Lütfen adını belirtin.",
            "last_name": "Lütfen soyadını belirtin.",
            "phone": "Lütfen telefon numarasını belirtin.",
            "email": "Lütfen e-posta adresini belirtin.",
            "device_id": "Hangi cihazdan bahsediyorsunuz? Lütfen cihaz adı veya seri numarasını belirtin.",
            "amount": "Miktar nedir? Lütfen bir sayı belirtin.",
            "date": "Hangi tarih için? Lütfen tarihi belirtin (örn: 2025-01-25).",
            "time": "Saat kaçta? Lütfen saati belirtin (örn: 14:30).",
        }
        return prompts.get(parameter_name, f"Lütfen {parameter_name} bilgisini belirtin.")
    
    async def create_plan(
        self,
        intent: IntentOutput,
        tenant_id: str,
        user_id: str,
        user_permissions: Set[str],
        context: Optional[Dict[str, Any]] = None,
    ) -> ActionPlannerResult:
        """
        Create an action plan from user intent.
        
        Args:
            intent: Classified user intent
            tenant_id: Tenant identifier
            user_id: User identifier
            user_permissions: Set of user's permissions
            context: Optional context
            
        Returns:
            ActionPlannerResult with plan or error
        """
        start_time = time.time()
        
        # Check if intent type requires actions
        if intent.intent_type in [IntentType.QUERY, IntentType.CLARIFICATION]:
            return ActionPlannerResult(
                status=PlannerStatus.NO_ACTIONS_NEEDED,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Get allowed tools based on permissions and phase
        allowed_tool_names = get_allowed_tool_names(
            list(user_permissions),
            self.config.phase.value if hasattr(self.config.phase, 'value') else "A"
        )
        
        # Build prompt for LLM
        prompt = INTENT_TO_TOOL_PROMPT.format(
            available_tools=self._get_available_tools_description(allowed_tool_names),
            intent_type=intent.intent_type.value,
            entities=json.dumps(intent.entities, ensure_ascii=False),
            reasoning=intent.reasoning or "No reasoning provided",
        )
        
        # Call LLM with circuit breaker
        try:
            model_response = await self.circuit_breaker.execute(
                self.model_client.generate,
                prompt=prompt,
                system_prompt="You are an action planner. Always respond with valid JSON.",
                max_tokens=1024,
                temperature=0.2,
            )
        except CircuitBreakerOpenError as e:
            logger.error(f"Circuit breaker open: {e}")
            return ActionPlannerResult(
                status=PlannerStatus.CIRCUIT_OPEN,
                error_message=f"Service temporarily unavailable. Retry after {e.retry_after_seconds:.0f}s",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        except Exception as e:
            logger.error(f"Model call failed: {e}")
            return ActionPlannerResult(
                status=PlannerStatus.ERROR,
                error_message=str(e),
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Parse LLM response
        try:
            plan_data = self._parse_plan_response(model_response.content)
        except Exception as e:
            logger.error(f"Failed to parse plan response: {e}")
            return ActionPlannerResult(
                status=PlannerStatus.ERROR,
                error_message=f"Failed to parse model response: {e}",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Check if no actions needed
        if not plan_data.get("actions"):
            return ActionPlannerResult(
                status=PlannerStatus.NO_ACTIONS_NEEDED,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Build action steps
        steps = []
        tool_schema_versions = {}
        required_permissions = set()
        
        for i, action in enumerate(plan_data["actions"], 1):
            tool_name = action.get("tool_name")
            
            # Get tool definition
            try:
                tool = self.tool_registry.get_tool(tool_name)
            except Exception:
                logger.warning(f"Unknown tool: {tool_name}")
                continue
            
            # Record schema version
            tool_schema_versions[tool_name] = tool.schema_version
            
            # Collect required permissions
            required_permissions.update(tool.requires_permissions)
            
            # Check if approval required
            requires_approval = tool.risk_level in self.APPROVAL_REQUIRED_RISK_LEVELS
            
            step = ActionStep(
                step_number=i,
                tool_name=tool_name,
                tool_schema_version=tool.schema_version,
                parameters=action.get("parameters", {}),
                description=action.get("description", f"Execute {tool_name}"),
                risk_level=tool.risk_level,
                requires_approval=requires_approval,
                rollback_procedure=action.get("rollback_procedure"),
            )
            steps.append(step)
        
        # Check permissions
        denied = self._check_permissions(user_permissions, required_permissions)
        if denied:
            return ActionPlannerResult(
                status=PlannerStatus.PERMISSION_DENIED,
                denied_permissions=denied,
                error_message=f"Missing permissions: {', '.join(denied)}",
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Identify missing parameters (Requirement 4.3)
        required_params = self._get_required_parameters(plan_data["actions"])
        provided_params = set(intent.entities.keys())
        missing_params = [p for p in required_params if p not in provided_params]
        
        # Generate slot-filling prompt if needed
        slot_prompt = None
        if missing_params:
            slot_prompt = self._generate_slot_prompt(missing_params[0])
        
        # Calculate overall risk
        overall_risk = self._calculate_overall_risk(steps)
        requires_approval = overall_risk in self.APPROVAL_REQUIRED_RISK_LEVELS
        
        # Compute plan hash
        plan_hash = self._compute_plan_hash(steps)
        
        # Set expiration time (Requirement 4.5)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=self.SLOT_FILL_TIMEOUT_MINUTES)
        
        # Create plan
        plan = ActionPlan(
            plan_id=self._generate_plan_id(tenant_id, user_id),
            tenant_id=tenant_id,
            user_id=user_id,
            intent=intent,
            steps=steps,
            overall_risk_level=overall_risk,
            requires_approval=requires_approval,
            plan_hash=plan_hash,
            tool_schema_versions=tool_schema_versions,
            missing_parameters=missing_params,
            slot_filling_prompt=slot_prompt,
            created_at=now,
            expires_at=expires_at,
        )
        
        return ActionPlannerResult(
            status=PlannerStatus.SUCCESS,
            plan=plan,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    
    def create_plan_sync(
        self,
        intent: IntentOutput,
        tenant_id: str,
        user_id: str,
        user_permissions: Set[str],
        context: Optional[Dict[str, Any]] = None,
    ) -> ActionPlannerResult:
        """Synchronous version of create_plan."""
        import asyncio
        return asyncio.run(self.create_plan(intent, tenant_id, user_id, user_permissions, context))
    
    def _parse_plan_response(self, response: str) -> dict:
        """Parse LLM response into plan data."""
        response = response.strip()
        
        # Handle markdown code blocks
        if response.startswith("```"):
            lines = response.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```") and not in_json:
                    in_json = True
                    continue
                elif line.startswith("```") and in_json:
                    break
                elif in_json:
                    json_lines.append(line)
            response = "\n".join(json_lines)
        
        return json.loads(response)
    
    def create_plan_without_llm(
        self,
        intent: IntentOutput,
        tenant_id: str,
        user_id: str,
        user_permissions: Set[str],
    ) -> ActionPlannerResult:
        """
        Create a simple plan without LLM.
        
        Used as fallback when LLM is unavailable.
        Maps common intents to predefined tool sequences using extracted entities.
        """
        start_time = time.time()
        
        # No actions for queries
        if intent.intent_type in [IntentType.QUERY, IntentType.CLARIFICATION, IntentType.UNKNOWN]:
            return ActionPlannerResult(
                status=PlannerStatus.NO_ACTIONS_NEEDED,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        
        # Patient creation with entities
        if intent.intent_type == IntentType.ACTION and intent.entities:
            # Check if we have patient creation entities
            if "first_name" in intent.entities and "phone" in intent.entities:
                # Build parameters from entities
                parameters = {
                    "first_name": intent.entities.get("first_name"),
                    "last_name": intent.entities.get("last_name", ""),
                    "phone": intent.entities.get("phone"),
                    "tenant_id": tenant_id,
                }
                
                # Add optional fields if present
                if "email" in intent.entities:
                    parameters["email"] = intent.entities["email"]
                if "tc_number" in intent.entities:
                    parameters["tc_number"] = intent.entities["tc_number"]
                
                # Check permissions
                required_permissions = {"party:write"}
                denied = self._check_permissions(user_permissions, required_permissions)
                if denied:
                    return ActionPlannerResult(
                        status=PlannerStatus.PERMISSION_DENIED,
                        denied_permissions=denied,
                        error_message=f"Missing permissions: {', '.join(denied)}",
                        processing_time_ms=(time.time() - start_time) * 1000,
                    )
                
                # Create step
                tool = self.tool_registry.get_tool("createParty")
                step = ActionStep(
                    step_number=1,
                    tool_name="createParty",
                    tool_schema_version=tool.schema_version,
                    parameters=parameters,
                    description=f"{parameters['first_name']} {parameters['last_name']} için hasta kaydı oluştur",
                    risk_level=tool.risk_level,
                    requires_approval=False,
                )
                
                # Create plan
                plan = ActionPlan(
                    plan_id=self._generate_plan_id(tenant_id, user_id),
                    tenant_id=tenant_id,
                    user_id=user_id,
                    intent=intent,
                    steps=[step],
                    overall_risk_level=RiskLevel.MEDIUM,
                    requires_approval=False,
                    plan_hash=self._compute_plan_hash([step]),
                    tool_schema_versions={"createParty": tool.schema_version},
                )
                
                return ActionPlannerResult(
                    status=PlannerStatus.SUCCESS,
                    plan=plan,
                    processing_time_ms=(time.time() - start_time) * 1000,
                )
        
        # No specific mapping found
        return ActionPlannerResult(
            status=PlannerStatus.NO_ACTIONS_NEEDED,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    
    def validate_plan_integrity(self, plan: ActionPlan) -> bool:
        """Validate that a plan hasn't been tampered with."""
        computed_hash = self._compute_plan_hash(plan.steps)
        return computed_hash == plan.plan_hash
    
    def check_schema_drift(self, plan: ActionPlan) -> Dict[str, bool]:
        """Check if any tool schemas have drifted since plan creation."""
        drift_status = {}
        
        for tool_name, recorded_version in plan.tool_schema_versions.items():
            try:
                tool = self.tool_registry.get_tool(tool_name)
                drift_status[tool_name] = tool.schema_version != recorded_version
            except Exception:
                drift_status[tool_name] = True  # Tool no longer exists
        
        return drift_status
    
    def is_expired(self, plan: ActionPlan) -> bool:
        """
        Check if action plan has expired.
        
        Args:
            plan: Action plan to check
            
        Returns:
            True if plan has expired, False otherwise
        """
        if plan.expires_at is None:
            return False
        return datetime.now(timezone.utc) > plan.expires_at


# Global instance
_planner: Optional[ActionPlanner] = None


def get_action_planner() -> ActionPlanner:
    """Get the global Action Planner instance."""
    global _planner
    if _planner is None:
        _planner = ActionPlanner()
    return _planner
