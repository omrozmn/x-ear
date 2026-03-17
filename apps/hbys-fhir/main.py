"""
HBYS FHIR Gateway Microservice
================================
FHIR R4 & HL7 v2 interoperability layer for the X-EAR HBYS system.
Standalone microservice on port 8111.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as fhir_router

app = create_hbys_app("fhir", "FHIR R4 & HL7 Gateway")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include FHIR router
app.include_router(fhir_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8111, reload=True)
