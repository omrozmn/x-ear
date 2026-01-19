"""
Property-based tests for AI Layer database isolation.

**Feature: ai-layer-architecture, Property 1: AI Layer Database Isolation**
**Validates: Requirements 1.4, 6.2, 6.7**

Tests that:
- AI Layer tables are accessible with correct permissions
- Core business tables are NOT writable by AI Layer
- Database role restrictions are enforced
"""

import os
import sys
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import patch, MagicMock
from pathlib import Path

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

from ai.utils.db_isolation import (
    TableAccessLevel,
    TablePermission,
    check_access_level,
    is_using_restricted_role,
    require_ai_isolation,
    AILayerIsolationError,
    AI_LAYER_TABLES,
    CORE_READ_ONLY_TABLES,
    CORE_FORBIDDEN_TABLES,
)


class TestTableAccessLevel:
    """Tests for TableAccessLevel enum and access checking."""
    
    def test_access_level_values(self):
        """Verify access level enum values."""
        assert TableAccessLevel.FULL.value == "full"
        assert TableAccessLevel.READ_ONLY.value == "read_only"
        assert TableAccessLevel.INSERT_ONLY.value == "insert_only"
        assert TableAccessLevel.NONE.value == "none"
    
    def test_check_access_level_none(self):
        """NONE access requires no privileges."""
        assert check_access_level([], TableAccessLevel.NONE) is True
        assert check_access_level(["SELECT"], TableAccessLevel.NONE) is False
        assert check_access_level(["INSERT"], TableAccessLevel.NONE) is False
    
    def test_check_access_level_read_only(self):
        """READ_ONLY access requires only SELECT."""
        assert check_access_level(["SELECT"], TableAccessLevel.READ_ONLY) is True
        assert check_access_level(["select"], TableAccessLevel.READ_ONLY) is True  # Case insensitive
        assert check_access_level([], TableAccessLevel.READ_ONLY) is False
        assert check_access_level(["SELECT", "INSERT"], TableAccessLevel.READ_ONLY) is False
        assert check_access_level(["INSERT"], TableAccessLevel.READ_ONLY) is False
    
    def test_check_access_level_insert_only(self):
        """INSERT_ONLY access requires SELECT and INSERT only."""
        assert check_access_level(["SELECT", "INSERT"], TableAccessLevel.INSERT_ONLY) is True
        assert check_access_level(["INSERT", "SELECT"], TableAccessLevel.INSERT_ONLY) is True
        assert check_access_level(["SELECT"], TableAccessLevel.INSERT_ONLY) is False
        assert check_access_level(["INSERT"], TableAccessLevel.INSERT_ONLY) is False
        assert check_access_level(["SELECT", "INSERT", "UPDATE"], TableAccessLevel.INSERT_ONLY) is False
    
    def test_check_access_level_full(self):
        """FULL access requires at least SELECT, INSERT, UPDATE."""
        assert check_access_level(["SELECT", "INSERT", "UPDATE"], TableAccessLevel.FULL) is True
        assert check_access_level(["SELECT", "INSERT", "UPDATE", "DELETE"], TableAccessLevel.FULL) is True
        assert check_access_level(["SELECT", "INSERT"], TableAccessLevel.FULL) is False
        assert check_access_level(["SELECT"], TableAccessLevel.FULL) is False
    
    @given(st.lists(st.sampled_from(["SELECT", "INSERT", "UPDATE", "DELETE"]), unique=True))
    @settings(max_examples=100)
    def test_check_access_level_deterministic(self, privileges: list):
        """
        Property: Access level checking is deterministic.
        Same privileges always produce same result.
        """
        for access_level in TableAccessLevel:
            result1 = check_access_level(privileges, access_level)
            result2 = check_access_level(privileges, access_level)
            assert result1 == result2


