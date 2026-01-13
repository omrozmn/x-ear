#!/usr/bin/env python3
# Create test patient data for development (env-driven DB path)

import sqlite3
import json
from datetime import datetime, timedelta
import os
from urllib.parse import urlparse


def resolve_sqlite_path():
    # Prefer explicit DB file env var
    db_file = os.getenv('DB_FILE')
    if db_file:
        return db_file
    # Next, try DATABASE_URL of form sqlite:////absolute/path
    db_url = os.getenv('DATABASE_URL', '')
    if db_url.startswith('sqlite:///'):
        rel = db_url.replace('sqlite:///', '')
        # If a relative reference to the common name is used, map it to the backend canonical DB
        if rel in ('backend/backend/xear_crm.db', './backend/xear_crm.db'):
            return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend/backend/xear_crm.db'))
        return rel
    # Fallback to project-local backend DB
    default = os.path.join(os.path.dirname(__file__), '..', 'backend/backend/xear_crm.db')
    return os.path.abspath(default)


def create_test_patient():
    """Create a test patient with ID 'p3' directly in the database"""
    db_path = resolve_sqlite_path()
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if patient already exists
        cursor.execute("SELECT id FROM patients WHERE id = ?", ('p3',))
        if cursor.fetchone():
            print("✅ Patient p3 already exists")
            return
        
        # Insert test patient
        patient_data = {
            'id': 'p3',
            'tc_number': '12345678901',
            'first_name': 'Ahmet',
            'last_name': 'Yılmaz',
            'phone': '+90 532 123 4567',
            'email': 'ahmet.yilmaz@example.com',
            'birth_date': '1980-05-15T00:00:00',
            'gender': 'M',
            'address_city': 'İstanbul',
            'address_district': 'Kadıköy',
            'address_full': 'Moda Caddesi No: 123 Kadıköy/İstanbul',
            'status': 'active',
            'segment': 'customer',
            'acquisition_type': 'referral',
            'referred_by': 'Dr. Mehmet Özkan',
            'priority_score': 85,
            'tags': json.dumps(['VIP', 'bilateral-loss']),
            'sgk_info': json.dumps({
                'rightEarDevice': 'approved',
                'leftEarDevice': 'approved',
                'rightEarBattery': 'available',
                'leftEarBattery': 'available'
            }),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        cursor.execute("""
            INSERT INTO patients (
                id, tc_number, first_name, last_name, phone, email, birth_date, 
                gender, address_city, address_district, address_full, status, segment, 
                acquisition_type, referred_by, priority_score, tags, sgk_info, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            patient_data['id'], patient_data['tc_number'], patient_data['first_name'],
            patient_data['last_name'], patient_data['phone'], patient_data['email'],
            patient_data['birth_date'], patient_data['gender'], patient_data['address_city'],
            patient_data['address_district'], patient_data['address_full'], patient_data['status'], 
            patient_data['segment'], patient_data['acquisition_type'], patient_data['referred_by'], 
            patient_data['priority_score'], patient_data['tags'], patient_data['sgk_info'], 
            patient_data['created_at'], patient_data['updated_at']
        ))
        
        # Insert test device
        cursor.execute("""
            INSERT INTO devices (
                id, patient_id, serial_number, brand, model, device_type, ear, status,
                trial_start_date, trial_end_date, warranty_start_date, warranty_end_date,
                warranty_terms, price, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'device_p3_001', 'p3', 'SN123456789', 'Phonak', 'Audéo Paradise P90',
            'RIC', 'both', 'active',
            (datetime.now() - timedelta(days=30)).isoformat(),
            (datetime.now() + timedelta(days=30)).isoformat(),
            datetime.now().isoformat(),
            (datetime.now() + timedelta(days=730)).isoformat(),
            '2 years manufacturer warranty', 15000.0,
            'Bilateral fitting completed successfully',
            datetime.now().isoformat(), datetime.now().isoformat()
        ))
        
        # Insert test hearing test
        audiogram_data = json.dumps({
            'rightEar': {
                '250': 25, '500': 35, '1000': 45, '2000': 55, '4000': 65, '8000': 70
            },
            'leftEar': {
                '250': 30, '500': 40, '1000': 50, '2000': 60, '4000': 70, '8000': 75
            },
            'testType': 'Pure Tone Audiometry',
            'notes': 'Bilateral sensorineural hearing loss, moderate to severe'
        })
        
        cursor.execute("""
            INSERT INTO hearing_tests (
                id, patient_id, test_date, audiologist, audiogram_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            'test_p3_001', 'p3',
            (datetime.now() - timedelta(days=45)).isoformat(),
            'Dr. Ayşe Demir', audiogram_data,
            datetime.now().isoformat(), datetime.now().isoformat()
        ))
        
        conn.commit()
        print("✅ Test patient p3 created successfully with sample data")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating test patient: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    create_test_patient()