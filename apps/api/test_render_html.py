import os
import sys
import datetime
import uuid

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the existing renderer!
from utils.pdf_renderer import render_invoice_to_pdf

if __name__ == '__main__':
    # 1. Prepare Data
    now = datetime.datetime.now()
    rnd_seq = str(uuid.uuid4().int)[:9]
    invoice_number = f"EFA{now.year}{rnd_seq}"
    
    invoice_data = {
        'invoice_number': invoice_number,
        'uuid': str(uuid.uuid4()),
        'issue_date': now.strftime('%Y-%m-%d'),
        'issue_time': now.strftime('%H:%M:%S'),
        'invoice_type': 'SGK', # Trigger sgk.html selection
        'invoiceTypeCode': 'SGK',
        'document_title': 'SGK FATURASI',
        
        # SGK Specifics map
        'dosya_no': '1225324',
        'mukellef_kodu': '11111111',
        'mukellef_adi': 'TEST OPTIK CENGİZ ERDEM',
        'period_start': now.strftime('%Y-%m-%d'),
        'period_end': now.strftime('%Y-%m-%d'),
        
        'supplier': {
            'name': 'X-EAR TEST SENDER',
            'tax_id': '1234567801',
            'tax_office': 'ANKARA',
            'address': 'Test sokak No:1, Cankaya, ANKARA, TÜRKİYE',
            'phone': '0555 555 55 55',
            'email': 'info@test.com'
        },
        'customer': {
             'name': 'Sosyal Güvenlik Kurumu',
             'tax_id': '7750409379',
             'tax_office': 'CANKAYA',
             'address': 'SGK Binasi, Cankaya, ANKARA, TÜRKİYE'
        },
        'lines': [
            {'name': '%10 Katılım Paylı İşlem', 'quantity': 1, 'unit': 'ADET', 'line_extension_amount': 1000.00, 'tax_rate': 10.0, 'unit_price': 1000.00, 'total_price': 1000.00, 'tax_amount': 100.00},
            {'name': '%20 Katılım Paylı İşlem', 'quantity': 1, 'unit': 'ADET', 'line_extension_amount': 2000.00, 'tax_rate': 20.0, 'unit_price': 2000.00, 'total_price': 2000.00, 'tax_amount': 400.00}
        ],
        # Totals
        'subtotal': 3000.00,
        'tax_total': 500.00,
        'grand_total': 3500.00,
        'currency': 'TRY'
    }

    print("Rendering PDF using apps/api/utils/pdf_renderer.py...")
    try:
        pdf_bytes = render_invoice_to_pdf(invoice_data)
        
        output_pdf_path = "preview_sgk_advanced.pdf"
        with open(output_pdf_path, 'wb') as f:
            f.write(pdf_bytes)
            
        print(f"✓ Advanced Preview generated: {os.path.abspath(output_pdf_path)}")
    except Exception as e:
        print(f"Error rendering PDF: {e}")
        import traceback
        traceback.print_exc()
