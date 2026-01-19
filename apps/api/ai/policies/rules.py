"""
Policy Rules for AI Layer

Defines concrete policy rules for RBAC, compliance, and risk thresholds.

Requirements:
- 7.5: Rules have rule_id and version
- 7.6: Rule evaluation is logged
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set
import logging

from ai.policies.policy_engine import (
    PolicyRule,
    PolicyRuleType,
    PolicyViolation,
    PolicyContext,
    get_policy_engine,
)

logger = logging.getLogger(__name__)


# =============================================================================
# RBAC Rules
# =============================================================================

@dataclass
class RBACRule(PolicyRule):
    """
    Role-based access control rule.
    
    Checks if user has required permissions for an action.
    """
    required_permissions: Set[str] = field(default_factory=set)
    required_roles: Set[str] = field(default_factory=set)
    action_pattern: str = "*"  # Glob pattern for action types
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.RBAC)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check if user has required permissions/roles."""
        # Check action pattern match
        if self.action_pattern != "*":
            if not self._matches_pattern(context.action_type, self.action_pattern):
                return None  # Rule doesn't apply
        
        # Check required permissions
        if self.required_permissions:
            missing = self.required_permissions - context.user_permissions
            if missing:
                return PolicyViolation(
                    rule_id=self.rule_id,
                    rule_type=self.rule_type,
                    message=f"Missing required permissions: {', '.join(missing)}",
                    severity="error",
                    details={"missing_permissions": list(missing)},
                )
        
        # Check required roles
        if self.required_roles:
            if not self.required_roles & context.user_roles:
                return PolicyViolation(
                    rule_id=self.rule_id,
                    rule_type=self.rule_type,
                    message=f"Missing required role: one of {', '.join(self.required_roles)}",
                    severity="error",
                    details={"required_roles": list(self.required_roles)},
                )
        
        return None
    
    def _matches_pattern(self, action: str, pattern: str) -> bool:
        """Simple glob pattern matching."""
        if pattern == "*":
            return True
        if pattern.endswith("*"):
            return action.startswith(pattern[:-1])
        return action == pattern


@dataclass
class TenantIsolationRule(PolicyRule):
    """
    Tenant isolation rule.
    
    Ensures users can only access their own tenant's data.
    """
    allow_cross_tenant: bool = False
    cross_tenant_roles: Set[str] = field(default_factory=lambda: {"super_admin"})
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.RBAC)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check tenant isolation."""
        # If no target tenant specified, allow
        if not context.target_tenant_id:
            return None
        
        # Same tenant is always allowed
        if context.target_tenant_id == context.tenant_id:
            return None
        
        # Cross-tenant access
        if not self.allow_cross_tenant:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message="Cross-tenant access is not allowed",
                severity="error",
                details={
                    "user_tenant": context.tenant_id,
                    "target_tenant": context.target_tenant_id,
                },
            )
        
        # Check if user has cross-tenant role
        if not self.cross_tenant_roles & context.user_roles:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message="User does not have cross-tenant access permission",
                severity="error",
                details={
                    "required_roles": list(self.cross_tenant_roles),
                    "user_roles": list(context.user_roles),
                },
            )
        
        return None


# =============================================================================
# Compliance Rules
# =============================================================================

@dataclass
class ComplianceRule(PolicyRule):
    """
    Compliance rule.
    
    Enforces compliance requirements (e.g., data handling, audit).
    """
    blocked_actions: Set[str] = field(default_factory=set)
    blocked_resources: Set[str] = field(default_factory=set)
    compliance_type: str = "general"  # gdpr, hipaa, pci, etc.
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.COMPLIANCE)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check compliance requirements."""
        # Check blocked actions
        if context.action_type in self.blocked_actions:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message=f"Action '{context.action_type}' is blocked by {self.compliance_type} compliance",
                severity="error",
                details={"compliance_type": self.compliance_type},
            )
        
        # Check blocked resources
        if context.target_resource and context.target_resource in self.blocked_resources:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message=f"Resource '{context.target_resource}' is blocked by {self.compliance_type} compliance",
                severity="error",
                details={"compliance_type": self.compliance_type},
            )
        
        return None


@dataclass
class DataAccessRule(PolicyRule):
    """
    Data access restriction rule.
    
    Controls access to sensitive data types.
    """
    sensitive_resources: Set[str] = field(default_factory=set)
    required_permissions_for_sensitive: Set[str] = field(default_factory=set)
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.DATA_ACCESS)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check data access restrictions."""
        if not context.target_resource:
            return None
        
        # Check if accessing sensitive resource
        if context.target_resource in self.sensitive_resources:
            missing = self.required_permissions_for_sensitive - context.user_permissions
            if missing:
                return PolicyViolation(
                    rule_id=self.rule_id,
                    rule_type=self.rule_type,
                    message=f"Access to sensitive resource '{context.target_resource}' requires additional permissions",
                    severity="error",
                    details={
                        "resource": context.target_resource,
                        "missing_permissions": list(missing),
                    },
                )
        
        return None


# =============================================================================
# Risk Threshold Rules
# =============================================================================

@dataclass
class RiskThresholdRule(PolicyRule):
    """
    Risk threshold rule.
    
    Enforces approval requirements based on risk level.
    """
    max_risk_without_approval: str = "medium"  # low, medium, high, critical
    blocked_risk_levels: Set[str] = field(default_factory=set)
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.RISK_THRESHOLD)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check risk thresholds."""
        if not context.risk_level:
            return None
        
        risk_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        
        # Check blocked risk levels
        if context.risk_level in self.blocked_risk_levels:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message=f"Actions with '{context.risk_level}' risk level are blocked",
                severity="error",
                details={"risk_level": context.risk_level},
            )
        
        # Check if risk exceeds threshold (warning, not error)
        current_risk = risk_order.get(context.risk_level, 0)
        max_risk = risk_order.get(self.max_risk_without_approval, 1)
        
        if current_risk > max_risk:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message=f"Action with '{context.risk_level}' risk level requires approval",
                severity="warning",  # Warning, not error - approval can override
                details={
                    "risk_level": context.risk_level,
                    "max_without_approval": self.max_risk_without_approval,
                },
            )
        
        return None


