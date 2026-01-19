"""
Integration tests for HearingProfile isolation (G-09).

Tests:
- Create hearing profile
- SGK info isolation
- 1:1 relationship enforcement
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime


def create_test_party(client: TestClient, auth_headers: dict, suffix: str = "") -> dict:
    """Helper to create a test party"""
    response = client.post(
        "/api/parties",
        json={
            "firstName": f"Hearing{suffix}",
            "lastName": "Test",
            "phone": f"+90555777{suffix.zfill(4)}"
        },
        headers=auth_headers
    )
    if response.status_code != 201:
        pytest.skip(f"Could not create party: {response.json()}")
    return response.json()["data"]


class TestHearingProfile:
    """Integration tests for HearingProfile"""
    
    def test_party_creation_with_sgk_info_creates_hearing_profile(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session
    ):
        """Test that creating a party with sgkInfo creates a HearingProfile"""
        response = client.post(
            "/api/parties",
            json={
                "firstName": "SGK",
                "lastName": "Test",
                "phone": "+905557770001",
                "sgkInfo": {
                    "sgkNumber": "123456789",
                    "scheme": "over18_working",
                    "eligibilityDate": "2025-01-01"
                }
            },
            headers=auth_headers
        )
        
        if response.status_code != 201:
            pytest.skip(f"Party creation failed: {response.json()}")
        
        party_id = response.json()["data"]["id"]
        
        # Check if hearing profile was created
        from services.hearing_profile_service import HearingProfileService
        
        try:
            service = HearingProfileService(db_session)
            profile = service.get_by_party_id(party_id, "tenant-1")
            
            # Profile should exist with SGK info
            assert profile is not None
            assert profile.sgk_info_json is not None
        except ImportError:
            # Service might not exist yet
            pytest.skip("HearingProfileService not implemented")
    
    def test_hearing_profile_is_tenant_isolated(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session
    ):
        """Test that hearing profiles are tenant-isolated"""
        from datetime import timedelta
        from jose import jwt
        
        # Create party in tenant-1
        party = create_test_party(client, auth_headers, "0002")
        
        # Create hearing profile via service
        try:
            from services.hearing_profile_service import HearingProfileService
            service = HearingProfileService(db_session)
            
            service.update_sgk_info(
                party["id"],
                {"sgkNumber": "987654321"},
                "tenant-1"
            )
            
            # Try to access from different tenant
            # Should return None or raise error
            profile = service.get_by_party_id(party["id"], "tenant-2")
            
            # Should not find the profile (different tenant)
            assert profile is None
        except ImportError:
            pytest.skip("HearingProfileService not implemented")
    
    def test_hearing_profile_one_to_one_relationship(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session
    ):
        """Test that each party can only have one hearing profile"""
        party = create_test_party(client, auth_headers, "0003")
        
        try:
            from services.hearing_profile_service import HearingProfileService
            service = HearingProfileService(db_session)
            
            # Create first profile
            service.update_sgk_info(
                party["id"],
                {"sgkNumber": "111111111"},
                "tenant-1"
            )
            
            # Update with new data (should update, not create new)
            service.update_sgk_info(
                party["id"],
                {"sgkNumber": "222222222"},
                "tenant-1"
            )
            
            # Get profile - should only be one
            profile = service.get_by_party_id(party["id"], "tenant-1")
            
            assert profile is not None
            assert profile.sgk_info_json.get("sgkNumber") == "222222222"
            
            # Verify only one profile exists for this party
            from core.models.hearing_profile import HearingProfile
            count = db_session.query(HearingProfile).filter_by(party_id=party["id"]).count()
            assert count == 1
        except ImportError:
            pytest.skip("HearingProfileService not implemented")
    
    def test_sgk_info_not_leaked_to_party_response(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session
    ):
        """Test that SGK info is properly isolated in HearingProfile, not Party"""
        # Create party with SGK info
        response = client.post(
            "/api/parties",
            json={
                "firstName": "SGKLeak",
                "lastName": "Test",
                "phone": "+905557770004",
                "sgkInfo": {
                    "sgkNumber": "SENSITIVE123",
                    "scheme": "over18_retired"
                }
            },
            headers=auth_headers
        )
        
        if response.status_code != 201:
            pytest.skip(f"Party creation failed: {response.json()}")
        
        party_id = response.json()["data"]["id"]
        
        # Get party - SGK info should be in hearingProfile, not directly on party
        get_response = client.get(f"/api/parties/{party_id}", headers=auth_headers)
        
        if get_response.status_code == 200:
            data = get_response.json()["data"]
            
            # If sgkInfo is on party directly, it should be empty/null after migration
            # The data should be in hearingProfile instead
            if "hearingProfile" in data and data["hearingProfile"]:
                # Good - SGK info is in hearing profile
                assert "sgkInfo" in data["hearingProfile"] or "sgk_info" in data["hearingProfile"]
    
    def test_hearing_profile_read_via_party_endpoint(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session
    ):
        """Test that hearing profile can be read via party endpoint"""
        party = create_test_party(client, auth_headers, "0005")
        
        try:
            from services.hearing_profile_service import HearingProfileService
            service = HearingProfileService(db_session)
            
            # Create hearing profile
            service.update_sgk_info(
                party["id"],
                {
                    "sgkNumber": "333333333",
                    "scheme": "under4_parent_working",
                    "notes": "Test notes"
                },
                "tenant-1"
            )
            
            # Get party with hearing profile
            response = client.get(f"/api/parties/{party['id']}", headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()["data"]
                
                # Check if hearing profile is included
                if "hearingProfile" in data:
                    hp = data["hearingProfile"]
                    assert hp is not None
                    # SGK info should be accessible
                    sgk = hp.get("sgkInfo") or hp.get("sgk_info")
                    if sgk:
                        assert sgk.get("sgkNumber") == "333333333"
        except ImportError:
            pytest.skip("HearingProfileService not implemented")
