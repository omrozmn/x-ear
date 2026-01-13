"""
Verify Product Isolation Rules (Phase 3)
"""
import sys
import os
import unittest

# Add apps/api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../apps/api')))

class TestProductIsolation(unittest.TestCase):
    
    def test_xcalp_exists(self):
        """Test that xcalp product module exists"""
        import core.products.xcalp
        self.assertIsNotNone(core.products.xcalp)
        print("✅ core.products.xcalp imported successfully")

    def test_tenant_type_enum(self):
        """Test that TenantType enum is available and correct"""
        from core.models.enums import TenantType
        self.assertEqual(TenantType.B2B.value, "B2B")
        self.assertEqual(TenantType.CONSUMER.value, "CONSUMER")
        print("✅ TenantType enum verified")

    def test_tenant_model_column(self):
        """Test that Tenant model has tenant_type column"""
        from core.models.tenant import Tenant
        self.assertTrue(hasattr(Tenant, 'tenant_type'))
        print("✅ Tenant.tenant_type column verified")

if __name__ == '__main__':
    unittest.main()
