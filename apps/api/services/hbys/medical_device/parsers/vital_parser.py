"""
Vital Sign Parser
Parses vital sign data from patient monitors (Philips, GE, Mindray, etc.).
Handles common vital parameter types and normalizes values with units.
"""
import json
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Standard vital sign parameter codes
VITAL_PARAMETERS = {
    "HR": {"name": "Heart Rate", "unit": "bpm", "normal_low": 60, "normal_high": 100},
    "SpO2": {"name": "Oxygen Saturation", "unit": "%", "normal_low": 95, "normal_high": 100},
    "SBP": {"name": "Systolic Blood Pressure", "unit": "mmHg", "normal_low": 90, "normal_high": 140},
    "DBP": {"name": "Diastolic Blood Pressure", "unit": "mmHg", "normal_low": 60, "normal_high": 90},
    "MAP": {"name": "Mean Arterial Pressure", "unit": "mmHg", "normal_low": 70, "normal_high": 105},
    "RR": {"name": "Respiratory Rate", "unit": "/min", "normal_low": 12, "normal_high": 20},
    "TEMP": {"name": "Body Temperature", "unit": "C", "normal_low": 36.1, "normal_high": 37.2},
    "ETCO2": {"name": "End-Tidal CO2", "unit": "mmHg", "normal_low": 35, "normal_high": 45},
    "CVP": {"name": "Central Venous Pressure", "unit": "mmHg", "normal_low": 2, "normal_high": 8},
    "IBP1_SYS": {"name": "Invasive BP Systolic", "unit": "mmHg", "normal_low": 90, "normal_high": 140},
    "IBP1_DIA": {"name": "Invasive BP Diastolic", "unit": "mmHg", "normal_low": 60, "normal_high": 90},
    "NIBP_SYS": {"name": "NIBP Systolic", "unit": "mmHg", "normal_low": 90, "normal_high": 140},
    "NIBP_DIA": {"name": "NIBP Diastolic", "unit": "mmHg", "normal_low": 60, "normal_high": 90},
}


