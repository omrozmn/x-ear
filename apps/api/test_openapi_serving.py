def test_openapi_served(client):
    resp = client.get('/api/openapi.yaml')
    assert resp.status_code == 200
    # Content should include OpenAPI version header
    text = resp.get_data(as_text=True)
    assert 'openapi:' in text
    # Check content-type header is YAML or text
    ctype = resp.headers.get('Content-Type', '')
    assert 'yaml' in ctype or 'text' in ctype

def test_openapi_served_with_cors(client):
    # Simulate a browser request from a different origin
    headers = {'Origin': 'http://localhost:8080'}
    resp = client.get('/api/openapi.yaml', headers=headers)
    assert resp.status_code == 200
    # Ensure CORS header present and allows the requesting origin (or wildcard)
    acao = resp.headers.get('Access-Control-Allow-Origin')
    assert acao in ('*', 'http://localhost:8080') or 'localhost' in acao
