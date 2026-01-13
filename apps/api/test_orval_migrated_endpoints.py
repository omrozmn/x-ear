"""
Tests for Orval-migrated endpoints: Roles, Brands, and Categories
"""
import pytest


def test_roles_crud_endpoints(client):
    """Test all roles CRUD operations"""
    # List roles (should start empty or with system roles)
    resp = client.get('/api/roles')
    assert resp.status_code == 200
    data = resp.json
    assert 'success' in data
    assert 'data' in data
    initial_count = len(data['data'])
    
    # Create a new role
    new_role = {
        'name': 'Test Manager',
        'description': 'Test role for API testing'
    }
    resp = client.post('/api/roles', json=new_role)
    assert resp.status_code == 201
    data = resp.json
    assert data['success'] is True
    assert 'data' in data
    role_id = data['data']['id']
    assert data['data']['name'] == 'Test Manager'
    assert data['data']['description'] == 'Test role for API testing'
    
    # List roles again (should have one more)
    resp = client.get('/api/roles')
    assert resp.status_code == 200
    assert len(resp.json['data']) == initial_count + 1
    
    # Update the role
    updated_role = {
        'name': 'Updated Manager',
        'description': 'Updated description'
    }
    resp = client.put(f'/api/roles/{role_id}', json=updated_role)
    assert resp.status_code == 200
    data = resp.json
    assert data['success'] is True
    assert data['data']['name'] == 'Updated Manager'
    assert data['data']['description'] == 'Updated description'
    
    # Delete the role
    resp = client.delete(f'/api/roles/{role_id}')
    assert resp.status_code == 200
    
    # Verify deletion
    resp = client.get('/api/roles')
    assert resp.status_code == 200
    assert len(resp.json['data']) == initial_count


def test_devices_brands_endpoints(client):
    """Test device brands endpoints"""
    # Get brands list
    resp = client.get('/api/devices/brands')
    assert resp.status_code == 200
    data = resp.json
    assert 'success' in data
    assert 'data' in data
    assert isinstance(data['data'], list)
    initial_brands = set(data['data'])
    
    # Create new brand
    new_brand = {'name': 'TestBrand123'}
    resp = client.post('/api/devices/brands', json=new_brand)
    assert resp.status_code == 201
    
    # Verify brand was added
    resp = client.get('/api/devices/brands')
    assert resp.status_code == 200
    brands = resp.json['data']
    assert 'TestBrand123' in brands
    assert len(brands) == len(initial_brands) + 1
    
    # Try to create duplicate (should fail with 409)
    resp = client.post('/api/devices/brands', json=new_brand)
    assert resp.status_code == 409


def test_inventory_categories_endpoints(client):
    """Test inventory categories endpoints"""
    # Get categories list
    resp = client.get('/api/inventory/categories')
    assert resp.status_code == 200
    data = resp.json
    assert 'success' in data
    assert 'data' in data
    assert isinstance(data['data'], list)
    initial_categories = set(data['data'])
    
    # Create new category
    new_category = {'name': 'TestCategory123'}
    resp = client.post('/api/inventory/categories', json=new_category)
    assert resp.status_code == 201
    
    # Verify category was added
    resp = client.get('/api/inventory/categories')
    assert resp.status_code == 200
    categories = resp.json['data']
    assert 'TestCategory123' in categories
    assert len(categories) == len(initial_categories) + 1
    
    # Try to create duplicate (should fail with 409)
    resp = client.post('/api/inventory/categories', json=new_category)
    assert resp.status_code == 409


def test_response_format_consistency(client):
    """Test that all migrated endpoints return consistent response format"""
    endpoints = [
        '/api/roles',
        '/api/devices/brands',
        '/api/inventory/categories'
    ]
    
    for endpoint in endpoints:
        resp = client.get(endpoint)
        assert resp.status_code == 200
        data = resp.json
        
        # All should have success flag
        assert 'success' in data
        assert isinstance(data['success'], bool)
        
        # All should have data property
        assert 'data' in data
        
        # All should have timestamp
        assert 'timestamp' in data
        
        # Check that data is correct type
        if endpoint == '/api/roles':
            assert isinstance(data['data'], list)
        else:  # brands and categories
            assert isinstance(data['data'], list)
            assert all(isinstance(item, str) for item in data['data'])


def test_error_handling(client):
    """Test error handling for migrated endpoints"""
    # Test invalid role ID
    resp = client.get('/api/roles/invalid-uuid-format')
    assert resp.status_code in [400, 404]
    
    # Test update non-existent role
    resp = client.put('/api/roles/00000000-0000-0000-0000-000000000000', json={
        'name': 'Test',
        'description': 'Test'
    })
    assert resp.status_code == 404
    
    # Test delete non-existent role
    resp = client.delete('/api/roles/00000000-0000-0000-0000-000000000000')
    assert resp.status_code == 404
    
    # Test create brand without name
    resp = client.post('/api/devices/brands', json={})
    assert resp.status_code == 400
    
    # Test create category without name
    resp = client.post('/api/inventory/categories', json={})
    assert resp.status_code == 400
