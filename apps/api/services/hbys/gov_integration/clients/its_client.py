"""
ITS (Ilac Takip Sistemi) REST Client
Provides stub implementations for drug tracking system operations.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from ..config import (
    ITS_BASE_URL, ITS_TEST_BASE_URL, ITS_GLN_CODE,
    ITS_USERNAME, ITS_PASSWORD, ITS_TIMEOUT, ITS_USE_TEST,
)

logger = logging.getLogger(__name__)


class ITSClient:
    """
    REST client for ITS (Drug Tracking System).
    All methods are stubs returning simulated responses.
    """

    def __init__(self):
        self.base_url = ITS_TEST_BASE_URL if ITS_USE_TEST else ITS_BASE_URL
        self.timeout = ITS_TIMEOUT
        self._headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-ITS-GLN": ITS_GLN_CODE,
        }

    def _get_request_meta(self, operation: str) -> Dict[str, Any]:
        return {
            "system_name": "its",
            "operation": operation,
            "base_url": self.base_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _build_url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    # ----- Verify Drug Barcode -----

    def verify_drug_barcode(
        self,
        barcode: str,
        gtin: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify a drug's barcode/GTIN against the ITS database.
        Returns drug info and authentication status.
        """
        request_body = {
            "glnKodu": ITS_GLN_CODE,
            "barkod": barcode,
        }
        if gtin:
            request_body["gtin"] = gtin

        url = self._build_url("/ilac/dogrula")
        logger.info("ITS verify_drug_barcode barcode=%s", barcode)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "ilac": {
                    "barkod": barcode,
                    "gtin": gtin or f"GTIN-{barcode}",
                    "ilacAdi": "Stub Ilac Adi",
                    "ureticiFirma": "Stub Firma",
                    "atcKodu": "N02BE01",
                    "seriNo": f"SN-{barcode[-6:]}",
                    "sonKullanmaTarihi": "2027-12-31",
                    "dogrulamaDurumu": "gecerli",
                    "karekodDurumu": "aktif",
                },
            },
            **self._get_request_meta("verify_drug_barcode"),
        }

    # ----- Notify Dispensing -----

    def notify_dispensing(
        self,
        barcode: str,
        patient_tc: str,
        prescription_id: str,
        dispensing_type: str = "eczane",  # eczane / hastane
        quantity: int = 1,
    ) -> Dict[str, Any]:
        """
        Notify ITS that a drug has been dispensed to a patient.
        """
        request_body = {
            "glnKodu": ITS_GLN_CODE,
            "barkod": barcode,
            "hastaTcKimlikNo": patient_tc,
            "receteId": prescription_id,
            "cikisTipi": dispensing_type,
            "miktar": quantity,
            "islemTarihi": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        }
        url = self._build_url("/ilac/cikis-bildir")
        logger.info("ITS notify_dispensing barcode=%s patient=%s***", barcode, patient_tc[:3])

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "mesaj": "Ilac cikisi basariyla bildirildi",
                "islemId": f"STUB-ITS-DSP-{barcode[-6:]}",
                "barkod": barcode,
            },
            **self._get_request_meta("notify_dispensing"),
        }

    # ----- Query Drug Status -----

    def query_drug_status(
        self,
        barcode: str,
    ) -> Dict[str, Any]:
        """
        Query the current status of a drug in the ITS system.
        Returns location, ownership, and movement history.
        """
        request_body = {
            "glnKodu": ITS_GLN_CODE,
            "barkod": barcode,
        }
        url = self._build_url("/ilac/durum-sorgula")
        logger.info("ITS query_drug_status barcode=%s", barcode)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "ilacDurumu": {
                    "barkod": barcode,
                    "mevcutKonum": "hastane_deposu",
                    "sahipGln": ITS_GLN_CODE or "STUB-GLN",
                    "sonHareketTarihi": "2026-03-15T10:30:00Z",
                    "hareketGecmisi": [
                        {
                            "tarih": "2026-03-10",
                            "islemTipi": "giris",
                            "kaynak": "distribütor",
                            "hedef": ITS_GLN_CODE or "STUB-GLN",
                        },
                    ],
                    "karekodDurumu": "aktif",
                },
            },
            **self._get_request_meta("query_drug_status"),
        }
