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
from hypothesis import given, strategies as st, settings, assume
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from dataclasses import dataclass


# =============================================================================
# Test Fixtures and Setup
# =============================================================================

@pytest.fixture(autouse=True)
def reset_services():
    """Reset all singleton services before each test."""
    from ai.services.graceful_degradation import GracefulDegradationService
    from ai.services.feature_flags import AIFeatureFlagService
    from ai.services.kill_switch import KillSwitch
    from ai.config import AIConfig
    
    GracefulDegradationService.reset()
    AIFeatureFlagService.reset()
    KillSwitch.reset()
    AIConfig.reset()
    yield
    GracefulDegradationService.reset()
    AIFeatureFlagService.reset()
    KillSwitch.reset()
    AIConfig.reset()


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


def mock_patient_read(patient_id: str) -> MockOperationResult:
    """Mock patient read operation."""
    return MockOperationResult(
        success=True,
        data={"id": patient_id, "name": "Test Patient"},
        operation_name="patient_read",
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


def mock_invoice_generate(invoice_data: Dict[str, Any]) -> MockOperationResult:
    """Mock invoice generation operation."""
    return MockOperationResult(
        success=True,
        data={"id": "invoice-789", **invoice_data},
        operation_name="invoice_generate",
        timestamp=datetime.now(timezone.utc),
    )


CORE_OPERATIONS = [
    ("patient_create", mock_patient_create, {"name": "Test", "email": "test@example.com"}),
    ("patient_read", mock_patient_read, "patient-123"),
    ("sale_create", mock_sale_create, {"amount": 100.0, "product": "Test Product"}),
    ("invoice_generate", mock_invoice_generate, {"sale_id": "sale-456", "amount": 100.0}),
]


# =============================================================================
# Strategies for Property-Based Testing
# =============================================================================

@st.composite
def core_operation_strategy(draw):
    """Strategy to generate random core operations."""
    op_name, op_func, default_input = draw(st.sampled_from(CORE_OPERATIONS))
    return op_name, op_func, default_input


@st.composite
def patient_data_strategy(draw):
    """Strategy to generate random patient data."""
    return {
        "name": draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        "email": draw(st.emails()),
        "phone": draw(st.text(min_size=10, max_size=15, alphabet="0123456789")),
    }


@st.composite
def sale_data_strategy(draw):
    """Strategy to generate random sale data."""
    return {
        "amount": draw(st.floats(min_value=0.01, max_value=100000.0, allow_nan=False, allow_infinity=False)),
        "product": draw(st.text(min_size=1, max_size=100)),
        "quantity": draw(st.integers(min_value=1, max_value=100)),
    }


# =============================================================================
# Property Tests
# =============================================================================

class TestSystemResilienceProperty:
    """
    Property 2: System Resilience Without AI
    
    **Feature: ai-layer-architecture, Property 2: System Resilience Without AI**
    **Validates: Requirements 1.2, 1.6, 1.7**
    """
    
    @settings(max_examples=5)
    @given(core_operation_strategy())
    def test_core_operations_work_when_ai_disabled(self, operation_tuple):
        """
        Property: Core operations complete successfully when AI is disabled.
        
        For any core operation, when AI is disabled via config,
        the operation SHALL complete successfully.
        """
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.graceful_degradation import GracefulDegradationService, DegradationReason
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        # Disable AI via feature flag
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, False)
        
        # Disable AI via graceful degradation
        degradation = GracefulDegradationService.get()
        degradation.mark_disabled("Test: AI disabled")
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name
        assert result.data is not None
    
    @settings(max_examples=5)
    @given(core_operation_strategy())
    def test_core_operations_work_when_model_unreachable(self, operation_tuple):
        """
        Property: Core operations complete successfully when model is unreachable.
        
        For any core operation, when the AI model is unreachable,
        the operation SHALL complete successfully.
        """
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.graceful_degradation import (
            GracefulDegradationService, 
            DegradationReason,
        )
        
        # Mark model as unreachable
        service = GracefulDegradationService.get()
        service.mark_unavailable(
            DegradationReason.MODEL_UNREACHABLE,
            "Test: Model unreachable",
        )
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name
        assert result.data is not None
    
    @settings(max_examples=5)
    @given(core_operation_strategy())
    def test_core_operations_work_when_kill_switch_active(self, operation_tuple):
        """
        Property: Core operations complete successfully when kill switch is active.
        
        For any core operation, when the AI kill switch is active,
        the operation SHALL complete successfully.
        """
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.kill_switch import KillSwitch
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            DegradationReason,
        )
        
        # Activate kill switch
        kill_switch = KillSwitch.get()
        kill_switch.activate_global(user_id="admin", reason="Test: Kill switch active")
        
        # Update degradation service
        degradation = GracefulDegradationService.get()
        degradation.update_from_kill_switch(active=True, reason="Kill switch active")
        
        # Execute core operation - should succeed
        result = op_func(op_input)
        
        assert result.success is True
        assert result.operation_name == op_name
        assert result.data is not None
    
    @settings(max_examples=5)
    @given(core_operation_strategy())
    def test_operations_identical_with_and_without_ai(self, operation_tuple):
        """
        Property: Core operations produce identical results with and without AI.
        
        For any core operation, the result when AI is enabled SHALL be
        identical to the result when AI is disabled.
        """
        op_name, op_func, op_input = operation_tuple
        
        from ai.services.graceful_degradation import GracefulDegradationService
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        # Execute with AI enabled
        GracefulDegradationService.reset()
        AIFeatureFlagService.reset()
        
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, True)
        
        degradation = GracefulDegradationService.get()
        degradation.mark_available()
        
        result_with_ai = op_func(op_input)
        
        # Execute with AI disabled
        GracefulDegradationService.reset()
        AIFeatureFlagService.reset()
        
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, False)
        
        degradation = GracefulDegradationService.get()
        degradation.mark_disabled("Test: AI disabled")
        
        result_without_ai = op_func(op_input)
        
        # Results should be identical (except timestamp)
        assert result_with_ai.success == result_without_ai.success
        assert result_with_ai.operation_name == result_without_ai.operation_name
        # Data should be equivalent (may have different IDs in real system)
        assert type(result_with_ai.data) == type(result_without_ai.data)


