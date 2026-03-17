"""
HBYS Prescription Microservice
===============================
Standalone microservice for e-Recete (e-Prescription) management.

Provides:
- Prescription CRUD with draft/approval workflow
- Prescription item management (medications per prescription)
- Medication catalog (non-tenant-scoped reference data)
- MEDULA e-Recete SOAP integration (stub)
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import prescription_router, medication_router

app = create_hbys_app("prescription", "Prescription & E-Recete Service")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include routers
app.include_router(prescription_router)
app.include_router(medication_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8103, reload=True)
