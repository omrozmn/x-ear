"""
AI Layer Tool API Framework

Provides the Tool API for AI agents to interact with the system.
All tools are allowlisted and have defined schemas with versioning.

Requirements:
- 5.1: AI can only call allowlisted Tool API endpoints
- 5.2: Each tool has a defined schema
- 5.3: Tools are versioned
- 27.1: Each tool has a schema_version
- 27.2: Action plans record tool_schema_versions
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Type
from pydantic import BaseModel
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk level for tool operations."""
    LOW = "low"           # Read-only, no side effects
    MEDIUM = "medium"     # Reversible changes
    HIGH = "high"         # Significant changes, requires approval
    CRITICAL = "critical" # Irreversible changes, requires admin approval


class ToolCategory(str, Enum):
    """Categories of tools."""
    READ = "read"           # Read-only operations
    CONFIG = "config"       # Configuration changes
    REPORT = "report"       # Report generation
    NOTIFICATION = "notification"  # Notifications
    ADMIN = "admin"         # Administrative operations


@dataclass
class ToolParameter:
    """Definition of a tool parameter."""
    name: str
    type: str  # "string", "integer", "boolean", "array", "object"
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[List[str]] = None


@dataclass
class ToolDefinition:
    """
    Definition of an AI-callable tool.
    
    Attributes:
        tool_id: Unique identifier for the tool
        name: Human-readable name
        description: What the tool does
        category: Tool category
        risk_level: Risk level of the tool
        schema_version: Version of the tool schema (semver)
        parameters: List of parameters
        returns: Description of return value
        requires_approval: Whether tool requires approval
        requires_permissions: List of required permissions
        created_at: When the tool was defined
    """
    tool_id: str
    name: str
    description: str
    category: ToolCategory
    risk_level: RiskLevel
    schema_version: str
    parameters: List[ToolParameter] = field(default_factory=list)
    returns: str = ""
    requires_approval: bool = False
    requires_permissions: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def compute_schema_hash(self) -> str:
        """Compute hash of the tool schema for drift detection."""
        schema_data = {
            "tool_id": self.tool_id,
            "schema_version": self.schema_version,
            "parameters": [
                {
                    "name": p.name,
                    "type": p.type,
                    "required": p.required,
                    "enum": p.enum,
                }
                for p in self.parameters
            ],
        }
        schema_json = json.dumps(schema_data, sort_keys=True)
        return hashlib.sha256(schema_json.encode()).hexdigest()
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "toolId": self.tool_id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "riskLevel": self.risk_level.value,
            "schemaVersion": self.schema_version,
            "parameters": [
                {
                    "name": p.name,
                    "type": p.type,
                    "description": p.description,
                    "required": p.required,
                    "default": p.default,
                    "enum": p.enum,
                }
                for p in self.parameters
            ],
            "returns": self.returns,
            "requiresApproval": self.requires_approval,
            "requiresPermissions": self.requires_permissions,
        }
    
    def to_llm_description(self) -> str:
        """Generate description for LLM consumption."""
        params_desc = []
        for p in self.parameters:
            req = "required" if p.required else "optional"
            enum_str = f", one of: {p.enum}" if p.enum else ""
            params_desc.append(f"  - {p.name} ({p.type}, {req}): {p.description}{enum_str}")
        
        params_str = "\n".join(params_desc) if params_desc else "  (no parameters)"
        
        return f"""Tool: {self.name}
ID: {self.tool_id}
Description: {self.description}
Risk Level: {self.risk_level.value}
Parameters:
{params_str}
Returns: {self.returns}"""


class ToolExecutionMode(str, Enum):
    """Execution mode for tools."""
    SIMULATE = "simulate"  # Dry-run, no side effects
    EXECUTE = "execute"    # Actually execute


@dataclass
class ToolExecutionResult:
    """Result of a tool execution."""
    tool_id: str
    success: bool
    mode: ToolExecutionMode
    result: Any = None
    error: Optional[str] = None
    simulated_changes: Optional[Dict] = None
    execution_time_ms: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "toolId": self.tool_id,
            "success": self.success,
            "mode": self.mode.value,
            "result": self.result,
            "error": self.error,
            "simulatedChanges": self.simulated_changes,
            "executionTimeMs": self.execution_time_ms,
        }


class ToolNotFoundError(Exception):
    """Raised when a tool is not found in the registry."""
    def __init__(self, tool_id: str):
        self.tool_id = tool_id
        super().__init__(f"Tool not found: {tool_id}")


