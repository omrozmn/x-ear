def test_contract_devices_shape_and_legacy_mapping(client):
    # Ensure devices endpoint returns canonical fields and requires canonical tokens
    resp = client.get('/api/devices?inventory_only=true&category=hearing_aid')
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, dict)
    devices = data.get('devices', [])
    assert isinstance(devices, list)
    assert len(devices) > 0

    # Check canonical fields presence on at least one device
    d = devices[0]
    assert 'category' in d
    # canonical inventory fields (may be absent but if present must be numeric)
    for fld in ('availableInventory', 'totalInventory'):
        if fld in d:
            assert isinstance(d[fld], (int, float))

    # Legacy alias handling removed: calls using legacy token should not return devices
    resp2 = client.get('/api/devices?inventory_only=true&category=isitme_cihazi')
    assert resp2.status_code == 200
    data2 = resp2.get_json()
    devices2 = data2.get('devices', [])
    assert isinstance(devices2, list)
    assert len(devices2) == 0, 'Legacy category token should not return devices; caller must use `hearing_aid`.'