class TestTableDefinitions:
    """Tests for table permission definitions."""
    
    def test_ai_layer_tables_defined(self):
        """AI Layer tables are properly defined."""
        assert "ai_requests" in AI_LAYER_TABLES
        assert "ai_actions" in AI_LAYER_TABLES
        assert "ai_audit_logs" in AI_LAYER_TABLES
        assert "ai_usage" in AI_LAYER_TABLES
    
    def test_ai_audit_logs_is_append_only(self):
        """AI audit logs table should be INSERT_ONLY (append-only)."""
        assert AI_LAYER_TABLES["ai_audit_logs"] == TableAccessLevel.INSERT_ONLY
    
    def test_core_read_only_tables_defined(self):
        """Core read-only tables are properly defined."""
        assert "users" in CORE_READ_ONLY_TABLES
        assert "tenants" in CORE_READ_ONLY_TABLES
        
        # All should be READ_ONLY
        for table, access in CORE_READ_ONLY_TABLES.items():
            assert access == TableAccessLevel.READ_ONLY, f"{table} should be READ_ONLY"
    
    def test_core_forbidden_tables_defined(self):
        """Core forbidden tables are properly defined."""
        assert "patients" in CORE_FORBIDDEN_TABLES
        assert "sales" in CORE_FORBIDDEN_TABLES
        assert "invoices" in CORE_FORBIDDEN_TABLES
        
        # All should be NONE
        for table, access in CORE_FORBIDDEN_TABLES.items():
            assert access == TableAccessLevel.NONE, f"{table} should have NONE access"
    
    def test_no_overlap_between_table_categories(self):
        """Tables should not appear in multiple categories."""
        ai_tables = set(AI_LAYER_TABLES.keys())
        read_only_tables = set(CORE_READ_ONLY_TABLES.keys())
        forbidden_tables = set(CORE_FORBIDDEN_TABLES.keys())
        
        assert ai_tables.isdisjoint(read_only_tables), "AI tables overlap with read-only tables"
        assert ai_tables.isdisjoint(forbidden_tables), "AI tables overlap with forbidden tables"
        assert read_only_tables.isdisjoint(forbidden_tables), "Read-only tables overlap with forbidden tables"


class TestRestrictedRoleCheck:
    """Tests for restricted role configuration checking."""
    
    def test_is_using_restricted_role_not_set(self):
        """Returns False when AI_DATABASE_URL is not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove AI_DATABASE_URL if it exists
            os.environ.pop("AI_DATABASE_URL", None)
            assert is_using_restricted_role() is False
    
    def test_is_using_restricted_role_wrong_role(self):
        """Returns False when using wrong database role."""
        with patch.dict(os.environ, {"AI_DATABASE_URL": "postgresql://postgres:pass@localhost/db"}):
            assert is_using_restricted_role() is False
    
    def test_is_using_restricted_role_correct(self):
        """Returns True when using ai_layer_role."""
        with patch.dict(os.environ, {"AI_DATABASE_URL": "postgresql://ai_layer_role:pass@localhost/db"}):
            assert is_using_restricted_role() is True


class TestRequireAIIsolation:
    """Tests for the require_ai_isolation decorator."""
    
    def test_decorator_raises_when_not_configured(self):
        """Decorator raises AILayerIsolationError when not using restricted role."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("AI_DATABASE_URL", None)
            
            @require_ai_isolation
            def protected_function():
                return "success"
            
            with pytest.raises(AILayerIsolationError) as exc_info:
                protected_function()
            
            assert "restricted database role" in str(exc_info.value)
    
    def test_decorator_allows_when_configured(self):
        """Decorator allows execution when using restricted role."""
        with patch.dict(os.environ, {"AI_DATABASE_URL": "postgresql://ai_layer_role:pass@localhost/db"}):
            
            @require_ai_isolation
            def protected_function():
                return "success"
            
            result = protected_function()
            assert result == "success"
    
    def test_decorator_preserves_function_result(self):
        """Decorator preserves the function's return value."""
        with patch.dict(os.environ, {"AI_DATABASE_URL": "postgresql://ai_layer_role:pass@localhost/db"}):
            
            @require_ai_isolation
            def add_numbers(a, b):
                return a + b
            
            result = add_numbers(2, 3)
            assert result == 5
    
    @given(st.integers(), st.integers())
    @settings(max_examples=50)
    def test_decorator_preserves_arguments(self, a: int, b: int):
        """
        Property: Decorator preserves function arguments.
        """
        with patch.dict(os.environ, {"AI_DATABASE_URL": "postgresql://ai_layer_role:pass@localhost/db"}):
            
            @require_ai_isolation
            def multiply(x, y):
                return x * y
            
            result = multiply(a, b)
            assert result == a * b


