"""
FastAPI Hearing Profile Router - Extracted from party_subresources.py
Handles hearing tests, e-receipts, and SGK documents
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from sqlalchemy.orm import Session
import logging

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.hearing_profiles import HearingTestRead, EReceiptRead, HearingTestCreate, HearingTestUpdate, EReceiptCreate, EReceiptUpdate
from middleware.unified_access import UnifiedAccess, require_access

from services.hearing_profile_service import HearingProfileService

# Use schemas from party_subresources for now to avoid breakage, or move them if strictly required.
# For now, we redefine or import to keep this file self-contained if possible, 
# but sharing is safer. Let's re-declare for cleanliness as per Migration Map plan.

from pydantic import BaseModel

class HearingTestCreate(BaseModel):
    testDate: str
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class HearingTestUpdate(BaseModel):
    testDate: Optional[str] = None
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class EReceiptCreate(BaseModel):
    sgkReportId: Optional[str] = None
    number: Optional[str] = None
    doctorName: Optional[str] = None
    date: Optional[str] = None
    materials: Optional[List[dict]] = None
    status: str = "pending"

class EReceiptUpdate(BaseModel):
    materials: Optional[List[dict]] = None
    status: Optional[str] = None
    doctorName: Optional[str] = None

logger = logging.getLogger(__name__)

router = APIRouter(tags=["HearingProfiles"])

# --- Hearing Tests ---

@router.get("/parties/{party_id}/profiles/hearing/tests", operation_id="listHearingTests")
def list_hearing_tests(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all hearing tests for a party"""
    try:
        service = HearingProfileService(db)
        hearing_tests = service.list_hearing_tests(party_id, access.tenant_id)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        data = [HearingTestRead.model_validate(test) for test in hearing_tests]
        
        return ResponseEnvelope(
            data=data,
            meta={'total': len(data)}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting hearing tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/profiles/hearing/tests", operation_id="createHearingTest", status_code=201)
def create_hearing_test(
    party_id: str,
    request_data: HearingTestCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Add a new hearing test to party"""
    try:
        service = HearingProfileService(db)
        data = request_data.model_dump()
        new_test = service.create_hearing_test(party_id, data, access.tenant_id)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=HearingTestRead.model_validate(new_test))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error adding hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/parties/{party_id}/profiles/hearing/tests/{test_id}", operation_id="updateHearingTest")
def update_hearing_test(
    party_id: str,
    test_id: str,
    request_data: HearingTestUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a hearing test"""
    try:
        service = HearingProfileService(db)
        data = request_data.model_dump(exclude_unset=True)
        updated_test = service.update_hearing_test(party_id, test_id, data, access.tenant_id)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=HearingTestRead.model_validate(updated_test))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}/profiles/hearing/tests/{test_id}", operation_id="deleteHearingTest")
def delete_hearing_test(
    party_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a hearing test"""
    try:
        service = HearingProfileService(db)
        service.delete_hearing_test(party_id, test_id, access.tenant_id)
        return ResponseEnvelope(message='Hearing test deleted successfully')
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- E-Receipts ---

@router.get("/parties/{party_id}/profiles/hearing/ereceipts", operation_id="listHearingEReceipts")
def list_hearing_ereceipts(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all e-receipts for a party"""
    try:
        service = HearingProfileService(db)
        ereceipts = service.list_ereceipts(party_id, access.tenant_id)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        data = [EReceiptRead.model_validate(receipt) for receipt in ereceipts]
        
        return ResponseEnvelope(
            data=data,
            meta={'total': len(data)}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting e-receipts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/profiles/hearing/ereceipts", operation_id="createHearingEReceipt", status_code=201)
def create_hearing_ereceipt(
    party_id: str,
    request_data: EReceiptCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new e-receipt for party"""
    try:
        service = HearingProfileService(db)
        data = request_data.model_dump()
        new_ereceipt = service.create_ereceipt(party_id, data, access.tenant_id)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=EReceiptRead.model_validate(new_ereceipt))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}", operation_id="updateHearingEReceipt")
def update_hearing_ereceipt(
    party_id: str,
    ereceipt_id: str,
    request_data: EReceiptUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update an e-receipt"""
    try:
        service = HearingProfileService(db)
        data = request_data.model_dump(exclude_unset=True)
        updated_receipt = service.update_ereceipt(party_id, ereceipt_id, data, access.tenant_id)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=EReceiptRead.model_validate(updated_receipt))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}", operation_id="deleteHearingEReceipt")
def delete_hearing_ereceipt(
    party_id: str,
    ereceipt_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete an e-receipt"""
    try:
        service = HearingProfileService(db)
        service.delete_ereceipt(party_id, ereceipt_id, access.tenant_id)
        return ResponseEnvelope(message='E-receipt deleted successfully')
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))
