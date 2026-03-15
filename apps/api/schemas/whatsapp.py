from __future__ import annotations

from typing import List, Optional

from pydantic import Field

from schemas.base import AppBaseModel


class WhatsAppSessionStatus(AppBaseModel):
    status: str
    connected: bool
    qr_code: Optional[str] = Field(default=None, alias="qrCode")
    qr_updated_at: Optional[float] = Field(default=None, alias="qrUpdatedAt")
    last_error: Optional[str] = Field(default=None, alias="lastError")
    last_event_at: Optional[float] = Field(default=None, alias="lastEventAt")
    profile_path: Optional[str] = Field(default=None, alias="profilePath")
    bridge_pid: Optional[int] = Field(default=None, alias="bridgePid")


class WhatsAppConfigRead(AppBaseModel):
    ai_target_phone: Optional[str] = Field(default="", alias="aiTargetPhone")
    default_country_code: Optional[str] = Field(default="90", alias="defaultCountryCode")
    auto_reply_enabled: bool = Field(default=False, alias="autoReplyEnabled")
    auto_reply_prompt: Optional[str] = Field(default="", alias="autoReplyPrompt")


class WhatsAppConfigUpdate(AppBaseModel):
    ai_target_phone: Optional[str] = Field(default="", alias="aiTargetPhone")
    default_country_code: Optional[str] = Field(default="90", alias="defaultCountryCode")
    auto_reply_enabled: bool = Field(default=False, alias="autoReplyEnabled")
    auto_reply_prompt: Optional[str] = Field(default="", alias="autoReplyPrompt")


class WhatsAppSingleSendRequest(AppBaseModel):
    phone_number: str = Field(alias="phoneNumber")
    message: str
    party_id: Optional[str] = Field(default=None, alias="partyId")


class WhatsAppBulkFilter(AppBaseModel):
    status: Optional[str] = None
    segment: Optional[str] = None


class WhatsAppBulkSendRequest(AppBaseModel):
    message: str
    phone_numbers: Optional[List[str]] = Field(default=None, alias="phoneNumbers")
    party_ids: Optional[List[str]] = Field(default=None, alias="partyIds")
    filters: Optional[WhatsAppBulkFilter] = None


class WhatsAppAIRequest(AppBaseModel):
    prompt: str
    phone_number: Optional[str] = Field(default=None, alias="phoneNumber")


class WhatsAppInboxMessage(AppBaseModel):
    id: str
    party_id: Optional[str] = Field(default=None, alias="partyId")
    direction: str
    status: str
    chat_id: str = Field(alias="chatId")
    chat_title: Optional[str] = Field(default=None, alias="chatTitle")
    phone_number: Optional[str] = Field(default=None, alias="phoneNumber")
    message_text: str = Field(alias="messageText")
    external_message_id: Optional[str] = Field(default=None, alias="externalMessageId")
    created_at: Optional[str] = Field(default=None, alias="createdAt")


class WhatsAppSyncResult(AppBaseModel):
    imported: int
    auto_replied: int = Field(alias="autoReplied")


class WhatsAppSendResult(AppBaseModel):
    phone_number: str = Field(alias="phoneNumber")
    status: str
    ok: Optional[bool] = True
    error: Optional[str] = None


class WhatsAppBulkSendResult(AppBaseModel):
    total: int
    sent: int
    failed: int
    results: List[WhatsAppSendResult]
