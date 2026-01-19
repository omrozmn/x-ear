"""
Tests for Kill Switch Service

Tests the kill switch functionality at three scopes:
- Global: Disables all AI features
- Tenant: Disables AI for specific tenants
- Capability: Disables specific AI capabilities (chat, actions, OCR)

Requirements tested:
- 15.3: Kill_Switch with three scopes
- 15.4: Reject all new requests immediately when activated
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from ai.services.kill_switch import (
    KillSwitch,
    KillSwitchScope,
    KillSwitchState,
    KillSwitchCheckResult,
    KillSwitchActiveError,
    AICapability,
    get_kill_switch,
    reset_kill_switch,
    is_kill_switch_active,
    activate_global_kill_switch,
    deactivate_global_kill_switch,
    activate_tenant_kill_switch,
    deactivate_tenant_kill_switch,
    activate_capability_kill_switch,
    deactivate_capability_kill_switch,
    require_kill_switch_inactive,
)


@pytest.fixture(autouse=True)
def reset_kill_switch_fixture():
    """Reset kill switch before and after each test."""
    reset_kill_switch()
    yield
    reset_kill_switch()


class TestKillSwitchSingleton:
    """Tests for singleton pattern."""
    
    def test_get_returns_same_instance(self):
        """get() should return the same instance."""
        ks1 = KillSwitch.get()
        ks2 = KillSwitch.get()
        assert ks1 is ks2
    
    def test_reset_creates_new_instance(self):
        """reset() should create a new instance."""
        ks1 = KillSwitch.get()
        KillSwitch.reset()
        ks2 = KillSwitch.get()
        assert ks1 is not ks2
    
    def test_convenience_function_get_kill_switch(self):
        """get_kill_switch() should return singleton."""
        ks1 = get_kill_switch()
        ks2 = KillSwitch.get()
        assert ks1 is ks2


class TestGlobalKillSwitch:
    """Tests for global kill switch."""
    
    def test_global_initially_inactive(self):
        """Global kill switch should be inactive by default."""
        ks = KillSwitch.get()
        assert not ks.is_global_active()
    
    def test_activate_global(self):
        """Should activate global kill switch."""
        ks = KillSwitch.get()
        state = ks.activate_global(user_id="admin", reason="Emergency")
        
        assert state.active is True
        assert state.scope == KillSwitchScope.GLOBAL
        assert state.activated_by == "admin"
        assert state.reason == "Emergency"
        assert state.activated_at is not None
        assert ks.is_global_active()
    
    def test_deactivate_global(self):
        """Should deactivate global kill switch."""
        ks = KillSwitch.get()
        ks.activate_global(user_id="admin", reason="Emergency")
        
        state = ks.deactivate_global(user_id="admin")
        
        assert state.active is False
        assert not ks.is_global_active()
    
    def test_get_global_state(self):
        """Should return global state."""
        ks = KillSwitch.get()
        ks.activate_global(user_id="admin", reason="Test")
        
        state = ks.get_global_state()
        
        assert state.active is True
        assert state.reason == "Test"
    
    def test_convenience_activate_global(self):
        """Convenience function should activate global."""
        state = activate_global_kill_switch(user_id="admin", reason="Test")
        
        assert state.active is True
        assert is_kill_switch_active()
    
    def test_convenience_deactivate_global(self):
        """Convenience function should deactivate global."""
        activate_global_kill_switch(user_id="admin", reason="Test")
        state = deactivate_global_kill_switch(user_id="admin")
        
        assert state.active is False
        assert not is_kill_switch_active()


class TestTenantKillSwitch:
    """Tests for tenant-level kill switch."""
    
    def test_tenant_initially_inactive(self):
        """Tenant kill switch should be inactive by default."""
        ks = KillSwitch.get()
        assert not ks.is_tenant_active("tenant-1")
    
    def test_activate_tenant(self):
        """Should activate tenant kill switch."""
        ks = KillSwitch.get()
        state = ks.activate_tenant(
            tenant_id="tenant-1",
            user_id="admin",
            reason="Abuse detected",
        )
        
        assert state.active is True
        assert state.scope == KillSwitchScope.TENANT
        assert state.target_id == "tenant-1"
        assert state.reason == "Abuse detected"
        assert ks.is_tenant_active("tenant-1")
    
    def test_activate_tenant_does_not_affect_others(self):
        """Activating for one tenant should not affect others."""
        ks = KillSwitch.get()
        ks.activate_tenant(
            tenant_id="tenant-1",
            user_id="admin",
            reason="Test",
        )
        
        assert ks.is_tenant_active("tenant-1")
        assert not ks.is_tenant_active("tenant-2")
    
    def test_deactivate_tenant(self):
        """Should deactivate tenant kill switch."""
        ks = KillSwitch.get()
        ks.activate_tenant(
            tenant_id="tenant-1",
            user_id="admin",
            reason="Test",
        )
        
        state = ks.deactivate_tenant(tenant_id="tenant-1", user_id="admin")
        
        assert state.active is False
        assert not ks.is_tenant_active("tenant-1")
    
    def test_get_tenant_state(self):
        """Should return tenant state."""
        ks = KillSwitch.get()
        ks.activate_tenant(
            tenant_id="tenant-1",
            user_id="admin",
            reason="Test",
        )
        
        state = ks.get_tenant_state("tenant-1")
        
        assert state is not None
        assert state.active is True
        assert state.target_id == "tenant-1"
    
    def test_get_tenant_state_returns_none_for_unknown(self):
        """Should return None for unknown tenant."""
        ks = KillSwitch.get()
        state = ks.get_tenant_state("unknown-tenant")
        assert state is None
    
    def test_get_all_tenant_states(self):
        """Should return all tenant states."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Test 1")
        ks.activate_tenant("tenant-2", "admin", "Test 2")
        
        states = ks.get_all_tenant_states()
        
        assert len(states) == 2
        assert "tenant-1" in states
        assert "tenant-2" in states
    
    def test_convenience_activate_tenant(self):
        """Convenience function should activate tenant."""
        state = activate_tenant_kill_switch(
            tenant_id="tenant-1",
            user_id="admin",
            reason="Test",
        )
        
        assert state.active is True
        assert is_kill_switch_active(tenant_id="tenant-1")
    
    def test_convenience_deactivate_tenant(self):
        """Convenience function should deactivate tenant."""
        activate_tenant_kill_switch("tenant-1", "admin", "Test")
        state = deactivate_tenant_kill_switch("tenant-1", "admin")
        
        assert state.active is False
        assert not is_kill_switch_active(tenant_id="tenant-1")


