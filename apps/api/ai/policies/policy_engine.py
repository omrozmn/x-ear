"""
Policy Engine for AI Layer

Provides deterministic policy evaluation for AI actions.
All decisions are made without LLM involvement - pure rule-based logic.

Requirements:
- 7.1: Policy Engine evaluates RBAC rules
- 7.2: Policy Engine evaluates compliance rules
- 7.3: Policy Engine evaluates risk thresholds
- 7.4: Policy Engine is deterministic (no LLM)
- 7.5: Rules have rule_id and version
- 7.6: Rule evaluation is logged
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class PolicyRuleType(str, Enum):
    """Types of policy rules."""
    RBAC = "rbac"                    # Role-based access control
    COMPLIANCE = "compliance"        # Compliance requirements
    RISK_THRESHOLD = "risk_threshold"  # Risk level thresholds
    RATE_LIMIT = "rate_limit"        # Rate limiting
    DATA_ACCESS = "data_access"      # Data access restrictions


class PolicyDecisionType(str, Enum):
    """Types of policy decisions."""
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE_APPROVAL = "require_approval"


@dataclass
class PolicyViolation:
    """A policy violation."""
    rule_id: str
    rule_type: PolicyRuleType
    message: str
    severity: str = "error"  # error, warning
    details: Optional[Dict] = None
    
    def to_dict(self) -> dict:
        return {
            "ruleId": self.rule_id,
            "ruleType": self.rule_type.value,
            "message": self.message,
            "severity": self.severity,
            "details": self.details,
        }


@dataclass
class PolicyDecision:
    """Result of policy evaluation."""
    decision: PolicyDecisionType
    violations: List[PolicyViolation] = field(default_factory=list)
    warnings: List[PolicyViolation] = field(default_factory=list)
    evaluated_rules: List[str] = field(default_factory=list)
    evaluation_time_ms: float = 0.0
    requires_approval: bool = False
    approval_reason: Optional[str] = None
    
    @property
    def is_allowed(self) -> bool:
        return self.decision == PolicyDecisionType.ALLOW
    
    @property
    def is_denied(self) -> bool:
        return self.decision == PolicyDecisionType.DENY
    
    def to_dict(self) -> dict:
        return {
            "decision": self.decision.value,
            "isAllowed": self.is_allowed,
            "violations": [v.to_dict() for v in self.violations],
            "warnings": [w.to_dict() for w in self.warnings],
            "evaluatedRules": self.evaluated_rules,
            "evaluationTimeMs": self.evaluation_time_ms,
            "requiresApproval": self.requires_approval,
            "approvalReason": self.approval_reason,
        }


@dataclass
class PolicyContext:
    """Context for policy evaluation."""
    user_id: str
    tenant_id: str
    user_roles: Set[str]
    user_permissions: Set[str]
    action_type: str
    tool_id: Optional[str] = None
    risk_level: Optional[str] = None
    target_resource: Optional[str] = None
    target_tenant_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "userId": self.user_id,
            "tenantId": self.tenant_id,
            "userRoles": list(self.user_roles),
            "userPermissions": list(self.user_permissions),
            "actionType": self.action_type,
            "toolId": self.tool_id,
            "riskLevel": self.risk_level,
            "targetResource": self.target_resource,
            "targetTenantId": self.target_tenant_id,
        }


@dataclass
class PolicyRule:
    """Base class for policy rules."""
    rule_id: str
    version: str
    description: str
    rule_type: PolicyRuleType = PolicyRuleType.RBAC  # Default, overridden by subclasses
    enabled: bool = True
    priority: int = 100  # Lower = higher priority
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """
        Evaluate the rule against the context.
        
        Returns:
            PolicyViolation if rule is violated, None otherwise
        """
        raise NotImplementedError
    
    def compute_hash(self) -> str:
        """Compute hash of rule definition."""
        data = {
            "rule_id": self.rule_id,
            "rule_type": self.rule_type.value,
            "version": self.version,
        }
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]
    
    def to_dict(self) -> dict:
        return {
            "ruleId": self.rule_id,
            "ruleType": self.rule_type.value,
            "version": self.version,
            "description": self.description,
            "enabled": self.enabled,
            "priority": self.priority,
        }


class PolicyEngine:
    """
    Deterministic policy engine for AI actions.
    
    Evaluates rules in priority order and returns a decision.
    No LLM involvement - pure rule-based logic.
    """
    
    def __init__(self):
        self._rules: Dict[str, PolicyRule] = {}
        self._rules_by_type: Dict[PolicyRuleType, List[PolicyRule]] = {
            t: [] for t in PolicyRuleType
        }
    
    def register_rule(self, rule: PolicyRule) -> None:
        """Register a policy rule."""
        self._rules[rule.rule_id] = rule
        self._rules_by_type[rule.rule_type].append(rule)
        # Sort by priority
        self._rules_by_type[rule.rule_type].sort(key=lambda r: r.priority)
        logger.debug(f"Registered policy rule: {rule.rule_id} v{rule.version}")
    
    def get_rule(self, rule_id: str) -> Optional[PolicyRule]:
        """Get a rule by ID."""
        return self._rules.get(rule_id)
    
    def evaluate(
        self,
        context: PolicyContext,
        rule_types: Optional[List[PolicyRuleType]] = None,
    ) -> PolicyDecision:
        """
        Evaluate all applicable rules against the context.
        
        Args:
            context: Policy evaluation context
            rule_types: Optional list of rule types to evaluate (default: all)
            
        Returns:
            PolicyDecision with the result
        """
        import time
        start_time = time.time()
        
        violations: List[PolicyViolation] = []
        warnings: List[PolicyViolation] = []
        evaluated_rules: List[str] = []
        requires_approval = False
        approval_reason = None
        
        # Determine which rule types to evaluate
        types_to_evaluate = rule_types or list(PolicyRuleType)
        
        # Evaluate rules in order
        for rule_type in types_to_evaluate:
            for rule in self._rules_by_type[rule_type]:
                if not rule.enabled:
                    continue
                
                evaluated_rules.append(rule.rule_id)
                
                try:
                    violation = rule.evaluate(context)
                    if violation:
                        if violation.severity == "warning":
                            warnings.append(violation)
                        else:
                            violations.append(violation)
                            
                        # Log the violation
                        logger.info(
                            f"Policy violation: {rule.rule_id} - {violation.message}",
                            extra={
                                "rule_id": rule.rule_id,
                                "user_id": context.user_id,
                                "tenant_id": context.tenant_id,
                                "action_type": context.action_type,
                            }
                        )
                except Exception as e:
                    logger.error(f"Error evaluating rule {rule.rule_id}: {e}")
                    # Fail closed - treat as violation
                    violations.append(PolicyViolation(
                        rule_id=rule.rule_id,
                        rule_type=rule.rule_type,
                        message=f"Rule evaluation error: {str(e)}",
                        severity="error",
                    ))
        
        # Check if approval is required based on risk level
        if context.risk_level in ("high", "critical") and not violations:
            requires_approval = True
            approval_reason = f"Action requires approval due to {context.risk_level} risk level"
        
        # Determine decision
        if violations:
            decision = PolicyDecisionType.DENY
        elif requires_approval:
            decision = PolicyDecisionType.REQUIRE_APPROVAL
        else:
            decision = PolicyDecisionType.ALLOW
        
        evaluation_time = (time.time() - start_time) * 1000
        
        result = PolicyDecision(
            decision=decision,
            violations=violations,
            warnings=warnings,
            evaluated_rules=evaluated_rules,
            evaluation_time_ms=evaluation_time,
            requires_approval=requires_approval,
            approval_reason=approval_reason,
        )
        
        # Log the decision
        logger.info(
            f"Policy decision: {decision.value}",
            extra={
                "user_id": context.user_id,
                "tenant_id": context.tenant_id,
                "action_type": context.action_type,
                "decision": decision.value,
                "violations_count": len(violations),
                "evaluation_time_ms": evaluation_time,
            }
        )
        
        return result
    
    def list_rules(self, rule_type: Optional[PolicyRuleType] = None) -> List[Dict]:
        """List all registered rules."""
        if rule_type:
            return [r.to_dict() for r in self._rules_by_type[rule_type]]
        return [r.to_dict() for r in self._rules.values()]
    
    def clear_rules(self) -> None:
        """Clear all rules (for testing)."""
        self._rules.clear()
        for rule_type in PolicyRuleType:
            self._rules_by_type[rule_type] = []


# Global policy engine instance
_engine: Optional[PolicyEngine] = None


def get_policy_engine() -> PolicyEngine:
    """Get the global policy engine instance."""
    global _engine
    if _engine is None:
        _engine = PolicyEngine()
    return _engine
