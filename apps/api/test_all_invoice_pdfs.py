#!/usr/bin/env python3
"""
Tum fatura tiplerini test eden script.
Her tip icin ornek PDF uretir.
"""
import os
import sys

# Set library path for macOS
os.environ['DYLD_LIBRARY_PATH'] = '/opt/homebrew/lib'

from utils.pdf_renderer import render_invoice_to_pdf

# Ortak firma bilgileri
SUPPLIER = {
    'name': 'Ozmen Tibbi Cihazlar Ic ve Dis Ticaret Sanayi Limited Sirketi',
    'tax_id': '7030734275',
    'tax_office': 'OSMANGAZI VERGI DAIRESI MUDURLUGU - (16251)',
    'address': 'Aktarhussam Mah. 932. Sk. No.21A Osmangazi/ Bursa',
    'phone': '05454092516',
    'email': 'ozmentibbi@gmail.com',
    'trade_registry_no': '12345',
    'mersis_no': '0703073427500001'
}

CUSTOMER_FIRMA = {
    'name': 'Test Firmasi Anonim Sirketi',
    'tax_id': '1234567891',
    'tax_office': 'Ankara Kurumlar Vergi Dairesi Mudurlugu',
    'address': 'Beytepe Mahallesi, Cankaya/Ankara',
    'phone': '03123170220',
    'email': 'info@testfirma.com'
}

CUSTOMER_SAHIS = {
    'name': 'Ahmet Yilmaz',
    'identity_number': '11111111111',
    'address': 'Beytepe Mh. Cankaya/Ankara',
    'phone': '05551234567'
}

CUSTOMER_SGK = {
    'name': 'Sosyal Guvenlik Kurumu',
    'tax_id': '7750409379',
    'tax_office': 'CANKAYA VERGI DAIRESI (6257)',
    'address': 'Cankaya/ ANKARA / TURKIYE'
}

