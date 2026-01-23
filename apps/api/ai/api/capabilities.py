"""
AI Capabilities Endpoint

GET /ai/capabilities - List available AI capabilities

Returns a list of AI capabilities filtered by user permissions and AI phase.
Provides transparency about what the AI can do.

Requirements:
- 5.1: Provide GET endpoint /ai/capabilities
- 5.3: Return structured list of capabilities grouped by category
- 5.4: Filter based on user's role permissions
- 5.6: Return capabilities in ResponseEnvelope format with camelCase
- 5.7: Filter based on AI_PHASE (A=read-only, B/C=all)
- 5.8: Document that AI actions are mediated through Tool APIs
"""

import logging
from typing import List, Dict
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, ConfigDict

from schemas.base import ResponseEnvelope, to_camel
from ai.config import get_ai_config
from ai.capability_registry import (
    Capability,
    get_all_capabilities,
    get_capabilities_by_category,
    filter_capabilities_by_permissions,
    filter_capabilities_by_phase,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Capabilities"])


# =============================================================================
# Response Models
# =============================================================================

class CapabilitiesResponse(BaseModel):
    """Response containing available AI capabilities."""
    
    capabilities: List[Capability] = Field(
        description="List of available AI capabilities"
    )
    capabilities_by_category: Dict[str, List[Capability]] = Field(
        description="Capabilities grouped by category"
    )
    ai_phase: str = Field(
        description="Current AI phase (A=read-only, B=proposal, C=execution)"
    )
    disclaimer: str = Field(
        description="Disclaimer about AI capabilities"
    )
    
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )


# =============================================================================
# Helper Functions
# =============================================================================

def _load_capability_registry() -> List[Capability]:
    """
    Load all capability definitions from registry.
    
    Returns:
        List of all defined capabilities
    """
    return get_all_capabilities()


def _user_has_permission(required_permissions: List[str], user_permissions: List[str]) -> bool:
    """
    Check if user has all required permissions.
    
    Args:
        required_permissions: Permissions required for a capability
        user_permissions: Permissions the user has
        
    Returns:
        True if user has all required permissions, False otherwise
    """
    return all(perm in user_permissions for perm in required_permissions)


def _capability_allowed_in_phase(capability: Capability, ai_phase: str) -> bool:
    """
    Check if capability is allowed in the current AI phase.
    
    Phase A (read-only): Only read operations
    Phase B/C: All operations
    
    Args:
        capability: Capability to check
        ai_phase: Current AI phase ("A", "B", or "C")
        
    Returns:
        True if capability is allowed in current phase
    """
    if ai_phase.upper() != "A":
        # Phases B and C allow all capabilities
        return True
    
    # Phase A: Only read operations
    is_read_only = all(
        perm.endswith(".view") or perm.endswith(".read")
        for perm in capability.required_permissions
    )
    
    return is_read_only


def _format_capabilities_for_chat(capabilities: List[Capability]) -> str:
    """
    Format capabilities list for chat response.
    
    Args:
        capabilities: List of capabilities to format
        
    Returns:
        Formatted string suitable for chat response
    """
    if not capabilities:
        return "Şu anda kullanabileceğiniz bir yetenek bulunmamaktadır. Lütfen yöneticinizle iletişime geçin."
    
    # Group by category
    by_category: Dict[str, List[Capability]] = {}
    for cap in capabilities:
        if cap.category not in by_category:
            by_category[cap.category] = []
        by_category[cap.category].append(cap)
    
    # Format as text
    lines = ["Size yardımcı olabileceğim konular:\n"]
    
    for category, caps in by_category.items():
        lines.append(f"\n**{category}:**")
        for cap in caps:
            lines.append(f"- {cap.name}: {cap.description}")
            if cap.example_phrases:
                example = cap.example_phrases[0]
                lines.append(f"  Örnek: \"{example}\"")
    
    lines.append("\n*Not: Tüm AI işlemleri güvenli API'ler aracılığıyla gerçekleştirilir.*")
    
    return "\n".join(lines)


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/capabilities", response_model=ResponseEnvelope[CapabilitiesResponse])
async def get_capabilities(request: Request):
    """
    Get available AI capabilities.
    
    Returns a list of AI capabilities filtered by:
    - User's role permissions (from JWT token)
    - Current AI phase (A=read-only, B/C=all operations)
    
    The response includes:
    - Flat list of capabilities
    - Capabilities grouped by category
    - Current AI phase
    - Disclaimer about AI operation
    
    Args:
        request: FastAPI request object (contains user context from middleware)
        
    Returns:
        ResponseEnvelope containing capabilities list
    """
    # Get user permissions from request state (set by JWT middleware)
    # For now, we'll use a default set if not available
    # TODO: Once JWT middleware is fully integrated, this will come from request.state.user_permissions
    user_permissions = getattr(request.state, "user_permissions", [
        "parties.view",
        "parties.create",
        "parties.edit",
        "sales.view",
        "devices.view",
        "appointments.view",
        "reports.view",
    ])
    
    # Get current AI phase
    config = get_ai_config()
    ai_phase = config.phase.name  # "A", "B", or "C"
    
    # Load all capabilities
    all_capabilities = _load_capability_registry()
    
    # Filter by user permissions
    permitted_capabilities = filter_capabilities_by_permissions(
        all_capabilities,
        user_permissions
    )
    
    # Filter by AI phase
    phase_filtered_capabilities = filter_capabilities_by_phase(
        permitted_capabilities,
        ai_phase
    )
    
    # Group by category
    capabilities_by_category = {}
    for cap in phase_filtered_capabilities:
        if cap.category not in capabilities_by_category:
            capabilities_by_category[cap.category] = []
        capabilities_by_category[cap.category].append(cap)
    
    # Create response
    response_data = CapabilitiesResponse(
        capabilities=phase_filtered_capabilities,
        capabilities_by_category=capabilities_by_category,
        ai_phase=ai_phase,
        disclaimer="AI actions are always mediated through allow-listed Tool APIs and are not autonomous."
    )
    
    logger.info(
        f"Capabilities endpoint called",
        extra={
            "tenant_id": getattr(request.state, "tenant_id", None),
            "user_id": getattr(request.state, "user_id", None),
            "ai_phase": ai_phase,
            "total_capabilities": len(all_capabilities),
            "filtered_capabilities": len(phase_filtered_capabilities),
        }
    )
    
    return ResponseEnvelope(
        success=True,
        data=response_data
    )
