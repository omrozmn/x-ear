"""
Model Registry for AI Layer

Manages model versions and A/B test variant assignment.
Provides deterministic variant assignment based on tenant_id hash.

Requirements:
- 11.2: Model version management
- 11.3: A/B test variant assignment (tenant_id hash)
"""

import hashlib
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """Types of models."""
    INTENT = "intent"           # Intent classification
    PLANNING = "planning"       # Action planning
    EXECUTION = "execution"     # Execution guidance
    GENERAL = "general"         # General purpose


class ModelStatus(str, Enum):
    """Status of a model version."""
    ACTIVE = "active"           # Currently in use
    CANARY = "canary"           # Being tested on subset
    DEPRECATED = "deprecated"   # Being phased out
    DISABLED = "disabled"       # Not available


@dataclass
class ModelVersion:
    """
    A specific version of a model.
    
    Attributes:
        model_id: Unique identifier for the model
        version: Version string (e.g., "1.0.0")
        model_name: Ollama model name (e.g., "qwen2.5:7b-instruct")
        model_type: Type of model
        status: Current status
        traffic_percentage: Percentage of traffic for A/B testing (0-100)
        config: Additional configuration
        created_at: When this version was registered
    """
    model_id: str
    version: str
    model_name: str
    model_type: ModelType
    status: ModelStatus = ModelStatus.ACTIVE
    traffic_percentage: int = 100
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> dict:
        return {
            "modelId": self.model_id,
            "version": self.version,
            "modelName": self.model_name,
            "modelType": self.model_type.value,
            "status": self.status.value,
            "trafficPercentage": self.traffic_percentage,
            "config": self.config,
            "createdAt": self.created_at.isoformat(),
        }


@dataclass
class ABTestConfig:
    """
    Configuration for A/B testing.
    
    Attributes:
        test_id: Unique identifier for the test
        control_version: Control model version
        treatment_version: Treatment model version
        traffic_split: Percentage of traffic to treatment (0-100)
        enabled: Whether the test is active
        start_date: When the test started
        end_date: When the test ends (optional)
    """
    test_id: str
    control_version: str
    treatment_version: str
    traffic_split: int = 50  # 50% to treatment by default
    enabled: bool = True
    start_date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            "testId": self.test_id,
            "controlVersion": self.control_version,
            "treatmentVersion": self.treatment_version,
            "trafficSplit": self.traffic_split,
            "enabled": self.enabled,
            "startDate": self.start_date.isoformat(),
            "endDate": self.end_date.isoformat() if self.end_date else None,
        }


