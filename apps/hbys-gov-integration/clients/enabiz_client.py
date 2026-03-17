"""
e-Nabiz (Ministry of Health) XML Client
Provides stub implementations for e-Nabiz health data exchange.
Uses XML-based data packets for patient health record synchronization.
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from xml.etree import ElementTree as ET

from config import (
    ENABIZ_BASE_URL, ENABIZ_TEST_BASE_URL, ENABIZ_API_KEY,
    ENABIZ_SECRET, ENABIZ_FACILITY_OID, ENABIZ_TIMEOUT, ENABIZ_USE_TEST,
)

logger = logging.getLogger(__name__)

ENABIZ_XML_NS = "urn:hl7-org:v3"


def _build_enabiz_header(message_type: str) -> str:
    """Build standard e-Nabiz XML header."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="{ENABIZ_XML_NS}">
    <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
    <id root="{ENABIZ_FACILITY_OID}" extension="MSG-{ts}"/>
    <code code="{message_type}" codeSystem="2.16.840.1.113883.6.1"/>
    <effectiveTime value="{ts}"/>
    <confidentialityCode code="N"/>
    <author>
        <assignedAuthor>
            <id root="{ENABIZ_FACILITY_OID}"/>
        </assignedAuthor>
    </author>
    <custodian>
        <assignedCustodian>
            <representedCustodianOrganization>
                <id root="{ENABIZ_FACILITY_OID}"/>
            </representedCustodianOrganization>
        </assignedCustodian>
    </custodian>"""


class EnabizClient:
    """
    Client for e-Nabiz (Electronic Health Record) XML-based API.
    All methods are stubs that build correct XML payloads and return
    simulated responses.
    """

    def __init__(self):
        self.base_url = ENABIZ_TEST_BASE_URL if ENABIZ_USE_TEST else ENABIZ_BASE_URL
        self.timeout = ENABIZ_TIMEOUT

    def _get_request_meta(self, operation: str) -> Dict[str, Any]:
        return {
            "system_name": "enabiz",
            "operation": operation,
            "base_url": self.base_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ----- Send Data Packet -----

    def send_data_packet(
        self,
        tc_kimlik_no: str,
        packet_type: str,
        data_entries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Send a generic data packet to e-Nabiz.
        packet_type: muayene, laboratuvar, radyoloji, ameliyat, epikriz, etc.
        """
        header = _build_enabiz_header(packet_type.upper())
        entries_xml = ""
        for entry in data_entries:
            entries_xml += f"""
        <entry>
            <code code="{entry.get('code', '')}" displayName="{entry.get('display', '')}"/>
            <value>{entry.get('value', '')}</value>
            <effectiveTime value="{entry.get('date', '')}"/>
        </entry>"""

        payload = f"""{header}
    <recordTarget>
        <patientRole>
            <id extension="{tc_kimlik_no}" root="2.16.840.1.113883.3.4808"/>
        </patientRole>
    </recordTarget>
    <component>
        <structuredBody>
            <component>
                <section>
                    {entries_xml}
                </section>
            </component>
        </structuredBody>
    </component>
</ClinicalDocument>"""

        logger.info("e-Nabiz send_data_packet type=%s for TC: %s***", packet_type, tc_kimlik_no[:3])

        return {
            "request_xml": payload,
            "response": {
                "durum": "basarili",
                "mesaj": "Veri paketi basariyla alindi",
                "paketId": f"STUB-PKT-{tc_kimlik_no[-4:]}",
                "islemZamani": datetime.now(timezone.utc).isoformat(),
            },
            **self._get_request_meta("send_data_packet"),
        }

    # ----- Query Patient Summary -----

    def query_patient_summary(self, tc_kimlik_no: str) -> Dict[str, Any]:
        """Query patient health summary from e-Nabiz."""
        request_data = {
            "tcKimlikNo": tc_kimlik_no,
            "facilityOid": ENABIZ_FACILITY_OID,
            "queryType": "patient_summary",
        }
        logger.info("e-Nabiz query_patient_summary for TC: %s***", tc_kimlik_no[:3])

        return {
            "request_data": json.dumps(request_data),
            "response": {
                "durum": "basarili",
                "hasta": {
                    "tcKimlikNo": tc_kimlik_no,
                    "kanGrubu": "A Rh+",
                    "alerjiler": [],
                    "kronikHastaliklar": [],
                    "sonMuayeneTarihi": "2026-01-15",
                    "aktifIlaclar": [],
                },
            },
            **self._get_request_meta("query_patient_summary"),
        }

    # ----- Send Vaccination Record -----

    def send_vaccination(
        self,
        tc_kimlik_no: str,
        vaccine_code: str,
        vaccine_name: str,
        dose_number: int,
        administration_date: str,
        lot_number: Optional[str] = None,
        administering_doctor_tc: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send vaccination record to e-Nabiz."""
        header = _build_enabiz_header("VACCINATION")
        payload = f"""{header}
    <recordTarget>
        <patientRole>
            <id extension="{tc_kimlik_no}" root="2.16.840.1.113883.3.4808"/>
        </patientRole>
    </recordTarget>
    <component>
        <structuredBody>
            <component>
                <section>
                    <entry>
                        <substanceAdministration>
                            <consumable>
                                <manufacturedProduct>
                                    <code code="{vaccine_code}" displayName="{vaccine_name}"/>
                                    {"<lotNumberText>" + lot_number + "</lotNumberText>" if lot_number else ""}
                                </manufacturedProduct>
                            </consumable>
                            <doseQuantity value="{dose_number}"/>
                            <effectiveTime value="{administration_date}"/>
                            {"<performer><id extension='" + administering_doctor_tc + "'/></performer>" if administering_doctor_tc else ""}
                        </substanceAdministration>
                    </entry>
                </section>
            </component>
        </structuredBody>
    </component>
</ClinicalDocument>"""

        logger.info("e-Nabiz send_vaccination %s dose %d for TC: %s***",
                     vaccine_code, dose_number, tc_kimlik_no[:3])

        return {
            "request_xml": payload,
            "response": {
                "durum": "basarili",
                "mesaj": "Asi kaydi basariyla alindi",
                "asiKayitId": f"STUB-ASI-{tc_kimlik_no[-4:]}-{vaccine_code}",
            },
            **self._get_request_meta("send_vaccination"),
        }

    # ----- Send Birth Notification -----

    def send_birth_notification(
        self,
        mother_tc: str,
        birth_date: str,
        birth_weight: float,
        gender: str,
        birth_type: str = "normal",  # normal / sezeryan
        hospital_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send birth notification to e-Nabiz."""
        header = _build_enabiz_header("BIRTH_NOTIFICATION")
        payload = f"""{header}
    <recordTarget>
        <patientRole>
            <id extension="{mother_tc}" root="2.16.840.1.113883.3.4808"/>
        </patientRole>
    </recordTarget>
    <component>
        <structuredBody>
            <component>
                <section>
                    <entry>
                        <observation>
                            <code code="BIRTH" displayName="Dogum Bildirimi"/>
                            <effectiveTime value="{birth_date}"/>
                            <value xsi:type="PQ" value="{birth_weight}" unit="g"/>
                            <entryRelationship>
                                <observation>
                                    <code code="GENDER" displayName="Cinsiyet"/>
                                    <value>{gender}</value>
                                </observation>
                            </entryRelationship>
                            <entryRelationship>
                                <observation>
                                    <code code="BIRTH_TYPE" displayName="Dogum Tipi"/>
                                    <value>{birth_type}</value>
                                </observation>
                            </entryRelationship>
                        </observation>
                    </entry>
                </section>
            </component>
        </structuredBody>
    </component>
</ClinicalDocument>"""

        logger.info("e-Nabiz send_birth_notification for mother TC: %s***", mother_tc[:3])

        return {
            "request_xml": payload,
            "response": {
                "durum": "basarili",
                "mesaj": "Dogum bildirimi basariyla alindi",
                "bildirimId": f"STUB-DGM-{mother_tc[-4:]}",
            },
            **self._get_request_meta("send_birth_notification"),
        }

    # ----- Send Death Notification -----

    def send_death_notification(
        self,
        tc_kimlik_no: str,
        death_date: str,
        death_cause_icd: str,
        death_place: str = "hastane",
    ) -> Dict[str, Any]:
        """Send death notification to e-Nabiz."""
        header = _build_enabiz_header("DEATH_NOTIFICATION")
        payload = f"""{header}
    <recordTarget>
        <patientRole>
            <id extension="{tc_kimlik_no}" root="2.16.840.1.113883.3.4808"/>
        </patientRole>
    </recordTarget>
    <component>
        <structuredBody>
            <component>
                <section>
                    <entry>
                        <observation>
                            <code code="DEATH" displayName="Olum Bildirimi"/>
                            <effectiveTime value="{death_date}"/>
                            <value xsi:type="CD" code="{death_cause_icd}"
                                   codeSystem="2.16.840.1.113883.6.3"/>
                            <entryRelationship>
                                <observation>
                                    <code code="DEATH_PLACE"/>
                                    <value>{death_place}</value>
                                </observation>
                            </entryRelationship>
                        </observation>
                    </entry>
                </section>
            </component>
        </structuredBody>
    </component>
</ClinicalDocument>"""

        logger.info("e-Nabiz send_death_notification for TC: %s***", tc_kimlik_no[:3])

        return {
            "request_xml": payload,
            "response": {
                "durum": "basarili",
                "mesaj": "Olum bildirimi basariyla alindi",
                "bildirimId": f"STUB-OLM-{tc_kimlik_no[-4:]}",
            },
            **self._get_request_meta("send_death_notification"),
        }
