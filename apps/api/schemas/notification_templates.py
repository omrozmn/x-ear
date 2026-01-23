"""
Notification Template Schemas
"""
from typing import Optional, List
from pydantic import Field, ConfigDict, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin


class EmailTemplateRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading NotificationTemplate"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    name: str
    description: Optional[str] = None
    title_template: Optional[str] = Field(None, alias="titleTemplate")
    body_template: Optional[str] = Field(None, alias="bodyTemplate")
    channel: str = "push"
    variables: Optional[List[str]] = []
    is_active: bool = Field(True, alias="isActive")
    
    # Email fields
    email_from_name: Optional[str] = Field(None, alias="emailFromName")
    email_from_address: Optional[str] = Field(None, alias="emailFromAddress")
    email_to_type: Optional[str] = Field(None, alias="emailToType")
    email_to_addresses: Optional[str] = Field(None, alias="emailToAddresses")
    email_subject: Optional[str] = Field(None, alias="emailSubject")
    email_body_html: Optional[str] = Field(None, alias="emailBodyHtml")
    email_body_text: Optional[str] = Field(None, alias="emailBodyText")
    
    # Trigger fields
    trigger_event: Optional[str] = Field(None, alias="triggerEvent")
    trigger_conditions: Optional[str] = Field(None, alias="triggerConditions")
    template_category: Optional[str] = Field(None, alias="templateCategory")

    @field_validator('variables', mode='before')
    @classmethod
    def split_variables(cls, v):
        if isinstance(v, str):
            return v.split(',') if v else []
        return v
