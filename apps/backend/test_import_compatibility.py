#!/usr/bin/env python3
"""
Test import compatibility - ensure existing code will work with new models
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def test_route_imports():
    """Test that route files can import from new models"""
    print("🧪 Testing route import compatibility...")
    
    # Simulate route imports
    test_imports = [
        "from models import db, Patient, Device, Appointment",
        "from models import User, ActivityLog, Notification",
        "from models import Sale, PaymentPlan, DeviceAssignment",
        "from models import Settings, Campaign, SMSLog",
        "from models import Inventory, Supplier, ProductSupplier"
    ]
    
    for import_stmt in test_imports:
        try:
            exec(import_stmt)
            print(f"✅ {import_stmt}")
        except Exception as e:
            print(f"❌ {import_stmt} - {e}")
            return False
    
    return True

def test_backward_compatibility():
    """Test that old import style still works"""
    print("\n🧪 Testing backward compatibility...")
    
    try:
        # This should work exactly like before
        from models import db, Patient, Device
        
        # Test creating instances
        patient = Patient()
        device = Device()
        
        # Test that they have the expected attributes
        assert hasattr(patient, 'first_name'), "Patient missing first_name"
        assert hasattr(patient, 'tc_number'), "Patient missing tc_number"
        assert hasattr(device, 'brand'), "Device missing brand"
        assert hasattr(device, 'serial_number'), "Device missing serial_number"
        
        # Test that IDs are auto-generated
        assert patient.id is not None, "Patient ID not auto-generated"
        assert device.id is not None, "Device ID not auto-generated"
        assert patient.id.startswith('pat_'), f"Patient ID wrong format: {patient.id}"
        assert device.id.startswith('dev_'), f"Device ID wrong format: {device.id}"
        
        print("✅ Backward compatibility maintained")
        return True
    except Exception as e:
        print(f"❌ Backward compatibility failed: {e}")
        return False

def test_relationship_compatibility():
    """Test that relationships still work"""
    print("\n🧪 Testing relationship compatibility...")
    
    try:
        from models import Patient, Device, Appointment
        
        # Check that relationships are defined
        assert hasattr(Patient, 'devices'), "Patient missing devices relationship"
        assert hasattr(Patient, 'appointments'), "Patient missing appointments relationship"
        
        print("✅ Relationships are compatible")
        return True
    except Exception as e:
        print(f"❌ Relationship compatibility failed: {e}")
        return False

def test_enhanced_features():
    """Test new enhanced features"""
    print("\n🧪 Testing enhanced features...")
    
    try:
        from models import Patient, Device, gen_id, BaseModel
        
        # Test BaseModel
        patient = Patient()
        assert hasattr(patient, 'created_at'), "BaseModel created_at missing"
        assert hasattr(patient, 'updated_at'), "BaseModel updated_at missing"
        
        # Test JSON properties
        patient.tags_json = ['test', 'enhanced']
        assert patient.tags_json == ['test', 'enhanced'], "JSON properties not working"
        
        # Test ID generation
        custom_id = gen_id('custom')
        assert custom_id.startswith('custom_'), f"Custom ID generation failed: {custom_id}"
        
        # Test improved to_dict
        patient_dict = patient.to_dict()
        assert 'createdAt' in patient_dict, "Enhanced to_dict missing createdAt"
        assert 'updatedAt' in patient_dict, "Enhanced to_dict missing updatedAt"
        
        print("✅ Enhanced features working")
        return True
    except Exception as e:
        print(f"❌ Enhanced features failed: {e}")
        return False

def main():
    """Run compatibility tests"""
    print("🚀 Starting Import Compatibility Tests\n")
    
    tests = [
        test_route_imports,
        test_backward_compatibility,
        test_relationship_compatibility,
        test_enhanced_features
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Compatibility Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 Full compatibility maintained! Ready for migration.")
        return True
    else:
        print("❌ Compatibility issues found. Please fix before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)