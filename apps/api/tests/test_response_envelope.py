def test_health_envelope(client):
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)
    assert 'success' in data
    assert 'requestId' in data or 'request_id' in data
    assert 'timestamp' in data


def test_error_envelope(client):
    # Trigger an error by calling a non-existing endpoint
    resp = client.get('/api/nonexistent-should-404')
    assert resp.status_code in (404, 500)
    data = resp.get_json()
    assert isinstance(data, dict)
    assert 'success' in data
    assert data.get('success') is False
    assert 'requestId' in data or 'request_id' in data
    assert 'timestamp' in data
