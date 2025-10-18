import pytest
from datetime import datetime


def test_dashboard_kpis_endpoint(client):
    resp = client.get('/api/dashboard/kpis')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body.get('success') is True
    # Expect core keys to be present
    assert 'totalPatients' in body
    assert 'totalDevices' in body
    assert 'availableDevices' in body
    assert 'estimatedRevenue' in body


def test_dashboard_recent_activity_shape(client):
    resp = client.get('/api/dashboard/recent-activity')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body.get('success') is True
    assert isinstance(body.get('activity'), list)
    # If there are entries, they should have required keys
    if len(body.get('activity')) > 0:
        entry = body.get('activity')[0]
        assert 'id' in entry and 'action' in entry and 'entityType' in entry
