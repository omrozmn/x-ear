"""
Unit tests for KillSwitchActiveError exception signature.

This test validates that the exception can be created with both old and new parameter styles.
"""

import pytest
from ai.services.kill_switch import KillSwitchActiveError, KillSwitchScope


class TestKillSwitchActiveError:
    """Test KillSwitchActiveError exception signature."""
    
    def test_exception_with_tenant_id_parameter(self):
        """Test that exception accepts tenant_id parameter (new style)."""
        # This is the signature used in test_integration_flows.py
        exc = KillSwitchActiveError(
            "AI chat disabled for tenant",
            tenant_id="test-tenant",
            capability="chat"
        )
        
        assert str(exc) == "AI chat disabled for tenant"
        assert exc.tenant_id == "test-tenant"
        assert exc.capability == "chat"
        assert exc.target_id == "test-tenant"  # Should use tenant_id as target_id
        assert exc.scope == KillSwitchScope.TENANT  # Should infer scope from tenant_id
    
    def test_exception_with_capability_parameter(self):
        """Test that exception accepts capability parameter (new style)."""
        exc = KillSwitchActiveError(
            "AI chat disabled",
            capability="chat"
        )
        
        assert str(exc) == "AI chat disabled"
        assert exc.capability == "chat"
        assert exc.target_id == "chat"  # Should use capability as target_id
        assert exc.scope == KillSwitchScope.CAPABILITY  # Should infer scope from capability
    
    def test_exception_with_old_style_parameters(self):
        """Test that exception still works with old parameter style."""
        exc = KillSwitchActiveError(
            message="AI features disabled",
            scope=KillSwitchScope.GLOBAL,
            target_id="global",
            reason="Emergency maintenance"
        )
        
        assert str(exc) == "AI features disabled"
        assert exc.scope == KillSwitchScope.GLOBAL
        assert exc.target_id == "global"
        assert exc.reason == "Emergency maintenance"
    
    def test_exception_with_default_message(self):
        """Test that exception has a default message."""
        exc = KillSwitchActiveError(tenant_id="test-tenant")
        
        assert str(exc) == "AI features disabled by kill switch"
        assert exc.tenant_id == "test-tenant"
        assert exc.target_id == "test-tenant"
        assert exc.scope == KillSwitchScope.TENANT
    
    def test_exception_scope_priority(self):
        """Test that explicit scope takes priority over inferred scope."""
        exc = KillSwitchActiveError(
            "Test message",
            scope=KillSwitchScope.GLOBAL,
            tenant_id="test-tenant"
        )
        
        # Explicit scope should be used
        assert exc.scope == KillSwitchScope.GLOBAL
        # But tenant_id should still be stored
        assert exc.tenant_id == "test-tenant"
        assert exc.target_id == "test-tenant"
    
    def test_exception_with_both_tenant_and_capability(self):
        """Test that tenant_id takes priority over capability when both provided."""
        exc = KillSwitchActiveError(
            "Test message",
            tenant_id="test-tenant",
            capability="chat"
        )
        
        # tenant_id should take priority
        assert exc.target_id == "test-tenant"
        assert exc.scope == KillSwitchScope.TENANT
        # But both should be stored
        assert exc.tenant_id == "test-tenant"
        assert exc.capability == "chat"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
