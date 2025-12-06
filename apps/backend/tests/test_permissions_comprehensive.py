"""
Kapsamlı Permission Test Suite

Bu test tüm endpoint'leri tüm roller için sistematik olarak test eder.
Her endpoint için:
1. Doğru izne sahip rol ile 2xx/4xx (business logic) almalı
2. Yanlış izne sahip rol ile 403 almalı

Kullanım:
    pytest tests/test_permissions_comprehensive.py -v
    pytest tests/test_permissions_comprehensive.py -v -k "secretary"
    pytest tests/test_permissions_comprehensive.py -v -k "patients"
"""

import pytest
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models.base import db
from models.user import User
from models.role import Role
from models.permission import Permission
from config.permissions_map import ENDPOINT_PERMISSIONS, get_permission_for_endpoint


# =============================================================================
# TEST CONFIGURATION
# =============================================================================

# Roller ve sahip oldukları izinler
ROLE_PERMISSIONS = {
    'admin': [
        # Admin tüm izinlere sahip
        'patients.view', 'patients.create', 'patients.edit', 'patients.delete', 
        'patients.notes', 'patients.history',
        'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
        'finance.view', 'finance.payments', 'finance.refunds', 'finance.reports', 'finance.cash_register',
        'invoices.view', 'invoices.create', 'invoices.send', 'invoices.cancel',
        'devices.view', 'devices.create', 'devices.edit', 'devices.delete', 'devices.assign',
        'inventory.view', 'inventory.manage',
        'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.send_sms',
        'sgk.view', 'sgk.create', 'sgk.upload',
        'settings.view', 'settings.edit', 'settings.branches', 'settings.integrations',
        'team.view', 'team.create', 'team.edit', 'team.delete', 'team.permissions',
        'reports.view', 'reports.export',
        'dashboard.view', 'dashboard.analytics',
    ],
    'odyolog': [
        'patients.view', 'patients.create', 'patients.edit', 'patients.notes', 'patients.history',
        'sales.view', 'sales.create', 'sales.edit',
        'finance.view',
        'invoices.view', 'invoices.create',
        'devices.view', 'devices.assign',
        'inventory.view',
        'sgk.view', 'sgk.create',
        'reports.view',
        'dashboard.view',
    ],
    'odyometrist': [
        'patients.view', 'patients.create', 'patients.edit', 'patients.notes', 'patients.history',
        'devices.view',
        'dashboard.view',
    ],
    'secretary': [
        'patients.view', 'patients.create', 'patients.edit',
        'sales.view',
        'devices.view',
        'dashboard.view',
    ],
    'user': [
        'patients.view',
        'dashboard.view',
    ],
}