def generate_all_invoices():
    output_dir = '/tmp/invoice_tests'
    os.makedirs(output_dir, exist_ok=True)
    
    invoices = []
    
    # 1. E-FATURA (SATIS)
    inv1 = {
        'name': '01_efatura_satis',
        'template': 'sale.html',
        'data': {
            'invoice_type': 'SATIS',
            'invoice_id': 'EFA2025000000001',
            'uuid': '88f924da-b4f8-4c22-8db2-8cf9057a8b8d',
            'issue_date': '01-12-2025',
            'issue_time': '14:30:00',
            'profile_id': 'TICARIFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'lines': [
                {'item_code': 'PRD001', 'description': 'Isitme Cihazi Sol', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 15000.00, 'tax_percent': 20, 'tax_amount': 3000.00, 'line_extension_amount': 15000.00},
                {'item_code': 'PRD002', 'description': 'Isitme Cihazi Sag', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 15000.00, 'tax_percent': 20, 'tax_amount': 3000.00, 'line_extension_amount': 15000.00}
            ],
            'line_extension_amount': 30000.00,
            'allowance_total': 0.00,
            'tax_total': 6000.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 36000.00,
            'payable_amount': 36000.00,
            'amount_in_words': 'OtuzAltiBinTurkLirasi',
            'notes': 'E-Fatura izni kapsaminda elektronik ortamda iletilmistir.'
        }
    }
    invoices.append(inv1)
    
    # 2. E-ARSIV FATURA
    inv2 = {
        'name': '02_earsiv_fatura',
        'template': 'sale.html',
        'data': {
            'invoice_type': 'SATIS',
            'invoice_id': 'ARS2025000000001',
            'uuid': '2c516a33-2e93-4c4c-9d6c-aafee4faa100',
            'issue_date': '01-12-2025',
            'issue_time': '15:00:00',
            'profile_id': 'EARSIVFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_SAHIS,
            'lines': [
                {'item_code': 'AKS001', 'description': 'Cep Telefonu Aksesuar', 'quantity': 2, 'unit_code': 'Adet', 'unit_price': 500.00, 'tax_percent': 20, 'tax_amount': 200.00, 'line_extension_amount': 1000.00}
            ],
            'line_extension_amount': 1000.00,
            'allowance_total': 0.00,
            'tax_total': 200.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 1200.00,
            'payable_amount': 1200.00,
            'amount_in_words': 'BinIkiYuzTurkLirasi',
            'notes': 'E-Arsiv izni kapsaminda elektronik ortamda iletilmistir.'
        }
    }
    invoices.append(inv2)
    
    # 3. IADE FATURASI
    inv3 = {
        'name': '03_iade_fatura',
        'template': 'iade.html',
        'data': {
            'invoice_type': 'IADE',
            'invoice_id': 'EFA2025000001001',
            'uuid': '644615de-98cb-4266-a6c6-e352b000e370',
            'issue_date': '01-12-2025',
            'issue_time': '11:30:00',
            'profile_id': 'TEMELFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'billing_references': [
                {'invoice_id': 'EFA2025000000001', 'issue_date': '15-11-2025'},
                {'invoice_id': 'EFA2025000000002', 'issue_date': '20-11-2025'}
            ],
            'lines': [
                {'item_code': 'PRD001', 'description': 'Isitme Cihazi Sol', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 15000.00, 'tax_percent': 20, 'tax_amount': 3000.00, 'line_extension_amount': 15000.00}
            ],
            'line_extension_amount': 15000.00,
            'allowance_total': 0.00,
            'tax_total': 3000.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 18000.00,
            'payable_amount': 18000.00,
            'amount_in_words': 'OnSekizBinTurkLirasi',
            'notes': 'Iade faturasi.'
        }
    }
    invoices.append(inv3)
    
    # 4. TEVKIFATLI FATURA
    inv4 = {
        'name': '04_tevkifatli_fatura',
        'template': 'sale.html',
        'data': {
            'invoice_type': 'TEVKIFAT',
            'invoice_id': 'EFA2025000000010',
            'uuid': '6bf00e2f-70eb-421b-a3b2-95dc7e538754',
            'issue_date': '01-12-2025',
            'issue_time': '16:00:00',
            'profile_id': 'TICARIFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'lines': [
                {'item_code': 'HZM001', 'description': 'BINA TADILAT HIZMETI', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 10000.00, 'tax_percent': 20, 'tax_amount': 2000.00, 'line_extension_amount': 10000.00}
            ],
            'withholding_taxes': [
                {'name': 'YAPIM ISLERI ILE BU ISLERLE BIRLIKTE IFA EDILEN MUHENDISLIK-MIMARLIK VE ETUT-PROJE HIZMETLERI', 'code': '601', 'taxable_amount': 2000.00, 'percent': 40, 'amount': 800.00}
            ],
            'line_extension_amount': 10000.00,
            'allowance_total': 0.00,
            'tax_total': 1200.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 12000.00,
            'withholding_total': 800.00,
            'payable_amount': 11200.00,
            'amount_in_words': 'OnBirBinIkiYuzTurkLirasi',
            'notes': 'Tevkifatli fatura.'
        }
    }
    invoices.append(inv4)
    
    # 5. TEVKIFAT IADE FATURASI
    inv5 = {
        'name': '05_tevkifat_iade_fatura',
        'template': 'iade.html',
        'data': {
            'invoice_type': 'TEVKIFATIADE',
            'invoice_id': 'EFA2025000000332',
            'uuid': 'c20b2bf7-cd49-4d32-afd0-6a7e30fa122a',
            'issue_date': '01-12-2025',
            'issue_time': '12:00:00',
            'profile_id': 'TEMELFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'billing_references': [
                {'invoice_id': 'EFA2025000000011', 'issue_date': '25-11-2025'},
                {'invoice_id': 'EFA2025000000012', 'issue_date': '26-11-2025'}
            ],
            'lines': [
                {'item_code': 'PRD003', 'description': 'Kafa Feneri', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 200.00, 'tax_percent': 5, 'tax_amount': 10.00, 'line_extension_amount': 200.00}
            ],
            'line_extension_amount': 200.00,
            'allowance_total': 0.00,
            'tax_total': 10.00,
            'tax_percent': 5,
            'tax_inclusive_amount': 210.00,
            'payable_amount': 210.00,
            'amount_in_words': 'IkiYuzOnTurkLirasi',
            'notes': 'Tevkifat iade faturasi.'
        }
    }
    invoices.append(inv5)
    
    # 6. SGK FATURASI
    inv6 = {
        'name': '06_sgk_fatura',
        'template': 'sgk.html',
        'data': {
            'invoice_type': 'SGK',
            'invoice_id': 'BEF2025000000036',
            'uuid': '7d588d90-2421-4b00-980a-8b4fe49c690c',
            'issue_date': '31-10-2025',
            'issue_time': '16:23:00',
            'profile_id': 'TEMELFATURA',
            'customization_id': 'TR1.2',
            'sales_channel': 'Diger',
            'ilave_fatura_tipi': 'SAGLIK_MED',
            'dosya_no': '1216926',
            'mukellef_kodu': '16810012',
            'mukellef_adi': 'HELIX ISITME CIHAZLARI DUZCE',
            'donem': '01-10-2025 / 31-10-2025',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_SGK,
            'lines': [
                {'item_code': '1741181741067', 'description': 'ISITME CIHAZI', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 80717.36, 'tax_percent': 0, 'tax_amount': 0.00, 'line_extension_amount': 80717.36}
            ],
            'line_extension_amount': 80717.36,
            'allowance_total': 0.00,
            'tax_total': 0.00,
            'tax_percent': 0,
            'tax_inclusive_amount': 80717.36,
            'payable_amount': 80717.36,
            'amount_in_words': 'SeksenBinYediYuzOnYediTurkLirasiOtuzAltiKurus',
            'tax_exemption_reason': '317-17/4-s Engellilerin Egitimleri, Meslekleri ve Gunluk Yasamlarina Iliskin Arac-Gerec ve Bilgisayar Programlari',
            'notes': 'E-Fatura izni kapsaminda elektronik ortamda iletilmistir. Bu fatura irsaliye yerine gecer.'
        }
    }
    invoices.append(inv6)
    
    # 7. E-IRSALIYE
    inv7 = {
        'name': '07_eirsaliye',
        'template': 'sale.html',
        'data': {
            'document_type': 'EIRSALIYE',
            'invoice_type': 'SEVK',
            'invoice_id': 'ARS2025000000001',
            'uuid': '6e8b34a7-0c0e-42ee-8ae1-1422e3f3b737',
            'issue_date': '01-12-2025',
            'issue_time': '13:03:00',
            'profile_id': 'TEMELIRSALIYE',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'shipment': {
                'plate_number': '06 AAAA 1111',
                'carrier_name': 'HAKAN EMEK',
                'carrier_tax_id': '11111111111',
                'despatch_date': '01-12-2025',
                'despatch_time': '13:03:00',
                'delivery_address': 'Yenimahalle / Ankara'
            },
            'lines': [
                {'item_code': 'N11-KHPPW-04', 'description': 'Kraft Hart Cift Akulu Sarjli Yuksek Basincli Oto Yikama Makinesi', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 1666.58, 'tax_percent': 0, 'tax_amount': 0, 'line_extension_amount': 1666.58}
            ],
            'line_extension_amount': 1666.58,
            'allowance_total': 0.00,
            'notes': 'Toplam Urun: 1.00'
        }
    }
    invoices.append(inv7)
    
    # 8. E-MUSTAHSIL MAKBUZU (EMM)
    inv8 = {
        'name': '08_emm',
        'template': 'sale.html',
        'data': {
            'document_type': 'EMM',
            'invoice_type_code': 'MUSTAHSILMAKBUZ',
            'invoice_id': 'MHS2024000000001',
            'uuid': '069dd342-7e94-4359-8dc9-1c23ad350d85',
            'issue_date': '01-12-2025',
            'issue_time': '17:14:00',
            'profile_id': 'EARSIVBELGE',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_SAHIS,
            'lines': [
                {'item_code': 'MHS001', 'description': 'Tablet Kilifi + Ekran Koruyucu', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 1.00, 'tax_percent': 10, 'tax_amount': 0.10, 'line_extension_amount': 1.00}
            ],
            'line_extension_amount': 1.00,
            'allowance_total': 0.00,
            'tax_total': 0.10,
            'stoppage_amount': 0.10,
            'tax_inclusive_amount': 1.00,
            'payable_amount': 0.90,
            'amount_in_words': 'SifirTurkLirasiDoksanKurus',
            'notes': 'Mustahsil makbuzu.'
        }
    }
    invoices.append(inv8)
    
    # 9. E-SERBEST MESLEK MAKBUZU (ESMM)
    inv9 = {
        'name': '09_esmm',
        'template': 'sale.html',
        'data': {
            'document_type': 'ESMM',
            'invoice_type_code': 'SERBESTMESLEKMAKBUZ',
            'invoice_id': 'SMM2024000000001',
            'uuid': 'f746ecaf-ac99-4e44-b4df-818454cab981',
            'issue_date': '01-12-2025',
            'issue_time': '17:28:00',
            'profile_id': 'EARSIVBELGE',
            'customization_id': 'TR1.2',
            'currency': 'EUR',
            'exchange_rate': '40.0000',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_SAHIS,
            'lines': [
                {'item_code': 'SMM001', 'description': 'Danismanlik Hizmeti', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 50.00, 'tax_percent': 20, 'tax_amount': 10.00, 'line_extension_amount': 50.00}
            ],
            'line_extension_amount': 50.00,
            'allowance_total': 0.00,
            'tax_total': 10.00,
            'tax_inclusive_amount': 60.00,
            'payable_amount': 60.00,
            'amount_in_words': 'AltmisEuro',
            'notes': '01.12.2025 tarihli doviz kuruna gore 1 EUR : 40,0000 TRY olarak hesaplanmistir.'
        }
    }
    invoices.append(inv9)
    
    # 10. TASLAK E-FATURA (WATERMARK)
    inv10 = {
        'name': '10_taslak_efatura',
        'template': 'sale.html',
        'data': {
            'is_draft': True,
            'invoice_type': 'SATIS',
            'invoice_id': 'TASLAK-2025-001',
            'uuid': '',
            'issue_date': '01-12-2025',
            'issue_time': '10:00:00',
            'profile_id': 'TICARIFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'lines': [
                {'item_code': 'PRD001', 'description': 'Test Urun 1', 'quantity': 2, 'unit_code': 'Adet', 'unit_price': 1000.00, 'tax_percent': 20, 'tax_amount': 400.00, 'line_extension_amount': 2000.00},
                {'item_code': 'PRD002', 'description': 'Test Urun 2', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 500.00, 'tax_percent': 20, 'tax_amount': 100.00, 'line_extension_amount': 500.00}
            ],
            'line_extension_amount': 2500.00,
            'allowance_total': 0.00,
            'tax_total': 500.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 3000.00,
            'payable_amount': 3000.00,
            'amount_in_words': 'UcBinTurkLirasi',
            'notes': 'Bu bir taslak faturadir. Henuz onaylanmamistir.'
        }
    }
    invoices.append(inv10)
    
    # 11. TASLAK E-ARSIV (WATERMARK)
    inv11 = {
        'name': '11_taslak_earsiv',
        'template': 'sale.html',
        'data': {
            'is_draft': True,
            'invoice_type': 'SATIS',
            'invoice_id': 'TASLAK-ARS-2025-001',
            'uuid': '',
            'issue_date': '01-12-2025',
            'issue_time': '11:00:00',
            'profile_id': 'EARSIVFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_SAHIS,
            'lines': [
                {'item_code': 'PRD001', 'description': 'E-Arsiv Test Urun', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 750.00, 'tax_percent': 20, 'tax_amount': 150.00, 'line_extension_amount': 750.00}
            ],
            'line_extension_amount': 750.00,
            'allowance_total': 0.00,
            'tax_total': 150.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 900.00,
            'payable_amount': 900.00,
            'amount_in_words': 'DokuzYuzTurkLirasi',
            'notes': 'Bu bir taslak e-arsiv faturasidir.'
        }
    }
    invoices.append(inv11)
    
    # 12. TASLAK IADE (WATERMARK)
    inv12 = {
        'name': '12_taslak_iade',
        'template': 'iade.html',
        'data': {
            'is_draft': True,
            'invoice_type': 'IADE',
            'invoice_id': 'TASLAK-IADE-2025-001',
            'uuid': '',
            'issue_date': '01-12-2025',
            'issue_time': '12:00:00',
            'profile_id': 'TEMELFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'billing_references': [
                {'invoice_id': 'EFA2025000000100', 'issue_date': '20-11-2025'}
            ],
            'lines': [
                {'item_code': 'PRD001', 'description': 'Iade Test Urun', 'quantity': 1, 'unit_code': 'Adet', 'unit_price': 1200.00, 'tax_percent': 20, 'tax_amount': 240.00, 'line_extension_amount': 1200.00}
            ],
            'line_extension_amount': 1200.00,
            'allowance_total': 0.00,
            'tax_total': 240.00,
            'tax_percent': 20,
            'tax_inclusive_amount': 1440.00,
            'payable_amount': 1440.00,
            'amount_in_words': 'BinDortYuzKirkTurkLirasi',
            'notes': 'Bu bir taslak iade faturasidir.'
        }
    }
    invoices.append(inv12)
    
    # 13. ISTISNA FATURA (702 DIIB)
    inv13 = {
        'name': '13_istisna_fatura_diib',
        'template': 'sale.html',
        'data': {
            'invoice_type': 'ISTISNA',
            'invoice_id': 'EFA2025000000050',
            'uuid': 'abcd1234-5678-90ab-cdef-1234567890ab',
            'issue_date': '01-12-2025',
            'issue_time': '14:00:00',
            'profile_id': 'TEMELFATURA',
            'customization_id': 'TR1.2',
            'supplier': SUPPLIER,
            'customer': CUSTOMER_FIRMA,
            'lines': [
                {'item_code': 'EXP001', 'description': 'Ihracat Urunu', 'quantity': 100, 'unit_code': 'Adet', 'unit_price': 50.00, 'tax_percent': 0, 'tax_amount': 0.00, 'line_extension_amount': 5000.00}
            ],
            'line_extension_amount': 5000.00,
            'allowance_total': 0.00,
            'tax_total': 0.00,
            'tax_percent': 0,
            'tax_inclusive_amount': 5000.00,
            'payable_amount': 5000.00,
            'amount_in_words': 'BesBinTurkLirasi',
            'tax_exemption_reason': '702 - DIIB ve Gecici Kabul Rejimi Kapsamindaki Satislar',
            'notes': 'Istisna kapsaminda duzenlenmistir.'
        }
    }
    invoices.append(inv13)
    
    # PDF'leri uret
    success_count = 0
    for inv in invoices:
        try:
            pdf_bytes = render_invoice_to_pdf(inv['data'], inv['template'])
            output_path = os.path.join(output_dir, f"{inv['name']}.pdf")
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            print(f"OK {inv['name']}: {len(pdf_bytes)} bytes -> {output_path}")
            success_count += 1
        except Exception as e:
            print(f"FAIL {inv['name']}: HATA - {e}")
    
    print(f"\n{'='*60}")
    print(f"Toplam: {success_count}/{len(invoices)} PDF basariyla uretildi")
    print(f"Cikti dizini: {output_dir}")
    print(f"{'='*60}")
    
    return output_dir

if __name__ == '__main__':
    output_dir = generate_all_invoices()
    
    # Tum PDF'leri ac
    import subprocess
    subprocess.run(['open', output_dir])
