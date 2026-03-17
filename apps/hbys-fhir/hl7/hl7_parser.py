"""
HL7 v2 Parser
=============
Parse HL7 v2.x messages (ADT, ORM, ORU) into structured Python dicts.

Supports HL7 v2.5.1 with standard field/component/sub-component separators.
Handles MLLP framing (start-block / end-block / carriage-return).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# MLLP framing characters
MLLP_START_BLOCK = "\x0b"
MLLP_END_BLOCK = "\x1c"
MLLP_CARRIAGE_RETURN = "\r"


@dataclass
class HL7Segment:
    """Represents a single HL7 segment (e.g. MSH, PID, PV1)."""

    name: str
    fields: list[str] = field(default_factory=list)

    def get_field(self, index: int, default: str = "") -> str:
        """Get a field by 1-based index (HL7 convention)."""
        # For MSH, field 1 is the field separator itself; stored fields start at MSH-2
        if 0 < index <= len(self.fields):
            return self.fields[index - 1]
        return default

    def get_component(self, field_index: int, comp_index: int, default: str = "") -> str:
        """Get a component within a field. Both indices are 1-based."""
        field_val = self.get_field(field_index)
        parts = field_val.split("^")
        if 0 < comp_index <= len(parts):
            return parts[comp_index - 1]
        return default

    def get_repetitions(self, field_index: int) -> list[str]:
        """Get all repetitions of a field (split by ~)."""
        return self.get_field(field_index).split("~")


@dataclass
class HL7Message:
    """Parsed HL7 v2 message."""

    raw: str
    segments: list[HL7Segment] = field(default_factory=list)
    message_type: str = ""
    trigger_event: str = ""
    message_control_id: str = ""
    version: str = ""

    def get_segment(self, name: str) -> HL7Segment | None:
        """Get the first segment matching the given name."""
        for seg in self.segments:
            if seg.name == name:
                return seg
        return None

    def get_segments(self, name: str) -> list[HL7Segment]:
        """Get all segments matching the given name."""
        return [s for s in self.segments if s.name == name]


class HL7Parser:
    """Stateless HL7 v2 message parser."""

    # ------------------------------------------------------------------ #
    # Core parsing
    # ------------------------------------------------------------------ #
    @classmethod
    def parse(cls, raw_message: str) -> HL7Message:
        """Parse a raw HL7 v2 string into an HL7Message object.

        Handles MLLP framing if present.
        """
        # Strip MLLP framing
        text = raw_message.strip()
        text = text.lstrip(MLLP_START_BLOCK).rstrip(MLLP_CARRIAGE_RETURN).rstrip(MLLP_END_BLOCK)

        # Split into segment lines
        lines = [line.strip() for line in text.replace("\n", "\r").split("\r") if line.strip()]

        msg = HL7Message(raw=raw_message)

        for line in lines:
            segment = cls._parse_segment(line)
            if segment:
                msg.segments.append(segment)

        # Extract message header info
        msh = msg.get_segment("MSH")
        if msh:
            msg_type_field = msh.get_field(9)  # MSH-9
            parts = msg_type_field.split("^")
            msg.message_type = parts[0] if parts else ""
            msg.trigger_event = parts[1] if len(parts) > 1 else ""
            msg.message_control_id = msh.get_field(10)  # MSH-10
            msg.version = msh.get_field(12)  # MSH-12

        return msg

    @classmethod
    def _parse_segment(cls, line: str) -> HL7Segment | None:
        """Parse a single segment line."""
        if len(line) < 3:
            return None

        seg_name = line[:3]

        if seg_name == "MSH":
            # MSH is special: field separator is char 4, encoding chars start at position 4
            field_sep = line[3] if len(line) > 3 else "|"
            # MSH-1 = field_sep (implicit), MSH-2 = encoding characters
            rest = line[4:]  # everything after the first |
            fields = rest.split(field_sep)
            # Prepend the field separator as field 1
            all_fields = [field_sep] + fields
            return HL7Segment(name="MSH", fields=all_fields)
        else:
            parts = line.split("|")
            return HL7Segment(name=parts[0], fields=parts[1:] if len(parts) > 1 else [])

    # ------------------------------------------------------------------ #
    # High-level extraction helpers
    # ------------------------------------------------------------------ #
    @classmethod
    def extract_patient(cls, msg: HL7Message) -> dict[str, Any]:
        """Extract patient demographics from PID segment."""
        pid = msg.get_segment("PID")
        if not pid:
            return {}

        result: dict[str, Any] = {}

        # PID-3: Patient Identifier List
        ids = pid.get_repetitions(3)
        for id_field in ids:
            comps = id_field.split("^")
            id_value = comps[0] if comps else ""
            id_type = comps[4] if len(comps) > 4 else ""
            if id_type == "NI" or id_type == "TC":
                result["tc_number"] = id_value
            elif id_type == "MR":
                result["identity_number"] = id_value
            elif not result.get("identity_number"):
                result["identity_number"] = id_value

        # PID-5: Patient Name (Family^Given^Middle^Suffix^Prefix)
        name = pid.get_field(5)
        name_parts = name.split("^")
        result["last_name"] = name_parts[0] if name_parts else ""
        result["first_name"] = name_parts[1] if len(name_parts) > 1 else ""

        # PID-7: Date of Birth (YYYYMMDD or YYYYMMDDHHmmss)
        dob = pid.get_field(7)
        if dob:
            result["birth_date"] = cls._parse_hl7_datetime(dob)

        # PID-8: Sex (M/F/O/U)
        sex = pid.get_field(8)
        if sex:
            result["gender"] = sex[0].upper() if sex else None

        # PID-11: Address (Street^Other^City^State^Zip^Country)
        addr = pid.get_field(11)
        if addr:
            addr_parts = addr.split("^")
            result["address_full"] = addr_parts[0] if addr_parts else None
            result["address_city"] = addr_parts[2] if len(addr_parts) > 2 else None
            result["address_district"] = addr_parts[3] if len(addr_parts) > 3 else None

        # PID-13: Phone
        phone = pid.get_field(13)
        if phone:
            result["phone"] = phone.split("^")[0]

        # PID-14: Business Phone (use as email fallback if contains @)
        biz = pid.get_field(14)
        if biz and "@" in biz:
            result["email"] = biz.split("^")[0]

        return {k: v for k, v in result.items() if v is not None}

    @classmethod
    def extract_encounter(cls, msg: HL7Message) -> dict[str, Any]:
        """Extract encounter info from PV1 segment."""
        pv1 = msg.get_segment("PV1")
        if not pv1:
            return {}

        result: dict[str, Any] = {}

        # PV1-2: Patient Class (I=inpatient, O=outpatient, E=emergency)
        patient_class = pv1.get_field(2)
        class_map = {"I": "inpatient", "O": "outpatient", "E": "emergency"}
        result["encounter_type"] = class_map.get(patient_class, "outpatient")

        # PV1-7: Attending Doctor (ID^Family^Given)
        doctor = pv1.get_field(7)
        if doctor:
            doctor_parts = doctor.split("^")
            result["doctor_id"] = doctor_parts[0] if doctor_parts else None

        # PV1-19: Visit Number
        visit_no = pv1.get_field(19)
        if visit_no:
            result["id"] = visit_no

        # PV1-44: Admit DateTime
        admit = pv1.get_field(44)
        if admit:
            result["encounter_date"] = cls._parse_hl7_datetime(admit)

        # PV1-45: Discharge DateTime
        discharge = pv1.get_field(45)
        if discharge:
            result["discharge_date"] = cls._parse_hl7_datetime(discharge)

        return {k: v for k, v in result.items() if v is not None}

    @classmethod
    def extract_observations(cls, msg: HL7Message) -> list[dict[str, Any]]:
        """Extract observations from OBX segments (ORU messages)."""
        results = []
        for obx in msg.get_segments("OBX"):
            obs: dict[str, Any] = {}

            # OBX-2: Value Type (NM=Numeric, ST=String, CE=Coded)
            obs["value_type"] = obx.get_field(2)

            # OBX-3: Observation Identifier (code^display^coding-system)
            obs_id = obx.get_field(3)
            id_parts = obs_id.split("^")
            obs["code"] = id_parts[0] if id_parts else ""
            obs["display"] = id_parts[1] if len(id_parts) > 1 else ""
            obs["coding_system"] = id_parts[2] if len(id_parts) > 2 else ""

            # OBX-5: Observation Value
            obs["value"] = obx.get_field(5)

            # OBX-6: Units
            units = obx.get_field(6)
            obs["unit"] = units.split("^")[0] if units else ""

            # OBX-7: Reference Range
            ref_range = obx.get_field(7)
            if ref_range and "-" in ref_range:
                low, _, high = ref_range.partition("-")
                try:
                    obs["reference_range_low"] = float(low)
                    obs["reference_range_high"] = float(high)
                except ValueError:
                    obs["reference_range"] = ref_range
            elif ref_range:
                obs["reference_range"] = ref_range

            # OBX-8: Abnormal Flags
            flags = obx.get_field(8)
            obs["is_abnormal"] = flags.upper() in ("H", "L", "HH", "LL", "A", "AA") if flags else False
            obs["is_critical"] = flags.upper() in ("HH", "LL", "AA") if flags else False

            # OBX-11: Observation Result Status
            obs["status"] = obx.get_field(11)

            # OBX-14: Date of Observation
            obs_date = obx.get_field(14)
            if obs_date:
                obs["result_date"] = cls._parse_hl7_datetime(obs_date)

            results.append({k: v for k, v in obs.items() if v is not None})

        return results

    @classmethod
    def extract_orders(cls, msg: HL7Message) -> list[dict[str, Any]]:
        """Extract order info from ORC/OBR segments (ORM messages)."""
        results = []
        orcs = msg.get_segments("ORC")
        obrs = msg.get_segments("OBR")

        # Pair ORC with OBR segments
        for idx, orc in enumerate(orcs):
            order: dict[str, Any] = {}

            # ORC-1: Order Control (NW=New, CA=Cancel, etc.)
            order["order_control"] = orc.get_field(1)

            # ORC-2: Placer Order Number
            order["placer_order_id"] = orc.get_field(2)

            # ORC-3: Filler Order Number
            order["filler_order_id"] = orc.get_field(3)

            # ORC-5: Order Status
            order["status"] = orc.get_field(5)

            # ORC-9: Date/Time of Transaction
            txn_time = orc.get_field(9)
            if txn_time:
                order["order_date"] = cls._parse_hl7_datetime(txn_time)

            # ORC-12: Ordering Provider
            provider = orc.get_field(12)
            if provider:
                order["ordered_by"] = provider.split("^")[0]

            # Paired OBR segment
            if idx < len(obrs):
                obr = obrs[idx]
                # OBR-4: Universal Service Identifier
                service = obr.get_field(4)
                if service:
                    service_parts = service.split("^")
                    order["service_code"] = service_parts[0] if service_parts else ""
                    order["service_name"] = service_parts[1] if len(service_parts) > 1 else ""

                # OBR-5: Priority
                priority = obr.get_field(5)
                priority_map = {"S": "stat", "A": "urgent", "R": "routine"}
                order["priority"] = priority_map.get(priority, "routine")

                # OBR-13: Clinical Information
                clinical = obr.get_field(13)
                if clinical:
                    order["clinical_info"] = clinical

                # OBR-15: Specimen Source
                specimen = obr.get_field(15)
                if specimen:
                    order["specimen_type"] = specimen.split("^")[0]

            results.append({k: v for k, v in order.items() if v is not None})

        return results

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _parse_hl7_datetime(value: str) -> str | None:
        """Parse HL7 datetime format (YYYYMMDD[HHmmss[.SSSS]]) to ISO string."""
        if not value:
            return None
        clean = value.split("+")[0].split("-")[0] if ("+" in value or "-" in value[8:]) else value
        clean = clean.replace(".", "")
        try:
            if len(clean) >= 14:
                dt = datetime.strptime(clean[:14], "%Y%m%d%H%M%S")
                return dt.isoformat()
            elif len(clean) >= 12:
                dt = datetime.strptime(clean[:12], "%Y%m%d%H%M")
                return dt.isoformat()
            elif len(clean) >= 8:
                dt = datetime.strptime(clean[:8], "%Y%m%d")
                return dt.date().isoformat()
        except ValueError:
            pass
        return value
