"""
TCP Driver
Generic TCP socket communication driver for medical devices that use
raw TCP connections (non-MLLP, non-HTTP).
"""
import asyncio
from typing import Optional, Dict, Any

from .base_driver import BaseDeviceDriver
from ..config import TCP_BUFFER_SIZE, TCP_CONNECTION_TIMEOUT


class TCPDriver(BaseDeviceDriver):
    """
    Generic TCP driver for devices that communicate over plain TCP sockets.
    Used when the device does not follow MLLP or HTTP protocols.
    """

    def __init__(self, device_id: str, host: str, port: int, **kwargs):
        super().__init__(device_id=device_id, host=host, port=port, **kwargs)
        self.timeout = kwargs.get("timeout", TCP_CONNECTION_TIMEOUT)
        self.buffer_size = kwargs.get("buffer_size", TCP_BUFFER_SIZE)
        self.delimiter = kwargs.get("delimiter", "\n")
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None

    async def connect(self) -> bool:
        """Open a TCP connection to the device."""
        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=self.timeout,
            )
            self.connected = True
            self._log_info("TCP connection established to %s:%s", self.host, self.port)
            return True
        except (OSError, asyncio.TimeoutError) as exc:
            self._log_error("TCP connection failed to %s:%s: %s", self.host, self.port, exc)
            self.connected = False
            return False

    async def disconnect(self) -> None:
        """Close the TCP connection."""
        if self._writer:
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception as exc:
                self._log_warning("Error closing TCP connection: %s", exc)
            finally:
                self._writer = None
                self._reader = None
                self.connected = False
                self._log_info("TCP connection closed")

    async def send(self, data: str) -> bool:
        """Send data over the TCP connection."""
        if not self.connected or not self._writer:
            self._log_error("Cannot send: not connected")
            return False
        try:
            encoded = data.encode("utf-8")
            self._writer.write(encoded)
            await self._writer.drain()
            self._log_info("Sent %d bytes via TCP", len(encoded))
            return True
        except Exception as exc:
            self._log_error("TCP send error: %s", exc)
            self.connected = False
            return False

    async def receive(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Receive data from the TCP connection.
        Reads until delimiter is found or timeout occurs.
        """
        if not self.connected or not self._reader:
            self._log_error("Cannot receive: not connected")
            return None

        effective_timeout = timeout or self.timeout
        buffer = b""

        try:
            delimiter_bytes = self.delimiter.encode("utf-8")
            while True:
                chunk = await asyncio.wait_for(
                    self._reader.read(self.buffer_size),
                    timeout=effective_timeout,
                )
                if not chunk:
                    self._log_warning("TCP connection closed by remote")
                    self.connected = False
                    break

                buffer += chunk
                if delimiter_bytes in buffer:
                    break

            if buffer:
                message = buffer.decode("utf-8", errors="replace")
                self._log_info("Received %d bytes via TCP", len(buffer))
                return message
            return None

        except asyncio.TimeoutError:
            if buffer:
                message = buffer.decode("utf-8", errors="replace")
                self._log_info("Received %d bytes (timeout) via TCP", len(buffer))
                return message
            self._log_warning("TCP receive timeout after %ss", effective_timeout)
            return None
        except Exception as exc:
            self._log_error("TCP receive error: %s", exc)
            self.connected = False
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test TCP connectivity by attempting a connection."""
        try:
            connected = await self.connect()
            if connected:
                await self.disconnect()
                return {
                    "success": True,
                    "message": f"TCP connection to {self.host}:{self.port} successful",
                    "protocol": "tcp",
                }
            return {
                "success": False,
                "message": f"Could not connect to {self.host}:{self.port}",
                "protocol": "tcp",
            }
        except Exception as exc:
            return {
                "success": False,
                "message": f"TCP test failed: {str(exc)}",
                "protocol": "tcp",
            }
