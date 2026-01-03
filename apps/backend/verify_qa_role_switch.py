
import sys
import os
import json
import logging
from flask_jwt_extended import create_access_token, decode_token

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure we can import from current directory
sys.path.append(os.getcwd())

from app import app
from models.base import db
from models.admin_user import AdminUser
from models.role import Role

def verify_role_switcher():
    """
    Test the QA Role Switcher flow:
    1. Login as Super Admin (admin@x-ear.com)
    2. Switch Role to 'sales_manager'
    3. Verify new token works and has correct context
    """
    with app.app_context():
        # 1. Setup Data
        logger.info("--- Setting up Test Data ---")
        
        # Ensure Super Admin exists
        admin_email = "admin@x-ear.com"
        admin = AdminUser.query.filter_by(email=admin_email).first()
        if not admin:
            logger.info(f"Creating {admin_email}...")
            admin = AdminUser(
                id="admin_debug_test",
                email=admin_email,
                role="super_admin",
                is_active=True
            )
            # Create basic SuperAdmin role if missing for admin_user structure
            # Not strictly needed if is_super_admin() logic works, but good to have
            # Check for admin_roles table... if it exists, we might need to populate it.
            # But AdminUser model uses 'role' column as legacy fallback.
            
            db.session.add(admin)
            db.session.commit()
            
        # Ensure Target Role exists
        target_role_name = "sales_manager"
        role = Role.query.filter_by(name=target_role_name).first()
        if not role:
            logger.info(f"Creating role {target_role_name}...")
            role = Role(name=target_role_name, display_name="Sales Manager", description="Test Role")
            # Add some permissions
            from models.permission import Permission
            p1 = Permission.query.filter_by(name="sales.view").first()
            if not p1:
                p1 = Permission(name="sales.view", description="View Sales")
                db.session.add(p1)
            role.permissions.append(p1)
            db.session.add(role)
            db.session.commit()
            
        # 2. Generate Initial Admin Token
        logger.info("--- Generating Admin Token ---")
        # Simulate login by creating token directly
        # Ensure identity starts with admin_ if that's the convention
        admin_id_str = admin.id
        if not admin_id_str.startswith('admin_'):
             admin_identity = f"admin_{admin_id_str}"
        else:
             admin_identity = admin_id_str

        initial_token = create_access_token(
            identity=admin_identity,
            additional_claims={'role': 'super_admin', 'type': 'admin'}
        )
        logger.info(f"Initial Token Generated for {admin_identity}")
        
        # 3. Call Switch Role Endpoint
        logger.info(f"--- Switching Role to {target_role_name} ---")
        client = app.test_client()
        
        headers = {
            'Authorization': f'Bearer {initial_token}',
            'Content-Type': 'application/json'
        }
        
        # NOTE: ensure backend is using the latest code
        response = client.post('/api/admin/debug/switch-role', headers=headers, json={
            'targetRole': target_role_name
        })
        
        if response.status_code != 200:
            logger.error(f"Switch Role Failed: {response.status_code} - {response.get_json()}")
            return False
            
        data = response.get_json().get('data')
        new_token = data.get('accessToken')
        effective_role = data.get('effectiveRole')
        
        logger.info(f"Switch Successful. New Effective Role: {effective_role}")
        
        if effective_role != target_role_name:
             logger.error(f"Role Mismatch! Expected {target_role_name}, got {effective_role}")
             return False

        # 4. Verify New Token Context (Hit a protected endpoint)
        logger.info("--- Verifying New Token Context via /api/admin/debug/page-permissions/sales ---")
        
        verify_headers = {
            'Authorization': f'Bearer {new_token}',
            'Content-Type': 'application/json'
        }
        
        verify_response = client.get('/api/admin/debug/page-permissions/sales', headers=verify_headers)
        
        if verify_response.status_code != 200:
            logger.error(f"Verification Request Failed: {verify_response.status_code} - {verify_response.get_json()}")
            return False
            
        perms_data = verify_response.get_json().get('data', {}).get('permissions', [])
        logger.info(f"Permissions returned: {len(perms_data)}")
        
        # Check claims in token
        decoded = decode_token(new_token)
        claims = decoded.get('is_impersonating')
        logger.info(f"Token Claim 'is_impersonating': {claims}")
        
        if not claims:
            logger.error("Token missing 'is_impersonating' claim!")
            return False
            
        logger.info(">>> TEST PASSED: QA Role Switcher is working correctly <<<")
        return True

if __name__ == "__main__":
    success = verify_role_switcher()
    sys.exit(0 if success else 1)
