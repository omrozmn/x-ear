"""
HBYS CDSS Microservice
Clinical Decision Support System: drug interaction checking, allergy verification,
dose range warnings, critical lab result alerts, duplicate order detection,
clinical protocol management, and patient allergy management.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as cdss_router

app = create_hbys_app("cdss", "Clinical Decision Support")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include CDSS router
app.include_router(cdss_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8110, reload=True)
