from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, func
from sqlalchemy.orm import relationship
from .base import db


class CommissionLedger(db.Model):
    __tablename__ = 'commission_ledger'

    id = Column(Integer, primary_key=True, autoincrement=True)
    affiliate_id = Column(Integer, ForeignKey('affiliate_user.id'), nullable=False, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    event = Column(String(64), nullable=False)  # e.g. 'signup', 'payment', 'refund'
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(32), nullable=False, default='pending')  # e.g. 'pending', 'paid', 'cancelled'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    affiliate = relationship('AffiliateUser', backref='commissions')
