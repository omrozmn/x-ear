"""
Clinical event handlers.
Each handler processes a specific type of clinical event and dispatches
the appropriate notifications through the realtime service.
"""
from .critical_lab_handler import handle_critical_lab
from .vital_alert_handler import handle_vital_alert
from .medication_due_handler import handle_medication_due
from .code_blue_handler import handle_code_blue
from .consultation_handler import handle_consultation_request

__all__ = [
    "handle_critical_lab",
    "handle_vital_alert",
    "handle_medication_due",
    "handle_code_blue",
    "handle_consultation_request",
]
