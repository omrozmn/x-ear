"""
Tool Chain Resolver for AI Layer

Resolves multi-step operations that require chaining multiple tools.
Example: "Cancel Mehmet's appointment" requires:
  1. resolve_party("Mehmet") → party_id
  2. listAppointments(party_id, status=scheduled) → appointment_id
  3. cancel_appointment(appointment_id)

This module defines known chain patterns and resolves intermediate
dependencies between steps automatically.
"""

import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ChainStep:
    """A step in a tool chain."""
    tool_name: str
    parameters: Dict[str, Any]
    description: str
    output_key: Optional[str] = None  # Key to extract from result for next step
    input_mapping: Optional[Dict[str, str]] = None  # {param: "prev_step.output_key"}


# Predefined chain patterns for common multi-step operations
CHAIN_PATTERNS: Dict[str, List[Dict[str, Any]]] = {
    # Cancel appointment by party name
    "cancel_appointment_by_name": [
        {
            "tool": "listAppointments",
            "params_template": {"party_id": "{party_id}", "status": "SCHEDULED"},
            "output_key": "items[0].id",
            "description": "Hastanın aktif randevularını bul",
        },
        {
            "tool": "cancel_appointment",
            "params_template": {"appointment_id": "{prev_result}"},
            "description": "Randevuyu iptal et",
        },
    ],
    # Reschedule appointment by party name
    "reschedule_appointment_by_name": [
        {
            "tool": "listAppointments",
            "params_template": {"party_id": "{party_id}", "status": "SCHEDULED"},
            "output_key": "items[0].id",
            "description": "Hastanın aktif randevusunu bul",
        },
        {
            "tool": "reschedule_appointment",
            "params_template": {"appointment_id": "{prev_result}", "new_date": "{new_date}"},
            "description": "Randevuyu yeni tarihe taşı",
        },
    ],
    # View patient with full details
    "party_full_view": [
        {
            "tool": "get_party_comprehensive_summary",
            "params_template": {"party_id": "{party_id}"},
            "output_key": "party.id",
            "description": "Hasta bilgilerini getir",
        },
        {
            "tool": "listAppointments",
            "params_template": {"party_id": "{party_id}", "per_page": 5},
            "description": "Son randevuları getir",
        },
    ],
    # SGK check by patient name
    "sgk_check_by_name": [
        {
            "tool": "getPartyById",
            "params_template": {"party_id": "{party_id}"},
            "output_key": "tcNumber",
            "description": "Hastanın TC numarasını al",
        },
        {
            "tool": "query_sgk_patient_rights",
            "params_template": {"tc_number": "{prev_result}"},
            "description": "SGK hakkını sorgula",
        },
    ],
    # Invoice for patient
    "invoice_by_name": [
        {
            "tool": "listInvoices",
            "params_template": {"party_id": "{party_id}", "per_page": 5},
            "description": "Hastanın faturalarını getir",
        },
    ],
}


def detect_chain(action_type: str, entities: Dict[str, Any]) -> Optional[str]:
    """
    Detect if an action requires a multi-step chain.

    Returns chain pattern name if applicable, None otherwise.
    """
    has_party_id = bool(entities.get("party_id"))
    has_appointment_id = bool(entities.get("appointment_id"))

    if action_type == "cancel_appointment" and has_party_id and not has_appointment_id:
        return "cancel_appointment_by_name"

    if action_type == "reschedule_appointment" and has_party_id and not has_appointment_id:
        return "reschedule_appointment_by_name"

    if action_type in ("party_view", "get_party_comprehensive_summary") and has_party_id:
        return "party_full_view"

    if action_type in ("query_sgk_patient_rights", "sgk_check") and has_party_id and not entities.get("tc_number"):
        return "sgk_check_by_name"

    if action_type in ("invoices_list", "invoice_view") and has_party_id:
        return "invoice_by_name"

    return None


def resolve_chain_parameters(
    chain_name: str,
    entities: Dict[str, Any],
    prev_results: Optional[List[Dict[str, Any]]] = None,
) -> List[ChainStep]:
    """
    Resolve a chain pattern into concrete ChainSteps with filled parameters.
    """
    pattern = CHAIN_PATTERNS.get(chain_name)
    if not pattern:
        return []

    steps = []
    prev_result = None

    for i, step_def in enumerate(pattern):
        params = {}
        for key, template in step_def["params_template"].items():
            if isinstance(template, str) and template.startswith("{") and template.endswith("}"):
                var_name = template[1:-1]
                if var_name == "prev_result" and prev_result is not None:
                    params[key] = prev_result
                elif var_name in entities:
                    params[key] = entities[var_name]
                else:
                    params[key] = template  # Leave as template for runtime resolution
            else:
                params[key] = template

        steps.append(ChainStep(
            tool_name=step_def["tool"],
            parameters=params,
            description=step_def["description"],
            output_key=step_def.get("output_key"),
        ))

        # If we have previous results, extract the output for next step
        if prev_results and i < len(prev_results):
            output_key = step_def.get("output_key")
            if output_key:
                prev_result = _extract_nested(prev_results[i], output_key)

    return steps


def _extract_nested(data: Dict[str, Any], key_path: str) -> Any:
    """Extract a value from nested dict using dot/bracket notation."""
    parts = key_path.replace("[", ".").replace("]", "").split(".")
    current = data
    for part in parts:
        if current is None:
            return None
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
    return current
