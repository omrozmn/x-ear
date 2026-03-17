"""
HBYS Inpatient Microservice (MS-9)
Handles inpatient admissions, wards, beds, nursing observations, and nurse orders.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as inpatient_router

app = create_hbys_app("inpatient", "Inpatient & Nursing")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include inpatient router
app.include_router(inpatient_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8109, reload=True)
