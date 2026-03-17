"""
HBYS Pharmacy Microservice
============================
Standalone microservice for pharmacy management.

Provides:
- Pharmacy stock management (CRUD, ITS tracking, narcotic flags)
- Medication dispensing with automatic stock deduction
- Drug interaction checking (30 pre-seeded Turkish interactions)
- Stock movement tracking (purchase, dispensing, return, adjustment, transfer)
- Expiry alerts and narcotic inventory reports
- Patient medication history
"""
from hbys_common.service_app import create_hbys_app, get_db_dependency

app = create_hbys_app("pharmacy", "Pharmacy Management")

# Create the get_db dependency bound to this app
get_db = get_db_dependency(app)

# Import router after get_db is defined (router imports get_db from main)
from router import router as pharmacy_router  # noqa: E402

# Include pharmacy router
app.include_router(pharmacy_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8105, reload=True)
