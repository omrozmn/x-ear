"""
HBYS Medical Device Microservice (MS-14)
Manages medical device integration, communication drivers, data parsing,
and background listeners for incoming device data (HL7, ASTM, DICOM, serial).
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as medical_device_router

app = create_hbys_app("medical_device", "Medical Device Integration")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include medical device router
app.include_router(medical_device_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8114, reload=True)
