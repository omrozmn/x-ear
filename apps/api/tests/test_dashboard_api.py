

def test_dashboard_kpis_endpoint(client, auth_headers):
    resp = client.get('/api/dashboard/kpis', headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get('success') is True


def test_dashboard_recent_activity_shape(client, auth_headers):
    resp = client.get('/api/dashboard/recent-activity', headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get('success') is True
