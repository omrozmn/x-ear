def test_metrics_endpoint_when_available(client):
    # If prometheus_client is installed, /metrics should return 200 and plaintext
    resp = client.get('/metrics')
    # Accept both 200 (present) or 404 (not registered)
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        assert resp.headers.get('Content-Type', '').startswith('text/plain')
        assert resp.get_data(as_text=True)
