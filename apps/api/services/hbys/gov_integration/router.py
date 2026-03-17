"""
Government Integration Router
FastAPI endpoints for all government health system integrations and log queries.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta

from .schemas import (
    # Log
    GovIntegrationLogRead,
    GovOperationResponse,
    # Medula
    MedulaLoginRequest,
    MedulaProvizyonRequest,
    MedulaHastaYatisRequest,
    MedulaHastaCikisRequest,
    MedulaHizmetKaydetRequest,
    MedulaFaturaRequest,
    # e-Nabiz
    EnabizSendDataPacketRequest,
    EnabizPatientSummaryRequest,
    EnabizVaccinationRequest,
    EnabizBirthNotificationRequest,
    EnabizDeathNotificationRequest,
    # MHRS
    MHRSSyncAvailabilityRequest,
    MHRSGetAppointmentsRequest,
    MHRSConfirmAppointmentRequest,
    MHRSCancelAppointmentRequest,
    # ITS
    ITSVerifyBarcodeRequest,
    ITSNotifyDispensingRequest,
    ITSQueryDrugStatusRequest,
    # Teleradyoloji
    TeleradyolojiSendStudyRequest,
    TeleradyolojiQueryStatusRequest,
    TeleradyolojiReceiveReportRequest,
)
from . import service

router = APIRouter(
    prefix="/hbys/gov-integration",
    tags=["HBYS - Government Integration"],
)


# ===========================================================================
# Helper
# ===========================================================================

def _to_gov_response(result: dict) -> ResponseEnvelope[GovOperationResponse]:
    """Convert service result dict into a ResponseEnvelope."""
    resp = GovOperationResponse(
        system_name=result["system_name"],
        operation=result["operation"],
        status=result["status"],
        response_data=result.get("response_data"),
        error_message=result.get("error_message"),
        correlation_id=result.get("correlation_id"),
        log_id=result.get("log_id"),
    )
    success = result["status"] == "success"
    return ResponseEnvelope(
        success=success,
        data=resp.model_dump(by_alias=True),
        message=result.get("error_message") if not success else None,
    )


# ===========================================================================
# Integration Logs
# ===========================================================================

@router.get(
    "/logs",
    operation_id="listGovIntegrationLogs",
    response_model=ResponseEnvelope[List[GovIntegrationLogRead]],
)
def list_logs(
    system_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    correlation_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.view")),
    db: Session = Depends(get_db),
):
    """List government integration logs with optional filters."""
    logs, total = service.list_integration_logs(
        db, access.tenant_id,
        system_name=system_name,
        status=status,
        correlation_id=correlation_id,
        page=page,
        per_page=per_page,
    )
    data = [
        GovIntegrationLogRead.model_validate(log).model_dump(by_alias=True)
        for log in logs
    ]
    total_pages = (total + per_page - 1) // per_page
    return ResponseEnvelope(
        data=data,
        meta=ResponseMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
        ),
    )


@router.get(
    "/logs/{log_id}",
    operation_id="getGovIntegrationLog",
    response_model=ResponseEnvelope[GovIntegrationLogRead],
)
def get_log(
    log_id: str,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.view")),
    db: Session = Depends(get_db),
):
    """Get a single integration log by ID."""
    log = service.get_integration_log(db, access.tenant_id, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Integration log not found")
    data = GovIntegrationLogRead.model_validate(log).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


# ===========================================================================
# Medula Endpoints
# ===========================================================================

@router.post(
    "/medula/login",
    operation_id="medulaLogin",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_login(
    body: MedulaLoginRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Authenticate with SGK Medula."""
    result = service.medula_login(db, access.tenant_id)
    return _to_gov_response(result)


