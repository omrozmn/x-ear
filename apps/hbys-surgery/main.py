"""
HBYS Surgery Microservice
Manages surgical procedures, operating room scheduling, surgical team assignments,
WHO safety checklists, and anesthesia records.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as surgery_router

app = create_hbys_app("surgery", "Surgery & Operating Room")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include surgery router
app.include_router(surgery_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8108, reload=True)
