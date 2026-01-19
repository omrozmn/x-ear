"""
Property-based tests for AI Layer configuration and phase enforcement.

**Feature: ai-layer-architecture, Property 19: Phase Runtime Enforcement**
**Validates: Requirements 25.1, 25.2, 25.3, 25.4, 25.5**

Tests that:
- AI_PHASE environment variable controls capabilities
- Phase A rejects execution requests
- Phase B requires approval for execution
- Phase C allows approved execution
- Phase enforcement is deterministic
"""

import os
import sys
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import patch
from pathlib import Path

# Add the api directory to the path - use Path for reliable resolution
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

from ai.config import (
    AIPhase,
    AIConfig,
    AIExecutionDisabled,
    AIUnavailableError,
    require_phase,
    require_ai_enabled,
    get_current_phase,
    is_ai_enabled,
)


class TestAIPhaseEnum:
    """Tests for AIPhase enum."""
    
    def test_phase_values(self):
        """Verify phase enum values."""
        assert AIPhase.A.value == "read_only"
        assert AIPhase.B.value == "proposal"
        assert AIPhase.C.value == "execution"
    
    @given(st.sampled_from(["A", "a", "READ_ONLY", "read_only"]))
    def test_from_string_phase_a(self, value: str):
        """Phase A can be specified multiple ways."""
        assert AIPhase.from_string(value) == AIPhase.A
    
    @given(st.sampled_from(["B", "b", "PROPOSAL", "proposal"]))
    def test_from_string_phase_b(self, value: str):
        """Phase B can be specified multiple ways."""
        assert AIPhase.from_string(value) == AIPhase.B
    
    @given(st.sampled_from(["C", "c", "EXECUTION", "execution"]))
    def test_from_string_phase_c(self, value: str):
        """Phase C can be specified multiple ways."""
        assert AIPhase.from_string(value) == AIPhase.C
    
    @given(st.text().filter(lambda x: x.upper().strip() not in 
           ["A", "B", "C", "READ_ONLY", "PROPOSAL", "EXECUTION"]))
    @settings(max_examples=50)
    def test_from_string_invalid_defaults_to_a(self, value: str):
        """Invalid phase strings default to safest phase (A)."""
        result = AIPhase.from_string(value)
        assert result == AIPhase.A


class TestAIConfig:
    """Tests for AIConfig singleton."""
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    def test_singleton_pattern(self):
        """AIConfig.get() returns same instance."""
        config1 = AIConfig.get()
        config2 = AIConfig.get()
        assert config1 is config2
    
    def test_reset_creates_new_instance(self):
        """AIConfig.reset() allows new instance creation."""
        config1 = AIConfig.get()
        AIConfig.reset()
        config2 = AIConfig.get()
        assert config1 is not config2
    
    @patch.dict(os.environ, {"AI_PHASE": "A"})
    def test_phase_a_from_env(self):
        """Phase A is loaded from environment."""
        AIConfig.reset()
        config = AIConfig.get()
        assert config.phase == AIPhase.A
        assert config.is_read_only()
        assert not config.is_proposal_allowed()
        assert not config.is_execution_allowed()
    
    @patch.dict(os.environ, {"AI_PHASE": "B"})
    def test_phase_b_from_env(self):
        """Phase B is loaded from environment."""
        AIConfig.reset()
        config = AIConfig.get()
        assert config.phase == AIPhase.B
        assert not config.is_read_only()
        assert config.is_proposal_allowed()
        assert not config.is_execution_allowed()
    
    @patch.dict(os.environ, {"AI_PHASE": "C"})
    def test_phase_c_from_env(self):
        """Phase C is loaded from environment."""
        AIConfig.reset()
        config = AIConfig.get()
        assert config.phase == AIPhase.C
        assert not config.is_read_only()
        assert config.is_proposal_allowed()
        assert config.is_execution_allowed()
    
    @patch.dict(os.environ, {"AI_ENABLED": "false"})
    def test_ai_disabled_from_env(self):
        """AI can be disabled via environment."""
        AIConfig.reset()
        config = AIConfig.get()
        assert not config.enabled
    
    @patch.dict(os.environ, {"AI_ENABLED": "true"})
    def test_ai_enabled_from_env(self):
        """AI is enabled by default."""
        AIConfig.reset()
        config = AIConfig.get()
        assert config.enabled


