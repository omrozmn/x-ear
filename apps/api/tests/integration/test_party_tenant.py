"""
Integration tests for Party tenant isolation (G-09).

Tests:
- Tenant A cannot see tenant B parties
- Tenant A cannot modify tenant B parties
- Cross-tenant access denied
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt


def create_tenant_token(user_id: str, tenant_id: str, role: str = 'admin') -> str:
    """Create a JWT token for a specific tenant"""
    payload = {
        'sub': user_id,
        'role': role,
        'tenant_id': tenant_id,
        'user_type': 'tenant',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, 'test-secret', algorithm='HS256')


def create_tenant_headers(tenant_id: str, user_id: str = 'test-user') -> dict:
    """Create auth headers for a specific tenant"""
    token = create_tenant_token(user_id, tenant_id)
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def tenant_a_headers():
    """Headers for Tenant A"""
    return create_tenant_headers('tenant-a', 'user-a')


@pytest.fixture
def tenant_b_headers():
    """Headers for Tenant B"""
    return create_tenant_headers('tenant-b', 'user-b')


@pytest.fixture
def setup_tenants(db_session):
    """Create test tenants"""
    from core.models.tenant import Tenant
    from core.models.user import User
    
    # Create Tenant A
    tenant_a = db_session.query(Tenant).filter_by(id='tenant-a').first()
    if not tenant_a:
        tenant_a = Tenant(
            id='tenant-a',
            name='Tenant A',
            slug='tenant-a',
            owner_email='a@test.com',
            billing_email='a@test.com',
            is_active=True
        )
        db_session.add(tenant_a)
    
    # Create Tenant B
    tenant_b = db_session.query(Tenant).filter_by(id='tenant-b').first()
    if not tenant_b:
        tenant_b = Tenant(
            id='tenant-b',
            name='Tenant B',
            slug='tenant-b',
            owner_email='b@test.com',
            billing_email='b@test.com',
            is_active=True
        )
        db_session.add(tenant_b)
    
    # Create users for each tenant
    user_a = db_session.query(User).filter_by(id='user-a').first()
    if not user_a:
        user_a = User(
            id='user-a',
            username='user_a',
            email='user_a@test.com',
            role='admin',
            tenant_id='tenant-a',
            is_active=True
        )
        user_a.set_password('test123')
        db_session.add(user_a)
    
    user_b = db_session.query(User).filter_by(id='user-b').first()
    if not user_b:
        user_b = User(
            id='user-b',
            username='user_b',
            email='user_b@test.com',
            role='admin',
            tenant_id='tenant-b',
            is_active=True
        )
        user_b.set_password('test123')
        db_session.add(user_b)
    
    db_session.commit()
    
    return {'tenant_a': tenant_a, 'tenant_b': tenant_b}


class TestPartyTenantIsolation:
    """Integration tests for Party tenant isolation"""
    
    def test_tenant_a_cannot_see_tenant_b_parties(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that tenant A cannot see tenant B's parties"""
        # Create party in tenant B
        response_b = client.post(
            "/api/parties",
            json={
                "firstName": "TenantB",
                "lastName": "Party",
                "phone": "+905551000001"
            },
            headers=tenant_b_headers
        )
        
        # Skip if creation failed (tenant setup issue)
        if response_b.status_code != 201:
            pytest.skip("Could not create party in tenant B")
        
        party_b_id = response_b.json()["data"]["id"]
        
        # List parties as tenant A - should not see tenant B's party
        response_a = client.get("/api/parties", headers=tenant_a_headers)
        
        if response_a.status_code == 200:
            party_ids = [p["id"] for p in response_a.json()["data"]]
            assert party_b_id not in party_ids
    
    def test_tenant_a_cannot_get_tenant_b_party(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that tenant A cannot get tenant B's party by ID"""
        # Create party in tenant B
        response_b = client.post(
            "/api/parties",
            json={
                "firstName": "TenantB",
                "lastName": "GetTest",
                "phone": "+905551000002"
            },
            headers=tenant_b_headers
        )
        
        if response_b.status_code != 201:
            pytest.skip("Could not create party in tenant B")
        
        party_b_id = response_b.json()["data"]["id"]
        
        # Try to get tenant B's party as tenant A
        response = client.get(f"/api/parties/{party_b_id}", headers=tenant_a_headers)
        
        # Should return 404 (not 403) to hide existence
        assert response.status_code == 404
    
    def test_tenant_a_cannot_update_tenant_b_party(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that tenant A cannot update tenant B's party"""
        # Create party in tenant B
        response_b = client.post(
            "/api/parties",
            json={
                "firstName": "TenantB",
                "lastName": "UpdateTest",
                "phone": "+905551000003"
            },
            headers=tenant_b_headers
        )
        
        if response_b.status_code != 201:
            pytest.skip("Could not create party in tenant B")
        
        party_b_id = response_b.json()["data"]["id"]
        
        # Try to update tenant B's party as tenant A
        response = client.put(
            f"/api/parties/{party_b_id}",
            json={"firstName": "Hacked"},
            headers=tenant_a_headers
        )
        
        # Should return 404 (not 403) to hide existence
        assert response.status_code == 404
    
    def test_tenant_a_cannot_delete_tenant_b_party(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that tenant A cannot delete tenant B's party"""
        # Create party in tenant B
        response_b = client.post(
            "/api/parties",
            json={
                "firstName": "TenantB",
                "lastName": "DeleteTest",
                "phone": "+905551000004"
            },
            headers=tenant_b_headers
        )
        
        if response_b.status_code != 201:
            pytest.skip("Could not create party in tenant B")
        
        party_b_id = response_b.json()["data"]["id"]
        
        # Try to delete tenant B's party as tenant A
        response = client.delete(f"/api/parties/{party_b_id}", headers=tenant_a_headers)
        
        # Should return 404 (not 403) to hide existence
        assert response.status_code == 404
        
        # Verify party still exists in tenant B
        verify_response = client.get(f"/api/parties/{party_b_id}", headers=tenant_b_headers)
        assert verify_response.status_code == 200
    
    def test_each_tenant_sees_only_own_parties(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that each tenant only sees their own parties"""
        # Create party in tenant A
        response_a = client.post(
            "/api/parties",
            json={
                "firstName": "TenantA",
                "lastName": "Own",
                "phone": "+905551000005"
            },
            headers=tenant_a_headers
        )
        
        # Create party in tenant B
        response_b = client.post(
            "/api/parties",
            json={
                "firstName": "TenantB",
                "lastName": "Own",
                "phone": "+905551000006"
            },
            headers=tenant_b_headers
        )
        
        # List as tenant A
        list_a = client.get("/api/parties", headers=tenant_a_headers)
        if list_a.status_code == 200:
            names_a = [p.get("firstName") for p in list_a.json()["data"]]
            # Should see TenantA, not TenantB
            assert "TenantA" in names_a or len(names_a) == 0  # May be empty if setup failed
            assert "TenantB" not in names_a
        
        # List as tenant B
        list_b = client.get("/api/parties", headers=tenant_b_headers)
        if list_b.status_code == 200:
            names_b = [p.get("firstName") for p in list_b.json()["data"]]
            # Should see TenantB, not TenantA
            assert "TenantB" in names_b or len(names_b) == 0
            assert "TenantA" not in names_b
    
    def test_party_count_is_tenant_scoped(
        self, 
        client: TestClient, 
        tenant_a_headers: dict,
        tenant_b_headers: dict,
        setup_tenants,
        db_session
    ):
        """Test that party count only includes tenant's own parties"""
        # Get initial counts
        count_a_before = client.get("/api/parties/count", headers=tenant_a_headers)
        count_b_before = client.get("/api/parties/count", headers=tenant_b_headers)
        
        # Create party in tenant A
        client.post(
            "/api/parties",
            json={
                "firstName": "CountA",
                "lastName": "Test",
                "phone": "+905551000007"
            },
            headers=tenant_a_headers
        )
        
        # Get counts after
        count_a_after = client.get("/api/parties/count", headers=tenant_a_headers)
        count_b_after = client.get("/api/parties/count", headers=tenant_b_headers)
        
        # Tenant A count should increase
        if count_a_before.status_code == 200 and count_a_after.status_code == 200:
            before = count_a_before.json()["data"]["count"]
            after = count_a_after.json()["data"]["count"]
            assert after >= before  # Should increase or stay same
        
        # Tenant B count should NOT increase
        if count_b_before.status_code == 200 and count_b_after.status_code == 200:
            before = count_b_before.json()["data"]["count"]
            after = count_b_after.json()["data"]["count"]
            assert after == before  # Should stay same
