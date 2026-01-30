#!/usr/bin/env python3
import os
import sys
import json
import base64
import uuid
import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path to import services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.birfatura.service import BirfaturaClient
from utils.ubl_utils import generate_ubl_xml

def test_real_connection():
    print("\n" + "="*60)
    print("TEST: Birfatura Real API Connection (Credits)")
    print("="*60)
    
    api_key = os.getenv('BIRFATURA_TEST_API_KEY')
    secret_key = os.getenv('BIRFATURA_TEST_SECRET_KEY')
    integration_key = os.getenv('BIRFATURA_TEST_INTEGRATION_KEY')
    
    os.environ['BIRFATURA_MOCK'] = '0'
    os.environ['FLASK_ENV'] = 'production'
    
    client = BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key
    )
    
    try:
        print("\nChecking credits...")
        resp = client.get_number_of_credits({})
        print("Success:", resp.get('Success'))
        if resp.get('Success'):
            print("Credits Data:", resp.get('Result'))
        else:
            print("Failed Response:", resp)
            return False
        return True
    except Exception as e:
        print(f"\n❌ Connection test failed error: {e}")
        return False

def test_real_send_document():
    print("\n" + "="*60)
    print("TEST: Birfatura Real Send Document (VKN 1234567801)")
    print("="*60)
    
    api_key = os.getenv('BIRFATURA_TEST_API_KEY')
    secret_key = os.getenv('BIRFATURA_TEST_SECRET_KEY')
    integration_key = os.getenv('BIRFATURA_TEST_INTEGRATION_KEY')
    
    client = BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key
    )
    
    now = datetime.datetime.now()
    
    invoice_data = {
        'id': 123,
        'invoiceNumber': f"XER{datetime.datetime.now().year}000000009",
        'issueDate': now.strftime('%Y-%m-%d'),
        'issueTime': now.strftime('%H:%M:%S'),
        'uuid': str(uuid.uuid4()),
        'profile': 'TEMELFATURA',
        'invoiceType': 'standard',
        'supplier': {
            'name': 'X-EAR TEST SENDER',
            'tax_id': '1234567801',
            'tax_office': 'ANKARA',
            'address': {'street': 'Test sokak', 'district': 'Cankaya', 'city': 'ANKARA', 'postalZone': '06100', 'country': 'TÜRKİYE'}
        },
        'customer': {
            'name': 'GIB TEST RECEIVER',
            'tax_id': '1234567801',
            'tax_office': 'ANKARA',
            'address': {'street': 'Alici sokak', 'district': 'Cankaya', 'city': 'ANKARA', 'postalZone': '06100', 'country': 'TÜRKİYE'}
        },
        'lines': [
            {
                'description': 'Test Service',
                'quantity': 1,
                'unit': 'ADET',
                'line_extension_amount': 100.0,
                'tax_rate': 20.0,
                'price': 100.0
            }
        ]
    }
    
    xml_path = "test_invoice.xml"
    generate_ubl_xml(invoice_data, xml_path)
    
    with open(xml_path, "rb") as f:
        xml_bytes = f.read()
    xml_b64 = base64.b64encode(xml_bytes).decode('utf-8')

    # FINAL TEST using the refactored client and Base64 XML
    print("\n[Final Test] Sending document as BASE64 XML (detecting auto-zip)...")
    payload = {
        "documentBytes": xml_b64,
        "isDocumentNoAuto": False,
        "systemTypeCodes": "EFATURA"
    }
    try:
        resp = client.send_document(payload)
        print("Success:", resp.get('Success'))
        print("Message:", resp.get('Message'))
        if resp.get('Success'):
            result = resp.get('Result', {})
            invoice_no = result.get('invoiceNo')
            print("Result:", result)
            print("\n✓ SendDocument test passed!")
            
            # --- EXTRA VERIFICATION ---
            import time
            print("\n" + "-"*40)
            print("VERIFYING: Outbox Query & PDF Download")
            print("-"*40)
            
            # 1. Query Outbox (Search for the invoice we just sent)
            print(f"Checking outbox for invoice: {invoice_no}...")
            # Required mandatory fields for GetOutBoxDocuments:
            # systemType: EFATURA/EARSIV...
            # startDateTime: ISO string
            # endDateTime: ISO string
            # documentType: INVOICE/DESPATCHADVICE...
            # pageNumber: 0...
            yesterday = now - datetime.timedelta(days=1)
            tomorrow = now + datetime.timedelta(days=1)
            search_payload = {
                "systemType": "EFATURA",
                "startDateTime": f"{yesterday.strftime('%Y-%m-%d')}T00:00:00Z",
                "endDateTime": f"{tomorrow.strftime('%Y-%m-%d')}T23:59:59Z",
                "documentType": "INVOICE",
                "pageNumber": 0,
                "invoiceNo": invoice_no
            }
            outbox_resp = client.get_outbox_documents(search_payload)
            print(f"DEBUG Outbox Response (Keys): {list(outbox_resp.keys()) if outbox_resp else 'None'}")
            if outbox_resp and outbox_resp.get('Success'):
                # The structure is Result -> OutBoxEDocuments -> objects
                result_data = outbox_resp.get('Result', {})
                outbox_data = result_data.get('OutBoxEDocuments', {})
                docs = outbox_data.get('objects', [])
                
                found_doc = next((d for d in docs if d.get('DocumentNo') == invoice_no), None)
                
                if found_doc:
                    print(f"✓ Found in outbox! Status: {found_doc.get('Status')} | Desc: {found_doc.get('statusDescription')}")
                    doc_uuid = found_doc.get('UUID') or found_doc.get('Gid')
                    
                    # 2. Download PDF (actually Get PDF Link for modern API)
                    print(f"Getting PDF Link for UUID: {doc_uuid}...")
                    pdf_payload = {
                        "uuids": [doc_uuid],
                        "systemType": "EFATURA"
                    }
                    pdf_resp = client.get_pdf_link_by_uuid(pdf_payload)
                    if pdf_resp.get('Success'):
                        print("✓ PDF Link Retrieval Success!")
                        links = pdf_resp.get('Result', [])
                        if links:
                            print(f"  PDF Link: {links[0]}")
                    else:
                        print(f"  PDF Retrieval Failed: {pdf_resp.get('Message')}")
                        print(f"❌ PDF Retrieval failed: {pdf_resp.get('Message')}")
                else:
                    print("❌ Invoice not found in outbox query.")
            else:
                print(f"❌ Outbox query failed: {outbox_resp.get('Message')}")
            # --------------------------
            
            return True
        else:
            print("Failed Response:", resp)
    except Exception as e:
         print(f"Final test failed: {e}")
            
    return False

