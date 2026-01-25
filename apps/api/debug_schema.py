import sys
import os
from pathlib import Path

# Add api to path
api_dir = Path("/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api")
sys.path.insert(0, str(api_dir))

from schemas.parties import PartyRead
from schemas.base import ResponseEnvelope
from core.database import Base, engine, SessionLocal
from core.models.party import Party
from services.party_service import PartyService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import ValidationError

# PATCH PartyRead to print its mapping
original_map = PartyRead.map_orm_fields
@classmethod
def debug_map(cls, data):
    res = original_map(data)
    if not isinstance(data, dict):
        print(f"DEBUG: Mapped dict keys: {list(res.keys()) if isinstance(res, dict) else 'Not a dict'}")
        if isinstance(res, dict):
            print(f"DEBUG: 'tags' type: {type(res.get('tags'))} value: {res.get('tags')}")
            print(f"DEBUG: 'tags' alias type: {type(res.get('tags'))}")
    return res
PartyRead.map_orm_fields = debug_map

# Mock data mimicking what Party.to_dict() or the ORM object would provide
data = {
    "id": "test-id",
    "firstName": "Test",
    "lastName": "User",
    "phone": "05320000000",
    "tcNumber": "12345678901",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00",
    "updatedAt": "2024-01-01T00:00:00",
    # Simulate missing or misnamed role fields
    "roles": [{"role_code": "patient"}]
}

try:
    print("Attempting to validate PartyRead...")
    p = PartyRead.model_validate(data)
    print("Validation successful!")
except ValidationError as e:
    print(f"Validation failed with {e.error_count()} errors:")
    for error in e.errors():
        print(f"  Field: {error['loc']} - Error: {error['msg']}")

# Setup in-memory DB
test_engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=test_engine)
TestSession = sessionmaker(bind=test_engine)
session = TestSession()

# Create real ORM object via service
service = PartyService(session)
data = {
    "id": "service-test-id",
    "firstName": "Service",
    "lastName": "Test",
    "phone": "05320000001",
    "tcNumber": "12345678902",
    "status": "active"
}

try:
    print("\nAttempting to create party via Service...")
    p_obj = service.create_party(data, tenant_id="tenant-1")
    print("Service create successful!")
    
    print("\nAttempting to validate ResponseEnvelope[PartyRead] from Service returned object...")
    # This is exactly what the router does: return ResponseEnvelope(data=p_obj)
    env = ResponseEnvelope[PartyRead](data=p_obj)
    print("Validation successful!")
    
    # Also test the list view structure
    print("\nAttempting to validate ResponseEnvelope[List[PartyRead]] from Service list...")
    items, total, cursor = service.list_parties(tenant_id="tenant-1")
    env_list = ResponseEnvelope[List[PartyRead]](data=items)
    print("List validation successful!")

except ValidationError as e:
    print(f"Validation failed with {e.error_count()} errors:")
    for error in e.errors():
        print(f"  Field: {error['loc']} - Error: {error['msg']} - Type: {error['type']}")
except Exception as e:
    print(f"An unexpected error occurred: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

session.close()
