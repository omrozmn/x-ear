"""
MEDULA e-Recete SOAP Client (Stub)
===================================
Stub implementation for the MEDULA (SGK) e-Recete web service.

Uses zeep-style SOAP patterns with the correct envelope structure.
In production, replace the WSDL_URL and credentials with real values
from SGK/MEDULA integration documentation.

MEDULA e-Recete Service:
  - eReceteGiris  : Submit a new prescription
  - eReceteIptal  : Cancel an existing prescription
  - eReceteSorgula: Query prescription status

Reference WSDL (placeholder):
  https://medula.sgk.gov.tr/hastane/services/eReceteServis?wsdl
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape as xml_escape

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Placeholder -- replace with real MEDULA WSDL in production
WSDL_URL = "https://medula.sgk.gov.tr/hastane/services/eReceteServis?wsdl"

# SOAP namespace used by MEDULA
MEDULA_NS = "http://saglik.gov.tr/medula/erecete"


@dataclass
class MedulaCredentials:
    """Credentials required for MEDULA SOAP authentication."""
    tesis_kodu: str = ""        # Facility code
    kullanici_adi: str = ""     # Username
    sifre: str = ""             # Password
    doktor_tc: str = ""         # Doctor TC identity number


@dataclass
class MedulaDiagnosisEntry:
    """ICD-10 diagnosis for a MEDULA prescription."""
    code: str
    name: str = ""
    is_primary: bool = False


@dataclass
class MedulaMedicationEntry:
    """Single medication line item for MEDULA."""
    medication_code: str
    medication_name: str
    dosage: str = ""
    dosage_form: str = ""
    frequency: str = ""
    duration_days: int = 0
    quantity: int = 0
    box_count: int = 1
    usage_instructions: str = ""
    is_generic_allowed: bool = True


@dataclass
class MedulaPrescriptionRequest:
    """Full payload for eReceteGiris."""
    patient_tc: str
    doctor_tc: str
    tesis_kodu: str
    protocol_no: str
    prescription_type: str = "N"  # N=Normal, K=Kirmizi, Y=Yesil, T=Turuncu, M=Mor
    diagnoses: List[MedulaDiagnosisEntry] = field(default_factory=list)
    medications: List[MedulaMedicationEntry] = field(default_factory=list)
    notes: str = ""


@dataclass
class MedulaResponse:
    """Parsed response from MEDULA."""
    success: bool = False
    medula_prescription_id: Optional[str] = None
    sonuc_kodu: Optional[str] = None
    sonuc_mesaji: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Type mapping helper
# ---------------------------------------------------------------------------

_TYPE_MAP = {
    "normal": "N",
    "red": "K",      # Kirmizi
    "green": "Y",    # Yesil
    "orange": "T",   # Turuncu
    "purple": "M",   # Mor
}


def _map_prescription_type(ptype: str) -> str:
    return _TYPE_MAP.get(ptype, "N")


# ---------------------------------------------------------------------------
# SOAP Envelope Builders
# ---------------------------------------------------------------------------

def _build_erecete_giris_envelope(
    creds: MedulaCredentials,
    request: MedulaPrescriptionRequest,
) -> str:
    """
    Build the SOAP XML envelope for eReceteGiris.

    This follows the MEDULA e-Recete WSDL contract.  The XML is built
    manually to make the structure explicit; in a real integration you
    would use ``zeep.Client(WSDL_URL)`` instead.
    """
    # Build diagnosis XML
    diagnosis_xml_parts = []
    for dx in request.diagnoses:
        primary_flag = "1" if dx.is_primary else "0"
        diagnosis_xml_parts.append(
            f"""
            <tani>
                <taniKodu>{xml_escape(dx.code)}</taniKodu>
                <taniAdi>{xml_escape(dx.name)}</taniAdi>
                <anaTesBilgisi>{primary_flag}</anaTesBilgisi>
            </tani>"""
        )
    diagnoses_xml = "".join(diagnosis_xml_parts)

    # Build medication XML
    med_xml_parts = []
    for med in request.medications:
        generic_flag = "1" if med.is_generic_allowed else "0"
        med_xml_parts.append(
            f"""
            <ilac>
                <ilacKodu>{xml_escape(med.medication_code)}</ilacKodu>
                <ilacAdi>{xml_escape(med.medication_name)}</ilacAdi>
                <ilacDoz>{xml_escape(med.dosage)}</ilacDoz>
                <ilacFormu>{xml_escape(med.dosage_form)}</ilacFormu>
                <kullanimSikligi>{xml_escape(med.frequency)}</kullanimSikligi>
                <kullanimSuresi>{med.duration_days}</kullanimSuresi>
                <adet>{med.quantity}</adet>
                <kutuAdet>{med.box_count}</kutuAdet>
                <kullanimTarifi>{xml_escape(med.usage_instructions)}</kullanimTarifi>
                <muadilIzin>{generic_flag}</muadilIzin>
            </ilac>"""
        )
    medications_xml = "".join(med_xml_parts)

    recete_turu = _map_prescription_type(request.prescription_type)

    envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ere="{MEDULA_NS}">
    <soapenv:Header/>
    <soapenv:Body>
        <ere:eReceteGirisIstegi>
            <ere:tesisKodu>{xml_escape(request.tesis_kodu)}</ere:tesisKodu>
            <ere:kullaniciAdi>{xml_escape(creds.kullanici_adi)}</ere:kullaniciAdi>
            <ere:sifre>{xml_escape(creds.sifre)}</ere:sifre>
            <ere:doktorTcKimlikNo>{xml_escape(request.doctor_tc)}</ere:doktorTcKimlikNo>
            <ere:hastaTcKimlikNo>{xml_escape(request.patient_tc)}</ere:hastaTcKimlikNo>
            <ere:protokolNo>{xml_escape(request.protocol_no)}</ere:protokolNo>
            <ere:receteTuru>{xml_escape(recete_turu)}</ere:receteTuru>
            <ere:aciklama>{xml_escape(request.notes)}</ere:aciklama>
            <ere:tanilar>{diagnoses_xml}
            </ere:tanilar>
            <ere:ilaclar>{medications_xml}
            </ere:ilaclar>
        </ere:eReceteGirisIstegi>
    </soapenv:Body>
</soapenv:Envelope>"""
    return envelope


