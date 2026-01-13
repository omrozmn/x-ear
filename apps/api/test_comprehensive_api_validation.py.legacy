"""
Comprehensive API Validation Tests
Tests DB → Backend → Frontend bridge for CRM, Admin, Landing, and Affiliate modules
"""
import pytest
import json
from datetime import datetime, timedelta


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def test_patient(client):
    """Create a test patient for use in tests"""
    patient_data = {
        'firstName': 'Test',
        'lastName': 'Patient',
        'tcNumber': '12345678901',
        'phone': '+905551234567',
        'email': 'test@example.com',
        'birthDate': '1990-01-01',
        'gender': 'M'
    }
    resp = client.post('/api/patients', json=patient_data)
    assert resp.status_code == 201
    return resp.json['data']


@pytest.fixture
def test_user(client):
    """Create a test user"""
    user_data = {
        'email': 'testuser@example.com',
        'password': 'Test123!',
        'firstName': 'Test',
        'lastName': 'User',
        'role': 'user'
    }
    resp = client.post('/api/users', json=user_data)
    if resp.status_code == 201:
        return resp.json['data']
    # User might already exist
    return None


@pytest.fixture
def test_inventory_item(client):
    """Create a test inventory item"""
    item_data = {
        'brand': 'TestBrand',
        'model': 'TestModel',
        'category': 'hearing_aid',
        'price': 5000,
        'availableInventory': 10,
        'ear': 'bilateral'
    }
    resp = client.post('/api/inventory', json=item_data)
    assert resp.status_code == 201
    return resp.json['data']


# ============================================================================
# CRM MODULE TESTS
# ============================================================================

