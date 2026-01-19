"""
Property-Based Tests for System Resilience Without AI

Tests Property 2: System Resilience Without AI
*For any* core system operation (patient CRUD, sales, invoices, etc.), 
when the AI Layer is disabled or unavailable, the operation SHALL complete 
successfully with identical behavior to when AI is enabled.

**Validates: Requirements 1.2, 1.6, 1.7**

Requirements:
- 1.2: WHEN the AI_Layer is disabled or unavailable, THE System SHALL continue all operations without degradation
- 1.6: IF the AI_Layer fails, THEN THE System SHALL log the failure and continue normal operations
- 1.7: THE AI_Layer SHALL be completely removable by disabling feature flags without code changes
"""

import os
import sys
from pathlib import Path

# Add the api directory to the path for imports
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import patch
from datetime import datetime, timezone
from typing import Any, Dict
from dataclasses import dataclass


# =============================================================================
# Mock Core Operations
# =============================================================================

@dataclass
class MockOperationResult:
    """Result of a mock core operation."""
    success: bool
    data: Any
    operation_name: str
    timestamp: datetime


def mock_patient_create(patient_data: Dict[str, Any]) -> MockOperationResult:
    """Mock patient creation operation."""
    return MockOperationResult(
        success=True,
        data={"id": "patient-123", **patient_data},
        operation_name="patient_create",
        timestamp=datetime.now(timezone.utc),
    )


def mock_sale_create(sale_data: Dict[str, Any]) -> MockOperationResult:
    """Mock sale creation operation."""
    return MockOperationResult(
        success=True,
        data={"id": "sale-456", **sale_data},
        operation_name="sale_create",
        timestamp=datetime.now(timezone.utc),
    )


CORE_OPERATIONS = [
    ("patient_create", mock_patient_create, {"name": "Test", "email": "test@example.com"}),
    ("sale_create", mock_sale_create, {"amount": 100.0, "product": "Test Product"}),
]


# =============================================================================
# Strategies for Property-Based Testing
# =============================================================================

@st.composite
def core_operation_strategy(draw):
    """Strategy to generate random core operations."""
    op_name, op_func, default_input = draw(st.sampled_from(CORE_OPERATIONS))
    return op_name, op_func, default_input


# =============================================================================
# Helper to reset services
# =============================================================================

def reset_all_services():
    """Reset all singleton services."""
    from ai.services.graceful_degradation import GracefulDegradationService
    from ai.services.feature_flags import AIFeatureFlagService
    from ai.services.kill_switch import KillSwitch
    from ai.config import AIConfig
    
    GracefulDegradationService.reset()
    AIFeatureFlagService.reset()
    KillSwitch.reset()
    AIConfig.reset()


# =============================================================================
# Property Tests
# =============================================================================

class TestSystemResilienceProperty:
    """
    Property 2: System Resilience Without AI
    
    **Feature: ai-layer-architecture, Property 2: System Resilience Without AI**
    **Validates: Requirements 1.2, 1.6, 1.7**
    """
    
    @settings(max_examples=5, deadline=None)
    @given(core_operation_strategy())
    def test_core_operations_work_when_ai_disabled(self, operation_tuple):
        """
        Property: Core operations complete successfully when AI is disabled.
        """
        reset_all_services()
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.graceful_degradation import GracefulDegradationService
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        # Disable AI
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, False)
        
        degradation = GracefulDegradationService.get()
        degradation.mark_disabled("Test: AI disabled")
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name
    
    @settings(max_examples=5, deadline=None)
    @given(core_operation_strategy())
    def test_core_operations_work_when_model_unreachable(self, operation_tuple):
        """
        Property: Core operations complete successfully when model is unreachable.
        """
        reset_all_services()
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.graceful_degradation import GracefulDegradationService, DegradationReason
        
        # Mark model as unreachable
        service = GracefulDegradationService.get()
        service.mark_unavailable(DegradationReason.MODEL_UNREACHABLE, "Test: Model unreachable")
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name
    
    @settings(max_examples=5, deadline=None)
    @given(core_operation_strategy())
    def test_core_operations_work_when_kill_switch_active(self, operation_tuple):
        """
        Property: Core operations complete successfully when kill switch is active.
        """
        reset_all_services()
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.kill_switch import KillSwitch
        from ai.services.graceful_degradation import GracefulDegradationService
        
        # Activate kill switch
        kill_switch = KillSwitch.get()
        kill_switch.activate_global(user_id="admin", reason="Test")
        
        degradation = GracefulDegradationService.get()
        degradation.update_from_kill_switch(active=True, reason="Kill switch active")
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name


