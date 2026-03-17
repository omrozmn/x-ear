"""
HBYS Prescription Service (MS-3)
================================
e-Recete (e-Prescription) management microservice for the X-EAR HBYS module.

Provides:
- Prescription CRUD with draft/approval workflow
- Prescription item management (medications per prescription)
- Medication catalog (non-tenant-scoped reference data)
- MEDULA e-Recete SOAP integration (stub)
"""

from .router import router as prescription_router

__all__ = ["prescription_router"]
