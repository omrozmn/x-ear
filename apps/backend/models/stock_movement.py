from datetime import datetime, timezone
from .base import db, BaseModel, gen_id

class StockMovement(BaseModel):
    """
    StockMovement model tracks history of all inventory changes.
    """
    __tablename__ = 'stock_movements'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("mvmt"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    inventory_id = db.Column(db.String(50), db.ForeignKey('inventory.id'), nullable=False, index=True)
    transaction_id = db.Column(db.String(50), index=True) # ID of Sale, Refund, or other related entity
    
    # sale, return, adjustment, manual, production
    movement_type = db.Column(db.String(20), nullable=False, index=True)
    
    quantity = db.Column(db.Integer, nullable=False) # Negative for output, Positive for input
    serial_number = db.Column(db.String(100)) # For serialized items
    
    created_by = db.Column(db.String(50)) # User ID
    
    # Timestamps inherited from BaseModel, but explicit created_at provided for clarity in requirements
    # We will rely on BaseModel's created_at or override if needed. BaseModel usually has it.
    
    # Relationships
    inventory = db.relationship('Inventory', back_populates='movements')

    def to_dict(self):
        base_dict = self.to_dict_base()
        mvmt_dict = {
            'id': self.id,
            'inventoryId': self.inventory_id,
            'transactionId': self.transaction_id,
            'movementType': self.movement_type,
            'quantity': self.quantity,
            'serialNumber': self.serial_number,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
        mvmt_dict.update(base_dict)
        return mvmt_dict