# Test edilecek endpoint'ler (method, path, required_permission, sample_body)
TEST_ENDPOINTS = [
    # PATIENTS
    ('GET', '/api/patients', 'patients.view', None),
    ('GET', '/api/patients/test123', 'patients.view', None),
    ('POST', '/api/patients', 'patients.create', {'first_name': 'Test', 'last_name': 'User', 'phone': '5551234567'}),
    ('PUT', '/api/patients/test123', 'patients.edit', {'first_name': 'Updated'}),
    ('DELETE', '/api/patients/test123', 'patients.delete', None),
    ('GET', '/api/patients/test123/notes', 'patients.notes', None),
    ('POST', '/api/patients/test123/notes', 'patients.notes', {'content': 'Test note'}),
    ('GET', '/api/patients/test123/history', 'patients.history', None),
    ('GET', '/api/patients/test123/timeline', 'patients.history', None),
    
    # SALES
    ('GET', '/api/sales', 'sales.view', None),
    ('GET', '/api/sales/sale123', 'sales.view', None),
    ('POST', '/api/sales', 'sales.create', {'patient_id': 'test123', 'items': []}),
    ('PUT', '/api/sales/sale123', 'sales.edit', {'status': 'completed'}),
    ('DELETE', '/api/sales/sale123', 'sales.delete', None),
    
    # FINANCE
    ('GET', '/api/finance/summary', 'finance.view', None),
    ('GET', '/api/finance/cash-register', 'finance.cash_register', None),
    ('POST', '/api/finance/cash-register', 'finance.cash_register', {'type': 'income', 'amount': 100}),
    ('GET', '/api/finance/reports', 'finance.reports', None),
    ('POST', '/api/finance/refunds', 'finance.refunds', {'sale_id': 'sale123', 'amount': 50}),
    
    # INVOICES
    ('GET', '/api/invoices', 'invoices.view', None),
    ('GET', '/api/invoices/inv123', 'invoices.view', None),
    ('POST', '/api/invoices', 'invoices.create', {'sale_id': 'sale123'}),
    ('POST', '/api/invoices/inv123/send', 'invoices.send', None),
    ('POST', '/api/invoices/inv123/cancel', 'invoices.cancel', None),
    
    # DEVICES
    ('GET', '/api/devices', 'devices.view', None),
    ('GET', '/api/devices/dev123', 'devices.view', None),
    ('POST', '/api/devices', 'devices.create', {'serial_number': 'SN123', 'brand': 'Test'}),
    ('PUT', '/api/devices/dev123', 'devices.edit', {'status': 'active'}),
    ('DELETE', '/api/devices/dev123', 'devices.delete', None),
    ('POST', '/api/devices/dev123/assign', 'devices.assign', {'patient_id': 'test123'}),
    
    # INVENTORY
    ('GET', '/api/inventory', 'inventory.view', None),
    ('GET', '/api/inventory/item123', 'inventory.view', None),
    ('POST', '/api/inventory', 'inventory.manage', {'product_id': 'prod123', 'quantity': 10}),
    ('PUT', '/api/inventory/item123', 'inventory.manage', {'quantity': 20}),
    
    # CAMPAIGNS
    ('GET', '/api/campaigns', 'campaigns.view', None),
    ('GET', '/api/campaigns/camp123', 'campaigns.view', None),
    ('POST', '/api/campaigns', 'campaigns.create', {'name': 'Test Campaign', 'type': 'sms'}),
    ('PUT', '/api/campaigns/camp123', 'campaigns.edit', {'status': 'active'}),
    ('DELETE', '/api/campaigns/camp123', 'campaigns.delete', None),
    ('POST', '/api/campaigns/camp123/send-sms', 'campaigns.send_sms', None),
    
    # SGK
    ('GET', '/api/sgk/provisions', 'sgk.view', None),
    ('GET', '/api/sgk/provisions/prov123', 'sgk.view', None),
    ('POST', '/api/sgk/provisions', 'sgk.create', {'patient_id': 'test123', 'type': 'provision'}),
    ('POST', '/api/sgk/upload', 'sgk.upload', None),
    
    # SETTINGS
    ('GET', '/api/settings', 'settings.view', None),
    ('PUT', '/api/settings', 'settings.edit', {'company': {'name': 'Test'}}),
    ('GET', '/api/branches', 'settings.view', None),
    ('POST', '/api/branches', 'settings.branches', {'name': 'New Branch'}),
    ('PUT', '/api/branches/branch123', 'settings.branches', {'name': 'Updated'}),
    ('GET', '/api/integrations', 'settings.integrations', None),
    
    # TEAM
    ('GET', '/api/users', 'team.view', None),
    ('GET', '/api/users/user123', 'team.view', None),
    ('POST', '/api/users', 'team.create', {'email': 'test@test.com', 'role': 'user'}),
    ('PUT', '/api/users/user123', 'team.edit', {'first_name': 'Updated'}),
    ('DELETE', '/api/users/user123', 'team.delete', None),
    ('GET', '/api/permissions', 'team.permissions', None),
    ('GET', '/api/permissions/role/admin', 'team.permissions', None),
    ('PUT', '/api/permissions/role/admin', 'team.permissions', {'permissions': []}),
    
    # REPORTS
    ('GET', '/api/reports', 'reports.view', None),
    ('GET', '/api/reports/sales', 'reports.view', None),
    ('POST', '/api/reports/export', 'reports.export', {'type': 'sales', 'format': 'excel'}),
    
    # DASHBOARD
    ('GET', '/api/dashboard', 'dashboard.view', None),
    ('GET', '/api/dashboard/stats', 'dashboard.view', None),
    ('GET', '/api/dashboard/analytics', 'dashboard.analytics', None),
    
    # APPOINTMENTS (uses patients permissions)
    ('GET', '/api/appointments', 'patients.view', None),
    ('GET', '/api/appointments/app123', 'patients.view', None),
    ('POST', '/api/appointments', 'patients.edit', {'patient_id': 'test123', 'date': '2025-01-01'}),
    ('PUT', '/api/appointments/app123', 'patients.edit', {'status': 'completed'}),
    ('DELETE', '/api/appointments/app123', 'patients.edit', None),
]


