#!/usr/bin/env python3
"""
Unit tests for device sales endpoints
Tests device assignment, sales, payment plans, and pricing calculations
"""
import requests
import json
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, Patient, DeviceAssignment, Sale, PaymentPlan
from app import app

class DeviceSalesTester:
    def __init__(self, base_url="http://localhost:5003"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_patient_id = None
        self.test_device_id = None

    def log(self, message):
        """Simple logging function"""
        print(f"[TEST] {message}")

    def test_device_assignment_creation(self):
        """Test creating a device assignment"""
        self.log("Testing device assignment creation...")

        if not self.test_patient_id:
            self.log("ERROR: No test patient ID available")
            return False

        url = f"{self.base_url}/api/patients/{self.test_patient_id}/assign-devices-extended"
        data = {
            "devices": [
                {
                    "ear": "right",
                    "mode": "manual",
                    "reason": "Sale",
                    "deviceData": {
                        "brand": "Phonak",
                        "model": "Audeo B90",
                        "serialNumber": "TEST123456",
                        "type": "RIC"
                    },
                    "pricing": {
                        "listPrice": 5000,
                        "salePrice": 4500,
                        "sgkScheme": "Over18_Working",
                        "discountType": "percent",
                        "discountValue": 10,
                        "paymentMethod": "cash"
                    }
                }
            ]
        }

        try:
            response = self.session.post(url, json=data)
            self.log(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log("✓ Device assignment created successfully")
                    return True
                else:
                    self.log(f"✗ API returned success=false: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log(f"✗ Exception: {e}")
            return False

    def test_sales_creation(self):
        """Test creating a sale"""
        self.log("Testing sales creation...")

        if not self.test_patient_id:
            self.log("ERROR: No test patient ID available")
            return False

        url = f"{self.base_url}/api/sales"
        data = {
            "patientId": self.test_patient_id,
            "items": [
                {
                    "deviceId": "test-device-123",
                    "quantity": 1,
                    "unitPrice": 4500,
                    "discount": 450,
                    "sgkSupport": 3391.36
                }
            ],
            "totalAmount": 3658.64,
            "paymentMethod": "cash",
            "notes": "Test sale"
        }

        try:
            response = self.session.post(url, json=data)
            self.log(f"Status: {response.status_code}")

            if response.status_code == 201:
                result = response.json()
                if result.get('success'):
                    self.log("✓ Sale created successfully")
                    sale_id = result.get('data', {}).get('id')
                    if sale_id:
                        self.test_sale_id = sale_id
                    return True
                else:
                    self.log(f"✗ API returned success=false: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log(f"✗ Exception: {e}")
            return False

    def test_payment_plan_creation(self):
        """Test creating a payment plan"""
        self.log("Testing payment plan creation...")

        if not self.test_sale_id:
            self.log("ERROR: No test sale ID available")
            return False

        url = f"{self.base_url}/api/sales/{self.test_sale_id}/payment-plan"
        data = {
            "installments": 3,
            "frequency": "monthly",
            "startDate": "2024-01-15",
            "notes": "Test payment plan"
        }

        try:
            response = self.session.post(url, json=data)
            self.log(f"Status: {response.status_code}")

            if response.status_code == 201:
                result = response.json()
                if result.get('success'):
                    self.log("✓ Payment plan created successfully")
                    return True
                else:
                    self.log(f"✗ API returned success=false: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log(f"✗ Exception: {e}")
            return False

    def test_pricing_preview(self):
        """Test pricing preview calculation"""
        self.log("Testing pricing preview...")

        url = f"{self.base_url}/api/pricing/preview"
        data = {
            "listPrice": 5000,
            "salePrice": 4500,
            "sgkScheme": "Over18_Working",
            "discountType": "percent",
            "discountValue": 10
        }

        try:
            response = self.session.post(url, json=data)
            self.log(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    preview = result.get('data', {})
                    self.log(f"✓ Pricing preview: {preview}")
                    # Validate calculations
                    expected_net = 4500 * 0.9 - 3391.36  # 10% discount then SGK
                    actual_net = preview.get('netAmount', 0)
                    if abs(actual_net - expected_net) < 0.01:
                        self.log("✓ Pricing calculations are correct")
                        return True
                    else:
                        self.log(f"✗ Pricing calculation mismatch. Expected: {expected_net}, Got: {actual_net}")
                        return False
                else:
                    self.log(f"✗ API returned success=false: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log(f"✗ Exception: {e}")
            return False

    def test_patient_sales_retrieval(self):
        """Test retrieving patient sales"""
        self.log("Testing patient sales retrieval...")

        if not self.test_patient_id:
            self.log("ERROR: No test patient ID available")
            return False

        url = f"{self.base_url}/api/patients/{self.test_patient_id}/sales"

        try:
            response = self.session.get(url)
            self.log(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    sales = result.get('data', [])
                    self.log(f"✓ Retrieved {len(sales)} sales for patient")
                    return True
                else:
                    self.log(f"✗ API returned success=false: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log(f"✗ Exception: {e}")
            return False

    def setup_test_data(self):
        """Set up test data - create a test patient"""
        self.log("Setting up test data...")

        # First, try to get existing test patient
        try:
            response = self.session.get(f"{self.base_url}/api/patients")
            if response.status_code == 200:
                patients = response.json().get('data', [])
                test_patient = next((p for p in patients if p.get('firstName') == 'Test' and p.get('lastName') == 'Patient'), None)
                if test_patient:
                    self.test_patient_id = test_patient['id']
                    self.log(f"✓ Using existing test patient: {self.test_patient_id}")
                    return True
        except Exception as e:
            self.log(f"Warning: Could not check for existing test patient: {e}")

        # Create a new test patient
        url = f"{self.base_url}/api/patients"
        data = {
            "firstName": "Test",
            "lastName": "Patient",
            "tcKimlik": "12345678901",
            "phone": "5551234567",
            "email": "test@example.com",
            "birthDate": "1990-01-01"
        }

        try:
            response = self.session.post(url, json=data)
            if response.status_code == 201:
                result = response.json()
                if result.get('success'):
                    self.test_patient_id = result.get('data', {}).get('id')
                    self.log(f"✓ Created test patient: {self.test_patient_id}")
                    return True
                else:
                    self.log(f"✗ Failed to create test patient: {result}")
                    return False
            else:
                self.log(f"✗ HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log(f"✗ Exception creating test patient: {e}")
            return False

    def run_all_tests(self):
        """Run all device sales tests"""
        self.log("Starting Device Sales API Tests")
        self.log("=" * 50)

        # Setup
        if not self.setup_test_data():
            self.log("✗ Setup failed, aborting tests")
            return False

        # Run tests
        tests = [
            self.test_pricing_preview,
            self.test_device_assignment_creation,
            self.test_sales_creation,
            self.test_payment_plan_creation,
            self.test_patient_sales_retrieval
        ]

        passed = 0
        total = len(tests)

        for test in tests:
            try:
                if test():
                    passed += 1
                self.log("")  # Empty line between tests
            except Exception as e:
                self.log(f"✗ Test {test.__name__} crashed: {e}")
                self.log("")

        # Summary
        self.log("=" * 50)
        self.log(f"Test Results: {passed}/{total} passed")

        if passed == total:
            self.log("🎉 All tests passed!")
            return True
        else:
            self.log("❌ Some tests failed")
            return False

def main():
    tester = DeviceSalesTester()

    if len(sys.argv) > 1:
        base_url = sys.argv[1]
        tester = DeviceSalesTester(base_url)

    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()