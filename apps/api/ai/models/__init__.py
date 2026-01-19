"""
AI Layer Database Models

This module defines the database models for the AI Layer.
All AI data is stored in dedicated tables (AI_Audit_Storage) separate from core business tables.

Models:
- AIRequest: Stores AI requests with encrypted prompts
- AIAction: Stores action plans with risk analysis
- AIAuditLog: Comprehensive audit logging (append-only)
- AIUsage: Usage tracking with atomic increment support

Requirements: 9.1, 9.2, 10.1, 26.2, 29.1
"""

from ai.models.ai_request import AIRequest
from ai.models.ai_action import AIAction, ActionStatus, RiskLevel
from ai.models.ai_audit_log import AIAuditLog, IncidentTag
from ai.models.ai_usage import AIUsage

__all__ = [
    "AIRequest",
    "AIAction",
    "ActionStatus",
    "RiskLevel",
    "AIAuditLog",
    "IncidentTag",
    "AIUsage",
]
