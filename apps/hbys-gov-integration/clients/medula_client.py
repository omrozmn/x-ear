"""
Medula (SGK) SOAP Client
Provides stub implementations for SGK Medula web service operations
using zeep-style SOAP envelope patterns.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape as xml_escape

from config import (
    MEDULA_WSDL_URL, MEDULA_TEST_WSDL_URL, MEDULA_USERNAME,
    MEDULA_PASSWORD, MEDULA_FACILITY_CODE, MEDULA_TIMEOUT, MEDULA_USE_TEST,
)

logger = logging.getLogger(__name__)

# SOAP namespaces used by Medula
SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
MEDULA_NS = "http://hastane.sgk.gov.tr"


def _build_soap_envelope(operation: str, body_xml: str) -> str:
    """Build a complete SOAP envelope for Medula."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="{SOAP_NS}"
    xmlns:has="{MEDULA_NS}">
    <soapenv:Header>
        <has:kullaniciAdi>{MEDULA_USERNAME}</has:kullaniciAdi>
        <has:sifre>{MEDULA_PASSWORD}</has:sifre>
        <has:tesisKodu>{MEDULA_FACILITY_CODE}</has:tesisKodu>
    </soapenv:Header>
    <soapenv:Body>
        <has:{operation}>
            {body_xml}
        </has:{operation}>
    </soapenv:Body>
