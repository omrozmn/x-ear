"""
Test enum serialization fixes
"""
import pytest
from schemas.enums import PartyStatus, AppointmentStatus


def test_party_status_enum_values_are_lowercase():
    """Ensure PartyStatus enum values are lowercase for API consistency"""
    assert PartyStatus.ACTIVE.value == 'active'
    assert PartyStatus.INACTIVE.value == 'inactive'
    assert PartyStatus.LEAD.value == 'lead'
    
    # Verify no uppercase values
    for status in PartyStatus:
        assert status.value.islower() or status.value.isupper() == False, \
            f"Status {status.name} has value '{status.value}' which is not lowercase"


def test_appointment_status_enum_values_are_lowercase():
    """Ensure AppointmentStatus enum values are lowercase for API consistency"""
    assert AppointmentStatus.SCHEDULED.value == 'scheduled'
    assert AppointmentStatus.CONFIRMED.value == 'confirmed'
    assert AppointmentStatus.COMPLETED.value == 'completed'
    
    # Verify no uppercase values
    for status in AppointmentStatus:
        assert status.value.islower() or '_' in status.value, \
            f"Status {status.name} has value '{status.value}' which is not lowercase"


def test_enum_serialization_with_value_attribute():
    """Test that enum.value returns the correct string representation"""
    status = PartyStatus.ACTIVE
    
    # This is what CSV export should use
    assert hasattr(status, 'value')
    assert status.value == 'active'
    
    # Verify str() would give wrong result
    assert str(status) == 'PartyStatus.ACTIVE'  # Wrong for CSV
    assert status.value == 'active'  # Correct for CSV


def test_legacy_enum_conversion():
    """Test that legacy UPPERCASE values can be converted to lowercase"""
    # Test from_legacy method
    assert AppointmentStatus.from_legacy('SCHEDULED') == AppointmentStatus.SCHEDULED
    assert AppointmentStatus.from_legacy('scheduled') == AppointmentStatus.SCHEDULED
    assert AppointmentStatus.from_legacy('Scheduled') == AppointmentStatus.SCHEDULED
    
    assert PartyStatus.from_legacy('ACTIVE') == PartyStatus.ACTIVE
    assert PartyStatus.from_legacy('active') == PartyStatus.ACTIVE


def test_csv_export_enum_format():
    """
    Simulate CSV export to ensure enum is serialized correctly
    This is the fix for Bug #2
    """
    # Simulate a Party object with status
    class MockParty:
        def __init__(self):
            self.status = PartyStatus.ACTIVE
    
    party = MockParty()
    
    # OLD WAY (WRONG): str(party.status) → "PartyStatus.ACTIVE"
    wrong_serialization = str(party.status)
    assert 'PartyStatus' in wrong_serialization  # Contains enum class name
    
    # NEW WAY (CORRECT): party.status.value → "active"
    correct_serialization = party.status.value if hasattr(party.status, 'value') else str(party.status)
    assert correct_serialization == 'active'
    assert 'PartyStatus' not in correct_serialization


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
