from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from core.models.base import BaseModel, gen_id
from core.models.mixins import TenantScopedMixin

class BulkImportBatch(BaseModel, TenantScopedMixin):
    __tablename__ = "bulk_import_batches"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bib"))
    tool_id = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="completed") # 'completed', 'rolled_back', 'failed'
    file_name = Column(String(255), nullable=True)
    
    records = relationship("BulkImportRecord", back_populates="batch", cascade="all, delete-orphan")

class BulkImportRecord(BaseModel, TenantScopedMixin):
    __tablename__ = "bulk_import_records"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bir"))
    batch_id = Column(String(50), ForeignKey("bulk_import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=True) # Optional: table name, e.g. "parties", "inventory"
    is_rolled_back = Column(Boolean, default=False)

    batch = relationship("BulkImportBatch", back_populates="records")