class TestCRMModule:
    """Test CRM functionality: Patients, Sales, Inventory"""
    
    def test_patient_full_lifecycle(self, client):
        """Test complete patient CRUD + timeline + notes"""
        # 1. CREATE patient
        patient_data = {
            'firstName': 'CRM',
            'lastName': 'TestPatient',
            'tcNumber': '98765432109',
            'phone': '+905559876543',
            'email': 'crm@test.com',
            'birthDate': '1985-05-15',
            'gender': 'F'
        }
        resp = client.post('/api/patients', json=patient_data)
        assert resp.status_code == 201
        assert resp.json['success'] is True
        patient = resp.json['data']
        patient_id = patient['id']
        
        # Verify DB → Backend
        assert patient['firstName'] == 'CRM'
        assert patient['lastName'] == 'TestPatient'
        assert patient['tcNumber'] == '98765432109'
        
        # 2. READ patient
        resp = client.get(f'/api/patients/{patient_id}')
        assert resp.status_code == 200
        assert resp.json['success'] is True
        fetched_patient = resp.json['data']
        assert fetched_patient['id'] == patient_id
        
        # 3. UPDATE patient
        update_data = {
            'phone': '+905551111111',
            'email': 'updated@test.com'
        }
        resp = client.put(f'/api/patients/{patient_id}', json=update_data)
        assert resp.status_code == 200
        updated_patient = resp.json['data']
        assert updated_patient['phone'] == '+905551111111'
        
        # 4. Add TIMELINE event
        timeline_data = {
            'eventType': 'appointment',
            'title': 'First Visit',
            'description': 'Initial consultation',
            'eventDate': datetime.now().isoformat()
        }
        resp = client.post(f'/api/patients/{patient_id}/timeline', json=timeline_data)
        assert resp.status_code == 201
        
        # 5. Add NOTE
        note_data = {
            'content': 'Patient prefers morning appointments',
            'category': 'general'
        }
        resp = client.post(f'/api/patients/{patient_id}/notes', json=note_data)
        assert resp.status_code == 201
        
        # 6. GET timeline
        resp = client.get(f'/api/patients/{patient_id}/timeline')
        assert resp.status_code == 200
        timeline = resp.json['data']
        assert len(timeline) > 0
        
        # 7. DELETE patient
        resp = client.delete(f'/api/patients/{patient_id}')
        assert resp.status_code == 200
        
        # Verify deletion
        resp = client.get(f'/api/patients/{patient_id}')
        assert resp.status_code == 404
    
    def test_inventory_full_lifecycle(self, client):
        """Test complete inventory CRUD + serial numbers"""
        # 1. CREATE inventory item
        item_data = {
            'brand': 'Phonak',
            'model': 'Audeo Paradise P90',
            'category': 'hearing_aid',
            'price': 12500,
            'cost': 8000,
            'availableInventory': 5,
            'ear': 'bilateral',
            'barcode': 'TEST-BARCODE-001'
        }
        resp = client.post('/api/inventory', json=item_data)
        assert resp.status_code == 201
        assert resp.json['success'] is True
        item = resp.json['data']
        item_id = item['id']
        
        # Verify DB → Backend
        assert item['brand'] == 'Phonak'
        assert item['model'] == 'Audeo Paradise P90'
        assert item['price'] == 12500
        
        # 2. READ inventory item
        resp = client.get(f'/api/inventory/{item_id}')
        assert resp.status_code == 200
        fetched_item = resp.json['data']
        assert fetched_item['id'] == item_id
        
        # 3. Add SERIAL NUMBERS
        serial_data = {
            'serials': ['SN001', 'SN002', 'SN003']
        }
        resp = client.post(f'/api/inventory/{item_id}/serials', json=serial_data)
        assert resp.status_code == 201
        
        # Verify serials added
        resp = client.get(f'/api/inventory/{item_id}')
        item_with_serials = resp.json['data']
        assert len(item_with_serials.get('availableSerials', [])) == 3
        
        # 4. UPDATE inventory
        update_data = {
            'price': 13000,
            'availableInventory': 8
        }
        resp = client.put(f'/api/inventory/{item_id}', json=update_data)
        assert resp.status_code == 200
        updated_item = resp.json['data']
        assert updated_item['price'] == 13000
        
        # 5. GET inventory activities
        resp = client.get(f'/api/inventory/{item_id}/activity')
        assert resp.status_code == 200
        activities = resp.json['data']
        assert isinstance(activities, list)
        
        # 6. DELETE inventory item
        resp = client.delete(f'/api/inventory/{item_id}')
        assert resp.status_code == 200
    
    def test_sale_creation_with_payment_plan(self, client, test_patient, test_inventory_item):
        """Test complete sale flow: create → payment plan → invoice"""
        # 1. CREATE sale
        sale_data = {
            'patientId': test_patient['id'],
            'items': [
                {
                    'inventoryId': test_inventory_item['id'],
                    'quantity': 1,
                    'unitPrice': test_inventory_item['price'],
                    'discount': 500
                }
            ],
            'totalAmount': test_inventory_item['price'] - 500,
            'paymentMethod': 'installment'
        }
        resp = client.post('/api/sales', json=sale_data)
        assert resp.status_code == 201
        assert resp.json['success'] is True
        sale = resp.json['data']
        sale_id = sale['id']
        
        # Verify DB → Backend
        assert sale['patientId'] == test_patient['id']
        assert sale['totalAmount'] == test_inventory_item['price'] - 500
        
        # 2. CREATE payment plan
        payment_plan_data = {
            'totalAmount': sale['totalAmount'],
            'installments': 6,
            'firstPaymentDate': (datetime.now() + timedelta(days=7)).isoformat(),
            'frequency': 'monthly'
        }
        resp = client.post(f'/api/sales/{sale_id}/payment-plan', json=payment_plan_data)
        assert resp.status_code == 201
        
        # 3. CREATE invoice
        resp = client.post(f'/api/sales/{sale_id}/invoice')
        assert resp.status_code == 201
        invoice = resp.json['data']
        
        # Verify invoice data
        assert 'invoice_id' in invoice or 'id' in invoice
        
        # 4. GET sale details
        resp = client.get(f'/api/sales/{sale_id}')
        assert resp.status_code == 200
        sale_details = resp.json['data']
        assert sale_details['id'] == sale_id


# ============================================================================
# ADMIN PANEL TESTS
# ============================================================================