class TestPhaseEnforcement:
    """
    Property-based tests for phase enforcement.
    
    **Property 19: Phase Runtime Enforcement**
    For any execution request, when AI_PHASE is "A" (read_only), 
    the Executor SHALL reject the request; when AI_PHASE is "B" (proposal), 
    execution SHALL require approval; phase enforcement SHALL be deterministic 
    based on environment variable.
    """
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    @patch.dict(os.environ, {"AI_PHASE": "A"})
    def test_phase_a_rejects_execution(self):
        """Phase A rejects execution requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.C)
        def execute_action():
            return "executed"
        
        with pytest.raises(AIExecutionDisabled) as exc_info:
            execute_action()
        
        error_msg = str(exc_info.value).lower()
        assert "phase c" in error_msg
        assert "is a" in error_msg  # "current phase is A"
    
    @patch.dict(os.environ, {"AI_PHASE": "A"})
    def test_phase_a_rejects_proposals(self):
        """Phase A rejects proposal requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.B)
        def create_proposal():
            return "proposal"
        
        with pytest.raises(AIExecutionDisabled) as exc_info:
            create_proposal()
        
        error_msg = str(exc_info.value).lower()
        assert "phase b" in error_msg
    
    @patch.dict(os.environ, {"AI_PHASE": "B"})
    def test_phase_b_allows_proposals(self):
        """Phase B allows proposal requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.B)
        def create_proposal():
            return "proposal"
        
        result = create_proposal()
        assert result == "proposal"
    
    @patch.dict(os.environ, {"AI_PHASE": "B"})
    def test_phase_b_rejects_execution(self):
        """Phase B rejects direct execution requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.C)
        def execute_action():
            return "executed"
        
        with pytest.raises(AIExecutionDisabled) as exc_info:
            execute_action()
        
        error_msg = str(exc_info.value).lower()
        assert "phase c" in error_msg
    
    @patch.dict(os.environ, {"AI_PHASE": "C"})
    def test_phase_c_allows_execution(self):
        """Phase C allows execution requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.C)
        def execute_action():
            return "executed"
        
        result = execute_action()
        assert result == "executed"
    
    @patch.dict(os.environ, {"AI_PHASE": "C"})
    def test_phase_c_allows_proposals(self):
        """Phase C allows proposal requests."""
        AIConfig.reset()
        
        @require_phase(AIPhase.B)
        def create_proposal():
            return "proposal"
        
        result = create_proposal()
        assert result == "proposal"
    
    @given(st.sampled_from(["A", "B", "C"]))
    @settings(max_examples=100)
    def test_phase_enforcement_is_deterministic(self, phase: str):
        """
        Property: Phase enforcement is deterministic.
        Same phase always produces same behavior.
        """
        with patch.dict(os.environ, {"AI_PHASE": phase}):
            AIConfig.reset()
            
            @require_phase(AIPhase.C)
            def execute_action():
                return "executed"
            
            # Run multiple times - should always have same result
            results = []
            for _ in range(5):
                try:
                    result = execute_action()
                    results.append(("success", result))
                except AIExecutionDisabled as e:
                    results.append(("error", str(e)))
            
            # All results should be identical
            assert all(r == results[0] for r in results)
            
            # Verify expected behavior based on phase
            if phase == "C":
                assert results[0] == ("success", "executed")
            else:
                assert results[0][0] == "error"


class TestAIEnabledEnforcement:
    """Tests for AI enabled/disabled enforcement."""
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    @patch.dict(os.environ, {"AI_ENABLED": "false"})
    def test_disabled_ai_raises_error(self):
        """Disabled AI raises AIUnavailableError."""
        AIConfig.reset()
        
        @require_ai_enabled
        def ai_chat():
            return "response"
        
        with pytest.raises(AIUnavailableError) as exc_info:
            ai_chat()
        
        assert "disabled" in str(exc_info.value).lower()
    
    @patch.dict(os.environ, {"AI_ENABLED": "true"})
    def test_enabled_ai_works(self):
        """Enabled AI allows operations."""
        AIConfig.reset()
        
        @require_ai_enabled
        def ai_chat():
            return "response"
        
        result = ai_chat()
        assert result == "response"
    
    @given(st.booleans())
    @settings(max_examples=100)
    def test_ai_enabled_is_deterministic(self, enabled: bool):
        """
        Property: AI enabled check is deterministic.
        Same setting always produces same behavior.
        """
        env_value = "true" if enabled else "false"
        with patch.dict(os.environ, {"AI_ENABLED": env_value}):
            AIConfig.reset()
            
            @require_ai_enabled
            def ai_chat():
                return "response"
            
            # Run multiple times
            results = []
            for _ in range(5):
                try:
                    result = ai_chat()
                    results.append(("success", result))
                except AIUnavailableError as e:
                    results.append(("error", str(e)))
            
            # All results should be identical
            assert all(r == results[0] for r in results)
            
            # Verify expected behavior
            if enabled:
                assert results[0] == ("success", "response")
            else:
                assert results[0][0] == "error"


class TestModelConfig:
    """Tests for model configuration loading."""
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    def test_default_model_config(self):
        """Default model configuration is loaded."""
        config = AIConfig.get()
        assert config.model.provider == "local"
        assert config.model.model_id == "qwen2.5-7b-instruct"
        assert config.model.base_url == "http://localhost:11434"
        assert config.model.timeout_seconds == 30
    
    @patch.dict(os.environ, {
        "AI_MODEL_PROVIDER": "custom",
        "AI_MODEL_ID": "llama-3-8b",
        "AI_MODEL_BASE_URL": "http://custom:8080",
        "AI_MODEL_TIMEOUT_SECONDS": "60",
    })
    def test_custom_model_config(self):
        """Custom model configuration is loaded from environment."""
        AIConfig.reset()
        config = AIConfig.get()
        assert config.model.provider == "custom"
        assert config.model.model_id == "llama-3-8b"
        assert config.model.base_url == "http://custom:8080"
        assert config.model.timeout_seconds == 60


class TestGuardrailConfig:
    """Tests for guardrail configuration loading."""
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    def test_default_guardrail_config(self):
        """Default guardrail configuration is loaded."""
        config = AIConfig.get()
        assert config.guardrails.max_input_tokens == 4096
        assert config.guardrails.max_output_tokens == 2048
        assert config.guardrails.max_reasoning_steps == 10
        assert config.guardrails.intent_latency_budget_ms == 2000
        assert config.guardrails.planning_latency_budget_ms == 5000
        assert config.guardrails.execution_latency_budget_ms == 10000


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def setup_method(self):
        """Reset config before each test."""
        AIConfig.reset()
    
    def teardown_method(self):
        """Reset config after each test."""
        AIConfig.reset()
    
    @patch.dict(os.environ, {"AI_PHASE": "B"})
    def test_get_current_phase(self):
        """get_current_phase returns correct phase."""
        AIConfig.reset()
        assert get_current_phase() == AIPhase.B
    
    @patch.dict(os.environ, {"AI_ENABLED": "true"})
    def test_is_ai_enabled_true(self):
        """is_ai_enabled returns True when enabled."""
        AIConfig.reset()
        assert is_ai_enabled() is True
    
    @patch.dict(os.environ, {"AI_ENABLED": "false"})
    def test_is_ai_enabled_false(self):
        """is_ai_enabled returns False when disabled."""
        AIConfig.reset()
        assert is_ai_enabled() is False
