
import sys
import os
import json
import logging

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from fastapi.openapi.utils import get_openapi

import schemas.patients as patients
import schemas.sales as sales
import schemas.devices as devices
import schemas.inventory as inventory
import schemas.invoices as invoices
import schemas.notifications as notifications
import schemas.sms as sms
import schemas.appointments as appointments
import schemas.users as users
import schemas.auth as auth
import schemas.branches as branches
import schemas.tenants as tenants
import schemas.suppliers as suppliers
import schemas.campaigns as campaigns

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openapi_check")

def check_openapi():
    logger.info("Generating OpenAPI spec from FastAPI app...")
    
    # Generate the OpenAPI schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    # Check for critical schemas
    schemas = openapi_schema.get("components", {}).get("schemas", {})
    logger.info(f"Found {len(schemas)} schemas in components.")
    
    def _pydantic_model_names(module):
        names = set()
        for name, obj in module.__dict__.items():
            if not (isinstance(name, str) and name and name[0].isupper()):
                continue
            if getattr(obj, "__module__", "") != module.__name__:
                continue
            if hasattr(obj, "model_fields") or hasattr(obj, "__fields__"):
                names.add(name)
        return names
    
    schema_modules = [
        patients,
        sales,
        devices,
        inventory,
        invoices,
        notifications,
        sms,
        appointments,
        users,
        auth,
        branches,
        tenants,
        suppliers,
        campaigns,
    ]

    expected = set()
    for m in schema_modules:
        expected |= _pydantic_model_names(m)

    # Base / internal helper models are not required for frontend codegen.
    # We enforce that concrete DTOs (Create/Update/Read/etc) are present.
    expected = {name for name in expected if not name.endswith("Base")}

    # Some schema models exist for future/alternate flows and are not yet
    # referenced by any route. Track them explicitly so the gate remains
    # actionable (route typing work can remove entries over time).
    # Zero tolerance: check everything
    allow_unreferenced = set()
    expected -= allow_unreferenced

    # FastAPI/OpenAPI uses the actual model name it has seen via request bodies,
    # response_model, or model references. If a schema model is never referenced
    # by any route it won't appear in components.schemas. Some routers in this
    # codebase define local request models (e.g. routers/auth.py) that intentionally
    # shadow canonical schema names (e.g. schemas/auth.py). In that case, OpenAPI
    # will include the local model (typically shown as routers__auth__LoginRequest)
    # and not the canonical one.
    #
    # To keep this gate strict but fair, treat expected models as present if
    # either (a) a component schema exists with the same name, or (b) a namespaced
    # component schema exists that ends with __<ModelName>.
    def _is_present(model_name: str) -> bool:
        if model_name in schemas:
            return True
        suffix = f"__{model_name}"
        return any(k.endswith(suffix) for k in schemas.keys())

    missing = sorted([name for name in expected if not _is_present(name)])

    logger.info(f"Expected {len(expected)} schema models from schemas/*.py")
    if missing:
        logger.error(f"MISSING schema models from OpenAPI components: {len(missing)}")
        logger.error(", ".join(missing[:200]))
        if len(missing) > 200:
            logger.error(f"... and {len(missing) - 200} more")
        logger.error("The OpenAPI spec is INCOMPLETE. Frontend codegen will fail.")
        
        # Dump current schema keys for debugging
        logger.info(f"Available schemas: {sorted(list(schemas.keys()))}")
        return False
    
    logger.info("All critical schemas checked are present.")
    return True

if __name__ == "__main__":
    success = check_openapi()
    sys.exit(0 if success else 1)
