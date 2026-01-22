from .base import db, BaseModel
from sqlalchemy import Column, String, Integer, UniqueConstraint

class Sequence(BaseModel):
    """
    Manages sequential numbering for documents (Invoices, etc.)
    Ensures gapless sequences per tenant/year/type.
    """
    __tablename__ = 'sequences'

    tenant_id = Column(String(36), nullable=False, index=True)
    seq_type = Column(String(50), nullable=False)  # e.g., 'invoice', 'order'
    year = Column(Integer, nullable=False)
    prefix = Column(String(10), nullable=True)     # e.g. 'INV'
    last_number = Column(Integer, default=0, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'seq_type', 'year', 'prefix', name='uq_sequence_tenant_type_year'),
    )

    @classmethod
    def next_number(cls, db_session, tenant_id, seq_type, year, prefix=None):
        """
        Atomically increments and returns the next number.
        Uses row locking (with_for_update) to prevent race conditions.
        """
        seq = db_session.query(cls).filter_by(
            tenant_id=tenant_id,
            seq_type=seq_type,
            year=year,
            prefix=prefix
        ).with_for_update().first()

        if not seq:
            seq = cls(
                tenant_id=tenant_id,
                seq_type=seq_type,
                year=year,
                prefix=prefix,
                last_number=0
            )
            db_session.add(seq)
            # Flush to ensure row exists for locking in subsequent calls if we were in a loop,
            # but here we just added it. Commit/Flush will happen by caller.
        
        seq.last_number += 1
        return seq.last_number
