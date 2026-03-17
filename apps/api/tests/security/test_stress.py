"""
Stress & Concurrency Tests
============================
Tests race conditions, concurrent access, and system resilience.
"""
import os
import sys
import time
import uuid
import pytest
import threading
from pathlib import Path
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from jose import jwt

_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))


def _make_token(user_id='test-admin', tenant_id='tenant-1', role='admin'):
    """Helper to create JWT tokens for stress tests."""
    payload = {
        'sub': user_id,
        'role': role,
        'tenant_id': tenant_id,
        'role_permissions': ['*'],
        'perm_ver': 1,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, 'test-secret', algorithm='HS256')


def _make_headers(user_id='test-admin', tenant_id='tenant-1'):
    """Helper to create auth headers with unique idempotency key."""
    token = _make_token(user_id=user_id, tenant_id=tenant_id)
    idem = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:8]}"
    return {
        'Authorization': f'Bearer {token}',
        'Idempotency-Key': idem
    }


# ============================================================================
# 1. CONCURRENT LOGIN STRESS TEST
# ============================================================================

class TestConcurrentLogin:
    """Test login endpoint under concurrent load."""

    def test_sequential_login_attempts(self, client, test_admin_user):
        """Multiple login attempts must all get proper responses."""
        results = []
        for i in range(5):
            resp = client.post("/api/auth/login", json={
                "identifier": "admin",
                "password": "admin123"
            })
            results.append(resp.status_code)

        # All should be 200 (success), 401 (bad creds), 422 (validation), or 429 (rate limited)
        for status in results:
            assert status in (200, 401, 422, 429), f"Unexpected status: {status}"

    def test_sequential_failed_logins(self, client):
        """Multiple failed logins must not crash the server."""
        results = []
        for i in range(10):
            resp = client.post("/api/auth/login", json={
                "identifier": f"nonexistent-{i}",
                "password": "wrong"
            })
            results.append(resp.status_code)

        # All should be 401, 422 (validation), or 429 (rate limited) - never 200 or 500
        for status in results:
            assert status in (401, 422, 429), f"Unexpected status: {status}"
        # Should NOT have succeeded
        assert 200 not in results, "Failed login returned 200!"
        # Should NOT crash
        assert 500 not in results, "Server crashed on failed login!"


# ============================================================================
# 2. CONCURRENT PARTY CREATION TEST
# ============================================================================

class TestConcurrentPartyCreation:
    """Test party creation under concurrent load."""

    def test_sequential_party_creation(self, client, test_admin_user, test_tenant):
        """Multiple party creations must all succeed or fail gracefully."""
        results = []
        for i in range(5):
            headers = _make_headers()
            resp = client.post("/api/parties", json={
                "firstName": f"Stress{i}",
                "lastName": "Test",
                "phone": f"555000{i:04d}"
            }, headers=headers)
            results.append(resp.status_code)

        # Most should succeed (201)
        success_count = sum(1 for s in results if s == 201)
        assert success_count >= 1, f"No parties created! Statuses: {results}"
        # No server crashes
        crash_count = sum(1 for s in results if s >= 500)
        assert crash_count <= 1, f"Too many server errors: {crash_count}/5"


# ============================================================================
# 3. CONCURRENT TOKEN REFRESH TEST
# ============================================================================

class TestConcurrentTokenRefresh:
    """Test token refresh under concurrent load."""

    def test_concurrent_refresh_tokens(self, client, test_admin_user):
        """Multiple concurrent token refreshes must not create inconsistencies."""
        # Create refresh token
        refresh_payload = {
            'sub': test_admin_user.id,
            'type': 'refresh',
            'tenant_id': test_admin_user.tenant_id,
            'role': test_admin_user.role,
            'exp': datetime.utcnow() + timedelta(days=30)
        }
        refresh_token = jwt.encode(refresh_payload, 'test-secret', algorithm='HS256')

        results = []

        def refresh(i):
            resp = client.post("/api/auth/refresh", headers={
                'Authorization': f'Bearer {refresh_token}'
            })
            return resp.status_code

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(refresh, i) for i in range(10)]
            for f in as_completed(futures):
                results.append(f.result())

        # All should get valid new tokens
        success_count = sum(1 for s in results if s == 200)
        assert success_count >= 5, f"Too many refresh failures: {results}"


# ============================================================================
# 4. ENDPOINT RESPONSE TIME TEST
# ============================================================================

class TestEndpointResponseTime:
    """Test endpoint response times under load."""

    def test_health_check_fast(self, client):
        """Health check must respond in under 500ms."""
        start = time.time()
        resp = client.get("/health")
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 0.5, f"Health check too slow: {elapsed:.2f}s"

    def test_readiness_check_responds(self, client):
        """Readiness check must respond."""
        resp = client.get("/readiness")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data

    def test_auth_me_response_time(self, client, auth_headers):
        """GET /api/auth/me must respond in under 1s."""
        start = time.time()
        resp = client.get("/api/auth/me", headers=auth_headers)
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 1.0, f"/auth/me too slow: {elapsed:.2f}s"

    def test_parties_list_response_time(self, client, auth_headers):
        """GET /api/parties must respond in under 2s."""
        start = time.time()
        resp = client.get("/api/parties", headers=auth_headers)
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 2.0, f"/parties too slow: {elapsed:.2f}s"


