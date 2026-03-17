"""
ASTM / LIS2-A2 Parser
Parses ASTM E1381 / LIS2-A2 protocol messages commonly used by
clinical laboratory analyzers over serial (RS-232) connections.

Frame structure:
  <STX> FN <data> <ETX> C1 C2 <CR><LF>
  Where FN = frame number (1-7), C1C2 = checksum

Record types:
  H = Header, P = Patient, O = Order, R = Result, C = Comment, L = Terminator
"""
import logging
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# ASTM control characters
STX = "\x02"  # Start of Text
ETX = "\x03"  # End of Text
EOT = "\x04"  # End of Transmission
ENQ = "\x05"  # Enquiry
ACK = "\x06"  # Acknowledge
NAK = "\x15"  # Negative Acknowledge
CR = "\r"
LF = "\n"

# ASTM field delimiter
FIELD_DELIM = "|"
COMPONENT_DELIM = "^"
REPEAT_DELIM = "\\"


class ASTMParser:
    """
    Parser for ASTM E1381 / LIS2-A2 protocol messages.
    Extracts header, patient, order, result, and comment records.
    """

    @staticmethod
    def parse(raw_message: str) -> Dict[str, Any]:
        """
        Parse a complete ASTM transmission (multiple frames) into structured data.

        Returns:
            {
                "header": { ... },
                "patients": [ { ..., "orders": [...], "results": [...] } ],
                "comments": [ ... ],
                "terminator": { ... },
            }
        """
        result: Dict[str, Any] = {
            "header": None,
            "patients": [],
            "comments": [],
            "terminator": None,
        }

        # Extract records from frames
        records = ASTMParser._extract_records(raw_message)

        current_patient: Optional[Dict[str, Any]] = None
        current_order: Optional[Dict[str, Any]] = None

        for record_str in records:
            if not record_str.strip():
                continue

            fields = record_str.split(FIELD_DELIM)
            # First field contains frame number + record type (e.g., "1H" or just "H")
            record_type_field = fields[0].strip()
            # Record type is the last character
            record_type = record_type_field[-1] if record_type_field else ""

            if record_type == "H":
                result["header"] = ASTMParser._parse_header(fields)
            elif record_type == "P":
                if current_patient:
                    result["patients"].append(current_patient)
                current_patient = ASTMParser._parse_patient(fields)
                current_patient["orders"] = []
                current_patient["results"] = []
                current_order = None
            elif record_type == "O":
                current_order = ASTMParser._parse_order(fields)
                if current_patient:
                    current_patient["orders"].append(current_order)
            elif record_type == "R":
                parsed_result = ASTMParser._parse_result(fields)
                if current_patient:
                    current_patient["results"].append(parsed_result)
            elif record_type == "C":
                comment = ASTMParser._parse_comment(fields)
                result["comments"].append(comment)
            elif record_type == "L":
                result["terminator"] = ASTMParser._parse_terminator(fields)

        # Don't forget the last patient
        if current_patient:
            result["patients"].append(current_patient)

        return result

    @staticmethod
    def _extract_records(raw_message: str) -> List[str]:
        """
        Extract individual records from raw ASTM data.
        Handles both framed (STX...ETX) and plain-text formats.
        """
        records: List[str] = []

        # Remove control characters and extract data between STX and ETX
        if STX in raw_message:
            parts = raw_message.split(STX)
            for part in parts:
                if ETX in part:
                    data = part.split(ETX)[0]
                    # Strip frame number (first character if digit)
                    if data and data[0].isdigit():
                        data = data[1:]
                    records.append(data)
        else:
            # Plain text format (line-separated records)
            for line in raw_message.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
                line = line.strip()
                if line:
                    records.append(line)

        return records

    @staticmethod
    def _safe_get(fields: List[str], index: int, default: str = "") -> str:
        if index < len(fields):
            return fields[index]
        return default

    @staticmethod
    def _parse_header(fields: List[str]) -> Dict[str, Any]:
        """Parse H (Header) record."""
        return {
            "record_type": "H",
            "delimiter_definition": ASTMParser._safe_get(fields, 1),
            "sender_name": ASTMParser._safe_get(fields, 4),
            "sender_address": ASTMParser._safe_get(fields, 5),
            "receiver_id": ASTMParser._safe_get(fields, 9),
            "processing_id": ASTMParser._safe_get(fields, 11),
            "version": ASTMParser._safe_get(fields, 12),
            "timestamp": ASTMParser._safe_get(fields, 13),
        }

    @staticmethod
    def _parse_patient(fields: List[str]) -> Dict[str, Any]:
        """Parse P (Patient) record."""
        # P|1|patient_id||||||last^first||DOB|sex
        patient_id = ASTMParser._safe_get(fields, 2)
        name_field = ASTMParser._safe_get(fields, 5)
        name_parts = name_field.split(COMPONENT_DELIM) if name_field else []

        return {
            "record_type": "P",
            "sequence": ASTMParser._safe_get(fields, 1),
            "patient_id": patient_id,
            "lab_id": ASTMParser._safe_get(fields, 3),
            "family_name": name_parts[0] if name_parts else "",
            "given_name": name_parts[1] if len(name_parts) > 1 else "",
            "date_of_birth": ASTMParser._safe_get(fields, 7),
            "sex": ASTMParser._safe_get(fields, 8),
            "physician": ASTMParser._safe_get(fields, 9),
        }

    @staticmethod
    def _parse_order(fields: List[str]) -> Dict[str, Any]:
        """Parse O (Order) record."""
        # O|1|order_id||test_id|||priority|||||||specimen
        test_id_field = ASTMParser._safe_get(fields, 4)
        test_parts = test_id_field.split(COMPONENT_DELIM) if test_id_field else []

        return {
            "record_type": "O",
            "sequence": ASTMParser._safe_get(fields, 1),
            "specimen_id": ASTMParser._safe_get(fields, 2),
            "instrument_id": ASTMParser._safe_get(fields, 3),
            "test_id": test_parts[0] if test_parts else "",
            "test_name": test_parts[1] if len(test_parts) > 1 else "",
            "priority": ASTMParser._safe_get(fields, 5),
            "requested_datetime": ASTMParser._safe_get(fields, 6),
            "collection_datetime": ASTMParser._safe_get(fields, 7),
            "action_code": ASTMParser._safe_get(fields, 11),
            "specimen_descriptor": ASTMParser._safe_get(fields, 15),
        }

    @staticmethod
    def _parse_result(fields: List[str]) -> Dict[str, Any]:
        """Parse R (Result) record."""
        # R|1|^^test_id^test_name|value|units|ref_range|flag||status||operator|datetime
        test_id_field = ASTMParser._safe_get(fields, 2)
        test_parts = test_id_field.split(COMPONENT_DELIM) if test_id_field else []

        return {
            "record_type": "R",
            "sequence": ASTMParser._safe_get(fields, 1),
            "test_id": test_parts[2] if len(test_parts) > 2 else (test_parts[0] if test_parts else ""),
            "test_name": test_parts[3] if len(test_parts) > 3 else (test_parts[1] if len(test_parts) > 1 else ""),
            "value": ASTMParser._safe_get(fields, 3),
            "units": ASTMParser._safe_get(fields, 4),
            "reference_range": ASTMParser._safe_get(fields, 5),
            "abnormal_flag": ASTMParser._safe_get(fields, 6),
            "result_status": ASTMParser._safe_get(fields, 8),
            "operator_id": ASTMParser._safe_get(fields, 10),
            "result_datetime": ASTMParser._safe_get(fields, 12),
            "instrument_id": ASTMParser._safe_get(fields, 13),
        }

    @staticmethod
    def _parse_comment(fields: List[str]) -> Dict[str, Any]:
        """Parse C (Comment) record."""
        return {
            "record_type": "C",
            "sequence": ASTMParser._safe_get(fields, 1),
            "source": ASTMParser._safe_get(fields, 2),  # I=instrument, L=lis
            "text": ASTMParser._safe_get(fields, 3),
            "comment_type": ASTMParser._safe_get(fields, 4),  # G=general, P=patient, etc.
        }

    @staticmethod
    def _parse_terminator(fields: List[str]) -> Dict[str, Any]:
        """Parse L (Terminator) record."""
        return {
            "record_type": "L",
            "sequence": ASTMParser._safe_get(fields, 1),
            "termination_code": ASTMParser._safe_get(fields, 2),  # N=normal, I=error
        }

    @staticmethod
    def calculate_checksum(frame_data: str) -> str:
        """
        Calculate ASTM frame checksum.
        Sum of all characters from frame number to ETX inclusive, modulo 256,
        expressed as two hex digits.
        """
        total = sum(ord(c) for c in frame_data)
        return f"{total % 256:02X}"

    @staticmethod
    def to_json(parsed: Dict[str, Any]) -> str:
        """Convert parsed ASTM data to a JSON string for storage."""
        return json.dumps(parsed, ensure_ascii=False, default=str)