class TestCapabilityKillSwitch:
    """Tests for capability-level kill switch."""
    
    def test_capability_initially_inactive(self):
        """Capability kill switch should be inactive by default."""
        ks = KillSwitch.get()
        assert not ks.is_capability_active(AICapability.CHAT)
        assert not ks.is_capability_active(AICapability.ACTIONS)
        assert not ks.is_capability_active(AICapability.OCR)
    
    def test_activate_capability(self):
        """Should activate capability kill switch."""
        ks = KillSwitch.get()
        state = ks.activate_capability(
            capability=AICapability.CHAT,
            user_id="admin",
            reason="Chat service issue",
        )
        
        assert state.active is True
        assert state.scope == KillSwitchScope.CAPABILITY
        assert state.target_id == "chat"
        assert ks.is_capability_active(AICapability.CHAT)
    
    def test_activate_capability_does_not_affect_others(self):
        """Activating one capability should not affect others."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        assert ks.is_capability_active(AICapability.CHAT)
        assert not ks.is_capability_active(AICapability.ACTIONS)
        assert not ks.is_capability_active(AICapability.OCR)
    
    def test_activate_all_capabilities(self):
        """Activating ALL should disable all capabilities."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.ALL, "admin", "Full shutdown")
        
        assert ks.is_capability_active(AICapability.ALL)
        assert ks.is_capability_active(AICapability.CHAT)
        assert ks.is_capability_active(AICapability.ACTIONS)
        assert ks.is_capability_active(AICapability.OCR)
    
    def test_deactivate_capability(self):
        """Should deactivate capability kill switch."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        state = ks.deactivate_capability(AICapability.CHAT, "admin")
        
        assert state.active is False
        assert not ks.is_capability_active(AICapability.CHAT)
    
    def test_get_capability_state(self):
        """Should return capability state."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.ACTIONS, "admin", "Test")
        
        state = ks.get_capability_state(AICapability.ACTIONS)
        
        assert state is not None
        assert state.active is True
        assert state.target_id == "actions"
    
    def test_get_all_capability_states(self):
        """Should return all capability states."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test 1")
        ks.activate_capability(AICapability.OCR, "admin", "Test 2")
        
        states = ks.get_all_capability_states()
        
        assert len(states) == 2
        assert AICapability.CHAT in states
        assert AICapability.OCR in states
    
    def test_convenience_activate_capability(self):
        """Convenience function should activate capability."""
        state = activate_capability_kill_switch(
            capability=AICapability.CHAT,
            user_id="admin",
            reason="Test",
        )
        
        assert state.active is True
        assert is_kill_switch_active(capability=AICapability.CHAT)
    
    def test_convenience_deactivate_capability(self):
        """Convenience function should deactivate capability."""
        activate_capability_kill_switch(AICapability.CHAT, "admin", "Test")
        state = deactivate_capability_kill_switch(AICapability.CHAT, "admin")
        
        assert state.active is False
        assert not is_kill_switch_active(capability=AICapability.CHAT)


class TestKillSwitchCheck:
    """Tests for combined kill switch checking."""
    
    def test_check_returns_not_blocked_when_inactive(self):
        """Check should return not blocked when all switches inactive."""
        ks = KillSwitch.get()
        result = ks.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        
        assert result.blocked is False
        assert result.scope is None
    
    def test_check_global_blocks_all(self):
        """Global kill switch should block all requests."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency")
        
        result = ks.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        
        assert result.blocked is True
        assert result.scope == KillSwitchScope.GLOBAL
        assert result.reason == "Emergency"
    
    def test_check_tenant_blocks_specific_tenant(self):
        """Tenant kill switch should block specific tenant."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Abuse")
        
        result1 = ks.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        result2 = ks.check(tenant_id="tenant-2", capability=AICapability.CHAT)
        
        assert result1.blocked is True
        assert result1.scope == KillSwitchScope.TENANT
        assert result1.target_id == "tenant-1"
        
        assert result2.blocked is False
    
    def test_check_capability_blocks_specific_capability(self):
        """Capability kill switch should block specific capability."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Chat issue")
        
        result1 = ks.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        result2 = ks.check(tenant_id="tenant-1", capability=AICapability.ACTIONS)
        
        assert result1.blocked is True
        assert result1.scope == KillSwitchScope.CAPABILITY
        assert result1.target_id == "chat"
        
        assert result2.blocked is False
    
    def test_check_priority_global_over_tenant(self):
        """Global should take priority over tenant."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Global reason")
        ks.activate_tenant("tenant-1", "admin", "Tenant reason")
        
        result = ks.check(tenant_id="tenant-1")
        
        assert result.blocked is True
        assert result.scope == KillSwitchScope.GLOBAL
        assert result.reason == "Global reason"
    
    def test_check_priority_tenant_over_capability(self):
        """Tenant should take priority over capability."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Tenant reason")
        ks.activate_capability(AICapability.CHAT, "admin", "Capability reason")
        
        result = ks.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        
        assert result.blocked is True
        assert result.scope == KillSwitchScope.TENANT
        assert result.reason == "Tenant reason"
    
    def test_require_not_blocked_passes_when_inactive(self):
        """require_not_blocked should pass when not blocked."""
        ks = KillSwitch.get()
        # Should not raise
        ks.require_not_blocked(tenant_id="tenant-1", capability=AICapability.CHAT)
    
    def test_require_not_blocked_raises_when_blocked(self):
        """require_not_blocked should raise when blocked."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency")
        
        with pytest.raises(KillSwitchActiveError) as exc_info:
            ks.require_not_blocked(tenant_id="tenant-1")
        
        assert exc_info.value.scope == KillSwitchScope.GLOBAL
        assert exc_info.value.reason == "Emergency"


class TestKillSwitchBulkOperations:
    """Tests for bulk operations."""
    
    def test_deactivate_all(self):
        """deactivate_all should clear all kill switches."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Test")
        ks.activate_tenant("tenant-1", "admin", "Test")
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        ks.deactivate_all("admin")
        
        assert not ks.is_global_active()
        assert not ks.is_tenant_active("tenant-1")
        assert not ks.is_capability_active(AICapability.CHAT)
    
    def test_get_all_active(self):
        """get_all_active should return all active switches."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Test 1")
        ks.activate_tenant("tenant-1", "admin", "Test 2")
        ks.activate_capability(AICapability.CHAT, "admin", "Test 3")
        
        active = ks.get_all_active()
        
        assert len(active) == 3
        scopes = [s.scope for s in active]
        assert KillSwitchScope.GLOBAL in scopes
        assert KillSwitchScope.TENANT in scopes
        assert KillSwitchScope.CAPABILITY in scopes
    
    def test_is_any_active_true(self):
        """is_any_active should return True when any switch active."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Test")
        
        assert ks.is_any_active() is True
    
    def test_is_any_active_false(self):
        """is_any_active should return False when all inactive."""
        ks = KillSwitch.get()
        assert ks.is_any_active() is False


