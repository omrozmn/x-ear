"""Unit tests for data generator."""
import pytest
from .data_generator import DataGenerator


class TestDataGenerator:
    """Unit tests for test data generation."""
    
    def test_data_generator_initialization(self):
        """Test DataGenerator can be initialized."""
        generator = DataGenerator()
        
        assert generator is not None, "DataGenerator should be instantiated"
    
    def test_generate_unique_suffix_format(self):
        """Test unique suffix format."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        
        assert isinstance(suffix, str), "Suffix should be a string"
        assert len(suffix) > 0, "Suffix should not be empty"
        assert suffix.isdigit(), "Suffix should contain only digits"
    
    def test_generate_unique_suffix_uniqueness(self):
        """Test that suffixes are unique."""
        generator = DataGenerator()
        
        suffixes = [generator.generate_unique_suffix() for _ in range(10)]
        
        assert len(suffixes) == len(set(suffixes)), "All suffixes should be unique"
    
    def test_generate_tckn_format(self):
        """Test TCKN generation format."""
        generator = DataGenerator()
        tckn = generator.generate_tckn()
        
        assert isinstance(tckn, str), "TCKN should be a string"
        assert len(tckn) == 11, f"TCKN should be 11 digits, got {len(tckn)}"
        assert tckn.isdigit(), "TCKN should contain only digits"
        assert tckn[0] != '0', "TCKN first digit should not be 0"
    
    def test_generate_phone_format(self):
        """Test phone number generation format."""
        generator = DataGenerator()
        phone = generator.generate_phone()
        
        assert isinstance(phone, str), "Phone should be a string"
        assert phone.startswith('+90') or phone.startswith('05'), \
            f"Phone should start with +90 or 05, got {phone}"
        assert len(phone) in [11, 13], f"Phone length should be 11 or 13, got {len(phone)}"
    
    def test_generate_test_data_structure(self):
        """Test that generate_test_data returns correct structure."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        data = generator.generate_test_data(suffix)
        
        assert isinstance(data, dict), "Test data should be a dict"
        
        # Check for required resource types
        required_types = ["TENANT", "USER", "PARTY", "DEVICE", "SALE", "ROLE", "INVOICE"]
        for resource_type in required_types:
            assert resource_type in data, f"Test data should have {resource_type}"
            assert isinstance(data[resource_type], dict), f"{resource_type} should be a dict"
    
    def test_generate_test_data_tenant_structure(self):
        """Test tenant data structure."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        data = generator.generate_test_data(suffix)
        
        tenant = data["TENANT"]
        assert "name" in tenant, "Tenant should have name"
        assert "slug" in tenant, "Tenant should have slug"
        assert "email" in tenant, "Tenant should have email"
    
    def test_generate_test_data_user_structure(self):
        """Test user data structure."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        data = generator.generate_test_data(suffix)
        
        user = data["USER"]
        assert "email" in user, "User should have email"
        assert "firstName" in user, "User should have firstName"
        assert "lastName" in user, "User should have lastName"
    
    def test_generate_test_data_party_structure(self):
        """Test party data structure."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        data = generator.generate_test_data(suffix)
        
        party = data["PARTY"]
        assert "firstName" in party, "Party should have firstName"
        assert "lastName" in party, "Party should have lastName"
        assert "phone" in party, "Party should have phone"
        assert "tcNumber" in party, "Party should have tcNumber"
    
    def test_generate_test_data_device_structure(self):
        """Test device data structure."""
        generator = DataGenerator()
        suffix = generator.generate_unique_suffix()
        data = generator.generate_test_data(suffix)
        
        device = data["DEVICE"]
        assert "serialNumber" in device, "Device should have serialNumber"
        assert "brand" in device, "Device should have brand"
        assert "model" in device, "Device should have model"
        assert "type" in device, "Device should have type"
    
    def test_generate_test_data_uniqueness(self):
        """Test that generated data is unique across calls."""
        generator = DataGenerator()
        
        suffix1 = generator.generate_unique_suffix()
        suffix2 = generator.generate_unique_suffix()
        
        data1 = generator.generate_test_data(suffix1)
        data2 = generator.generate_test_data(suffix2)
        
        # Check that emails are different
        assert data1["USER"]["email"] != data2["USER"]["email"], \
            "User emails should be unique"
        
        # Check that TC numbers are different
        assert data1["PARTY"]["tcNumber"] != data2["PARTY"]["tcNumber"], \
            "Party TC numbers should be unique"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
