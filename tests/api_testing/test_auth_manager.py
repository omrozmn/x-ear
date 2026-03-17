"""Unit tests for auth manager."""
import pytest
from .auth_manager import AuthManager


class TestAuthManager:
    """Unit tests for authentication management."""
    
    def test_auth_manager_initialization(self):
        """Test AuthManager can be initialized."""
        manager = AuthManager("http://localhost:5003")
        
        assert manager is not None, "AuthManager should be instantiated"
        assert manager.base_url == "http://localhost:5003", "Base URL should be stored"
        assert manager.admin_token is None, "Admin token should be None initially"
        assert manager.tenant_token is None, "Tenant token should be None initially"
    
    def test_get_token_for_admin_endpoint(self):
        """Test token selection for admin endpoints."""
        manager = AuthManager("http://localhost:5003")
        manager.admin_token = "admin_token_123"
        manager.tenant_token = "tenant_token_456"
        
        # Admin endpoints should use admin token
        token = manager.get_token_for_endpoint("/api/admin/users")
        assert token == "admin_token_123", "Admin endpoint should use admin token"
        
        token = manager.get_token_for_endpoint("/api/admin/tenants")
        assert token == "admin_token_123", "Admin endpoint should use admin token"
    
    def test_get_token_for_tenant_endpoint(self):
        """Test token selection for tenant endpoints."""
        manager = AuthManager("http://localhost:5003")
        manager.admin_token = "admin_token_123"
        manager.tenant_token = "tenant_token_456"
        
        # Tenant endpoints should use tenant token
        token = manager.get_token_for_endpoint("/api/parties")
        assert token == "tenant_token_456", "Tenant endpoint should use tenant token"
        
        token = manager.get_token_for_endpoint("/api/sales")
        assert token == "tenant_token_456", "Tenant endpoint should use tenant token"
    
    def test_get_token_for_affiliate_endpoint(self):
        """Test token selection for affiliate endpoints."""
        manager = AuthManager("http://localhost:5003")
        manager.admin_token = "admin_token_123"
        manager.affiliate_token = "affiliate_token_789"
        
        # Affiliate endpoints should use affiliate token
        token = manager.get_token_for_endpoint("/api/affiliates/dashboard")
        assert token == "affiliate_token_789", "Affiliate endpoint should use affiliate token"
    
    def test_get_effective_tenant_header_with_tenant(self):
        """Test effective tenant header generation."""
        manager = AuthManager("http://localhost:5003")
        manager.current_tenant_id = "tenant_123"
        
        header = manager.get_effective_tenant_header("/api/admin/users")
        
        assert header is not None, "Should return header for admin endpoint"
        assert header == "system", "Should return 'system' for admin endpoints"
    
    def test_get_effective_tenant_header_without_tenant(self):
        """Test effective tenant header when no tenant set."""
        manager = AuthManager("http://localhost:5003")
        
        header = manager.get_effective_tenant_header("/api/admin/users")
        
        assert header == "system", "Should return 'system' for admin endpoints"
    
    def test_get_effective_tenant_header_for_non_admin(self):
        """Test effective tenant header for non-admin endpoints."""
        manager = AuthManager("http://localhost:5003")
        manager.current_tenant_id = "tenant_123"
        
        header = manager.get_effective_tenant_header("/api/parties")
        
        assert header is None, "Should return None for non-admin endpoints"
    
    def test_token_fallback_to_admin(self):
        """Test that tenant endpoints raise error if tenant token not available."""
        manager = AuthManager("http://localhost:5003")
        manager.admin_token = "admin_token_123"
        # No tenant token set
        
        with pytest.raises(ValueError, match="Tenant token not available"):
            manager.get_token_for_endpoint("/api/parties")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
