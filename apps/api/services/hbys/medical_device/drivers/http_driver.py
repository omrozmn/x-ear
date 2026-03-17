"""
HTTP Driver
REST API communication driver for modern medical devices that expose HTTP endpoints.
"""
from typing import Optional, Dict, Any

from .base_driver import BaseDeviceDriver
from ..config import HTTP_REQUEST_TIMEOUT


class HTTPDriver(BaseDeviceDriver):
    """
    Driver for devices that communicate via REST/HTTP APIs.
    Common in newer IoT-enabled medical devices and FHIR-based integrations.
    """

    def __init__(self, device_id: str, host: str, port: int = 80, **kwargs):
        super().__init__(device_id=device_id, host=host, port=port, **kwargs)
        self.base_url = kwargs.get("base_url", f"http://{host}:{port}")
        self.timeout = kwargs.get("timeout", HTTP_REQUEST_TIMEOUT)
        self.auth_token = kwargs.get("auth_token")
        self.verify_ssl = kwargs.get("verify_ssl", False)
        self._session = None

    def _get_headers(self) -> Dict[str, str]:
        """Build default request headers."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    async def connect(self) -> bool:
        """Initialize the HTTP session (aiohttp)."""
        try:
            import aiohttp

            connector = aiohttp.TCPConnector(ssl=self.verify_ssl)
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers=self._get_headers(),
            )
            self.connected = True
            self._log_info("HTTP session created for %s", self.base_url)
            return True
        except ImportError:
            self._log_error("aiohttp not installed. Install with: pip install aiohttp")
            return False
        except Exception as exc:
            self._log_error("HTTP session creation failed: %s", exc)
            self.connected = False
            return False

    async def disconnect(self) -> None:
        """Close the HTTP session."""
        if self._session:
            try:
                await self._session.close()
            except Exception as exc:
                self._log_warning("Error closing HTTP session: %s", exc)
            finally:
                self._session = None
                self.connected = False
                self._log_info("HTTP session closed")

    async def send(self, data: str) -> bool:
        """
        Send data to the device via HTTP POST.
        The `data` parameter is sent as the request body to the base URL.
        """
        if not self.connected or not self._session:
            self._log_error("Cannot send: HTTP session not initialized")
            return False
        try:
            async with self._session.post(self.base_url, data=data) as resp:
                if resp.status < 400:
                    self._log_info("HTTP POST successful: status=%d", resp.status)
                    return True
                else:
                    body = await resp.text()
                    self._log_error("HTTP POST failed: status=%d, body=%s", resp.status, body[:200])
                    return False
        except Exception as exc:
            self._log_error("HTTP send error: %s", exc)
            return False

    async def receive(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Receive data from the device via HTTP GET.
        Fetches the base URL and returns the response body.
        """
        if not self.connected or not self._session:
            self._log_error("Cannot receive: HTTP session not initialized")
            return None
        try:
            async with self._session.get(self.base_url) as resp:
                if resp.status < 400:
                    body = await resp.text()
                    self._log_info("HTTP GET successful: %d bytes", len(body))
                    return body
                else:
                    self._log_error("HTTP GET failed: status=%d", resp.status)
                    return None
        except Exception as exc:
            self._log_error("HTTP receive error: %s", exc)
            return None

    async def get(self, path: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Perform a GET request to a specific endpoint path."""
        if not self.connected or not self._session:
            return None
        try:
            url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
            async with self._session.get(url, params=params) as resp:
                if resp.status < 400:
                    return await resp.json()
                return None
        except Exception as exc:
            self._log_error("HTTP GET %s error: %s", path, exc)
            return None

    async def post(self, path: str, json_data: Optional[Dict] = None) -> Optional[Dict]:
        """Perform a POST request to a specific endpoint path."""
        if not self.connected or not self._session:
            return None
        try:
            url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
            async with self._session.post(url, json=json_data) as resp:
                if resp.status < 400:
                    return await resp.json()
                return None
        except Exception as exc:
            self._log_error("HTTP POST %s error: %s", path, exc)
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test HTTP connectivity by attempting a GET request."""
        try:
            was_connected = self.connected
            if not was_connected:
                await self.connect()

            if not self._session:
                return {
                    "success": False,
                    "message": "Could not create HTTP session",
                    "protocol": "http",
                }

            async with self._session.get(self.base_url) as resp:
                result = {
                    "success": resp.status < 400,
                    "message": f"HTTP status {resp.status} from {self.base_url}",
                    "protocol": "http",
                    "statusCode": resp.status,
                }

            if not was_connected:
                await self.disconnect()

            return result
        except Exception as exc:
            return {
                "success": False,
                "message": f"HTTP test failed: {str(exc)}",
                "protocol": "http",
            }
