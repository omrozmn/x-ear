"""
FastAPI Config Router - Migrated from Flask routes/config.py
Handles public configuration endpoints
"""
from fastapi import APIRouter
import os
import logging

from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Config"])

@router.get("/config")
def get_config():
    """Get public configuration"""
    admin_url = os.getenv('ADMIN_PANEL_URL', '/admin-panel/')
    return ResponseEnvelope(data={'adminPanelUrl': admin_url})
