"""
HBYS Realtime Notifications Microservice
Clinical notifications, WebSocket real-time alerts, and notification preferences.
"""
import sys
import os

# Add hbys-common to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hbys-common"))

from hbys_common.service_app import create_hbys_app, get_db_dependency
from router import router

app = create_hbys_app("realtime", "Clinical Notifications & WebSocket")

# Create DB dependency bound to this app
get_db = get_db_dependency(app)

# Include router
app.include_router(router, prefix="/api/hbys/notifications")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8113, reload=True)
