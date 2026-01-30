import os
import json
import datetime
import requests
import base64
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class BirfaturaClient:
    """Minimal BirFatura HTTP client used by backend adapter.

    Reads credentials from env and provides small helpers for provider calls.
    This is a lightweight scaffold — add logging, metrics and more robust
    error normalization as needed.
    """

    def __init__(self, base_url: str = None, api_key: str = None, secret_key: str = None, integration_key: str = None):
        # Support a local mock mode to avoid calling the real provider during
        # development or CI. Enable by setting BIRFATURA_MOCK=1 in the env.
        # Also enable mock automatically when FLASK_ENV != 'production' so
        # local dev runs don't hit the external provider by accident.
        self._use_mock = os.getenv('BIRFATURA_MOCK', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production'
        self.base_url = base_url or os.getenv('BIRFATURA_BASE_URL', 'https://uygulama.edonustur.com')
        
        self.headers = {
            'X-Api-Key': api_key or os.getenv('BIRFATURA_X_API_KEY', ''),
            'X-Secret-Key': secret_key or os.getenv('BIRFATURA_X_SECRET_KEY', ''),
            'X-Integration-Key': integration_key or os.getenv('BIRFATURA_X_INTEGRATION_KEY', ''),
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

        try:
            url = self._url(path)
            resp = self.session.post(url, headers=self.headers, json=json_data, timeout=timeout)
            resp.raise_for_status()
            try:
                return resp.json()
            except ValueError:
                return {'text': resp.text}
        except Exception as e:
            if hasattr(e, 'response') and e.response is not None:
                 print(f"Exception Response: {e.response.text}")
            raise e

    def send_document(self, payload: dict) -> dict:
        """Send document to GİB via Birfatura.
        
        Args:
            payload: dict containing:
                - documentBytes: Base64 string OR raw XML string/bytes
                - isDocumentNoAuto: bool (default True)
                - systemTypeCodes: str (default "EFATURA")
                - receiverTag: optional str
                - fileName: optional str (used if zipping)
        """
        if self._use_mock:
            # Mock implementation
            import gzip
            import uuid
            
            mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\nMOCK PDF FOR TESTING"
            mock_gzipped = gzip.compress(mock_pdf_content)
            mock_zipped = base64.b64encode(mock_gzipped).decode('utf-8')
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
        
        raw_data = payload.get("documentBytes") or payload.get("documentBase64") or payload.get("buffer")
        
        # Helper to determine if content is XML (raw or decoded from b64)
        def is_xml(content):
            if isinstance(content, bytes):
                try:
                    return content.strip().startswith(b'<?xml') or content.strip().startswith(b'<Invoice')
                except: return False
            if isinstance(content, str):
                try:
                    stripped = content.strip()
                    return stripped.startswith('<?xml') or stripped.startswith('<Invoice')
                except: return False
            return False

        should_zip = False
        xml_bytes = None
        
        if is_xml(raw_data):
            should_zip = True
            xml_bytes = raw_data if isinstance(raw_data, bytes) else raw_data.encode('utf-8')
        elif isinstance(raw_data, str):
            try:
                decoded = base64.b64decode(raw_data)
                if is_xml(decoded):
                    should_zip = True
                    xml_bytes = decoded
            except:
                pass
                
        if should_zip:
            import io
            import zipfile
            
            file_name = payload.get("fileName") or f"document_{int(datetime.datetime.utcnow().timestamp())}.xml"
            if not file_name.endswith('.xml'):
                file_name += '.xml'
                
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
                zip_file.writestr(file_name, xml_bytes)
            
            final_bytes_b64 = base64.b64encode(zip_buffer.getvalue()).decode('utf-8')
        else:
            # Assume it's already a base64 string (ideally a ZIP)
            final_bytes_b64 = raw_data

        final_payload = {
            "documentBytes": final_bytes_b64,
            "isDocumentNoAuto": payload.get("isDocumentNoAuto", True),
            "systemTypeCodes": payload.get("systemTypeCodes") or payload.get("systemType", "EFATURA"),
            "receiverTag": payload.get("receiverTag")
        }
        
        return self.post('/api/outEBelgeV2/SendDocument', final_payload)

    def send_basic_invoice(self, payload: dict) -> dict:
        if self._use_mock:
            return {
                'Success': True,
                'Message': 'Mocked send_basic_invoice',
                'Received': payload
            }
        return self.post('/api/outEBelgeV2/SendBasicInvoiceFromModel', payload)
    
    def get_number_of_credits(self, payload: dict) -> dict:
        """Get remaining credits"""
        # Payload can be empty or have parameters like 'kn' if needed, generally empty works for self
        return self.post('/api/outEBelgeV2/GetNumberOfCredits', payload)

    def get_inbox_documents(self, payload: dict) -> dict:
        """Get incoming documents (invoices from suppliers)"""
        return self.post('/api/outEBelgeV2/GetInBoxDocuments', payload)
    
    def get_outbox_documents(self, payload: dict) -> dict:
        """Get outgoing documents (return/correction invoices to suppliers)"""
        return self.post('/api/outEBelgeV2/GetOutBoxDocuments', payload)
    
    def get_inbox_documents_with_detail(self, payload: dict) -> dict:
        """Get incoming documents with detailed XML content"""
        return self.post('/api/outEBelgeV2/GetInBoxDocumentsWithDetail', payload)

    def preview_document_pdf(self, payload: dict) -> dict:
        """Get PDF preview of a document"""
        return self.post('/api/outEBelgeV2/PreviewDocumentReturnPDF', payload)

    def get_pdf_link_by_uuid(self, payload: dict) -> dict:
        """Get PDF download link by UUID.
        
        Args:
            payload: dict containing:
                - uuids: (required) List[str]
                - systemType: (required) "EFATURA", etc.
        """
        return self.post('/api/outEBelgeV2/GetPDFLinkByUUID', payload)

    def document_download_by_uuid(self, payload: dict) -> dict:
        """Download document by UUID in specified format (XML, HTML, PDF, ZARF)
        
        Args:
            payload: dict containing:
                - documentUUID: (required) str
                - inOutCode: (required) "OUT" or "IN"
                - systemTypeCodes: (required) "EFATURA", "EARSIV", etc.
                - fileExtension: (required) "XML", "PDF", "HTML", "ZARF"
        
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
            import gzip
            import uuid
            
            file_ext = payload.get('fileExtension', 'XML')
            uuid_val = payload.get('documentUUID', 'UNKNOWN')
            
            if file_ext == 'XML':
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
                mock_content = f'Mock {file_ext} content for UUID: {uuid_val}'.encode('utf-8')
            
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
        return self.post('/api/outEBelgeV2/DocumentDownloadByUUID', payload)
    
    def create_invoice(self, payload: dict) -> dict:
        """Create invoice (draft mode, not sent to GİB yet)"""
        if self._use_mock:
            import uuid
            return {
                'Success': True,
                'Message': 'Mocked create_invoice',
                'Result': {
                    'id': str(uuid.uuid4()),
                    'invoiceId': 'XER2024' + str(uuid.uuid4().int)[:6]
                },
                '_mock': True
            }
        return self.post('/api/EFatura/Create', payload)
    
    def retry_invoice(self, invoice_id: str) -> dict:
        """Retry sending a failed invoice to GİB"""
        if self._use_mock:
            return {
                'Success': True,
                'Message': f'Mocked retry_invoice for {invoice_id}',
                '_mock': True
            }
        return self.post(f'/api/EFatura/Retry/{invoice_id}', {})
    
    def cancel_invoice(self, invoice_id: str, reason: str = None) -> dict:
        """Cancel an invoice (send cancellation to GİB)"""
        if self._use_mock:
            return {
                'Success': True,
                'Message': f'Mocked cancel_invoice for {invoice_id}',
                'Reason': reason,
                '_mock': True
            }
        payload = {}
        if reason:
            payload['reason'] = reason
        return self.post(f'/api/EFatura/Cancel/{invoice_id}', payload)
