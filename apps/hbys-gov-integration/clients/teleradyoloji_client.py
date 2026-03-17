"""
Teleradyoloji REST Client
Provides stub implementations for tele-radiology study submission,
status querying, and report retrieval.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from config import (
    TELERADYOLOJI_BASE_URL, TELERADYOLOJI_TEST_BASE_URL,
    TELERADYOLOJI_API_KEY, TELERADYOLOJI_FACILITY_CODE,
    TELERADYOLOJI_TIMEOUT, TELERADYOLOJI_USE_TEST,
)

logger = logging.getLogger(__name__)


class TeleradyolojiClient:
    """
    REST client for the Teleradyoloji (tele-radiology) platform.
    All methods are stubs returning simulated responses.
    """

    def __init__(self):
        self.base_url = (
            TELERADYOLOJI_TEST_BASE_URL if TELERADYOLOJI_USE_TEST
            else TELERADYOLOJI_BASE_URL
        )
        self.timeout = TELERADYOLOJI_TIMEOUT
        self._headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Api-Key": TELERADYOLOJI_API_KEY,
            "X-Facility-Code": TELERADYOLOJI_FACILITY_CODE,
        }

    def _get_request_meta(self, operation: str) -> Dict[str, Any]:
        return {
            "system_name": "teleradyoloji",
            "operation": operation,
            "base_url": self.base_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _build_url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    # ----- Send Study -----

    def send_study(
        self,
        patient_tc: str,
        study_uid: str,
        modality: str,
        body_part: str,
        study_description: str,
        accession_number: str,
        referring_doctor: Optional[str] = None,
        priority: str = "normal",  # normal / acil
        dicom_endpoint: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Submit a radiology study for remote interpretation.
        In production, DICOM images would be sent via DICOM protocol;
        this REST call registers the study metadata.
        """
        request_body = {
            "tesisKodu": TELERADYOLOJI_FACILITY_CODE,
            "hastaTcKimlikNo": patient_tc,
            "calismaUid": study_uid,
            "modalite": modality,
            "vucut_bolgesi": body_part,
            "aciklama": study_description,
            "aksesyonNo": accession_number,
            "oncelik": priority,
        }
        if referring_doctor:
            request_body["isteyenHekim"] = referring_doctor
        if dicom_endpoint:
            request_body["dicomEndpoint"] = dicom_endpoint

        url = self._build_url("/calisma/gonder")
        logger.info("Teleradyoloji send_study uid=%s modality=%s", study_uid, modality)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "mesaj": "Calisma basariyla gonderildi",
                "calismaId": f"STUB-TRD-{study_uid[-8:]}",
                "calismaUid": study_uid,
                "tahminiSure": "2 saat" if priority == "normal" else "30 dakika",
            },
            **self._get_request_meta("send_study"),
        }

    # ----- Query Status -----

    def query_status(
        self,
        study_uid: Optional[str] = None,
        calisma_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Query the interpretation status of a submitted study.
        Provide either study_uid or calisma_id.
        """
        request_body = {"tesisKodu": TELERADYOLOJI_FACILITY_CODE}
        if study_uid:
            request_body["calismaUid"] = study_uid
        if calisma_id:
            request_body["calismaId"] = calisma_id

        url = self._build_url("/calisma/durum")
        identifier = study_uid or calisma_id or "unknown"
        logger.info("Teleradyoloji query_status id=%s", identifier)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "calisma": {
                    "calismaId": calisma_id or f"STUB-TRD-{(study_uid or '')[-8:]}",
                    "calismaUid": study_uid or "UNKNOWN",
                    "yorumDurumu": "tamamlandi",
                    "atananRadyolog": "Dr. Stub Radyolog",
                    "gonderimTarihi": "2026-03-17T08:00:00Z",
                    "tamamlanmaTarihi": "2026-03-17T10:30:00Z",
                },
            },
            **self._get_request_meta("query_status"),
        }

    # ----- Receive Report -----

    def receive_report(
        self,
        study_uid: Optional[str] = None,
        calisma_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve the radiology report for a completed study.
        """
        request_body = {"tesisKodu": TELERADYOLOJI_FACILITY_CODE}
        if study_uid:
            request_body["calismaUid"] = study_uid
        if calisma_id:
            request_body["calismaId"] = calisma_id

        url = self._build_url("/calisma/rapor")
        identifier = study_uid or calisma_id or "unknown"
        logger.info("Teleradyoloji receive_report id=%s", identifier)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "rapor": {
                    "calismaId": calisma_id or f"STUB-TRD-{(study_uid or '')[-8:]}",
                    "calismaUid": study_uid or "UNKNOWN",
                    "raporMetni": (
                        "Stub radyoloji raporu: Incelenen goruntulerde "
                        "patolojik bulgu saptanmamistir. Normal sinirlar icinde."
                    ),
                    "bulgular": "Normal",
                    "sonuc": "Patoloji yok",
                    "radyolog": "Dr. Stub Radyolog",
                    "raporTarihi": "2026-03-17T10:30:00Z",
                    "onayDurumu": "onaylandi",
                },
            },
            **self._get_request_meta("receive_report"),
        }
