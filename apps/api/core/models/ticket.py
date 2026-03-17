"""Support Ticket Model"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from enum import Enum

from core.models.base import Base, gen_id


class TicketStatus(str, Enum):
    """Ticket status enum"""
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'
    CLOSED = 'closed'


class TicketPriority(str, Enum):
    """Ticket priority enum"""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    URGENT = 'urgent'


class TicketCategory(str, Enum):
    """Ticket category enum"""
    GENERAL = 'general'
    TECHNICAL = 'technical'
    BILLING = 'billing'
    FEATURE_REQUEST = 'feature_request'


class Ticket(Base):
    """Support Ticket Model
    
    Tracks support tickets from tenants.
    Admin-only feature for customer support.
    """
    __tablename__ = 'tickets'
    
    # Primary key
    id = Column(String(64), primary_key=True, default=lambda: gen_id("ticket"))
    
    # Ticket details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.OPEN.value)
    priority = Column(SQLEnum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM.value)
    category = Column(SQLEnum(TicketCategory), nullable=False, default=TicketCategory.GENERAL.value)
    
    # Tenant context
    tenant_id = Column(String(64), nullable=True, index=True)  # Nullable for system-wide tickets
    
    # Assignment
    assigned_to = Column(String(64), ForeignKey('admin_users.id'), nullable=True)  # Admin user ID
    created_by = Column(String(64), nullable=True)  # User who created the ticket
    
    # SLA tracking
    sla_due_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    assigned_admin = relationship('AdminUser', foreign_keys=[assigned_to], backref='assigned_tickets', lazy='joined')
    responses = relationship('TicketResponse', back_populates='ticket', cascade='all, delete-orphan')
    
    # Indexes
    __table_args__ = (
        Index('ix_tickets_tenant_status', 'tenant_id', 'status'),
        Index('ix_tickets_assigned_to', 'assigned_to'),
        Index('ix_tickets_priority', 'priority'),
        Index('ix_tickets_created_at', 'created_at'),
    )
    
    def calculate_sla_due_date(self):
        """Calculate SLA due date based on priority"""
        if self.priority == TicketPriority.URGENT:
            hours = 4
        elif self.priority == TicketPriority.HIGH:
            hours = 24
        elif self.priority == TicketPriority.MEDIUM:
            hours = 48
        else:  # LOW
            hours = 72
        
        self.sla_due_date = self.created_at + timedelta(hours=hours)
    
    def mark_resolved(self):
        """Mark ticket as resolved"""
        self.status = TicketStatus.RESOLVED
        self.resolved_at = datetime.now(timezone.utc)
    
    def mark_closed(self):
        """Mark ticket as closed"""
        self.status = TicketStatus.CLOSED
        self.closed_at = datetime.now(timezone.utc)


class TicketResponse(Base):
    """Ticket Response Model
    
    Tracks responses/comments on tickets.
    """
    __tablename__ = 'ticket_responses'
    
    # Primary key
    id = Column(String(64), primary_key=True, default=lambda: gen_id("ticket_resp"))
    
    # Foreign keys
    ticket_id = Column(String(64), ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False)
    
    # Response details
    message = Column(Text, nullable=False)
    created_by = Column(String(64), nullable=False)  # Admin user ID or user ID
    is_internal = Column(String(10), nullable=False, default='false')  # Internal note vs customer-visible
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship('Ticket', back_populates='responses')
    
    # Indexes
    __table_args__ = (
        Index('ix_ticket_responses_ticket_id', 'ticket_id'),
        Index('ix_ticket_responses_created_at', 'created_at'),
    )
