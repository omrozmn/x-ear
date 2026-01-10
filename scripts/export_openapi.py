
import sys
import os
import json
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'apps/backend'))

from main import app
from fastapi.openapi.utils import get_openapi

def export_openapi():
    # Force full schema generation
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    
    output_path = os.path.join(os.getcwd(), 'apps/web/openapi.json')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(openapi_schema, f, indent=2)
        
    print(f"Successfully exported OpenAPI spec to {output_path}")
    
    # Validation Check
    ops = []
    for path, methods in openapi_schema['paths'].items():
        for method, details in methods.items():
            if 'operationId' in details:
                ops.append(details['operationId'])
                
    required_ops = [
        'listPatients', 'createPatients', 'bulkUploadPatients',
        'getInvoiceTemplates', 'getPrintQueue', 'addToPrintQueue',
        'listInventoryUnits', 'listInventoryActivities'
    ]
    
    missing = [op for op in required_ops if op not in ops]
    if missing:
        print(f"WARNING: Missing expected operationIds: {missing}")
        sys.exit(1)
    else:
        print("Verification SUCCESS: All critical operationIds found.")

if __name__ == "__main__":
    export_openapi()
