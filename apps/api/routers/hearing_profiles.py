"""
Hearing Profile Router

Endpoints for managing hearing profiles (SGK info, audiogram data, etc.)
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from middleware.unified_access import require_access, UnifiedAccess
from services.hearing_profile_service import HearingProfileService
from schemas.parties import HearingProfileRead
from schemas.base import ResponseEnvelope

router = APIRouter(prefix="/hearing-profiles", tags=["hearing-profiles"])


class HearingProfileCreate(BaseModel):
    """Schema for creating a hearing profile"""
    party_id: str = Field(..., alias="partyId")
    sgk_info: Dict[str, Any] = Field(default_factory=dict, alias="sgkInfo")


class HearingProfileUpdate(BaseModel):
    """Schema for updating a hearing profile"""
    sgk_info: Dict[str, Any] = Field(..., alias="sgkInfo")


@router.post(
    "",
    response_model=ResponseEnvelope[HearingProfileRead],
    status_code=201,
    operation_id="createHearingProfile"
)
def create_hearing_profile(
    data: HearingProfileCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.edit"))
):
    """
    Create or update a hearing profile for a party
    
    **Permission**: parties.edit
    """
    service = HearingProfileService(db)
    
    # Update SGK info (creates profile if doesn't exist)
    service.update_sgk_info(
        party_id=data.party_id,
        info=data.sgk_info,
        tenant_id=access.tenant_id
    )
    
    # Get the profile
    profile = service.get_by_party_id(data.party_id, access.tenant_id)
    
    if not profile:
        raise HTTPException(status_code=500, detail="Failed to create hearing profile")
    
    return ResponseEnvelope(
        success=True,
        data=HearingProfileRead.model_validate(profile, from_attributes=True)
    )


@router.get(
    "/{party_id}",
    response_model=ResponseEnvelope[HearingProfileRead],
    operation_id="getHearingProfile"
)
def get_hearing_profile(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.view"))
):
    """
    Get hearing profile for a party
    
    **Permission**: parties.view
    """
    service = HearingProfileService(db)
    
    profile = service.get_by_party_id(party_id, access.tenant_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Hearing profile not found")
    
    return ResponseEnvelope(
        success=True,
        data=HearingProfileRead.model_validate(profile, from_attributes=True)
    )


@router.put(
    "/{party_id}",
    response_model=ResponseEnvelope[HearingProfileRead],
    operation_id="updateHearingProfile"
)
def update_hearing_profile(
    party_id: str,
    data: HearingProfileUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.edit"))
):
    """
    Update hearing profile SGK info
    
    **Permission**: parties.edit
    """
    service = HearingProfileService(db)
    
    # Update SGK info
    service.update_sgk_info(
        party_id=party_id,
        info=data.sgk_info,
        tenant_id=access.tenant_id
    )
    
    # Get updated profile
    profile = service.get_by_party_id(party_id, access.tenant_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Hearing profile not found")
    
    return ResponseEnvelope(
        success=True,
        data=HearingProfileRead.model_validate(profile, from_attributes=True)
    )
