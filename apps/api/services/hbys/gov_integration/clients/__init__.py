"""
Government Integration Clients Package
SOAP and REST clients for Turkish government health systems.
"""
from .medula_client import MedulaClient
from .enabiz_client import EnabizClient
from .mhrs_client import MHRSClient
from .its_client import ITSClient
from .teleradyoloji_client import TeleradyolojiClient

__all__ = [
    "MedulaClient",
    "EnabizClient",
    "MHRSClient",
    "ITSClient",
    "TeleradyolojiClient",
]
