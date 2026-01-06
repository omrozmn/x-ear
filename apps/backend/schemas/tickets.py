"""Support Ticket Schemas"""
from typing import Optional, List
from enum import Enum
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin

class TicketStatus(str, Enum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'
    CLOSED = 'closed'

class TicketPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    URGENT = 'urgent'

class TicketCategory(str, Enum):
    GENERAL = 'general'
    TECHNICAL = 'technical'
    BILLING = 'billing'
    FEATURE_REQUEST = 'feature_request'

class TicketCreate(AppBaseModel):
    title: str
    description: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    category: TicketCategory = TicketCategory.GENERAL
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class TicketUpdate(AppBaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    assigned_to: Optional[str] = Field(None, alias="assignedTo")

class TicketRead(IDMixin, TimestampMixin):
    title: str
    description: Optional[str] = None
    status: TicketStatus = TicketStatus.OPEN
    priority: TicketPriority = TicketPriority.MEDIUM
    category: TicketCategory = TicketCategory.GENERAL
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    tenant_name: Optional[str] = Field(None, alias="tenantName")
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    assigned_admin_name: Optional[str] = Field(None, alias="assignedAdminName")
    sla_due_date: Optional[datetime] = Field(None, alias="slaDueDate")
    created_by: Optional[str] = Field(None, alias="createdBy")

class TicketResponseCreate(AppBaseModel):
    message: str

# Type aliases
SupportTicket = TicketRead
