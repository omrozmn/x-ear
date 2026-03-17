"""
Government Integration Pydantic Schemas
Request / Response schemas for all government health system integrations.
"""
from datetime import datetime
from typing import Optional, List, Literal, Dict, Any

from pydantic import Field

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


# ===========================================================================
# Integration Log Schemas
# ===========================================================================

class GovIntegrationLogRead(AppBaseModel, IDMixin, TimestampMixin):
    system_name: str
    operation: str
    request_data: Optional[str] = None
    response_data: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    request_timestamp: Optional[datetime] = None
    response_timestamp: Optional[datetime] = None
    retry_count: int = 0
    correlation_id: Optional[str] = None
    tenant_id: Optional[str] = None


class GovIntegrationLogFilter(AppBaseModel):
    system_name: Optional[
        Literal["medula", "enabiz", "skrs", "mhrs", "its", "teleradyoloji"]
    ] = None
    status: Optional[Literal["success", "error", "timeout", "pending"]] = None
    correlation_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# ===========================================================================
# Medula Schemas
# ===========================================================================

class MedulaLoginRequest(AppBaseModel):
    """Trigger Medula login (uses configured credentials)."""
    pass


class MedulaProvizyonRequest(AppBaseModel):
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11, description="TC Kimlik No")
    provizyon_tipi: Literal["N", "A", "I", "M"] = Field(
        "N", description="N=Normal, A=Acil, I=Is Kazasi, M=Meslek Hastaligi"
    )
    tedavi_tipi: Literal["A", "Y"] = Field("A", description="A=Ayaktan, Y=Yatan")
    takip_no: Optional[str] = None


class MedulaHastaYatisRequest(AppBaseModel):
    takip_no: str = Field(..., min_length=1)
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11)
    yatis_tarihi: str = Field(..., description="Format: dd.MM.yyyy")
    klinik_kodu: str = Field(..., min_length=1)
    yatak_kodu: str = Field(..., min_length=1)


class MedulaHastaCikisRequest(AppBaseModel):
    takip_no: str = Field(..., min_length=1)
    cikis_tarihi: str = Field(..., description="Format: dd.MM.yyyy")
    cikis_nedeni: Literal["1", "2", "3", "4"] = Field(
        "1", description="1=Sifa, 2=Sevk, 3=Olum, 4=Istek"
    )


class MedulaTaniItem(AppBaseModel):
    kod: str
    tip: Literal["A", "T"] = "A"  # A=Ana tani, T=Tali tani


class MedulaHizmetKaydetRequest(AppBaseModel):
    takip_no: str = Field(..., min_length=1)
    sut_kodu: str = Field(..., min_length=1, description="SUT procedure code")
    adet: int = Field(1, ge=1)
    tarih: Optional[str] = Field(None, description="Format: dd.MM.yyyy")
    doktor_tc: Optional[str] = Field(None, min_length=11, max_length=11)
    tani_listesi: Optional[List[MedulaTaniItem]] = None


class MedulaFaturaRequest(AppBaseModel):
    takip_no: str = Field(..., min_length=1)
    fatura_no: str = Field(..., min_length=1)
    fatura_tarihi: str = Field(..., description="Format: dd.MM.yyyy")
    toplam_tutar: float = Field(..., ge=0)
    kdv_tutari: float = Field(0.0, ge=0)


# ===========================================================================
# e-Nabiz Schemas
# ===========================================================================

class EnabizDataEntry(AppBaseModel):
    code: str
    display: str = ""
    value: str = ""
    date: str = ""


class EnabizSendDataPacketRequest(AppBaseModel):
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11)
    packet_type: str = Field(
        ..., description="muayene, laboratuvar, radyoloji, ameliyat, epikriz, etc."
    )
    data_entries: List[EnabizDataEntry]


class EnabizPatientSummaryRequest(AppBaseModel):
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11)


class EnabizVaccinationRequest(AppBaseModel):
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11)
    vaccine_code: str
    vaccine_name: str
    dose_number: int = Field(..., ge=1)
    administration_date: str = Field(..., description="Format: yyyyMMdd")
    lot_number: Optional[str] = None
    administering_doctor_tc: Optional[str] = Field(None, min_length=11, max_length=11)