class ToolNotAllowedError(Exception):
    """Raised when a tool is not in the allowlist."""
    def __init__(self, tool_id: str, reason: str = "not in allowlist"):
        self.tool_id = tool_id
        self.reason = reason
        super().__init__(f"Tool not allowed: {tool_id} ({reason})")


class ToolSchemaDriftError(Exception):
    """Raised when tool schema has drifted from expected version."""
    def __init__(self, tool_id: str, expected_version: str, actual_version: str):
        self.tool_id = tool_id
        self.expected_version = expected_version
        self.actual_version = actual_version
        super().__init__(
            f"Tool schema drift detected for '{tool_id}': "
            f"expected v{expected_version}, got v{actual_version}"
        )


class ToolValidationError(Exception):
    """Raised when tool parameters fail validation."""
    def __init__(self, tool_id: str, errors: List[str]):
        self.tool_id = tool_id
        self.errors = errors
        super().__init__(f"Tool validation failed for '{tool_id}': {', '.join(errors)}")


# Type alias for tool handler functions
ToolHandler = Callable[[Dict[str, Any], ToolExecutionMode], ToolExecutionResult]


class ToolRegistry:
    """
    Registry for AI-callable tools.
    
    Manages tool definitions, allowlist, and execution.
    """
    
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._handlers: Dict[str, ToolHandler] = {}
        self._allowlist: set = set()
        self._schema_hashes: Dict[str, str] = {}  # tool_id -> schema_hash
    
    def register_tool(
        self,
        definition: ToolDefinition,
        handler: ToolHandler,
        allowed: bool = True,
    ) -> None:
        """
        Register a tool with its handler.
        
        Args:
            definition: Tool definition
            handler: Function to execute the tool
            allowed: Whether to add to allowlist
        """
        self._tools[definition.tool_id] = definition
        self._handlers[definition.tool_id] = handler
        self._schema_hashes[definition.tool_id] = definition.compute_schema_hash()
        
        if allowed:
            self._allowlist.add(definition.tool_id)
        
        # logger.info(f"Registered tool: {definition.tool_id} v{definition.schema_version}")
    
    def get_tool(self, tool_id: str) -> ToolDefinition:
        """Get a tool definition by ID."""
        if tool_id not in self._tools:
            raise ToolNotFoundError(tool_id)
        return self._tools[tool_id]
    
    def is_allowed(self, tool_id: str) -> bool:
        """Check if a tool is in the allowlist."""
        return tool_id in self._allowlist
    
    def check_schema_drift(
        self,
        tool_id: str,
        expected_version: str,
    ) -> bool:
        """
        Check if tool schema has drifted from expected version.
        
        Args:
            tool_id: Tool identifier
            expected_version: Expected schema version
            
        Returns:
            True if schema matches, False if drifted
            
        Raises:
            ToolNotFoundError: If tool not found
        """
        tool = self.get_tool(tool_id)
        return tool.schema_version == expected_version
    
    def validate_parameters(
        self,
        tool_id: str,
        parameters: Dict[str, Any],
    ) -> List[str]:
        """
        Validate parameters against tool schema.
        
        Args:
            tool_id: Tool identifier
            parameters: Parameters to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        tool = self.get_tool(tool_id)
        errors = []
        
        # Check required parameters
        for param in tool.parameters:
            if param.required and param.name not in parameters and param.default is None:
                errors.append(f"Missing required parameter: {param.name}")
            
            if param.name in parameters:
                value = parameters[param.name]
                
                # Type checking
                if param.type == "string" and not isinstance(value, str):
                    errors.append(f"Parameter '{param.name}' must be string")
                elif param.type == "integer" and not isinstance(value, int):
                    errors.append(f"Parameter '{param.name}' must be integer")
                elif param.type == "boolean" and not isinstance(value, bool):
                    errors.append(f"Parameter '{param.name}' must be boolean")
                elif param.type == "array" and not isinstance(value, list):
                    errors.append(f"Parameter '{param.name}' must be array")
                elif param.type == "object" and not isinstance(value, dict):
                    errors.append(f"Parameter '{param.name}' must be object")
                
                # Enum checking
                if param.enum and value not in param.enum:
                    errors.append(f"Parameter '{param.name}' must be one of: {param.enum}")
        
        # Check for unknown parameters
        known_params = {p.name for p in tool.parameters}
        for param_name in parameters:
            if param_name not in known_params:
                errors.append(f"Unknown parameter: {param_name}")
        
        return errors
    
    def execute_tool(
        self,
        tool_id: str,
        parameters: Dict[str, Any],
        mode: ToolExecutionMode = ToolExecutionMode.SIMULATE,
        expected_schema_version: Optional[str] = None,
    ) -> ToolExecutionResult:
        """
        Execute a tool.
        
        Args:
            tool_id: Tool identifier
            parameters: Tool parameters
            mode: Execution mode (simulate or execute)
            expected_schema_version: Expected schema version for drift detection
            
        Returns:
            Execution result
            
        Raises:
            ToolNotFoundError: If tool not found
            ToolNotAllowedError: If tool not in allowlist
            ToolSchemaDriftError: If schema has drifted
            ToolValidationError: If parameters invalid
        """
        import time
        start_time = time.time()
        
        # Check allowlist
        if not self.is_allowed(tool_id):
            raise ToolNotAllowedError(tool_id)
        
        tool = self.get_tool(tool_id)
        
        # Check schema drift
        if expected_schema_version and not self.check_schema_drift(tool_id, expected_schema_version):
            raise ToolSchemaDriftError(tool_id, expected_schema_version, tool.schema_version)
        
        # Validate parameters
        errors = self.validate_parameters(tool_id, parameters)
        if errors:
            raise ToolValidationError(tool_id, errors)
        
        # Apply defaults
        final_params = parameters.copy()
        for param in tool.parameters:
            if param.name not in final_params and param.default is not None:
                final_params[param.name] = param.default

        # Execute handler
        handler = self._handlers[tool_id]
        try:
            result = handler(final_params, mode)
            result.execution_time_ms = (time.time() - start_time) * 1000
            return result
        except Exception as e:
            logger.error(f"Tool execution failed: {tool_id} - {e}")
            return ToolExecutionResult(
                tool_id=tool_id,
                success=False,
                mode=mode,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000,
            )
    
    def list_tools(self, allowed_only: bool = True) -> List[Dict]:
        """List all registered tools."""
        tools = []
        for tool_id, tool in self._tools.items():
            if allowed_only and tool_id not in self._allowlist:
                continue
            tools.append(tool.to_dict())
        return tools
    
    def get_tool_descriptions_for_llm(self, allowed_only: bool = True) -> str:
        """Get tool descriptions formatted for LLM consumption."""
        descriptions = []
        for tool_id, tool in self._tools.items():
            if allowed_only and tool_id not in self._allowlist:
                continue
            descriptions.append(tool.to_llm_description())
        return "\n\n---\n\n".join(descriptions)
    
    def get_schema_versions(self, tool_ids: List[str]) -> Dict[str, str]:
        """Get schema versions for a list of tools."""
        versions = {}
        for tool_id in tool_ids:
            if tool_id in self._tools:
                versions[tool_id] = self._tools[tool_id].schema_version
        return versions


# Global registry instance
_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get the global tool registry instance."""
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry


