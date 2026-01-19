"""
AI Tool Allowlist

Defines the initial set of allowlisted tools for AI agents.
All tools must be explicitly registered here to be callable.

Requirements:
- 5.1: AI can only call allowlisted Tool API endpoints
- 5.4: Tools have simulate/execute modes
- 21.1: Dry-run mode for testing
"""

from typing import Any, Dict
from ai.tools import (
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
    register_tool,
)


# =============================================================================
# Feature Flag Tools
# =============================================================================

@register_tool(
    tool_id="feature_flag_toggle",
    name="Toggle Feature Flag",
    description="Enable or disable a feature flag for a tenant",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="flag_name",
            type="string",
            description="Name of the feature flag",
            required=True,
        ),
        ToolParameter(
            name="enabled",
            type="boolean",
            description="Whether to enable or disable the flag",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to apply the change to",
            required=True,
        ),
    ],
    returns="Updated feature flag status",
    requires_approval=False,
    requires_permissions=["feature_flags:write"],
)
def feature_flag_toggle(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Toggle a feature flag."""
    flag_name = params["flag_name"]
    enabled = params["enabled"]
    tenant_id = params["tenant_id"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="feature_flag_toggle",
            success=True,
            mode=mode,
            simulated_changes={
                "flag_name": flag_name,
                "tenant_id": tenant_id,
                "old_value": not enabled,  # Simulated
                "new_value": enabled,
            },
        )
    
    # In execute mode, would actually toggle the flag
    # For now, return simulated success
    return ToolExecutionResult(
        tool_id="feature_flag_toggle",
        success=True,
        mode=mode,
        result={
            "flag_name": flag_name,
            "tenant_id": tenant_id,
            "enabled": enabled,
        },
    )


# =============================================================================
# Tenant Configuration Tools
# =============================================================================

@register_tool(
    tool_id="tenant_config_update",
    name="Update Tenant Configuration",
    description="Update a configuration value for a tenant",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="config_key",
            type="string",
            description="Configuration key to update",
            required=True,
        ),
        ToolParameter(
            name="config_value",
            type="string",
            description="New configuration value",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to apply the change to",
            required=True,
        ),
    ],
    returns="Updated configuration status",
    requires_approval=False,
    requires_permissions=["tenant_config:write"],
)
def tenant_config_update(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Update tenant configuration."""
    config_key = params["config_key"]
    config_value = params["config_value"]
    tenant_id = params["tenant_id"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="tenant_config_update",
            success=True,
            mode=mode,
            simulated_changes={
                "config_key": config_key,
                "tenant_id": tenant_id,
                "old_value": "[current_value]",  # Would fetch actual value
                "new_value": config_value,
            },
        )
    
    return ToolExecutionResult(
        tool_id="tenant_config_update",
        success=True,
        mode=mode,
        result={
            "config_key": config_key,
            "tenant_id": tenant_id,
            "value": config_value,
        },
    )


# =============================================================================
# Report Generation Tools
# =============================================================================

@register_tool(
    tool_id="report_generate",
    name="Generate Report",
    description="Generate a report based on specified parameters",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="report_type",
            type="string",
            description="Type of report to generate",
            required=True,
            enum=["sales", "inventory", "customers", "financial"],
        ),
        ToolParameter(
            name="date_from",
            type="string",
            description="Start date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="date_to",
            type="string",
            description="End date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID for the report",
            required=True,
        ),
        ToolParameter(
            name="format",
            type="string",
            description="Output format",
            required=False,
            default="json",
            enum=["json", "csv", "pdf"],
        ),
    ],
    returns="Report data or download URL",
    requires_approval=False,
    requires_permissions=["reports:read"],
)
def report_generate(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Generate a report."""
    report_type = params["report_type"]
    date_from = params["date_from"]
    date_to = params["date_to"]
    tenant_id = params["tenant_id"]
    output_format = params.get("format", "json")
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="report_generate",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "generate_report",
                "report_type": report_type,
                "date_range": f"{date_from} to {date_to}",
                "tenant_id": tenant_id,
                "format": output_format,
                "estimated_rows": 1000,  # Simulated
            },
        )
    
    return ToolExecutionResult(
        tool_id="report_generate",
        success=True,
        mode=mode,
        result={
            "report_type": report_type,
            "tenant_id": tenant_id,
            "status": "generated",
            "download_url": f"/api/reports/{tenant_id}/{report_type}/download",
        },
    )


# =============================================================================
# Read-Only Tools
# =============================================================================

@register_tool(
    tool_id="tenant_info_get",
    name="Get Tenant Information",
    description="Retrieve information about a tenant",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to retrieve",
            required=True,
        ),
    ],
    returns="Tenant information",
    requires_approval=False,
    requires_permissions=["tenant:read"],
)
def tenant_info_get(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get tenant information."""
    tenant_id = params["tenant_id"]
    
    # Read-only tool, same behavior in both modes
    return ToolExecutionResult(
        tool_id="tenant_info_get",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "name": f"Tenant {tenant_id}",  # Would fetch actual data
            "status": "active",
            "plan": "professional",
        },
    )


