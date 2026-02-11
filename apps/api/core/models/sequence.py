# Sequence Model for auto-incrementing numbers (invoices, etc.)
from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin

class Sequence(BaseModel, TenantScopedMixin):
    __tablename__ = 'sequences'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("seq"))
    
    # Sequence type (invoice, sale, etc.)
    seq_type = db.Column(db.String(50), nullable=False)
    
    # Year for yearly reset
    year = db.Column(db.Integer, nullable=False)
    
    # Prefix (e.g., "INV", "SALE")
    prefix = db.Column(db.String(20), nullable=False)
    
    # Last used number
    last_number = db.Column(db.Integer, default=0, nullable=False)
    
    # Unique constraint per tenant/type/year/prefix
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'seq_type', 'year', 'prefix', name='uq_sequence_tenant_type_year_prefix'),
    )
    
    def get_next_number(self):
        """Get next number in sequence"""
        self.last_number += 1
        return self.last_number
    
    @staticmethod
    def next_number(db_session, tenant_id: str, seq_type: str, year: int, prefix: str) -> int:
        """
        Get next number for a sequence. Creates sequence if it doesn't exist.
        Thread-safe with database-level locking.
        """
        # Try to get existing sequence with FOR UPDATE lock
        sequence = db_session.query(Sequence).filter(
            Sequence.tenant_id == tenant_id,
            Sequence.seq_type == seq_type,
            Sequence.year == year,
            Sequence.prefix == prefix
        ).with_for_update().first()
        
        if not sequence:
            # Create new sequence starting at 1
            sequence = Sequence(
                tenant_id=tenant_id,
                seq_type=seq_type,
                year=year,
                prefix=prefix,
                last_number=0
            )
            db_session.add(sequence)
            db_session.flush()  # Get ID assigned
        
        # Increment and return
        next_num = sequence.get_next_number()
        db_session.commit()  # Commit to release lock
        return next_num
    
    def to_dict(self):
        return {
            'id': self.id,
            'tenantId': self.tenant_id,
            'seqType': self.seq_type,
            'year': self.year,
            'prefix': self.prefix,
            'lastNumber': self.last_number,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