def test_real_send_basic_invoice():
    print("\n" + "="*60)
    print("TEST: Birfatura Real Send Basic Invoice")
    print("="*60)
    
    api_key = os.getenv('BIRFATURA_TEST_API_KEY')
    secret_key = os.getenv('BIRFATURA_TEST_SECRET_KEY')
    integration_key = os.getenv('BIRFATURA_TEST_INTEGRATION_KEY')
    
    client = BirfaturaClient(
        api_key=api_key,
        secret_key=secret_key,
        integration_key=integration_key
    )
    
    ettn = str(uuid.uuid4()).upper()
    now = datetime.datetime.now()
    
    payload = {
        "invoice": {
            "invoiceDate": now.strftime('%Y-%m-%d'),
            "eInvoiceId": f"BAS{int(now.timestamp())}",
            "ettn": ettn,
            "totalPaidTaxExcluding": 100.0,
            "totalPaidTaxIncluding": 120.0,
            "productsTotalTaxExcluding": 100.0,
            "productsTotalTaxIncluding": 120.0,
            "billingName": "GIB TEST RECEIVER",
            "billingAddress": "Test Adresi 123",
            "billingCity": "ANKARA",
            "taxNo": "1234567801",
            "orderDetails": [
                {
                    "ProductCode": "PRD001",
                    "ProductName": "Test Service",
                    "ProductQuantity": 1,
                    "ProductUnitPriceTaxExcluding": 100.0,
                    "ProductUnitPriceTaxIncluding": 120.0,
                    "VatRate": 20
                }
            ]
        }
    }
    
    print("\nSending basic invoice model (PascalCase items)...")
    try:
        resp = client.post('/api/outEBelgeV2/SendBasicInvoiceFromModel', payload)
        print("Success:", resp.get('Success'))
        print("Message:", resp.get('Message'))
        
        if resp.get('Success'):
            print("Result:", resp.get('Result'))
            print("\n✓ Basic invoice test passed!")
            return True
        else:
            print("Failed Response:", resp)
            return False
    except Exception as e:
        print(f"\n❌ Basic invoice test failed error: {e}")
        return False

if __name__ == '__main__':
    if test_real_connection():
        test_real_send_basic_invoice()
        test_real_send_document()
    else:
        print("\nSkipping document test due to connection failure.")