@register_tool(
    tool_id="feature_flags_list",
    name="List Feature Flags",
    description="List all feature flags for a tenant",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
    ],
    returns="List of feature flags",
    requires_approval=False,
    requires_permissions=["feature_flags:read"],
)
def feature_flags_list(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List feature flags."""
    tenant_id = params["tenant_id"]
    
    return ToolExecutionResult(
        tool_id="feature_flags_list",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "flags": [
                {"name": "ai_chat_enabled", "enabled": True},
                {"name": "new_dashboard", "enabled": False},
            ],
        },
    )


# =============================================================================
# High-Risk Tools (Require Approval)
# =============================================================================

@register_tool(
    tool_id="tenant_plan_upgrade",
    name="Upgrade Tenant Plan",
    description="Upgrade a tenant's subscription plan",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.HIGH,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
        ToolParameter(
            name="new_plan",
            type="string",
            description="New plan to upgrade to",
            required=True,
            enum=["starter", "professional", "enterprise"],
        ),
    ],
    returns="Upgrade status",
    requires_approval=True,  # High-risk, requires approval
    requires_permissions=["tenant:admin"],
)
def tenant_plan_upgrade(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Upgrade tenant plan."""
    tenant_id = params["tenant_id"]
    new_plan = params["new_plan"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="tenant_plan_upgrade",
            success=True,
            mode=mode,
            simulated_changes={
                "tenant_id": tenant_id,
                "old_plan": "professional",  # Would fetch actual
                "new_plan": new_plan,
                "billing_impact": "Prorated charge will apply",
            },
        )
    
    return ToolExecutionResult(
        tool_id="tenant_plan_upgrade",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "plan": new_plan,
            "status": "upgraded",
        },
    )


# =============================================================================
# Notification Tools
# =============================================================================

@register_tool(
    tool_id="notification_send",
    name="Send Notification",
    description="Send a notification to users",
    category=ToolCategory.NOTIFICATION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
        ToolParameter(
            name="user_ids",
            type="array",
            description="List of user IDs to notify",
            required=True,
        ),
        ToolParameter(
            name="message",
            type="string",
            description="Notification message",
            required=True,
        ),
        ToolParameter(
            name="channel",
            type="string",
            description="Notification channel",
            required=False,
            default="in_app",
            enum=["in_app", "email", "sms"],
        ),
    ],
    returns="Notification status",
    requires_approval=False,
    requires_permissions=["notifications:write"],
)
def notification_send(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Send notification."""
    tenant_id = params["tenant_id"]
    user_ids = params["user_ids"]
    message = params["message"]
    channel = params.get("channel", "in_app")
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="notification_send",
            success=True,
            mode=mode,
            simulated_changes={
                "tenant_id": tenant_id,
                "recipients": len(user_ids),
                "channel": channel,
                "message_preview": message[:50] + "..." if len(message) > 50 else message,
            },
        )
    
    return ToolExecutionResult(
        tool_id="notification_send",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "sent_to": len(user_ids),
            "channel": channel,
            "status": "sent",
        },
    )


def initialize_allowlist():
    """
    Initialize the tool allowlist.
    
    This function is called on module import to register all tools.
    Tools are registered via the @register_tool decorator.
    """
    # Tools are already registered via decorators
    # This function exists for explicit initialization if needed
    pass


# Auto-initialize on import
initialize_allowlist()
