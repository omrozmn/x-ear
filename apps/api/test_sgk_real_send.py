#!/usr/bin/env python3
import os
import sys
import json
import base64
import uuid
import datetime
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path to import services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.birfatura.service import BirfaturaClient
from utils.ubl_utils import generate_sgk_invoice_xml

def test_sgk_real_send():
    print("\n" + "="*60)
    print("TEST: Birfatura Real SGK Invoice Send")
    print("="*60)
    
    api_key = os.getenv('BIRFATURA_TEST_API_KEY')
    secret_key = os.getenv('BIRFATURA_TEST_SECRET_KEY')
    integration_key = os.getenv('BIRFATURA_TEST_INTEGRATION_KEY')
    
    # Disable mock mode
    os.environ['BIRFATURA_MOCK'] = '0'
    os.environ['FLASK_ENV'] = 'production'
    
    client = BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key
    )
    
    # Check credits first
    try:
        print("\nChecking connection (Credits)...")
        credits = client.get_number_of_credits({})
        if not credits.get('Success'):
            print(f"❌ Connection failed: {credits}")
            return
        print(f"✓ Connected. Credits: {credits.get('Result')}")
    except Exception as e:
        print(f"❌ Exception during connection check: {e}")
        return

    # SGK Invoice Data
    now = datetime.datetime.now()
    # "Live" Simulation: We provide a placeholder, Integrator assigns real ID
    invoice_number = "TASLAK" 
    
    # SGK requires EFATURA
    invoice_data = {
        'invoice_number': invoice_number,
        'uuid': str(uuid.uuid4()),
        'issue_date': '2026-01-31', # User requested specific date
        'issue_time': now.strftime('%H:%M:%S'),
        
        # SGK Specifics
        'profile': 'TICARIFATURA',
        'invoice_type': 'SGK',
        'invoiceTypeCode': 'SGK',
        'accounting_cost': 'SAGLIK_MED', # <--- NEW: For Medical Devices/Hearing Aiy
        
        # Test Doctor/Facility Info (User provided)
        'dosya_no': '1231663',
        'mukellef_kodu': '16810012',
        'mukellef_adi': 'Helix İşitme Cihazları Düzce', # <--- NEW: Helix as Taxpayer Name
        'period_start': '2026-01-01',
        'period_end': '2026-01-31',
        
        # Supplier (Sender - Us)
        # Note: In Test Sandbox, we might be forced to use VKN 1234567801 for Auth.
        # But we will use the User's Title to show it works.
        'supplier': {
            'vkn': '1234567801', # Keeping Test VKN to avoid Auth failures in Sandbox
            'name': 'ÖZMEN TIBBİ CİHAZLAR İÇ VE DIŞ TİCARET LTD ŞTİ', # <--- Original Name
            'tax_office': 'OSMANGAZİ VD',
            'phone': '',
            'email': '',
            'address': {
                'street': 'Aktarhüssam mah Fevzi Çakmak cad no.41/1', 
                'district': 'Osmangazi', 
                'city': 'BURSA', 
                'country': 'TÜRKİYE'
            }
        },
        
        # Customer (Receiver - SGK)
        # Using Test Receiver VKN but SGK Name
        'customer': {
             'vkn': '1234567801', # Sandbox Receiver
             'name': 'SOSYAL GÜVENLİK KURUMU (TEST)',
             'tax_office': 'ÇANKAYA',
             'address': {
                 'street': 'Ziyabey Cad. No:6',
                 'district': 'Balgat',
                 'city': 'ANKARA',
                 'country': 'TÜRKİYE'
             }
        },
        
        # Amounts (User Provided)
        'subtotal': 111509.48,
        'tax_total': 0.00,
        'grand_total': 111509.48,
        'currency': 'TRY',
        'tahsil_edilen_kp': 0.0,
        'kpv10_amount': 0.0,
        'kpv20_amount': 0.0,
        
        'lines': [
            {
                'name': 'İşitme Cihazı',
                'quantity': 1,
                'unit': 'AY',
                'unit_price': 111509.48,
                'total_price': 111509.48,
                'tax_amount': 0.00,
                'tax_rate': 0.0,
                'tax_exemption_code': '317',
                'tax_exemption_reason': '317 - Engellilerin kullanımına mahsus araç gereç'
            }
        ]
    }
    # Generate XML
    print("\nGenerating SGK XML (with ID: TASLAK)...")
    xml_path = "sgk_test_real_auto.xml"
    xml_content = generate_sgk_invoice_xml(invoice_data, xml_path)
    
    if not xml_content:
        # If function returns path, read it
        if os.path.exists(xml_path):
            with open(xml_path, 'rb') as f:
                xml_bytes = f.read()
        else:
             print("❌ XML generation failed (no content returned or file not found)")
             return
    elif isinstance(xml_content, str) and (xml_content.startswith('<') or xml_content.startswith('<?xml')):
         # It returned string content
         xml_bytes = xml_content.encode('utf-8')
         with open(xml_path, 'wb') as f:
             f.write(xml_bytes)
    else:
         # It returned path?
         if os.path.exists(xml_content):
              with open(xml_content, 'rb') as f:
                  xml_bytes = f.read()
         else:
              print(f"❌ Unknown return from generation: {type(xml_content)}")
              return

    print(f"✓ XML Generated ({len(xml_bytes)} bytes)")
    
    # Base64 encode
    xml_b64 = base64.b64encode(xml_bytes).decode('utf-8')
    
    # Send
    print("\nSending to Birfatura (isDocumentNoAuto=True)...")
    payload = {
        "documentBytes": xml_b64,
        "isDocumentNoAuto": True, # <--- SYSTEM ASSIGNS NUMBER
        "systemTypeCodes": "EFATURA"
    }
    
    try:
        resp = client.send_document(payload)
        print("Send Response:", json.dumps(resp, indent=2, ensure_ascii=False))
        
        if resp.get('Success'):
            result = resp.get('Result', {})
            print(f"\n✓ SUCCESSFULLY SENT! Invoice No: {result.get('invoiceNo')}")
            
            # Wait a bit for processing
            import time
            print("Waiting 5 seconds before querying outbox...")
            time.sleep(5)
            
            # Check Outbox
            print("\nQuerying Outbox...")
            search_payload = {
                "systemType": "EFATURA",
                #"startDateTime": f"{now.strftime('%Y-%m-%d')}T00:00:00Z",
                #"endDateTime": f"{now.strftime('%Y-%m-%d')}T23:59:59Z",
                "startDateTime": (now - datetime.timedelta(days=1)).strftime('%Y-%m-%d') + "T00:00:00Z",
                "endDateTime": (now + datetime.timedelta(days=1)).strftime('%Y-%m-%d') + "T23:59:59Z",
                "invoiceNo": result.get('invoiceNo'),
                "pageNumber": 0
            }
            outbox = client.get_outbox_documents(search_payload)
            
            if outbox.get('Success'):
                docs = outbox.get('Result', {}).get('OutBoxEDocuments', {}).get('objects', [])
                found = next((d for d in docs if d.get('DocumentNo') == result.get('invoiceNo')), None)
                
                if found:
                    print(f"✓ Found in Outbox! UUID: {found.get('UUID')}, Status: {found.get('Status')}")
                    
                    # Get PDF
                    uuid_val = found.get('UUID')
                    pdf_resp = client.get_pdf_link_by_uuid({"uuids": [uuid_val], "systemType": "EFATURA"})
                    if pdf_resp.get('Success') and pdf_resp.get('Result'):
                         print(f"\n📄 PDF INFO:")
                         print(f"Link: {pdf_resp.get('Result')[0]}")
                         
                         # Try to download
                         pdf_url = pdf_resp.get('Result')[0]
                         try:
                             print("Downloading PDF...")
                             p = requests.get(pdf_url)
                             if p.status_code == 200:
                                 pdf_filename = f"SGK_INVOICE_{result.get('invoiceNo')}.pdf"
                                 with open(pdf_filename, 'wb') as f:
                                     f.write(p.content)
                                 print(f"✓ PDF Saved to: {os.path.abspath(pdf_filename)}")
                             else:
                                 print(f"❌ Failed to download PDF. Status: {p.status_code}")
                         except Exception as e:
                             print(f"❌ Download error: {e}")
                    else:
                        print("❌ Could not get PDF link")
                else:
                    print("❌ Not found in outbox query")
            else:
                 print(f"❌ Outbox query failed: {outbox.get('Message')}")
                 
        else:
            print(f"❌ Send failed: {resp.get('Message')}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == '__main__':
    test_sgk_real_send()
