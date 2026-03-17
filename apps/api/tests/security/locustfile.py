"""
Locust Load Test for X-EAR API
================================
Tests API performance and resilience under load.
Run: locust -f tests/security/locustfile.py --headless -u 50 -r 10 --run-time 60s --host http://127.0.0.1:5003
"""
from locust import HttpUser, task, between, events
import time
import uuid
import json


class HealthCheckUser(HttpUser):
    """Simulates health check monitoring (lightweight)."""
    weight = 1
    wait_time = between(1, 3)

    @task
    def health(self):
        self.client.get("/health")

    @task
    def readiness(self):
        self.client.get("/readiness")


class PublicEndpointUser(HttpUser):
    """Simulates unauthenticated users hitting public endpoints."""
    weight = 3
    wait_time = between(0.5, 2)

    @task(5)
    def login_attempt(self):
        """Simulate login attempts."""
        self.client.post("/api/auth/login", json={
            "identifier": f"user{int(time.time()) % 100}@test.com",
            "password": "wrongpassword"
        }, headers={"Idempotency-Key": f"load-{uuid.uuid4().hex[:8]}"})

    @task(3)
    def lookup_phone(self):
        """Simulate phone lookups."""
        self.client.post("/api/auth/lookup-phone", json={
            "identifier": f"555{int(time.time()) % 10000:04d}"
        })

    @task(2)
    def register_phone(self):
        """Simulate registration attempts."""
        self.client.post("/api/register-phone", json={
            "phone": f"+9055500{int(time.time()) % 100000:05d}"
        })

    @task(1)
    def forgot_password(self):
        """Simulate forgot password requests."""
        self.client.post("/api/auth/forgot-password", json={
            "identifier": f"555{int(time.time()) % 10000:04d}"
        })

    @task(2)
    def get_config(self):
        """Get public config."""
        self.client.get("/api/config/turnstile")

    @task(1)
    def nonexistent_endpoint(self):
        """Hit nonexistent endpoints - should get 404, not 500."""
        self.client.get(f"/api/nonexistent-{uuid.uuid4().hex[:6]}")


class AuthenticatedUser(HttpUser):
    """Simulates authenticated users - needs a valid token."""
    weight = 2
    wait_time = between(0.5, 2)
    token = None

    def on_start(self):
        """Try to authenticate on start."""
        resp = self.client.post("/api/auth/login", json={
            "identifier": "admin",
            "password": "AdminPass123!"
        }, headers={"Idempotency-Key": f"load-auth-{uuid.uuid4().hex[:8]}"})

        if resp.status_code == 200:
            data = resp.json().get("data", {})
            self.token = data.get("accessToken") or data.get("access_token")

        if not self.token:
            # Use a test-generated token
            self.token = None

    def _headers(self):
        if self.token:
            return {
                "Authorization": f"Bearer {self.token}",
                "Idempotency-Key": f"load-{uuid.uuid4().hex[:8]}"
            }
        return {"Idempotency-Key": f"load-{uuid.uuid4().hex[:8]}"}

    @task(5)
    def list_parties(self):
        """List parties - main read endpoint."""
        self.client.get("/api/parties?page=1&per_page=10", headers=self._headers())

    @task(3)
    def get_me(self):
        """Get current user profile."""
        self.client.get("/api/users/me", headers=self._headers())

    @task(2)
    def get_auth_me(self):
        """Get auth user."""
        self.client.get("/api/auth/me", headers=self._headers())

    @task(2)
    def list_appointments(self):
        """List appointments."""
        self.client.get("/api/appointments?page=1&per_page=10", headers=self._headers())

    @task(1)
    def list_sales(self):
        """List sales."""
        self.client.get("/api/sales?page=1&per_page=10", headers=self._headers())

    @task(1)
    def dashboard(self):
        """Get dashboard data."""
        self.client.get("/api/dashboard", headers=self._headers())


class SecurityStressUser(HttpUser):
    """Simulates malicious traffic patterns."""
    weight = 1
    wait_time = between(0.1, 0.5)

    @task(3)
    def brute_force_login(self):
        """Rapid login attempts - should be rate limited."""
        self.client.post("/api/auth/login", json={
            "identifier": "admin",
            "password": f"attempt{int(time.time())}"
        }, headers={"Idempotency-Key": f"brute-{uuid.uuid4().hex[:8]}"})

    @task(2)
    def path_traversal_attempt(self):
        """Try path traversal - should be blocked."""
        self.client.get("/api/parties/../../../etc/passwd")

    @task(2)
    def sql_injection_attempt(self):
        """Try SQL injection - should be rejected."""
        self.client.get("/api/parties?search='; DROP TABLE users; --")

    @task(1)
    def xss_attempt(self):
        """Try XSS in parameters - should be escaped."""
        self.client.get("/api/parties?search=<script>alert(1)</script>")

    @task(1)
    def large_payload(self):
        """Send oversized payload - should be rejected gracefully."""
        self.client.post("/api/auth/login", json={
            "identifier": "A" * 10000,
            "password": "B" * 10000
        }, headers={"Idempotency-Key": f"large-{uuid.uuid4().hex[:8]}"})

    @task(1)
    def invalid_json(self):
        """Send invalid JSON - should get 422, not 500."""
        self.client.post("/api/auth/login",
            data="not valid json {{{",
            headers={
                "Content-Type": "application/json",
                "Idempotency-Key": f"invalid-{uuid.uuid4().hex[:8]}"
            }
        )