class VitalSignParser:
    """
    Parser for vital sign data from bedside monitors.
    Supports pipe-delimited, JSON, and HL7 OBX-based vital sign formats.
    """

    @staticmethod
    def parse(raw_data: str, format_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse vital sign data from raw device output.

        Args:
            raw_data: Raw data string from the device.
            format_hint: Optional hint for format: 'pipe', 'json', 'hl7', 'csv'.

        Returns:
            {
                "timestamp": "...",
                "parameters": [
                    {
                        "code": "HR",
                        "name": "Heart Rate",
                        "value": 72.0,
                        "unit": "bpm",
                        "is_abnormal": false,
                        "alarm_level": null,
                    },
                    ...
                ],
                "device_info": { ... }
            }
        """
        if format_hint == "json" or (not format_hint and raw_data.strip().startswith("{")):
            return VitalSignParser._parse_json(raw_data)
        elif format_hint == "pipe" or (not format_hint and "|" in raw_data):
            return VitalSignParser._parse_pipe(raw_data)
        elif format_hint == "csv" or (not format_hint and "," in raw_data and "|" not in raw_data):
            return VitalSignParser._parse_csv(raw_data)
        else:
            return VitalSignParser._parse_pipe(raw_data)

    @staticmethod
    def _parse_pipe(raw_data: str) -> Dict[str, Any]:
        """
        Parse pipe-delimited vital sign data.
        Expected format: TIMESTAMP|PARAM_CODE=VALUE|PARAM_CODE=VALUE|...
        Example: 20240115120000|HR=72|SpO2=98|SBP=120|DBP=80|RR=16|TEMP=36.6
        """
        result: Dict[str, Any] = {
            "timestamp": None,
            "parameters": [],
            "device_info": {},
        }

        parts = raw_data.strip().split("|")
        if not parts:
            return result

        # First part might be timestamp
        first = parts[0].strip()
        if re.match(r"^\d{14}", first):
            result["timestamp"] = first
            parts = parts[1:]
        else:
            result["timestamp"] = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        for part in parts:
            part = part.strip()
            if "=" not in part:
                continue
            code, value_str = part.split("=", 1)
            code = code.strip()
            value_str = value_str.strip()

            param = VitalSignParser._build_parameter(code, value_str)
            if param:
                result["parameters"].append(param)

        return result

    @staticmethod
    def _parse_json(raw_data: str) -> Dict[str, Any]:
        """Parse JSON-formatted vital sign data."""
        result: Dict[str, Any] = {
            "timestamp": None,
            "parameters": [],
            "device_info": {},
        }

        try:
            data = json.loads(raw_data)
        except json.JSONDecodeError:
            logger.warning("Failed to parse vital sign JSON data")
            return result

        result["timestamp"] = data.get("timestamp", datetime.utcnow().strftime("%Y%m%d%H%M%S"))
        result["device_info"] = data.get("device_info", data.get("deviceInfo", {}))

        # Handle various JSON structures
        vitals = data.get("vitals", data.get("parameters", data.get("data", {})))

        if isinstance(vitals, dict):
            for code, value in vitals.items():
                if isinstance(value, dict):
                    param = VitalSignParser._build_parameter(
                        code,
                        str(value.get("value", "")),
                        unit=value.get("unit"),
                        alarm=value.get("alarm"),
                    )
                else:
                    param = VitalSignParser._build_parameter(code, str(value))
                if param:
                    result["parameters"].append(param)
        elif isinstance(vitals, list):
            for item in vitals:
                if isinstance(item, dict):
                    code = item.get("code", item.get("parameter", ""))
                    value = str(item.get("value", ""))
                    param = VitalSignParser._build_parameter(
                        code, value,
                        unit=item.get("unit"),
                        alarm=item.get("alarm"),
                    )
                    if param:
                        result["parameters"].append(param)

        return result

    @staticmethod
    def _parse_csv(raw_data: str) -> Dict[str, Any]:
        """Parse CSV-formatted vital sign data."""
        result: Dict[str, Any] = {
            "timestamp": None,
            "parameters": [],
            "device_info": {},
        }

        lines = raw_data.strip().split("\n")
        if len(lines) < 2:
            return result

        headers = [h.strip() for h in lines[0].split(",")]
        values = [v.strip() for v in lines[-1].split(",")]

        # Check if first column is timestamp
        if headers and re.match(r"(?i)time", headers[0]):
            result["timestamp"] = values[0] if values else None
            headers = headers[1:]
            values = values[1:]
        else:
            result["timestamp"] = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        for i, code in enumerate(headers):
            if i < len(values):
                param = VitalSignParser._build_parameter(code.strip(), values[i])
                if param:
                    result["parameters"].append(param)

        return result

    @staticmethod
    def _build_parameter(
        code: str,
        value_str: str,
        unit: Optional[str] = None,
        alarm: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Build a normalized vital sign parameter entry."""
        if not code or not value_str:
            return None

        # Try to parse numeric value
        numeric_value: Optional[float] = None
        try:
            numeric_value = float(value_str)
        except ValueError:
            pass

        # Look up parameter metadata
        meta = VITAL_PARAMETERS.get(code.upper(), VITAL_PARAMETERS.get(code, {}))
        param_name = meta.get("name", code)
        param_unit = unit or meta.get("unit", "")

        # Determine if abnormal
        is_abnormal = False
        if numeric_value is not None and meta:
            low = meta.get("normal_low")
            high = meta.get("normal_high")
            if low is not None and numeric_value < low:
                is_abnormal = True
            if high is not None and numeric_value > high:
                is_abnormal = True

        return {
            "code": code,
            "name": param_name,
            "value": numeric_value if numeric_value is not None else value_str,
            "value_string": value_str,
            "unit": param_unit,
            "is_abnormal": is_abnormal,
            "alarm_level": alarm,
        }

    @staticmethod
    def to_json(parsed: Dict[str, Any]) -> str:
        """Convert parsed vital sign data to a JSON string for storage."""
        return json.dumps(parsed, ensure_ascii=False, default=str)
