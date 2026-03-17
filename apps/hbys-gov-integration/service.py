"""
Government Integration Service - Orchestration Layer
Provides retry logic, logging, and unified interface for all government system clients.
"""
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any, Callable

from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.gov_integration_log import GovIntegrationLog
from clients.medula_client import MedulaClient
from clients.enabiz_client import EnabizClient
from clients.mhrs_client import MHRSClient
from clients.its_client import ITSClient
from clients.teleradyoloji_client import TeleradyolojiClient
from config import MAX_RETRY_COUNT, RETRY_BACKOFF_FACTOR, RETRY_INITIAL_DELAY
from hbys_common.database import gen_id, now_utc

logger = logging.getLogger(__name__)

# Singleton-ish client instances
_medula_client = MedulaClient()
_enabiz_client = EnabizClient()
_mhrs_client = MHRSClient()
_its_client = ITSClient()
_teleradyoloji_client = TeleradyolojiClient()


# ---------------------------------------------------------------------------
# Core execution helper with retry + logging
# ---------------------------------------------------------------------------

def _execute_with_retry(
    db: Session,
    tenant_id: str,
    system_name: str,
    operation: str,
    client_fn: Callable[..., Dict[str, Any]],
    client_kwargs: Dict[str, Any],
    correlation_id: Optional[str] = None,
    max_retries: int = MAX_RETRY_COUNT,
) -> Dict[str, Any]:
    """
    Execute a government system call with retry logic and logging.
    - Logs every attempt to gov_integration_logs.
    - Retries on exception up to max_retries with exponential backoff.
    - Returns the final result dict including the log_id.
    """
    correlation_id = correlation_id or str(uuid.uuid4())

    log_entry = GovIntegrationLog(
        id=gen_id("gil"),
        tenant_id=tenant_id,
        system_name=system_name,
        operation=operation,
        request_data=json.dumps(client_kwargs, ensure_ascii=False, default=str),
        status="pending",
        request_timestamp=now_utc(),
        retry_count=0,
        correlation_id=correlation_id,
    )
    db.add(log_entry)
    db.commit()

    last_error = None
    delay = RETRY_INITIAL_DELAY

    for attempt in range(max_retries + 1):
        try:
            result = client_fn(**client_kwargs)

            # Update log as success
            log_entry.status = "success"
            log_entry.response_data = json.dumps(
                result.get("response", {}), ensure_ascii=False, default=str
            )
            log_entry.response_timestamp = now_utc()
            log_entry.retry_count = attempt
            db.commit()

            logger.info(
                "Gov call %s/%s succeeded on attempt %d (corr=%s)",
                system_name, operation, attempt + 1, correlation_id,
            )

            return {
                "system_name": system_name,
                "operation": operation,
                "status": "success",
                "response_data": result.get("response", {}),
                "correlation_id": correlation_id,
                "log_id": log_entry.id,
            }

        except Exception as exc:
            last_error = str(exc)
            logger.warning(
                "Gov call %s/%s failed attempt %d/%d: %s",
                system_name, operation, attempt + 1, max_retries + 1, last_error,
            )
            if attempt < max_retries:
                time.sleep(delay)
                delay *= RETRY_BACKOFF_FACTOR

    # All retries exhausted
    log_entry.status = "error"
    log_entry.error_message = last_error
    log_entry.response_timestamp = now_utc()
    log_entry.retry_count = max_retries
    db.commit()

    logger.error(
        "Gov call %s/%s exhausted retries (corr=%s): %s",
        system_name, operation, correlation_id, last_error,
    )

    return {
        "system_name": system_name,
        "operation": operation,
        "status": "error",
        "error_message": last_error,
        "correlation_id": correlation_id,
        "log_id": log_entry.id,
    }


# ===========================================================================
# Integration Log Queries
# ===========================================================================

def list_integration_logs(
    db: Session,
    tenant_id: str,
    system_name: Optional[str] = None,
    status: Optional[str] = None,
    correlation_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    per_page: int = 20,
) -> Tuple[List[GovIntegrationLog], int]:
    """List integration logs with optional filters."""
    query = db.query(GovIntegrationLog).filter(
        GovIntegrationLog.tenant_id == tenant_id
    )
    if system_name:
        query = query.filter(GovIntegrationLog.system_name == system_name)
    if status:
        query = query.filter(GovIntegrationLog.status == status)
    if correlation_id:
        query = query.filter(GovIntegrationLog.correlation_id == correlation_id)
    if date_from:
        query = query.filter(GovIntegrationLog.request_timestamp >= date_from)
    if date_to:
        query = query.filter(GovIntegrationLog.request_timestamp <= date_to)

    total = query.count()
    logs = (
        query
        .order_by(desc(GovIntegrationLog.request_timestamp))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return logs, total


def get_integration_log(
    db: Session, tenant_id: str, log_id: str
) -> Optional[GovIntegrationLog]:
    """Get a single integration log by ID."""
    return (
        db.query(GovIntegrationLog)
        .filter(
            GovIntegrationLog.id == log_id,
            GovIntegrationLog.tenant_id == tenant_id,
        )
        .first()
    )


# ===========================================================================
# Medula Operations
# ===========================================================================

def medula_login(db: Session, tenant_id: str, correlation_id: Optional[str] = None) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "login",
        _medula_client.login, {},
        correlation_id=correlation_id,
    )