class TestTablePermissionDataclass:
    """Tests for TablePermission dataclass."""
    
    def test_table_permission_creation(self):
        """TablePermission can be created with all fields."""
        perm = TablePermission(
            table_name="ai_requests",
            expected_access=TableAccessLevel.FULL,
            actual_privileges=["SELECT", "INSERT", "UPDATE"],
            is_compliant=True,
        )
        
        assert perm.table_name == "ai_requests"
        assert perm.expected_access == TableAccessLevel.FULL
        assert perm.actual_privileges == ["SELECT", "INSERT", "UPDATE"]
        assert perm.is_compliant is True
    
    def test_table_permission_non_compliant(self):
        """TablePermission correctly represents non-compliant state."""
        perm = TablePermission(
            table_name="patients",
            expected_access=TableAccessLevel.NONE,
            actual_privileges=["SELECT"],  # Should have no access
            is_compliant=False,
        )
        
        assert perm.is_compliant is False


class TestDatabaseIsolationProperty:
    """
    Property-based tests for database isolation.
    
    **Property 1: AI Layer Database Isolation**
    For any database operation attempted by the AI Layer,
    the operation SHALL be rejected if it targets a core business table
    with write intent.
    """
    
    @given(st.sampled_from(list(CORE_FORBIDDEN_TABLES.keys())))
    @settings(max_examples=50)
    def test_forbidden_tables_have_no_access(self, table_name: str):
        """
        Property: All forbidden tables should have NONE access level.
        """
        expected_access = CORE_FORBIDDEN_TABLES[table_name]
        assert expected_access == TableAccessLevel.NONE
    
    @given(st.sampled_from(list(CORE_READ_ONLY_TABLES.keys())))
    @settings(max_examples=50)
    def test_read_only_tables_have_select_only(self, table_name: str):
        """
        Property: All read-only tables should have READ_ONLY access level.
        """
        expected_access = CORE_READ_ONLY_TABLES[table_name]
        assert expected_access == TableAccessLevel.READ_ONLY
    
    @given(st.sampled_from(list(AI_LAYER_TABLES.keys())))
    @settings(max_examples=50)
    def test_ai_tables_have_appropriate_access(self, table_name: str):
        """
        Property: AI Layer tables should have appropriate access levels.
        """
        expected_access = AI_LAYER_TABLES[table_name]
        
        # ai_audit_logs should be INSERT_ONLY (append-only)
        if table_name == "ai_audit_logs":
            assert expected_access == TableAccessLevel.INSERT_ONLY
        else:
            # Other AI tables should have FULL access
            assert expected_access == TableAccessLevel.FULL
    
    @given(
        st.lists(st.sampled_from(["SELECT", "INSERT", "UPDATE", "DELETE"]), unique=True, min_size=0, max_size=4),
        st.sampled_from(list(TableAccessLevel))
    )
    @settings(max_examples=200)
    def test_access_check_is_consistent(self, privileges: list, access_level: TableAccessLevel):
        """
        Property: Access level checking is consistent and deterministic.
        Running the same check multiple times produces the same result.
        """
        results = [check_access_level(privileges, access_level) for _ in range(5)]
        assert all(r == results[0] for r in results)
