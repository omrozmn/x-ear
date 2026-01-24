from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict
from schemas.base import to_camel
from ai.capability_registry import Capability

class EntityItem(BaseModel):
    """Represents a searchable entity in the system."""
    id: str = Field(description="Unique identifier of the entity")
    type: Literal["patient", "device", "invoice", "user", "supplier"] = Field(description="Type of the entity")
    label: str = Field(description="Primary display text (e.g. Name)")
    sub_label: Optional[str] = Field(default=None, description="Secondary text (e.g. Phone, ID, Code)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional context data")

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

class AutocompleteRequest(BaseModel):
    """Request params for autocomplete."""
    q: str = Field(min_length=1, description="Search query")
    context_entity_type: Optional[str] = Field(default=None, description="Filter by active context type")
    context_entity_id: Optional[str] = Field(default=None, description="ID of the active context entity")

class AutocompleteResponse(BaseModel):
    """Response containing entities and context-aware actions."""
    entities: List[EntityItem] = Field(default_factory=list, description="Matching entities")
    actions: List[Capability] = Field(default_factory=list, description="Available actions based on context")
    
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

class ExecuteRequest(BaseModel):
    """Request to execute a tool/capability."""
    tool_id: str = Field(description="ID of the tool to execute")
    args: Dict[str, Any] = Field(description="Arguments for the tool")
    dry_run: bool = Field(default=False, description="If true, only calculates impact without executing")
    confirmed: bool = Field(default=False, description="Must be true for final execution (unless dry_run)")

class ImpactMetric(BaseModel):
    """Represents a change in a system metric."""
    label: str = Field(description="Metric name (e.g. 'Stock Level')")
    value: str = Field(description="Current or new value")
    delta: Optional[str] = Field(default=None, description="Change amount (e.g. '+1', '-500 TL')")
    sentiment: Literal["positive", "negative", "neutral"] = Field(default="neutral", description="Visual sentiment")

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

class ExecuteResponse(BaseModel):
    """Result of an execution request."""
    status: Literal["success", "error", "dry_run"] = Field(description="Execution status")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Tool execution result data")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    audit_id: Optional[str] = Field(default=None, description="Trace ID for the operation")
    impact_delta: List[ImpactMetric] = Field(default_factory=list, description="Projected or actual impact metrics")

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