# =============================================================================
# Rate Limit Rules
# =============================================================================

@dataclass
class RateLimitRule(PolicyRule):
    """
    Rate limit rule.
    
    Enforces rate limits on AI actions.
    """
    max_requests_per_minute: int = 60
    max_requests_per_hour: int = 1000
    
    def __post_init__(self):
        object.__setattr__(self, 'rule_type', PolicyRuleType.RATE_LIMIT)
    
    def evaluate(self, context: PolicyContext) -> Optional[PolicyViolation]:
        """Check rate limits."""
        # Rate limit checking would typically involve a cache/counter
        # This is a placeholder - actual implementation would check Redis/cache
        current_rate = context.metadata.get("current_request_rate", 0)
        
        if current_rate > self.max_requests_per_minute:
            return PolicyViolation(
                rule_id=self.rule_id,
                rule_type=self.rule_type,
                message=f"Rate limit exceeded: {current_rate}/{self.max_requests_per_minute} requests per minute",
                severity="error",
                details={
                    "current_rate": current_rate,
                    "limit": self.max_requests_per_minute,
                },
            )
        
        return None


# =============================================================================
# Default Rules Configuration
# =============================================================================

DEFAULT_RULES = [
    # Tenant isolation
    TenantIsolationRule(
        rule_id="tenant_isolation",
        version="1.0.0",
        description="Enforce tenant isolation for all AI actions",
        priority=10,
        allow_cross_tenant=False,
    ),
    
    # Risk threshold
    RiskThresholdRule(
        rule_id="risk_threshold_approval",
        version="1.0.0",
        description="Require approval for high/critical risk actions",
        priority=20,
        max_risk_without_approval="medium",
    ),
    
    # Block critical risk without admin
    RBACRule(
        rule_id="critical_risk_admin_only",
        version="1.0.0",
        description="Critical risk actions require admin role",
        priority=15,
        required_roles={"admin", "super_admin"},
        action_pattern="*",
    ),
]


def load_rules_from_config(config: Optional[Dict] = None) -> None:
    """
    Load policy rules from configuration.
    
    Args:
        config: Optional configuration dict. If None, loads defaults.
    """
    engine = get_policy_engine()
    
    if config is None:
        # Load default rules
        for rule in DEFAULT_RULES:
            engine.register_rule(rule)
        logger.info(f"Loaded {len(DEFAULT_RULES)} default policy rules")
        return
    
    # Load from config
    rules_config = config.get("rules", [])
    for rule_config in rules_config:
        rule_type = rule_config.get("type")
        
        if rule_type == "rbac":
            rule = RBACRule(
                rule_id=rule_config["rule_id"],
                version=rule_config.get("version", "1.0.0"),
                description=rule_config.get("description", ""),
                enabled=rule_config.get("enabled", True),
                priority=rule_config.get("priority", 100),
                required_permissions=set(rule_config.get("required_permissions", [])),
                required_roles=set(rule_config.get("required_roles", [])),
                action_pattern=rule_config.get("action_pattern", "*"),
            )
        elif rule_type == "compliance":
            rule = ComplianceRule(
                rule_id=rule_config["rule_id"],
                version=rule_config.get("version", "1.0.0"),
                description=rule_config.get("description", ""),
                enabled=rule_config.get("enabled", True),
                priority=rule_config.get("priority", 100),
                blocked_actions=set(rule_config.get("blocked_actions", [])),
                blocked_resources=set(rule_config.get("blocked_resources", [])),
                compliance_type=rule_config.get("compliance_type", "general"),
            )
        elif rule_type == "risk_threshold":
            rule = RiskThresholdRule(
                rule_id=rule_config["rule_id"],
                version=rule_config.get("version", "1.0.0"),
                description=rule_config.get("description", ""),
                enabled=rule_config.get("enabled", True),
                priority=rule_config.get("priority", 100),
                max_risk_without_approval=rule_config.get("max_risk_without_approval", "medium"),
                blocked_risk_levels=set(rule_config.get("blocked_risk_levels", [])),
            )
        else:
            logger.warning(f"Unknown rule type: {rule_type}")
            continue
        
        engine.register_rule(rule)
    
    logger.info(f"Loaded {len(rules_config)} policy rules from config")


def initialize_default_rules() -> None:
    """Initialize the policy engine with default rules."""
    load_rules_from_config(None)
