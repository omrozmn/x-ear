"""
HBYS Emergency Microservice (MS-7)
===================================
Standalone microservice for emergency department management.

Provides:
- Emergency visit registration (including unidentified patients)
- Triage assessment with Manchester Triage System algorithm
- Doctor and bed assignment
- Discharge, admission, and transfer workflows
- Forensic case reporting
- Real-time dashboard statistics
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as emergency_router

app = create_hbys_app("emergency", "Emergency Service")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include emergency router
app.include_router(emergency_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8107, reload=True)
