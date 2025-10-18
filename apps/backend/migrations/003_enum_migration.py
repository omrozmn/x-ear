#!/usr/bin/env python3
"""
Migration: Convert string fields to enums
This migration converts Device.ear, Device.status, Device.category, 
Patient.status, and Appointment.status to enum types
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app
from models.base import db
from models.device import Device
from models.patient import Patient
from models.appointment import Appointment
from models.enums import DeviceSide, DeviceStatus, DeviceCategory, PatientStatus, AppointmentStatus
from sqlalchemy import text

def migrate_device_enums():
    """Migrate Device enum fields"""
    print("🔄 Migrating Device enums...")
    
    devices = Device.query.all()
    updated_count = 0
    
    for device in devices:
        updated = False
        
        # Migrate ear field
        if device.ear:
            old_ear = device.ear
            new_ear = DeviceSide.from_legacy(old_ear)
            if old_ear != new_ear.value:
                print(f"  Device {device.id}: ear '{old_ear}' → '{new_ear.value}'")
                device.ear = new_ear.value
                updated = True
        
        # Migrate status field
        if device.status:
            old_status = device.status
            new_status = DeviceStatus.from_legacy(old_status)
            if old_status != new_status.value:
                print(f"  Device {device.id}: status '{old_status}' → '{new_status.value}'")
                device.status = new_status.value
                updated = True
        
        # Migrate category field
        if hasattr(device, 'category') and device.category:
            old_category = device.category
            new_category = DeviceCategory.from_legacy(old_category)
            if old_category != new_category.value:
                print(f"  Device {device.id}: category '{old_category}' → '{new_category.value}'")
                device.category = new_category.value
                updated = True
        
        if updated:
            updated_count += 1
    
    print(f"✅ Updated {updated_count} devices")
    return updated_count

def migrate_patient_enums():
    """Migrate Patient enum fields"""
    print("🔄 Migrating Patient enums...")
    
    patients = Patient.query.all()
    updated_count = 0
    
    for patient in patients:
        updated = False
        
        # Migrate status field
        if patient.status:
            old_status = patient.status
            new_status = PatientStatus.from_legacy(old_status)
            if old_status != new_status.value:
                print(f"  Patient {patient.id}: status '{old_status}' → '{new_status.value}'")
                patient.status = new_status.value
                updated = True
        
        if updated:
            updated_count += 1
    
    print(f"✅ Updated {updated_count} patients")
    return updated_count

def migrate_appointment_enums():
    """Migrate Appointment enum fields"""
    print("🔄 Migrating Appointment enums...")
    
    appointments = Appointment.query.all()
    updated_count = 0
    
    for appointment in appointments:
        updated = False
        
        # Migrate status field
        if appointment.status:
            old_status = appointment.status
            new_status = AppointmentStatus.from_legacy(old_status)
            if old_status != new_status.value:
                print(f"  Appointment {appointment.id}: status '{old_status}' → '{new_status.value}'")
                appointment.status = new_status.value
                updated = True
        
        if updated:
            updated_count += 1
    
    print(f"✅ Updated {updated_count} appointments")
    return updated_count

def validate_migration():
    """Validate that all values are now valid enum values"""
    print("🔍 Validating migration...")
    
    # Validate Device enums
    invalid_devices = []
    devices = Device.query.all()
    
    for device in devices:
        # Check ear values
        if device.ear and device.ear not in [e.value for e in DeviceSide]:
            invalid_devices.append(f"Device {device.id}: invalid ear '{device.ear}'")
        
        # Check status values
        if device.status and device.status not in [e.value for e in DeviceStatus]:
            invalid_devices.append(f"Device {device.id}: invalid status '{device.status}'")
        
        # Check category values
        if hasattr(device, 'category') and device.category and device.category not in [e.value for e in DeviceCategory]:
            invalid_devices.append(f"Device {device.id}: invalid category '{device.category}'")
    
    # Validate Patient enums
    invalid_patients = []
    patients = Patient.query.all()
    
    for patient in patients:
        if patient.status and patient.status not in [e.value for e in PatientStatus]:
            invalid_patients.append(f"Patient {patient.id}: invalid status '{patient.status}'")
    
    # Validate Appointment enums
    invalid_appointments = []
    appointments = Appointment.query.all()
    
    for appointment in appointments:
        if appointment.status and appointment.status not in [e.value for e in AppointmentStatus]:
            invalid_appointments.append(f"Appointment {appointment.id}: invalid status '{appointment.status}'")
    
    # Report validation results
    total_invalid = len(invalid_devices) + len(invalid_patients) + len(invalid_appointments)
    
    if total_invalid == 0:
        print("✅ All enum values are valid!")
        return True
    else:
        print(f"❌ Found {total_invalid} invalid enum values:")
        for invalid in invalid_devices + invalid_patients + invalid_appointments:
            print(f"  {invalid}")
        return False

def create_backup():
    """Create backup of current data"""
    print("💾 Creating backup...")
    
    try:
        # Simple backup by exporting current enum values
        backup_data = {
            'devices': [],
            'patients': [],
            'appointments': []
        }
        
        # Backup device data
        devices = Device.query.all()
        for device in devices:
            backup_data['devices'].append({
                'id': device.id,
                'ear': device.ear,
                'status': device.status,
                'category': getattr(device, 'category', None)
            })
        
        # Backup patient data
        patients = Patient.query.all()
        for patient in patients:
            backup_data['patients'].append({
                'id': patient.id,
                'status': patient.status
            })
        
        # Backup appointment data
        appointments = Appointment.query.all()
        for appointment in appointments:
            backup_data['appointments'].append({
                'id': appointment.id,
                'status': appointment.status
            })
        
        # Save backup to file
        import json
        backup_file = Path(__file__).parent / 'enum_migration_backup.json'
        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        print(f"✅ Backup saved to {backup_file}")
        return True
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False

def run_migration():
    """Run the complete enum migration"""
    print("🚀 Starting Enum Migration\n")
    
    with app.app_context():
        try:
            # Create backup
            if not create_backup():
                print("❌ Migration aborted due to backup failure")
                return False
            
            print()
            
            # Run migrations
            device_updates = migrate_device_enums()
            patient_updates = migrate_patient_enums()
            appointment_updates = migrate_appointment_enums()
            
            print()
            
            # Validate migration
            if not validate_migration():
                print("❌ Migration validation failed - rolling back...")
                db.session.rollback()
                return False
            
            # Commit changes
            db.session.commit()
            
            print(f"\n🎉 Migration completed successfully!")
            print(f"📊 Summary:")
            print(f"  - Devices updated: {device_updates}")
            print(f"  - Patients updated: {patient_updates}")
            print(f"  - Appointments updated: {appointment_updates}")
            print(f"  - Total updates: {device_updates + patient_updates + appointment_updates}")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)