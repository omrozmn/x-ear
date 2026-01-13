"""
Phase 2 Module Import and Integration Tests
Tests that all migrated modules load correctly and work with Flask app.
"""
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestModuleImports:
    """Test that all Phase 2 modules import correctly."""
    
    def test_sales_module_import(self):
        """Test sales.py imports successfully."""
        from routes.sales import sales_bp
        assert sales_bp is not None
        assert sales_bp.name == 'sales'
    
    def test_tenant_users_module_import(self):
        """Test tenant_users.py imports successfully."""
        from routes.tenant_users import tenant_users_bp
        assert tenant_users_bp is not None
        assert tenant_users_bp.name == 'tenant_users'
    
    def test_activity_logs_module_import(self):
        """Test activity_logs.py imports successfully."""
        from routes.activity_logs import activity_logs_bp
        assert activity_logs_bp is not None
        assert activity_logs_bp.name == 'activity_logs'
    
    def test_replacements_module_import(self):
        """Test replacements.py imports successfully."""
        from routes.replacements import replacements_bp
        assert replacements_bp is not None
        assert replacements_bp.name == 'replacements'
    
    def test_upload_module_import(self):
        """Test upload.py imports successfully."""
        from routes.upload import upload_bp
        assert upload_bp is not None
        assert upload_bp.name == 'upload'


class TestFlaskAppLoad:
    """Test Flask app loads with all blueprints."""
    
    def test_flask_app_loads(self):
        """Test Flask app initializes successfully."""
        from app import app
        assert app is not None
        assert app.name == 'app'
    
    def test_sales_blueprint_registered(self):
        """Test sales blueprint is registered."""
        from app import app
        # Check if sales routes exist
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert any('/sales' in rule for rule in rules)
    
    def test_tenant_users_blueprint_registered(self):
        """Test tenant_users blueprint is registered."""
        from app import app
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert any('/tenant/users' in rule for rule in rules)
    
    def test_activity_logs_blueprint_registered(self):
        """Test activity_logs blueprint is registered."""
        from app import app
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert any('/activity-logs' in rule for rule in rules)


class TestUnifiedAccessDecorator:
    """Test unified_access decorator is properly imported."""
    
    def test_unified_access_exists(self):
        """Test unified_access decorator exists."""
        from utils.decorators import unified_access
        assert unified_access is not None
        assert callable(unified_access)
    
    def test_success_response_exists(self):
        """Test success_response helper exists."""
        from utils.response import success_response
        assert success_response is not None
        assert callable(success_response)
    
    def test_error_response_exists(self):
        """Test error_response helper exists."""
        from utils.response import error_response
        assert error_response is not None
        assert callable(error_response)


class TestTenantUserS3Integration:
    """Test tenant_users S3 storage mode switching."""
    
    def test_storage_mode_detection(self):
        """Test storage mode is detected from environment."""
        from routes.tenant_users import _get_storage_mode
        mode = _get_storage_mode()
        assert mode in ['local', 's3']
    
    def test_allowed_file_extension(self):
        """Test file extension validation."""
        from routes.tenant_users import _allowed_file
        assert _allowed_file('test.png') == True
        assert _allowed_file('test.jpg') == True
        assert _allowed_file('test.jpeg') == True
        assert _allowed_file('test.gif') == True
        assert _allowed_file('test.webp') == True
        assert _allowed_file('test.exe') == False
        assert _allowed_file('test.py') == False


class TestSalesHelperFunctions:
    """Test sales helper functions for tenant context."""
    
    def test_tenant_context_helper_exists(self):
        """Test get_tenant_context helper exists in sales helpers."""
        from routes.sales.helpers import get_tenant_context
        assert get_tenant_context is not None
        assert callable(get_tenant_context)
    
    def test_sale_access_helper_exists(self):
        """Test check_sale_access helper exists in sales helpers."""
        from routes.sales.helpers import check_sale_access
        assert check_sale_access is not None
        assert callable(check_sale_access)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
