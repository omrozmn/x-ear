"""
Database Isolation Utilities for AI Layer.

This module provides utilities to verify and enforce database isolation
for the AI Layer. The AI Layer MUST use a restricted database role that
only has access to AI-specific tables.

Requirements:
- 1.4: AI Layer SHALL NOT have direct database write access to core business tables
- 6.2: AI Layer SHALL NEVER perform direct database writes to core tables
- 6.7: AI Layer database connection SHALL use a restricted role
"""

import os
from typing import List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


class TableAccessLevel(str, Enum):
    """Access levels for database tables."""
    FULL = "full"  # SELECT, INSERT, UPDATE, DELETE
    READ_ONLY = "read_only"  # SELECT only
    INSERT_ONLY = "insert_only"  # SELECT, INSERT only (append-only)
    NONE = "none"  # No access


@dataclass
class TablePermission:
    """Represents permissions for a database table."""
    table_name: str
    expected_access: TableAccessLevel
    actual_privileges: List[str]
    is_compliant: bool


# AI Layer tables with expected access levels
AI_LAYER_TABLES = {
    "ai_requests": TableAccessLevel.FULL,
    "ai_actions": TableAccessLevel.FULL,
    "ai_audit_logs": TableAccessLevel.INSERT_ONLY,  # Append-only
    "ai_usage": TableAccessLevel.FULL,
}

# Core tables that AI Layer should have READ-ONLY access to
CORE_READ_ONLY_TABLES = {
    "users": TableAccessLevel.READ_ONLY,
    "tenants": TableAccessLevel.READ_ONLY,
    "feature_flags": TableAccessLevel.READ_ONLY,
    "roles": TableAccessLevel.READ_ONLY,
    "permissions": TableAccessLevel.READ_ONLY,
}

# Core tables that AI Layer should have NO access to
CORE_FORBIDDEN_TABLES = {
    "patients": TableAccessLevel.NONE,
    "sales": TableAccessLevel.NONE,
    "invoices": TableAccessLevel.NONE,
    "devices": TableAccessLevel.NONE,
    "appointments": TableAccessLevel.NONE,
    "medical_records": TableAccessLevel.NONE,
    "payments": TableAccessLevel.NONE,
    "subscriptions": TableAccessLevel.NONE,
}


def get_table_privileges(session: Session, table_name: str, role_name: str = "ai_layer_role") -> List[str]:
    """
    Get the privileges for a specific table and role.
    
    Args:
        session: SQLAlchemy session
        table_name: Name of the table
        role_name: Name of the database role
        
    Returns:
        List of privilege types (SELECT, INSERT, UPDATE, DELETE)
    """
    query = text("""
        SELECT privilege_type
        FROM information_schema.table_privileges
        WHERE table_name = :table_name
        AND grantee = :role_name
    """)
    
    result = session.execute(query, {"table_name": table_name, "role_name": role_name})
    return [row[0] for row in result.fetchall()]


def check_access_level(privileges: List[str], expected: TableAccessLevel) -> bool:
    """
    Check if the actual privileges match the expected access level.
    
    Args:
        privileges: List of actual privileges
        expected: Expected access level
        
    Returns:
        True if compliant, False otherwise
    """
    privileges_set = set(p.upper() for p in privileges)
    
    if expected == TableAccessLevel.NONE:
        return len(privileges_set) == 0
    
    if expected == TableAccessLevel.READ_ONLY:
        return privileges_set == {"SELECT"}
    
    if expected == TableAccessLevel.INSERT_ONLY:
        return privileges_set == {"SELECT", "INSERT"}
    
    if expected == TableAccessLevel.FULL:
        required = {"SELECT", "INSERT", "UPDATE"}
        return required.issubset(privileges_set)
    
    return False


def verify_ai_layer_isolation(session: Session, role_name: str = "ai_layer_role") -> Tuple[bool, List[TablePermission]]:
    """
    Verify that the AI Layer database role has correct permissions.
    
    This function checks:
    1. AI Layer tables have appropriate access
    2. Core read-only tables have SELECT only
    3. Forbidden tables have no access
    
    Args:
        session: SQLAlchemy session
        role_name: Name of the database role to check
        
    Returns:
        Tuple of (is_compliant, list of TablePermission results)
    """
    results = []
    all_compliant = True
    
    # Check AI Layer tables
    for table_name, expected_access in AI_LAYER_TABLES.items():
        privileges = get_table_privileges(session, table_name, role_name)
        is_compliant = check_access_level(privileges, expected_access)
        
        results.append(TablePermission(
            table_name=table_name,
            expected_access=expected_access,
            actual_privileges=privileges,
            is_compliant=is_compliant,
        ))
        
        if not is_compliant:
            all_compliant = False
    
    # Check core read-only tables
    for table_name, expected_access in CORE_READ_ONLY_TABLES.items():
        privileges = get_table_privileges(session, table_name, role_name)
        is_compliant = check_access_level(privileges, expected_access)
        
        results.append(TablePermission(
            table_name=table_name,
            expected_access=expected_access,
            actual_privileges=privileges,
            is_compliant=is_compliant,
        ))
        
        if not is_compliant:
            all_compliant = False
    
    # Check forbidden tables
    for table_name, expected_access in CORE_FORBIDDEN_TABLES.items():
        privileges = get_table_privileges(session, table_name, role_name)
        is_compliant = check_access_level(privileges, expected_access)
        
        results.append(TablePermission(
            table_name=table_name,
            expected_access=expected_access,
            actual_privileges=privileges,
            is_compliant=is_compliant,
        ))
        
        if not is_compliant:
            all_compliant = False
    
    return (all_compliant, results)


def get_ai_database_url() -> Optional[str]:
    """
    Get the database URL for the AI Layer.
    
    The AI Layer should use a separate database connection with
    the restricted ai_layer_role.
    
    Returns:
        Database URL or None if not configured
    """
    return os.environ.get("AI_DATABASE_URL")


def is_using_restricted_role() -> bool:
    """
    Check if the AI Layer is configured to use the restricted role.
    
    Returns:
        True if AI_DATABASE_URL is set and contains ai_layer_role
    """
    db_url = get_ai_database_url()
    if not db_url:
        return False
    return "ai_layer_role" in db_url


class AILayerIsolationError(Exception):
    """Raised when AI Layer database isolation is violated."""
    pass


def require_ai_isolation(func):
    """
    Decorator to ensure AI Layer database isolation is configured.
    
    Raises AILayerIsolationError if the AI Layer is not using
    the restricted database role.
    """
    def wrapper(*args, **kwargs):
        if not is_using_restricted_role():
            raise AILayerIsolationError(
                "AI Layer must use restricted database role. "
                "Set AI_DATABASE_URL with ai_layer_role credentials."
            )
        return func(*args, **kwargs)
    return wrapper
