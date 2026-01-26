from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
import uuid
import json

from core.models.party import Party
from models.medical import HearingTest, EReceipt
from schemas.base import ApiError

def now_utc():
    return datetime.now(timezone.utc)

class HearingProfileService:
    def __init__(self, db: Session):
        self.db = db

    def _get_patient_check_tenant(self, party_id: str, tenant_id: str) -> Party:
        patient = self.db.get(Party, party_id)
        if not patient:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
            )
        if patient.tenant_id != tenant_id:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Access denied", code="ACCESS_DENIED").model_dump(mode="json"),
            )
        return patient

    # --- Hearing Tests ---

    def list_hearing_tests(self, party_id: str, tenant_id: str) -> List[HearingTest]:
        self._get_patient_check_tenant(party_id, tenant_id)
        # Assuming relationship exists, or query directly
        # Using query directly to be safer if relationship isn't eager loaded or if we want specific ordering
        return self.db.query(HearingTest).filter_by(party_id=party_id, tenant_id=tenant_id).all()

    def create_hearing_test(self, party_id: str, data: Dict[str, Any], tenant_id: str) -> HearingTest:
        patient = self._get_patient_check_tenant(party_id, tenant_id)
        
        results_json = None
        if data.get('audiogramData'):
             results_json = json.dumps(data['audiogramData'])
        elif data.get('results'): # Handle pre-jsonified or direct dict
             results_json = json.dumps(data['results']) if isinstance(data['results'], dict) else data['results']

        new_test = HearingTest(
            id=str(uuid.uuid4()),
            party_id=party_id,
            tenant_id=tenant_id,
            test_date=datetime.fromisoformat(data['testDate']) if isinstance(data['testDate'], str) else data['testDate'],
            conducted_by=data.get('audiologist') or data.get('conductedBy'),
            results=results_json
        )
        self.db.add(new_test)
        
        # Log activity
        try:
            from models.user import ActivityLog
            log = ActivityLog(
                user_id='system',
                action='hearing_test_created',
                entity_type='patient',
                entity_id=party_id,
                tenant_id=tenant_id,
                details=json.dumps({
                    'title': 'Hearing Test Added',
                    'description': f"New {new_test.test_type} record.",
                    'conductedBy': new_test.conducted_by
                })
            )
            self.db.add(log)
        except Exception:
            pass # Non-critical failure

        try:
            self.db.commit()
            self.db.refresh(new_test)
            return new_test
        except Exception as e:
            self.db.rollback()
            raise e

    def update_hearing_test(self, party_id: str, test_id: str, data: Dict[str, Any], tenant_id: str) -> HearingTest:
        test = self.db.query(HearingTest).filter_by(id=test_id, party_id=party_id, tenant_id=tenant_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Hearing test not found")
            
        if 'testDate' in data and data['testDate']:
            test.test_date = datetime.fromisoformat(data['testDate']) if isinstance(data['testDate'], str) else data['testDate']
            
        if 'audiologist' in data:
            test.conducted_by = data['audiologist']
        elif 'conductedBy' in data:
            test.conducted_by = data['conductedBy']
            
        if 'audiogramData' in data:
            test.results = json.dumps(data['audiogramData'])
        elif 'results' in data:
            test.results = json.dumps(data['results']) if isinstance(data['results'], dict) else data['results']
            
        try:
            self.db.commit()
            self.db.refresh(test)
            return test
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_hearing_test(self, party_id: str, test_id: str, tenant_id: str) -> None:
        test = self.db.query(HearingTest).filter_by(id=test_id, party_id=party_id, tenant_id=tenant_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Hearing test not found")
        
        try:
            self.db.delete(test)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    # --- SGK Info ---

    # --- Hearing Profile & SGK Info (Remediation 5.2) ---

    def _get_or_create_hearing_profile(self, party_id: str, tenant_id: str) -> "HearingProfile":
        from core.models.hearing_profile import HearingProfile
        
        # Check if profile exists
        profile = self.db.query(HearingProfile).filter_by(party_id=party_id).first()
        
        if not profile:
            # Create new profile
            profile = HearingProfile(
                party_id=party_id,
                tenant_id=tenant_id
            )
            self.db.add(profile)
            self.db.commit() # Commit to generate ID and persist
            self.db.refresh(profile)
            
        return profile

    def get_by_party_id(self, party_id: str, tenant_id: str) -> Optional["HearingProfile"]:
        """Get HearingProfile by party_id with tenant isolation"""
        from core.models.hearing_profile import HearingProfile
        
        profile = self.db.query(HearingProfile).filter_by(
            party_id=party_id,
            tenant_id=tenant_id
        ).first()
        
        return profile

    def get_sgk_info(self, party_id: str, tenant_id: str) -> Dict[str, Any]:
        """
        Get SGK Info. 
        Strategy: Read HearingProfile first. Fallback to Party.sgk_info_json if profile empty.
        """
        from core.models.hearing_profile import HearingProfile
        
        # 1. Try HearingProfile
        profile = self.db.query(HearingProfile).filter_by(party_id=party_id).first()
        if profile and profile.sgk_info_json:
            return profile.sgk_info_json
            
        # 2. Fallback to Party (Legacy read)
        patient = self._get_patient_check_tenant(party_id, tenant_id)
        return patient.sgk_info_json or {}

    def update_sgk_info(self, party_id: str, info: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        """
        Update SGK Info.
        Strategy: Strict Cutover - Write ONLY to HearingProfile.
        """
        # Ensure access check via party first
        self._get_patient_check_tenant(party_id, tenant_id)
        
        profile = self._get_or_create_hearing_profile(party_id, tenant_id)
        current_info = profile.sgk_info_json or {}
        current_info.update(info)
        profile.sgk_info_json = current_info
        
        try:
            self.db.commit()
            return profile.sgk_info_json
        except Exception as e:
            self.db.rollback()
            raise e
            
    # --- E-Receipts ---

    def list_ereceipts(self, party_id: str, tenant_id: str) -> List[EReceipt]:
        self._get_patient_check_tenant(party_id, tenant_id)
        return self.db.query(EReceipt).filter_by(party_id=party_id, tenant_id=tenant_id).all()

    def create_ereceipt(self, party_id: str, data: Dict[str, Any], tenant_id: str) -> EReceipt:
        patient = self._get_patient_check_tenant(party_id, tenant_id)
        
        materials_json = "[]"
        if data.get('materials'):
             materials_json = json.dumps(data['materials'])

        # Handle receipt data vs number key mismatch from recent fixes
        receipt_number = data.get('number') or data.get('receiptNumber')
        
        receipt_date = now_utc()
        if data.get('date'):
             receipt_date = datetime.fromisoformat(data['date'])
        elif data.get('receiptDate'):
             receipt_date = datetime.fromisoformat(data['receiptDate'])
             
        new_receipt = EReceipt(
             id=str(uuid.uuid4()),
             party_id=party_id,
             tenant_id=tenant_id,
             receipt_number=receipt_number,
             doctor_name=data.get('doctorName'),
             receipt_date=receipt_date,
             materials=materials_json,
             status=data.get('status', 'pending')
        )
        self.db.add(new_receipt)
        
        try:
            self.db.commit()
            self.db.refresh(new_receipt)
            return new_receipt
        except Exception as e:
            self.db.rollback()
            raise e

    def update_ereceipt(self, party_id: str, receipt_id: str, data: Dict[str, Any], tenant_id: str) -> EReceipt:
        receipt = self.db.query(EReceipt).filter_by(id=receipt_id, party_id=party_id, tenant_id=tenant_id).first()
        if not receipt:
             raise HTTPException(status_code=404, detail="E-receipt not found")

        if 'materials' in data:
             receipt.materials = json.dumps(data['materials'])
        
        if 'status' in data:
             receipt.status = data['status']
             
        if 'doctorName' in data:
             receipt.doctor_name = data['doctorName']

        try:
            self.db.commit()
            self.db.refresh(receipt)
            return receipt
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_ereceipt(self, party_id: str, receipt_id: str, tenant_id: str) -> None:
        receipt = self.db.query(EReceipt).filter_by(id=receipt_id, party_id=party_id, tenant_id=tenant_id).first()
        if not receipt:
             raise HTTPException(status_code=404, detail="E-receipt not found")
             
        try:
             self.db.delete(receipt)
             self.db.commit()
        except Exception as e:
             self.db.rollback()
             raise e
