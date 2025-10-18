#!/usr/bin/env python3
"""Seed patients into the local sqlite DB using OCR outputs from images/.
This script is safe for local dev only and avoids duplicates.
"""
import os
import glob
import sqlite3
import hashlib
import random
from datetime import datetime
from backend.scripts.create_test_patient import resolve_sqlite_path

# Helper to generate valid TCKN from prefix
def generate_tc_from_prefix(prefix):
    p = ''.join([c for c in (prefix or '') if c.isdigit()])
    if not p:
        p = str(random.randint(100000000, 999999999))
    else:
        if len(p) > 9:
            p = p[:9]
        if p[0] == '0':
            p = '1' + p[1:]
        needed = 9 - len(p)
        if needed > 0:
            h = hashlib.sha1((p + 'xseed').encode('utf-8')).hexdigest()
            pad = ''.join([str(int(h[i:i+2], 16) % 10) for i in range(0, needed*2, 2)])
            p = p + pad
    digits = [int(d) for d in p]
    odd_sum = sum(digits[0::2])
    even_sum = sum(digits[1::2])
    d10 = ((odd_sum * 7) - even_sum) % 10
    d11 = (sum(digits) + d10) % 10
    return p + str(d10) + str(d11)

# Determine project root and images dir
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMAGES_DIR = os.path.join(PROJECT_ROOT, 'images')
DB_PATH = resolve_sqlite_path()

print('Project root:', PROJECT_ROOT)
print('Images dir:', IMAGES_DIR)
print('DB path:', DB_PATH)

if not os.path.isdir(IMAGES_DIR):
    print('No images dir found, aborting')
    raise SystemExit(1)

if not os.path.exists(DB_PATH):
    print('DB not found at', DB_PATH)
    raise SystemExit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

created = []
errors = []

for img in glob.glob(os.path.join(IMAGES_DIR, '*')):
    try:
        basename = os.path.basename(img)
        label = os.path.splitext(basename)[0]
        # Attempt to derive name from filename or known mapping
        # For real OCR-based name extraction, use existing OCR service; here we take manual map for known SGK imgs
        # Known mapping for repository test images
        mapping = {
            'IMG_0227': 'ONUR AYDOGDU',
            'IMG_0229': 'RAHIME CELIK',
            'IMG_0230': 'SERCAN KUBILAY',
            'IMG_0231': 'SAMI KARATAY'
        }
        name = mapping.get(label, label)
        parts = [p for p in name.split() if p]
        first_name = parts[0] if parts else label
        last_name = ' '.join(parts[1:]) if len(parts) > 1 else 'Test'
        # For TC partial, try to extract any digits sequence in filename (unlikely) else use deterministic seed from name
        # We'll build a numeric seed from name hash
        seed_num = ''.join([str((ord(c) % 10)) for c in (first_name + last_name)])[:7]
        tc_partial = seed_num
        tc_full = generate_tc_from_prefix(tc_partial)
        # Ensure uniqueness
        cursor.execute("SELECT id FROM patients WHERE tc_number = ?", (tc_full,))
        if cursor.fetchone():
            # already exists, skip
            print('Patient with TC exists, skipping:', tc_full)
            continue
        pid = f'seed_{label}_{int(datetime.now().timestamp())}'
        cursor.execute(
            "INSERT INTO patients (id, tc_number, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (pid, tc_full, first_name, last_name, '+90 530 000 0000', datetime.now().isoformat(), datetime.now().isoformat())
        )
        conn.commit()
        created.append({'image': basename, 'id': pid, 'tc': tc_full, 'name': f"{first_name} {last_name}"})
        print('Created patient', pid, name, tc_full)
    except Exception as e:
        conn.rollback()
        errors.append({'image': basename, 'error': str(e)})
        print('Error creating for', basename, e)

print('Done. created=', created, 'errors=', errors)
conn.close()
