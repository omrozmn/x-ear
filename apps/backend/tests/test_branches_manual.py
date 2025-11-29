import sys
import os
import unittest
import json

# Add parent directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app
from models.base import db
from models.user import User
from models.branch import Branch
from models.tenant import Tenant
from models.patient import Patient
from flask_jwt_extended import create_access_token

class TestBranches(unittest.TestCase):
    def setUp(self):
        flask_app.config['TESTING'] = True
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = flask_app
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Create tenant
        import uuid
        slug = f"test-tenant-{uuid.uuid4().hex[:8]}"
        self.tenant = Tenant(
            name="Test Tenant", 
            slug=slug,
            owner_email="admin@test.com",
            billing_email="admin@test.com"
        )
        db.session.add(self.tenant)
        db.session.commit()

        # Create tenant admin
        self.tenant_admin = User(
            email="admin@test.com",
            username="admin",
            role="tenant_admin",
            tenant_id=self.tenant.id,
            first_name="Admin",
            last_name="User"
        )
        self.tenant_admin.set_password("password")
        db.session.add(self.tenant_admin)
        db.session.commit()

        # Create branch
        self.branch = Branch(name="Test Branch", tenant_id=self.tenant.id)
        db.session.add(self.branch)
        db.session.commit()

        # Create branch admin
        self.branch_admin = User(
            email="branch_admin@test.com",
            username="branch_admin",
            role="admin",
            tenant_id=self.tenant.id,
            first_name="Branch",
            last_name="Admin"
        )
        self.branch_admin.set_password("password")
        self.branch_admin.branches.append(self.branch)
        db.session.add(self.branch_admin)
        db.session.commit()

        self.admin_token = create_access_token(identity=self.tenant_admin.id)
        self.branch_admin_token = create_access_token(identity=self.branch_admin.id)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_create_branch(self):
        response = self.client.post('/api/branches', json={
            'name': 'New Branch',
            'address': '123 Main St'
        }, headers={'Authorization': f'Bearer {self.admin_token}'})
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json['success'])
        self.assertEqual(response.json['data']['name'], 'New Branch')

    def test_get_branches_tenant_admin(self):
        response = self.client.get('/api/branches', headers={'Authorization': f'Bearer {self.admin_token}'})
        
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json['data']), 1)
        branch_ids = [b['id'] for b in response.json['data']]
        self.assertIn(self.branch.id, branch_ids)

    def test_get_branches_branch_admin(self):
        response = self.client.get('/api/branches', headers={'Authorization': f'Bearer {self.branch_admin_token}'})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['data']), 1)
        self.assertEqual(response.json['data'][0]['id'], self.branch.id)

    def test_patient_filtering(self):
        # Create a patient in the branch
        p1 = Patient(
            first_name="Branch", 
            last_name="Patient", 
            phone="5551112233",
            tenant_id=self.tenant.id,
            branch_id=self.branch.id,
            tc_number="11111111111"
        )
        # Create a patient in another branch (or no branch)
        p2 = Patient(
            first_name="Other", 
            last_name="Patient", 
            phone="5554445566",
            tenant_id=self.tenant.id,
            tc_number="22222222222"
        )
        db.session.add(p1)
        db.session.add(p2)
        db.session.commit()

        response = self.client.get('/api/patients', headers={'Authorization': f'Bearer {self.branch_admin_token}'})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['data']), 1)
        self.assertEqual(response.json['data'][0]['firstName'], "Branch")

if __name__ == '__main__':
    unittest.main()
