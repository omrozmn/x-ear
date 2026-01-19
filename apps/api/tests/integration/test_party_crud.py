"""
Integration tests for Party CRUD operations (G-09).

Tests:
- Create party
- Read party
- Update party
- Delete party
- List parties with pagination
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from jose import jwt


class TestPartyCRUD:
    """Integration tests for Party CRUD operations"""
    
    def test_create_party_success(self, client: TestClient, auth_headers: dict, db_session):
        """Test creating a new party with valid data"""
        response = client.post(
            "/api/parties",
            json={
                "firstName": "Test",
                "lastName": "User",
                "phone": "+905551234567",
                "email": "test@example.com"
            },
            headers=auth_headers
        )
        
        if response.status_code != 201:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["firstName"] == "Test"
        assert data["data"]["lastName"] == "User"
        assert "id" in data["data"]
    
    def test_create_party_with_tc_number(self, client: TestClient, auth_headers: dict, db_session):
        """Test creating a party with TC number"""
        response = client.post(
            "/api/parties",
            json={
                "firstName": "TC",
                "lastName": "Test",
                "phone": "+905559876543",
                "tcNumber": "12345678901"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["tcNumber"] == "12345678901"
    
    def test_create_party_missing_required_fields(self, client: TestClient, auth_headers: dict, db_session):
        """Test creating a party without required fields fails"""
        response = client.post(
            "/api/parties",
            json={
                "email": "incomplete@example.com"
            },
            headers=auth_headers
        )
        
        # Should fail validation
        assert response.status_code in [400, 422]
    
    def test_get_party_success(self, client: TestClient, auth_headers: dict, db_session):
        """Test getting a party by ID"""
        # First create a party
        create_response = client.post(
            "/api/parties",
            json={
                "firstName": "Get",
                "lastName": "Test",
                "phone": "+905551111111"
            },
            headers=auth_headers
        )
        party_id = create_response.json()["data"]["id"]
        
        # Then get it
        response = client.get(f"/api/parties/{party_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == party_id
        assert data["data"]["firstName"] == "Get"
    
    def test_get_party_not_found(self, client: TestClient, auth_headers: dict, db_session):
        """Test getting a non-existent party returns 404"""
        response = client.get("/api/parties/non-existent-id", headers=auth_headers)
        
        assert response.status_code == 404
    
    def test_update_party_success(self, client: TestClient, auth_headers: dict, db_session):
        """Test updating a party"""
        # Create party
        create_response = client.post(
            "/api/parties",
            json={
                "firstName": "Update",
                "lastName": "Test",
                "phone": "+905552222222"
            },
            headers=auth_headers
        )
        party_id = create_response.json()["data"]["id"]
        
        # Update party
        response = client.put(
            f"/api/parties/{party_id}",
            json={
                "firstName": "Updated",
                "lastName": "Name"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["firstName"] == "Updated"
        assert data["data"]["lastName"] == "Name"
    
    def test_update_party_not_found(self, client: TestClient, auth_headers: dict, db_session):
        """Test updating a non-existent party returns 404"""
        response = client.put(
            "/api/parties/non-existent-id",
            json={"firstName": "Test"},
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_delete_party_success(self, client: TestClient, auth_headers: dict, db_session):
        """Test deleting a party"""
        # Create party
        create_response = client.post(
            "/api/parties",
            json={
                "firstName": "Delete",
                "lastName": "Test",
                "phone": "+905553333333"
            },
            headers=auth_headers
        )
        party_id = create_response.json()["data"]["id"]
        
        # Delete party
        response = client.delete(f"/api/parties/{party_id}", headers=auth_headers)
        
        assert response.status_code == 200
        
        # Verify deleted
        get_response = client.get(f"/api/parties/{party_id}", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_list_parties_success(self, client: TestClient, auth_headers: dict, db_session):
        """Test listing parties with pagination"""
        # Create multiple parties
        for i in range(3):
            client.post(
                "/api/parties",
                json={
                    "firstName": f"List{i}",
                    "lastName": "Test",
                    "phone": f"+9055544444{i}0"
                },
                headers=auth_headers
            )
        
        # List parties
        response = client.get("/api/parties?page=1&per_page=10", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert "meta" in data
        assert "total" in data["meta"]
    
    def test_list_parties_with_search(self, client: TestClient, auth_headers: dict, db_session):
        """Test listing parties with search filter"""
        # Create a party with unique name
        client.post(
            "/api/parties",
            json={
                "firstName": "UniqueSearchName",
                "lastName": "Test",
                "phone": "+905555555555"
            },
            headers=auth_headers
        )
        
        # Search for it
        response = client.get("/api/parties?search=UniqueSearchName", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        assert any(p["firstName"] == "UniqueSearchName" for p in data["data"])
    
    def test_list_parties_pagination_meta(self, client: TestClient, auth_headers: dict, db_session):
        """Test that pagination meta is correctly returned"""
        response = client.get("/api/parties?page=1&per_page=5", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        meta = data["meta"]
        
        assert "page" in meta
        assert "perPage" in meta
        assert "total" in meta
        assert "totalPages" in meta
        assert meta["page"] == 1
        assert meta["perPage"] == 5
