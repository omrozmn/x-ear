"""
HBYS Clinical Microservice
Handles clinical encounters, vital signs, and clinical notes.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

app = create_hbys_app("clinical", "Clinical Service")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Import router after app/get_db are created to avoid circular imports
from router import router as clinical_router  # noqa: E402

app.include_router(clinical_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8101, reload=True)
