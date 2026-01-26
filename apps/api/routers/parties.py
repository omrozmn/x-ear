from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from typing import List, Optional, Any, Dict
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
import json
import base64
import csv
import io
from enum import Enum

try:
    from openpyxl import load_workbook
except ImportError:
    load_workbook = None

from schemas.parties import (
    PartyRead, PartyCreate, PartyUpdate, PartySearchFilters, BulkUploadResponse
)
from schemas.base import ResponseEnvelope, ResponseMeta
from schemas.base import ApiError
from core.models.party import Party
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.inventory import InventoryItem

from services.party_service import PartyService

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Parties"])

# --- HELPERS ---



# --- ROUTES ---

@router.get("/parties", operation_id="listParties", response_model=ResponseEnvelope[List[PartyRead]])
def list_parties(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    city: Optional[str] = None,
    district: Optional[str] = None,
    cursor: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access("patient:read")),
    db: Session = Depends(get_db)
):
    """List patients with filtering and pagination"""
    try:
        service = PartyService(db)
        
        branch_ids = None
        if access.is_tenant_admin and access.user and access.user.role == 'admin':
             # Logic matching previous implementation: narrow scope to user's branches if admin
             try:
                 user_branches = getattr(access.user, 'branches', [])
                 if user_branches:
                     branch_ids = [b.id for b in user_branches]
                 elif hasattr(access.user, 'branches'): 
                     # Has attribute but empty list implied restricted access to 0 branches
                     branch_ids = []
             except Exception as branch_error:
                 logger.warning(f"Failed to load user branches: {branch_error}")
                 # Fallback: ignore branch restriction if loading fails, or secure closed?
                 # Ignoring to prevent 500, assuming if critical it should have worked.
                 branch_ids = None
        
        items, total, next_cursor = service.list_parties(
            tenant_id=access.tenant_id,
            page=page,
            per_page=per_page,
            search=search,
            status=status_filter,
            city=city,
            district=district,
            cursor=cursor,
            branch_ids=branch_ids
        )
            
        # Manual pagination meta calculation if not cursor
        total_pages = 0
        if not cursor and total > 0:
            total_pages = (total + per_page - 1) // per_page
            
        return ResponseEnvelope(
            data=items,
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": total_pages,
                "hasNext": True if next_cursor else False, # Simplified hasNext logic based on cursor
                "nextCursor": next_cursor
            }
        )
    except Exception as e:
        logger.error(f"List patients error: {e}")
        import traceback
        with open("last_error.txt", "w") as f:
            f.write(f"Error: {str(e)}\n")
            f.write(traceback.format_exc())
        print(f"CRITICAL 500 ERROR IN LIST PARTIES: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
# ... imports ...

@router.post("/parties", operation_id="createParties", response_model=ResponseEnvelope[PartyRead], status_code=201)
def create_party(
    patient_in: PartyCreate,
    access: UnifiedAccess = Depends(require_access("patient:write")),
    db: Session = Depends(get_db)
):
    """Create a new patient"""
    try:
        service = PartyService(db)
        if not access.tenant_id or access.tenant_id == 'system':
            raise HTTPException(
                status_code=400,
                detail="Lütfen işlem yapmak için bir klinik (tenant) seçiniz."
            )

        # Service handles data normalization and defaults
        data = patient_in.model_dump(exclude_unset=True)
        
        patient = service.create_party(data, access.tenant_id)
        
        return ResponseEnvelope(data=patient)
    except Exception as e:
        logger.error(f"Create patient error: {e}")
        # Service might raise HTTPException or others, safe to re-raise or wrap
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/parties/export", operation_id="listPartyExport")
def export_parties(
    q: Optional[str] = None,
    status: Optional[str] = None,
    segment: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access("patient:export")),
    db: Session = Depends(get_db)
):
    """Export patients as CSV"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    if not access.tenant_id:
         raise HTTPException(status_code=400, detail="Tenant context required")

    service = PartyService(db)
    
    branch_ids = None
    if access.is_tenant_admin and access.user and access.user.role == 'admin':
         user_branches = getattr(access.user, 'branches', [])
         if user_branches:
             branch_ids = [b.id for b in user_branches]
         elif hasattr(access.user, 'branches'):
             branch_ids = []

    # Generator for streaming
    def iter_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['id','tcNumber','firstName','lastName','phone','email','birthDate','gender','status','segment','tags','createdAt'])
        output.seek(0)
        yield output.read()
        output.seek(0)
        output.truncate(0)

        # Iterate via Service
        iterator = service.iter_parties(
            tenant_id=access.tenant_id,
            search=q,
            status=status,
            segment=segment,
            branch_ids=branch_ids
        )

        for p in iterator:
            tags_str = json.dumps(p.tags_json) if p.tags_json else "[]"
            # Handle potential None dates
            created = p.created_at.isoformat() if p.created_at else ''
            
            writer.writerow([
                str(p.id),
                str(p.tc_number or ''),
                str(p.first_name or ''),
                str(p.last_name or ''),
                str(p.phone or ''),
                str(p.email or ''),
                str(p.birth_date or ''),
                str(p.gender or ''),
                str(p.status or ''),
                str(p.segment or ''),
                tags_str,
                created
            ])
            output.seek(0)
            yield output.read()
            output.seek(0)
            output.truncate(0)
            
    filename = f"patients_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/parties/count", operation_id="listPartyCount")
def count_parties(
    access: UnifiedAccess = Depends(require_access("patient:read")),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    segment: Optional[str] = None
):
    """Count patients"""
    if not access.tenant_id:
        return {"data": {"count": 0}}
        
    service = PartyService(db)
    count = service.count_parties(access.tenant_id, status=status, segment=segment)
        
    return ResponseEnvelope(data={'count': count})

@router.get("/parties/{party_id}", operation_id="getParty", response_model=ResponseEnvelope[PartyRead])
def get_party(
    party_id: str,
    access: UnifiedAccess = Depends(require_access("patient:read")),
    db: Session = Depends(get_db)
):
    """Get single patient"""
    service = PartyService(db)
    # Service raises 404 if not found or tenant mismatch
    patient = service.get_party(party_id, access.tenant_id)
    return ResponseEnvelope(data=patient)

@router.put("/parties/{party_id}", operation_id="updateParty", response_model=ResponseEnvelope[PartyRead])
def update_party(
    party_id: str,
    patient_in: PartyUpdate,
    access: UnifiedAccess = Depends(require_access("patient:write")),
    db: Session = Depends(get_db)
):
    """Update patient"""
    service = PartyService(db)
    
    data = patient_in.model_dump(exclude_unset=True)
    try:
        updated_patient = service.update_party(party_id, data, access.tenant_id)
        return ResponseEnvelope(data=updated_patient)
    except Exception as e:
        logger.error(f"Update patient error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}", operation_id="deleteParty")
def delete_party(
    party_id: str,
    access: UnifiedAccess = Depends(require_access("patient:delete")),
    db: Session = Depends(get_db)
):
    """Delete patient"""
    service = PartyService(db)
    try:
        service.delete_party(party_id, access.tenant_id)
        return ResponseEnvelope(message="Patient deleted")
    except Exception as e:
        logger.error(f"Delete patient error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parties/bulk-upload", operation_id="createPartyBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
async def bulk_upload_parties(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access("patient:write")),
    db: Session = Depends(get_db)
):
    """Bulk upload patients from CSV or XLSX"""
    try:
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json")
            )

        filename = (file.filename or '').lower()
        content = await file.read()
        
        rows = []
        headers = []

        def _sanitize_cell(v):
            if v is None:
                return None
            if not isinstance(v, str):
                return v
            v = v.strip()
            # Prevent CSV/Excel formula injection
            if v.startswith(('=', '+', '-', '@')):
                return "'" + v
            return v

        # Parse File
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            if load_workbook is None:
                raise HTTPException(status_code=500, detail="Server missing openpyxl dependency")
            
            try:
                wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
                sheet = wb[wb.sheetnames[0]] if wb.sheetnames else None
                if sheet is None:
                     raise HTTPException(status_code=400, detail="XLSX contains no sheets")
                
                it = sheet.iter_rows(values_only=True)
                headers_row = next(it, None)
                if not headers_row:
                     raise HTTPException(status_code=400, detail="XLSX first row empty")
                
                headers = [str(h).strip() if h is not None else '' for h in headers_row]
                if not any(h for h in headers):
                     raise HTTPException(status_code=400, detail="XLSX has no headers")
                     
                for r in it:
                    obj = {}
                    for idx, h in enumerate(headers):
                        val = r[idx] if idx < len(r) else None
                        obj[h] = _sanitize_cell(val)
                    if any(v not in (None, '') for v in obj.values()):
                        rows.append(obj)
            except Exception as e:
                logger.error(f"XLSX parse error: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to parse XLSX: {str(e)}")
        else:
            # CSV assumption
            try:
                # Try UTF-8-SIG then UTF-8
                try:
                    text_content = content.decode('utf-8-sig')
                except UnicodeDecodeError:
                    text_content = content.decode('utf-8', errors='replace')
                
                # Sniffer
                try:
                    dialect = csv.Sniffer().sniff(text_content[:4096])
                    delimiter = dialect.delimiter
                except Exception:
                    delimiter = ','
                
                # Fallback check for delimiter
                first_line = text_content.split('\n')[0]
                if ';' in first_line and delimiter != ';':
                    delimiter = ';'
                
                reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
                headers = reader.fieldnames or []
                rows = [row for row in reader]
                
            except Exception as e:
                logger.error(f"CSV parse error: {e}")
                raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

        # Process Rows
        created = 0
        updated = 0
        errors = []
        row_num = 0

        for row in rows:
            row_num += 1
            try:
                if isinstance(row, dict):
                    normalized_row = {k: _sanitize_cell(v) for k, v in row.items()}
                else:
                    normalized_row = row
                
                # Normalize keys (handle variations)
                def get_val(keys):
                    for k in keys:
                        if k in normalized_row and normalized_row[k]:
                            return normalized_row[k]
                    return None
                    
                tc_number = get_val(['tcNumber', 'tc_number', 'tc', 'TC', 'tc_no'])
                first_name = get_val(['firstName', 'first_name', 'first', 'isim', 'ad'])
                last_name = get_val(['lastName', 'last_name', 'last', 'soyisim', 'soyad'])
                phone = get_val(['phone', 'phone_number', 'tel', 'telefon', 'cep_telefon', 'cep'])
                
                if not (first_name or phone or tc_number):
                    # Skip empty rows or not enough info
                    errors.append({'row': row_num, 'error': 'Missing required identifying fields'})
                    continue

                # Prepare Payload
                payload = {
                    'tc_number': tc_number,
                    'identity_number': get_val(['identityNumber', 'identity_number']),
                    'first_name': first_name,
                    'last_name': last_name,
                    'phone': phone,
                    'email': get_val(['email', 'e-mail', 'eposta']),
                    'birth_date': get_val(['birthDate', 'birth_date', 'dob', 'dogum_tarihi']),
                    'gender': get_val(['gender', 'cinsiyet']),
                    'status': get_val(['status', 'durum']),
                    'segment': get_val(['segment']),
                }
                
                # Clean up None values
                payload = {k: v for k, v in payload.items() if v is not None}
                
                # Address
                address_city = get_val(['address_city', 'city', 'il', 'sehir'])
                address_district = get_val(['address_district', 'district', 'ilce'])
                address_full = get_val(['address_full', 'fullAddress', 'address', 'adres'])
                
                if address_city: payload['address_city'] = address_city
                if address_district: payload['address_district'] = address_district
                if address_full: payload['address_full'] = address_full
                
                # Tags
                tags_val = get_val(['tags', 'etiketler'])
                if tags_val:
                    if isinstance(tags_val, str):
                        payload['tags_json'] = [t.strip() for t in tags_val.split(',') if t.strip()]
                    else:
                        payload['tags_json'] = tags_val

                # Check Existing
                existing = None
                if tc_number:
                    existing = db.query(Party).filter(Party.tc_number == tc_number, Party.tenant_id == access.tenant_id).first()
                
                if existing:
                    # Update Logic
                    for k, v in payload.items():
                        if hasattr(existing, k) and v is not None:
                            # Handle Date parsing for birth_date if strictly string
                            if k == 'birth_date' and isinstance(v, str):
                                try:
                                    dt = None
                                    for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%d/%m/%Y', '%Y/%m/%d'):
                                        try:
                                            dt = datetime.strptime(v, fmt)
                                            break
                                        except ValueError:
                                            pass
                                    if dt:
                                         setattr(existing, k, dt)
                                    else:
                                         # Try isoformat
                                         setattr(existing, k, datetime.fromisoformat(v))
                                except:
                                    pass 
                            else:
                                setattr(existing, k, v)
                    updated += 1
                    db.add(existing)
                else:
                    # Create Logic
                    if not payload.get('first_name') or not payload.get('last_name'):
                         errors.append({'row': row_num, 'error': 'First Name and Last Name required for new patients'})
                         continue
                         
                    # Handle Date parsing
                    if 'birth_date' in payload and isinstance(payload['birth_date'], str):
                         v = payload['birth_date']
                         dt = None
                         for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%d/%m/%Y', '%Y/%m/%d'):
                            try:
                                dt = datetime.strptime(v, fmt)
                                break
                            except ValueError:
                                pass
                         if dt:
                             payload['birth_date'] = dt
                         else:
                             try:
                                 payload['birth_date'] = datetime.fromisoformat(v)
                             except:
                                 del payload['birth_date']
                    
                    patient = Party(tenant_id=access.tenant_id, **payload)
                    if not patient.status: patient.status = 'ACTIVE'
                    
                    db.add(patient)
                    created += 1
                
                # Use savepoint to prevent full rollback on single row failure
                db.begin_nested() 
                try:
                    db.flush()
                    db.commit() # Commit the savepoint
                except Exception as e:
                    db.rollback() # Rollback to savepoint
                    errors.append({'row': row_num, 'error': str(e)})

            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
        
        db.commit()
        return ResponseEnvelope(data={
            'success': True,
            'created': created,
            'updated': updated,
            'errors': errors
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk upload patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