</soapenv:Envelope>"""


def _parse_soap_response(xml_text: str) -> Dict[str, Any]:
    """Parse a SOAP response envelope and extract the body content."""
    try:
        root = ET.fromstring(xml_text)
        body = root.find(f".//{{{SOAP_NS}}}Body")
        if body is None:
            return {"error": "No SOAP Body found in response"}

        # Check for SOAP fault
        fault = body.find(f".//{{{SOAP_NS}}}Fault")
        if fault is not None:
            fault_string = fault.findtext("faultstring", "Unknown SOAP fault")
            return {"error": fault_string, "fault": True}

        # Extract all child elements as dict
        result = {}
        for child in body.iter():
            if child.text and child.text.strip():
                tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                result[tag] = child.text.strip()
        return result
    except ET.ParseError as e:
        return {"error": f"XML parse error: {str(e)}"}


class MedulaClient:
    """
    Client for SGK Medula SOAP web services.
    All methods are stubs that build correct SOAP envelopes and return
    simulated responses. Replace with actual zeep/httpx calls in production.
    """

    def __init__(self):
        self.wsdl_url = MEDULA_TEST_WSDL_URL if MEDULA_USE_TEST else MEDULA_WSDL_URL
        self.timeout = MEDULA_TIMEOUT

    def _get_request_meta(self, operation: str) -> Dict[str, Any]:
        """Return common metadata for logging."""
        return {
            "system_name": "medula",
            "operation": operation,
            "wsdl_url": self.wsdl_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ----- Login / Authentication -----

    def login(self) -> Dict[str, Any]:
        """
        Authenticate with Medula. Returns a session token.
        In production, zeep would handle WSDL discovery and call automatically.
        """
        body_xml = f"""
            <has:kullaniciAdi>{MEDULA_USERNAME}</has:kullaniciAdi>
            <has:sifre>{MEDULA_PASSWORD}</has:sifre>
            <has:tesisKodu>{MEDULA_FACILITY_CODE}</has:tesisKodu>
        """
        envelope = _build_soap_envelope("login", body_xml)
        logger.info("Medula login request built for facility %s", MEDULA_FACILITY_CODE)

        # STUB: Simulate successful login
        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Basarili",
                "oturumToken": "STUB-TOKEN-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
            },
            **self._get_request_meta("login"),
        }

    # ----- Provizyon (Authorization) -----

    def provizyon_sorgula(
        self,
        tc_kimlik_no: str,
        provizyon_tipi: str = "N",
        tedavi_tipi: str = "A",
        takip_no: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Query SGK patient authorization (provizyon sorgulama).
        provizyon_tipi: N=Normal, A=Acil, I=Is Kazasi, M=Meslek Hastaligi
        tedavi_tipi: A=Ayaktan, Y=Yatan
        """
        body_xml = f"""
            <has:tcKimlikNo>{xml_escape(tc_kimlik_no)}</has:tcKimlikNo>
            <has:provizyonTipi>{xml_escape(provizyon_tipi)}</has:provizyonTipi>
            <has:tedaviTipi>{xml_escape(tedavi_tipi)}</has:tedaviTipi>
            <has:tesisKodu>{xml_escape(MEDULA_FACILITY_CODE)}</has:tesisKodu>
        """
        if takip_no:
            body_xml += f"<has:takipNo>{xml_escape(takip_no)}</has:takipNo>"

        envelope = _build_soap_envelope("provizyonSorgula", body_xml)
        logger.info("Medula provizyon query for TC: %s***", tc_kimlik_no[:3])

        # STUB response
        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Basarili",
                "takipNo": takip_no or f"STUB-TKP-{tc_kimlik_no[-4:]}",
                "hastaBasvuruNo": f"HBN-{tc_kimlik_no[-6:]}",
                "provizyonTipi": provizyon_tipi,
                "tedaviTipi": tedavi_tipi,
                "sigortaliTuru": "1",
                "depiramKurumu": "SGK",
            },
            **self._get_request_meta("provizyonSorgula"),
        }

    # ----- Hasta Yatis (Inpatient Admission) -----

    def hasta_yatis(
        self,
        takip_no: str,
        tc_kimlik_no: str,
        yatis_tarihi: str,
        klinik_kodu: str,
        yatak_kodu: str,
    ) -> Dict[str, Any]:
        """Register an inpatient admission with Medula."""
        body_xml = f"""
            <has:takipNo>{xml_escape(takip_no)}</has:takipNo>
            <has:tcKimlikNo>{xml_escape(tc_kimlik_no)}</has:tcKimlikNo>
            <has:yatisTarihi>{xml_escape(yatis_tarihi)}</has:yatisTarihi>
            <has:klinikKodu>{xml_escape(klinik_kodu)}</has:klinikKodu>
            <has:yatakKodu>{xml_escape(yatak_kodu)}</has:yatakKodu>
            <has:tesisKodu>{xml_escape(MEDULA_FACILITY_CODE)}</has:tesisKodu>
        """
        envelope = _build_soap_envelope("hastaYatis", body_xml)
        logger.info("Medula hastaYatis for takip: %s", takip_no)

        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Hasta yatisi basarili",
                "yatisNo": f"STUB-YAT-{takip_no[-6:]}",
                "takipNo": takip_no,
            },
            **self._get_request_meta("hastaYatis"),
        }

    # ----- Hasta Cikis (Inpatient Discharge) -----

    def hasta_cikis(
        self,
        takip_no: str,
        cikis_tarihi: str,
        cikis_nedeni: str = "1",  # 1=Sifa, 2=Sevk, 3=Olum, 4=Istek
    ) -> Dict[str, Any]:
        """Register an inpatient discharge with Medula."""
        body_xml = f"""
            <has:takipNo>{xml_escape(takip_no)}</has:takipNo>
            <has:cikisTarihi>{xml_escape(cikis_tarihi)}</has:cikisTarihi>
            <has:cikisNedeni>{xml_escape(cikis_nedeni)}</has:cikisNedeni>
            <has:tesisKodu>{xml_escape(MEDULA_FACILITY_CODE)}</has:tesisKodu>
        """
        envelope = _build_soap_envelope("hastaCikis", body_xml)
        logger.info("Medula hastaCikis for takip: %s", takip_no)

        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Hasta cikisi basarili",
                "takipNo": takip_no,
                "cikisNedeni": cikis_nedeni,
            },
            **self._get_request_meta("hastaCikis"),
        }

    # ----- Hizmet Kaydet (Service Registration) -----

    def hizmet_kaydet(
        self,
        takip_no: str,
        sut_kodu: str,
        adet: int = 1,
        tarih: Optional[str] = None,
        doktor_tc: Optional[str] = None,
        tani_listesi: Optional[list] = None,
    ) -> Dict[str, Any]:
        """Register a medical service (SUT code) with Medula."""
        tarih = tarih or datetime.now(timezone.utc).strftime("%d.%m.%Y")
        tani_xml = ""
        if tani_listesi:
            for tani in tani_listesi:
                tani_xml += f"""
                <has:tani>
                    <has:taniKodu>{tani.get('kod', '')}</has:taniKodu>
                    <has:taniTipi>{tani.get('tip', 'A')}</has:taniTipi>
                </has:tani>"""

        body_xml = f"""
            <has:takipNo>{takip_no}</has:takipNo>
            <has:islemListesi>
                <has:islem>
                    <has:sutKodu>{sut_kodu}</has:sutKodu>
                    <has:adet>{adet}</has:adet>
                    <has:tarih>{tarih}</has:tarih>
                    {"<has:drTcKimlikNo>" + doktor_tc + "</has:drTcKimlikNo>" if doktor_tc else ""}
                </has:islem>
            </has:islemListesi>
            {f"<has:taniListesi>{tani_xml}</has:taniListesi>" if tani_xml else ""}
            <has:tesisKodu>{MEDULA_FACILITY_CODE}</has:tesisKodu>
        """
        envelope = _build_soap_envelope("hizmetKaydet", body_xml)
        logger.info("Medula hizmetKaydet SUT=%s for takip: %s", sut_kodu, takip_no)

        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Hizmet kaydedildi",
                "islemSiraNo": f"STUB-ISL-{takip_no[-4:]}-{sut_kodu}",
                "takipNo": takip_no,
            },
            **self._get_request_meta("hizmetKaydet"),
        }

    # ----- Fatura Bilgisi Kaydet (Invoice Registration) -----

    def fatura_bilgisi_kaydet(
        self,
        takip_no: str,
        fatura_no: str,
        fatura_tarihi: str,
        toplam_tutar: float,
        kdv_tutari: float = 0.0,
    ) -> Dict[str, Any]:
        """Register invoice information with Medula for reimbursement."""
        body_xml = f"""
            <has:takipNo>{takip_no}</has:takipNo>
            <has:faturaBilgisi>
                <has:faturaNo>{fatura_no}</has:faturaNo>
                <has:faturaTarihi>{fatura_tarihi}</has:faturaTarihi>
                <has:toplamTutar>{toplam_tutar:.2f}</has:toplamTutar>
                <has:kdvTutari>{kdv_tutari:.2f}</has:kdvTutari>
            </has:faturaBilgisi>
            <has:tesisKodu>{MEDULA_FACILITY_CODE}</has:tesisKodu>
        """
        envelope = _build_soap_envelope("faturaBilgisiKaydet", body_xml)
        logger.info("Medula faturaBilgisiKaydet invoice=%s for takip: %s", fatura_no, takip_no)

        return {
            "request_xml": envelope,
            "response": {
                "sonucKodu": "0000",
                "sonucMesaji": "Fatura bilgisi kaydedildi",
                "faturaNo": fatura_no,
                "takipNo": takip_no,
                "onayDurumu": "beklemede",
            },
            **self._get_request_meta("faturaBilgisiKaydet"),
        }