# =============================================================================
# TEST FIXTURES
# =============================================================================

@pytest.fixture
def client():
    """Flask test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def admin_token(client):
    """Admin token al"""
    response = client.post('/api/auth/login', 
        json={'email': 'admin@x-ear.com', 'password': 'admin123'},
        content_type='application/json'
    )
    data = json.loads(response.data)
    return data.get('access_token')


def get_role_token(client, admin_token, role_name):
    """Belirli bir rol için debug token al"""
    response = client.post('/api/admin/debug/switch-role',
        json={'targetRole': role_name},
        headers={'Authorization': f'Bearer {admin_token}'},
        content_type='application/json'
    )
    data = json.loads(response.data)
    if data.get('success'):
        return data.get('data', {}).get('accessToken')
    return None


# =============================================================================
# TEST CLASSES
# =============================================================================

class TestPermissionMatrix:
    """Her endpoint için her rolün erişim durumunu test et"""
    
    @pytest.fixture(autouse=True)
    def setup(self, client, admin_token):
        """Her test için token'ları hazırla"""
        self.client = client
        self.admin_token = admin_token
        self.role_tokens = {}
        
        for role_name in ROLE_PERMISSIONS.keys():
            token = get_role_token(client, admin_token, role_name)
            if token:
                self.role_tokens[role_name] = token
    
    def _make_request(self, method, path, token, body=None):
        """HTTP isteği yap"""
        headers = {'Authorization': f'Bearer {token}'}
        
        if method == 'GET':
            return self.client.get(path, headers=headers)
        elif method == 'POST':
            return self.client.post(path, json=body or {}, headers=headers)
        elif method == 'PUT':
            return self.client.put(path, json=body or {}, headers=headers)
        elif method == 'PATCH':
            return self.client.patch(path, json=body or {}, headers=headers)
        elif method == 'DELETE':
            return self.client.delete(path, headers=headers)
        
        raise ValueError(f"Unknown method: {method}")
    
    def _role_has_permission(self, role_name, permission):
        """Rol bu izne sahip mi?"""
        return permission in ROLE_PERMISSIONS.get(role_name, [])


# =============================================================================
# PARAMETERIZED TESTS - Her endpoint için her rol
# =============================================================================

# Test parametrelerini oluştur
def generate_test_params():
    """Tüm endpoint-rol kombinasyonlarını üret"""
    params = []
    for method, path, permission, body in TEST_ENDPOINTS:
        for role_name in ROLE_PERMISSIONS.keys():
            has_permission = permission in ROLE_PERMISSIONS.get(role_name, [])
            params.append(
                pytest.param(
                    method, path, permission, body, role_name, has_permission,
                    id=f"{role_name}-{method}-{path.replace('/', '_')}"
                )
            )
    return params


