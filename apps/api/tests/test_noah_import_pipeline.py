"""
Noah Import Pipeline — Full Integration Tests

Tests the complete agent auto-sync flow:
  1. Health check endpoint
  2. Enrollment token generation
  3. Agent enrollment with device token
  4. Agent heartbeat
  5. Agent auto-sync (session-less upload)
  6. CRM-initiated session + upload
  7. Duplicate detection
  8. Audit trail verification
  9. Error handling (expired session, invalid token, etc.)
"""
import hashlib
import time
import uuid
import pytest
from datetime import datetime, timezone, timedelta


# ────────────────────────────────────────────────────────────
# Helper to generate unique idempotency keys
# ────────────────────────────────────────────────────────────
def _idem():
    return f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"


def _device_headers(device_token: str):
    return {
        "X-Device-Token": device_token,
        "Idempotency-Key": _idem(),
    }


def _sample_payload(patients=1, audiograms=0, fittings=0):
    """Build a sample normalized payload for testing."""
    payload = {
        "fileMeta": {
            "name": f"noah_db_sync_{int(time.time())}",
            "size": 0,
            "sha256": hashlib.sha256(str(time.time()).encode()).hexdigest(),
        },
        "parser": {
            "name": "noah_sqlite_direct",
            "version": "1.1.0",
        },
        "normalizedPayload": {
            "patients": [],
            "audiograms": [],
            "fittings": [],
        },
    }

    for i in range(patients):
        payload["normalizedPayload"]["patients"].append({
            "externalIds": {
                "noahPatientId": f"noah_{i + 1}",
                "nationalId": f"1234567890{i}",
            },
            "firstName": f"Test{i}",
            "lastName": f"Patient{i}",
            "dob": "1990-01-15",
            "phone": f"+9053200000{i:02d}",
            "email": f"test{i}@example.com",
            "gender": "male",
        })

    for i in range(audiograms):
        payload["normalizedPayload"]["audiograms"].append({
            "patientRef": f"noah_{(i % patients) + 1}" if patients > 0 else f"noah_{i}",
            "date": "2024-01-15T10:00:00Z",
            "ear": "right" if i % 2 == 0 else "left",
            "conductionType": "air",
            "thresholds": {"250": 20, "500": 25, "1000": 30, "2000": 35, "4000": 40},
            "masking": False,
        })

    for i in range(fittings):
        payload["normalizedPayload"]["fittings"].append({
            "patientRef": f"noah_{(i % patients) + 1}" if patients > 0 else f"noah_{i}",
            "date": "2024-02-01T14:00:00Z",
            "deviceBrand": "Phonak",
            "deviceModel": "Audeo P90",
            "deviceSerial": f"SN-{i:06d}",
            "ear": "right" if i % 2 == 0 else "left",
        })

    return payload