class EnabizBirthNotificationRequest(AppBaseModel):
    mother_tc: str = Field(..., min_length=11, max_length=11)
    birth_date: str = Field(..., description="Format: yyyyMMdd")
    birth_weight: float = Field(..., ge=0, description="Weight in grams")
    gender: Literal["E", "K"] = Field(..., description="E=Erkek, K=Kadin")
    birth_type: Literal["normal", "sezeryan"] = "normal"
    hospital_name: Optional[str] = None


class EnabizDeathNotificationRequest(AppBaseModel):
    tc_kimlik_no: str = Field(..., min_length=11, max_length=11)
    death_date: str = Field(..., description="Format: yyyyMMdd")
    death_cause_icd: str = Field(..., description="ICD-10 code for cause of death")
    death_place: Literal["hastane", "ev", "diger"] = "hastane"


# ===========================================================================
# MHRS Schemas
# ===========================================================================

class MHRSAvailabilitySlot(AppBaseModel):
    date: str = Field(..., description="Format: yyyy-MM-dd")
    start: str = Field(..., description="Format: HH:mm")
    end: str = Field(..., description="Format: HH:mm")
    status: Literal["aktif", "pasif"] = "aktif"


class MHRSSyncAvailabilityRequest(AppBaseModel):
    doctor_tc: str = Field(..., min_length=11, max_length=11)
    branch_code: str = Field(..., min_length=1)
    availability_slots: List[MHRSAvailabilitySlot]


class MHRSGetAppointmentsRequest(AppBaseModel):
    start_date: str = Field(..., description="Format: yyyy-MM-dd")
    end_date: str = Field(..., description="Format: yyyy-MM-dd")
    doctor_tc: Optional[str] = Field(None, min_length=11, max_length=11)
    branch_code: Optional[str] = None
    status: Optional[str] = None


class MHRSConfirmAppointmentRequest(AppBaseModel):
    randevu_id: str = Field(..., min_length=1)
    confirmation_note: Optional[str] = None


class MHRSCancelAppointmentRequest(AppBaseModel):
    randevu_id: str = Field(..., min_length=1)
    cancel_reason: str = "kurum_talebi"


# ===========================================================================
# ITS Schemas
# ===========================================================================

class ITSVerifyBarcodeRequest(AppBaseModel):
    barcode: str = Field(..., min_length=1)
    gtin: Optional[str] = None


class ITSNotifyDispensingRequest(AppBaseModel):
    barcode: str = Field(..., min_length=1)
    patient_tc: str = Field(..., min_length=11, max_length=11)
    prescription_id: str = Field(..., min_length=1)
    dispensing_type: Literal["eczane", "hastane"] = "hastane"
    quantity: int = Field(1, ge=1)


class ITSQueryDrugStatusRequest(AppBaseModel):
    barcode: str = Field(..., min_length=1)


# ===========================================================================
# Teleradyoloji Schemas
# ===========================================================================

class TeleradyolojiSendStudyRequest(AppBaseModel):
    patient_tc: str = Field(..., min_length=11, max_length=11)
    study_uid: str = Field(..., min_length=1, description="DICOM Study Instance UID")
    modality: str = Field(..., description="CT, MR, CR, US, etc.")
    body_part: str
    study_description: str
    accession_number: str
    referring_doctor: Optional[str] = None
    priority: Literal["normal", "acil"] = "normal"
    dicom_endpoint: Optional[str] = None


class TeleradyolojiQueryStatusRequest(AppBaseModel):
    study_uid: Optional[str] = None
    calisma_id: Optional[str] = None


class TeleradyolojiReceiveReportRequest(AppBaseModel):
    study_uid: Optional[str] = None
    calisma_id: Optional[str] = None


# ===========================================================================
# Generic Gov Response Schema
# ===========================================================================

class GovOperationResponse(AppBaseModel):
    """Generic wrapper for a government system operation result."""
    system_name: str
    operation: str
    status: Literal["success", "error", "timeout", "pending"]
    response_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    correlation_id: Optional[str] = None
    log_id: Optional[str] = None
