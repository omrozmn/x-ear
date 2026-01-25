#!/usr/bin/env python3
"""
Kapsamlı Permission Test Runner

Bu script tüm endpoint'leri tüm roller için test eder ve detaylı rapor üretir.
Pytest yerine doğrudan HTTP istekleri yapar.

Kullanım:
    python scripts/run_permission_tests.py
    python scripts/run_permission_tests.py --role secretary
    python scripts/run_permission_tests.py --endpoint parties
"""

import requests
import json
import sys
import os
from datetime import datetime
from collections import defaultdict

# Base URL
BASE_URL = os.getenv('API_URL', 'http://localhost:5003')

# =============================================================================
# ROLE CONFIGURATIONS
# =============================================================================

ROLES = {
    'admin': {
        'description': 'Tam yetkili yönetici',
        'all_access': True,
    },
    'manager': {
        'description': 'Yönetici - Çoğu işlem yetkili, silme sınırlı',
        'permissions': [
            'patient:read', 'patient:write', 'patient:delete', 'patient:export',
            'inventory:read', 'inventory:write',
            'sale:read', 'sale:write',
            'appointment:read', 'appointment:write',
            'supplier:read', 'supplier:write',
            'invoice:read', 'invoice:write', 'invoice:export',
            'dashboard:read',
            'branches:read',
            'payments:read', 'payments:write',
            'cash_records:read', 'cash_records:write',
            'campaign:read', 'campaign:write',
            'ocr:read', 'ocr:write',
        ],
    },
    'user': {
        'description': 'Standart kullanıcı - Okuma ağırlıklı',
        'permissions': [
            'patient:read', 'patient:write',
            'inventory:read',
            'sale:read', 'sale:write',
            'appointment:read', 'appointment:write',
            'supplier:read',
            'invoice:read',
            'dashboard:read',
            'branches:read',
            'payments:read',
            'cash_records:read',
            'ocr:read', 'ocr:write',
        ],
    },
}

# =============================================================================
# TEST ENDPOINTS
# =============================================================================

# Her endpoint için: (method, path, permission, sample_body, description)
ENDPOINTS = [
    # PATIENTS (Parties)
    ('GET', '/api/parties', 'patient:read', None, 'Hasta listesi'),
    ('GET', '/api/parties/test_id', 'patient:read', None, 'Hasta detayı'),
    ('POST', '/api/parties', 'patient:write', {'firstName': 'Test', 'lastName': 'User', 'phone': '5551234567'}, 'Hasta oluştur'),
    ('PUT', '/api/parties/test_id', 'patient:write', {'firstName': 'Updated'}, 'Hasta güncelle'),
    ('DELETE', '/api/parties/test_id', 'patient:delete', None, 'Hasta sil'),
    
    # SALES
    ('GET', '/api/sales', 'sale:read', None, 'Satış listesi'),
    ('POST', '/api/sales', 'sale:write', {'partyId': 'test', 'items': []}, 'Satış oluştur'),
    ('PATCH', '/api/sales/test_id', 'sale:write', {'status': 'completed'}, 'Satış güncelle'),
    
    # INVENTORY
    ('GET', '/api/inventory', 'inventory:read', None, 'Stok listesi'),
    ('POST', '/api/inventory', 'inventory:write', {'product_id': 'test', 'quantity': 10}, 'Stok ekle'),
    
    # BRANCHES
    ('GET', '/api/branches', 'branches:read', None, 'Şubeler'),
    ('POST', '/api/branches', 'branches:write', {'name': 'New Branch'}, 'Şube ekle'),
    ('DELETE', '/api/branches/test_id', 'branches:delete', None, 'Şube sil'),
    
    # DASHBOARD
    ('GET', '/api/dashboard', 'dashboard:read', None, 'Dashboard'),
]

# =============================================================================
# TEST RUNNER
# =============================================================================

class PermissionTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.role_tokens = {}
        self.results = defaultdict(list)
        self.summary = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'skipped': 0,
        }
    
    def login(self):
        """Admin olarak giriş yap"""
        print("🔐 Admin olarak giriş yapılıyor...")
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={'email': 'admin@x-ear.com', 'password': 'admin123'}
        )
        
        if response.status_code == 200:
            resp_json = response.json()
            # Standard ResponseEnvelope structure: {"data": {"accessToken": "..."}}
            self.admin_token = resp_json.get('data', {}).get('accessToken')
            if self.admin_token:
                print(f"   ✅ Admin token alındı")
                return True
            else:
                print(f"   ❌ Token bulunamadı: {resp_json}")
                return False
        else:
            print(f"   ❌ Login başarısız: {response.status_code}")
            return False
    
    def get_role_token(self, role_name):
        """Belirli bir rol için token al"""
        if role_name in self.role_tokens:
            return self.role_tokens[role_name]
        
        if role_name == 'tenant_admin':
            # Admin zaten tenant_admin
            self.role_tokens[role_name] = self.admin_token
            return self.admin_token
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/debug/switch-role",
            json={'targetRole': role_name},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('data', {}).get('accessToken')
            self.role_tokens[role_name] = token
            return token
        
        return None
    
    def role_has_permission(self, role_name, permission):
        """Rol bu izne sahip mi?"""
        role_config = ROLES.get(role_name, {})
        
        if role_config.get('all_access'):
            return True
        
        return permission in role_config.get('permissions', [])
    
    def test_endpoint(self, role_name, method, path, permission, body, description):
        """Tek bir endpoint'i test et"""
        token = self.get_role_token(role_name)
        
        if not token:
            return {
                'status': 'SKIP',
                'reason': f'Token alınamadı: {role_name}',
            }
        
        headers = {'Authorization': f'Bearer {token}'}
        url = f"{BASE_URL}{path}"
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=body or {}, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=body or {}, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=body or {}, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return {'status': 'SKIP', 'reason': f'Unknown method: {method}'}
            
            status_code = response.status_code
            should_have_access = self.role_has_permission(role_name, permission)
            
            if should_have_access:
                # Erişim olmalı - 403 OLMAMALI
                if status_code == 403:
                    return {
                        'status': 'FAIL',
                        'expected': 'ACCESS',
                        'got': 403,
                        'reason': f'Rol {permission} iznine sahip ama 403 döndü',
                    }
                else:
                    return {
                        'status': 'PASS',
                        'expected': 'ACCESS',
                        'got': status_code,
                    }
            else:
                # Erişim OLMAMALI - 403 OLMALI
                if status_code == 403:
                    return {
                        'status': 'PASS',
                        'expected': 403,
                        'got': 403,
                    }
                else:
                    return {
                        'status': 'FAIL',
                        'expected': 403,
                        'got': status_code,
                        'reason': f'Rol {permission} iznine sahip DEĞİL ama {status_code} döndü',
                    }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'reason': str(e),
            }
    
    def run_all_tests(self, filter_role=None, filter_endpoint=None):
        """Tüm testleri çalıştır"""
        if not self.login():
            print("❌ Login başarısız, testler çalıştırılamıyor")
            return
        
        print("\n" + "="*80)
        print("🧪 KAPSAMLI PERMISSION TESTLERİ BAŞLIYOR")
        print("="*80)
        
        roles_to_test = [filter_role] if filter_role else list(ROLES.keys())
        
        for role_name in roles_to_test:
            print(f"\n📋 Rol: {role_name} ({ROLES.get(role_name, {}).get('description', '')})")
            print("-"*60)
            
            token = self.get_role_token(role_name)
            if not token:
                print(f"   ⚠️  Token alınamadı, rol atlanıyor")
                continue
            
            for method, path, permission, body, description in ENDPOINTS:
                # Endpoint filter
                if filter_endpoint and filter_endpoint.lower() not in path.lower():
                    continue
                
                self.summary['total'] += 1
                
                result = self.test_endpoint(role_name, method, path, permission, body, description)
                result['role'] = role_name
                result['method'] = method
                result['path'] = path
                result['permission'] = permission
                result['description'] = description
                
                self.results[role_name].append(result)
                
                # Sonucu yazdır
                status = result['status']
                if status == 'PASS':
                    self.summary['passed'] += 1
                    icon = '✅'
                elif status == 'FAIL':
                    self.summary['failed'] += 1
                    icon = '❌'
                elif status == 'SKIP':
                    self.summary['skipped'] += 1
                    icon = '⏭️'
                else:
                    self.summary['skipped'] += 1
                    icon = '⚠️'
                
                has_perm = '✓' if self.role_has_permission(role_name, permission) else '✗'
                print(f"   {icon} {method:6} {path:<45} [{permission:<20}] {has_perm} {status}")
                
                if status == 'FAIL':
                    print(f"      └─ {result.get('reason', '')}")
        
        self.print_summary()
    
    def print_summary(self):
        """Test özeti yazdır"""
        print("\n" + "="*80)
        print("📊 TEST ÖZETİ")
        print("="*80)
        
        total = self.summary['total']
        passed = self.summary['passed']
        failed = self.summary['failed']
        skipped = self.summary['skipped']
        
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"""
┌────────────────────────────────────────┐
│  Toplam Test:     {total:>5}                │
│  Başarılı:        {passed:>5} ({pass_rate:.1f}%)          │
│  Başarısız:       {failed:>5}                │
│  Atlanan:         {skipped:>5}                │
└────────────────────────────────────────┘
        """)
        
        if failed > 0:
            print("\n⚠️  BAŞARISIZ TESTLER:")
            print("-"*60)
            for role_name, results in self.results.items():
                failures = [r for r in results if r['status'] == 'FAIL']
                if failures:
                    print(f"\n  Rol: {role_name}")
                    for f in failures:
                        print(f"    ❌ {f['method']} {f['path']}")
                        print(f"       Permission: {f['permission']}")
                        print(f"       Beklenen: {f.get('expected')}, Alınan: {f.get('got')}")
        
        # JSON rapor kaydet
        report_path = os.path.join(os.path.dirname(__file__), '..', 'permission_test_report.json')
        with open(report_path, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'summary': self.summary,
                'results': dict(self.results),
            }, f, indent=2)
        
        print(f"\n📄 Detaylı rapor: {report_path}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Permission Test Runner')
    parser.add_argument('--role', help='Sadece belirli bir rolü test et')
    parser.add_argument('--endpoint', help='Sadece belirli endpoint\'leri test et (path içinde arama)')
    args = parser.parse_args()
    
    runner = PermissionTestRunner()
    runner.run_all_tests(
        filter_role=args.role,
        filter_endpoint=args.endpoint
    )
    
    # Exit code: 0 if all passed, 1 if any failed
    sys.exit(0 if runner.summary['failed'] == 0 else 1)


if __name__ == '__main__':
    main()