class ModelRegistry:
    """
    Registry for managing model versions and A/B tests.
    
    Provides:
    - Model version registration and lookup
    - Deterministic A/B test variant assignment
    - Model configuration management
    """
    
    def __init__(self):
        self._models: Dict[str, Dict[str, ModelVersion]] = {}  # {model_id: {version: ModelVersion}}
        self._ab_tests: Dict[str, ABTestConfig] = {}  # {model_id: ABTestConfig}
        self._default_versions: Dict[str, str] = {}  # {model_id: version}
    
    def register_model(self, model: ModelVersion) -> None:
        """
        Register a model version.
        
        Args:
            model: Model version to register
        """
        if model.model_id not in self._models:
            self._models[model.model_id] = {}
        
        self._models[model.model_id][model.version] = model
        
        # Set as default if first version or if active
        if model.model_id not in self._default_versions or model.status == ModelStatus.ACTIVE:
            self._default_versions[model.model_id] = model.version
        
        logger.info(f"Registered model: {model.model_id} v{model.version}")
    
    def get_model(
        self,
        model_id: str,
        version: Optional[str] = None,
    ) -> Optional[ModelVersion]:
        """
        Get a model version.
        
        Args:
            model_id: Model identifier
            version: Specific version (if None, returns default)
            
        Returns:
            ModelVersion or None if not found
        """
        if model_id not in self._models:
            return None
        
        if version:
            return self._models[model_id].get(version)
        
        # Return default version
        default_version = self._default_versions.get(model_id)
        if default_version:
            return self._models[model_id].get(default_version)
        
        return None
    
    def set_default_version(self, model_id: str, version: str) -> bool:
        """
        Set the default version for a model.
        
        Args:
            model_id: Model identifier
            version: Version to set as default
            
        Returns:
            True if successful, False if model/version not found
        """
        if model_id not in self._models:
            return False
        if version not in self._models[model_id]:
            return False
        
        self._default_versions[model_id] = version
        logger.info(f"Set default version for {model_id}: {version}")
        return True
    
    def register_ab_test(self, model_id: str, config: ABTestConfig) -> None:
        """
        Register an A/B test for a model.
        
        Args:
            model_id: Model identifier
            config: A/B test configuration
        """
        self._ab_tests[model_id] = config
        logger.info(f"Registered A/B test for {model_id}: {config.test_id}")
    
    def get_ab_test(self, model_id: str) -> Optional[ABTestConfig]:
        """Get A/B test configuration for a model."""
        return self._ab_tests.get(model_id)
    
    def disable_ab_test(self, model_id: str) -> bool:
        """Disable A/B test for a model."""
        if model_id in self._ab_tests:
            self._ab_tests[model_id].enabled = False
            logger.info(f"Disabled A/B test for {model_id}")
            return True
        return False
    
    @staticmethod
    def compute_variant_hash(tenant_id: str, test_id: str) -> int:
        """
        Compute a deterministic hash for variant assignment.
        
        Args:
            tenant_id: Tenant identifier
            test_id: A/B test identifier
            
        Returns:
            Integer hash value (0-99)
        """
        # Combine tenant_id and test_id for deterministic assignment
        combined = f"{tenant_id}:{test_id}"
        hash_bytes = hashlib.sha256(combined.encode()).digest()
        # Use first 4 bytes as integer, mod 100 for percentage
        hash_int = int.from_bytes(hash_bytes[:4], byteorder='big')
        return hash_int % 100
    
    def get_variant_for_tenant(
        self,
        model_id: str,
        tenant_id: str,
    ) -> ModelVersion:
        """
        Get the model variant for a tenant (considering A/B tests).
        
        This method provides deterministic variant assignment:
        - Same tenant always gets the same variant
        - Distribution matches the configured traffic split
        
        Args:
            model_id: Model identifier
            tenant_id: Tenant identifier
            
        Returns:
            ModelVersion for the tenant
            
        Raises:
            ValueError: If model not found
        """
        # Check if there's an active A/B test
        ab_test = self._ab_tests.get(model_id)
        
        if ab_test and ab_test.enabled:
            # Check if test is within date range
            now = datetime.now(timezone.utc)
            if ab_test.end_date and now > ab_test.end_date:
                ab_test.enabled = False
            else:
                # Compute variant based on tenant hash
                variant_hash = self.compute_variant_hash(tenant_id, ab_test.test_id)
                
                if variant_hash < ab_test.traffic_split:
                    # Treatment group
                    version = ab_test.treatment_version
                else:
                    # Control group
                    version = ab_test.control_version
                
                model = self.get_model(model_id, version)
                if model:
                    return model
        
        # No A/B test or test not applicable - return default
        model = self.get_model(model_id)
        if not model:
            raise ValueError(f"Model not found: {model_id}")
        
        return model
    
    def get_variant_assignment(
        self,
        model_id: str,
        tenant_id: str,
    ) -> Dict[str, Any]:
        """
        Get detailed variant assignment info for a tenant.
        
        Args:
            model_id: Model identifier
            tenant_id: Tenant identifier
            
        Returns:
            Dict with variant assignment details
        """
        ab_test = self._ab_tests.get(model_id)
        
        result = {
            "modelId": model_id,
            "tenantId": tenant_id,
            "abTestActive": False,
            "variant": "default",
            "version": None,
        }
        
        if ab_test and ab_test.enabled:
            variant_hash = self.compute_variant_hash(tenant_id, ab_test.test_id)
            is_treatment = variant_hash < ab_test.traffic_split
            
            result["abTestActive"] = True
            result["testId"] = ab_test.test_id
            result["variant"] = "treatment" if is_treatment else "control"
            result["version"] = ab_test.treatment_version if is_treatment else ab_test.control_version
            result["variantHash"] = variant_hash
        else:
            default_version = self._default_versions.get(model_id)
            result["version"] = default_version
        
        return result
    
    def list_models(self, model_type: Optional[ModelType] = None) -> List[Dict]:
        """List all registered models."""
        result = []
        for model_id, versions in self._models.items():
            for version, model in versions.items():
                if model_type is None or model.model_type == model_type:
                    result.append(model.to_dict())
        return result
    
    def list_ab_tests(self) -> List[Dict]:
        """List all A/B tests."""
        return [test.to_dict() for test in self._ab_tests.values()]


# Global registry instance
_registry: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    """Get the global model registry instance."""
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
        _initialize_default_models(_registry)
    return _registry


def _initialize_default_models(registry: ModelRegistry) -> None:
    """Initialize registry with default models."""
    # Default intent model
    registry.register_model(ModelVersion(
        model_id="intent_classifier",
        version="1.0.0",
        model_name=os.getenv("AI_MODEL_NAME", "qwen2.5:7b-instruct"),
        model_type=ModelType.INTENT,
        status=ModelStatus.ACTIVE,
        config={
            "max_tokens": 256,
            "temperature": 0.3,
        },
    ))
    
    # Default planning model
    registry.register_model(ModelVersion(
        model_id="action_planner",
        version="1.0.0",
        model_name=os.getenv("AI_MODEL_NAME", "qwen2.5:7b-instruct"),
        model_type=ModelType.PLANNING,
        status=ModelStatus.ACTIVE,
        config={
            "max_tokens": 1024,
            "temperature": 0.5,
        },
    ))
    
    # Default general model
    registry.register_model(ModelVersion(
        model_id="general",
        version="1.0.0",
        model_name=os.getenv("AI_MODEL_NAME", "qwen2.5:7b-instruct"),
        model_type=ModelType.GENERAL,
        status=ModelStatus.ACTIVE,
        config={
            "max_tokens": 2048,
            "temperature": 0.7,
        },
    ))
