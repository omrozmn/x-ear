"""
HL7 MLLP Driver
Implements the Minimal Lower Layer Protocol (MLLP) for HL7 v2.x messaging over TCP.
MLLP wraps HL7 messages with start-block (0x0B), end-block (0x1C), and carriage-return (0x0D).
"""
import asyncio
from typing import Optional, Dict, Any

from .base_driver import BaseDeviceDriver
from config import MLLP_TIMEOUT, MLLP_START_BLOCK, MLLP_END_BLOCK, TCP_BUFFER_SIZE


class HL7MLLPDriver(BaseDeviceDriver):
    """
    Driver for devices that communicate via HL7 v2.x over MLLP/TCP.
    Commonly used by lab analyzers, hospital information systems, and LIS bridges.
    """

    def __init__(self, device_id: str, host: str, port: int, **kwargs):
        super().__init__(device_id=device_id, host=host, port=port, **kwargs)
        self.timeout = kwargs.get("timeout", MLLP_TIMEOUT)
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None

    async def connect(self) -> bool:
        """Open a TCP connection to the MLLP endpoint."""
        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=self.timeout,
            )
            self.connected = True
            self._log_info("MLLP connection established to %s:%s", self.host, self.port)
            return True
        except (OSError, asyncio.TimeoutError) as exc:
            self._log_error("MLLP connection failed to %s:%s: %s", self.host, self.port, exc)
            self.connected = False
            return False

    async def disconnect(self) -> None:
        """Close the MLLP/TCP connection."""
        if self._writer:
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception as exc:
                self._log_warning("Error closing MLLP connection: %s", exc)
            finally:
                self._writer = None
                self._reader = None
                self.connected = False
                self._log_info("MLLP connection closed")

    def _wrap_mllp(self, message: str) -> bytes:
        """Wrap an HL7 message with MLLP framing bytes."""
        return (MLLP_START_BLOCK + message + MLLP_END_BLOCK).encode("utf-8")

    def _unwrap_mllp(self, data: bytes) -> str:
        """Strip MLLP framing bytes from received data."""
        text = data.decode("utf-8", errors="replace")
        text = text.lstrip(MLLP_START_BLOCK).rstrip(MLLP_END_BLOCK).rstrip("\r\n")
        return text

    async def send(self, data: str) -> bool:
        """Send an HL7 message wrapped in MLLP framing."""
        if not self.connected or not self._writer:
            self._log_error("Cannot send: not connected")
            return False
        try:
            framed = self._wrap_mllp(data)
            self._writer.write(framed)
            await self._writer.drain()
            self._log_info("Sent %d bytes via MLLP", len(framed))
            return True
        except Exception as exc:
            self._log_error("MLLP send error: %s", exc)
            self.connected = False
            return False

    async def receive(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Receive an MLLP-framed HL7 message.
        Reads until the end-block sequence is found.
        """
        if not self.connected or not self._reader:
            self._log_error("Cannot receive: not connected")
            return None

        effective_timeout = timeout or self.timeout
        buffer = b""

        try:
            end_marker = MLLP_END_BLOCK.encode("utf-8")
            while True:
                chunk = await asyncio.wait_for(
                    self._reader.read(TCP_BUFFER_SIZE),
                    timeout=effective_timeout,
                )
                if not chunk:
                    self._log_warning("MLLP connection closed by remote")
                    self.connected = False
                    return None

                buffer += chunk
                if end_marker in buffer:
                    message = self._unwrap_mllp(buffer)
                    self._log_info("Received HL7 message (%d chars)", len(message))
                    return message

        except asyncio.TimeoutError:
            self._log_warning("MLLP receive timeout after %ss", effective_timeout)
            return None
        except Exception as exc:
            self._log_error("MLLP receive error: %s", exc)
            self.connected = False
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test MLLP connectivity by attempting a TCP connection."""
        try:
            connected = await self.connect()
            if connected:
                await self.disconnect()
                return {
                    "success": True,
                    "message": f"MLLP connection to {self.host}:{self.port} successful",
                    "protocol": "hl7_mllp",
                }
            return {
                "success": False,
                "message": f"Could not connect to {self.host}:{self.port}",
                "protocol": "hl7_mllp",
            }
        except Exception as exc:
            return {
                "success": False,
                "message": f"MLLP test failed: {str(exc)}",
                "protocol": "hl7_mllp",
            }

    async def send_and_receive(self, message: str, timeout: Optional[float] = None) -> Optional[str]:
        """Send an HL7 message and wait for the ACK/response."""
        if not await self.send(message):
            return None
        return await self.receive(timeout=timeout)
