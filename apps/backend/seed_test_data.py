from app import app
from models.base import db
from models.role import Role
from models.scan_queue import ScanQueue
from models.production_order import ProductionOrder
from models.admin_user import AdminUser, AdminRole
from datetime import datetime, timedelta
import uuid
from werkzeug.security import generate_password_hash

def seed_data():
    with app.app_context():
        print("Seeding test data...")
        
        # 0. Seed AdminUser
        admin_user = AdminUser.query.filter_by(email='admin@x-ear.com').first()
        if not admin_user:
            admin_user = AdminUser(
                id=str(uuid.uuid4()),
                email='admin@x-ear.com',
                password_hash=generate_password_hash('admin123'),
                first_name='Super',
                last_name='Admin',
                role=AdminRole.SUPER_ADMIN.value,
                is_active=True
            )
            db.session.add(admin_user)
            print("Created AdminUser (admin@x-ear.com)")
        else:
            print("AdminUser already exists")

        # 1. Seed Role
        test_role = Role.query.filter_by(name='TestRole').first()
        if not test_role:
            test_role = Role(
                name='TestRole',
                description='A role for testing purposes',
                is_system=False
            )
            db.session.add(test_role)
            print("Created TestRole")
        
        # 2. Seed Scan Queue Items
        if ScanQueue.query.count() == 0:
            scan1 = ScanQueue(
                tenant_id=str(uuid.uuid4()),
                patient_id=str(uuid.uuid4()),
                status='pending',
                priority='normal',
                file_path='/tmp/scan1.stl',
                started_at=datetime.utcnow()
            )
            scan2 = ScanQueue(
                tenant_id=str(uuid.uuid4()),
                patient_id=str(uuid.uuid4()),
                status='failed',
                priority='high',
                file_path='/tmp/scan2.stl',
                error_message='Mesh processing failed',
                started_at=datetime.utcnow() - timedelta(hours=1),
                completed_at=datetime.utcnow() - timedelta(minutes=59)
            )
            db.session.add(scan1)
            db.session.add(scan2)
            print("Created ScanQueue items")

        # 3. Seed Production Orders
        if ProductionOrder.query.count() == 0:
            order1 = ProductionOrder(
                tenant_id=str(uuid.uuid4()),
                patient_id=str(uuid.uuid4()),
                order_number='ORD-2023-001',
                product_type='mold',
                status='new',
                manufacturer='Internal Lab',
                estimated_delivery_date=datetime.utcnow() + timedelta(days=3),
                notes='Urgent delivery'
            )
            order2 = ProductionOrder(
                tenant_id=str(uuid.uuid4()),
                patient_id=str(uuid.uuid4()),
                order_number='ORD-2023-002',
                product_type='filter',
                status='in_production',
                manufacturer='External Partner',
                estimated_delivery_date=datetime.utcnow() + timedelta(days=5)
            )
            db.session.add(order1)
            db.session.add(order2)
            print("Created ProductionOrder items")
            
        db.session.commit()
        print("Seeding completed successfully.")

if __name__ == '__main__':
    seed_data()
