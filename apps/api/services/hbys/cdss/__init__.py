"""
HBYS CDSS Service (MS-10)
==========================
Clinical Decision Support System microservice for the X-EAR HBYS module.

Provides:
- Drug interaction checking
- Drug allergy verification
- Dose range warnings
- Critical lab result alerts
- Duplicate order detection
- Clinical protocol management
- Patient allergy management
"""

from .router import router as cdss_router

__all__ = ["cdss_router"]