def medula_provizyon_sorgula(
    db: Session, tenant_id: str,
    tc_kimlik_no: str,
    provizyon_tipi: str = "N",
    tedavi_tipi: str = "A",
    takip_no: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "provizyonSorgula",
        _medula_client.provizyon_sorgula,
        {
            "tc_kimlik_no": tc_kimlik_no,
            "provizyon_tipi": provizyon_tipi,
            "tedavi_tipi": tedavi_tipi,
            "takip_no": takip_no,
        },
        correlation_id=correlation_id,
    )


def medula_hasta_yatis(
    db: Session, tenant_id: str,
    takip_no: str, tc_kimlik_no: str,
    yatis_tarihi: str, klinik_kodu: str, yatak_kodu: str,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "hastaYatis",
        _medula_client.hasta_yatis,
        {
            "takip_no": takip_no,
            "tc_kimlik_no": tc_kimlik_no,
            "yatis_tarihi": yatis_tarihi,
            "klinik_kodu": klinik_kodu,
            "yatak_kodu": yatak_kodu,
        },
        correlation_id=correlation_id,
    )


def medula_hasta_cikis(
    db: Session, tenant_id: str,
    takip_no: str, cikis_tarihi: str, cikis_nedeni: str = "1",
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "hastaCikis",
        _medula_client.hasta_cikis,
        {
            "takip_no": takip_no,
            "cikis_tarihi": cikis_tarihi,
            "cikis_nedeni": cikis_nedeni,
        },
        correlation_id=correlation_id,
    )


def medula_hizmet_kaydet(
    db: Session, tenant_id: str,
    takip_no: str, sut_kodu: str, adet: int = 1,
    tarih: Optional[str] = None, doktor_tc: Optional[str] = None,
    tani_listesi: Optional[list] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "hizmetKaydet",
        _medula_client.hizmet_kaydet,
        {
            "takip_no": takip_no,
            "sut_kodu": sut_kodu,
            "adet": adet,
            "tarih": tarih,
            "doktor_tc": doktor_tc,
            "tani_listesi": [t if isinstance(t, dict) else t.model_dump() for t in (tani_listesi or [])],
        },
        correlation_id=correlation_id,
    )


def medula_fatura_bilgisi_kaydet(
    db: Session, tenant_id: str,
    takip_no: str, fatura_no: str, fatura_tarihi: str,
    toplam_tutar: float, kdv_tutari: float = 0.0,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "medula", "faturaBilgisiKaydet",
        _medula_client.fatura_bilgisi_kaydet,
        {
            "takip_no": takip_no,
            "fatura_no": fatura_no,
            "fatura_tarihi": fatura_tarihi,
            "toplam_tutar": toplam_tutar,
            "kdv_tutari": kdv_tutari,
        },
        correlation_id=correlation_id,
    )


# ===========================================================================
# e-Nabiz Operations
# ===========================================================================

