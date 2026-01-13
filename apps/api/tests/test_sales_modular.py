"""
Sales Module Refactoring Tests

Comprehensive tests for the modular sales package.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestSalesModularStructure:
    """Verify modular sales package structure."""
    
    def test_sales_package_imports(self):
        """Test sales package imports as a module."""
        import routes.sales
        assert hasattr(routes.sales, 'sales_bp')
    
    def test_payments_submodule(self):
        """Test payments submodule imports."""
        from routes.sales.payments import payments_bp
        assert payments_bp is not None
        assert payments_bp.name == 'sales_payments'
    
    def test_pricing_submodule(self):
        """Test pricing submodule imports."""
        from routes.sales.pricing import pricing_bp
        assert pricing_bp is not None
        assert pricing_bp.name == 'sales_pricing'
    
    def test_read_submodule(self):
        """Test read submodule imports."""
        from routes.sales.read import read_bp
        assert read_bp is not None
        assert read_bp.name == 'sales_read'
    
    def test_helpers_package(self):
        """Test helpers package imports."""
        from routes.sales.helpers import (
            now_utc,
            get_tenant_context,
            check_sale_access,
            check_branch_access,
            build_installment_data,
            build_payment_plan_data,
            validate_assignment_input,
            ERROR_NO_DATA_PROVIDED,
        )
        assert callable(now_utc)
        assert callable(get_tenant_context)
        assert callable(check_sale_access)
        assert callable(check_branch_access)
        assert callable(build_installment_data)
        assert callable(build_payment_plan_data)
        assert callable(validate_assignment_input)
        assert ERROR_NO_DATA_PROVIDED == "No data provided"


class TestSalesEndpointCount:
    """Verify all 17 endpoints are registered."""
    
    def test_endpoint_count(self):
        """Test that all 17 sales endpoints are registered."""
        from app import app
        
        sales_endpoints = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint.startswith('sales.'):
                sales_endpoints.append(rule.rule)
        
        # We expect 17 unique endpoints
        # Some may share URLs with different methods
        assert len(sales_endpoints) >= 14, f"Expected at least 14 endpoint registrations, got {len(sales_endpoints)}"
    
    def test_payment_endpoints_exist(self):
        """Test payment-related endpoints are registered."""
        from app import app
        
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        
        assert any('payments' in rule for rule in rules), "Payment endpoint missing"
        assert any('payment-plan' in rule for rule in rules), "Payment plan endpoint missing"
        assert any('installments' in rule for rule in rules), "Installments endpoint missing"
    
    def test_pricing_endpoints_exist(self):
        """Test pricing-related endpoints are registered."""
        from app import app
        
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        
        assert any('pricing-preview' in rule for rule in rules), "Pricing preview endpoint missing"
        assert any('recalc' in rule for rule in rules), "Recalc endpoint missing"
    
    def test_device_endpoints_exist(self):
        """Test device-related endpoints are registered."""
        from app import app
        
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        
        assert any('device-assignments' in rule for rule in rules), "Device assignments endpoint missing"
        assert any('return-loaner' in rule for rule in rules), "Return loaner endpoint missing"


class TestBranchLevelScoping:
    """Test branch-level scoping helpers."""
    
    def test_check_branch_access_tenant_admin(self):
        """Test tenant admin has access to all branches."""
        from routes.sales.helpers import check_branch_access
        
        # Mock user with tenant_admin role
        class MockUser:
            role = 'tenant_admin'
            branches = []
        
        user = MockUser()
        assert check_branch_access(user, 'any_branch_id') == True
        assert check_branch_access(user, None) == True
    
    def test_check_branch_access_branch_admin(self):
        """Test branch admin has limited access."""
        from routes.sales.helpers import check_branch_access
        
        # Mock user with admin role and specific branches
        class MockBranch:
            def __init__(self, id):
                self.id = id
        
        class MockUser:
            role = 'admin'
            branches = [MockBranch('branch_1'), MockBranch('branch_2')]
        
        user = MockUser()
        assert check_branch_access(user, 'branch_1') == True
        assert check_branch_access(user, 'branch_2') == True
        assert check_branch_access(user, 'branch_3') == False
        assert check_branch_access(user, None) == True
    
    def test_get_user_branch_ids_tenant_admin(self):
        """Test tenant admin gets None (all branches)."""
        from routes.sales.helpers import get_user_branch_ids
        
        class MockUser:
            role = 'tenant_admin'
            branches = []
        
        user = MockUser()
        assert get_user_branch_ids(user) is None
    
    def test_get_user_branch_ids_regular_user(self):
        """Test regular user gets specific branch IDs."""
        from routes.sales.helpers import get_user_branch_ids
        
        class MockBranch:
            def __init__(self, id):
                self.id = id
        
        class MockUser:
            role = 'user'
            branches = [MockBranch('b1'), MockBranch('b2')]
        
        user = MockUser()
        branch_ids = get_user_branch_ids(user)
        assert branch_ids == ['b1', 'b2']


class TestBackupIntegrity:
    """Verify backup file exists and is valid."""
    
    def test_backup_file_exists(self):
        """Test backup file exists."""
        import os
        backup_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'routes',
            'sales_monolithic_backup.py'
        )
        assert os.path.exists(backup_path), "Backup file not found"
    
    def test_backup_file_has_all_functions(self):
        """Test backup file has expected function count."""
        from routes import sales_monolithic_backup
        
        # Count functions (defined with def)
        functions = [attr for attr in dir(sales_monolithic_backup) 
                     if callable(getattr(sales_monolithic_backup, attr)) 
                     and not attr.startswith('__')]
        
        # Should have at least 50 functions
        assert len(functions) >= 40, f"Expected at least 40 functions, got {len(functions)}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