class TestAdminPanel:
    """Test Admin Panel functionality: Users, Roles, Settings"""
    
    def test_user_management_full_cycle(self, client):
        """Test complete user CRUD operations"""
        # 1. LIST users
        resp = client.get('/api/users')
        assert resp.status_code == 200
        assert resp.json['success'] is True
        initial_count = len(resp.json['data'])
        
        # 2. CREATE user
        user_data = {
            'email': 'admin.test@example.com',
            'password': 'SecurePass123!',
            'firstName': 'Admin',
            'lastName': 'Tester',
            'role': 'admin'
        }
        resp = client.post('/api/users', json=user_data)
        assert resp.status_code == 201
        user = resp.json['data']
        user_id = user['id']
        
        # Verify DB → Backend
        assert user['email'] == 'admin.test@example.com'
        assert user['firstName'] == 'Admin'
        assert 'password' not in user  # Password should not be returned
        
        # 3. READ user
        resp = client.get(f'/api/users/{user_id}')
        assert resp.status_code == 200
        fetched_user = resp.json['data']
        assert fetched_user['id'] == user_id
        
        # 4. UPDATE user
        update_data = {
            'firstName': 'UpdatedAdmin',
            'phone': '+905551234567'
        }
        resp = client.put(f'/api/users/{user_id}', json=update_data)
        assert resp.status_code == 200
        updated_user = resp.json['data']
        assert updated_user['firstName'] == 'UpdatedAdmin'
        
        # 5. DELETE user
        resp = client.delete(f'/api/users/{user_id}')
        assert resp.status_code == 200
        
        # Verify deletion
        resp = client.get('/api/users')
        assert len(resp.json['data']) == initial_count
    
    def test_role_management_with_permissions(self, client):
        """Test role CRUD + permission assignment"""
        # 1. CREATE role
        role_data = {
            'name': 'Sales Manager',
            'description': 'Can manage sales and patients'
        }
        resp = client.post('/api/roles', json=role_data)
        assert resp.status_code == 201
        role = resp.json['data']
        role_id = role['id']
        
        # 2. ADD permissions
        permissions_to_add = ['sales.create', 'sales.view', 'patients.view']
        for perm in permissions_to_add:
            resp = client.post(f'/api/roles/{role_id}/permissions/{perm}')
            assert resp.status_code in [200, 201]
        
        # 3. GET role with permissions
        resp = client.get(f'/api/roles/{role_id}')
        assert resp.status_code == 200
        role_with_perms = resp.json['data']
        # Permissions should be included in response
        
        # 4. REMOVE permission
        resp = client.delete(f'/api/roles/{role_id}/permissions/sales.create')
        assert resp.status_code == 200
        
        # 5. DELETE role
        resp = client.delete(f'/api/roles/{role_id}')
        assert resp.status_code == 200
    
    def test_dashboard_data_integrity(self, client):
        """Test dashboard data returns correct aggregations"""
        # 1. GET dashboard overview
        resp = client.get('/api/dashboard')
        assert resp.status_code == 200
        assert resp.json['success'] is True
        dashboard = resp.json['data']
        
        # Verify all required sections
        assert 'stats' in dashboard or 'kpis' in dashboard
        
        # 2. GET specific charts
        resp = client.get('/api/dashboard/charts/patient-distribution')
        assert resp.status_code == 200
        chart_data = resp.json['data']
        assert isinstance(chart_data, list)
        
        # 3. GET patient trends
        resp = client.get('/api/dashboard/charts/patient-trends')
        assert resp.status_code == 200
        
        # 4. GET revenue trends
        resp = client.get('/api/dashboard/charts/revenue-trends')
        assert resp.status_code == 200
    
    def test_notifications_system(self, client):
        """Test notification creation and management"""
        # 1. LIST notifications
        resp = client.get('/api/notifications')
        assert resp.status_code == 200
        notifications = resp.json['data']
        assert isinstance(notifications, list)
        
        # 2. GET notification stats
        resp = client.get('/api/notifications/stats')
        assert resp.status_code == 200
        stats = resp.json['data']
        assert 'unreadCount' in stats or 'total_unread' in stats
        
        # If there are notifications, test mark as read
        if len(notifications) > 0:
            notif_id = notifications[0]['id']
            
            # 3. MARK as read
            resp = client.put(f'/api/notifications/{notif_id}/read')
            assert resp.status_code == 200
            
            # 4. DELETE notification
            resp = client.delete(f'/api/notifications/{notif_id}')
            assert resp.status_code in [200, 204]


