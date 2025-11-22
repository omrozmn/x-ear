#!/usr/bin/env python3
import requests
import time
import os
import sys
import json

BASE = 'http://127.0.0.1:5003'
OUT_DIR = '/tmp/xear_e2e'
os.makedirs(OUT_DIR, exist_ok=True)

results = {'steps': []}

def save_step(name, data):
    results['steps'].append({'name': name, 'result': data})
    with open(os.path.join(OUT_DIR, 'results.json'), 'w') as fh:
        json.dump(results, fh, indent=2, ensure_ascii=False)

# helper
def req(method, path, **kwargs):
    url = BASE + path
    try:
        r = requests.request(method, url, timeout=10, **kwargs)
        return r
    except Exception as e:
        return e

# 1. check base
r = req('GET', '/')
if isinstance(r, Exception):
    save_step('base', {'ok': False, 'error': str(r)})
    print('Base request failed:', r)
    sys.exit(1)
else:
    save_step('base', {'ok': True, 'status_code': r.status_code})

# 2. find patient
r = req('GET', '/api/patients?page=1&per_page=1')
if isinstance(r, Exception):
    save_step('get_patient', {'ok': False, 'error': str(r)})
    patient_id = None
else:
    try:
        d = r.json()
        if d.get('data') and len(d['data'])>0:
            patient_id = d['data'][0]['id']
            save_step('get_patient', {'ok': True, 'found': True, 'id': patient_id})
        else:
            patient_id = None
            save_step('get_patient', {'ok': True, 'found': False, 'body': d})
    except Exception as e:
        save_step('get_patient', {'ok': False, 'error': 'invalid json', 'raw': str(r)})
        patient_id = None

# 3. create patient if none
if not patient_id:
    payload = {'firstName':'E2E','lastName':'Tester','phone':'05551234567','tcNumber':'12345678901'}
    r = req('POST', '/api/patients', json=payload)
    if isinstance(r, Exception):
        save_step('create_patient', {'ok': False, 'error': str(r)})
        print('Create patient failed', r); sys.exit(1)
    try:
        d = r.json()
        if d.get('success') and d.get('data'):
            patient_id = d['data']['id']
            save_step('create_patient', {'ok': True, 'id': patient_id})
        else:
            save_step('create_patient', {'ok': False, 'body': d})
            print('Create patient response not success:', d); sys.exit(1)
    except Exception as e:
        save_step('create_patient', {'ok': False, 'error': 'invalid json', 'raw': str(r)})
        print('Create patient invalid json', r.text); sys.exit(1)

print('Using patient_id:', patient_id)

# 4. create invoice
payload = {'patientId': patient_id, 'devicePrice': 1500.0, 'deviceName': 'E2E Device', 'deviceSerial': 'SN-E2E-01', 'notes': 'E2E test'}
r = req('POST', '/api/invoices', json=payload)
if isinstance(r, Exception):
    save_step('create_invoice', {'ok': False, 'error': str(r)})
    print('Create invoice failed', r); sys.exit(1)
try:
    d = r.json()
    save_step('create_invoice_resp', d)
    if d.get('success') and d.get('data'):
        inv_id = d['data']['id']
        print('Invoice created:', inv_id)
    else:
        print('Invoice create returned non-success:', d)
        sys.exit(1)
except Exception as e:
    save_step('create_invoice', {'ok': False, 'error': 'invalid json', 'raw': r.text})
    print('Invalid json on create invoice', r.text); sys.exit(1)

# 5. get invoice
r = req('GET', f'/api/invoices/{inv_id}')
if isinstance(r, Exception):
    save_step('get_invoice', {'ok': False, 'error': str(r)})
else:
    try:
        d = r.json()
        save_step('get_invoice', d)
    except Exception:
        save_step('get_invoice', {'ok': False, 'error': 'invalid json', 'raw': r.text})

# 6. check instance files
base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
ubl_candidates = []
if d.get('data') and d['data'].get('invoiceNumber'):
    invnum = d['data']['invoiceNumber']
    ubl_candidates.append(os.path.join(base, f"{invnum}_{inv_id}_ubl.xml"))
    ubl_candidates.append(os.path.join(base, f"{invnum}_ubl.xml"))
ubl_candidates.append(os.path.join(base, f"{inv_id}_ubl.xml"))
found = []
for cand in ubl_candidates:
    if os.path.exists(cand):
        found.append(cand)
save_step('ubl_files', {'candidates': ubl_candidates, 'found': found})

# 7. issue invoice
r = req('POST', f'/api/invoices/{inv_id}/issue')
if isinstance(r, Exception):
    save_step('issue', {'ok': False, 'error': str(r)})
else:
    try:
        d2 = r.json()
        save_step('issue', d2)
    except Exception:
        save_step('issue', {'ok': False, 'error': 'invalid json', 'raw': r.text})

# 8. get pdf
r = req('GET', f'/api/invoices/{inv_id}/pdf')
pdf_path = os.path.join(OUT_DIR, f'invoice_{inv_id}.pdf')
if isinstance(r, Exception):
    save_step('pdf', {'ok': False, 'error': str(r)})
else:
    # If we got bytes, save them
    try:
        ct = r.headers.get('Content-Type','')
        if 'application/pdf' in ct or r.content.startswith(b'%PDF'):
            with open(pdf_path, 'wb') as fh:
                fh.write(r.content)
            save_step('pdf', {'ok': True, 'saved_to': pdf_path, 'size': os.path.getsize(pdf_path)})
        else:
            save_step('pdf', {'ok': False, 'content_type': ct, 'text_preview': r.text[:400]})
    except Exception as e:
        save_step('pdf', {'ok': False, 'error': str(e)})

# 9. try update
r = req('PUT', f'/api/invoices/{inv_id}', json={'notes': 'Updated by E2E script'})
if isinstance(r, Exception):
    save_step('update', {'ok': False, 'error': str(r)})
else:
    try:
        save_step('update', r.json())
    except Exception:
        save_step('update', {'ok': False, 'raw': r.text})

# 10. delete
r = req('DELETE', f'/api/invoices/{inv_id}')
if isinstance(r, Exception):
    save_step('delete', {'ok': False, 'error': str(r)})
else:
    try:
        save_step('delete', r.json())
    except Exception:
        save_step('delete', {'ok': False, 'raw': r.text})

print('E2E script finished. Results at', os.path.join(OUT_DIR, 'results.json'))