def _build_erecete_iptal_envelope(
    creds: MedulaCredentials,
    medula_prescription_id: str,
    cancel_reason: str = "",
) -> str:
    """Build SOAP envelope for eReceteIptal (cancellation)."""
    envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ere="{MEDULA_NS}">
    <soapenv:Header/>
    <soapenv:Body>
        <ere:eReceteIptalIstegi>
            <ere:tesisKodu>{xml_escape(creds.tesis_kodu)}</ere:tesisKodu>
            <ere:kullaniciAdi>{xml_escape(creds.kullanici_adi)}</ere:kullaniciAdi>
            <ere:sifre>{xml_escape(creds.sifre)}</ere:sifre>
            <ere:eReceteNo>{xml_escape(medula_prescription_id)}</ere:eReceteNo>
            <ere:iptalNedeni>{xml_escape(cancel_reason)}</ere:iptalNedeni>
        </ere:eReceteIptalIstegi>
    </soapenv:Body>
</soapenv:Envelope>"""
    return envelope


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class MedulaEReceteClient:
    """
    MEDULA e-Recete SOAP client.

    **STUB IMPLEMENTATION** -- all calls return simulated responses.
    Replace the ``_send_soap_request`` method with a real HTTP call
    (using ``zeep`` or ``httpx``) for production use.
    """

    def __init__(self, credentials: Optional[MedulaCredentials] = None):
        self.credentials = credentials or MedulaCredentials()
        self.wsdl_url = WSDL_URL
        # In production:
        # from zeep import Client
        # self.zeep_client = Client(wsdl=self.wsdl_url)

    # ------------------------------------------------------------------
    # Stub transport
    # ------------------------------------------------------------------

    def _send_soap_request(self, envelope: str, action: str) -> Dict[str, Any]:
        """
        Stub: simulate sending a SOAP request.

        In production, use:
            import httpx
            resp = httpx.post(
                self.wsdl_url,
                content=envelope.encode("utf-8"),
                headers={
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": action,
                },
            )
            # parse resp.text with lxml / zeep
        """
        logger.info(
            "MEDULA STUB: Would send SOAP %s to %s (%d bytes)",
            action,
            self.wsdl_url,
            len(envelope),
        )
        return {
            "sonucKodu": "0000",
            "sonucMesaji": "STUB: Islem basarili (simulated)",
            "eReceteNo": "ERX-STUB-0001",
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send_prescription(
        self,
        request: MedulaPrescriptionRequest,
    ) -> MedulaResponse:
        """
        Submit a prescription to MEDULA (eReceteGiris).

        Returns a ``MedulaResponse`` with the assigned ``medula_prescription_id``
        on success.
        """
        envelope = _build_erecete_giris_envelope(self.credentials, request)
        raw = self._send_soap_request(envelope, action="eReceteGiris")

        sonuc_kodu = raw.get("sonucKodu", "")
        success = sonuc_kodu == "0000"

        return MedulaResponse(
            success=success,
            medula_prescription_id=raw.get("eReceteNo") if success else None,
            sonuc_kodu=sonuc_kodu,
            sonuc_mesaji=raw.get("sonucMesaji"),
            raw=raw,
        )

    def cancel_prescription(
        self,
        medula_prescription_id: str,
        cancel_reason: str = "",
    ) -> MedulaResponse:
        """
        Cancel an existing prescription on MEDULA (eReceteIptal).
        """
        envelope = _build_erecete_iptal_envelope(
            self.credentials,
            medula_prescription_id,
            cancel_reason,
        )
        raw = self._send_soap_request(envelope, action="eReceteIptal")

        sonuc_kodu = raw.get("sonucKodu", "")
        success = sonuc_kodu == "0000"

        return MedulaResponse(
            success=success,
            sonuc_kodu=sonuc_kodu,
            sonuc_mesaji=raw.get("sonucMesaji"),
            raw=raw,
        )

    def query_prescription(
        self,
        medula_prescription_id: str,
    ) -> MedulaResponse:
        """
        Query prescription status on MEDULA (eReceteSorgula).
        Stub returns a generic success.
        """
        logger.info(
            "MEDULA STUB: eReceteSorgula for %s", medula_prescription_id
        )
        return MedulaResponse(
            success=True,
            medula_prescription_id=medula_prescription_id,
            sonuc_kodu="0000",
            sonuc_mesaji="STUB: Recete bulundu (simulated)",
            raw={"eReceteNo": medula_prescription_id, "durum": "approved"},
        )
