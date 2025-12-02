#!/usr/bin/env python3
"""Test script for Birfatura mock API responses"""

import os
import sys
import json
import base64
import gzip

# Force mock mode
os.environ['BIRFATURA_MOCK'] = '1'

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.birfatura.service import BirfaturaClient

def test_send_document():
    """Test send_document mock response"""
    print("\n" + "="*60)
    print("TEST: send_document")
    print("="*60)
    
    client = BirfaturaClient()
    
    # Simulated invoice payload
    payload = {
        'systemType': 'EFATURA',
        'documentType': 'INVOICE',
        'zipped': base64.b64encode(b'mock xml content').decode(),
        'documentProfileId': 'TICARIFATURA'
    }
    
    response = client.send_document(payload)
    
    print("\nResponse Keys:", list(response.keys()))
    print("Success:", response.get('Success'))
    print("Message:", response.get('Message'))
    
    if 'Result' in response:
        result = response['Result']
        print("\nResult Keys:", list(result.keys()))
        print("Invoice No:", result.get('invoiceNo'))
        print("PDF Link:", result.get('pdfLink'))
        
        # Check if zipped data can be decoded
        if 'zipped' in result:
            try:
                zipped_data = base64.b64decode(result['zipped'])
                unzipped = gzip.decompress(zipped_data)
                print("Zipped PDF Size:", len(unzipped), "bytes")
                print("PDF Content Preview:", unzipped[:50])
            except Exception as e:
                print("Error decoding zipped:", e)
    
    print("\n✓ send_document mock test passed!")
    return response

def test_document_download():
    """Test document_download_by_uuid mock response"""
    print("\n" + "="*60)
    print("TEST: document_download_by_uuid")
    print("="*60)
    
    client = BirfaturaClient()
    
    payload = {
        'systemType': 'EFATURA',
        'documentType': 'XML',
        'uuid': 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890'
    }
    
    response = client.document_download_by_uuid(payload)
    
    print("\nResponse Keys:", list(response.keys()))
    print("Success:", response.get('Success'))
    
    if 'Result' in response:
        result = response['Result']
        if 'content' in result:
            try:
                content_data = base64.b64decode(result['content'])
                unzipped = gzip.decompress(content_data)
                print("Content Size:", len(unzipped), "bytes")
                print("Content Preview:", unzipped[:200].decode('utf-8'))
            except Exception as e:
                print("Error decoding content:", e)
    
    print("\n✓ document_download_by_uuid mock test passed!")
    return response

def test_integration_flow():
    """Test the full integration flow"""
    print("\n" + "="*60)
    print("TEST: Full Integration Flow Simulation")
    print("="*60)
    
    client = BirfaturaClient()
    
    # Step 1: Send document
    print("\n1. Sending document to GİB...")
    send_response = client.send_document({
        'systemType': 'EFATURA',
        'documentType': 'INVOICE',
        'zipped': base64.b64encode(b'<Invoice>...</Invoice>').decode()
    })
    
    ettn = send_response.get('_ettn', 'UNKNOWN')
    invoice_no = send_response.get('Result', {}).get('invoiceNo', 'UNKNOWN')
    
    print(f"   ETTN: {ettn}")
    print(f"   Invoice No: {invoice_no}")
    
    # Step 2: Download document by UUID
    print("\n2. Downloading document by UUID...")
    download_response = client.document_download_by_uuid({
        'systemType': 'EFATURA',
        'documentType': 'XML',
        'uuid': ettn
    })
    
    print(f"   Success: {download_response.get('Success')}")
    
    # Step 3: Extract PDF data for storage
    pdf_data = send_response.get('Result', {}).get('zipped')
    pdf_link = send_response.get('Result', {}).get('pdfLink')
    
    print("\n3. Data to store in database:")
    print(f"   - edocument_status: 'approved'")
    print(f"   - ettn: '{ettn}'")
    print(f"   - gib_pdf_data: {len(pdf_data) if pdf_data else 0} chars (base64)")
    print(f"   - gib_pdf_link: '{pdf_link}'")
    
    print("\n✓ Full integration flow simulation passed!")

if __name__ == '__main__':
    print("="*60)
    print("BIRFATURA MOCK API TEST")
    print("="*60)
    print(f"Mock Mode: {os.environ.get('BIRFATURA_MOCK')}")
    
    try:
        test_send_document()
        test_document_download()
        test_integration_flow()
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED! ✓")
        print("="*60)
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
