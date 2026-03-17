"""
HBYS Imaging Microservice
Radiology & PACS - Standalone service for imaging orders, reports, and DICOM integration.
Port: 8106
"""
import uvicorn
from hbys_common.service_app import create_hbys_app, get_db_dependency

from app.models import ImagingOrder, RadiologyReport, ReportTemplate  # noqa: F401 – register models
from app.router import router, set_db_dependency

app = create_hbys_app("imaging", "Radiology & PACS")

# Wire up DB dependency for this app
set_db_dependency(get_db_dependency(app))

app.include_router(router, prefix="/api/hbys/imaging")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8106, reload=True)
