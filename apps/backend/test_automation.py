import json


def test_automation_status_and_backup(client):
    rv = client.get('/api/automation/status')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['success'] is True
    assert 'automation' in data

    rv2 = client.post('/api/automation/backup')
    assert rv2.status_code == 200
    data2 = rv2.get_json()
    assert data2['success'] is True
    assert data2['message'] == 'Backup started'
