"""Unit tests for resource manager."""
import pytest
from .resource_manager import ResourceRegistry, ResourceManager


class TestResourceRegistry:
    """Unit tests for ResourceRegistry."""
    
    def test_registry_initialization(self):
        """Test ResourceRegistry can be initialized."""
        registry = ResourceRegistry()
        
        assert registry is not None, "Registry should be instantiated"
        assert registry.tenant_id is None, "tenant_id should be None initially"
        assert registry.party_id is None, "party_id should be None initially"
        assert len(registry.created_resources) == 0, "created_resources should be empty"
    
    def test_registry_set_and_get(self):
        """Test setting and getting resource IDs."""
        registry = ResourceRegistry()
        
        registry.set("TENANT", "tenant_123", "/api/admin/tenants")
        
        assert registry.tenant_id == "tenant_123", "tenant_id should be set"
        assert registry.get("TENANT") == "tenant_123", "get should return tenant_id"
        assert len(registry.created_resources) == 1, "Should track created resource"
    
    def test_registry_multiple_resources(self):
        """Test setting multiple resources."""
        registry = ResourceRegistry()
        
        registry.set("TENANT", "tenant_123")
        registry.set("PARTY", "party_456")
        registry.set("DEVICE", "device_789")
        
        assert registry.tenant_id == "tenant_123", "tenant_id should be set"
        assert registry.party_id == "party_456", "party_id should be set"
        assert registry.device_id == "device_789", "device_id should be set"
        assert len(registry.created_resources) == 3, "Should track all resources"
    
    def test_registry_get_nonexistent(self):
        """Test getting non-existent resource returns None."""
        registry = ResourceRegistry()
        
        result = registry.get("NONEXISTENT")
        
        assert result is None, "Should return None for non-existent resource"
    
    def test_registry_created_resources_tracking(self):
        """Test that created_resources tracks all resources."""
        registry = ResourceRegistry()
        
        registry.set("TENANT", "tenant_123", "/api/admin/tenants")
        registry.set("PARTY", "party_456", "/api/parties")
        
        assert len(registry.created_resources) == 2, "Should track 2 resources"
        
        # Check first resource
        first = registry.created_resources[0]
        assert first["type"] == "TENANT", "First resource should be TENANT"
        assert first["id"] == "tenant_123", "First resource ID should match"
        assert first["endpoint"] == "/api/admin/tenants", "Endpoint should match"


class TestResourceManager:
    """Unit tests for ResourceManager."""
    
    def test_resource_manager_initialization(self):
        """Test ResourceManager can be initialized."""
        manager = ResourceManager("http://localhost:5003")
        
        assert manager is not None, "ResourceManager should be instantiated"
        assert manager.base_url == "http://localhost:5003", "Base URL should be stored"
        assert manager.registry is not None, "Registry should be initialized"
    
    def test_extract_resource_id_from_response(self):
        """Test extracting resource ID from API response."""
        manager = ResourceManager("http://localhost:5003")
        
        # Test with data.id format
        response = {"data": {"id": "resource_123"}}
        resource_id = manager.extract_resource_id(response, "TENANT")
        
        assert resource_id == "resource_123", "Should extract ID from data.id"
    
    def test_extract_resource_id_from_nested_response(self):
        """Test extracting resource ID from nested response."""
        manager = ResourceManager("http://localhost:5003")
        
        # Test with data.tenant.id format
        response = {"data": {"tenant": {"id": "tenant_123"}}}
        resource_id = manager.extract_resource_id(response, "TENANT")
        
        assert resource_id == "tenant_123", "Should extract ID from nested structure"
    
    def test_extract_resource_id_from_direct_id(self):
        """Test extracting resource ID from direct id field."""
        manager = ResourceManager("http://localhost:5003")
        
        # Test with direct id format
        response = {"id": "resource_123"}
        resource_id = manager.extract_resource_id(response, "PARTY")
        
        assert resource_id == "resource_123", "Should extract ID from direct id field"
    
    def test_extract_resource_id_returns_none_when_missing(self):
        """Test that extract_resource_id returns None when ID not found."""
        manager = ResourceManager("http://localhost:5003")
        
        response = {"data": {"name": "Test"}}
        resource_id = manager.extract_resource_id(response, "TENANT")
        
        assert resource_id is None, "Should return None when ID not found"
    
    def test_get_creation_order(self):
        """Test that get_creation_order returns correct order."""
        manager = ResourceManager("http://localhost:5003")
        order = manager.get_creation_order()
        
        assert isinstance(order, list), "Should return a list"
        assert len(order) > 0, "Should have resources in order"
        
        # Check that TENANT comes before PARTY
        tenant_idx = order.index("TENANT")
        party_idx = order.index("PARTY")
        
        assert tenant_idx < party_idx, "TENANT should come before PARTY"
    
    def test_get_creation_order_dependencies(self):
        """Test that creation order respects dependencies."""
        manager = ResourceManager("http://localhost:5003")
        order = manager.get_creation_order()
        
        # TENANT should come before PARTY
        if "TENANT" in order and "PARTY" in order:
            tenant_idx = order.index("TENANT")
            party_idx = order.index("PARTY")
            assert tenant_idx < party_idx, "TENANT should come before PARTY"
        
        # PARTY should come before DEVICE
        if "PARTY" in order and "DEVICE" in order:
            party_idx = order.index("PARTY")
            device_idx = order.index("DEVICE")
            assert party_idx < device_idx, "PARTY should come before DEVICE"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