class TestKillSwitchDecorator:
    """Tests for the decorator."""
    
    def test_decorator_passes_when_inactive(self):
        """Decorator should allow function execution when inactive."""
        @require_kill_switch_inactive(capability=AICapability.CHAT)
        def my_function(tenant_id: str) -> str:
            return f"Hello {tenant_id}"
        
        result = my_function(tenant_id="tenant-1")
        assert result == "Hello tenant-1"
    
    def test_decorator_raises_when_blocked(self):
        """Decorator should raise when kill switch active."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        @require_kill_switch_inactive(capability=AICapability.CHAT)
        def my_function(tenant_id: str) -> str:
            return f"Hello {tenant_id}"
        
        with pytest.raises(KillSwitchActiveError):
            my_function(tenant_id="tenant-1")
    
    def test_decorator_checks_tenant(self):
        """Decorator should check tenant-level switch."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Test")
        
        @require_kill_switch_inactive()
        def my_function(tenant_id: str) -> str:
            return f"Hello {tenant_id}"
        
        # Should raise for tenant-1
        with pytest.raises(KillSwitchActiveError):
            my_function(tenant_id="tenant-1")
        
        # Should pass for tenant-2
        result = my_function(tenant_id="tenant-2")
        assert result == "Hello tenant-2"


class TestKillSwitchStateSerialization:
    """Tests for state serialization."""
    
    def test_state_to_dict(self):
        """State should serialize to dict correctly."""
        state = KillSwitchState(
            active=True,
            scope=KillSwitchScope.GLOBAL,
            activated_by="admin",
            activated_at=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            reason="Test",
        )
        
        d = state.to_dict()
        
        assert d["active"] is True
        assert d["scope"] == "global"
        assert d["activated_by"] == "admin"
        assert d["reason"] == "Test"
        assert "2024-01-01" in d["activated_at"]
    
    def test_check_result_to_dict(self):
        """Check result should serialize to dict correctly."""
        result = KillSwitchCheckResult(
            blocked=True,
            scope=KillSwitchScope.TENANT,
            target_id="tenant-1",
            reason="Test",
        )
        
        d = result.to_dict()
        
        assert d["blocked"] is True
        assert d["scope"] == "tenant"
        assert d["target_id"] == "tenant-1"
        assert d["reason"] == "Test"
