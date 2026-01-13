import json
import random
from app import app


def test_update_kdv_persists():
    app.testing = True
    client = app.test_client()

    # Create inventory item
    create_payload = {
        "name": "Test Product KDV",
        "brand": "TestBrand",
        "category": "accessory",
        "price": 1000
    }
    create_resp = client.post('/api/inventory', json=create_payload)
    assert create_resp.status_code == 201
    data = create_resp.get_json()
    assert data['success']
    item = data['data']
    item_id = item['id']

    # Update KDV using 'kdv' alias and update include flags
    update_resp = client.put(f'/api/inventory/{item_id}', json={'kdv': 10, 'priceIncludesKdv': True, 'costIncludesKdv': False})
    assert update_resp.status_code == 200
    updated = update_resp.get_json()
    assert updated['success']
    assert updated['data']['kdv'] == 10
    assert updated['data']['vatRate'] == 10

    # Fetch item and verify persisted
    get_resp = client.get(f'/api/inventory/{item_id}')
    assert get_resp.status_code == 200
    fetched = get_resp.get_json()['data']
    assert fetched['kdv'] == 10
    assert fetched['vatRate'] == 10
    # Verify flags persisted
    assert fetched['priceIncludesKdv'] is True
    assert fetched['costIncludesKdv'] is False

    # Cleanup
    del_resp = client.delete(f'/api/inventory/{item_id}')
    assert del_resp.status_code in (200, 204)