@router.post(
    "/medula/provizyon-sorgula",
    operation_id="medulaProvizyonSorgula",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_provizyon_sorgula(
    body: MedulaProvizyonRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Query SGK patient authorization (provizyon)."""
    result = service.medula_provizyon_sorgula(
        db, access.tenant_id,
        tc_kimlik_no=body.tc_kimlik_no,
        provizyon_tipi=body.provizyon_tipi,
        tedavi_tipi=body.tedavi_tipi,
        takip_no=body.takip_no,
    )
    return _to_gov_response(result)


@router.post(
    "/medula/hasta-yatis",
    operation_id="medulaHastaYatis",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_hasta_yatis(
    body: MedulaHastaYatisRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Register inpatient admission with Medula."""
    result = service.medula_hasta_yatis(
        db, access.tenant_id,
        takip_no=body.takip_no,
        tc_kimlik_no=body.tc_kimlik_no,
        yatis_tarihi=body.yatis_tarihi,
        klinik_kodu=body.klinik_kodu,
        yatak_kodu=body.yatak_kodu,
    )
    return _to_gov_response(result)


@router.post(
    "/medula/hasta-cikis",
    operation_id="medulaHastaCikis",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_hasta_cikis(
    body: MedulaHastaCikisRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Register inpatient discharge with Medula."""
    result = service.medula_hasta_cikis(
        db, access.tenant_id,
        takip_no=body.takip_no,
        cikis_tarihi=body.cikis_tarihi,
        cikis_nedeni=body.cikis_nedeni,
    )
    return _to_gov_response(result)


@router.post(
    "/medula/hizmet-kaydet",
    operation_id="medulaHizmetKaydet",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_hizmet_kaydet(
    body: MedulaHizmetKaydetRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Register a medical service (SUT code) with Medula."""
    result = service.medula_hizmet_kaydet(
        db, access.tenant_id,
        takip_no=body.takip_no,
        sut_kodu=body.sut_kodu,
        adet=body.adet,
        tarih=body.tarih,
        doktor_tc=body.doktor_tc,
        tani_listesi=body.tani_listesi,
    )
    return _to_gov_response(result)


@router.post(
    "/medula/fatura-bilgisi-kaydet",
    operation_id="medulaFaturaBilgisiKaydet",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def medula_fatura_bilgisi_kaydet(
    body: MedulaFaturaRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.medula")),
    db: Session = Depends(get_db),
):
    """Register invoice information with Medula."""
    result = service.medula_fatura_bilgisi_kaydet(
        db, access.tenant_id,
        takip_no=body.takip_no,
        fatura_no=body.fatura_no,
        fatura_tarihi=body.fatura_tarihi,
        toplam_tutar=body.toplam_tutar,
        kdv_tutari=body.kdv_tutari,
    )
    return _to_gov_response(result)


# ===========================================================================
# e-Nabiz Endpoints
# ===========================================================================

@router.post(
    "/enabiz/send-data-packet",
    operation_id="enabizSendDataPacket",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def enabiz_send_data_packet(
    body: EnabizSendDataPacketRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.enabiz")),
    db: Session = Depends(get_db),
):
    """Send a data packet to e-Nabiz."""
    result = service.enabiz_send_data_packet(
        db, access.tenant_id,
        tc_kimlik_no=body.tc_kimlik_no,
        packet_type=body.packet_type,
        data_entries=body.data_entries,
    )
    return _to_gov_response(result)


@router.post(
    "/enabiz/patient-summary",
    operation_id="enabizPatientSummary",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def enabiz_patient_summary(
    body: EnabizPatientSummaryRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.enabiz")),
    db: Session = Depends(get_db),
):
    """Query patient health summary from e-Nabiz."""
    result = service.enabiz_query_patient_summary(
        db, access.tenant_id,
        tc_kimlik_no=body.tc_kimlik_no,
    )
    return _to_gov_response(result)


@router.post(
    "/enabiz/vaccination",
    operation_id="enabizSendVaccination",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def enabiz_send_vaccination(
    body: EnabizVaccinationRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.enabiz")),
    db: Session = Depends(get_db),
):
    """Send vaccination record to e-Nabiz."""
    result = service.enabiz_send_vaccination(
        db, access.tenant_id,
        tc_kimlik_no=body.tc_kimlik_no,
        vaccine_code=body.vaccine_code,
        vaccine_name=body.vaccine_name,
        dose_number=body.dose_number,
        administration_date=body.administration_date,
        lot_number=body.lot_number,
        administering_doctor_tc=body.administering_doctor_tc,
    )
    return _to_gov_response(result)


@router.post(
    "/enabiz/birth-notification",
    operation_id="enabizBirthNotification",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def enabiz_birth_notification(
    body: EnabizBirthNotificationRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.enabiz")),
    db: Session = Depends(get_db),
):
    """Send birth notification to e-Nabiz."""
    result = service.enabiz_send_birth_notification(
        db, access.tenant_id,
        mother_tc=body.mother_tc,
        birth_date=body.birth_date,
        birth_weight=body.birth_weight,
        gender=body.gender,
        birth_type=body.birth_type,
        hospital_name=body.hospital_name,
    )
    return _to_gov_response(result)


@router.post(
    "/enabiz/death-notification",
    operation_id="enabizDeathNotification",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def enabiz_death_notification(
    body: EnabizDeathNotificationRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.enabiz")),
    db: Session = Depends(get_db),
):
    """Send death notification to e-Nabiz."""
    result = service.enabiz_send_death_notification(
        db, access.tenant_id,
        tc_kimlik_no=body.tc_kimlik_no,
        death_date=body.death_date,
        death_cause_icd=body.death_cause_icd,
        death_place=body.death_place,
    )
    return _to_gov_response(result)


# ===========================================================================
# MHRS Endpoints
# ===========================================================================

@router.post(
    "/mhrs/sync-availability",
    operation_id="mhrsSyncAvailability",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def mhrs_sync_availability(
    body: MHRSSyncAvailabilityRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.mhrs")),
    db: Session = Depends(get_db),
):
    """Synchronize doctor availability with MHRS."""
    result = service.mhrs_sync_doctor_availability(
        db, access.tenant_id,
        doctor_tc=body.doctor_tc,
        branch_code=body.branch_code,
        availability_slots=body.availability_slots,
    )
    return _to_gov_response(result)


@router.post(
    "/mhrs/appointments",
    operation_id="mhrsGetAppointments",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def mhrs_get_appointments(
    body: MHRSGetAppointmentsRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.mhrs")),
    db: Session = Depends(get_db),
):
    """Retrieve appointments from MHRS."""
    result = service.mhrs_get_appointments(
        db, access.tenant_id,
        start_date=body.start_date,
        end_date=body.end_date,
        doctor_tc=body.doctor_tc,
        branch_code=body.branch_code,
        status=body.status,
    )
    return _to_gov_response(result)


@router.post(
    "/mhrs/confirm-appointment",
    operation_id="mhrsConfirmAppointment",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def mhrs_confirm_appointment(
    body: MHRSConfirmAppointmentRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.mhrs")),
    db: Session = Depends(get_db),
):
    """Confirm an MHRS appointment."""
    result = service.mhrs_confirm_appointment(
        db, access.tenant_id,
        randevu_id=body.randevu_id,
        confirmation_note=body.confirmation_note,
    )
    return _to_gov_response(result)


@router.post(
    "/mhrs/cancel-appointment",
    operation_id="mhrsCancelAppointment",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def mhrs_cancel_appointment(
    body: MHRSCancelAppointmentRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.mhrs")),
    db: Session = Depends(get_db),
):
    """Cancel an MHRS appointment."""
    result = service.mhrs_cancel_appointment(
        db, access.tenant_id,
        randevu_id=body.randevu_id,
        cancel_reason=body.cancel_reason,
    )
    return _to_gov_response(result)


# ===========================================================================
# ITS Endpoints
# ===========================================================================

@router.post(
    "/its/verify-barcode",
    operation_id="itsVerifyBarcode",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def its_verify_barcode(
    body: ITSVerifyBarcodeRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.its")),
    db: Session = Depends(get_db),
):
    """Verify a drug barcode against ITS."""
    result = service.its_verify_drug_barcode(
        db, access.tenant_id,
        barcode=body.barcode,
        gtin=body.gtin,
    )
    return _to_gov_response(result)


@router.post(
    "/its/notify-dispensing",
    operation_id="itsNotifyDispensing",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def its_notify_dispensing(
    body: ITSNotifyDispensingRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.its")),
    db: Session = Depends(get_db),
):
    """Notify ITS that a drug has been dispensed."""
    result = service.its_notify_dispensing(
        db, access.tenant_id,
        barcode=body.barcode,
        patient_tc=body.patient_tc,
        prescription_id=body.prescription_id,
        dispensing_type=body.dispensing_type,
        quantity=body.quantity,
    )
    return _to_gov_response(result)


@router.post(
    "/its/drug-status",
    operation_id="itsQueryDrugStatus",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def its_query_drug_status(
    body: ITSQueryDrugStatusRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.its")),
    db: Session = Depends(get_db),
):
    """Query the status of a drug in ITS."""
    result = service.its_query_drug_status(
        db, access.tenant_id,
        barcode=body.barcode,
    )
    return _to_gov_response(result)


# ===========================================================================
# Teleradyoloji Endpoints
# ===========================================================================

@router.post(
    "/teleradyoloji/send-study",
    operation_id="teleradyolojiSendStudy",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def teleradyoloji_send_study(
    body: TeleradyolojiSendStudyRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.teleradyoloji")),
    db: Session = Depends(get_db),
):
    """Submit a radiology study for remote interpretation."""
    result = service.teleradyoloji_send_study(
        db, access.tenant_id,
        patient_tc=body.patient_tc,
        study_uid=body.study_uid,
        modality=body.modality,
        body_part=body.body_part,
        study_description=body.study_description,
        accession_number=body.accession_number,
        referring_doctor=body.referring_doctor,
        priority=body.priority,
        dicom_endpoint=body.dicom_endpoint,
    )
    return _to_gov_response(result)


@router.post(
    "/teleradyoloji/query-status",
    operation_id="teleradyolojiQueryStatus",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def teleradyoloji_query_status(
    body: TeleradyolojiQueryStatusRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.teleradyoloji")),
    db: Session = Depends(get_db),
):
    """Query the interpretation status of a submitted study."""
    result = service.teleradyoloji_query_status(
        db, access.tenant_id,
        study_uid=body.study_uid,
        calisma_id=body.calisma_id,
    )
    return _to_gov_response(result)


@router.post(
    "/teleradyoloji/receive-report",
    operation_id="teleradyolojiReceiveReport",
    response_model=ResponseEnvelope[GovOperationResponse],
)
def teleradyoloji_receive_report(
    body: TeleradyolojiReceiveReportRequest,
    access: UnifiedAccess = Depends(require_access("hbys.gov_integration.teleradyoloji")),
    db: Session = Depends(get_db),
):
    """Retrieve the radiology report for a completed study."""
    result = service.teleradyoloji_receive_report(
        db, access.tenant_id,
        study_uid=body.study_uid,
        calisma_id=body.calisma_id,
    )
    return _to_gov_response(result)
