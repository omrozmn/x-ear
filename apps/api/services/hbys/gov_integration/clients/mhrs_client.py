"""
MHRS (Merkezi Hekim Randevu Sistemi) REST Client
Provides stub implementations for the central doctor appointment system.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from ..config import (
    MHRS_BASE_URL, MHRS_TEST_BASE_URL, MHRS_USERNAME,
    MHRS_PASSWORD, MHRS_FACILITY_CODE, MHRS_TIMEOUT, MHRS_USE_TEST,
)

logger = logging.getLogger(__name__)


class MHRSClient:
    """
    REST client for MHRS appointment system.
    All methods are stubs returning simulated responses.
    """

    def __init__(self):
        self.base_url = MHRS_TEST_BASE_URL if MHRS_USE_TEST else MHRS_BASE_URL
        self.timeout = MHRS_TIMEOUT
        self._headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-MHRS-Facility": MHRS_FACILITY_CODE,
        }

    def _get_request_meta(self, operation: str) -> Dict[str, Any]:
        return {
            "system_name": "mhrs",
            "operation": operation,
            "base_url": self.base_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _build_url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    # ----- Sync Doctor Availability -----

    def sync_doctor_availability(
        self,
        doctor_tc: str,
        branch_code: str,
        availability_slots: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Synchronize a doctor's availability slots with MHRS.
        availability_slots: list of {"date": "2026-03-18", "start": "09:00", "end": "09:20"}
        """
        request_body = {
            "tesisKodu": MHRS_FACILITY_CODE,
            "hekimTcKimlikNo": doctor_tc,
            "bransKodu": branch_code,
            "musaitlikListesi": [
                {
                    "tarih": slot["date"],
                    "baslangicSaat": slot["start"],
                    "bitisSaat": slot["end"],
                    "durum": slot.get("status", "aktif"),
                }
                for slot in availability_slots
            ],
        }
        url = self._build_url("/kurum/hekim-musaitlik")
        logger.info("MHRS sync_doctor_availability doctor=%s*** slots=%d",
                     doctor_tc[:3], len(availability_slots))

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "mesaj": f"{len(availability_slots)} slot senkronize edildi",
                "senkronizeEdilen": len(availability_slots),
                "hata": 0,
            },
            **self._get_request_meta("sync_doctor_availability"),
        }

    # ----- Get Appointments -----

    def get_appointments(
        self,
        start_date: str,
        end_date: str,
        doctor_tc: Optional[str] = None,
        branch_code: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve appointments from MHRS for the facility.
        """
        params = {
            "tesisKodu": MHRS_FACILITY_CODE,
            "baslangicTarihi": start_date,
            "bitisTarihi": end_date,
        }
        if doctor_tc:
            params["hekimTcKimlikNo"] = doctor_tc
        if branch_code:
            params["bransKodu"] = branch_code
        if status:
            params["durum"] = status

        url = self._build_url("/kurum/randevular")
        logger.info("MHRS get_appointments %s to %s", start_date, end_date)

        return {
            "request_url": url,
            "request_params": json.dumps(params, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "randevular": [
                    {
                        "randevuId": "STUB-RNV-001",
                        "hastaTcKimlikNo": "1234567****",
                        "hekimTcKimlikNo": doctor_tc or "9876543****",
                        "bransKodu": branch_code or "4200",
                        "tarih": start_date,
                        "saat": "10:00",
                        "durum": "onaylandi",
                    }
                ],
                "toplam": 1,
            },
            **self._get_request_meta("get_appointments"),
        }

    # ----- Confirm Appointment -----

    def confirm_appointment(
        self,
        randevu_id: str,
        confirmation_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Confirm an MHRS appointment."""
        request_body = {
            "randevuId": randevu_id,
            "tesisKodu": MHRS_FACILITY_CODE,
            "onayDurumu": "onaylandi",
        }
        if confirmation_note:
            request_body["not"] = confirmation_note

        url = self._build_url(f"/kurum/randevu/{randevu_id}/onayla")
        logger.info("MHRS confirm_appointment %s", randevu_id)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "mesaj": "Randevu onaylandi",
                "randevuId": randevu_id,
            },
            **self._get_request_meta("confirm_appointment"),
        }

    # ----- Cancel Appointment -----

    def cancel_appointment(
        self,
        randevu_id: str,
        cancel_reason: str = "kurum_talebi",
    ) -> Dict[str, Any]:
        """Cancel an MHRS appointment."""
        request_body = {
            "randevuId": randevu_id,
            "tesisKodu": MHRS_FACILITY_CODE,
            "iptalNedeni": cancel_reason,
        }
        url = self._build_url(f"/kurum/randevu/{randevu_id}/iptal")
        logger.info("MHRS cancel_appointment %s reason=%s", randevu_id, cancel_reason)

        return {
            "request_url": url,
            "request_body": json.dumps(request_body, ensure_ascii=False),
            "response": {
                "durum": "basarili",
                "mesaj": "Randevu iptal edildi",
                "randevuId": randevu_id,
            },
            **self._get_request_meta("cancel_appointment"),
        }