# Decorator for registering tools
def register_tool(
    tool_id: str,
    name: str,
    description: str,
    category: ToolCategory,
    risk_level: RiskLevel,
    schema_version: str,
    parameters: Optional[List[ToolParameter]] = None,
    returns: str = "",
    requires_approval: bool = False,
    requires_permissions: Optional[List[str]] = None,
    allowed: bool = True,
):
    """Decorator to register a function as a tool."""
    def decorator(func: ToolHandler) -> ToolHandler:
        definition = ToolDefinition(
            tool_id=tool_id,
            name=name,
            description=description,
            category=category,
            risk_level=risk_level,
            schema_version=schema_version,
            parameters=parameters or [],
            returns=returns,
            requires_approval=requires_approval,
            requires_permissions=requires_permissions or [],
        )
        get_tool_registry().register_tool(definition, func, allowed)
        return func
    return decorator

# Auto-initialize on import
# Imports must be at the end to avoid circular imports since allowlist/crm_tools need ToolParameter etc.
try:
    from ai.tools import allowlist
    from ai.tools import crm_tools
    from ai.tools import sales_tools
    from ai.tools import device_tools
    from ai.tools import appointment_tools
except ImportError:
    # Handle partial initialization or circular import gracefully during development
    pass

__all__ = [
    "RiskLevel",
    "ToolCategory",
    "ToolParameter",
    "ToolDefinition",
    "ToolExecutionMode",
    "ToolExecutionResult",
    "ToolNotFoundError",
    "ToolNotAllowedError",
    "ToolSchemaDriftError",
    "ToolValidationError",
    "ToolRegistry",
    "get_tool_registry",
    "register_tool",
]
