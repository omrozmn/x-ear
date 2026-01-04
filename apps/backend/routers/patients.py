from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional, Any, Dict
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session
import json
import base64

from schemas.patients import (
    PatientRead, PatientCreate, PatientUpdate, PatientSearchFilters
)
from schemas.base import ResponseEnvelope, ResponseMeta
from schemas.base import ApiError
from models.patient import Patient
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.inventory import InventoryItem
from models.base import db
from dependencies import get_db, get_current_context, AccessContext

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Patients"])

# --- HELPERS ---

def get_patient_or_404(db: Session, patient_id: str, ctx: AccessContext) -> Patient:
    patient = db.session.get(Patient, patient_id)
    if not patient:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
            )
    if ctx.tenant_id and patient.tenant_id != ctx.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        ) # Hide cross-tenant
    return patient

# --- ROUTES ---

@router.get("/patients", response_model=ResponseEnvelope[List[PatientRead]])
def list_patients(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    city: Optional[str] = None,
    district: Optional[str] = None,
    cursor: Optional[str] = None,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """List patients with filtering and pagination"""
    try:
        query = Patient.query
        
        # Tenant Scope
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
            
        # Branch Logic (Legacy Admin restriction)
        # Assuming `ctx.user` has `branches` relationship loaded or accessible
        if ctx.is_tenant_admin and ctx.user.role == 'admin':
             # Note: ctx.user is the SQLAlchemy model object attached in dependencies.py
             user_branch_ids = [b.id for b in getattr(ctx.user, 'branches', [])]
             if user_branch_ids:
                 query = query.filter(Patient.branch_id.in_(user_branch_ids))
             # If admin has no branches, they might see nothing or everything depending on business rule.
             # Legacy code returned empty. Let's stick to legacy behavior if list provided but empty?
             # Actually existing code: if user_branch_ids checks if list is not empty.
             # If list empty, query not filtered? No, legacy code says:
             # if user_branch_ids: ... else: return success_response([], meta=...total=0)
             # So if admin has NO branches, they see NOTHING.
             elif getattr(ctx.user, 'branches', []): # Check if relation exists and is empty
                  return ResponseEnvelope(data=[], meta=ResponseMeta(total=0, page=page, perPage=per_page, totalPages=0))
        
        # Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.phone.ilike(search_term),
                    Patient.email.ilike(search_term),
                    Patient.tc_number.ilike(search_term)
                )
            )
            
        # Filters
        if status_filter:
            query = query.filter(Patient.status == status_filter)
        if city:
            query = query.filter(Patient.address_city == city)
        if district:
            query = query.filter(Patient.address_district == district)
            
        # Cursor Pagination Logic
        if cursor:
             try:
                 cursor_id = base64.b64decode(cursor.encode()).decode()
                 query = query.filter(Patient.id > cursor_id)
             except Exception:
                 pass
        
        # Count total (separate query)
        total = query.count() if not cursor else 0 # optimized, don't count on cursor pages usually
        
        # Paginate
        query = query.order_by(Patient.id)
        limit = min(per_page, 200)
        items = query.limit(limit + 1).all()
        
        has_next = len(items) > limit
        if has_next:
            items = items[:-1]
            
        # Next Cursor
        next_cursor = None
        if has_next and items:
            next_cursor = base64.b64encode(str(items[-1].id).encode()).decode()
            
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
                "hasNext": has_next,
                "nextCursor": next_cursor
            }
        )
    except Exception as e:
        logger.error(f"List patients error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients", response_model=ResponseEnvelope[PatientRead], status_code=201)