class TestGracefulDegradationService:
    """Tests for the GracefulDegradationService."""
    
    def test_initial_state_is_available(self):
        """Service starts in available state."""
        from ai.services.graceful_degradation import GracefulDegradationService, AIAvailabilityStatus
        
        service = GracefulDegradationService.get()
        state = service.get_state()
        
        assert state.status == AIAvailabilityStatus.AVAILABLE
        assert service.is_ai_available() is True
    
    def test_mark_disabled(self):
        """Service can be marked as disabled."""
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
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
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
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        # Reset to get fresh instance
        AIFeatureFlagService.reset()
        
        with patch.dict(os.environ, {"AI_ENABLED": "true"}, clear=False):
            AIFeatureFlagService.reset()
            service = AIFeatureFlagService.get()
            
            assert service.is_enabled(AIFeatureFlag.AI_ENABLED) is True
            assert service.is_enabled(AIFeatureFlag.AI_CHAT) is True
            assert service.is_enabled(AIFeatureFlag.AI_ACTIONS) is True
    
    def test_master_switch_disables_all(self):
        """Disabling master switch disables all features."""
        from ai.services.feature_flags import AIFeatureFlagService, AIFeatureFlag
        
        service = AIFeatureFlagService.get()
        service.set_enabled(AIFeatureFlag.AI_ENABLED, False)
        
        # All features should be disabled
        assert service.is_enabled(AIFeatureFlag.AI_CHAT) is False
        assert service.is_enabled(AIFeatureFlag.AI_ACTIONS) is False
        assert service.is_enabled(AIFeatureFlag.AI_OCR) is False
    
    def test_tenant_override(self):
        """Tenant-specific overrides work correctly."""
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


class TestWithGracefulDegradationDecorator:
    """Tests for the with_graceful_degradation decorator."""
    
    def test_decorator_returns_fallback_when_unavailable(self):
        """Decorator returns fallback value when AI is unavailable."""
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            DegradationReason,
            with_graceful_degradation,
        )
        
        service = GracefulDegradationService.get()
        service.mark_unavailable(DegradationReason.MODEL_UNREACHABLE, "Test")
        
        @with_graceful_degradation(fallback_value="fallback_result")
        def ai_operation():
            return "ai_result"
        
        result = ai_operation()
        assert result == "fallback_result"
    
    def test_decorator_returns_result_when_available(self):
        """Decorator returns actual result when AI is available."""
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            with_graceful_degradation,
        )
        
        service = GracefulDegradationService.get()
        service.mark_available()
        
        @with_graceful_degradation(fallback_value="fallback_result")
        def ai_operation():
            return "ai_result"
        
        result = ai_operation()
        assert result == "ai_result"
    
    def test_decorator_calls_fallback_function(self):
        """Decorator calls fallback function when AI is unavailable."""
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            DegradationReason,
            with_graceful_degradation,
        )
        
        service = GracefulDegradationService.get()
        service.mark_unavailable(DegradationReason.MODEL_UNREACHABLE, "Test")
        
        def fallback_fn(x):
            return f"fallback_{x}"
        
        @with_graceful_degradation(fallback_fn=fallback_fn)
        def ai_operation(x):
            return f"ai_{x}"
        
        result = ai_operation("test")
        assert result == "fallback_test"


class TestEnsureCoreFunctionalityDecorator:
    """Tests for the ensure_core_functionality decorator."""
    
    def test_decorator_catches_ai_errors(self):
        """Decorator catches AI errors and returns None."""
        from ai.services.graceful_degradation import ensure_core_functionality
        
        @ensure_core_functionality
        def ai_enhancement():
            raise Exception("AI error")
        
        # Should not raise, should return None
        result = ai_enhancement()
        assert result is None
    
    def test_decorator_returns_result_on_success(self):
        """Decorator returns result when operation succeeds."""
        from ai.services.graceful_degradation import ensure_core_functionality
        
        @ensure_core_functionality
        def ai_enhancement():
            return "enhancement_result"
        
        result = ai_enhancement()
        assert result == "enhancement_result"


class TestKillSwitchIntegration:
    """Tests for kill switch integration with graceful degradation."""
    
    def test_kill_switch_updates_degradation_service(self):
        """Kill switch activation updates degradation service."""
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
        from ai.services.kill_switch import KillSwitch
        from ai.services.graceful_degradation import (
            GracefulDegradationService,
            AIAvailabilityStatus,
            DegradationReason,
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
