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
    # Fixed Invoice Date: 31.01.2026
    issue_date_str = '2026-01-31'
    issue_date_dt = datetime.datetime.strptime(issue_date_str, '%Y-%m-%d')
    
    rnd_seq = str(uuid.uuid4().int)[:9]
    invoice_number = f"EFA2026{rnd_seq}"[:16] # Ensure 16 chars
    
    invoice_data = {
        'invoice_number': invoice_number,
        'uuid': str(uuid.uuid4()),
        'issue_date': issue_date_str,
        'issue_time': '14:30:00', # Arbitrary time
        'invoice_type': 'SGK', # Trigger sgk.html selection
        'invoiceTypeCode': 'SGK',
        'document_title': 'SGK FATURASI (SAGLIK_MED)', 
        
        # SGK Specifics map
        # "evrak referans no: 1231663" mapped to DOSYA_NO as it's the primary tracking ID
        'dosya_no': '1231663', 
        'mukellef_kodu': '16810012', # Tesis kodu
        'mukellef_adi': 'Helix İşitme Cihazları Düzce', # <--- User Request: Change THIS
        'period_start': '2026-01-01',
        'period_end': '2026-01-31',
        
        'supplier': {
            'name': 'ÖZMEN TIBBİ CİHAZLAR İÇ VE DIŞ TİCARET LTD ŞTİ', # <--- User Request: Keep THIS original
            'tax_id': '7030734275',
            'tax_office': 'OSMANGAZİ VD',
            'address': 'Aktarhüssam mah Fevzi Çakmak cad no.41/1 Osmangazi Bursa',
            'phone': '', 
            'email': '' 
        },
        'customer': {
             'name': 'Sosyal Güvenlik Kurumu',
             'tax_id': '7750409379', # Standard SGK VKN
             'tax_office': 'ÇANKAYA',
             'address': 'Ziyabey Cad. No:6 Balgat/ANKARA' # Standard SGK Address
        },
        'lines': [
            {
                'name': 'İşitme Cihazı', 
                'quantity': 1, 
                'unit': 'AY', # User said "1 AY"
                'line_extension_amount': 111509.48, 
                'tax_rate': 0.0, 
                'unit_price': 111509.48, 
                'total_price': 111509.48, 
                'tax_amount': 0.00,
                'tax_exemption_code': '317',
                'tax_exemption_reason': '317 - Engellilerin kullanımına mahsus araç gereç'
            }
        ],
        # Totals
        'subtotal': 111509.48,
        'tax_total': 0.00,
        'grand_total': 111509.48,
        'currency': 'TRY',
        'kop_amount': 0.00 # No info on Participation Share, assuming 0/None
    }

    print("Rendering specific SGK Invoice PDF...")
    try:
        pdf_bytes = render_invoice_to_pdf(invoice_data)
        
        output_pdf_path = "preview_ozmen_sgk.pdf"
        with open(output_pdf_path, 'wb') as f:
            f.write(pdf_bytes)
            
        print(f"✓ Preview generated: {os.path.abspath(output_pdf_path)}")
    except Exception as e:
        print(f"Error rendering PDF: {e}")
        import traceback
        traceback.print_exc()
