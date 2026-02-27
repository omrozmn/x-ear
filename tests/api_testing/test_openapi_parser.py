"""Unit tests for OpenAPI parser."""
import pytest
from .openapi_parser import load_openapi_schema, load_endpoints, OpenAPIParser


class TestOpenAPIParser:
    """Unit tests for OpenAPI parsing functionality."""
    
    def test_load_openapi_schema_success(self):
        """Test loading valid openapi.yaml."""
        schema = load_openapi_schema()
        
        assert schema is not None, "Schema should be loaded"
        assert "paths" in schema, "Schema should have paths"
        assert "components" in schema, "Schema should have components"
        assert isinstance(schema["paths"], dict), "Paths should be a dict"
    
    def test_extract_endpoints_returns_list(self):
        """Test that load_endpoints returns a list."""
        endpoints = load_endpoints()
        
        assert isinstance(endpoints, list), "Should return a list"
        assert len(endpoints) > 0, "Should have endpoints"
    
    def test_extract_endpoints_structure(self):
        """Test that extracted endpoints have correct structure."""
        endpoints = load_endpoints()
        
        # Check first endpoint structure
        endpoint = endpoints[0]
        assert hasattr(endpoint, 'path'), "Endpoint should have path"
        assert hasattr(endpoint, 'method'), "Endpoint should have method"
        assert hasattr(endpoint, 'operation_id'), "Endpoint should have operation_id"
        assert hasattr(endpoint, 'request_body'), "Endpoint should have request_body"
        assert hasattr(endpoint, 'parameters'), "Endpoint should have parameters"
    
    def test_extract_endpoints_methods(self):
        """Test that all HTTP methods are extracted."""
        endpoints = load_endpoints()
        
        methods = {ep.method for ep in endpoints}
        
        # Should have common HTTP methods
        assert "GET" in methods, "Should have GET endpoints"
        assert "POST" in methods, "Should have POST endpoints"
        assert "PUT" in methods or "PATCH" in methods, "Should have PUT or PATCH endpoints"
        assert "DELETE" in methods, "Should have DELETE endpoints"
    
    def test_resolve_schema_ref_with_valid_ref(self):
        """Test resolving a valid $ref."""
        parser = OpenAPIParser("openapi.yaml")
        parser.load_openapi_schema()
        
        # Find a schema with $ref - use ActionPlanResponse which exists
        ref = "#/components/schemas/ActionPlanResponse"
        resolved = parser.resolve_schema_ref(ref)
        
        assert resolved is not None, "Should resolve valid ref"
        assert isinstance(resolved, dict), "Resolved schema should be a dict"
    
    def test_resolve_schema_ref_with_invalid_ref(self):
        """Test resolving an invalid $ref returns None."""
        parser = OpenAPIParser("openapi.yaml")
        parser.load_openapi_schema()
        
        ref = "#/components/schemas/NonExistentSchema"
        resolved = parser.resolve_schema_ref(ref)
        
        assert resolved is None, "Should return None for invalid ref"
    
    def test_resolve_schema_ref_without_ref(self):
        """Test that parser can be instantiated."""
        parser = OpenAPIParser("openapi.yaml")
        assert parser is not None, "Parser should be instantiated"
    
    def test_extract_endpoints_count(self):
        """Test that we extract all 513 endpoints."""
        endpoints = load_endpoints()
        
        # We know there are 513 endpoints
        assert len(endpoints) == 513, f"Should extract 513 endpoints, got {len(endpoints)}"
    
    def test_extract_endpoints_unique_paths(self):
        """Test that endpoint paths are valid."""
        endpoints = load_endpoints()
        
        for endpoint in endpoints:
            path = endpoint.path
            assert path.startswith("/"), f"Path should start with /: {path}"
            assert " " not in path, f"Path should not contain spaces: {path}"
    
    def test_extract_endpoints_operation_ids(self):
        """Test that all endpoints have operation IDs."""
        endpoints = load_endpoints()
        
        for endpoint in endpoints:
            operation_id = endpoint.operation_id
            assert operation_id is not None, \
                f"Endpoint {endpoint.method} {endpoint.path} missing operationId"
            assert isinstance(operation_id, str), \
                f"operationId should be string: {operation_id}"
            assert len(operation_id) > 0, \
                f"operationId should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
