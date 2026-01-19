from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from schemas.sms import (
    SmsPackageRead, SmsPackageCreate, SmsPackageUpdate,
    SmsHeaderRequestRead, SmsHeaderRequestCreate,
    SmsProviderConfigRead, SmsProviderConfigUpdate,
    TenantSmsCreditRead, TargetAudienceRead, TargetAudienceCreate
)
from schemas.base import ResponseEnvelope, EmptyResponse
from schemas.base import ApiError
from models.sms_package import SmsPackage
from models.sms_integration import (
    SMSProviderConfig, SMSHeaderRequest, TenantSMSCredit, TargetAudience
)

from models.user import User
from models.notification import Notification
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

router = APIRouter(tags=["SMS"])

# --- Admin Routes removed (consolidated in sms_packages.py) ---

# Admin routes migrated to sms_packages.py

# --- Tenant Routes removed (handled in sms_integration.py) ---