@pytest.mark.parametrize("method,path,permission,body,role_name,should_have_access", generate_test_params())
def test_endpoint_permission(client, admin_token, method, path, permission, body, role_name, should_have_access):
    """
    Her endpoint için her rolün erişim durumunu test et.
    
    Args:
        method: HTTP method
        path: Endpoint path
        permission: Gereken permission
        body: Request body (optional)
        role_name: Test edilen rol
        should_have_access: Bu rol erişebilmeli mi?
    """
    # Rol için token al
    role_token = get_role_token(client, admin_token, role_name)
    
    if not role_token:
        pytest.skip(f"Could not get token for role: {role_name}")
    
    # İsteği yap
    headers = {'Authorization': f'Bearer {role_token}'}
    
    if method == 'GET':
        response = client.get(path, headers=headers)
    elif method == 'POST':
        response = client.post(path, json=body or {}, headers=headers, content_type='application/json')
    elif method == 'PUT':
        response = client.put(path, json=body or {}, headers=headers, content_type='application/json')
    elif method == 'PATCH':
        response = client.patch(path, json=body or {}, headers=headers, content_type='application/json')
    elif method == 'DELETE':
        response = client.delete(path, headers=headers)
    else:
        pytest.fail(f"Unknown method: {method}")
    
    # Sonucu kontrol et
    if should_have_access:
        # Erişim olmalı - 403 OLMAMALI
        assert response.status_code != 403, \
            f"Role '{role_name}' should have access to {method} {path} (permission: {permission}), but got 403"
    else:
        # Erişim olmamalı - 403 OLMALI
        assert response.status_code == 403, \
            f"Role '{role_name}' should NOT have access to {method} {path} (permission: {permission}), but got {response.status_code}"


# =============================================================================
# PERMISSION COVERAGE TESTS
# =============================================================================

class TestPermissionCoverage:
    """Permission mapping coverage testleri"""
    
    def test_all_permissions_mapped(self):
        """Tüm DB permission'ları mapping'de olmalı"""
        with app.app_context():
            db_permissions = {p.name for p in Permission.query.all()}
            map_permissions = {p for p in ENDPOINT_PERMISSIONS.values() if p and p != 'public'}
            
            # DB'de olan ama map'te olmayan
            unmapped = db_permissions - map_permissions
            assert len(unmapped) == 0 or unmapped == {'sales.approve'}, \
                f"Permissions in DB but not mapped: {unmapped}"
    
    def test_all_map_permissions_in_db(self):
        """Tüm mapping permission'ları DB'de olmalı"""
        with app.app_context():
            db_permissions = {p.name for p in Permission.query.all()}
            map_permissions = {p for p in ENDPOINT_PERMISSIONS.values() if p and p != 'public'}
            
            # Map'te olan ama DB'de olmayan
            missing = map_permissions - db_permissions
            assert len(missing) == 0, \
                f"Permissions in map but not in DB: {missing}"
    
    def test_all_roles_have_permissions(self):
        """Tüm roller en az bir izne sahip olmalı"""
        with app.app_context():
            for role_name in ['admin', 'odyolog', 'odyometrist', 'secretary', 'user']:
                role = Role.query.filter_by(name=role_name).first()
                if role:
                    assert len(role.permissions) > 0, \
                        f"Role '{role_name}' has no permissions"


# =============================================================================
# SECURITY TESTS
# =============================================================================

