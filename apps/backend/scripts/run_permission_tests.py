#!/usr/bin/env python3
"""
Kapsamlı Permission Test Runner

Bu script tüm endpoint'leri tüm roller için test eder ve detaylı rapor üretir.
Pytest yerine doğrudan HTTP istekleri yapar.

Kullanım:
    python scripts/run_permission_tests.py
    python scripts/run_permission_tests.py --role secretary
    python scripts/run_permission_tests.py --endpoint patients
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
    'tenant_admin': {
        'description': 'Tam yetkili yönetici',
        'all_access': True,  # Tüm izinlere sahip
    },
    'odyolog': {
        'description': 'Odyolog - Hasta ve satış işlemleri',
        'permissions': [
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
    },
    'odyometrist': {
        'description': 'Odyometrist - Hasta işlemleri',
        'permissions': [
            'patients.view', 'patients.create', 'patients.edit', 'patients.notes', 'patients.history',
            'devices.view',
            'dashboard.view',
        ],
    },
    'secretary': {
        'description': 'Sekreter - Temel işlemler',
        'permissions': [
            'patients.view', 'patients.create', 'patients.edit',
            'sales.view',
            'devices.view',
            'dashboard.view',
        ],
    },
}

# =============================================================================
# TEST ENDPOINTS
# =============================================================================

# Her endpoint için: (method, path, permission, sample_body, description)
ENDPOINTS = [
    # PATIENTS
    ('GET', '/api/patients', 'patients.view', None, 'Hasta listesi'),
    ('GET', '/api/patients/test_id', 'patients.view', None, 'Hasta detayı'),
    ('POST', '/api/patients', 'patients.create', {'first_name': 'Test', 'last_name': 'User', 'phone': '5551234567'}, 'Hasta oluştur'),
    ('PUT', '/api/patients/test_id', 'patients.edit', {'first_name': 'Updated'}, 'Hasta güncelle'),
    ('PATCH', '/api/patients/test_id', 'patients.edit', {'first_name': 'Updated'}, 'Hasta kısmi güncelle'),
    ('DELETE', '/api/patients/test_id', 'patients.delete', None, 'Hasta sil'),
    
    # PATIENT NOTES
    ('GET', '/api/patients/test_id/notes', 'patients.notes', None, 'Hasta notları'),
    ('POST', '/api/patients/test_id/notes', 'patients.notes', {'content': 'Test note'}, 'Hasta notu ekle'),
    
    # PATIENT HISTORY
    ('GET', '/api/patients/test_id/history', 'patients.history', None, 'Hasta geçmişi'),
    ('GET', '/api/patients/test_id/timeline', 'patients.history', None, 'Hasta zaman çizelgesi'),
    
    # SALES
    ('GET', '/api/sales', 'sales.view', None, 'Satış listesi'),
    ('POST', '/api/sales', 'sales.create', {'patient_id': 'test', 'items': []}, 'Satış oluştur'),
    ('PATCH', '/api/sales/test_id', 'sales.edit', {'status': 'completed'}, 'Satış güncelle'),
    ('DELETE', '/api/sales/test_id', 'sales.delete', None, 'Satış sil'),
    
    # PATIENT SALES
    ('GET', '/api/patients/test_id/sales', 'sales.view', None, 'Hasta satışları'),
    ('POST', '/api/patients/test_id/product-sales', 'sales.create', {'items': []}, 'Hasta ürün satışı'),
    
    # FINANCE
    ('GET', '/api/finance/summary', 'finance.view', None, 'Finans özeti'),
    ('GET', '/api/finance/cash-register', 'finance.cash_register', None, 'Kasa listesi'),
    ('POST', '/api/finance/cash-register', 'finance.cash_register', {'type': 'income', 'amount': 100}, 'Kasa kaydı'),
    ('GET', '/api/finance/reports', 'finance.reports', None, 'Finans raporları'),
    ('POST', '/api/finance/refunds', 'finance.refunds', {'sale_id': 'test', 'amount': 50}, 'İade işlemi'),
    
    # INVOICES
    ('GET', '/api/invoices', 'invoices.view', None, 'Fatura listesi'),
    ('GET', '/api/invoices/test_id', 'invoices.view', None, 'Fatura detayı'),
    ('POST', '/api/invoices', 'invoices.create', {'sale_id': 'test'}, 'Fatura oluştur'),
    ('POST', '/api/invoices/test_id/send', 'invoices.send', {}, 'Fatura gönder'),
    ('POST', '/api/invoices/test_id/cancel', 'invoices.cancel', {}, 'Fatura iptal'),
    
    # DEVICES
    ('GET', '/api/devices', 'devices.view', None, 'Cihaz listesi'),
    ('GET', '/api/devices/test_id', 'devices.view', None, 'Cihaz detayı'),
    ('POST', '/api/devices', 'devices.create', {'serial_number': 'SN123', 'brand': 'Test'}, 'Cihaz ekle'),
    ('PUT', '/api/devices/test_id', 'devices.edit', {'status': 'active'}, 'Cihaz güncelle'),
    ('DELETE', '/api/devices/test_id', 'devices.delete', None, 'Cihaz sil'),
    ('POST', '/api/devices/test_id/assign', 'devices.assign', {'patient_id': 'test'}, 'Cihaz ata'),
    
    # INVENTORY
    ('GET', '/api/inventory', 'inventory.view', None, 'Stok listesi'),
    ('POST', '/api/inventory', 'inventory.manage', {'product_id': 'test', 'quantity': 10}, 'Stok ekle'),
    ('PUT', '/api/inventory/test_id', 'inventory.manage', {'quantity': 20}, 'Stok güncelle'),
    
    # CAMPAIGNS
    ('GET', '/api/campaigns', 'campaigns.view', None, 'Kampanya listesi'),
    ('POST', '/api/campaigns', 'campaigns.create', {'name': 'Test', 'type': 'sms'}, 'Kampanya oluştur'),
    ('PUT', '/api/campaigns/test_id', 'campaigns.edit', {'status': 'active'}, 'Kampanya güncelle'),
    ('DELETE', '/api/campaigns/test_id', 'campaigns.delete', None, 'Kampanya sil'),
    ('POST', '/api/campaigns/test_id/send-sms', 'campaigns.send_sms', {}, 'SMS gönder'),
    
    # SGK
    ('GET', '/api/sgk/provisions', 'sgk.view', None, 'SGK listesi'),
    ('POST', '/api/sgk/provisions', 'sgk.create', {'patient_id': 'test'}, 'SGK oluştur'),
    ('POST', '/api/sgk/upload', 'sgk.upload', {}, 'SGK yükle'),
    
    # SETTINGS
    ('GET', '/api/settings', 'settings.view', None, 'Ayarlar'),
    ('PUT', '/api/settings', 'settings.edit', {'company': {'name': 'Test'}}, 'Ayarlar güncelle'),
    ('GET', '/api/branches', 'settings.view', None, 'Şubeler'),
    ('POST', '/api/branches', 'settings.branches', {'name': 'New Branch'}, 'Şube ekle'),
    ('PUT', '/api/branches/test_id', 'settings.branches', {'name': 'Updated'}, 'Şube güncelle'),
    ('DELETE', '/api/branches/test_id', 'settings.branches', None, 'Şube sil'),
    ('GET', '/api/integrations', 'settings.integrations', None, 'Entegrasyonlar'),
    
    # TEAM
    ('GET', '/api/users', 'team.view', None, 'Kullanıcı listesi'),
    ('POST', '/api/users', 'team.create', {'email': 'test@test.com', 'role': 'user'}, 'Kullanıcı ekle'),
    ('PUT', '/api/users/test_id', 'team.edit', {'first_name': 'Updated'}, 'Kullanıcı güncelle'),
    ('DELETE', '/api/users/test_id', 'team.delete', None, 'Kullanıcı sil'),
    ('GET', '/api/permissions', 'team.permissions', None, 'İzinler'),
    ('GET', '/api/permissions/role/odyolog', 'team.permissions', None, 'Rol izinleri'),
    ('PUT', '/api/permissions/role/odyolog', 'team.permissions', {'permissions': []}, 'Rol izinleri güncelle'),
    
    # REPORTS
    ('GET', '/api/reports', 'reports.view', None, 'Raporlar'),
    ('POST', '/api/reports/export', 'reports.export', {'type': 'sales', 'format': 'excel'}, 'Rapor dışa aktar'),
    
    # DASHBOARD
    ('GET', '/api/dashboard', 'dashboard.view', None, 'Dashboard'),
    ('GET', '/api/dashboard/stats', 'dashboard.view', None, 'Dashboard istatistikleri'),
    ('GET', '/api/dashboard/analytics', 'dashboard.analytics', None, 'Analitik'),
    
    # APPOINTMENTS
    ('GET', '/api/appointments', 'patients.view', None, 'Randevular'),
    ('GET', '/api/appointments/list', 'patients.view', None, 'Randevu listesi'),
    ('POST', '/api/appointments', 'patients.edit', {'patient_id': 'test', 'date': '2025-01-01'}, 'Randevu oluştur'),
    ('PUT', '/api/appointments/test_id', 'patients.edit', {'status': 'completed'}, 'Randevu güncelle'),
    ('DELETE', '/api/appointments/test_id', 'patients.edit', None, 'Randevu sil'),
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
            data = response.json()
            self.admin_token = data.get('access_token')
            print(f"   ✅ Admin token alındı")
            return True
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
