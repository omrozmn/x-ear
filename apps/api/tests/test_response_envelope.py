def test_health_envelope(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert 'success' in data or 'status' in data


def test_error_envelope(client, auth_headers):
    # Trigger an error by calling a non-existing endpoint (with auth to pass middleware)
    resp = client.get('/api/nonexistent-should-404', headers=auth_headers)
    assert resp.status_code in (404, 405, 422)
    data = resp.json()
    assert isinstance(data, dict)