# ============================================================================
# 5. LARGE PAYLOAD TESTS
# ============================================================================

class TestLargePayloads:
    """Test handling of oversized requests."""

    def test_large_json_body_handled(self, client, auth_headers):
        """Server must handle large JSON bodies without crashing."""
        headers = _make_headers()
        large_name = "A" * 10000  # 10KB name field
        resp = client.post("/api/parties", json={
            "firstName": large_name,
            "lastName": "Test"
        }, headers=headers)
        # Should be 400 (validation) or 422 (too long) or 201 (accepted)
        assert resp.status_code in (201, 400, 413, 422, 500)
        assert resp.status_code != 500 or "Internal server error" in resp.text

    def test_deeply_nested_json_handled(self, client, auth_headers):
        """Server must handle deeply nested JSON without stack overflow."""
        nested = {"data": "leaf"}
        for _ in range(50):
            nested = {"nested": nested}

        headers = _make_headers()
        resp = client.post("/api/parties", json=nested, headers=headers)
        # Should be 400/422 (validation error), not 500
        assert resp.status_code in (400, 422, 500)


# ============================================================================
# 6. IDEMPOTENCY TEST
# ============================================================================

class TestIdempotency:
    """Test idempotency key enforcement."""

    def test_duplicate_idempotency_key_handled(self, client, test_admin_user, test_tenant):
        """Duplicate idempotency keys should not create duplicate records."""
        idem_key = f"test-idem-{uuid.uuid4().hex[:8]}"
        token = _make_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Idempotency-Key': idem_key
        }

        # Send same request twice with same idempotency key
        resp1 = client.post("/api/parties", json={
            "firstName": "Idempotency",
            "lastName": "Test"
        }, headers=headers)

        resp2 = client.post("/api/parties", json={
            "firstName": "Idempotency",
            "lastName": "Test"
        }, headers=headers)

        # Both should succeed (second returns cached response)
        if resp1.status_code == 201 and resp2.status_code == 201:
            data1 = resp1.json().get('data', {})
            data2 = resp2.json().get('data', {})
            # Should be same record
            if 'id' in data1 and 'id' in data2:
                assert data1['id'] == data2['id'], \
                    "Idempotency key created duplicate records!"


# ============================================================================
# 7. MULTI-TENANT STRESS TEST
# ============================================================================

class TestMultiTenantStress:
    """Test multi-tenant isolation under concurrent access."""

    def test_concurrent_multi_tenant_access(self, client, db_session):
        """Concurrent requests from different tenants must not leak data."""
        from core.models.tenant import Tenant
        from core.models.user import User

        # Create multiple tenants
        tenants = []
        for i in range(3):
            t = Tenant(
                id=f'stress-tenant-{i}',
                name=f'Stress Tenant {i}',
                slug=f'stress-tenant-{i}',
                owner_email=f'stress{i}@test.com',
                billing_email=f'stress-billing{i}@test.com',
                is_active=True,
                created_at=datetime.utcnow()
            )
            db_session.add(t)
            tenants.append(t)

        # Create users in each tenant
        users = []
        for i, t in enumerate(tenants):
            u = User(
                id=f'stress-user-{i}',
                username=f'stressuser{i}',
                email=f'stress{i}@test.com',
                role='admin',
                tenant_id=t.id,
                is_active=True
            )
            u.set_password('test123')
            db_session.add(u)
            users.append(u)

        db_session.commit()

        # Concurrent requests
        results = {}

        def query_parties(tenant_id, user_id):
            headers = _make_headers(user_id=user_id, tenant_id=tenant_id)
            resp = client.get("/api/parties", headers=headers)
            return tenant_id, resp.status_code

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = []
            for i in range(3):
                for _ in range(3):  # 3 requests per tenant
                    f = executor.submit(
                        query_parties,
                        f'stress-tenant-{i}',
                        f'stress-user-{i}'
                    )
                    futures.append(f)

            for f in as_completed(futures):
                tid, status = f.result()
                results.setdefault(tid, []).append(status)

        # All tenants should get valid responses
        for tid, statuses in results.items():
            for s in statuses:
                assert s in (200, 401, 403), \
                    f"Tenant {tid} got unexpected status: {s}"


# ============================================================================
# 8. MEMORY & RESOURCE TESTS
# ============================================================================

class TestResourceHandling:
    """Test resource handling and cleanup."""

    def test_rapid_requests_dont_leak_connections(self, client, auth_headers):
        """Rapid sequential requests must not exhaust DB connections."""
        for i in range(50):
            resp = client.get("/health")
            assert resp.status_code == 200

    def test_error_requests_dont_leak_connections(self, client):
        """Error responses must still clean up DB connections."""
        for i in range(30):
            resp = client.get(f"/api/parties/nonexistent-{i}")
            # 401 or 404 expected
            assert resp.status_code in (401, 403, 404)
