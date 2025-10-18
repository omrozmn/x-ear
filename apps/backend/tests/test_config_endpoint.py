from backend import app
from flask_jwt_extended import create_access_token
from models.user import User


def test_config_endpoint(client):
    # no auth required
    res = client.get('/api/config')
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True
    assert 'adminPanelUrl' in body['data']
