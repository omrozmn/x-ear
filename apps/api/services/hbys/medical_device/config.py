"""
Medical Device Service Configuration
"""

# Serial communication defaults
DEFAULT_BAUD_RATE = 9600
DEFAULT_DATA_BITS = 8

# MLLP / HL7 settings
MLLP_TIMEOUT = 30  # seconds
MLLP_START_BLOCK = "\x0b"
MLLP_END_BLOCK = "\x1c\x0d"

# Data retention
DATA_RETENTION_DAYS = 365

# Listener settings
LISTENER_POLL_INTERVAL = 1  # seconds
LISTENER_MAX_RECONNECT_ATTEMPTS = 5
LISTENER_RECONNECT_DELAY = 5  # seconds

# TCP settings
TCP_BUFFER_SIZE = 4096
TCP_CONNECTION_TIMEOUT = 10  # seconds

# HTTP driver defaults
HTTP_REQUEST_TIMEOUT = 30  # seconds
