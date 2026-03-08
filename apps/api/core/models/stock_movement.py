from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin

class StockMovement(BaseModel, TenantScopedMixin):
    """
    StockMovement model tracks history of all inventory changes.
    """
    __tablename__ = 'stock_movements'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("mvmt"))
    # tenant_id is now inherited from TenantScopedMixin
    inventory_id = Column(String(50), ForeignKey('inventory.id'), nullable=False, index=True)
    transaction_id = Column(String(50), index=True) # ID of Sale, Refund, or other related entity
    
    # sale, return, adjustment, manual, production
    movement_type = Column(String(20), nullable=False, index=True)
    
    quantity = Column(Integer, nullable=False) # Negative for output, Positive for input
    serial_number = Column(String(100)) # For serialized items
    
    created_by = Column(String(50)) # User ID
    
    # Timestamps inherited from BaseModel, but explicit created_at provided for clarity in requirements
    # We will rely on BaseModel's created_at or override if needed. BaseModel usually has it.
    
    # Relationships
    inventory = relationship('InventoryItem', back_populates='movements')

    def to_dict(self):
        base_dict = self.to_dict_base()
        mvmt_dict = {
            'id': self.id,
            'inventoryId': self.inventory_id,
            'tenantId': self.tenant_id,
            'transactionId': self.transaction_id,
            'movementType': self.movement_type,
            'quantity': self.quantity,
            'serialNumber': self.serial_number,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
        mvmt_dict.update(base_dict)
        return mvmt_dict
