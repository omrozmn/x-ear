from models.base import db
from models.stock_movement import StockMovement
from models.inventory import InventoryItem
from datetime import datetime

def create_stock_movement(
    inventory_id,
    movement_type,
    quantity,
    tenant_id,
    serial_number=None,
    transaction_id=None,
    created_by=None,
    session=None
):
    """
    Create a stock movement record.
    
    Args:
        inventory_id (str): ID of the inventory item
        movement_type (str): Type of movement (sale, return, adjustment, manual)
        quantity (int): Quantity change (negative for output, positive for input)
        tenant_id (str): Tenant ID (mandatory via parent scope)
        serial_number (str, optional): Serial number for serialized items
        transaction_id (str, optional): Related transaction ID
        created_by (str, optional): User ID who initiated the movement
        session (Session, optional): SQLAlchemy session to use
    
    Returns:
        StockMovement: Created stock movement record
    """
    if session is None:
        session = db.session
        
    movement = StockMovement(
        inventory_id=inventory_id,
        tenant_id=tenant_id,
        transaction_id=transaction_id,
        movement_type=movement_type,
        quantity=quantity,
        serial_number=serial_number,
        created_by=created_by,
        created_at=datetime.now()
    )
    
    session.add(movement)
    return movement
