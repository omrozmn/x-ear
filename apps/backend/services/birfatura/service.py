import os
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
        url = self._url(path)
        resp = self.session.post(url, headers=self.headers, json=json_data, timeout=timeout)
        resp.raise_for_status()
        try:
            return resp.json()
        except ValueError:
            return {'text': resp.text}

    def send_document(self, payload: dict) -> dict:
        return self.post('/api/outEBelgeV2/SendDocument', payload)

    def send_basic_invoice(self, payload: dict) -> dict:
        return self.post('/api/outEBelgeV2/SendBasicInvoiceFromModel', payload)
