from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, time, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException

from core.models.party import Party
from models.branch import Branch
from models.enums import PatientStatus as ModelPatientStatus
from models.medical import PatientNote
from models.sales import DeviceAssignment, Sale, PaymentRecord
from models.inventory import InventoryItem
from models.device import Device
from models.user import ActivityLog
from schemas.base import ApiError
import uuid

class PartyService:
    def __init__(self, db: Session):
        self.db = db

    def get_party(self, party_id: str, tenant_id: str) -> Party:
        """
        Get a specific party (patient) by ID, ensuring tenant isolation.
        """
        party = self.db.get(Party, party_id)
        if not party:
            # Using standardized ApiError structure for exceptions
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
            )
        
        if party.tenant_id != tenant_id:
            # Hide cross-tenant existence
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
            )
            
        return party

    def list_parties(
        self, 
        tenant_id: str, 
        page: int = 1, 
        per_page: int = 20, 
        search: Optional[str] = None, 
        status: Optional[str] = None,
        city: Optional[str] = None,
        district: Optional[str] = None,
        cursor: Optional[str] = None,
        branch_ids: Optional[List[str]] = None
    ) -> Tuple[List[Party], int, Optional[str]]:
        """
        List parties with filtering and pagination.
        Returns (items, total_count, next_cursor)
        """
        query = self.db.query(Party).options(joinedload(Party.branch))
        
        # Tenant Scope
        query = query.filter_by(tenant_id=tenant_id)
        
        # Branch Filtering
        if branch_ids:
            query = query.filter(Party.branch_id.in_(branch_ids))
            
        # Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Party.first_name.ilike(search_term),
                    Party.last_name.ilike(search_term),
                    Party.phone.ilike(search_term),
                    Party.email.ilike(search_term),
                    Party.tc_number.ilike(search_term)
                )
            )
            
        # Attribute Filters
        if status:
            # Try to convert status to enum if possible
            try:
                status_enum = ModelPatientStatus.from_legacy(status)
                query = query.filter(Party.status == status_enum.value)
            except (ValueError, AttributeError):
                query = query.filter(Party.status == status)
                
        if city:
            query = query.filter(Party.address_city == city)
        if district:
            query = query.filter(Party.address_district == district)
            
        # Cursor Logic
        import base64
        if cursor:
            try:
                cursor_id = base64.b64decode(cursor.encode()).decode()
                query = query.filter(Party.id > cursor_id)
            except Exception:
                pass
                
        # Count total (if not using cursor, or just for metadata)
        # Note: Optimization - if using cursor, total might be skipped or cached, 
        # but existing router logic calculates it.
        total = query.count() if not cursor else 0
        
        # Pagination
        query = query.order_by(Party.id)
        limit = min(per_page, 200)
        items = query.limit(limit + 1).all()
        
        has_next = len(items) > limit
        if has_next:
            items = items[:-1]
            
        next_cursor = None
        if has_next and items:
            next_cursor = base64.b64encode(str(items[-1].id).encode()).decode()
            
        return items, total, next_cursor

    def iter_parties(
        self,
        tenant_id: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
        segment: Optional[str] = None,
        branch_ids: Optional[List[str]] = None
    ):
        """
        Yield all matching parties for export.
        """
        query = self.db.query(Party).options(joinedload(Party.branch))
        query = query.filter_by(tenant_id=tenant_id)
        
        # Branch Scope
        if branch_ids:
            query = query.filter(Party.branch_id.in_(branch_ids))
        elif branch_ids is not None and len(branch_ids) == 0:
             # Restricted but empty branch list
             from sqlalchemy import text
             query = query.filter(text("1=0"))

        # Status
        if status:
             query = query.filter(Party.status == status) # Export uses string status usually, or check enum
        
        # Segment
        if segment:
             query = query.filter(Party.segment == segment)
             
        # Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Party.first_name.ilike(search_term),
                    Party.last_name.ilike(search_term),
                    Party.phone.ilike(search_term),
                    Party.email.ilike(search_term),
                    Party.tc_number.ilike(search_term)
                )
            )
            
        query = query.order_by(Party.created_at.desc())
        
        # Stream results in chunks
        # Implementation note: SQLite cursors might load all, but SQLAlchemy yield_per can help
    def iter_parties(self, tenant_id: str):
        """Iterator for large exports"""
        query = self.db.query(Party).filter_by(tenant_id=tenant_id).execution_options(yield_per=100)
        for party in query:
            yield party

    def count_parties(self, tenant_id: str, status: str = None, segment: str = None) -> int:
        query = self.db.query(Party).filter_by(tenant_id=tenant_id)
        if status:
            query = query.filter(Party.status == status)
        if segment:
            query = query.filter(Party.segment == segment)
        return query.count()

    # --- Role Management (Remediation 5.1) ---

    def assign_role(self, party_id: str, role_code: str, tenant_id: str) -> None:
        """Assign a role to a party"""
        from core.models.party_role import PartyRole
        party = self.get_party(party_id, tenant_id)
        
        # Check if already assigned
        existing = self.db.query(PartyRole).filter_by(
            party_id=party_id,
            role_code=role_code
        ).first()
        
        if not existing:
            new_role = PartyRole(
                party_id=party_id,
                role_code=role_code,
                tenant_id=tenant_id
            )
            self.db.add(new_role)
            self.db.commit()

    def remove_role(self, party_id: str, role_code: str, tenant_id: str) -> None:
        """Remove a role from a party"""
        from core.models.party_role import PartyRole
        party = self.get_party(party_id, tenant_id)
        
        role = self.db.query(PartyRole).filter_by(
            party_id=party_id,
            role_code=role_code
        ).first()
        
        if role:
            self.db.delete(role)
            self.db.commit()

    def list_roles(self, party_id: str, tenant_id: str) -> List[Dict[str, Any]]:
        """List all roles for a party"""
        from core.models.party_role import PartyRole
        party = self.get_party(party_id, tenant_id)
        return [
            {'code': r.role_code, 'assignedAt': r.assigned_at} 
            for r in party.roles
        ]

    def create_party(self, data: Dict[str, Any], tenant_id: str) -> Party:
        try:
            # Validate input using Party model's validation logic if available
            # or just construct directly. Party.from_dict handles ID generation.
            new_party = Party.from_dict(data)
            new_party.tenant_id = tenant_id
            
            # Check for existing logic? (e.g. TC number uniqueness)
            if new_party.tc_number:
                existing = self.db.query(Party).filter_by(
                    tc_number=new_party.tc_number, 
                    tenant_id=tenant_id
                ).first()
                if existing:
                    raise HTTPException(status_code=400, detail="Party with this TC number already exists")

            self.db.add(new_party)
            self.db.flush() # Flush to get ID if needed, though ID is pre-generated usually
            
            # Remediation 5.2: Strict Cutover for Creation
            # If sgk_info was provided (via from_dict), move it to HearingProfile
            if new_party.sgk_info:
                from services.hearing_profile_service import HearingProfileService
                # Extract data
                sgk_data = new_party.sgk_info_json
                
                # clear legacy
                new_party.sgk_info = None 
                
                # Create Profile
                hp_service = HearingProfileService(self.db)
                # We use update_sgk_info which handles get_or_create
                hp_service.update_sgk_info(new_party.id, sgk_data, tenant_id)

            # Remediation 5.1: Assign default role based on segment or status
            # Default to PATIENT role if not specified
            default_role = 'PATIENT'
            if new_party.segment == 'lead':
                default_role = 'LEAD'
            
            self.assign_role(new_party.id, default_role, tenant_id)
        
            self.db.commit()
            self.db.refresh(new_party)
            return new_party
        except Exception as e:
            self.db.rollback()
            raise e

    def update_party(self, party_id: str, data: Dict[str, Any], tenant_id: str) -> Party:
        party = self.get_party(party_id, tenant_id)
        
        # Helper map for Party fields - Handle both camelCase (legacy/API) and snake_case (Pydantic model_dump)
        if 'firstName' in data: party.first_name = data['firstName']
        elif 'first_name' in data: party.first_name = data['first_name']
        
        if 'lastName' in data: party.last_name = data['lastName']
        elif 'last_name' in data: party.last_name = data['last_name']
        
        if 'phone' in data: party.phone = data['phone']
        
        if 'email' in data: party.email = data['email']
        
        if 'tcNumber' in data: party.tc_number = data['tcNumber']
        elif 'tc_number' in data: party.tc_number = data['tc_number']
        
        if 'birthDate' in data or 'birth_date' in data:
            d = data.get('birthDate') or data.get('birth_date')
            if isinstance(d, date) and not isinstance(d, datetime):
                 party.birth_date = datetime.combine(d, time.min)
            else:
                party.birth_date = d
        
        if 'gender' in data: party.gender = data['gender']
        
        if 'status' in data:
            status_val = data['status']
            if hasattr(status_val, 'value'): # Enum
                party.status = status_val.value
            elif isinstance(status_val, str):
                party.status = ModelPatientStatus.from_legacy(status_val).value
                
            # Remediation 5.1: Sync status change to roles if needed
            # e.g. if status becomes CUSTOMER, ensure PATIENT/CUSTOMER role exists
            # For now, simplistic sync:
            if party.status == 'active' or party.status == 'customer':
                 self.assign_role(party.id, 'CUSTOMER', tenant_id)

        if 'segment' in data: party.segment = data['segment']
        if 'branchId' in data: party.branch_id = data['branchId']
        if 'tags' in data:
            party.tags_json = data['tags']
        elif 'tags_json' in data:
            party.tags_json = data['tags_json']
            
        if 'sgkInfo' in data:
            party.sgk_info_json = data['sgkInfo']
        elif 'sgk_info' in data:
            party.sgk_info_json = data['sgk_info']
            
        if 'address' in data:
            addr = data['address']
            if addr:
                if isinstance(addr, dict):
                    party.address_city = addr.get('city') or addr.get('addressCity')
                    party.address_district = addr.get('district') or addr.get('addressDistrict')
                    party.address_full = addr.get('fullAddress') or addr.get('address') or addr.get('addressFull')
                elif hasattr(addr, 'city'):
                     party.address_city = getattr(addr, 'city', None) or getattr(addr, 'addressCity', None)
                     party.address_district = getattr(addr, 'district', None) or getattr(addr, 'addressDistrict', None)
                     party.address_full = getattr(addr, 'fullAddress', None) or getattr(addr, 'address', None) or getattr(addr, 'addressFull', None)

        # Update remaining attributes (if any other fields are passed directly)
        skip_fields = [
            'firstName', 'lastName', 'phone', 'email', 'tcNumber', 'birthDate', 
            'gender', 'status', 'segment', 'branchId', 'tags', 'sgkInfo', 'address',
            'first_name', 'last_name', 'tc_number', 'birth_date', 'sgk_info', 'branch_id'
        ]
        for k, v in data.items():
            # Skip fields already handled or complex objects
            if k not in skip_fields and hasattr(party, k):
                setattr(party, k, v)
        
        try:
            self.db.commit()
            try:
                self.db.refresh(party)
            except Exception as refresh_error:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error refreshing party after update: {refresh_error}")
                # If refresh fails, try to re-fetch
                party = self.db.get(Party, party_id)
                if not party:
                     raise HTTPException(status_code=404, detail="Party disappeared after update")
            return party
        except Exception as e:
            self.db.rollback()
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Database error in update_party: {e}")
            raise e

    def delete_party(self, party_id: str, tenant_id: str) -> None:
        """
        Delete a party.
        """
        party = self.get_party(party_id, tenant_id)
        try:
            self.db.delete(party)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def list_device_assignments(self, party_id: str, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get all devices assigned to a specific party, with full hydration.
        """
        self.get_party(party_id, tenant_id) # Validates existence and tenant
        
        # Get all device assignments for this party, ordered by created_at descending (newest first)
        assignments = self.db.query(DeviceAssignment).filter_by(party_id=party_id).order_by(DeviceAssignment.created_at.desc()).all()
        
        # Map assignments to the structure expected by frontend
        mapped_devices = []
        for assignment in assignments:
            # Get full dict from model - this includes createdAt, assignedDate, sgkScheme, paymentMethod, etc.
            d = assignment.to_dict() if hasattr(assignment, 'to_dict') else {}
            
            # Hydrate with details from linked Device or Inventory
            brand = d.get('brand')
            model = d.get('model')
            serial = d.get('serialNumber')
            barcode = d.get('barcode')
            
            if not brand or not model:
                # Try to find linked device
                if assignment.device_id:
                    device = self.db.get(Device, assignment.device_id)
                    if device:
                        brand = brand or device.brand
                        model = model or device.model
                        serial = serial or device.serial_number
                        barcode = barcode or getattr(device, 'barcode', None)
                
                # Try to find linked inventory
                if (not brand or not model) and assignment.inventory_id:
                    inv = self.db.get(InventoryItem, assignment.inventory_id)
                    if inv:
                        brand = brand or inv.brand
                        model = model or inv.model
                        serial = serial or inv.serial_number
                        barcode = barcode or inv.barcode
            
            # Merge enriched data with original dict (original dict has priority for existing fields)
            enriched = {
                'brand': brand or 'Bilinmiyor',
                'model': model or 'Bilinmiyor',
                'serialNumber': serial,
                'barcode': barcode,
                'status': d.get('status', 'assigned'),
                'type': d.get('deviceType', 'hearing_aid'),
            }
            
            # Merge: original dict values take priority, enriched fills in missing
            final_device = {**enriched, **d}
            
            # === Flask parity: Add earSide alias ===
            final_device['earSide'] = assignment.ear
            
            # === Flask parity: Add sgkSupportType alias ===
            final_device['sgkSupportType'] = assignment.sgk_scheme
            
            # === Flask parity: Add deviceName (computed) ===
            if assignment.inventory_id:
                inv = self.db.get(InventoryItem, assignment.inventory_id)
                if inv:
                    final_device['deviceName'] = f"{inv.brand} {inv.model}"
                    final_device['category'] = inv.category
            if not final_device.get('deviceName'):
                if assignment.is_loaner:
                    final_device['deviceName'] = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}"
                else:
                    final_device['deviceName'] = f"{final_device.get('brand', '')} {final_device.get('model', '')}".strip() or f"Device {assignment.device_id or ''}"
            
            # === Flask parity: Pricing fields with explicit float conversion ===
            final_device['sgkReduction'] = float(assignment.sgk_support) if assignment.sgk_support is not None else 0.0
            final_device['patientPayment'] = float(assignment.net_payable) if assignment.net_payable is not None else 0.0
            final_device['salePrice'] = float(assignment.sale_price) if assignment.sale_price is not None else 0.0
            final_device['listPrice'] = float(assignment.list_price) if assignment.list_price is not None else 0.0
            
            # === Flask parity: Fetch downPayment from PaymentRecord ===
            final_device['downPayment'] = 0.0
            if assignment.sale_id:
                # Try to get explicit down payment record first
                down_payment_record = self.db.query(PaymentRecord).filter_by(
                    sale_id=assignment.sale_id,
                    payment_type='down_payment'
                ).first()
                
                if down_payment_record:
                    final_device['downPayment'] = float(down_payment_record.amount) if down_payment_record.amount else 0.0
                else:
                    # Fallback to sale's paid_amount
                    sale = self.db.get(Sale, assignment.sale_id)
                    if sale and sale.paid_amount:
                        final_device['downPayment'] = float(sale.paid_amount)
            
            # === Flask parity: Ensure assignedDate is set ===
            if not final_device.get('assignedDate') and assignment.created_at:
                final_device['assignedDate'] = assignment.created_at.isoformat()
            
            mapped_devices.append(final_device)
        
        return mapped_devices

    # --- Notes ---

    def list_notes(self, party_id: str, tenant_id: str) -> List[PatientNote]:
        party = self.get_party(party_id, tenant_id)
        return party.notes

    def create_note(
        self, 
        party_id: str, 
        data: Dict[str, Any], 
        tenant_id: str, 
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> PatientNote:
        party = self.get_party(party_id, tenant_id)
        
        new_note = PatientNote(
            id=str(uuid.uuid4()),
            party_id=party_id,
            tenant_id=tenant_id,
            author_id=user_id,
            note_type=data.get('type') or data.get('noteType') or 'genel',
            category=data.get('category', 'general'),
            title=data.get('title') or data.get('type'),
            content=data['content'],
            is_private=data.get('isPrivate', False)
        )
        self.db.add(new_note)
        self.db.commit()
        
        # Create Activity Log
        try:
            activity_log = ActivityLog(
                user_id=user_id,
                action='note_created',
                entity_type='party',
                entity_id=party_id,
                details=f"Note created: {new_note.content[:50]}{'...' if len(new_note.content) > 50 else ''}",
                ip_address=ip_address,
                user_agent=user_agent or '',
                tenant_id=tenant_id
            )
            self.db.add(activity_log)
            self.db.commit()
        except Exception as log_error:
            # logger.error ... but service typically doesn't log unless injected logger. 
            # We silently fail log creation as per original pattern if not critical, 
            # but ideally should propagate or log.
            pass
        
        return new_note

    def update_note(self, party_id: str, note_id: str, data: Dict[str, Any], tenant_id: str) -> PatientNote:
        self.get_party(party_id, tenant_id) # ensure party exists/access
        
        note = self.db.query(PatientNote).filter_by(id=note_id, party_id=party_id).first()
        if not note:
            # Using generic HTTPException here matching original behavior
            raise HTTPException(status_code=404, detail="Note not found")
            
        if 'content' in data and data['content'] is not None:
            note.content = data['content']
        if 'title' in data and data['title'] is not None:
            note.title = data['title']
        if 'noteType' in data and data['noteType'] is not None:
            note.note_type = data['noteType']
        if 'category' in data and data['category'] is not None:
            note.category = data['category']
        if 'isPrivate' in data and data['isPrivate'] is not None:
            note.is_private = data['isPrivate']
        if 'tags' in data and data['tags'] is not None:
            import json
            note.tags = json.dumps(data['tags'])
            
        note.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(note)
        return note

    def delete_note(self, party_id: str, note_id: str, tenant_id: str) -> None:
        self.get_party(party_id, tenant_id)
        
        note = self.db.query(PatientNote).filter_by(id=note_id, party_id=party_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        try:
            self.db.delete(note)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
