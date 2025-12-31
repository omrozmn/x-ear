from app import app
import models.affiliate_user
import models.commission_ledger
from models.base import db


def test_affiliate_register_http():
    # ensure tables exist in test DB
    with app.app_context():
        # Drop any existing tables and recreate to ensure schema matches current models
        models.affiliate_user.Base.metadata.drop_all(bind=db.engine)
        models.affiliate_user.Base.metadata.create_all(bind=db.engine)
    with app.test_client() as client:
        payload = {'email': 'http-http@example.com', 'password': 'secretpw'}
        resp = client.post('/api/affiliate/register', json=payload)
        if resp.status_code != 201:
            print('DEBUG resp.json:', resp.get_json())
        assert resp.status_code == 201
        envelope = resp.get_json()
        data = envelope.get('data') or {}
        assert data.get('email') == 'http-http@example.com'
        assert 'code' in data and data['code']
