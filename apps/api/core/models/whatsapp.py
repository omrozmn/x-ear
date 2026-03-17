from sqlalchemy import Column, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin


class WhatsAppMessage(BaseModel, TenantScopedMixin):
    __tablename__ = "whatsapp_messages"

    id = Column(String(50), primary_key=True, default=lambda: gen_id("wam"))
    party_id = Column(String(50), ForeignKey("parties.id"), nullable=True)
    direction = Column(String(10), nullable=False, default="inbound")
    status = Column(String(20), nullable=False, default="received")
    chat_id = Column(String(255), nullable=False)
    chat_title = Column(String(255), nullable=True)
    phone_number = Column(String(32), nullable=True)
    message_text = Column(Text, nullable=False)
    external_message_id = Column(String(255), nullable=True)

    party = relationship("Party", backref="whatsapp_messages", lazy=True)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            "id": self.id,
            "partyId": self.party_id,
            "direction": self.direction,
            "status": self.status,
            "chatId": self.chat_id,
            "chatTitle": self.chat_title,
            "phoneNumber": self.phone_number,
            "messageText": self.message_text,
            "externalMessageId": self.external_message_id,
        })
        return base

    __table_args__ = (
        Index("ix_whatsapp_messages_tenant_chat", "tenant_id", "chat_id"),
        Index("ix_whatsapp_messages_created", "created_at"),
    )
