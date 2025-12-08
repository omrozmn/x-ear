from app import app, db
from models.base import gen_id
from models.user import User
from models.inventory import Inventory
from models.sales import Sale, DeviceAssignment
from models.stock_movement import StockMovement
from routes.sales import _create_single_device_assignment
import uuid
from datetime import datetime
import json

def test_stock_flow():
    with app.app_context():
        # Ensure tables exist (especially StockMovement) - Drop solely StockMovement to force schema refresh
        from models.stock_movement import StockMovement
        StockMovement.__table__.drop(db.engine, checkfirst=True)
        db.create_all()
        
        # Setup Tenant and User
        suffix = str(uuid.uuid4())[:8]
        user = User(username=f"tester_{suffix}", email=f"test_{suffix}@x.com")
        user.tenant_id = f"tenant_{suffix}"
        user.set_password("testpass123")
        db.session.add(user)
        db.session.commit()
        
        # Create Inventory Item (Serialized)
        inv_serial = Inventory(
            id=gen_id("inv"),
            name="Test Aid Serialized",
            category="hearing_aid",
            tenant_id=user.tenant_id,
            available_inventory=1,
            available_serials=json.dumps(["SN123"]),
            price=1000.0,
            brand="TestBrand"
        )
        db.session.add(inv_serial)
        
        # Create Inventory Item (Non-Serialized)
        inv_qty = Inventory(
            id=gen_id("inv"),
            name="Test Battery",
            category="battery",
            tenant_id=user.tenant_id,
            available_inventory=10,
            price=10.0,
            brand="TestBrand"
        )
        db.session.add(inv_qty)
        db.session.commit()
        
        print("\n=== Test 1: Sale of Serialized Item ===")
        sale = Sale(id=gen_id("sale"), tenant_id=user.tenant_id, patient_id="p1", total_amount=1000, sale_date=datetime.utcnow())
        db.session.add(sale)
        db.session.commit()
        
        assignment_data = {
            'inventoryId': inv_serial.id,
            'serial_number': 'SN123',
            'ear': 'Right'
        }
        
        # Call the internal function we modified
        # Note: tenant_id argument is passed to override context
        assignment, err = _create_single_device_assignment(
            assignment_data, 
            patient_id="p1", 
            sale_id=sale.id, 
            sgk_scheme="standard", 
            pricing_calculation={}, 
            tenant_id=user.tenant_id,
            created_by=user.id
        )
        
        assert err is None, f"Assignment failed: {err}"
        db.session.commit()
        
        # Reload inventory
        db.session.refresh(inv_serial)
        print(f"Inventory Available: {inv_serial.available_inventory}")
        assert inv_serial.available_inventory == 0, "Stock should be 0"
        
        # Check Movement
        movements = StockMovement.query.filter_by(inventory_id=inv_serial.id).all()
        print(f"Movements: {len(movements)}")
        assert len(movements) == 1
        assert movements[0].movement_type == 'sale'
        assert movements[0].quantity == -1
        assert movements[0].serial_number == 'SN123'
        
        print("✅ Serialized Sale Passed")
        
        print("\n=== Test 2: Sale of Non-Serialized Item ===")
        assignment_data_qty = {
            'inventoryId': inv_qty.id,
            'ear': 'Right', # Quantity 1
        }
        
        assignment2, err = _create_single_device_assignment(
            assignment_data_qty, 
            patient_id="p1", 
            sale_id=sale.id, 
            sgk_scheme="standard", 
            pricing_calculation={}, 
            tenant_id=user.tenant_id,
            created_by=user.id
        )
        assert err is None
        db.session.commit()
        
        db.session.refresh(inv_qty)
        print(f"Inventory Quantity Available: {inv_qty.available_inventory}")
        assert inv_qty.available_inventory == 9
        
        movements_qty = StockMovement.query.filter_by(inventory_id=inv_qty.id).all()
        assert len(movements_qty) == 1
        assert movements_qty[0].quantity == -1
        
        print("✅ Non-Serialized Sale Passed")

        print("\n=== Test 3: Return (Cancellation) logic ===")
        # We simulate update_device_assignment logic
        # Manually trigger the logic we added
        
        # Cancel assignment 1
        from services.stock_service import create_stock_movement
        
        # Simulate route logic
        assignment.notes = "Cancelled"
        # Restore stock
        inv_serial.add_serial_number('SN123')
        create_stock_movement(
            inventory_id=inv_serial.id,
            movement_type="return",
            quantity=1,
            tenant_id=user.tenant_id,
            serial_number='SN123',
            transaction_id=assignment.id,
            created_by=user.id,
            session=db.session
        )
        db.session.commit()
        
        db.session.refresh(inv_serial)
        print(f"Inventory Restored: {inv_serial.available_inventory}")
        assert inv_serial.available_inventory == 1
        
        movements_final = StockMovement.query.filter_by(inventory_id=inv_serial.id).order_by(StockMovement.created_at.desc()).all()
        assert len(movements_final) == 2
        assert movements_final[0].movement_type == 'return'
        
        print("✅ Return Logic Passed")
        
if __name__ == "__main__":
    try:
        test_stock_flow()
        print("\n🎉 ALL TESTS PASSED")
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