# ============================================================================
# RESPONSE FORMAT VALIDATION
# ============================================================================

class TestResponseFormatConsistency:
    """Ensure all endpoints return consistent response envelopes"""
    
    def test_all_get_endpoints_have_envelope(self, client):
        """Test that all GET endpoints return {success, data, timestamp}"""
        endpoints = [
            '/api/patients',
            '/api/users',
            '/api/roles',
            '/api/sales',
            '/api/inventory',
            '/api/devices',
            '/api/dashboard',
            '/api/notifications',
            '/api/communications/templates',
            '/api/devices/brands',
            '/api/inventory/categories'
        ]
        
        for endpoint in endpoints:
            resp = client.get(endpoint)
            if resp.status_code == 200:
                data = resp.json
                
                # Must have success flag
                assert 'success' in data, f"{endpoint} missing 'success'"
                assert isinstance(data['success'], bool), f"{endpoint} success not boolean"
                
                # Must have data
                assert 'data' in data, f"{endpoint} missing 'data'"
                
                # Must have timestamp
                assert 'timestamp' in data, f"{endpoint} missing 'timestamp'"
    
    def test_all_post_endpoints_have_envelope(self, client):
        """Test POST endpoints return consistent envelope"""
        # Test with minimal valid data
        test_cases = [
            ('/api/devices/brands', {'name': 'TestBrandEnvelope'}),
            ('/api/inventory/categories', {'name': 'TestCategoryEnvelope'})
        ]
        
        for endpoint, payload in test_cases:
            resp = client.post(endpoint, json=payload)
            if resp.status_code in [200, 201]:
                data = resp.json
                assert 'success' in data
                assert 'timestamp' in data
    
    def test_error_responses_have_envelope(self, client):
        """Test error responses have consistent format"""
        # Test 404
        resp = client.get('/api/patients/nonexistent-id-12345')
        assert resp.status_code == 404
        data = resp.json
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data or 'message' in data


# ============================================================================
# PAGINATION TESTS
# ============================================================================

class TestPaginationConsistency:
    """Test pagination works consistently across all list endpoints"""
    
    def test_patients_pagination(self, client):
        """Test patient list pagination"""
        resp = client.get('/api/patients?page=1&per_page=5')
        assert resp.status_code == 200
        data = resp.json
        
        # Check pagination metadata
        assert 'data' in data
        patients = data['data']
        assert isinstance(patients, list)
        
        # Should have pagination info (either in meta or root)
        has_pagination = (
            'meta' in data and 'total' in data['meta']
        ) or (
            'total' in data and 'page' in data
        )
        assert has_pagination, "Missing pagination metadata"
    
    def test_inventory_pagination(self, client):
        """Test inventory list pagination"""
        resp = client.get('/api/inventory?page=1&per_page=10')
        assert resp.status_code == 200
        data = resp.json
        assert 'data' in data
        assert isinstance(data['data'], list)


# ============================================================================
# FRONTEND DATA RENDERING TESTS
# ============================================================================

