#!/usr/bin/env python3
"""
Basit Permission Test Script
Tüm rolleri temel endpoint'lerle test eder.
"""

import requests
import json

BASE_URL = 'http://localhost:5003'

# Rol tanımları - hangi permission'lara sahip olmalı
ROLE_EXPECTED_PERMISSIONS = {
    'tenant_admin': {
        'description': 'Tam yetkili yönetici',
        'all_access': True,
    },
    'odyolog': {
        'description': 'Odyolog',
        'permissions': ['patients.view', 'patients.create', 'patients.edit', 'sales.view', 
                       'sales.create', 'sales.edit', 'invoices.view', 'invoices.create',
                       'devices.view', 'devices.assign', 'inventory.view', 'sgk.view', 
                       'sgk.create', 'reports.view', 'dashboard.view', 'finance.view'],
    },
    'odyometrist': {
        'description': 'Odyometrist',
        'permissions': ['patients.view', 'patients.create', 'patients.edit', 'patients.notes',
                       'patients.history', 'devices.view', 'dashboard.view'],
    },
    'secretary': {
        'description': 'Sekreter',
        'permissions': ['patients.view', 'patients.create', 'patients.edit', 'sales.view',
                       'devices.view', 'dashboard.view'],
    },
}

# Test edilecek endpoint'ler
TEST_ENDPOINTS = [
    # (method, path, required_permission)
    ('GET', '/api/patients', 'patients.view'),
    ('GET', '/api/dashboard', 'dashboard.view'),
    ('GET', '/api/devices', 'devices.view'),
    ('GET', '/api/settings', 'settings.view'),
    ('GET', '/api/users', 'team.view'),
    ('DELETE', '/api/patients/fake_id', 'patients.delete'),
]


def get_admin_token():
    """Admin token al."""
    resp = requests.post(f'{BASE_URL}/api/auth/login', 
                        json={'email': 'admin@x-ear.com', 'password': 'admin123'})
    return resp.json().get('access_token')


def get_role_token(admin_token, role_name):
    """Belirli rol için token al."""
    if role_name == 'tenant_admin':
        return admin_token
    
    resp = requests.post(f'{BASE_URL}/api/admin/debug/switch-role',
                        json={'targetRole': role_name},
                        headers={'Authorization': f'Bearer {admin_token}'})
    return resp.json().get('data', {}).get('accessToken')


def test_endpoint(token, method, path):
    """Tek endpoint test et."""
    headers = {'Authorization': f'Bearer {token}'}
    if method == 'GET':
        resp = requests.get(f'{BASE_URL}{path}', headers=headers)
    elif method == 'DELETE':
        resp = requests.delete(f'{BASE_URL}{path}', headers=headers)
    elif method == 'POST':
        resp = requests.post(f'{BASE_URL}{path}', json={}, headers=headers)
    return resp.status_code


def role_should_have_access(role_name, permission):
    """Bu rol bu izne sahip mi?"""
    role_config = ROLE_EXPECTED_PERMISSIONS.get(role_name, {})
    if role_config.get('all_access'):
        return True
    return permission in role_config.get('permissions', [])


def main():
    print("🔐 Permission System Test")
    print("=" * 70)
    
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Admin login failed!")
        return
    
    print("✅ Admin login successful\n")
    
    results = {'passed': 0, 'failed': 0, 'total': 0}
    
    for role_name, role_config in ROLE_EXPECTED_PERMISSIONS.items():
        print(f"\n📋 Testing: {role_name} ({role_config['description']})")
        print("-" * 50)
        
        token = get_role_token(admin_token, role_name)
        if not token:
            print(f"   ⚠️ Could not get token for {role_name}")
            continue
        
        for method, path, permission in TEST_ENDPOINTS:
            results['total'] += 1
            status = test_endpoint(token, method, path)
            should_access = role_should_have_access(role_name, permission)
            
            # Permission check
            if should_access:
                # Should NOT get 403
                if status != 403:
                    results['passed'] += 1
                    icon = '✅'
                    result = 'ACCESS'
                else:
                    results['failed'] += 1
                    icon = '❌'
                    result = 'BLOCKED (should have access!)'
            else:
                # Should get 403
                if status == 403:
                    results['passed'] += 1
                    icon = '✅'
                    result = 'BLOCKED'
                else:
                    results['failed'] += 1
                    icon = '❌'
                    result = f'ACCESS (should be blocked! got {status})'
            
            print(f"   {icon} {method:6} {path:<35} [{permission}] → {result}")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    total = results['total']
    passed = results['passed']
    failed = results['failed']
    rate = (passed / total * 100) if total > 0 else 0
    
    print(f"   Total Tests:  {total}")
    print(f"   Passed:       {passed} ({rate:.1f}%)")
    print(f"   Failed:       {failed}")
    
    if failed == 0:
        print("\n✅ ALL TESTS PASSED!")
    else:
        print(f"\n⚠️ {failed} TESTS FAILED!")
    
    return failed == 0


if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
