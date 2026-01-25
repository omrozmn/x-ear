import pytest
import uuid
from datetime import datetime
import json

from core.models.user import User
from core.models.inventory import InventoryItem
from core.models.sales import Sale, DeviceAssignment
from core.models.stock_movement import StockMovement
from core.models.base import db
from routers.sales import _create_single_device_assignment

def test_stock_flow(db_session):
    # Setup Tenant and User
    suffix = str(uuid.uuid4())[:8]
    tenant_id = f"tenant_{suffix}"
    user = User(id=f"u_{suffix}", username=f"tester_{suffix}", email=f"test_{suffix}@x.com", tenant_id=tenant_id, is_active=True)
    user.set_password("testpass123")
    db_session.add(user)
    db_session.commit()
    
    # Create Inventory Item (Serialized)
    inv_serial = InventoryItem(
        id=f"inv_s_{suffix}",
        name="Test Aid Serialized",
        category="hearing_aid",
        tenant_id=tenant_id,
        available_inventory=1,
        available_serials=json.dumps(["SN123"]),
        price=1000.0,
        brand="TestBrand"
    )
    db_session.add(inv_serial)
    
    # Create Inventory Item (Non-Serialized)
    inv_qty = InventoryItem(
        id=f"inv_q_{suffix}",
        name="Test Battery",
        category="battery",
        tenant_id=tenant_id,
        available_inventory=10,
        price=10.0,
        brand="TestBrand"
    )
    db_session.add(inv_qty)
    db_session.commit()
    
    # Sale of Serialized Item
    sale = Sale(id=f"sale_{suffix}", tenant_id=tenant_id, patient_id="p1", total_amount=1000, final_amount=1000, sale_date=datetime.utcnow())
    db_session.add(sale)
    db_session.commit()
    
    assignment_data = {
        'inventoryId': inv_serial.id,
        'serial_number': 'SN123',
        'ear': 'Right'
    }
    
    # Call internal logic
    assignment, err = _create_single_device_assignment(
        assignment_data, 
        patient_id="p1", 
        sale_id=sale.id, 
        sgk_scheme="standard", 
        pricing_calculation={}, 
        tenant_id=tenant_id,
        created_by=user.id,
        session=db_session
    )
    
    assert err is None, f"Assignment failed: {err}"
    db_session.commit()
    
    # Reload inventory
    db_session.refresh(inv_serial)
    assert inv_serial.available_inventory == 0
    
    # Check Movement
    movements = db_session.query(StockMovement).filter_by(inventory_id=inv_serial.id).all()
    assert len(movements) == 1
    assert movements[0].movement_type == 'sale'
    assert movements[0].quantity == -1
