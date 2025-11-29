from app import app, db
from models.inventory import Inventory
from models.user import User
from models.tenant import Tenant
import uuid

def test_create_inventory():
    with app.app_context():
        print("Testing Inventory Creation...")
        try:
            # Get the admin user
            user = User.query.filter_by(username='admin').first()
            if not user:
                print("Admin user not found!")
                return

            print(f"User: {user.username}, Tenant: {user.tenant_id}")

            # Create an inventory item
            item = Inventory()
            item.id = f"test_item_{uuid.uuid4().hex[:8]}"
            item.name = "Test Item"
            item.brand = "Test Brand"
            item.category = "hearing_aid"
            item.tenant_id = user.tenant_id
            item.price = 100.0
            item.available_inventory = 10
            
            db.session.add(item)
            db.session.commit()
            print(f"Successfully created item: {item.id}")
            
            # Clean up
            db.session.delete(item)
            db.session.commit()
            print("Successfully deleted test item")
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_create_inventory()
