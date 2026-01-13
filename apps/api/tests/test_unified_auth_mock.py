import unittest
from unittest.mock import MagicMock, patch
from flask import Flask, g
from utils.auth_principal import get_current_principal, Principal, PrincipalKind
from utils.access_context import get_access_context, AccessContext
from config.tenant_permissions import TenantPermissions

class TestUnifiedAuth(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.ctx = self.app.app_context()
        self.ctx.push()
        
    def tearDown(self):
        self.ctx.pop()

    @patch('utils.auth_principal.get_jwt_identity')
    @patch('utils.auth_principal.get_jwt')
    @patch('utils.auth_principal.db.session.get')
    def test_tenant_user_resolution(self, mock_get, mock_jwt, mock_identity):
        """Test authentication for a regular Tenant User"""
        # Mock JWT
        mock_identity.return_value = 'usr_123'
        mock_jwt.return_value = {'role': 'user'}
        
        # Mock User DB Object
        mock_user = MagicMock()
        mock_user.id = 'usr_123'
        mock_user.role = 'user'
        mock_user.tenant_id = 'tenant_A'
        mock_get.return_value = mock_user

        # 1. Test Principal Resolution
        principal = get_current_principal()
        self.assertIsNotNone(principal)
        self.assertEqual(principal.kind, PrincipalKind.TENANT_USER)
        self.assertEqual(principal.tenant_id, 'tenant_A')
        
        # 2. Test Access Context
        # Reset g context
        delattr(g, '_current_principal')
        
        # Provide principal mock to get_access_context or let it call get_current_principal again
        # Let's let it re-resolve (mock is stateless here)
        
        ctx = get_access_context()
        self.assertIsNotNone(ctx)
        self.assertEqual(ctx.principal_kind, PrincipalKind.TENANT_USER)
        self.assertEqual(ctx.tenant_id, 'tenant_A')
        self.assertEqual(ctx.allowed_tenants, {'tenant_A'})
        
        # Check Standard Permissions
        self.assertTrue(ctx.has_permission(TenantPermissions.PATIENT_READ))
        self.assertFalse(ctx.has_permission(TenantPermissions.PATIENT_DELETE)) # Users generally can't delete

    @patch('utils.auth_principal.get_jwt_identity')
    @patch('utils.auth_principal.get_jwt')
    @patch('utils.auth_principal.db.session.get')
    def test_tenant_admin_resolution(self, mock_get, mock_jwt, mock_identity):
        """Test authentication for a Tenant Admin"""
        # Mock JWT
        mock_identity.return_value = 'usr_admin'
        mock_jwt.return_value = {'role': 'admin'}
        
        # Mock User DB Object
        mock_user = MagicMock()
        mock_user.id = 'usr_admin'
        mock_user.role = 'admin'
        mock_user.tenant_id = 'tenant_A'
        mock_get.return_value = mock_user

        # 1. Test Principal Resolution
        principal = get_current_principal()
        self.assertEqual(principal.kind, PrincipalKind.TENANT_ADMIN)
        
        # 2. Test Access Context
        delattr(g, '_current_principal')
        ctx = get_access_context()
        
        self.assertEqual(ctx.principal_kind, PrincipalKind.TENANT_ADMIN)
        self.assertTrue(ctx.has_permission(TenantPermissions.PATIENT_DELETE)) # Admins CAN delete

    @patch('utils.auth_principal.get_jwt_identity')
    @patch('utils.auth_principal.get_jwt')
    @patch('utils.auth_principal.db.session.get')
    def test_super_admin_resolution(self, mock_get, mock_jwt, mock_identity):
        """Test authentication for a Super Admin"""
        # Mock JWT
        mock_identity.return_value = 'admin_999'
        mock_jwt.return_value = {'role': 'admin'} # legacy role logic
        
        # Mock Admin User DB Object
        mock_admin = MagicMock()
        mock_admin.id = 'admin_999'
        # Mock permissions method
        mock_admin.get_all_permissions.return_value = {'patient:read', 'patient:delete'}
        mock_get.return_value = mock_admin

        # 1. Test Principal Resolution
        principal = get_current_principal()
        self.assertEqual(principal.kind, PrincipalKind.SUPER_ADMIN)
        self.assertIsNone(principal.tenant_id) # Super admin has no intrinsic tenant
        
        # 2. Test Access Context (Global)
        delattr(g, '_current_principal')
        ctx = get_access_context()
        
        self.assertEqual(ctx.principal_kind, PrincipalKind.SUPER_ADMIN)
        self.assertIsNone(ctx.tenant_id) # No tenant selected by default
        self.assertIsNone(ctx.allowed_tenants) # All tenants allowed
        self.assertTrue(ctx.has_permission(TenantPermissions.PATIENT_READ))
        
        # 3. Test Access Context (Scoped Switch)
        delattr(g, '_current_principal')
        delattr(g, '_access_context')
        
        ctx_scoped = get_access_context(requested_tenant_id='tenant_B')
        self.assertEqual(ctx_scoped.tenant_id, 'tenant_B') # Context switched!

if __name__ == '__main__':
    unittest.main()
