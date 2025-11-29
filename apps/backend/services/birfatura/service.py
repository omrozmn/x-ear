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
        # Support both raw XML wrappers and provider-shaped payloads
        if self._use_mock:
            # If caller provided raw xml/base64, include it in the mock response
            return {
                'Success': True,
                'Message': 'Mocked send_document',
                'Received': payload
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
