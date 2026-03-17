"""
Inpatient Models Package
"""
from .admission import Admission
from .ward import Ward
from .bed import Bed
from .nursing_observation import NursingObservation
from .nurse_order import NurseOrder

__all__ = ["Admission", "Ward", "Bed", "NursingObservation", "NurseOrder"]
