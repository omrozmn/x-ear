"""
Serial Driver
RS-232 serial communication driver for lab analyzers and legacy medical devices.
Uses pyserial-asyncio for non-blocking serial I/O.
"""
import asyncio
from typing import Optional, Dict, Any

from .base_driver import BaseDeviceDriver
from config import DEFAULT_BAUD_RATE, DEFAULT_DATA_BITS


class SerialDriver(BaseDeviceDriver):
    """
    Driver for devices connected via RS-232 / USB-to-serial adapters.
    Common in lab analyzers (Beckman, Siemens, Roche, etc.)
    that use ASTM/LIS2-A2 or proprietary serial protocols.
    """

    def __init__(self, device_id: str, serial_port: str, **kwargs):
        super().__init__(device_id=device_id, host=None, port=None, **kwargs)
        self.serial_port = serial_port
        self.baud_rate = kwargs.get("baud_rate", DEFAULT_BAUD_RATE)
        self.data_bits = kwargs.get("data_bits", DEFAULT_DATA_BITS)
        self.stop_bits = kwargs.get("stop_bits", 1)
        self.parity = kwargs.get("parity", "N")  # N=None, E=Even, O=Odd
        self.timeout = kwargs.get("timeout", 10)
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None

    async def connect(self) -> bool:
        """Open the serial port using pyserial-asyncio."""
        try:
            import serial_asyncio

            self._reader, self._writer = await serial_asyncio.open_serial_connection(
                url=self.serial_port,
                baudrate=self.baud_rate,
                bytesize=self.data_bits,
                stopbits=self.stop_bits,
                parity=self.parity,
            )
            self.connected = True
            self._log_info(
                "Serial connection opened: %s @ %d baud",
                self.serial_port,
                self.baud_rate,
            )
            return True
        except ImportError:
            self._log_error(
                "pyserial-asyncio not installed. Install with: pip install pyserial-asyncio"
            )
            return False
        except Exception as exc:
            self._log_error("Serial connection failed on %s: %s", self.serial_port, exc)
            self.connected = False
            return False

    async def disconnect(self) -> None:
        """Close the serial port."""
        if self._writer:
            try:
                self._writer.close()
                # serial_asyncio writers may not support wait_closed
                if hasattr(self._writer, "wait_closed"):
                    await self._writer.wait_closed()
            except Exception as exc:
                self._log_warning("Error closing serial port: %s", exc)
            finally:
                self._writer = None
                self._reader = None
                self.connected = False
                self._log_info("Serial port closed")

    async def send(self, data: str) -> bool:
        """Send data over the serial port."""
        if not self.connected or not self._writer:
            self._log_error("Cannot send: serial port not open")
            return False
        try:
            encoded = data.encode("ascii", errors="replace")
            self._writer.write(encoded)
            await self._writer.drain()
            self._log_info("Sent %d bytes over serial", len(encoded))
            return True
        except Exception as exc:
            self._log_error("Serial send error: %s", exc)
            self.connected = False
            return False

    async def receive(self, timeout: Optional[float] = None) -> Optional[str]:
        """
        Read data from the serial port.
        Reads until timeout or a protocol-specific terminator is encountered.
        """
        if not self.connected or not self._reader:
            self._log_error("Cannot receive: serial port not open")
            return None

        effective_timeout = timeout or self.timeout
        buffer = b""

        try:
            # Read until EOT (0x04) for ASTM, or until timeout
            eot = b"\x04"
            etx = b"\x03"

            while True:
                chunk = await asyncio.wait_for(
                    self._reader.read(1024),
                    timeout=effective_timeout,
                )
                if not chunk:
                    break
                buffer += chunk
                # Check for ASTM EOT or ETX terminators
                if eot in buffer or etx in buffer:
                    break

            if buffer:
                message = buffer.decode("ascii", errors="replace")
                self._log_info("Received %d bytes from serial", len(buffer))
                return message
            return None

        except asyncio.TimeoutError:
            if buffer:
                message = buffer.decode("ascii", errors="replace")
                self._log_info("Received %d bytes (timeout) from serial", len(buffer))
                return message
            self._log_warning("Serial receive timeout after %ss", effective_timeout)
            return None
        except Exception as exc:
            self._log_error("Serial receive error: %s", exc)
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test serial port availability."""
        try:
            import serial

            # Just try to open and close the port to verify availability
            ser = serial.Serial(
                port=self.serial_port,
                baudrate=self.baud_rate,
                bytesize=self.data_bits,
                stopbits=self.stop_bits,
                parity=self.parity,
                timeout=2,
            )
            ser.close()
            return {
                "success": True,
                "message": f"Serial port {self.serial_port} is available",
                "protocol": "serial",
                "baudRate": self.baud_rate,
            }
        except ImportError:
            return {
                "success": False,
                "message": "pyserial not installed",
                "protocol": "serial",
            }
        except Exception as exc:
            return {
                "success": False,
                "message": f"Serial port test failed: {str(exc)}",
                "protocol": "serial",
            }

    async def send_enq(self) -> bool:
        """Send ENQ (0x05) to initiate ASTM handshake."""
        return await self.send("\x05")

    async def send_ack(self) -> bool:
        """Send ACK (0x06) to acknowledge received frame."""
        return await self.send("\x06")

    async def send_nak(self) -> bool:
        """Send NAK (0x15) to request retransmission."""
        return await self.send("\x15")

    async def send_eot(self) -> bool:
        """Send EOT (0x04) to end transmission."""
        return await self.send("\x04")
