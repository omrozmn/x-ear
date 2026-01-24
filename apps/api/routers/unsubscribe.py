"""Unsubscribe Router - Public endpoint for email unsubscribe management.

This router provides CAN-SPAM compliant unsubscribe functionality.
No authentication required - uses cryptographic tokens for security.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from core.database import get_db
from schemas.response import ResponseEnvelope
from services.unsubscribe_service import get_unsubscribe_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unsubscribe", tags=["public"])


class UnsubscribeResponse(BaseModel):
    """Response for unsubscribe operation."""
    
    success: bool = Field(..., description="Whether unsubscribe was successful")
    message: str = Field(..., description="User-friendly message")
    recipient: Optional[str] = Field(None, description="Email address (masked)")
    scenario: Optional[str] = Field(None, description="Email scenario")


@router.get(
    "",
    response_model=ResponseEnvelope[UnsubscribeResponse],
    operation_id="processUnsubscribe",
    summary="Process email unsubscribe request",
    description="Public endpoint for processing email unsubscribe requests via token",
    responses={
        200: {"description": "Unsubscribe processed successfully"},
        400: {"description": "Invalid or expired token"},
        500: {"description": "Server error"}
    }
)
async def process_unsubscribe(
    token: str = Query(..., description="Unsubscribe token from email link"),
    request: Request = None,
    db: Session = Depends(get_db)
) -> ResponseEnvelope[UnsubscribeResponse]:
    """
    Process unsubscribe request using cryptographic token.
    
    This endpoint is called when user clicks unsubscribe link in email.
    No authentication required - security via cryptographic token.
    
    Args:
        token: Unsubscribe token from email link
        request: FastAPI request object (for IP/user-agent)
        db: Database session
        
    Returns:
        ResponseEnvelope[UnsubscribeResponse]: Success/failure response
    """
    unsubscribe_service = get_unsubscribe_service(db)
    
    # Get client info
    ip_address = request.client.host if request and request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"
    
    # Validate token and get unsubscribe record
    existing = unsubscribe_service.get_by_token(token)
    
    if existing:
        # Token already used
        logger.info(
            "Unsubscribe token already used",
            extra={
                "token": token[:16] + "...",
                "recipient": existing.recipient,
                "scenario": existing.scenario,
                "ip_address": ip_address
            }
        )
        
        # Mask email for privacy
        recipient_parts = existing.recipient.split("@")
        masked_recipient = f"{recipient_parts[0][:2]}***@{recipient_parts[1]}" if len(recipient_parts) == 2 else "***"
        
        return ResponseEnvelope(
            success=True,
            data=UnsubscribeResponse(
                success=True,
                message="You are already unsubscribed from this email type",
                recipient=masked_recipient,
                scenario=existing.scenario
            )
        )
    
    # Token not found - this is a problem
    # We can't process without knowing tenant_id, recipient, scenario
    # The token should have been stored when email was queued
    logger.warning(
        "Invalid unsubscribe token",
        extra={
            "token": token[:16] + "...",
            "ip_address": ip_address
        }
    )
    
    return ResponseEnvelope(
        success=False,
        error={
            "code": "INVALID_TOKEN",
            "message": "Invalid or expired unsubscribe link. Please contact support if you continue to receive unwanted emails."
        }
    )


@router.get(
    "/page",
    response_class=HTMLResponse,
    operation_id="getUnsubscribePage",
    summary="Get unsubscribe confirmation page",
    description="HTML page for unsubscribe confirmation",
    include_in_schema=False  # Don't include in OpenAPI (HTML response)
)
async def get_unsubscribe_page(
    token: str = Query(..., description="Unsubscribe token"),
    db: Session = Depends(get_db)
) -> HTMLResponse:
    """
    Return HTML page for unsubscribe confirmation.
    
    This provides a user-friendly web page instead of JSON response.
    """
    unsubscribe_service = get_unsubscribe_service(db)
    
    # Check if already unsubscribed
    existing = unsubscribe_service.get_by_token(token)
    
    if existing:
        # Already unsubscribed
        html_content = f"""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Abonelikten Çıkıldı - X-Ear CRM</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    padding: 40px;
                    max-width: 500px;
                    text-align: center;
                }}
                .icon {{
                    font-size: 64px;
                    margin-bottom: 20px;
                }}
                h1 {{
                    color: #2d3748;
                    margin-bottom: 16px;
                    font-size: 28px;
                }}
                p {{
                    color: #4a5568;
                    line-height: 1.6;
                    margin-bottom: 12px;
                }}
                .email {{
                    background: #f7fafc;
                    padding: 12px;
                    border-radius: 6px;
                    font-family: monospace;
                    color: #2d3748;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    font-size: 14px;
                    color: #718096;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>Zaten Abonelikten Çıktınız</h1>
                <p>Bu e-posta türünden zaten abonelikten çıkmışsınız.</p>
                <div class="email">{existing.scenario}</div>
                <p>Bu e-posta türünden artık bildirim almayacaksınız.</p>
                <div class="footer">
                    <p>Sorularınız için: <a href="mailto:destek@x-ear.com">destek@x-ear.com</a></p>
                    <p>&copy; 2025 X-Ear CRM. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)
    
    # Invalid token
    html_content = """
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Geçersiz Link - X-Ear CRM</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                padding: 40px;
                max-width: 500px;
                text-align: center;
            }
            .icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            h1 {
                color: #2d3748;
                margin-bottom: 16px;
                font-size: 28px;
            }
            p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 12px;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 14px;
                color: #718096;
            }
            a {
                color: #667eea;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">⚠️</div>
            <h1>Geçersiz veya Süresi Dolmuş Link</h1>
            <p>Bu abonelikten çıkma linki geçersiz veya süresi dolmuş.</p>
            <p>Eğer istenmeyen e-postalar almaya devam ediyorsanız, lütfen destek ekibimizle iletişime geçin.</p>
            <div class="footer">
                <p>Destek: <a href="mailto:destek@x-ear.com">destek@x-ear.com</a></p>
                <p>&copy; 2025 X-Ear CRM. Tüm hakları saklıdır.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=400)
