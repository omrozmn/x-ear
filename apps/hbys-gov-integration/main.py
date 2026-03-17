"""
HBYS Government Integration Microservice
Handles integration with Turkish government health systems:
Medula, e-Nabiz, SKRS, MHRS, ITS, and Teleradyoloji.
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

from router import router as gov_router

app = create_hbys_app("gov_integration", "Government Systems Integration")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Include government integration router
app.include_router(gov_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8112, reload=True)
