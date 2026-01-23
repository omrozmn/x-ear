"""Migrate patients.* permissions to parties.*

Revision ID: 20260116_migrate_permission_strings
Revises: 20260114_party_role_profile
Create Date: 2026-01-16

This migration updates all permission strings from the legacy 'patients.*' format
to the new 'parties.*' format as part of the Party migration cleanup (G-07).
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260116_migrate_permission_strings'
down_revision = '20260114_party_role_profile'
branch_labels = None
depends_on = None


def upgrade():
    """
    Update permission names from patients.* to parties.* format.
    
    Affected tables:
    - permissions: name column
    - role_permissions: permission_name column (if exists)
    - roles: permissions JSON column (if exists)
    """
    # Get connection for raw SQL execution
    conn = op.get_bind()
    
    # 1. Update permissions table (if exists)
    try:
        conn.execute(sa.text("""
            UPDATE permissions 
            SET name = REPLACE(name, 'patients.', 'parties.')
            WHERE name LIKE 'patients.%'
        """))
    except Exception as e:
        print(f"Note: permissions table update skipped: {e}")
    
    # 2. Update role_permissions table (if exists)
    try:
        conn.execute(sa.text("""
            UPDATE role_permissions 
            SET permission_name = REPLACE(permission_name, 'patients.', 'parties.')
            WHERE permission_name LIKE 'patients.%'
        """))
    except Exception as e:
        print(f"Note: role_permissions table update skipped: {e}")
    
    # 3. Update roles table permissions JSON (if exists)
    # This handles cases where permissions are stored as JSON array in roles table
    try:
        conn.execute(sa.text("""
            UPDATE roles 
            SET permissions = REPLACE(permissions, 'patients.', 'parties.')
            WHERE permissions LIKE '%patients.%'
        """))
    except Exception as e:
        print(f"Note: roles table update skipped: {e}")
    
    # 4. Update user_permissions table (if exists)
    try:
        conn.execute(sa.text("""
            UPDATE user_permissions 
            SET permission = REPLACE(permission, 'patients.', 'parties.')
            WHERE permission LIKE 'patients.%'
        """))
    except Exception as e:
        print(f"Note: user_permissions table update skipped: {e}")


def downgrade():
    """
    Revert permission names from parties.* back to patients.* format.
    """
    conn = op.get_bind()
    
    # 1. Revert permissions table
    try:
        conn.execute(sa.text("""
            UPDATE permissions 
            SET name = REPLACE(name, 'parties.', 'patients.')
            WHERE name LIKE 'parties.%'
        """))
    except Exception as e:
        print(f"Note: permissions table revert skipped: {e}")
    
    # 2. Revert role_permissions table
    try:
        conn.execute(sa.text("""
            UPDATE role_permissions 
            SET permission_name = REPLACE(permission_name, 'parties.', 'patients.')
            WHERE permission_name LIKE 'parties.%'
        """))
    except Exception as e:
        print(f"Note: role_permissions table revert skipped: {e}")
    
    # 3. Revert roles table
    try:
        conn.execute(sa.text("""
            UPDATE roles 
            SET permissions = REPLACE(permissions, 'parties.', 'patients.')
            WHERE permissions LIKE '%parties.%'
        """))
    except Exception as e:
        print(f"Note: roles table revert skipped: {e}")
    
    # 4. Revert user_permissions table
    try:
        conn.execute(sa.text("""
            UPDATE user_permissions 
            SET permission = REPLACE(permission, 'parties.', 'patients.')
            WHERE permission LIKE 'parties.%'
        """))
    except Exception as e:
        print(f"Note: user_permissions table revert skipped: {e}")