class TestSecurityBoundaries:
    """Güvenlik sınırları testleri"""
    
    def test_no_token_returns_401(self, client):
        """Token olmadan istek 401 döndürmeli"""
        response = client.get('/api/patients')
        assert response.status_code in [401, 422], \
            f"Expected 401/422 without token, got {response.status_code}"
    
    def test_invalid_token_returns_401(self, client):
        """Geçersiz token ile istek 401 döndürmeli"""
        response = client.get('/api/patients', 
            headers={'Authorization': 'Bearer invalid_token_here'})
        assert response.status_code in [401, 422], \
            f"Expected 401/422 with invalid token, got {response.status_code}"
    
    def test_expired_token_returns_401(self, client):
        """Süresi dolmuş token ile istek 401 döndürmeli"""
        # Bu test için gerçek bir expired token gerekir
        # Şimdilik skip
        pytest.skip("Need real expired token for this test")
    
    def test_secretary_cannot_delete_patient(self, client, admin_token):
        """Secretary hasta silemez - kritik güvenlik testi"""
        secretary_token = get_role_token(client, admin_token, 'secretary')
        if not secretary_token:
            pytest.skip("Could not get secretary token")
        
        response = client.delete('/api/patients/test123',
            headers={'Authorization': f'Bearer {secretary_token}'})
        
        assert response.status_code == 403, \
            f"Secretary should not be able to delete patients, got {response.status_code}"
        
        data = json.loads(response.data)
        assert 'patients.delete' in str(data.get('error', {})), \
            "Error should mention patients.delete permission"
    
    def test_secretary_cannot_access_team_permissions(self, client, admin_token):
        """Secretary rol izinlerine erişemez"""
        secretary_token = get_role_token(client, admin_token, 'secretary')
        if not secretary_token:
            pytest.skip("Could not get secretary token")
        
        response = client.get('/api/permissions',
            headers={'Authorization': f'Bearer {secretary_token}'})
        
        assert response.status_code == 403, \
            f"Secretary should not access team permissions, got {response.status_code}"
    
    def test_user_cannot_create_sales(self, client, admin_token):
        """User satış oluşturamaz"""
        user_token = get_role_token(client, admin_token, 'user')
        if not user_token:
            pytest.skip("Could not get user token")
        
        response = client.post('/api/sales',
            json={'patient_id': 'test123'},
            headers={'Authorization': f'Bearer {user_token}'},
            content_type='application/json')
        
        assert response.status_code == 403, \
            f"User should not be able to create sales, got {response.status_code}"


# =============================================================================
# ROLE ESCALATION TESTS
# =============================================================================

class TestRoleEscalation:
    """Rol yükseltme saldırılarını test et"""
    
    def test_cannot_switch_role_without_admin_email(self, client, admin_token):
        """admin@x-ear.com olmadan rol değiştiremez"""
        # Bu test için farklı bir kullanıcı token'ı gerekir
        # Şimdilik skip
        pytest.skip("Need non-admin user token for this test")
    
    def test_secretary_cannot_elevate_to_admin(self, client, admin_token):
        """Secretary kendini admin yapamaz"""
        secretary_token = get_role_token(client, admin_token, 'secretary')
        if not secretary_token:
            pytest.skip("Could not get secretary token")
        
        # Kendi rolünü admin yapmaya çalış
        response = client.put('/api/users/usr_admin',
            json={'role': 'admin'},
            headers={'Authorization': f'Bearer {secretary_token}'},
            content_type='application/json')
        
        # Ya 403 dönmeli ya da başarılı olmamalı
        assert response.status_code in [403, 400, 404], \
            f"Secretary should not elevate to admin, got {response.status_code}"


# =============================================================================
# RUN SUMMARY
# =============================================================================

if __name__ == '__main__':
    # Test sayısını hesapla
    total_endpoints = len(TEST_ENDPOINTS)
    total_roles = len(ROLE_PERMISSIONS)
    total_tests = total_endpoints * total_roles
    
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║           KAPSAMLI PERMISSION TEST SUITE                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Toplam Endpoint: {total_endpoints:>3}                                          ║
║  Toplam Rol:      {total_roles:>3}                                          ║
║  Toplam Test:     {total_tests:>3}                                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Roller: {', '.join(ROLE_PERMISSIONS.keys()):<50} ║
╚══════════════════════════════════════════════════════════════════╝
    """)
    
    # Pytest çalıştır
    pytest.main([__file__, '-v', '--tb=short'])
