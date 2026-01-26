def test_config_endpoint(client):
    # no auth required
    res = client.get('/api/config')
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True
    assert 'adminPanelUrl' in body['data']
