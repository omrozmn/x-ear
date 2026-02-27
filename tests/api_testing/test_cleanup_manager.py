"""Unit tests for cleanup manager."""
import pytest
from unittest.mock import Mock, patch
from .cleanup_manager import CleanupManager
from .resource_manager import ResourceRegistry


class TestCleanupManager:
    """Unit tests for CleanupManager."""
    
    def test_cleanup_manager_initialization(self):
        """Test CleanupManager can be initialized."""
        manager = CleanupManager("http://localhost:5003")
        
        assert manager is not None, "Manager should be instantiated"
        assert manager.base_url == "http://localhost:5003", "Base URL should be stored"
        assert manager.timeout == 15, "Default timeout should be 15"
    
    def test_cleanup_manager_custom_timeout(self):
        """Test CleanupManager with custom timeout."""
        manager = CleanupManager("http://localhost:5003", timeout=30)
        
        assert manager.timeout == 30, "Custom timeout should be stored"
    
    def test_cleanup_manager_strips_trailing_slash(self):
        """Test that base URL trailing slash is stripped."""
        manager = CleanupManager("http://localhost:5003/")
        
        assert manager.base_url == "http://localhost:5003", \
            "Trailing slash should be stripped"
    
    @patch('requests.delete')
    def test_cleanup_with_empty_registry(self, mock_delete):
        """Test cleanup with empty registry."""
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        
        # No resources to delete
        manager.cleanup(registry, "admin_token_123")
        
        # Should not make any DELETE requests (all IDs are None)
        assert mock_delete.call_count == 0, \
            "Should not delete when no resources exist"
    
    @patch('requests.delete')
    def test_cleanup_with_single_resource(self, mock_delete):
        """Test cleanup with single resource."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Should make DELETE request for party
        assert mock_delete.call_count >= 1, "Should delete party"
        
        # Verify one of the calls was for party
        party_deleted = False
        for call in mock_delete.call_args_list:
            url = call[0][0] if call[0] else call[1].get('url', '')
            if 'party_123' in url:
                party_deleted = True
                break
        
        assert party_deleted, "Should delete party resource"
    
    @patch('requests.delete')
    def test_cleanup_with_multiple_resources(self, mock_delete):
        """Test cleanup with multiple resources."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.tenant_id = "tenant_123"
        registry.party_id = "party_456"
        registry.device_id = "device_789"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Should make DELETE requests for all resources
        assert mock_delete.call_count >= 3, "Should delete all resources"
    
    @patch('requests.delete')
    def test_cleanup_continues_on_failure(self, mock_delete):
        """Test that cleanup continues even if one deletion fails."""
        # First call fails, second succeeds
        mock_response_fail = Mock()
        mock_response_fail.status_code = 500
        
        mock_response_success = Mock()
        mock_response_success.status_code = 204
        
        mock_delete.side_effect = [mock_response_fail, mock_response_success, mock_response_success]
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.tenant_id = "tenant_123"
        registry.party_id = "party_456"
        registry.device_id = "device_789"
        
        # Should not raise exception
        manager.cleanup(registry, "admin_token_123")
        
        # Should have attempted all deletions
        assert mock_delete.call_count >= 3, "Should attempt all deletions"
    
    @patch('requests.delete')
    def test_cleanup_handles_404_as_success(self, mock_delete):
        """Test that 404 responses are treated as successful cleanup."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        # Should not raise exception
        manager.cleanup(registry, "admin_token_123")
        
        assert mock_delete.call_count >= 1, "Should attempt deletion"
    
    @patch('requests.delete')
    def test_cleanup_handles_200_as_success(self, mock_delete):
        """Test that 200 responses are treated as successful cleanup."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        # Should not raise exception
        manager.cleanup(registry, "admin_token_123")
        
        assert mock_delete.call_count >= 1, "Should attempt deletion"
    
    @patch('requests.delete')
    def test_cleanup_handles_204_as_success(self, mock_delete):
        """Test that 204 responses are treated as successful cleanup."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        # Should not raise exception
        manager.cleanup(registry, "admin_token_123")
        
        assert mock_delete.call_count >= 1, "Should attempt deletion"
    
    @patch('requests.delete')
    def test_cleanup_includes_auth_header(self, mock_delete):
        """Test that cleanup includes Authorization header."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Verify Authorization header was included
        assert mock_delete.call_count >= 1, "Should make DELETE request"
        
        # Check headers in one of the calls
        for call in mock_delete.call_args_list:
            headers = call[1].get('headers', {})
            if 'Authorization' in headers:
                assert headers['Authorization'] == "Bearer admin_token_123", \
                    "Should include correct auth token"
                break
    
    @patch('requests.delete')
    def test_cleanup_includes_effective_tenant_for_admin_resources(self, mock_delete):
        """Test that cleanup includes X-Effective-Tenant-Id for admin resources."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.tenant_id = "tenant_123"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Verify X-Effective-Tenant-Id header was included for tenant deletion
        assert mock_delete.call_count >= 1, "Should make DELETE request"
        
        # Check for effective tenant header in tenant deletion call
        for call in mock_delete.call_args_list:
            url = call[0][0] if call[0] else call[1].get('url', '')
            if 'tenants' in url:
                headers = call[1].get('headers', {})
                assert 'X-Effective-Tenant-Id' in headers, \
                    "Should include effective tenant header for admin resources"
                assert headers['X-Effective-Tenant-Id'] == "system", \
                    "Should use 'system' as effective tenant"
                break
    
    @patch('requests.delete')
    def test_cleanup_handles_exception(self, mock_delete):
        """Test that cleanup handles exceptions gracefully."""
        mock_delete.side_effect = Exception("Network error")
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.party_id = "party_123"
        
        # Should not raise exception
        manager.cleanup(registry, "admin_token_123")
        
        assert mock_delete.call_count >= 1, "Should attempt deletion"
    
    @patch('requests.delete')
    def test_cleanup_skips_null_resources(self, mock_delete):
        """Test that cleanup skips resources with null IDs."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        # Only set one resource, others are None
        registry.party_id = "party_123"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Should only delete party (not attempt to delete None resources)
        # Count should be less than total possible resources
        assert mock_delete.call_count < 19, \
            "Should skip resources with None IDs"
    
    @patch('requests.delete')
    def test_cleanup_reverse_order(self, mock_delete):
        """Test that cleanup deletes in reverse dependency order."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response
        
        manager = CleanupManager("http://localhost:5003")
        registry = ResourceRegistry()
        registry.tenant_id = "tenant_123"
        registry.party_id = "party_456"
        
        manager.cleanup(registry, "admin_token_123")
        
        # Verify deletion order: party should be deleted before tenant
        urls = []
        for call in mock_delete.call_args_list:
            url = call[0][0] if call[0] else call[1].get('url', '')
            urls.append(url)
        
        party_index = -1
        tenant_index = -1
        
        for i, url in enumerate(urls):
            if 'parties' in url and 'party_456' in url:
                party_index = i
            if 'tenants' in url and 'tenant_123' in url:
                tenant_index = i
        
        if party_index >= 0 and tenant_index >= 0:
            assert party_index < tenant_index, \
                "Party should be deleted before tenant (reverse dependency order)"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
