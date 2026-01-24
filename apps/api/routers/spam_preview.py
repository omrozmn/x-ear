"""Spam Score Preview Router for Admin Panel.

Provides API endpoints for previewing spam scores before sending emails.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from core.database import get_db
from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas import ResponseEnvelope
from services.spam_filter_service import get_spam_filter_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/spam-preview", tags=["admin"])


class SpamPreviewRequest(BaseModel):
    """Request for spam score preview."""
    
    subject: str = Field(..., description="Email subject")
    body_text: str = Field(..., description="Email body (plain text)")
    body_html: Optional[str] = Field(None, description="Email body (HTML)")


class SpamWarning(BaseModel):
    """Spam warning detail."""
    
    category: str = Field(..., description="Warning category")
    message: str = Field(..., description="Warning message")
    severity: str = Field(..., description="Severity level (low/medium/high)")


class SpamPreviewResponse(BaseModel):
    """Response for spam score preview."""
    
    spam_score: float = Field(..., description="Spam score (0-20+)")
    risk_level: str = Field(..., description="Risk level (LOW/MEDIUM/HIGH/CRITICAL)")
    will_be_rejected: bool = Field(..., description="Whether email will be rejected")
    warnings: list[SpamWarning] = Field(..., description="List of warnings")
    recommendations: list[str] = Field(..., description="Recommendations to improve score")


@router.post(
    "",
    response_model=ResponseEnvelope[SpamPreviewResponse],
    operation_id="previewSpamScore",
    summary="Preview spam score",
    description="Analyze email content and preview spam score before sending"
)
async def preview_spam_score(
    request: SpamPreviewRequest = Body(...),
    access: UnifiedAccess = Depends(require_access("admin.emails.send")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[SpamPreviewResponse]:
    """
    Preview spam score for email content.
    
    This endpoint allows admins to test email content before sending
    to ensure it won't be flagged as spam.
    
    Returns:
    - Spam score (0-20+)
    - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
    - Whether email will be rejected
    - Detailed warnings
    - Recommendations to improve score
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_spam_filter_service()
    
    # Analyze content
    result = service.analyze_content(
        subject=request.subject,
        body_text=request.body_text,
        body_html=request.body_html
    )
    
    # Format warnings
    warnings = []
    for warning in result["warnings"]:
        # Determine severity based on warning type
        severity = "low"
        if "SPAM" in warning.upper() or "BLOCK" in warning.upper():
            severity = "high"
        elif "CAUTION" in warning.upper() or "MANY" in warning.upper():
            severity = "medium"
        
        # Categorize warning
        category = "content"
        if "CAPS" in warning.upper():
            category = "formatting"
        elif "LINK" in warning.upper() or "HTML" in warning.upper():
            category = "structure"
        elif "KEYWORD" in warning.upper():
            category = "keywords"
        
        warnings.append(SpamWarning(
            category=category,
            message=warning,
            severity=severity
        ))
    
    # Generate recommendations
    recommendations = []
    
    if result["spam_score"] >= 10:
        recommendations.append("Spam score is too high. Email will be rejected.")
    
    if result["spam_score"] >= 5:
        recommendations.append("Consider rewriting content to reduce spam indicators.")
    
    # Check for specific issues
    if any("SPAM keyword" in w for w in result["warnings"]):
        recommendations.append("Remove or rephrase spam trigger words (free, urgent, winner, etc.).")
    
    if any("ALL CAPS" in w for w in result["warnings"]):
        recommendations.append("Reduce use of ALL CAPS text. Use normal capitalization.")
    
    if any("punctuation" in w for w in result["warnings"]):
        recommendations.append("Reduce excessive punctuation (!!!, ???, etc.).")
    
    if any("HTML/text ratio" in w for w in result["warnings"]):
        recommendations.append("Add more text content or reduce HTML markup.")
    
    if any("link density" in w for w in result["warnings"]):
        recommendations.append("Reduce number of links in email body.")
    
    if result["spam_score"] < 5:
        recommendations.append("Spam score looks good! Email should deliver successfully.")
    
    return ResponseEnvelope(
        success=True,
        data=SpamPreviewResponse(
            spam_score=result["spam_score"],
            risk_level=result["risk_level"],
            will_be_rejected=result["spam_score"] >= 10,
            warnings=warnings,
            recommendations=recommendations
        )
    )