def enabiz_send_data_packet(
    db: Session, tenant_id: str,
    tc_kimlik_no: str, packet_type: str, data_entries: list,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    entries = [e if isinstance(e, dict) else e.model_dump() for e in data_entries]
    return _execute_with_retry(
        db, tenant_id, "enabiz", "send_data_packet",
        _enabiz_client.send_data_packet,
        {"tc_kimlik_no": tc_kimlik_no, "packet_type": packet_type, "data_entries": entries},
        correlation_id=correlation_id,
    )


def enabiz_query_patient_summary(
    db: Session, tenant_id: str,
    tc_kimlik_no: str,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "enabiz", "query_patient_summary",
        _enabiz_client.query_patient_summary,
        {"tc_kimlik_no": tc_kimlik_no},
        correlation_id=correlation_id,
    )


def enabiz_send_vaccination(
    db: Session, tenant_id: str,
    tc_kimlik_no: str, vaccine_code: str, vaccine_name: str,
    dose_number: int, administration_date: str,
    lot_number: Optional[str] = None,
    administering_doctor_tc: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "enabiz", "send_vaccination",
        _enabiz_client.send_vaccination,
        {
            "tc_kimlik_no": tc_kimlik_no,
            "vaccine_code": vaccine_code,
            "vaccine_name": vaccine_name,
            "dose_number": dose_number,
            "administration_date": administration_date,
            "lot_number": lot_number,
            "administering_doctor_tc": administering_doctor_tc,
        },
        correlation_id=correlation_id,
    )


def enabiz_send_birth_notification(
    db: Session, tenant_id: str,
    mother_tc: str, birth_date: str, birth_weight: float,
    gender: str, birth_type: str = "normal",
    hospital_name: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "enabiz", "send_birth_notification",
        _enabiz_client.send_birth_notification,
        {
            "mother_tc": mother_tc,
            "birth_date": birth_date,
            "birth_weight": birth_weight,
            "gender": gender,
            "birth_type": birth_type,
            "hospital_name": hospital_name,
        },
        correlation_id=correlation_id,
    )


def enabiz_send_death_notification(
    db: Session, tenant_id: str,
    tc_kimlik_no: str, death_date: str,
    death_cause_icd: str, death_place: str = "hastane",
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "enabiz", "send_death_notification",
        _enabiz_client.send_death_notification,
        {
            "tc_kimlik_no": tc_kimlik_no,
            "death_date": death_date,
            "death_cause_icd": death_cause_icd,
            "death_place": death_place,
        },
        correlation_id=correlation_id,
    )


# ===========================================================================
# MHRS Operations
# ===========================================================================

def mhrs_sync_doctor_availability(
    db: Session, tenant_id: str,
    doctor_tc: str, branch_code: str,
    availability_slots: list,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    slots = [s if isinstance(s, dict) else s.model_dump() for s in availability_slots]
    return _execute_with_retry(
        db, tenant_id, "mhrs", "sync_doctor_availability",
        _mhrs_client.sync_doctor_availability,
        {"doctor_tc": doctor_tc, "branch_code": branch_code, "availability_slots": slots},
        correlation_id=correlation_id,
    )


def mhrs_get_appointments(
    db: Session, tenant_id: str,
    start_date: str, end_date: str,
    doctor_tc: Optional[str] = None,
    branch_code: Optional[str] = None,
    status: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "mhrs", "get_appointments",
        _mhrs_client.get_appointments,
        {
            "start_date": start_date,
            "end_date": end_date,
            "doctor_tc": doctor_tc,
            "branch_code": branch_code,
            "status": status,
        },
        correlation_id=correlation_id,
    )


def mhrs_confirm_appointment(
    db: Session, tenant_id: str,
    randevu_id: str, confirmation_note: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "mhrs", "confirm_appointment",
        _mhrs_client.confirm_appointment,
        {"randevu_id": randevu_id, "confirmation_note": confirmation_note},
        correlation_id=correlation_id,
    )


def mhrs_cancel_appointment(
    db: Session, tenant_id: str,
    randevu_id: str, cancel_reason: str = "kurum_talebi",
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "mhrs", "cancel_appointment",
        _mhrs_client.cancel_appointment,
        {"randevu_id": randevu_id, "cancel_reason": cancel_reason},
        correlation_id=correlation_id,
    )


# ===========================================================================
# ITS Operations
# ===========================================================================

def its_verify_drug_barcode(
    db: Session, tenant_id: str,
    barcode: str, gtin: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "its", "verify_drug_barcode",
        _its_client.verify_drug_barcode,
        {"barcode": barcode, "gtin": gtin},
        correlation_id=correlation_id,
    )


def its_notify_dispensing(
    db: Session, tenant_id: str,
    barcode: str, patient_tc: str, prescription_id: str,
    dispensing_type: str = "hastane", quantity: int = 1,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "its", "notify_dispensing",
        _its_client.notify_dispensing,
        {
            "barcode": barcode,
            "patient_tc": patient_tc,
            "prescription_id": prescription_id,
            "dispensing_type": dispensing_type,
            "quantity": quantity,
        },
        correlation_id=correlation_id,
    )


def its_query_drug_status(
    db: Session, tenant_id: str,
    barcode: str,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "its", "query_drug_status",
        _its_client.query_drug_status,
        {"barcode": barcode},
        correlation_id=correlation_id,
    )


# ===========================================================================
# Teleradyoloji Operations
# ===========================================================================

def teleradyoloji_send_study(
    db: Session, tenant_id: str,
    patient_tc: str, study_uid: str, modality: str,
    body_part: str, study_description: str, accession_number: str,
    referring_doctor: Optional[str] = None,
    priority: str = "normal",
    dicom_endpoint: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "teleradyoloji", "send_study",
        _teleradyoloji_client.send_study,
        {
            "patient_tc": patient_tc,
            "study_uid": study_uid,
            "modality": modality,
            "body_part": body_part,
            "study_description": study_description,
            "accession_number": accession_number,
            "referring_doctor": referring_doctor,
            "priority": priority,
            "dicom_endpoint": dicom_endpoint,
        },
        correlation_id=correlation_id,
    )


def teleradyoloji_query_status(
    db: Session, tenant_id: str,
    study_uid: Optional[str] = None,
    calisma_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "teleradyoloji", "query_status",
        _teleradyoloji_client.query_status,
        {"study_uid": study_uid, "calisma_id": calisma_id},
        correlation_id=correlation_id,
    )


def teleradyoloji_receive_report(
    db: Session, tenant_id: str,
    study_uid: Optional[str] = None,
    calisma_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Dict[str, Any]:
    return _execute_with_retry(
        db, tenant_id, "teleradyoloji", "receive_report",
        _teleradyoloji_client.receive_report,
        {"study_uid": study_uid, "calisma_id": calisma_id},
        correlation_id=correlation_id,
    )
