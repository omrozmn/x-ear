"""
Base Device Driver - Abstract base class for all medical device communication drivers.
"""
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class BaseDeviceDriver(ABC):
    """
    Abstract base class that defines the interface every device driver must implement.
    Concrete drivers handle protocol-specific details (MLLP, serial, TCP, HTTP).
    """

    def __init__(
        self,
        device_id: str,
        host: Optional[str] = None,
        port: Optional[int] = None,
        **kwargs,
    ):
        self.device_id = device_id
        self.host = host
        self.port = port
        self.connected = False
        self.extra_config: Dict[str, Any] = kwargs
        self._logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    async def connect(self) -> bool:
        """
        Establish connection to the device.
        Returns True on success, False on failure.
        """
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection to the device."""
        pass

    @abstractmethod
    async def send(self, data: str) -> bool:
        """
        Send data/command to the device.
        Returns True if send was successful.
        """
        pass

    @abstractmethod
    async def receive(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Receive data from the device.
        Returns the received data string or None on timeout/error.
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test connectivity to the device.
        Returns a dict with at least {"success": bool, "message": str}.
        """
        pass

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    def _log_info(self, msg: str, *args):
        self._logger.info(f"[device={self.device_id}] {msg}", *args)

    def _log_error(self, msg: str, *args):
        self._logger.error(f"[device={self.device_id}] {msg}", *args)

    def _log_warning(self, msg: str, *args):
        self._logger.warning(f"[device={self.device_id}] {msg}", *args)
