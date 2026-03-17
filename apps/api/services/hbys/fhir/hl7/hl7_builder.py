"""
HL7 v2 Builder
==============
Build HL7 v2.x messages (ADT, ORM, ORU) and ACK responses from structured data.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..config import fhir_config

# MLLP framing
MLLP_START_BLOCK = "\x0b"
MLLP_END_BLOCK = "\x1c"
MLLP_CARRIAGE_RETURN = "\r"


class HL7Builder:
    """Build HL7 v2.x messages from structured data."""

    FIELD_SEP = "|"
    COMP_SEP = "^"
    REP_SEP = "~"
    ESC_CHAR = "\\"
    SUB_COMP_SEP = "&"
    ENCODING_CHARS = "^~\\&"

    # ------------------------------------------------------------------ #
    # Low-level helpers
    # ------------------------------------------------------------------ #
    @classmethod
    def _timestamp(cls, dt: datetime | None = None) -> str:
        """Format a datetime as HL7 timestamp (YYYYMMDDHHmmss)."""
        dt = dt or datetime.now(timezone.utc)
        return dt.strftime("%Y%m%d%H%M%S")

    @classmethod
    def _build_segment(cls, name: str, fields: list[str]) -> str:
        """Build a single segment string."""
        return cls.FIELD_SEP.join([name] + fields)

    @classmethod
    def _build_msh(
        cls,
        message_type: str,
        trigger_event: str,
        message_control_id: str,
        processing_id: str = "P",
    ) -> str:
        """Build MSH segment."""
        fields = [
            cls.ENCODING_CHARS,                              # MSH-2
            fhir_config.HL7_SENDING_APPLICATION,             # MSH-3
            fhir_config.HL7_SENDING_FACILITY,                # MSH-4
            fhir_config.HL7_RECEIVING_APPLICATION,           # MSH-5
            fhir_config.HL7_RECEIVING_FACILITY,              # MSH-6
            cls._timestamp(),                                # MSH-7
            "",                                               # MSH-8 (security)
            f"{message_type}{cls.COMP_SEP}{trigger_event}",  # MSH-9
            message_control_id,                              # MSH-10
            processing_id,                                   # MSH-11
            fhir_config.HL7_VERSION,                         # MSH-12
        ]
        return f"MSH{cls.FIELD_SEP}{cls.FIELD_SEP.join(fields)}"

    @classmethod
    def _build_pid(cls, patient: dict[str, Any]) -> str:
        """Build PID segment from patient data."""
        tc = patient.get("tc_number") or patient.get("tcNumber") or ""
        mrn = patient.get("identity_number") or patient.get("identityNumber") or patient.get("id") or ""
        last = patient.get("last_name") or patient.get("lastName") or ""
        first = patient.get("first_name") or patient.get("firstName") or ""
        dob = patient.get("birth_date") or patient.get("birthDate") or ""
        gender = patient.get("gender") or ""
        phone = patient.get("phone") or ""
        city = patient.get("address_city") or patient.get("addressCity") or ""
        district = patient.get("address_district") or patient.get("addressDistrict") or ""
        address = patient.get("address_full") or patient.get("addressFull") or ""

        # Format date
        if isinstance(dob, datetime):
            dob_str = dob.strftime("%Y%m%d")
        elif isinstance(dob, str) and len(dob) >= 10:
            dob_str = dob[:10].replace("-", "")
        else:
            dob_str = str(dob) if dob else ""

        # Patient identifiers: TC^^^^^NI~MRN^^^^^MR
        identifiers = []
        if tc:
            identifiers.append(f"{tc}^^^^NI")
        if mrn:
            identifiers.append(f"{mrn}^^^^MR")
        pid3 = "~".join(identifiers) if identifiers else ""

        # Name: Last^First
        pid5 = f"{last}{cls.COMP_SEP}{first}"

        # Address: Street^Other^City^District
        pid11 = f"{address}{cls.COMP_SEP}{cls.COMP_SEP}{city}{cls.COMP_SEP}{district}"

        fields = [
            "1",       # PID-1 Set ID
            "",        # PID-2 (deprecated)
            pid3,      # PID-3 Patient Identifier List
            "",        # PID-4 Alt Patient ID
            pid5,      # PID-5 Patient Name
            "",        # PID-6 Mother's Maiden Name
            dob_str,   # PID-7 Date of Birth
            gender,    # PID-8 Sex
            "",        # PID-9 Patient Alias
            "",        # PID-10 Race
            pid11,     # PID-11 Address
            "",        # PID-12 County Code
            phone,     # PID-13 Phone - Home
        ]
        return cls._build_segment("PID", fields)

    @classmethod
    def _build_pv1(cls, encounter: dict[str, Any]) -> str:
        """Build PV1 segment from encounter data."""
        enc_type = encounter.get("encounter_type") or encounter.get("encounterType") or "outpatient"
        class_map = {"outpatient": "O", "inpatient": "I", "emergency": "E"}
        patient_class = class_map.get(enc_type, "O")

        doctor_id = encounter.get("doctor_id") or encounter.get("doctorId") or ""
        visit_no = encounter.get("id") or ""

        enc_date = encounter.get("encounter_date") or encounter.get("encounterDate") or ""
        discharge = encounter.get("discharge_date") or encounter.get("dischargeDate") or ""

        def fmt_dt(val: Any) -> str:
            if isinstance(val, datetime):
                return val.strftime("%Y%m%d%H%M%S")
            if isinstance(val, str) and val:
                return val.replace("-", "").replace(":", "").replace("T", "")[:14]
            return ""

        fields = [
            "1",                # PV1-1 Set ID
            patient_class,      # PV1-2 Patient Class
            "",                 # PV1-3 Assigned Patient Location
            "",                 # PV1-4 Admission Type
            "",                 # PV1-5 Preadmit Number
            "",                 # PV1-6 Prior Patient Location
            doctor_id,          # PV1-7 Attending Doctor
        ]
        # Pad to PV1-19
        fields.extend([""] * (19 - len(fields) - 1))
        fields.append(visit_no)  # PV1-19 Visit Number
        # Pad to PV1-44
        fields.extend([""] * (44 - len(fields) - 1))
        fields.append(fmt_dt(enc_date))    # PV1-44 Admit Date
        fields.append(fmt_dt(discharge))   # PV1-45 Discharge Date

        return cls._build_segment("PV1", fields)

    @classmethod
    def _build_obx(
        cls,
        set_id: int,
        value_type: str,
        code: str,
        display: str,
        value: Any,
        unit: str = "",
        ref_range: str = "",
        abnormal_flag: str = "",
        status: str = "F",
        obs_datetime: str = "",
    ) -> str:
        """Build OBX segment."""
        fields = [
            str(set_id),                                       # OBX-1 Set ID
            value_type,                                        # OBX-2 Value Type
            f"{code}{cls.COMP_SEP}{display}{cls.COMP_SEP}LN", # OBX-3 Observation ID
            "",                                                # OBX-4 Observation Sub-ID
            str(value) if value is not None else "",           # OBX-5 Observation Value
            unit,                                              # OBX-6 Units
            ref_range,                                         # OBX-7 Reference Range
            abnormal_flag,                                     # OBX-8 Abnormal Flags
            "",                                                # OBX-9 Probability
            "",                                                # OBX-10 Nature of Abnormal Test
            status,                                            # OBX-11 Observation Result Status
            "",                                                # OBX-12 Effective Date
            "",                                                # OBX-13 User Defined Access Checks
            obs_datetime,                                      # OBX-14 Date/Time of Observation
        ]
        return cls._build_segment("OBX", fields)

    @classmethod
    def _build_orc(cls, order: dict[str, Any], control: str = "NW") -> str:
        """Build ORC segment."""
        fields = [
            control,                                           # ORC-1 Order Control
            order.get("placer_order_id") or order.get("id") or "",  # ORC-2 Placer Order Number
            order.get("filler_order_id") or "",                # ORC-3 Filler Order Number
            "",                                                # ORC-4 Placer Group Number
            order.get("status") or "",                         # ORC-5 Order Status
        ]
        return cls._build_segment("ORC", fields)

    @classmethod
    def _build_obr(cls, order: dict[str, Any], set_id: int = 1) -> str:
        """Build OBR segment."""
        service_code = order.get("service_code") or ""
        service_name = order.get("service_name") or ""
        priority = order.get("priority", "routine")
        priority_map = {"stat": "S", "urgent": "A", "routine": "R"}

        fields = [
            str(set_id),                                                      # OBR-1 Set ID
            order.get("placer_order_id") or order.get("id") or "",           # OBR-2 Placer Order
            order.get("filler_order_id") or "",                              # OBR-3 Filler Order
            f"{service_code}{cls.COMP_SEP}{service_name}",                   # OBR-4 Service ID
            priority_map.get(priority, "R"),                                  # OBR-5 Priority
        ]
        return cls._build_segment("OBR", fields)

    # ------------------------------------------------------------------ #
    # High-level message builders
    # ------------------------------------------------------------------ #
    @classmethod
    def build_adt(
        cls,
        trigger_event: str,
        patient: dict[str, Any],
        encounter: dict[str, Any] | None = None,
        message_control_id: str = "",
    ) -> str:
        """Build an ADT (Admit/Discharge/Transfer) message.

        Common trigger events: A01 (admit), A02 (transfer), A03 (discharge),
        A04 (register), A08 (update), A11 (cancel admit).
        """
        mcid = message_control_id or cls._generate_mcid()
        segments = [
            cls._build_msh("ADT", trigger_event, mcid),
            "",  # EVN segment placeholder
            cls._build_pid(patient),
        ]

        # EVN segment
        evn_fields = [trigger_event, cls._timestamp()]
        segments[1] = cls._build_segment("EVN", evn_fields)

        if encounter:
            segments.append(cls._build_pv1(encounter))

        return "\r".join(segments) + "\r"

    @classmethod
    def build_orm(
        cls,
        orders: list[dict[str, Any]],
        patient: dict[str, Any],
        encounter: dict[str, Any] | None = None,
        message_control_id: str = "",
    ) -> str:
        """Build an ORM (Order) message.

        Trigger event: O01 (order message).
        """
        mcid = message_control_id or cls._generate_mcid()
        segments = [
            cls._build_msh("ORM", "O01", mcid),
            cls._build_pid(patient),
        ]

        if encounter:
            segments.append(cls._build_pv1(encounter))

        for idx, order in enumerate(orders, 1):
            control = order.get("order_control", "NW")
            segments.append(cls._build_orc(order, control))
            segments.append(cls._build_obr(order, idx))

        return "\r".join(segments) + "\r"

    @classmethod
    def build_oru(
        cls,
        observations: list[dict[str, Any]],
        patient: dict[str, Any],
        encounter: dict[str, Any] | None = None,
        order: dict[str, Any] | None = None,
        message_control_id: str = "",
    ) -> str:
        """Build an ORU (Observation Result) message.

        Trigger event: R01 (unsolicited observation message).
        """
        mcid = message_control_id or cls._generate_mcid()
        segments = [
            cls._build_msh("ORU", "R01", mcid),
            cls._build_pid(patient),
        ]

        if encounter:
            segments.append(cls._build_pv1(encounter))

        # OBR for the order context
        if order:
            segments.append(cls._build_orc(order, "RE"))
            segments.append(cls._build_obr(order))

        # OBX segments for each observation
        for idx, obs in enumerate(observations, 1):
            value_type = obs.get("value_type", "NM")
            code = obs.get("code") or obs.get("loinc_code") or ""
            display = obs.get("display") or obs.get("name") or ""
            value = obs.get("value") or obs.get("result_value")
            unit = obs.get("unit") or obs.get("result_unit") or ""

            # Reference range
            ref_low = obs.get("reference_range_low")
            ref_high = obs.get("reference_range_high")
            ref_range = ""
            if ref_low is not None and ref_high is not None:
                ref_range = f"{ref_low}-{ref_high}"

            # Abnormal flag
            flag = ""
            if obs.get("is_critical"):
                flag = "AA"
            elif obs.get("is_abnormal"):
                flag = "A"

            status = "F" if obs.get("status") in ("completed", "verified", "final") else "P"

            obs_dt = ""
            result_date = obs.get("result_date")
            if result_date:
                if isinstance(result_date, datetime):
                    obs_dt = result_date.strftime("%Y%m%d%H%M%S")
                elif isinstance(result_date, str):
                    obs_dt = result_date.replace("-", "").replace(":", "").replace("T", "")[:14]

            segments.append(
                cls._build_obx(idx, value_type, code, display, value, unit, ref_range, flag, status, obs_dt)
            )

        return "\r".join(segments) + "\r"

    @classmethod
    def build_ack(
        cls,
        original_message: Any,
        ack_code: str = "AA",
        text_message: str = "",
        message_control_id: str = "",
    ) -> str:
        """Build an ACK response message.

        ack_code: AA (accepted), AE (error), AR (rejected).
        original_message can be an HL7Message object or a dict with message_control_id.
        """
        mcid = message_control_id or cls._generate_mcid()

        # Extract original message control ID
        if hasattr(original_message, "message_control_id"):
            orig_mcid = original_message.message_control_id
        elif isinstance(original_message, dict):
            orig_mcid = original_message.get("message_control_id", "")
        else:
            orig_mcid = str(original_message) if original_message else ""

        segments = [
            cls._build_msh("ACK", "A01", mcid),
        ]

        # MSA segment
        msa_fields = [
            ack_code,       # MSA-1 Acknowledgment Code
            orig_mcid,      # MSA-2 Message Control ID of original
            text_message,   # MSA-3 Text Message
        ]
        segments.append(cls._build_segment("MSA", msa_fields))

        # ERR segment for errors
        if ack_code != "AA" and text_message:
            err_fields = [
                "",             # ERR-1
                "",             # ERR-2
                "",             # ERR-3
                "E" if ack_code == "AE" else "W",  # ERR-4 Severity
                "",             # ERR-5
                "",             # ERR-6
                "",             # ERR-7
                text_message,   # ERR-8 User Message
            ]
            segments.append(cls._build_segment("ERR", err_fields))

        return "\r".join(segments) + "\r"

    @classmethod
    def wrap_mllp(cls, message: str) -> bytes:
        """Wrap an HL7 message in MLLP framing for TCP transmission."""
        return (MLLP_START_BLOCK + message + MLLP_END_BLOCK + MLLP_CARRIAGE_RETURN).encode("utf-8")

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _generate_mcid() -> str:
        """Generate a unique message control ID."""
        return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")[:18]
