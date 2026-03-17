"""
Government Integration Configuration
URLs, credential placeholders, and timeouts for all government health systems.
"""
import os


# ---------------------------------------------------------------------------
# Medula (SGK) - SOAP Web Service
# ---------------------------------------------------------------------------
MEDULA_WSDL_URL = os.getenv(
    "MEDULA_WSDL_URL",
    "https://medula.sgk.gov.tr/hastane/services/HastaneService?wsdl"
)
MEDULA_TEST_WSDL_URL = os.getenv(
    "MEDULA_TEST_WSDL_URL",
    "https://medula-test.sgk.gov.tr/hastane/services/HastaneService?wsdl"
)
MEDULA_USERNAME = os.getenv("MEDULA_USERNAME", "")
MEDULA_PASSWORD = os.getenv("MEDULA_PASSWORD", "")
MEDULA_FACILITY_CODE = os.getenv("MEDULA_FACILITY_CODE", "")
MEDULA_TIMEOUT = int(os.getenv("MEDULA_TIMEOUT", "30"))
MEDULA_USE_TEST = os.getenv("MEDULA_USE_TEST", "true").lower() == "true"

# ---------------------------------------------------------------------------
# e-Nabiz (Ministry of Health) - XML based
# ---------------------------------------------------------------------------
ENABIZ_BASE_URL = os.getenv(
    "ENABIZ_BASE_URL",
    "https://enabiz.gov.tr/api/v1"
)
ENABIZ_TEST_BASE_URL = os.getenv(
    "ENABIZ_TEST_BASE_URL",
    "https://test-enabiz.gov.tr/api/v1"
)
ENABIZ_API_KEY = os.getenv("ENABIZ_API_KEY", "")
ENABIZ_SECRET = os.getenv("ENABIZ_SECRET", "")
ENABIZ_FACILITY_OID = os.getenv("ENABIZ_FACILITY_OID", "")
ENABIZ_TIMEOUT = int(os.getenv("ENABIZ_TIMEOUT", "30"))
ENABIZ_USE_TEST = os.getenv("ENABIZ_USE_TEST", "true").lower() == "true"

# ---------------------------------------------------------------------------
# SKRS (Saglik Kodlama Referans Sunucusu) - REST
# ---------------------------------------------------------------------------
SKRS_BASE_URL = os.getenv(
    "SKRS_BASE_URL",
    "https://skrs.saglik.gov.tr/api/v1"
)
SKRS_API_KEY = os.getenv("SKRS_API_KEY", "")
SKRS_TIMEOUT = int(os.getenv("SKRS_TIMEOUT", "15"))

# ---------------------------------------------------------------------------
# MHRS (Merkezi Hekim Randevu Sistemi) - REST
# ---------------------------------------------------------------------------
MHRS_BASE_URL = os.getenv(
    "MHRS_BASE_URL",
    "https://mhrs.gov.tr/api/v1"
)
MHRS_TEST_BASE_URL = os.getenv(
    "MHRS_TEST_BASE_URL",
    "https://test-mhrs.gov.tr/api/v1"
)
MHRS_USERNAME = os.getenv("MHRS_USERNAME", "")
MHRS_PASSWORD = os.getenv("MHRS_PASSWORD", "")
MHRS_FACILITY_CODE = os.getenv("MHRS_FACILITY_CODE", "")
MHRS_TIMEOUT = int(os.getenv("MHRS_TIMEOUT", "15"))
MHRS_USE_TEST = os.getenv("MHRS_USE_TEST", "true").lower() == "true"

# ---------------------------------------------------------------------------
# ITS (Ilac Takip Sistemi) - REST
# ---------------------------------------------------------------------------
ITS_BASE_URL = os.getenv(
    "ITS_BASE_URL",
    "https://its.saglik.gov.tr/api/v1"
)
ITS_TEST_BASE_URL = os.getenv(
    "ITS_TEST_BASE_URL",
    "https://test-its.saglik.gov.tr/api/v1"
)
ITS_GLN_CODE = os.getenv("ITS_GLN_CODE", "")
ITS_USERNAME = os.getenv("ITS_USERNAME", "")
ITS_PASSWORD = os.getenv("ITS_PASSWORD", "")
ITS_TIMEOUT = int(os.getenv("ITS_TIMEOUT", "15"))
ITS_USE_TEST = os.getenv("ITS_USE_TEST", "true").lower() == "true"

# ---------------------------------------------------------------------------
# Teleradyoloji - REST
# ---------------------------------------------------------------------------
TELERADYOLOJI_BASE_URL = os.getenv(
    "TELERADYOLOJI_BASE_URL",
    "https://teleradyoloji.saglik.gov.tr/api/v1"
)
TELERADYOLOJI_TEST_BASE_URL = os.getenv(
    "TELERADYOLOJI_TEST_BASE_URL",
    "https://test-teleradyoloji.saglik.gov.tr/api/v1"
)
TELERADYOLOJI_API_KEY = os.getenv("TELERADYOLOJI_API_KEY", "")
TELERADYOLOJI_FACILITY_CODE = os.getenv("TELERADYOLOJI_FACILITY_CODE", "")
TELERADYOLOJI_TIMEOUT = int(os.getenv("TELERADYOLOJI_TIMEOUT", "60"))
TELERADYOLOJI_USE_TEST = os.getenv("TELERADYOLOJI_USE_TEST", "true").lower() == "true"

# ---------------------------------------------------------------------------
# Global retry settings
# ---------------------------------------------------------------------------
MAX_RETRY_COUNT = int(os.getenv("GOV_MAX_RETRY_COUNT", "3"))
RETRY_BACKOFF_FACTOR = float(os.getenv("GOV_RETRY_BACKOFF_FACTOR", "2.0"))
RETRY_INITIAL_DELAY = float(os.getenv("GOV_RETRY_INITIAL_DELAY", "1.0"))
