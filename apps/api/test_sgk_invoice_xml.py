#!/usr/bin/env python
"""
SGK Faturası XML Test Script
Birfatura örneğine birebir uyumlu SGK faturası üretir ve mock API'ye gönderir.
"""

import os
import sys
import json
import requests
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.ubl_utils import generate_sgk_invoice_xml

# Test verisi - Birfatura örneğindeki değerlerle
TEST_INVOICE_DATA = {
    'invoice_number': 'EFA2025000000725',
    'uuid': '6074eb85-1afb-4ea8-9f92-e250f3f56967',
    'issue_date': '2025-12-01',
    'issue_time': '10:49:24',
    
    # SGK-spesifik
    'dosya_no': '1225324',
    'mukellef_kodu': '11111111',
    'mukellef_adi': 'TEST OPTİK CENGİZ ERDEM',
    'period_start': '2025-12-01',
    'period_end': '2025-12-01',
    
    # Tedarikçi bilgileri
    'supplier': {
        'vkn': '1234567801',
        'name': 'Test Firma',
        'street': 'Kuşkavağı, Belediye Cd. No:78, 07070 Konyaaltı/Antalya',
        'district': 'Maltepe',
        'city': 'İstanbul',
        'country': 'Türkiye',
        'tax_office': 'Antalya',
        'phone': '05555555555',
        'email': 'info@firma.com'
    },
    
    # Katılım payı tutarları (Birfatura örneğindeki değerler)
    'kpv10_amount': 1379.00,  # %10 katılım paylı verilen (KDV hariç)
    'kpv20_amount': 2270.50,  # %20 katılım paylı verilen (KDV hariç)
    'tahsil_edilen_kp': 592.00,  # Tahsil edilen katılım payı
}


def main():
    print("=" * 60)
    print("SGK FATURASI XML TEST")
    print("=" * 60)
    
    # 1. XML üret
    print("\n1. SGK Faturası XML üretiliyor...")
    xml_content = generate_sgk_invoice_xml(TEST_INVOICE_DATA)
    
    # Dosyaya kaydet
    output_dir = os.path.join(os.path.dirname(__file__), 'instance', 'test_output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'sgk_test_invoice.xml')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_content)
    print(f"   XML kaydedildi: {output_path}")
    
    # 2. XML içeriğini göster (kısaltılmış)
    print("\n2. Üretilen XML (ilk 2000 karakter):")
    print("-" * 40)
    print(xml_content[:2000])
    print("...")
    print("-" * 40)
    
    # 3. Mock API'ye gönder
    print("\n3. Mock API'ye gönderiliyor...")
    api_url = "http://localhost:5003/api/OutEBelgeV2/SendDocument"
    
    payload = {
        'xml': xml_content,
        'filename': 'SGK-EFATURA-TEST.xml',
        'isDocumentNoAuto': False,
        'systemTypeCodes': 'EFATURA'
    }
    
    try:
        response = requests.post(api_url, json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            print("\n   ✓ Mock API başarılı!")
        else:
            print(f"\n   ✗ Mock API hatası: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("   ✗ Backend bağlantısı kurulamadı (localhost:5003)")
        print("   Backend çalışıyor mu kontrol edin: python app.py flask 5003")
    except Exception as e:
        print(f"   ✗ Hata: {e}")
    
    # 4. Inbox'a da gönder (ReceiveDocument)
    print("\n4. Inbox'a gönderiliyor (gelen fatura simülasyonu)...")
    inbox_url = "http://localhost:5003/api/OutEBelgeV2/ReceiveDocument"
    
    inbox_payload = {
        'xml': xml_content,
        'filename': 'SGK-GELEN-FATURA-TEST.xml'
    }
    
    try:
        response = requests.post(inbox_url, json=inbox_payload, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        if response.status_code == 200:
            print("\n   ✓ Inbox'a kaydedildi!")
        else:
            print(f"\n   ✗ Inbox hatası: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("   ✗ Backend bağlantısı kurulamadı")
    except Exception as e:
        print(f"   ✗ Hata: {e}")
    
    # 5. Inbox listesini kontrol et
    print("\n5. Inbox listesi kontrol ediliyor...")
    list_url = "http://localhost:5003/api/birfatura/inbox/list"
    
    try:
        response = requests.get(list_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            files = data.get('data', [])
            print(f"   Inbox'ta {len(files)} dosya var:")
            for f in files[-5:]:  # Son 5 dosya
                print(f"     - {f.get('filename')} ({f.get('size')} bytes)")
    except Exception as e:
        print(f"   ✗ Hata: {e}")
    
    print("\n" + "=" * 60)
    print("TEST TAMAMLANDI")
    print("=" * 60)


if __name__ == '__main__':
    main()
