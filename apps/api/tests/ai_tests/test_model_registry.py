"""
Property-based tests for Model Registry.

**Feature: ai-layer-architecture**
**Property 15: Model A/B Test Determinism**

**Validates: Requirements 11.2, 11.3**

Tests that:
- Model versions can be registered and retrieved
- A/B test variant assignment is deterministic
- Same tenant always gets same variant
- Traffic split is respected across population
"""

import sys
from pathlib import Path

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings
from collections import Counter

from ai.runtime.model_registry import (
    ModelRegistry,
    ModelVersion,
    ModelType,
    ModelStatus,
    ABTestConfig,
    get_model_registry,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def empty_registry():
    """Create an empty model registry."""
    return ModelRegistry()


@pytest.fixture
def sample_model():
    """Create a sample model version."""
    return ModelVersion(
        model_id="test_model",
        version="1.0.0",
        model_name="qwen2.5:7b-instruct",
        model_type=ModelType.GENERAL,
        status=ModelStatus.ACTIVE,
    )


# =============================================================================
# Model Registration Tests
# =============================================================================

class TestModelRegistration:
    """Tests for model registration."""
    
    def test_register_model(self, empty_registry, sample_model):
        """Models can be registered."""
        empty_registry.register_model(sample_model)
        
        retrieved = empty_registry.get_model("test_model")
        assert retrieved is not None
        assert retrieved.model_id == "test_model"
        assert retrieved.version == "1.0.0"
    
    def test_register_multiple_versions(self, empty_registry):
        """Multiple versions of same model can be registered."""
        for version in ["1.0.0", "1.1.0", "2.0.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            empty_registry.register_model(model)
        
        # Get specific version
        v1 = empty_registry.get_model("test_model", "1.0.0")
        v2 = empty_registry.get_model("test_model", "2.0.0")
        
        assert v1.version == "1.0.0"
        assert v2.version == "2.0.0"
    
    def test_get_default_version(self, empty_registry):
        """Default version is returned when no version specified."""
        for version in ["1.0.0", "1.1.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
                status=ModelStatus.ACTIVE if version == "1.1.0" else ModelStatus.DEPRECATED,
            )
            empty_registry.register_model(model)
        
        # Default should be the active one (1.1.0)
        default = empty_registry.get_model("test_model")
        assert default.version == "1.1.0"
    
    def test_set_default_version(self, empty_registry):
        """Default version can be explicitly set."""
        for version in ["1.0.0", "2.0.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            empty_registry.register_model(model)
        
        empty_registry.set_default_version("test_model", "1.0.0")
        
        default = empty_registry.get_model("test_model")
        assert default.version == "1.0.0"
    
    def test_get_nonexistent_model(self, empty_registry):
        """Getting nonexistent model returns None."""
        result = empty_registry.get_model("nonexistent")
        assert result is None
    
    def test_model_to_dict(self, sample_model):
        """Model can be serialized to dict."""
        result = sample_model.to_dict()
        
        assert result["modelId"] == "test_model"
        assert result["version"] == "1.0.0"
        assert result["modelType"] == "general"
        assert result["status"] == "active"


# =============================================================================
# Property 15: Model A/B Test Determinism
# =============================================================================

class TestABTestDeterminism:
    """
    Property 15: Model A/B Test Determinism
    
    Validates: Requirements 11.3
    - Same tenant always gets same variant
    - Assignment is deterministic
    """
    
    def test_variant_hash_deterministic(self):
        """Variant hash is deterministic."""
        hash1 = ModelRegistry.compute_variant_hash("tenant_1", "test_1")
        hash2 = ModelRegistry.compute_variant_hash("tenant_1", "test_1")
        
        assert hash1 == hash2
    
    def test_variant_hash_different_tenants(self):
        """Different tenants get different hashes (usually)."""
        hashes = set()
        for i in range(100):
            h = ModelRegistry.compute_variant_hash(f"tenant_{i}", "test_1")
            hashes.add(h)
        
        # Should have good distribution (not all same)
        assert len(hashes) > 50
    
    def test_variant_hash_range(self):
        """Variant hash is in range 0-99."""
        for i in range(1000):
            h = ModelRegistry.compute_variant_hash(f"tenant_{i}", "test_1")
            assert 0 <= h < 100
    
    @given(
        tenant_id=st.text(min_size=1, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
        test_id=st.text(min_size=1, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz0123456789"),
    )
    @settings(max_examples=100)
    def test_determinism_property(self, tenant_id: str, test_id: str):
        """
        Property: Variant assignment is deterministic.
        Same tenant + test always produces same hash.
        """
        hash1 = ModelRegistry.compute_variant_hash(tenant_id, test_id)
        hash2 = ModelRegistry.compute_variant_hash(tenant_id, test_id)
        
        assert hash1 == hash2
        assert 0 <= hash1 < 100
    
    def test_same_tenant_same_variant(self, empty_registry):
        """Same tenant always gets same variant."""
        # Register models
        for version in ["1.0.0", "2.0.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            empty_registry.register_model(model)
        
        # Register A/B test
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="2.0.0",
            traffic_split=50,
        )
        empty_registry.register_ab_test("test_model", ab_test)
        
        # Same tenant should always get same variant
        tenant_id = "tenant_123"
        variants = []
        for _ in range(10):
            variant = empty_registry.get_variant_for_tenant("test_model", tenant_id)
            variants.append(variant.version)
        
        # All should be the same
        assert len(set(variants)) == 1
    
    @given(st.integers(min_value=0, max_value=100))
    @settings(max_examples=20)
    def test_traffic_split_respected(self, split: int):
        """
        Property: Traffic split is approximately respected.
        """
        registry = ModelRegistry()
        
        # Register models
        for version in ["1.0.0", "2.0.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            registry.register_model(model)
        
        # Register A/B test with given split
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="2.0.0",
            traffic_split=split,
        )
        registry.register_ab_test("test_model", ab_test)
        
        # Test with many tenants
        treatment_count = 0
        total = 1000
        
        for i in range(total):
            variant = registry.get_variant_for_tenant("test_model", f"tenant_{i}")
            if variant.version == "2.0.0":
                treatment_count += 1
        
        # Should be within 10% of expected split
        expected = split / 100 * total
        tolerance = total * 0.1  # 10% tolerance
        
        assert abs(treatment_count - expected) < tolerance, \
            f"Expected ~{expected} treatment, got {treatment_count}"


# =============================================================================
# A/B Test Configuration Tests
# =============================================================================

class TestABTestConfiguration:
    """Tests for A/B test configuration."""
    
    def test_register_ab_test(self, empty_registry, sample_model):
        """A/B tests can be registered."""
        empty_registry.register_model(sample_model)
        
        # Register second version
        model_v2 = ModelVersion(
            model_id="test_model",
            version="2.0.0",
            model_name="qwen2.5:7b-instruct",
            model_type=ModelType.GENERAL,
        )
        empty_registry.register_model(model_v2)
        
        # Register A/B test
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="2.0.0",
            traffic_split=30,
        )
        empty_registry.register_ab_test("test_model", ab_test)
        
        retrieved = empty_registry.get_ab_test("test_model")
        assert retrieved is not None
        assert retrieved.test_id == "test_ab"
        assert retrieved.traffic_split == 30
    
    def test_disable_ab_test(self, empty_registry, sample_model):
        """A/B tests can be disabled."""
        empty_registry.register_model(sample_model)
        
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="1.0.0",
            enabled=True,
        )
        empty_registry.register_ab_test("test_model", ab_test)
        
        empty_registry.disable_ab_test("test_model")
        
        retrieved = empty_registry.get_ab_test("test_model")
        assert retrieved.enabled is False
    
    def test_no_ab_test_returns_default(self, empty_registry, sample_model):
        """Without A/B test, default version is returned."""
        empty_registry.register_model(sample_model)
        
        variant = empty_registry.get_variant_for_tenant("test_model", "tenant_1")
        
        assert variant.version == "1.0.0"
    
    def test_get_variant_assignment_details(self, empty_registry):
        """Variant assignment details are returned."""
        # Register models
        for version in ["1.0.0", "2.0.0"]:
            model = ModelVersion(
                model_id="test_model",
                version=version,
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            empty_registry.register_model(model)
        
        # Register A/B test
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="2.0.0",
            traffic_split=50,
        )
        empty_registry.register_ab_test("test_model", ab_test)
        
        assignment = empty_registry.get_variant_assignment("test_model", "tenant_1")
        
        assert assignment["modelId"] == "test_model"
        assert assignment["tenantId"] == "tenant_1"
        assert assignment["abTestActive"] is True
        assert assignment["testId"] == "test_ab"
        assert assignment["variant"] in ["control", "treatment"]
        assert "variantHash" in assignment
    
    def test_ab_test_to_dict(self):
        """A/B test config can be serialized."""
        ab_test = ABTestConfig(
            test_id="test_ab",
            control_version="1.0.0",
            treatment_version="2.0.0",
            traffic_split=50,
        )
        
        result = ab_test.to_dict()
        
        assert result["testId"] == "test_ab"
        assert result["controlVersion"] == "1.0.0"
        assert result["treatmentVersion"] == "2.0.0"
        assert result["trafficSplit"] == 50


# =============================================================================
# List Operations Tests
# =============================================================================

class TestListOperations:
    """Tests for list operations."""
    
    def test_list_models(self, empty_registry):
        """All models can be listed."""
        for i in range(3):
            model = ModelVersion(
                model_id=f"model_{i}",
                version="1.0.0",
                model_name="qwen2.5:7b-instruct",
                model_type=ModelType.GENERAL,
            )
            empty_registry.register_model(model)
        
        models = empty_registry.list_models()
        assert len(models) == 3
    
    def test_list_models_by_type(self, empty_registry):
        """Models can be filtered by type."""
        # Register different types
        empty_registry.register_model(ModelVersion(
            model_id="intent_model",
            version="1.0.0",
            model_name="qwen2.5:7b-instruct",
            model_type=ModelType.INTENT,
        ))
        empty_registry.register_model(ModelVersion(
            model_id="planning_model",
            version="1.0.0",
            model_name="qwen2.5:7b-instruct",
            model_type=ModelType.PLANNING,
        ))
        
        intent_models = empty_registry.list_models(ModelType.INTENT)
        assert len(intent_models) == 1
        assert intent_models[0]["modelType"] == "intent"
    
    def test_list_ab_tests(self, empty_registry, sample_model):
        """All A/B tests can be listed."""
        empty_registry.register_model(sample_model)
        
        for i in range(2):
            ab_test = ABTestConfig(
                test_id=f"test_{i}",
                control_version="1.0.0",
                treatment_version="1.0.0",
            )
            empty_registry.register_ab_test(f"model_{i}", ab_test)
        
        tests = empty_registry.list_ab_tests()
        assert len(tests) == 2


# =============================================================================
# Global Registry Tests
# =============================================================================

class TestGlobalRegistry:
    """Tests for global registry."""
    
    def test_get_model_registry(self):
        """Global registry is initialized with default models."""
        registry = get_model_registry()
        
        # Should have default models
        intent_model = registry.get_model("intent_classifier")
        assert intent_model is not None
        
        planner_model = registry.get_model("action_planner")
        assert planner_model is not None
        
        general_model = registry.get_model("general")
        assert general_model is not None
