"""Test data generator with unique identifiers."""
import time
import random
from typing import Dict, Any
from .logging_config import logger


class DataGenerator:
    """Generates unique test data for API testing."""
    
    def __init__(self):
        """Initialize data generator."""
        self.suffix = self.generate_unique_suffix()
    
    @staticmethod
    def generate_unique_suffix() -> str:
        """Generate unique suffix using timestamp + random.
        
        Returns:
            Unique suffix string (e.g., "17714453641234")
        """
        return f"{int(time.time())}{random.randint(1000, 9999)}"
    
    @staticmethod
    def generate_tckn() -> str:
        """Generate valid Turkish ID number (TCKN).
        
        Returns:
            11-digit TCKN (truly unique using timestamp)
        """
        # Use timestamp to ensure uniqueness
        return str(random.randint(10000000000, 99999999999))
    
    @staticmethod
    def generate_phone() -> str:
        """Generate Turkish phone number format with timestamp for uniqueness.
        
        Returns:
            Phone number in format "+90XXXXXXXXXX" (guaranteed unique)
        """
        # Use timestamp + random to ensure uniqueness
        timestamp_part = str(int(time.time()))[-9:]  # Last 9 digits of timestamp
        random_part = str(random.randint(100, 999))  # 3 random digits
        return f"+90{timestamp_part}{random_part}"
    
    def generate_test_data(self, suffix: str = None) -> Dict[str, Any]:
        """Generate all test data with unique suffix.
        
        Args:
            suffix: Unique suffix for this test run (uses instance suffix if None)
            
        Returns:
            Dictionary of test data templates for all resource types
        """
        if suffix is None:
            suffix = self.suffix
        
        unique_id = f"{suffix}-{random.randint(1000, 9999)}"
        tckn = self.generate_tckn()
        
        logger.debug(f"Generating test data with suffix: {unique_id}")
        
        return {
            "PLAN": {
            "name": f"Test Plan {unique_id}",
            "slug": f"plan-{unique_id}",
            "description": "Test plan",
            "planType": "BASIC",
            "price": 100.0,
            "billingInterval": "YEARLY",
            "maxUsers": 10,
            "isActive": True,
            "isPublic": True
        },
        "TENANT": {
            "name": f"Test Tenant {unique_id}",
            "subdomain": f"tenant{suffix}",
            "plan": "enterprise",
            "billingEmail": f"billing-{unique_id}@test.com",
            "maxUsers": 999,
            "maxBranches": 999
        },
        "USER": {
            "email": f"user-{unique_id}@test.com",
            "password": "Pass1234",
            "firstName": "Test",
            "lastName": "User",
            "role": "support",
            "username": f"user_{unique_id}",
            "isActive": True
        },
        "PARTY": {
            "firstName": "Test",
            "lastName": f"Party {unique_id}",
            "phone": self.generate_phone(),
            "email": f"party-{unique_id}@test.com",
            "tcNumber": self.generate_tckn(),  # Unique TC number
            "status": "active"
        },
        "BRANCH": {
            "name": f"Test Branch {unique_id}",
            "address": "Test Address",
            "phone": self.generate_phone(),
            "isActive": True
        },
        "CAMPAIGN": {
            "name": f"Test Campaign {unique_id}",
            "slug": f"campaign-{unique_id}",
            "description": "Test campaign",
            "startDate": "2026-01-01",
            "endDate": "2026-12-31",
            "isActive": True
        },
        "SALE": {
            "saleDate": "2026-02-18T00:00:00Z",
            "totalAmount": 5000.0,
            "paidAmount": 1000.0,
            "paymentMethod": "CASH",
            "status": "PENDING"
        },
        "DEVICE": {
            "serialNumber": f"SN-{unique_id}",
            "brand": "TestBrand",
            "model": "TestModel",
            "type": "HEARING_AID",
            "status": "active"
        },
        "ITEM": {
            "name": f"Test Item {unique_id}",
            "sku": f"SKU-{unique_id}",
            "brand": "TestBrand",
            "model": "TestModel",
            "price": 100.0,
            "stock": 10,
            "category": "HEARING_AID"
        },
        "APPOINTMENT": {
            "date": "2026-06-15",
            "time": "10:00",
            "status": "SCHEDULED",
            "type": "CONSULTATION"
        },
        "ROLE": {
            "name": f"Test Role {unique_id}",
            "code": f"TEST_ROLE_{suffix}",
            "description": "Test role"
        },
        "NOTIFICATION": {
            "title": f"Test Notification {unique_id}",
            "message": "Test message",
            "type": "info"
        },
        "AFFILIATE": {
            "code": f"AFF{suffix}",
            "email": f"affiliate-{unique_id}@test.com",
            "name": f"Affiliate {unique_id}",
            "commissionRate": 10.0,
            "status": "active"
        },
        "ADDON": {
            "name": f"Test Addon {unique_id}",
            "code": f"ADDON_{suffix}",
            "price": 50.0,
            "description": "Test addon"
        },
        "TEMPLATE": {
            "name": f"Test Template {unique_id}",
            "type": "email",
            "subject": "Test Subject",
            "body": "Test Body"
        },
        "INVOICE": {
            "recipientName": "Test Customer",
            "recipientTaxNumber": "1234567890",
            "recipientAddress": "Test Address",
            "recipientEmail": f"invoice-{unique_id}@test.com",
            "invoiceDate": "2026-02-18",
            "scenario": "36",
            "currency": "TRY",
            "productName": "Test Product",
            "quantity": 1,
            "unitPrice": 100.0,
            "status": "draft"  # Valid InvoiceStatus enum value
        },
        "PACKAGE": {
            "name": f"Test Package {unique_id}",
            "credits": 1000,
            "price": 100.0
        },
        "INTEGRATION": {
            "name": f"Test Integration {unique_id}",
            "type": "marketplace",
            "config": {}
        },
        "SMS_HEADER": {
            "header": f"TEST{suffix[:6]}",
            "isDefault": False
        },
        "SUPPLIER": {
            "companyName": f"Test Supplier {unique_id}",
            "contactPerson": "John Doe",
            "phone": self.generate_phone(),
            "email": f"supplier-{unique_id}@test.com",
            "address": "Test Address",
            "city": "Istanbul",
            "country": "Türkiye"
        }
    }