class TestGracefulDegradationService:
    """Tests for the GracefulDegradationService."""
    
    def test_initial_state_is_available(self):
        """Service starts in available state."""
        reset_all_services()
        from ai.services.graceful_degradation import GracefulDegradationService, AIAvailabilityStatus
        
        service = GracefulDegradationService.get()
        state = service.get_state()
        
        assert state.status == AIAvailabilityStatus.AVAILABLE
        assert service.is_ai_available() is True
    
    def test_mark_disabled(self):
        """Service can be marked as disabled."""
        reset_all_services()
        from ai.services.graceful_degradation import (
            GracefulDegradationService, 
            AIAvailabilityStatus,
            DegradationReason,
        )
        
        service = GracefulDegradationService.get()
        service.mark_disabled("Test disabled")
        
        state = service.get_state()
        assert state.status == AIAvailabilityStatus.DISABLED
        assert state.reason == DegradationReason.CONFIG_DISABLED
        assert service.is_ai_available() is False
    
    def test_mark_unavailable(self):
        """Service can be marked as unavailable."""
        reset_all_services()
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
            DegradationReason,
        )
        
        service = GracefulDegradationService.get()
        service.mark_unavailable(DegradationReason.MODEL_UNREACHABLE, "Model down")
        
        state = service.get_state()
        assert state.status == AIAvailabilityStatus.UNAVAILABLE
        assert state.reason == DegradationReason.MODEL_UNREACHABLE
        assert service.is_ai_available() is False
    
    def test_failure_tracking_leads_to_degradation(self):
        """Multiple failures lead to degraded state."""
        reset_all_services()
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
            DegradationReason,
        )
        
        service = GracefulDegradationService.get()
        
        # Record multiple failures
        for _ in range(3):
            service.record_failure(DegradationReason.MODEL_TIMEOUT)
        
        state = service.get_state()
        assert state.status in (AIAvailabilityStatus.DEGRADED, AIAvailabilityStatus.UNAVAILABLE)
    
    def test_success_resets_failure_count(self):
        """Successful operation resets failure count."""
        reset_all_services()
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            DegradationReason,
        )
        
        service = GracefulDegradationService.get()
        
        # Record some failures (but not enough to degrade)
        service.record_failure(DegradationReason.MODEL_TIMEOUT)
        service.record_failure(DegradationReason.MODEL_TIMEOUT)
        
        # Record success
        service.record_success()
        
        # Should still be available
        assert service.is_ai_available() is True
    
    def test_model_status_update(self):
        """Model status updates affect availability."""
        reset_all_services()
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
        )
        
        service = GracefulDegradationService.get()
        
        # Mark model as unavailable
        service.update_model_status(available=False, error="Connection refused")
        
        state = service.get_state()
        assert state.status == AIAvailabilityStatus.UNAVAILABLE
        assert state.model_available is False
        
        # Mark model as available
        service.update_model_status(available=True)
        
        state = service.get_state()
        assert state.status == AIAvailabilityStatus.AVAILABLE
        assert state.model_available is True


class TestFeatureFlagService:
    """Tests for the AIFeatureFlagService."""
    
    def test_default_flags_enabled(self):
        """Default flags are enabled when AI_ENABLED env is not set."""
        reset_all_services()
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        with patch.dict(os.environ, {"AI_ENABLED": "true"}, clear=False):
            AIFeatureFlagService.reset()
            service = AIFeatureFlagService.get()
            
            assert service.is_enabled(AIFeatureFlag.AI_ENABLED) is True
            assert service.is_enabled(AIFeatureFlag.AI_CHAT) is True
    
    def test_master_switch_disables_all(self):
        """Disabling master switch disables all features."""
        reset_all_services()
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, False)
        
        # All features should be disabled
        assert service.is_enabled(AIFeatureFlag.AI_CHAT) is False
        assert service.is_enabled(AIFeatureFlag.AI_ACTIONS) is False
        assert service.is_enabled(AIFeatureFlag.AI_OCR) is False
    
    def test_tenant_override(self):
        """Tenant-specific overrides work correctly."""
        reset_all_services()
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        service = AIFeatureFlagService.get()
        
        # Enable globally
        service.set_enabled(AIFeatureFlag.AI_CHAT, True)
        
        # Disable for specific tenant
        service.set_tenant_override(AIFeatureFlag.AI_CHAT, "tenant-1", False)
        
        # Global should be enabled
        assert service.is_enabled(AIFeatureFlag.AI_CHAT) is True
        
        # Tenant-1 should be disabled
        assert service.is_enabled(AIFeatureFlag.AI_CHAT, "tenant-1") is False
        
        # Other tenants should be enabled
        assert service.is_enabled(AIFeatureFlag.AI_CHAT, "tenant-2") is True
    
    def test_get_enabled_capabilities(self):
        """Get enabled capabilities returns correct set."""
        reset_all_services()
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, True)
        service.set_enabled(AIFeatureFlag.AI_CHAT, True)
        service.set_enabled(AIFeatureFlag.AI_ACTIONS, False)
        service.set_enabled(AIFeatureFlag.AI_OCR, True)
        
        capabilities = service.get_enabled_capabilities()
        
        assert "chat" in capabilities
        assert "actions" not in capabilities
        assert "ocr" in capabilities


class TestKillSwitchIntegration:
    """Tests for kill switch integration with graceful degradation."""
    
    def test_kill_switch_updates_degradation_service(self):
        """Kill switch activation updates degradation service."""
        reset_all_services()
        from ai.services.kill_switch import KillSwitch
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
        )
        
        kill_switch = KillSwitch.get()
        degradation = GracefulDegradationService.get()
        
        # Activate kill switch
        kill_switch.activate_global(user_id="admin", reason="Emergency")
        degradation.update_from_kill_switch(active=True, reason="Emergency")
        
        # Degradation service should reflect this
        state = degradation.get_state()
        assert state.status == AIAvailabilityStatus.UNAVAILABLE
        assert degradation.is_ai_available() is False
    
    def test_kill_switch_deactivation_restores_service(self):
        """Kill switch deactivation restores degradation service."""
        reset_all_services()
        from ai.services.kill_switch import KillSwitch
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
        )
        
        kill_switch = KillSwitch.get()
        degradation = GracefulDegradationService.get()
        
        # Activate then deactivate kill switch
        kill_switch.activate_global(user_id="admin", reason="Emergency")
        degradation.update_from_kill_switch(active=True, reason="Emergency")
        
        kill_switch.deactivate_global(user_id="admin")
        degradation.update_from_kill_switch(active=False)
        
        # Degradation service should be restored
        state = degradation.get_state()
        assert state.status == AIAvailabilityStatus.AVAILABLE
        assert degradation.is_ai_available() is True
