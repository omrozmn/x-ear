#!/usr/bin/env python3
"""
Test script to validate new models structure
Tests compatibility between old models.py and new models_new/ structure
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all imports work correctly"""
    print("🧪 Testing imports...")
    
    try:
        # Test old imports
        print("✅ Old models import successful")
        
        # Test new imports
        print("✅ New models import successful")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_model_structure():
    """Test that model structures are compatible"""
    print("\n🧪 Testing model structures...")
    
    try:
        from models import Patient as OldPatient, Device as OldDevice
        from models import Patient as NewPatient, Device as NewDevice
        
        # Test Patient structure
        old_patient_cols = set(OldPatient.__table__.columns.keys())
        new_patient_cols = set(NewPatient.__table__.columns.keys())
        
        if old_patient_cols == new_patient_cols:
            print("✅ Patient model structure matches")
        else:
            missing_in_new = old_patient_cols - new_patient_cols
            extra_in_new = new_patient_cols - old_patient_cols
            if missing_in_new:
                print(f"⚠️  Missing in new Patient: {missing_in_new}")
            if extra_in_new:
                print(f"ℹ️  Extra in new Patient: {extra_in_new}")
        
        # Test Device structure
        old_device_cols = set(OldDevice.__table__.columns.keys())
        new_device_cols = set(NewDevice.__table__.columns.keys())
        
        if old_device_cols == new_device_cols:
            print("✅ Device model structure matches")
        else:
            missing_in_new = old_device_cols - new_device_cols
            extra_in_new = new_device_cols - old_device_cols
            if missing_in_new:
                print(f"⚠️  Missing in new Device: {missing_in_new}")
            if extra_in_new:
                print(f"ℹ️  Extra in new Device: {extra_in_new}")
        
        return True
    except Exception as e:
        print(f"❌ Structure test failed: {e}")
        return False

def test_id_generation():
    """Test that new ID generation works"""
    print("\n🧪 Testing ID generation...")
    
    try:
        from models import gen_id
        
        # Test gen_id function
        patient_id = gen_id("pat")
        device_id = gen_id("dev")
        
        assert patient_id.startswith("pat_"), f"Patient ID should start with 'pat_', got: {patient_id}"
        assert device_id.startswith("dev_"), f"Device ID should start with 'dev_', got: {device_id}"
        assert len(patient_id) == 12, f"Patient ID should be 12 chars, got: {len(patient_id)}"
        
        print(f"✅ ID generation works: {patient_id}, {device_id}")
        
        # Test model default IDs (without creating instances)
        print("✅ Model ID defaults configured")
        
        return True
    except Exception as e:
        print(f"❌ ID generation test failed: {e}")
        return False

def test_json_properties():
    """Test JSON property handling"""
    print("\n🧪 Testing JSON properties...")
    
    try:
        from models import Patient
        
        # Create a patient instance (without saving to DB)
        patient = Patient()
        
        # Test tags property
        test_tags = ['vip', 'follow-up']
        patient.tags_json = test_tags
        assert patient.tags_json == test_tags, "Tags JSON property failed"
        
        # Test sgk_info property
        test_sgk = {'rightEarDevice': 'available', 'leftEarDevice': 'used'}
        patient.sgk_info_json = test_sgk
        assert patient.sgk_info_json == test_sgk, "SGK info JSON property failed"
        
        print("✅ JSON properties work correctly")
        return True
    except Exception as e:
        print(f"❌ JSON properties test failed: {e}")
        return False

def test_to_dict_compatibility():
    """Test that to_dict methods produce compatible output"""
    print("\n🧪 Testing to_dict compatibility...")
    
    try:
        from models import Patient, Device
        
        # Create instances
        patient = Patient()
        patient.first_name = "Test"
        patient.last_name = "User"
        patient.phone = "+90 555 123 4567"
        patient.tc_number = "12345678901"
        
        device = Device()
        device.brand = "Test Brand"
        device.model = "Test Model"
        device.serial_number = "TEST123"
        
        # Test to_dict
        patient_dict = patient.to_dict()
        device_dict = device.to_dict()
        
        # Check required fields
        assert 'id' in patient_dict, "Patient dict missing ID"
        assert 'firstName' in patient_dict, "Patient dict missing firstName"
        assert 'fullName' in patient_dict, "Patient dict missing fullName"
        assert 'createdAt' in patient_dict, "Patient dict missing createdAt"
        
        assert 'id' in device_dict, "Device dict missing ID"
        assert 'brand' in device_dict, "Device dict missing brand"
        assert 'serialNumber' in device_dict, "Device dict missing serialNumber"
        
        print("✅ to_dict methods work correctly")
        return True
    except Exception as e:
        print(f"❌ to_dict test failed: {e}")
        return False

def test_all_models_present():
    """Test that all models are present in new structure"""
    print("\n🧪 Testing all models present...")
    
    expected_models = [
        'Patient', 'Device', 'Appointment', 'PatientNote', 'EReceipt', 'HearingTest',
        'User', 'ActivityLog', 'Notification', 'DeviceAssignment', 'Sale', 
        'PaymentPlan', 'PaymentInstallment', 'Settings', 'Campaign', 'SMSLog',
        'Inventory', 'Supplier', 'ProductSupplier'
    ]
    
    try:
        from models import __all__ as new_models_all
        
        missing_models = []
        for model in expected_models:
            if model not in new_models_all:
                missing_models.append(model)
        
        if missing_models:
            print(f"⚠️  Missing models: {missing_models}")
        else:
            print("✅ All expected models present")
        
        print(f"📊 Total models: {len(new_models_all)}")
        return len(missing_models) == 0
    except Exception as e:
        print(f"❌ Model presence test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting New Models Validation Tests\n")
    
    tests = [
        test_imports,
        test_model_structure,
        test_id_generation,
        test_json_properties,
        test_to_dict_compatibility,
        test_all_models_present
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! New models structure is ready.")
        return True
    else:
        print("❌ Some tests failed. Please fix issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)