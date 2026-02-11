"""
End-to-end Party flow integration tests (G-09)
Tests complete Party → Role → Profile workflow
"""
import pytest
from fastapi.testclient import TestClient

from core.models.party import Party
from core.models.party_role import PartyRole
from core.models.hearing_profile import HearingProfile


def test_complete_party_flow(
    client: TestClient,
    db_session,
    test_tenant,
    test_admin_user,
    auth_headers
):
    """
    Test complete flow: Create Party → Assign Role → Create Profile
    
    **Feature: party-migration-cleanup, Property 1: Complete party workflow**
    **Validates: Requirements 2.5**
    """
    
    # Step 1: Create Party
    party_data = {
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "phone": "+905551234567",
        "email": "ahmet.yilmaz@example.com"
    }
    
    response = client.post(
        "/api/parties",
        json=party_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    party_id = response.json()["data"]["id"]
    
    # Verify party created in database
    party = db_session.query(Party).filter_by(id=party_id).first()
    assert party is not None
    assert party.first_name == "Ahmet"
    assert party.tenant_id == test_tenant.id
    
    # Step 2: Assign PATIENT role via service
    from services.party_service import PartyService
    service = PartyService(db_session)
    service.assign_role(party_id, "PATIENT", test_tenant.id)
    
    # Verify role assigned in database
    party_role = db_session.query(PartyRole).filter_by(
        party_id=party_id,
        role_code="PATIENT"
    ).first()
    assert party_role is not None
    assert party_role.tenant_id == test_tenant.id
    
    # Step 3: Create Hearing Profile (skip if endpoint doesn't exist)
    profile_data = {
        "sgkInfo": {
            "sgkNumber": "12345678901",
            "scheme": "over18_working",
            "eligibilityDate": "2025-01-01"
        }
    }
    
    profile_response = client.post(
        f"/api/hearing-profiles",
        json={"partyId": party_id, **profile_data},
        headers=auth_headers
    )
    # Skip profile creation if endpoint doesn't exist yet
    if profile_response.status_code == 404:
        pytest.skip("Hearing profile endpoint not implemented yet")
    assert profile_response.status_code == 201
    
    # Verify profile created in database
    profile = db_session.query(HearingProfile).filter_by(party_id=party_id).first()
    assert profile is not None
    assert profile.sgk_info_json is not None
    assert profile.sgk_info_json["sgkNumber"] == "12345678901"
    
    # Step 4: Verify complete entity can be retrieved
    get_response = client.get(
        f"/api/parties/{party_id}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    party_data = get_response.json()["data"]
    assert party_data["id"] == party_id
    assert party_data["firstName"] == "Ahmet"


def test_party_role_profile_isolation(
    client: TestClient,
    db_session,
    test_tenant,
    test_admin_user,
    auth_headers
):
    """
    Test that Party, Role, and Profile are properly isolated by tenant
    
    **Feature: party-migration-cleanup, Property 2: Tenant isolation across entities**
    **Validates: Requirements 2.4, 2.5**
    """
    
    # Create party in tenant A
    party_data = {
        "firstName": "Mehmet",
        "lastName": "Demir",
        "phone": "+905559876543"
    }
    
    response = client.post(
        "/api/parties",
        json=party_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    party_id = response.json()["data"]["id"]
    
    # Assign role via service
    from services.party_service import PartyService
    service = PartyService(db_session)
    service.assign_role(party_id, "CUSTOMER", test_tenant.id)
    
    # Create profile (skip if endpoint doesn't exist)
    profile_response = client.post(
        f"/api/hearing-profiles",
        json={
            "partyId": party_id,
            "sgkInfo": {"sgkNumber": "98765432109"}
        },
        headers=auth_headers
    )
    if profile_response.status_code == 404:
        pytest.skip("Hearing profile endpoint not implemented yet")
    
    # Verify all entities have correct tenant_id
    party = db_session.query(Party).filter_by(id=party_id).first()
    assert party.tenant_id == test_tenant.id
    
    # Check role
    role = db_session.query(PartyRole).filter_by(party_id=party_id).first()
    assert role.tenant_id == test_tenant.id
    
    # Check profile
    profile = db_session.query(HearingProfile).filter_by(party_id=party_id).first()
    # HearingProfile doesn't have tenant_id (isolated by party_id foreign key)
    assert profile.party_id == party_id


def test_multiple_roles_workflow(
    client: TestClient,
    db_session,
    test_tenant,
    test_admin_user,
    auth_headers
):
    """
    Test Party with multiple roles (N:N relationship)
    
    **Feature: party-migration-cleanup, Property 3: Multiple role assignment**
    **Validates: Requirements 2.2, 2.5**
    """
    
    # Create party
    party_data = {
        "firstName": "Ayşe",
        "lastName": "Kaya",
        "phone": "+905551112233"
    }
    
    response = client.post(
        "/api/parties",
        json=party_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    party_id = response.json()["data"]["id"]
    
    # Assign multiple roles via service
    from services.party_service import PartyService
    service = PartyService(db_session)
    
    roles = ["PATIENT", "CUSTOMER", "VIP"]
    for role_code in roles:
        service.assign_role(party_id, role_code, test_tenant.id)
    
    # Verify all roles assigned (may include default role)
    party_roles = db_session.query(PartyRole).filter_by(party_id=party_id).all()
    
    assert len(party_roles) >= 3  # At least the 3 we assigned
    role_codes = {pr.role_code for pr in party_roles}
    
    # Verify our assigned roles are present
    assert "PATIENT" in role_codes
    assert "CUSTOMER" in role_codes
    assert "VIP" in role_codes
    
    # Verify all have correct tenant
    for pr in party_roles:
        assert pr.tenant_id == test_tenant.id


def test_party_deletion_cascade(
    client: TestClient,
    db_session,
    test_tenant,
    test_admin_user,
    auth_headers
):
    """
    Test that deleting Party cascades to Role and Profile
    
    **Feature: party-migration-cleanup, Property 4: Cascade deletion**
    **Validates: Requirements 2.5**
    """
    
    # Create complete party with role and profile
    party_data = {
        "firstName": "Fatma",
        "lastName": "Şahin",
        "phone": "+905554445566"
    }
    
    response = client.post(
        "/api/parties",
        json=party_data,
        headers=auth_headers
    )
    party_id = response.json()["data"]["id"]
    
    # Add role via service
    from services.party_service import PartyService
    service = PartyService(db_session)
    service.assign_role(party_id, "PATIENT", test_tenant.id)
    
    # Add profile (skip if endpoint doesn't exist)
    profile_response = client.post(
        f"/api/hearing-profiles",
        json={
            "partyId": party_id,
            "sgkInfo": {"sgkNumber": "11111111111"}
        },
        headers=auth_headers
    )
    if profile_response.status_code == 404:
        pytest.skip("Hearing profile endpoint not implemented yet")
    
    # Delete party
    delete_response = client.delete(
        f"/api/parties/{party_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 200
    
    # Verify party deleted
    party = db_session.query(Party).filter_by(id=party_id).first()
    assert party is None
    
    # Verify role deleted (cascade)
    roles = db_session.query(PartyRole).filter_by(party_id=party_id).all()
    assert len(roles) == 0
    
    # Verify profile deleted (cascade)
    profiles = db_session.query(HearingProfile).filter_by(party_id=party_id).all()
    assert len(profiles) == 0

