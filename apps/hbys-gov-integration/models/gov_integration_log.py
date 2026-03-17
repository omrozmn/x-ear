"""
Government Integration Log Model
Tracks all requests/responses to external government health systems.
"""
from sqlalchemy import Column, String, Text, DateTime, Integer

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id, now_utc, format_datetime_utc


class GovIntegrationLog(BaseModel, TenantScopedMixin):
    __tablename__ = "gov_integration_logs"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("gil"))

    # Which government system was called
    system_name = Column(
        String(30), nullable=False, index=True,
        comment="medula | enabiz | skrs | mhrs | its | teleradyoloji"
    )

    # Operation performed
    operation = Column(String(200), nullable=False)

    # Request / response payloads stored as JSON text
    request_data = Column(Text, nullable=True, comment="JSON-serialized request payload")
    response_data = Column(Text, nullable=True, comment="JSON-serialized response payload")

    # Outcome
    status = Column(
        String(20), nullable=False, default="pending", index=True,
        comment="success | error | timeout | pending"
    )
    error_message = Column(Text, nullable=True)

    # Timing
    request_timestamp = Column(DateTime, nullable=False, default=now_utc)
    response_timestamp = Column(DateTime, nullable=True)

    # Retry tracking
    retry_count = Column(Integer, nullable=False, default=0)

    # Correlation ID for tracing across micro-services
    correlation_id = Column(String(64), nullable=True, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "systemName": self.system_name,
            "operation": self.operation,
            "requestData": self.request_data,
            "responseData": self.response_data,
            "status": self.status,
            "errorMessage": self.error_message,
            "requestTimestamp": format_datetime_utc(self.request_timestamp),
            "responseTimestamp": format_datetime_utc(self.response_timestamp),
            "retryCount": self.retry_count,
            "correlationId": self.correlation_id,
            "tenantId": self.tenant_id,
            "createdAt": format_datetime_utc(self.created_at),
            "updatedAt": format_datetime_utc(self.updated_at),
        }
