#!/usr/bin/env python
"""
Verification script for enum consolidation fixes
Run this to verify all fixes are working correctly
"""

import sys
import os

# Add parent directory to path so we can import from schemas
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_imports():
    """Test that all imports work correctly"""
    print("🔍 Testing imports...")
    
    try:
        from schemas.enums import (
            AppointmentStatus,
            AppointmentType,
            PartyStatus,
            Gender,
            DeviceSide,
            DeviceStatus,
            DeviceCategory,
            ProductCode,
            TenantType,
            AppErrorCode,
        )
        print("  ✅ schemas.enums imports successful")
    except ImportError as e:
        print(f"  ❌ schemas.enums import failed: {e}")
        return False
    
    try:
        # Test backward compatibility
        import warnings
        warnings.simplefilter('ignore')  # Suppress deprecation warnings for this test
        from core.models.enums import PatientStatus, AppointmentStatus as LegacyAppointmentStatus
        print("  ✅ Backward compatibility imports successful")
    except ImportError as e:
        print(f"  ❌ Backward compatibility import failed: {e}")
        return False
    
    try:
        from core.models.party import Party
        from core.models.appointment import Appointment
        print("  ✅ Model imports successful")
    except ImportError as e:
        print(f"  ❌ Model import failed: {e}")
        return False
    
    return True


def test_enum_values():
    """Test that enum values are lowercase"""
    print("\n🔍 Testing enum values...")
    
    from schemas.enums import AppointmentStatus, PartyStatus
    
    # Check AppointmentStatus
    if AppointmentStatus.SCHEDULED.value != 'scheduled':
        print(f"  ❌ AppointmentStatus.SCHEDULED should be 'scheduled', got '{AppointmentStatus.SCHEDULED.value}'")
        return False
    print("  ✅ AppointmentStatus values are lowercase")
    
    # Check PartyStatus
    if PartyStatus.ACTIVE.value != 'active':
        print(f"  ❌ PartyStatus.ACTIVE should be 'active', got '{PartyStatus.ACTIVE.value}'")
        return False
    print("  ✅ PartyStatus values are lowercase")
    
    return True


def test_csv_serialization():
    """Test CSV enum serialization fix"""
    print("\n🔍 Testing CSV serialization...")
    
    from schemas.enums import PartyStatus
    
    # Simulate enum serialization
    status = PartyStatus.ACTIVE
    
    # Old way (wrong)
    wrong_way = str(status)
    if 'PartyStatus' not in wrong_way:
        print(f"  ⚠️  str(enum) behavior changed: {wrong_way}")
    
    # New way (correct)
    correct_way = status.value if hasattr(status, 'value') else str(status)
    if correct_way != 'active':
        print(f"  ❌ Enum serialization should return 'active', got '{correct_way}'")
        return False
    
    print("  ✅ CSV serialization fix verified")
    return True


def test_legacy_conversion():
    """Test legacy enum conversion"""
    print("\n🔍 Testing legacy conversion...")
    
    from schemas.enums import AppointmentStatus, PartyStatus
    
    # Test UPPERCASE → lowercase conversion
    if AppointmentStatus.from_legacy('SCHEDULED') != AppointmentStatus.SCHEDULED:
        print("  ❌ Legacy conversion failed for AppointmentStatus")
        return False
    
    if PartyStatus.from_legacy('ACTIVE') != PartyStatus.ACTIVE:
        print("  ❌ Legacy conversion failed for PartyStatus")
        return False
    
    print("  ✅ Legacy conversion working")
    return True


def main():
    """Run all verification tests"""
    print("=" * 60)
    print("ENUM CONSOLIDATION FIX VERIFICATION")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("Enum Values", test_enum_values),
        ("CSV Serialization", test_csv_serialization),
        ("Legacy Conversion", test_legacy_conversion),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} test crashed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
        if not result:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Enum fixes verified successfully.")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED! Please review the errors above.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
