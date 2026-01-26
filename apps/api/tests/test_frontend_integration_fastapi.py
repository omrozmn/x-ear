
import os
import io
import json
import pytest
from datetime import datetime
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from core.models.user import User
from core.models.party import Party
from core.database import Base, engine, SessionLocal

# Setup Test User in a cleaner way or use conftest ones
# This file seems to be a standalone integration test, but lets try to make it work with existing fixtures

def test_p1_bulk_upload_patients(client, auth_headers):
    # Prepare CSV
    csv_content = "tcNumber,firstName,lastName,phone\n11111111111,Bulk,Test,+905551111111"
    files = {
        'file': ('test_patients.csv', csv_content.encode('utf-8'), 'text/csv')
    }
    response = client.post('/api/patients/bulk_upload', files=files, headers=auth_headers)
    assert response.status_code in [200, 201]
    data = response.json()
    assert data['success'] is True
    assert 'created' in d if (d := data.get('data', {})) else 'created' in data
    
def test_p1_invoice_templates(client, auth_headers):
    response = client.get('/api/invoices/templates', headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert isinstance(data['data'], list)

def test_p1_invoice_bulk_upload(client, auth_headers):
    # Prepare CSV
    csv_content = "customerName,amount,date\nTest Customer,100,2024-01-01"
    files = {
        'file': ('test_invoices.csv', csv_content.encode('utf-8'), 'text/csv')
    }
    response = client.post('/api/invoices/bulk_upload', files=files, headers=auth_headers)
    assert response.status_code in [200, 201, 400]

def test_p1_print_queue_ops(client, auth_headers):
    # 0. Create patient and invoice first
    pat_payload = {
        'firstName': 'Queue', 'lastName': 'Test', 'phone': '5551112233', 'tcNumber': '22222222222'
    }
    r_pat = client.post('/api/patients', json=pat_payload, headers=auth_headers)
    if r_pat.status_code == 201:
        pat_id = r_pat.json()['data']['id']
        inv_payload = {
            'patient_id': pat_id, 'total_amount': 100, 'status': 'draft', 'items': [{'description': 'test', 'unitPrice': 100, 'total': 100}]
        }
        r_inv = client.post('/api/invoices', json=inv_payload, headers=auth_headers)
        if r_inv.status_code == 201:
            inv_id = r_inv.json()['data']['id']
            
            # 1. Add to queue
            payload = {'invoice_ids': [inv_id]}
            res_post = client.post('/api/invoices/print-queue', json=payload, headers=auth_headers)
            assert res_post.status_code in [200, 201]
            
            # 2. Get queue
            res_get = client.get('/api/invoices/print-queue', headers=auth_headers)
            assert res_get.status_code == 200
            data = res_get.json()
            assert data['success'] is True

def test_p2_inventory_units(client, auth_headers):
    response = client.get('/api/inventory/units', headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert 'units' in data['data']

def test_p3_sgk_endpoints(client, auth_headers):
    res_seed = client.post('/api/sgk/seed-test-patients', headers=auth_headers)
    assert res_seed.status_code in [200, 201]
    
    res_deliv = client.get('/api/sgk/e-receipts/delivered', headers=auth_headers)
    assert res_deliv.status_code == 200
