"""
HL7 v2.x Parser
Parses HL7 v2.x messages with focus on OBX (observations), PID (patient),
OBR (order request) segments. Also builds ACK messages.
"""
import logging
import json
from datetime import datetime
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)

# HL7 v2.x delimiters (standard)
FIELD_SEP = "|"
COMPONENT_SEP = "^"
REPEAT_SEP = "~"
ESCAPE_CHAR = "\\"
SUBCOMPONENT_SEP = "&"
SEGMENT_SEP = "\r"


class HL7Parser:
    """
    Parser for HL7 v2.x messages.
    Supports ORM, ORU, ADT message types.
    Extracts patient info (PID), order info (OBR), and observation results (OBX).
    """

    @staticmethod
    def parse(raw_message: str) -> Dict[str, Any]:
        """
        Parse a complete HL7 v2.x message into a structured dictionary.

        Returns:
            {
                "message_type": "ORU^R01",
                "message_control_id": "...",
                "sending_application": "...",
                "patient": { ... },
                "orders": [ ... ],
                "observations": [ ... ],
                "raw_segments": { "MSH": [...], "PID": [...], ... }
            }
        """
        result: Dict[str, Any] = {
            "message_type": None,
            "message_control_id": None,
            "sending_application": None,
            "patient": None,
            "orders": [],
            "observations": [],
            "raw_segments": {},
        }

        # Normalize line endings and split into segments
        raw_message = raw_message.replace("\n", "\r").replace("\r\r", "\r")
        segments = [s.strip() for s in raw_message.split(SEGMENT_SEP) if s.strip()]

        for segment_str in segments:
            fields = segment_str.split(FIELD_SEP)
            segment_type = fields[0]

            # Collect raw segments
            if segment_type not in result["raw_segments"]:
                result["raw_segments"][segment_type] = []
            result["raw_segments"][segment_type].append(fields)

            if segment_type == "MSH":
                result.update(HL7Parser._parse_msh(fields))
            elif segment_type == "PID":
                result["patient"] = HL7Parser._parse_pid(fields)
            elif segment_type == "OBR":
                result["orders"].append(HL7Parser._parse_obr(fields))
            elif segment_type == "OBX":
                result["observations"].append(HL7Parser._parse_obx(fields))

        return result

    @staticmethod
    def _safe_get(fields: List[str], index: int, default: str = "") -> str:
        """Safely get a field value by index."""
        if index < len(fields):
            return fields[index]
        return default

    @staticmethod
    def _parse_msh(fields: List[str]) -> Dict[str, Any]:
        """Parse MSH (Message Header) segment."""
        # MSH fields are offset by 1 because MSH-1 is the field separator itself
        msg_type = HL7Parser._safe_get(fields, 8)  # MSH-9
        return {
            "sending_application": HL7Parser._safe_get(fields, 2),  # MSH-3
            "sending_facility": HL7Parser._safe_get(fields, 3),     # MSH-4
            "receiving_application": HL7Parser._safe_get(fields, 4),  # MSH-5
            "receiving_facility": HL7Parser._safe_get(fields, 5),    # MSH-6
            "message_datetime": HL7Parser._safe_get(fields, 6),      # MSH-7
            "message_type": msg_type,                                  # MSH-9
            "message_control_id": HL7Parser._safe_get(fields, 9),    # MSH-10
            "processing_id": HL7Parser._safe_get(fields, 10),        # MSH-11
            "version": HL7Parser._safe_get(fields, 11),              # MSH-12
        }

    @staticmethod
    def _parse_pid(fields: List[str]) -> Dict[str, Any]:
        """Parse PID (Patient Identification) segment."""
        # PID-3: Patient ID
        patient_id_field = HL7Parser._safe_get(fields, 3)
        patient_id = patient_id_field.split(COMPONENT_SEP)[0] if patient_id_field else ""

        # PID-5: Patient Name (Family^Given^Middle)
        name_field = HL7Parser._safe_get(fields, 5)
        name_parts = name_field.split(COMPONENT_SEP) if name_field else []
        family_name = name_parts[0] if len(name_parts) > 0 else ""
        given_name = name_parts[1] if len(name_parts) > 1 else ""

        # PID-7: Date of Birth
        dob = HL7Parser._safe_get(fields, 7)

        # PID-8: Sex
        sex = HL7Parser._safe_get(fields, 8)

        return {
            "patient_id": patient_id,
            "family_name": family_name,
            "given_name": given_name,
            "date_of_birth": dob,
            "sex": sex,
            "address": HL7Parser._safe_get(fields, 11),  # PID-11
            "phone": HL7Parser._safe_get(fields, 13),    # PID-13
            "tc_kimlik": HL7Parser._safe_get(fields, 19),  # PID-19 (SSN / TC Kimlik No)
        }

    @staticmethod
    def _parse_obr(fields: List[str]) -> Dict[str, Any]:
        """Parse OBR (Observation Request) segment."""
        # OBR-4: Universal Service ID
        service_id_field = HL7Parser._safe_get(fields, 4)
        service_parts = service_id_field.split(COMPONENT_SEP) if service_id_field else []

        return {
            "set_id": HL7Parser._safe_get(fields, 1),      # OBR-1
            "placer_order_number": HL7Parser._safe_get(fields, 2),  # OBR-2
            "filler_order_number": HL7Parser._safe_get(fields, 3),  # OBR-3
            "service_id": service_parts[0] if service_parts else "",
            "service_name": service_parts[1] if len(service_parts) > 1 else "",
            "requested_datetime": HL7Parser._safe_get(fields, 6),   # OBR-6
            "observation_datetime": HL7Parser._safe_get(fields, 7),  # OBR-7
            "result_status": HL7Parser._safe_get(fields, 25),       # OBR-25
        }

    @staticmethod
    def _parse_obx(fields: List[str]) -> Dict[str, Any]:
        """Parse OBX (Observation Result) segment."""
        # OBX-3: Observation Identifier
        obs_id_field = HL7Parser._safe_get(fields, 3)
        obs_parts = obs_id_field.split(COMPONENT_SEP) if obs_id_field else []

        # OBX-6: Units
        units_field = HL7Parser._safe_get(fields, 6)
        units = units_field.split(COMPONENT_SEP)[0] if units_field else ""

        # OBX-7: Reference Range
        ref_range = HL7Parser._safe_get(fields, 7)

        # OBX-8: Abnormal Flags
        abnormal_flags = HL7Parser._safe_get(fields, 8)

        return {
            "set_id": HL7Parser._safe_get(fields, 1),          # OBX-1
            "value_type": HL7Parser._safe_get(fields, 2),      # OBX-2 (NM=numeric, ST=string, etc.)
            "observation_id": obs_parts[0] if obs_parts else "",
            "observation_name": obs_parts[1] if len(obs_parts) > 1 else "",
            "observation_sub_id": HL7Parser._safe_get(fields, 4),  # OBX-4
            "value": HL7Parser._safe_get(fields, 5),               # OBX-5
            "units": units,
            "reference_range": ref_range,
            "abnormal_flags": abnormal_flags,
            "result_status": HL7Parser._safe_get(fields, 11),  # OBX-11 (F=final, P=preliminary)
            "observation_datetime": HL7Parser._safe_get(fields, 14),  # OBX-14
        }

    @staticmethod
    def build_ack(
        message_control_id: str,
        ack_code: str = "AA",
        sending_app: str = "X-EAR",
        sending_facility: str = "HBYS",
        receiving_app: str = "",
        receiving_facility: str = "",
        error_message: str = "",
    ) -> str:
        """
        Build an HL7 ACK message.

        Args:
            message_control_id: Original message control ID to acknowledge.
            ack_code: AA (accept), AE (error), AR (reject).
            error_message: Optional error description for AE/AR.

        Returns:
            Complete HL7 ACK message string.
        """
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        msh = FIELD_SEP.join([
            "MSH",
            f"{COMPONENT_SEP}{REPEAT_SEP}{ESCAPE_CHAR}{SUBCOMPONENT_SEP}",
            sending_app,
            sending_facility,
            receiving_app,
            receiving_facility,
            now,
            "",
            f"ACK{COMPONENT_SEP}A01",
            message_control_id,
            "P",
            "2.5",
        ])

        msa = FIELD_SEP.join([
            "MSA",
            ack_code,
            message_control_id,
            error_message,
        ])

        segments = [msh, msa]

        # Add ERR segment for errors
        if ack_code != "AA" and error_message:
            err = FIELD_SEP.join([
                "ERR",
                "",
                "",
                "",
                error_message,
            ])
            segments.append(err)

        return SEGMENT_SEP.join(segments) + SEGMENT_SEP

    @staticmethod
    def to_json(parsed: Dict[str, Any]) -> str:
        """Convert parsed HL7 data to a JSON string for storage."""
        # Remove raw_segments to keep JSON clean
        clean = {k: v for k, v in parsed.items() if k != "raw_segments"}
        return json.dumps(clean, ensure_ascii=False, default=str)