# ────────────────────────────────────────────────────────────
# 1. Health Check
# ────────────────────────────────────────────────────────────
class TestHealthCheck:
    def test_health_returns_ok(self, client):
        resp = client.get("/api/noah-import/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["status"] == "ok"


# ────────────────────────────────────────────────────────────
# 2. Enrollment Token Generation
# ────────────────────────────────────────────────────────────
class TestEnrollmentToken:
    def test_generate_enrollment_token(self, client, auth_headers):
        headers = {**auth_headers, "Idempotency-Key": _idem()}
        resp = client.post(
            "/api/noah-import/agents/enrollment-token",
            json={"branchId": None},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        token = data["data"]["token"]
        assert len(token) >= 20

    def test_generate_enrollment_token_requires_auth(self, client):
        resp = client.post(
            "/api/noah-import/agents/enrollment-token",
            json={},
            headers={"Idempotency-Key": _idem()},
        )
        assert resp.status_code in (401, 403)


# ────────────────────────────────────────────────────────────
# 3. Agent Enrollment
# ────────────────────────────────────────────────────────────
class TestAgentEnrollment:
    def test_enroll_with_valid_token(self, client, auth_headers):
        # Generate enrollment token
        headers = {**auth_headers, "Idempotency-Key": _idem()}
        token_resp = client.post(
            "/api/noah-import/agents/enrollment-token",
            json={},
            headers=headers,
        )
        enrollment_token = token_resp.json()["data"]["token"]

        # Enroll
        resp = client.post(
            "/api/noah-import/agents/enroll",
            json={
                "enrollmentToken": enrollment_token,
                "deviceFingerprint": hashlib.sha256(b"test-machine-1").hexdigest(),
                "deviceName": "TEST-PC-1",
            },
            headers={"Idempotency-Key": _idem()},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "deviceId" in data
        assert "deviceToken" in data
        assert len(data["deviceToken"]) >= 20

    def test_enroll_with_invalid_token(self, client):
        resp = client.post(
            "/api/noah-import/agents/enroll",
            json={
                "enrollmentToken": "invalid-token-12345",
                "deviceFingerprint": "abc123",
                "deviceName": "BAD-PC",
            },
            headers={"Idempotency-Key": _idem()},
        )
        assert resp.status_code in (400, 401)


# ────────────────────────────────────────────────────────────
# Shared fixture: enrolled device
# ────────────────────────────────────────────────────────────
@pytest.fixture
def enrolled_device(client, auth_headers):
    """Generate enrollment token, enroll a device, return device info."""
    headers = {**auth_headers, "Idempotency-Key": _idem()}
    token_resp = client.post(
        "/api/noah-import/agents/enrollment-token",
        json={},
        headers=headers,
    )
    enrollment_token = token_resp.json()["data"]["token"]

    fingerprint = hashlib.sha256(f"test-{uuid.uuid4().hex}".encode()).hexdigest()
    enroll_resp = client.post(
        "/api/noah-import/agents/enroll",
        json={
            "enrollmentToken": enrollment_token,
            "deviceFingerprint": fingerprint,
            "deviceName": f"TEST-PC-{uuid.uuid4().hex[:6]}",
        },
        headers={"Idempotency-Key": _idem()},
    )
    data = enroll_resp.json()["data"]
    return {
        "device_id": data["deviceId"],
        "device_token": data["deviceToken"],
    }


# ────────────────────────────────────────────────────────────
# 4. Heartbeat
# ────────────────────────────────────────────────────────────
class TestHeartbeat:
    def test_heartbeat_success(self, client, enrolled_device):
        resp = client.post(
            "/api/noah-import/agents/heartbeat",
            json={
                "deviceId": enrolled_device["device_id"],
                "agentVersion": "1.1.0",
            },
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["agentVersion"] == "1.1.0"
        assert data["lastSeenAt"] is not None

    def test_heartbeat_without_token(self, client):
        resp = client.post(
            "/api/noah-import/agents/heartbeat",
            json={"deviceId": "fake", "agentVersion": "1.0.0"},
            headers={"Idempotency-Key": _idem()},
        )
        assert resp.status_code == 401


# ────────────────────────────────────────────────────────────
# 5. Agent Auto-Sync (the critical new feature)
# ────────────────────────────────────────────────────────────
class TestAgentSync:
    def test_sync_creates_patient(self, client, enrolled_device):
        """Agent reads Noah DB, builds payload, auto-syncs — patient created."""
        payload = _sample_payload(patients=1)
        resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["sessionId"]
        assert data["status"] in ("completed", "completed_with_warnings")
        assert data["summary"]["created"] >= 1

    def test_sync_multiple_patients_with_audiograms(self, client, enrolled_device):
        """Sync 3 patients + 4 audiograms + 2 fittings."""
        payload = _sample_payload(patients=3, audiograms=4, fittings=2)
        resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["summary"]["created"] == 3
        assert data["syncedAt"] is not None

    def test_sync_empty_payload(self, client, enrolled_device):
        """Sync with no data should succeed (nothing to import)."""
        payload = _sample_payload(patients=0)
        resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["summary"]["created"] == 0

    def test_sync_incremental_update(self, client, enrolled_device):
        """First sync creates, second sync with same national ID updates."""
        payload = _sample_payload(patients=1)
        resp1 = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp1.status_code == 200
        assert resp1.json()["data"]["summary"]["created"] == 1

        # Second sync same patient -> should update, not create
        resp2 = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp2.status_code == 200
        summary = resp2.json()["data"]["summary"]
        assert summary["updated"] >= 1
        assert summary["created"] == 0

    def test_sync_without_device_token_rejected(self, client):
        """Sync without auth is rejected."""
        payload = _sample_payload(patients=1)
        resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers={"Idempotency-Key": _idem()},
        )
        assert resp.status_code == 401

    def test_sync_with_invalid_token_rejected(self, client):
        """Sync with bad token is rejected."""
        payload = _sample_payload(patients=1)
        resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers("invalid-token-xyz"),
        )
        assert resp.status_code == 401


# ────────────────────────────────────────────────────────────
# 6. CRM-Initiated Session + Upload
# ────────────────────────────────────────────────────────────
class TestSessionUpload:
    def test_create_session_and_upload(self, client, auth_headers, enrolled_device):
        """CRM creates session, agent uploads data to it."""
        # Create session from CRM
        headers = {**auth_headers, "Idempotency-Key": _idem()}
        session_resp = client.post(
            "/api/noah-import/sessions",
            json={"allowedFormats": ["csv", "xml"]},
            headers=headers,
        )
        assert session_resp.status_code == 200
        session_id = session_resp.json()["data"]["id"]

        # Agent uploads payload to the session
        payload = _sample_payload(patients=2)
        upload_resp = client.post(
            f"/api/noah-import/sessions/{session_id}/upload",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert upload_resp.status_code == 200
        data = upload_resp.json()["data"]
        assert data["status"] in ("completed", "completed_with_warnings")
        assert data["summary"]["created"] >= 1

    def test_get_session_status(self, client, auth_headers):
        """Create session and check its status."""
        headers = {**auth_headers, "Idempotency-Key": _idem()}
        session_resp = client.post(
            "/api/noah-import/sessions",
            json={},
            headers=headers,
        )
        session_id = session_resp.json()["data"]["id"]

        get_resp = client.get(
            f"/api/noah-import/sessions/{session_id}",
            headers={**auth_headers, "Idempotency-Key": _idem()},
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["data"]["status"] == "pending"

    def test_list_sessions(self, client, auth_headers):
        """List sessions returns paginated results."""
        headers = {**auth_headers, "Idempotency-Key": _idem()}
        client.post("/api/noah-import/sessions", json={}, headers=headers)

        list_resp = client.get(
            "/api/noah-import/sessions",
            headers={**auth_headers, "Idempotency-Key": _idem()},
        )
        assert list_resp.status_code == 200
        assert list_resp.json()["success"] is True


# ────────────────────────────────────────────────────────────
# 7. Audit Trail
# ────────────────────────────────────────────────────────────
class TestAuditTrail:
    def test_sync_creates_audit_entries(self, client, auth_headers, enrolled_device):
        """Auto-sync should produce audit log entries."""
        payload = _sample_payload(patients=1)
        sync_resp = client.post(
            "/api/noah-import/agents/sync",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        session_id = sync_resp.json()["data"]["sessionId"]

        audit_resp = client.get(
            f"/api/noah-import/audit-logs?sessionId={session_id}",
            headers={**auth_headers, "Idempotency-Key": _idem()},
        )
        assert audit_resp.status_code == 200
        logs = audit_resp.json()["data"]
        actions = [log["action"] for log in logs]
        assert "agent_sync_started" in actions
        assert "upload_received" in actions
        assert "import_completed" in actions


# ────────────────────────────────────────────────────────────
# 8. Agent Device List
# ────────────────────────────────────────────────────────────
class TestAgentDeviceList:
    def test_list_agents(self, client, auth_headers, enrolled_device):
        """Admin can see enrolled agents."""
        resp = client.get(
            "/api/noah-import/agents",
            headers={**auth_headers, "Idempotency-Key": _idem()},
        )
        assert resp.status_code == 200
        devices = resp.json()["data"]
        assert len(devices) >= 1
        device_ids = [d["id"] for d in devices]
        assert enrolled_device["device_id"] in device_ids


# ────────────────────────────────────────────────────────────
# 9. Error Cases
# ────────────────────────────────────────────────────────────
class TestErrorHandling:
    def test_upload_to_nonexistent_session(self, client, enrolled_device):
        """Upload to a session that doesn't exist returns 404."""
        payload = _sample_payload(patients=1)
        resp = client.post(
            "/api/noah-import/sessions/nonexistent-session-id/upload",
            json=payload,
            headers=_device_headers(enrolled_device["device_token"]),
        )
        assert resp.status_code in (400, 404)

    def test_get_nonexistent_session(self, client, auth_headers):
        resp = client.get(
            "/api/noah-import/sessions/does-not-exist",
            headers={**auth_headers, "Idempotency-Key": _idem()},
        )
        assert resp.status_code == 404
