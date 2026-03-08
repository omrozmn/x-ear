#!/usr/bin/env python3
"""
Analyze current data before enum migration
This script checks what values are currently in the database
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app import app
from models import db, Device, Patient, Appointment

def analyze_device_data():
    """Analyze current device data"""
    print("🔍 Analyzing Device data...")
    
    with app.app_context():
        # Analyze ear values
        ear_values = db.session.query(Device.ear).distinct().all()
        ear_values = [v[0] for v in ear_values if v[0]]
        print(f"📊 Device.ear values: {ear_values}")
        
        # Analyze status values
        status_values = db.session.query(Device.status).distinct().all()
        status_values = [v[0] for v in status_values if v[0]]
        print(f"📊 Device.status values: {status_values}")
        
        # Analyze category values
        try:
            category_values = db.session.query(Device.category).distinct().all()
            category_values = [v[0] for v in category_values if v[0]]
            print(f"📊 Device.category values: {category_values}")
        except Exception as e:
            print(f"⚠️  Device.category column might not exist: {e}")
        
        # Count devices
        device_count = Device.query.count()
        print(f"📊 Total devices: {device_count}")

def analyze_patient_data():
    """Analyze current patient data"""
    print("\n🔍 Analyzing Patient data...")
    
    with app.app_context():
        # Analyze status values
        status_values = db.session.query(Patient.status).distinct().all()
        status_values = [v[0] for v in status_values if v[0]]
        print(f"📊 Patient.status values: {status_values}")
        
        # Analyze segment values
        segment_values = db.session.query(Patient.segment).distinct().all()
        segment_values = [v[0] for v in segment_values if v[0]]
        print(f"📊 Patient.segment values: {segment_values}")
        
        # Count patients
        patient_count = Patient.query.count()
        print(f"📊 Total patients: {patient_count}")

def analyze_appointment_data():
    """Analyze current appointment data"""
    print("\n🔍 Analyzing Appointment data...")
    
    with app.app_context():
        # Analyze status values
        status_values = db.session.query(Appointment.status).distinct().all()
        status_values = [v[0] for v in status_values if v[0]]
        print(f"📊 Appointment.status values: {status_values}")
        
        # Count appointments
        appointment_count = Appointment.query.count()
        print(f"📊 Total appointments: {appointment_count}")

def test_enum_conversions():
    """Test enum conversion functions"""
    print("\n🧪 Testing enum conversions...")
    
    from models.enums import DeviceSide, DeviceStatus, DeviceCategory
    
    # Test DeviceSide conversions
    test_ears = ['left', 'right', 'both', 'L', 'R', 'sol', 'sağ', None, '']
    print("👂 DeviceSide conversions:")
    for ear in test_ears:
        converted = DeviceSide.from_legacy(ear)
        print(f"  '{ear}' → {converted.value}")
    
    # Test DeviceStatus conversions
    test_statuses = ['trial', 'in_stock', 'assigned', 'stokta', 'deneme', None, '']
    print("\n📋 DeviceStatus conversions:")
    for status in test_statuses:
        converted = DeviceStatus.from_legacy(status)
        print(f"  '{status}' → {converted.value}")
    
    # Test DeviceCategory conversions
    test_categories = ['hearing_aid', 'battery', 'accessory', 'işitme_cihazı', 'pil', None, '']
    print("\n📂 DeviceCategory conversions:")
    for category in test_categories:
        converted = DeviceCategory.from_legacy(category)
        print(f"  '{category}' → {converted.value}")

def main():
    """Run all analyses"""
    print("🚀 Starting Data Analysis for Enum Migration\n")
    
    try:
        analyze_device_data()
        analyze_patient_data()
        analyze_appointment_data()
        test_enum_conversions()
        
        print("\n✅ Data analysis completed successfully!")
        print("\n📋 Next Steps:")
        print("1. Review the current values above")
        print("2. Ensure enum conversion functions handle all cases")
        print("3. Create migration script to convert data")
        print("4. Update models to use enums")
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()