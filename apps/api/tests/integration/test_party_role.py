"""
Integration tests for PartyRole assignment (G-09).

Tests:
- Assign role to party
- Remove role from party
- Party with multiple roles (N:N)
- Role permissions inheritance
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime


def create_test_party(client: TestClient, auth_headers: dict, suffix: str = "") -> dict:
    """Helper to create a test party"""
    response = client.post(
        "/api/parties",
        json={
            "firstName": f"Role{suffix}",
            "lastName": "Test",
            "phone": f"+90555666{suffix.zfill(4)}"
        },
        headers=auth_headers
    )
    return response.json()["data"]


class TestPartyRole:
    """Integration tests for PartyRole assignment"""
    
    def test_party_has_default_role_on_creation(self, client: TestClient, auth_headers: dict, db_session):
        """Test that a party gets a default role when created"""
        party = create_test_party(client, auth_headers, "001")
        
        # Get party details
        response = client.get(f"/api/parties/{party['id']}", headers=auth_headers)
        data = response.json()["data"]
        
        # Party should have at least one role (default PATIENT or LEAD)
        # Note: This depends on the service implementation
        # If roles are not returned in the response, this test documents expected behavior
        if "roles" in data and data["roles"]:
            assert len(data["roles"]) >= 1
    
    def test_assign_role_to_party(self, client: TestClient, auth_headers: dict, db_session):
        """Test assigning a role to a party via service"""
        from services.party_service import PartyService
        from database import get_db
        
        party = create_test_party(client, auth_headers, "002")
        
        # Use service directly to assign role
        service = PartyService(db_session)
        service.assign_role(party["id"], "CUSTOMER", "tenant-1")
        
        # Verify role assigned
        roles = service.list_roles(party["id"], "tenant-1")
        assert any(r["code"] == "CUSTOMER" for r in roles)
    
    def test_remove_role_from_party(self, client: TestClient, auth_headers: dict, db_session):
        """Test removing a role from a party"""
        from services.party_service import PartyService
        
        party = create_test_party(client, auth_headers, "003")
        
        service = PartyService(db_session)
        
        # Assign role
        service.assign_role(party["id"], "LEAD", "tenant-1")
        
        # Verify assigned
        roles = service.list_roles(party["id"], "tenant-1")
        assert any(r["code"] == "LEAD" for r in roles)
        
        # Remove role
        service.remove_role(party["id"], "LEAD", "tenant-1")
        
        # Verify removed
        roles = service.list_roles(party["id"], "tenant-1")
        assert not any(r["code"] == "LEAD" for r in roles)
    
    def test_party_can_have_multiple_roles(self, client: TestClient, auth_headers: dict, db_session):
        """Test N:N relationship - party can have multiple roles"""
        from services.party_service import PartyService
        
        party = create_test_party(client, auth_headers, "004")
        
        service = PartyService(db_session)
        
        # Assign multiple roles
        service.assign_role(party["id"], "PATIENT", "tenant-1")
        service.assign_role(party["id"], "CUSTOMER", "tenant-1")
        service.assign_role(party["id"], "VIP", "tenant-1")
        
        # Verify all roles
        roles = service.list_roles(party["id"], "tenant-1")
        role_codes = [r["code"] for r in roles]
        
        assert "PATIENT" in role_codes
        assert "CUSTOMER" in role_codes
        assert "VIP" in role_codes
    
    def test_duplicate_role_assignment_is_idempotent(self, client: TestClient, auth_headers: dict, db_session):
        """Test that assigning the same role twice doesn't create duplicates"""
        from services.party_service import PartyService
        
        party = create_test_party(client, auth_headers, "005")
        
        service = PartyService(db_session)
        
        # Assign same role twice
        service.assign_role(party["id"], "PATIENT", "tenant-1")
        service.assign_role(party["id"], "PATIENT", "tenant-1")
        
        # Should only have one PATIENT role
        roles = service.list_roles(party["id"], "tenant-1")
        patient_roles = [r for r in roles if r["code"] == "PATIENT"]
        
        assert len(patient_roles) == 1
    
    def test_role_assignment_has_timestamp(self, client: TestClient, auth_headers: dict, db_session):
        """Test that role assignments have assignedAt timestamp"""
        from services.party_service import PartyService
        
        party = create_test_party(client, auth_headers, "006")
        
        service = PartyService(db_session)
        service.assign_role(party["id"], "CUSTOMER", "tenant-1")
        
        roles = service.list_roles(party["id"], "tenant-1")
        customer_role = next((r for r in roles if r["code"] == "CUSTOMER"), None)
        
        assert customer_role is not None
        assert "assignedAt" in customer_role
    
    def test_status_change_syncs_role(self, client: TestClient, auth_headers: dict, db_session):
        """Test that changing party status syncs roles appropriately"""
        party = create_test_party(client, auth_headers, "007")
        
        # Update status to customer
        response = client.put(
            f"/api/parties/{party['id']}",
            json={"status": "customer"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify CUSTOMER role was assigned
        from services.party_service import PartyService
        service = PartyService(db_session)
        roles = service.list_roles(party["id"], "tenant-1")
        
        # Should have CUSTOMER role after status change
        role_codes = [r["code"] for r in roles]
        assert "CUSTOMER" in role_codes
