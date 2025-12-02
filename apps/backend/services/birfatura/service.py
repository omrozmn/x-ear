import os
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class BirfaturaClient:
    """Minimal BirFatura HTTP client used by backend adapter.

    Reads credentials from env and provides small helpers for provider calls.
    This is a lightweight scaffold — add logging, metrics and more robust
    error normalization as needed.
    """

    def __init__(self, base_url: str = None):
        # Support a local mock mode to avoid calling the real provider during
        # development or CI. Enable by setting BIRFATURA_MOCK=1 in the env.
        # Also enable mock automatically when FLASK_ENV != 'production' so
        # local dev runs don't hit the external provider by accident.
        self._use_mock = os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production'
        self.base_url = base_url or os.getenv('BIRFATURA_BASE_URL', 'https://uygulama.edonustur.com')
        self.headers = {
            'X-Api-Key': os.getenv('BIRFATURA_X_API_KEY', ''),
            'X-Secret-Key': os.getenv('BIRFATURA_X_SECRET_KEY', ''),
            'X-Integration-Key': os.getenv('BIRFATURA_X_INTEGRATION_KEY', ''),
            'Content-Type': 'application/json'
        }

        s = requests.Session()
        retries = Retry(total=3, backoff_factor=0.3, status_forcelist=(500, 502, 503, 504))
        s.mount('https://', HTTPAdapter(max_retries=retries))
        s.mount('http://', HTTPAdapter(max_retries=retries))
        self.session = s

    def _url(self, path: str) -> str:
        return self.base_url.rstrip('/') + path

    def post(self, path: str, json_data: dict, timeout: int = 15) -> dict:
        # When running in mock mode, return a simulated successful response
        if self._use_mock:
            return {
                'Success': True,
                'Message': 'Mocked provider response',
                'RequestPath': path,
                'Payload': json_data
            }

        url = self._url(path)
        resp = self.session.post(url, headers=self.headers, json=json_data, timeout=timeout)
        resp.raise_for_status()
        try:
            return resp.json()
        except ValueError:
            return {'text': resp.text}

    def send_document(self, payload: dict) -> dict:
        """Send document to GİB via Birfatura
        
        Real API Response Structure:
        {
            "Success": true,
            "Message": "İşlem başarılı",
            "Result": {
                "invoiceNo": "ABC2024000001234",
                "zipped": "base64_gzipped_pdf_data...",
                "htmlString": "<html>...</html>",
                "pdfLink": "https://uygulama.edonustur.com/pdf/..."
            }
        }
        """
        if self._use_mock:
            import base64
            import gzip
            import uuid
            
            # Generate a realistic mock PDF content
            mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nMOCK PDF FOR TESTING"
            mock_gzipped = gzip.compress(mock_pdf_content)
            mock_zipped = base64.b64encode(mock_gzipped).decode('utf-8')
            
            # Generate a mock ETTN (UUID format)
            mock_ettn = str(uuid.uuid4()).upper()
            
            return {
                'Success': True,
                'Message': 'Mocked send_document - Fatura GİB\'e başarıyla gönderildi',
                'Result': {
                    'invoiceNo': 'XER2024' + str(uuid.uuid4().int)[:6],
                    'zipped': mock_zipped,
                    'htmlString': '<html><body><h1>Mock GİB Invoice</h1><p>ETTN: ' + mock_ettn + '</p></body></html>',
                    'pdfLink': f'https://uygulama.edonustur.com/pdf/{mock_ettn}.pdf'
                },
                '_mock': True,
                '_ettn': mock_ettn
            }
        return self.post('/api/outEBelgeV2/SendDocument', payload)

    def send_basic_invoice(self, payload: dict) -> dict:
        if self._use_mock:
            return {
                'Success': True,
                'Message': 'Mocked send_basic_invoice',
                'Received': payload
            }
        return self.post('/api/outEBelgeV2/SendBasicInvoiceFromModel', payload)
    
    def get_inbox_documents(self, payload: dict) -> dict:
        """Get incoming documents (invoices from suppliers)"""
        return self.post('/api/OutEBelgeV2/GetInBoxDocuments', payload)
    
    def get_outbox_documents(self, payload: dict) -> dict:
        """Get outgoing documents (return/correction invoices to suppliers)"""
        return self.post('/api/OutEBelgeV2/GetOutBoxDocuments', payload)
    
    def get_inbox_documents_with_detail(self, payload: dict) -> dict:
        """Get incoming documents with detailed XML content"""
        return self.post('/api/OutEBelgeV2/GetInBoxDocumentsWithDetail', payload)

    def preview_document_pdf(self, payload: dict) -> dict:
        """Get PDF preview of a document"""
        return self.post('/api/OutEBelgeV2/PreviewDocumentReturnPDF', payload)

    def document_download_by_uuid(self, payload: dict) -> dict:
        """Download document by UUID in specified format (XML, HTML, ZARF)
        
        Real API Response Structure:
        {
            "Success": true,
            "Message": "İşlem başarılı",
            "Result": {
                "content": "base64_gzipped_content..."
            }
        }
        """
        if self._use_mock:
            import base64
            import gzip
            
            doc_type = payload.get('documentType', 'XML')
            uuid_val = payload.get('uuid', 'UNKNOWN')
            
            if doc_type == 'XML':
                mock_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
    <UBLVersionID>2.1</UBLVersionID>
    <CustomizationID>TR1.2</CustomizationID>
    <ProfileID>TICARIFATURA</ProfileID>
    <ID>XER2024000001</ID>
    <UUID>{uuid_val}</UUID>
    <IssueDate>2024-12-01</IssueDate>
    <!-- Mock XML content for testing -->
</Invoice>'''.encode('utf-8')
            else:
                mock_content = f'Mock {doc_type} content for UUID: {uuid_val}'.encode('utf-8')
            
            mock_gzipped = gzip.compress(mock_content)
            mock_base64 = base64.b64encode(mock_gzipped).decode('utf-8')
            
            return {
                'Success': True,
                'Message': 'Mocked document_download_by_uuid',
                'Result': {
                    'content': mock_base64
                },
                '_mock': True
            }
        return self.post('/api/OutEBelgeV2/DocumentDownloadByUUID', payload)
