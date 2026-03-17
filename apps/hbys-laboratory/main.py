"""
HBYS Laboratory Microservice
Handles lab orders, test definitions, specimen collection, result entry and verification.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as laboratory_router

app = create_hbys_app("laboratory", "Laboratory Information System")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include laboratory router
app.include_router(laboratory_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8104, reload=True)