def create_patient(
    patient_in: PatientCreate,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Create a new patient"""
    try:
        if not ctx.tenant_id:
              raise HTTPException(
                  status_code=400,
                  detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
              )

        # Create instance
        # Pydantic model dump -> kwargs
        # Note: We need to handle aliasing. patient_in has fields like 'firstName', 
        # but model expects 'first_name'. Pydantic v2 model_dump(by_alias=False) gives snake_case default names.
        data = patient_in.model_dump(exclude_unset=True)
        
        # Manual overrides/handling
        tags = data.pop('tags', [])
        sgk_info = data.pop('sgk_info', {})
        
        # Handle address flat vs nested
        # Schema might have 'address' dict. Model expects address_city, etc.
        # But our Schema PatientCreate defines flat fields: address_city, address_district...
        # Wait, looked at schemas/patients.py, it uses AddressSchema for 'address' field?
        # Let's check schema again. Step 110 shows PatientCreate inherits PatientBase.
        # PatientBase has `first_name`, `last_name`, etc.
        # It has `address: Optional[AddressSchema]`.
        # Database has `address_city`, `address_district`, `address_full`.
        address_data = data.pop('address', None)
        
        patient = Patient(tenant_id=ctx.tenant_id, **data)
        
        # Set JSON fields
        patient.tags_json = tags if tags else []
        patient.sgk_info_json = sgk_info if sgk_info else {'rightEarDevice': 'available', 'leftEarDevice': 'available'}
        
        # Set Address flattened
        if address_data:
            # address_data is a dict or object depending on model_dump
            patient.address_city = address_data.get('city')
            patient.address_district = address_data.get('district')
            patient.address_full = address_data.get('fullAddress') or address_data.get('address')
            
        # Defaults
        if not patient.status: patient.status = 'new'
        
        db.session.add(patient)
        db.session.commit()
        
        return ResponseEnvelope(data=patient)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}", response_model=ResponseEnvelope[PatientRead])
def get_patient(
    patient_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Get single patient"""
    patient = get_patient_or_404(db, patient_id, ctx)
    return ResponseEnvelope(data=patient)

@router.put("/patients/{patient_id}", response_model=ResponseEnvelope[PatientRead])
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Update patient"""
    patient = get_patient_or_404(db, patient_id, ctx)
    
    data = patient_in.model_dump(exclude_unset=True)
    
    # Handle complex fields same as create
    if 'tags' in data:
        patient.tags_json = data.pop('tags')
    
    if 'sgk_info' in data:
        patient.sgk_info_json = data.pop('sgk_info')
        
    if 'address' in data:
        addr = data.pop('address')
        if addr:
            patient.address_city = addr.get('city')
            patient.address_district = addr.get('district')
            patient.address_full = addr.get('fullAddress') or addr.get('address')

    for k, v in data.items():
        if hasattr(patient, k):
            setattr(patient, k, v)
            
    try:
        db.session.commit()
        return ResponseEnvelope(data=patient)
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Delete patient"""
    patient = get_patient_or_404(db, patient_id, ctx)
    try:
        db.session.delete(patient)
        db.session.commit()
        return ResponseEnvelope(message="Patient deleted")
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/devices")
def get_patient_devices(
    patient_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Get devices assigned to patient"""
    patient = get_patient_or_404(db, patient_id, ctx)
    
    assignments = DeviceAssignment.query.filter_by(patient_id=patient_id).all()
    devices_data = []
    
    for assignment in assignments:
        # Inventory Logic
        inventory_item = None
        if assignment.inventory_id:
             inventory_item = db.session.get(InventoryItem, assignment.inventory_id)
             
        device_dict = assignment.to_dict()
        
        # Enrich
        if inventory_item:
            device_dict['brand'] = inventory_item.brand
            device_dict['model'] = inventory_item.model
            device_dict['deviceName'] = f"{inventory_item.brand} {inventory_item.model}"
            device_dict['category'] = inventory_item.category
            device_dict['barcode'] = inventory_item.barcode
        else:
             device_dict['deviceName'] = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}" if assignment.is_loaner else f"Device {assignment.device_id or ''}"
             
        device_dict['earSide'] = assignment.ear
        device_dict['status'] = 'assigned'
        if 'deliveryStatus' not in device_dict:
             device_dict['deliveryStatus'] = getattr(assignment, 'delivery_status', 'pending')
             
        # Loaner
        if 'isLoaner' not in device_dict:
            device_dict['isLoaner'] = getattr(assignment, 'is_loaner', False)
        if 'loanerInventoryId' not in device_dict:
            device_dict['loanerInventoryId'] = getattr(assignment, 'loaner_inventory_id', None)
            
        device_dict['saleId'] = assignment.sale_id
        
        # Payment Info
        device_dict['downPayment'] = 0.0
        if assignment.sale_id:
            sale = db.session.get(Sale, assignment.sale_id)
            if sale:
                 rec = PaymentRecord.query.filter_by(sale_id=sale.id, payment_type='down_payment').first()
                 if rec:
                     device_dict['downPayment'] = float(rec.amount)
                 else:
                     device_dict['downPayment'] = float(sale.paid_amount) if sale.paid_amount else 0.0
                     
        device_dict['assignedDate'] = assignment.created_at.isoformat() if assignment.created_at else None
        
        # Price Conversions
        try:
             device_dict['sgkReduction'] = float(assignment.sgk_support) if getattr(assignment, 'sgk_support', None) is not None else 0.0
             device_dict['patientPayment'] = float(assignment.net_payable) if getattr(assignment, 'net_payable', None) is not None else 0.0
             device_dict['salePrice'] = float(assignment.sale_price) if getattr(assignment, 'sale_price', None) is not None else 0.0
             device_dict['listPrice'] = float(assignment.list_price) if getattr(assignment, 'list_price', None) is not None else 0.0
             device_dict['sgkSupportType'] = assignment.sgk_scheme
        except (ValueError, TypeError):
             pass
             
        devices_data.append(device_dict)
        
    return ResponseEnvelope(
        data=devices_data,
        meta={
            "patientId": patient_id,
            "patientName": f"{patient.first_name} {patient.last_name}",
            "deviceCount": len(devices_data)
        }
    )

@router.get("/patients/{patient_id}/sales")
def get_patient_sales(
    patient_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Get sales for patient"""
    patient = get_patient_or_404(db, patient_id, ctx)
    
    sales = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.sale_date.desc()).all()
    sales_data = []
    
    for sale in sales:
        sale_dict = sale.to_dict()
        
        # Devices in sale
        devices = []
        # Note: In Flask logic loop uses DeviceAssignment.query.filter_by(sale_id=sale.id)
        assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
        for assignment in assignments:
            inv_item = None
            if assignment.inventory_id:
                inv_item = db.session.get(InventoryItem, assignment.inventory_id)
                
            if inv_item:
                d_name = f"{inv_item.brand} {inv_item.model}"
                brand = inv_item.brand
                model = inv_item.model
                barcode = inv_item.barcode
            else:
                d_name = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}".strip()
                brand = assignment.loaner_brand or ''
                model = assignment.loaner_model or ''
                barcode = None
                
            devices.append({
                'id': assignment.inventory_id or assignment.device_id,
                'name': d_name,
                'brand': brand,
                'model': model,
                'serialNumber': assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right,
                'barcode': barcode,
                'ear': assignment.ear,
                'listPrice': float(assignment.list_price) if assignment.list_price else None,
                'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
                'sgkCoverageAmount': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
                'patientResponsibleAmount': float(assignment.net_payable) if assignment.net_payable else None
            })
            
        sale_dict['devices'] = devices
        
        # Payments
        payment_records = []
        payments = PaymentRecord.query.filter_by(sale_id=sale.id).all()
        for p in payments:
            payment_records.append({
                'id': p.id,
                'amount': float(p.amount) if p.amount else 0.0,
                'paymentDate': p.payment_date.isoformat() if p.payment_date else None,
                'paymentMethod': p.payment_method,
                'paymentType': p.payment_type,
                'status': 'paid',
                'referenceNumber': None,
                'notes': None
            })
        
        sale_dict['paymentRecords'] = payment_records
        sales_data.append(sale_dict)
        
    return ResponseEnvelope(
        data=sales_data,
        meta={
            "patientId": patient_id,
            "patientName": f"{patient.first_name} {patient.last_name}",
            "salesCount": len(sales_data)
        }
    )

@router.get("/patients/count")
def count_patients(
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    segment: Optional[str] = None
):
    """Count patients"""
    if not ctx.tenant_id:
        return {"data": {"count": 0}}
        
    query = Patient.query.filter_by(tenant_id=ctx.tenant_id)
    # Filter valid phone
    query = query.filter(Patient.phone.isnot(None))
    
    if status:
        query = query.filter(Patient.status == status)
    if segment:
        query = query.filter(Patient.segment == segment)
        
    return ResponseEnvelope(data={'count': query.count()})