class TestFrontendDataRendering:
    """Test that data formats are correct for frontend rendering"""
    
    def test_patient_data_has_all_required_fields(self, client, test_patient):
        """Ensure patient data has all fields frontend expects"""
        resp = client.get(f'/api/patients/{test_patient["id"]}')
        assert resp.status_code == 200
        patient = resp.json['data']
        
        # Required fields for frontend rendering
        required_fields = ['id', 'firstName', 'lastName', 'phone']
        for field in required_fields:
            assert field in patient, f"Missing required field: {field}"
    
    def test_inventory_item_has_pricing_data(self, client, test_inventory_item):
        """Ensure inventory items have all pricing fields"""
        resp = client.get(f'/api/inventory/{test_inventory_item["id"]}')
        assert resp.status_code == 200
        item = resp.json['data']
        
        # Required for frontend price display
        assert 'price' in item
        assert isinstance(item['price'], (int, float))
        assert item['price'] > 0
    
    def test_dashboard_chart_data_format(self, client):
        """Ensure dashboard charts return data in correct format for charting libraries"""
        resp = client.get('/api/dashboard/charts/patient-distribution')
        assert resp.status_code == 200
        chart_data = resp.json['data']
        
        # Should be array of objects with category and count/value
        assert isinstance(chart_data, list)
        if len(chart_data) > 0:
            item = chart_data[0]
            # Should have keys that charts can use
            has_chart_keys = (
                'category' in item or 'name' in item or 'label' in item
            ) and (
                'count' in item or 'value' in item or 'y' in item
            )
            assert has_chart_keys, "Chart data missing required keys"


# ============================================================================
# PERFORMANCE & LOAD TESTS
# ============================================================================

class TestPerformance:
    """Basic performance validation"""
    
    def test_list_endpoints_respond_quickly(self, client):
        """Ensure list endpoints respond in reasonable time"""
        import time
        
        endpoints = [
            '/api/patients',
            '/api/inventory',
            '/api/sales'
        ]
        
        for endpoint in endpoints:
            start = time.time()
            resp = client.get(endpoint)
            duration = time.time() - start
            
            assert resp.status_code == 200
            assert duration < 2.0, f"{endpoint} took {duration}s (> 2s limit)"


# ============================================================================
# INTEGRATION TESTS (Multi-Module)
# ============================================================================

class TestCrossFunctionalIntegration:
    """Test features that span multiple modules"""
    
    def test_complete_patient_journey(self, client):
        """Test realistic patient journey: register → appointment → sale → invoice"""
        # 1. CREATE patient
        patient_data = {
            'firstName': 'Journey',
            'lastName': 'Patient',
            'tcNumber': '11111111111',
            'phone': '+905551111111',
            'email': 'journey@test.com',
            'birthDate': '1980-01-01',
            'gender': 'M'
        }
        resp = client.post('/api/patients', json=patient_data)
        assert resp.status_code == 201
        patient_id = resp.json['data']['id']
        
        # 2. CREATE appointment
        appointment_data = {
            'patientId': patient_id,
            'appointmentDate': (datetime.now() + timedelta(days=1)).isoformat(),
            'duration': 30,
            'type': 'consultation',
            'notes': 'Initial hearing test'
        }
        resp = client.post('/api/appointments', json=appointment_data)
        assert resp.status_code == 201
        
        # 3. CREATE inventory item (hearing aid)
        item_data = {
            'brand': 'Oticon',
            'model': 'More 1',
            'category': 'hearing_aid',
            'price': 15000,
            'cost': 10000,
            'availableInventory': 3,
            'ear': 'bilateral'
        }
        resp = client.post('/api/inventory', json=item_data)
        assert resp.status_code == 201
        item_id = resp.json['data']['id']
        
        # 4. CREATE sale
        sale_data = {
            'patientId': patient_id,
            'items': [
                {
                    'inventoryId': item_id,
                    'quantity': 1,
                    'unitPrice': 15000,
                    'discount': 0
                }
            ],
            'totalAmount': 15000,
            'paymentMethod': 'cash'
        }
        resp = client.post('/api/sales', json=sale_data)
        assert resp.status_code == 201
        sale_id = resp.json['data']['id']
        
        # 5. CREATE invoice
        resp = client.post(f'/api/sales/{sale_id}/invoice')
        # May return 201 or might fail if birfatura not configured
        # Just verify endpoint is reachable
        assert resp.status_code in [200, 201, 400, 502]
        
        # 6. Verify patient timeline updated
        resp = client.get(f'/api/patients/{patient_id}/timeline')
        assert resp.status_code == 200
        timeline = resp.json['data']
        # Timeline should have events from sale/appointment
        assert len(timeline) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
