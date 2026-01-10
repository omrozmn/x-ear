import logging
import json
import os
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from uuid import uuid4
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, text

from database import gen_sale_id
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentRecord, PaymentInstallment
from models.patient import Patient
from models.inventory import InventoryItem
from models.invoice import Invoice
from services.stock_service import create_stock_movement
from services.device_assignment_service import DeviceAssignmentService

from schemas.sales import (
    SaleRead, SaleCreate, SaleUpdate, 
    PaymentRecordRead, PaymentRecordCreate, 
    PaymentPlanRead, PaymentPlanCreate,
    DeviceAssignmentRead, DeviceAssignmentUpdate,
    DeviceAssignmentCreate, DeviceAssignmentCreateResponse,
    SaleRecalcRequest, SaleRecalcResponse
)
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

# Logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Sales"])

# ============= HELPER FUNCTIONS =============

def get_sale_or_404(db: Session, sale_id: str, access: UnifiedAccess) -> Sale:
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Sale not found", code="SALE_NOT_FOUND").model_dump(mode="json"),
        )
    if access.tenant_id and sale.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Sale not found", code="SALE_NOT_FOUND").model_dump(mode="json"),
        )
    return sale

def _build_device_info_with_lookup(assignment: DeviceAssignment, db: Session) -> Dict[str, Any]:
    """Build device info dict (ported from read.py)"""
    device_name = None
    barcode = None
    
    # Needs Device model? Assignment has device_id?
    # assignment.device linked to Device model usually.
    # In Flask read.py it did db.session.get(Device, assignment.device_id)
    # Here we can use assignment.device relationship if loaded, or fetch.
    
    from models.device import Device
    device = db.get(Device, assignment.device_id)
    if not device:
        return None
        
    if device.inventory_id:
        inv_item = db.get(InventoryItem, device.inventory_id)
        if inv_item:
            device_name = inv_item.name
            barcode = inv_item.barcode
            
    # Helper to format name
    name_parts = []
    if device.brand: name_parts.append(device.brand)
    if device.model: name_parts.append(device.model)
    formatted_name = " ".join(name_parts)
    if not formatted_name and device_name: formatted_name = device_name
    
    return {
        'id': device.id,
        'name': formatted_name,
        'brand': device.brand,
        'model': device.model,
        'serialNumber': device.serial_number,
        'serialNumberLeft': device.serial_number_left,
        'serialNumberRight': device.serial_number_right,
        'barcode': barcode,
        'ear': assignment.ear,
        'listPrice': float(assignment.list_price or 0),
        'salePrice': float(assignment.sale_price or 0),
        'sgk_coverage_amount': float(assignment.sgk_support or 0),
        'patient_responsible_amount': float(assignment.net_payable or 0),
        
        # Legacy frontend support
        'sgkReduction': float(assignment.sgk_support or 0),
        'patientPayment': float(assignment.net_payable or 0)
    }

def _build_sale_data(sale, devices, plan, payments, invoice, sgk_val):
    """Build final sale response dict"""
    return {
        'id': sale.id,
        'patientId': sale.patient_id,
        'tenantId': sale.tenant_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        'status': sale.status,
        'totalAmount': float(sale.total_amount or 0),
        'paidAmount': float(sale.paid_amount or 0),
        'finalAmount': float(sale.final_amount or 0),
        'sgkCoverage': float(sgk_val or 0),
        'discountAmount': float(sale.discount_amount or 0),
        'notes': sale.notes,
        'paymentMethod': sale.payment_method,
        'reportStatus': sale.report_status,
        'devices': devices,
        'paymentPlan': plan, # Pydantic or dict?
        'paymentRecords': payments, # List
        'invoice': invoice.to_dict() if invoice else None
    }

# ============= READ ENDPOINTS =============

@router.get("/sales", operation_id="listSales", response_model=ResponseEnvelope[List[SaleRead]])
def get_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get all sales with tenant scoping."""
    query = db.query(Sale)
    
    if access.tenant_id:
        query = query.filter(Sale.tenant_id == access.tenant_id)
        
        # Branch scoping for Tenant Users (if admin role check logic applies)
        if access.is_tenant_admin and access.user.role == 'admin':
             # Replicate logic: if user has branches, filter by them
             user_branch_ids = [b.id for b in getattr(access.user, 'branches', [])]
             if user_branch_ids:
                 query = query.filter(Sale.branch_id.in_(user_branch_ids))
             elif getattr(access.user, 'branches', []):
                 # Has branches attribute but empty list? OR if user is restricted?
                 # Should probably return empty if they are assigned branches but none match
                 # Logic in read.py: "if user_branch_ids: filter... else: return empty"
                 # Only if they ARE assigned branches. If branches is empty list, maybe they see all?
                 # Flask logic: `if access.user.branches` -> filter.
                 # So if they have branches, we constrain.
                 pass 
                 
    if search:
        query = query.join(Patient).filter(
            or_(
                Patient.first_name.ilike(f"%{search}%"),
                Patient.last_name.ilike(f"%{search}%"),
                Sale.id.ilike(f"%{search}%")
            )
        )
        
    query = query.order_by(desc(Sale.sale_date))
    
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Transform items to match schema
    results = []
    for s in items:
        try:
            results.append(s.to_dict() if hasattr(s, 'to_dict') else s)
        except Exception:
            results.append(s)

    return ResponseEnvelope(
        data=results,
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": (total + per_page - 1) // per_page,
        },
    )

# Note: /patients/{patient_id}/sales endpoint moved to patients.py to avoid duplication

# ============= PAYMENT ENDPOINTS =============

@router.get("/sales/{sale_id}/payments", operation_id="listSalePayments", response_model=ResponseEnvelope[Any])
def get_sale_payments(
    sale_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    sale = get_sale_or_404(db, sale_id, access)
    
    payments = db.query(PaymentRecord).filter(PaymentRecord.sale_id == sale_id).order_by(desc(PaymentRecord.payment_date)).all()
    
    payment_data = []
    total_paid = 0.0
    total_pending = 0.0
    
    for p in payments:
        amt = float(p.amount)
        if p.status == 'paid': total_paid += amt
        elif p.status == 'pending': total_pending += amt
            
        payment_data.append({
            'id': p.id,
            'amount': amt,
            'paymentDate': p.payment_date,
            'paymentMethod': p.payment_method,
            'status': p.status,
            'notes': p.notes
        })
        
    total_sale = float(sale.total_amount or 0) # Should this be final_amount?
    # read.py uses total_amount logic.
    remaining = total_sale - total_paid

    return ResponseEnvelope(
        data={
            "payments": payment_data,
            "summary": {
                "totalAmount": total_sale,
                "totalPaid": total_paid,
                "remainingBalance": remaining,
                "paymentCount": len(payments),
            },
        }
    )

@router.post("/sales/{sale_id}/payments", operation_id="createSalePayments")
def record_sale_payment(
    sale_id: str,
    payment_in: PaymentRecordCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    access.require_permission("sales:write") # Assume write permission
    
    sale = get_sale_or_404(db, sale_id, access)
    
    # Validation logic from payments.py
    amount = payment_in.amount
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Amount must be > 0", code="PAYMENT_INVALID_AMOUNT").model_dump(mode="json"),
        )
        
    # Check remaining
    paid_recs = db.query(PaymentRecord).filter_by(sale_id=sale_id, status='paid').all()
    paid_total = sum(float(p.amount) for p in paid_recs)
    remaining = float(sale.total_amount) - paid_total
    
    if amount > remaining + 0.01:
        raise HTTPException(
            status_code=400,
            detail=ApiError(
                message=f"Amount {amount} exceeds remaining {remaining}",
                code="PAYMENT_EXCEEDS_REMAINING",
                details={"amount": amount, "remaining": remaining},
            ).model_dump(mode="json"),
        )
        
    payment = PaymentRecord(
        id=f"payment_{uuid4().hex[:8]}",
        patient_id=sale.patient_id,
        sale_id=sale_id,
        amount=Decimal(str(amount)),
        payment_method=payment_in.payment_method,
        payment_type=payment_in.payment_type,
        status=payment_in.status,
        reference_number=payment_in.reference_number,
        notes=payment_in.notes,
        promissory_note_id=payment_in.promissory_note_id,
        payment_date=payment_in.payment_date,
        due_date=payment_in.due_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(payment)
    db.commit()

    return ResponseEnvelope(
        data={
            "id": payment.id,
            "status": "paid",
        },
        message="Payment recorded",
    )

@router.get("/sales/{sale_id}/payment-plan", operation_id="listSalePaymentPlan")
def get_sale_payment_plan(
    sale_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    sale = get_sale_or_404(db, sale_id, access)
    plans = db.query(PaymentPlan).filter_by(sale_id=sale_id).all()
    
    # We would convert plans to schema, but for now returning as is logic
    results = []
    for plan in plans:
        # Fetch installments
        insts = db.query(PaymentInstallment).filter_by(payment_plan_id=plan.id).order_by(PaymentInstallment.due_date).all()
        inst_data = [
            {
                'installmentNumber': i.installment_number,
                'amount': float(i.amount),
                'dueDate': i.due_date,
                'status': i.status
            }
            for i in insts
        ]
        results.append({
            'id': plan.id,
            'planType': plan.plan_type,
            'totalAmount': float(plan.total_amount or 0),
            'installments': inst_data
        })

    return ResponseEnvelope(
        data={
            "paymentPlans": results,
            "saleId": sale_id,
            "totalAmount": float(sale.total_amount or 0),
        }
    )

# ============= WRITE HELPERS =============

def _calculate_product_pricing(product: InventoryItem, data: SaleCreate, override_price: float = None):
    """Calculate pricing for product sale."""
    base_price = float(product.price or 0)
    if override_price is not None:
        base_price = float(override_price)
    elif data.sales_price is not None:
        base_price = float(data.sales_price)
        
    discount = float(data.discount_amount or 0)
    final_price = max(0, base_price - discount)
    return base_price, discount, final_price

def _update_inventory_stock(db: Session, product: InventoryItem, qty: int, transaction_id: str, user_id: str):
    """Update inventory stock (-qty)"""
    from services.stock_service import create_stock_movement
    
    # Decrease stock
    product.available_inventory -= qty
    product.used_inventory += qty
    db.add(product)
    
    # Stock movement
    create_stock_movement(
        inventory_id=product.id,
        movement_type="sale",
        quantity=-qty,
        tenant_id=product.tenant_id,
        transaction_id=transaction_id,
        created_by=user_id,
        session=db
    )

# ============= WRITE ENDPOINTS =============

@router.post("/sales", operation_id="createSales")
def create_sale(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a new sale."""
    access.require_permission("sales:create")
    
    # 1. Validate Patient
    patient = db.get(Patient, sale_in.patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        )
    if access.tenant_id and patient.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        ) # Cross-tenant protection
        
    # 2. Validate Product
    product = db.get(InventoryItem, sale_in.product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Product not found", code="PRODUCT_NOT_FOUND").model_dump(mode="json"),
        )
        
    # Stock Check
    warnings = []
    if product.available_inventory <= 0:
        warnings.append(f"Stok uyarısı: {product.name} stoğu yetersiz ({product.available_inventory}).")
        
    # 3. Calculate Pricing
    base_price, discount, final_price = _calculate_product_pricing(product, sale_in, sale_in.sales_price)
    
    # 4. Create Sale Record
    sale_id = gen_sale_id(db)
    
    # KDV Logic (20%)
    kdv_rate = 0.20
    kdv_amount = base_price - (base_price / (1 + kdv_rate))
    
    # Notes
    kdv_note = f"KDV Oranı: %{int(kdv_rate*100)}, KDV Tutarı: ₺{kdv_amount:.2f}"
    sale_notes = f"{sale_in.notes or ''}\n{kdv_note}".strip()
    
    # Determine status
    paid_amt = float(sale_in.paid_amount or 0)
    if sale_in.payment_method == 'cash' and not sale_in.paid_amount:
         # Implicit full payment if cash and no specific paid amount given? 
         # Legacy logic: if cash, paid_amount = final_price
         paid_amt = final_price
         
    status_val = 'completed' if paid_amt >= final_price else 'pending'
    
    sgk_cov = float(sale_in.sgk_coverage or 0)
    patient_pay = max(0, final_price - sgk_cov)
    
    sale = Sale(
        id=sale_id,
        tenant_id=access.tenant_id or patient.tenant_id,
        branch_id=access.branch_id, # If applicable
        patient_id=sale_in.patient_id,
        product_id=sale_in.product_id,
        sale_date=sale_in.sale_date or datetime.utcnow(),
        list_price_total=base_price,
        total_amount=base_price,
        discount_amount=discount,
        final_amount=final_price,
        paid_amount=paid_amt,
        payment_method=sale_in.payment_method,
        status=status_val,
        notes=sale_notes,
        sgk_coverage=sgk_cov,
        patient_payment=patient_pay,
        report_status=sale_in.report_status
    )
    db.add(sale)
    db.flush() # Get ID
    
    # 5. Device Assignment
    assignment = DeviceAssignment(
        tenant_id=sale.tenant_id,
        branch_id=access.branch_id,
        patient_id=sale.patient_id,
        device_id=product.id,
        inventory_id=product.id,
        sale_id=sale.id,
        reason='Sale',
        from_inventory=True,
        list_price=base_price,
        sale_price=final_price,
        net_payable=final_price,
        payment_method=sale_in.payment_method,
        notes=f"Stoktan satış: {product.name} - {product.brand or ''} {product.model or ''}",
        assignment_uid=f"ATM-{uuid4().hex[:6].upper()}",
        ear=sale_in.ear_side
    )
    if sale_in.serial_number: assignment.serial_number = sale_in.serial_number
    if sale_in.serial_number_left: assignment.serial_number_left = sale_in.serial_number_left
    if sale_in.serial_number_right: assignment.serial_number_right = sale_in.serial_number_right
    
    db.add(assignment)
    
    # 6. Update Inventory
    # Should decrease by quantity? Sales usually 1 unless bulk?
    # Monolithic logic was -1 or raw update.
    _update_inventory_stock(db, product, 1, sale.id, access.user_id)
    
    db.commit()

    return ResponseEnvelope(
        data={
            "sale": sale.to_dict(),
            "warnings": warnings,
            "saleId": sale.id,
        },
        message="Sale created successfully",
    )

@router.put("/sales/{sale_id}", operation_id="updateSale")
def update_sale(
    sale_id: str,
    sale_in: SaleUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    access.require_permission("sales:write")
    
    sale = get_sale_or_404(db, sale_id, access)
    
    if sale_in.list_price_total is not None: sale.list_price_total = Decimal(str(sale_in.list_price_total))
    if sale_in.discount_amount is not None: sale.discount_amount = Decimal(str(sale_in.discount_amount))
    if sale_in.sgk_coverage is not None: sale.sgk_coverage = Decimal(str(sale_in.sgk_coverage))
    if sale_in.patient_payment is not None: sale.patient_payment = Decimal(str(sale_in.patient_payment))
    if sale_in.final_amount is not None: 
        sale.final_amount = Decimal(str(sale_in.final_amount))
        sale.total_amount = sale.final_amount # Logic from legacy
        
    if sale_in.payment_method: sale.payment_method = sale_in.payment_method
    if sale_in.status: sale.status = sale_in.status
    if sale_in.notes: sale.notes = sale_in.notes
    
    db.commit()

    return ResponseEnvelope(data=sale.to_dict(), message="Sale updated")

@router.post("/sales/recalc", operation_id="recalcSales", response_model=ResponseEnvelope[SaleRecalcResponse])
def recalc_sales(
    payload: SaleRecalcRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Recalculate SGK and patient payment amounts for sales."""
    from services.pricing import calculate_device_pricing
    
    # Get settings
    settings = _get_settings(db, access.tenant_id)
    
    # Filter sales
    query = db.query(Sale)
    if access.tenant_id:
        query = query.filter(Sale.tenant_id == access.tenant_id)
        
    if payload.sale_id:
        query = query.filter(Sale.id == payload.sale_id)
        
    if payload.patient_id:
        query = query.filter(Sale.patient_id == payload.patient_id)
        
    query = query.order_by(desc(Sale.sale_date))
    
    if payload.limit:
        sales = query.limit(payload.limit).all()
    else:
        sales = query.all()
        
    updated = 0
    processed = 0
    errors = []
    
    for s in sales:
        processed += 1
        try:
            # Get Assignments
            assignments = db.query(DeviceAssignment).filter(DeviceAssignment.sale_id == s.id).all()
            
            # Legacy link check
            if not assignments:
                 linked_ids = [lid for lid in [s.right_ear_assignment_id, s.left_ear_assignment_id] if lid]
                 if linked_ids:
                     assignments = db.query(DeviceAssignment).filter(DeviceAssignment.id.in_(linked_ids)).all()
            
            if not assignments:
                continue
                
            # Prepare payload for calculation
            device_assignments_payload = []
            sgk_scheme = None
            
            for a in assignments:
                # Determine SGK scheme
                if not sgk_scheme and a.sgk_scheme:
                    sgk_scheme = a.sgk_scheme
                    
                device_assignments_payload.append({
                    'device_id': a.device_id,
                    'inventoryId': a.inventory_id,
                    'base_price': float(a.list_price or 0),
                    'discount_type': a.discount_type,
                    'discount_value': float(a.discount_value or 0),
                    'sgk_scheme': a.sgk_scheme,
                    'ear': a.ear
                })
                
            if not sgk_scheme:
                sgk_scheme = settings.get('sgk', {}).get('default_scheme', 'standard')
                
            # Calculate
            pricing_calc = calculate_device_pricing(
                device_assignments=device_assignments_payload,
                accessories=[],
                services=[],
                sgk_scheme=sgk_scheme,
                settings=settings
            )
            
            # Update Sale
            s.list_price_total = Decimal(str(pricing_calc.get('total_amount', 0)))
            s.total_amount = Decimal(str(pricing_calc.get('total_amount', 0)))
            s.discount_amount = Decimal(str(pricing_calc.get('total_discount', 0)))
            s.final_amount = Decimal(str(pricing_calc.get('sale_price_total', 0)))
            s.sgk_coverage = Decimal(str(pricing_calc.get('sgk_coverage_amount', 0)))
            s.patient_payment = Decimal(str(pricing_calc.get('patient_responsible_amount', 0)))
            
            db.add(s)
            updated += 1
            
        except Exception as e:
            errors.append({'saleId': s.id, 'error': str(e)})
            logger.error(f"Error recalculating sale {s.id}: {e}")
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Commit failed: {e}")
        
    return ResponseEnvelope(
        data=SaleRecalcResponse(
            success=True,
            updated=updated,
            processed=processed,
            errors=errors,
            timestamp=datetime.utcnow()
        )
    )


# ============= DEVICE ASSIGNMENT ENDPOINTS =============

def _get_settings(db: Session, tenant_id: str = None) -> Dict[str, Any]:
    """Load pricing settings from database or return defaults."""
    # Try to load from settings table if exists
    try:
        from models.system import Settings
        # Settings is currently system-wide
        settings_record = db.get(Settings, 'system_settings')
        if not settings_record:
            settings_record = db.query(Settings).first()
            
        if settings_record and settings_record.settings_json:
            return settings_record.settings_json
    except Exception:
        pass
    
    # Return default settings
    return {
        'sgk': {
            'default_scheme': 'standard',
            'schemes': {
                'standard': {'coverage_amount': 0, 'max_amount': 0},
                'raporlu': {'coverage_amount': 5000, 'max_amount': 10000},
                'raporsuz': {'coverage_amount': 0, 'max_amount': 0}
            }
        },
        'pricing': {
            'tolerance': 0.01,
            'accessories': {},
            'services': {}
        },
        'payment': {
            'plans': {
                'installment_3': {'installments': 3, 'interest_rate': 0},
                'installment_6': {'installments': 6, 'interest_rate': 0},
                'installment_12': {'installments': 12, 'interest_rate': 0}
            }
        }
    }


def _create_single_device_assignment(
    db: Session,
    assignment_data: Dict[str, Any],
    patient_id: str,
    sale_id: str,
    sgk_scheme: str,
    pricing_calculation: Dict[str, Any],
    index: int,
    tenant_id: str,
    branch_id: str = None,
    created_by: str = None
) -> tuple:
    """Create a single device assignment. Returns (assignment, error, warning)."""
    from models.device import Device
    from services.stock_service import create_stock_movement
    
    inventory_id = assignment_data.get('inventory_id') or assignment_data.get('inventoryId')
    inventory_item = None
    virtual_device = None
    warning = None
    
    if inventory_id:
        inventory_item = db.get(InventoryItem, inventory_id)
        if not inventory_item:
            return None, f"Inventory item not found: {inventory_id}", None
    else:
        # Manual assignment
        manual_brand = assignment_data.get('manual_brand') or assignment_data.get('manualBrand')
        manual_model = assignment_data.get('manual_model') or assignment_data.get('manualModel')
        
        if manual_brand and manual_model:
            virtual_device = Device(
                tenant_id=tenant_id,
                patient_id=patient_id,
                brand=manual_brand,
                model=manual_model,
                device_type='HEARING_AID',
                status='ASSIGNED',
                ear=assignment_data.get('ear') or 'LEFT',
                serial_number=assignment_data.get('serial_number') or assignment_data.get('serialNumber'),
                notes="Manually assigned device"
            )
            db.add(virtual_device)
            db.flush()
        else:
            return None, "Inventory ID or Manual Brand/Model required for assignment", None
    
    # Get pricing from calculation
    base_price = float(assignment_data.get('base_price') or assignment_data.get('basePrice') or 
                       (inventory_item.price if inventory_item else 0) or 0)
    
    per_item_list = pricing_calculation.get('per_item', [])
    sgk_support = 0.0
    final_sale_price = base_price
    
    if per_item_list and index < len(per_item_list):
        per = per_item_list[index]
        sgk_support = float(per.get('sgk_support', 0) or 0)
        final_sale_price = float(per.get('sale_price', base_price) or base_price)
    
    # Allow explicit overrides
    if assignment_data.get('sale_price') is not None or assignment_data.get('salePrice') is not None:
        final_sale_price = float(assignment_data.get('sale_price') or assignment_data.get('salePrice'))
    if assignment_data.get('sgk_support') is not None or assignment_data.get('sgkSupport') is not None:
        sgk_support = float(assignment_data.get('sgk_support') or assignment_data.get('sgkSupport'))
    
    net_payable = final_sale_price
    if assignment_data.get('patient_payment') is not None or assignment_data.get('patientPayment') is not None:
        net_payable = float(assignment_data.get('patient_payment') or assignment_data.get('patientPayment'))
    
    # Create assignment
    assignment = DeviceAssignment(
        tenant_id=tenant_id,
        branch_id=branch_id,
        patient_id=patient_id,
        device_id=virtual_device.id if virtual_device else inventory_id,
        sale_id=sale_id,
        ear=assignment_data.get('ear') or 'both',
        reason=assignment_data.get('reason', 'Sale'),
        from_inventory=(inventory_item is not None),
        inventory_id=inventory_id,
        list_price=base_price,
        sale_price=final_sale_price,
        sgk_scheme=sgk_scheme,
        sgk_support=sgk_support,
        discount_type=assignment_data.get('discount_type') or assignment_data.get('discountType'),
        discount_value=assignment_data.get('discount_value') or assignment_data.get('discountValue'),
        net_payable=net_payable,
        payment_method=assignment_data.get('payment_method') or assignment_data.get('paymentMethod') or 'cash',
        notes=assignment_data.get('notes', ''),
        serial_number=assignment_data.get('serial_number') or assignment_data.get('serialNumber'),
        serial_number_left=assignment_data.get('serial_number_left') or assignment_data.get('serialNumberLeft'),
        serial_number_right=assignment_data.get('serial_number_right') or assignment_data.get('serialNumberRight'),
        report_status=assignment_data.get('report_status') or assignment_data.get('reportStatus'),
        delivery_status=assignment_data.get('delivery_status') or assignment_data.get('deliveryStatus') or 'pending',
        is_loaner=assignment_data.get('is_loaner') or assignment_data.get('isLoaner') or False,
        loaner_inventory_id=assignment_data.get('loaner_inventory_id') or assignment_data.get('loanerInventoryId'),
        loaner_serial_number=assignment_data.get('loaner_serial_number') or assignment_data.get('loanerSerialNumber'),
        loaner_serial_number_left=assignment_data.get('loaner_serial_number_left') or assignment_data.get('loanerSerialNumberLeft'),
        loaner_serial_number_right=assignment_data.get('loaner_serial_number_right') or assignment_data.get('loanerSerialNumberRight'),
        loaner_brand=assignment_data.get('loaner_brand') or assignment_data.get('loanerBrand'),
        loaner_model=assignment_data.get('loaner_model') or assignment_data.get('loanerModel'),
        assignment_uid=f"ATM-{uuid4().hex[:6].upper()}"
    )
    
    db.add(assignment)
    db.flush()
    
    # Stock movement only if delivered
    if str(assignment.delivery_status) == 'delivered' and inventory_item:
        assigned_serial = assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right
        ear_val = str(assignment.ear or '').lower()
        qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
        
        if assigned_serial:
            # Serialized item
            if hasattr(inventory_item, 'remove_serial_number'):
                inventory_item.remove_serial_number(assigned_serial)
            create_stock_movement(
                inventory_id=inventory_item.id,
                movement_type="sale",
                quantity=-1,
                tenant_id=inventory_item.tenant_id,
                serial_number=assigned_serial,
                transaction_id=sale_id,
                created_by=created_by,
                session=db
            )
        else:
            # Non-serialized
            if hasattr(inventory_item, 'update_inventory'):
                inventory_item.update_inventory(-qty, allow_negative=True)
            create_stock_movement(
                inventory_id=inventory_item.id,
                movement_type="sale",
                quantity=-qty,
                tenant_id=inventory_item.tenant_id,
                serial_number=None,
                transaction_id=sale_id,
                created_by=created_by,
                session=db
            )
            
            if inventory_item.available_inventory < 0:
                warning = f"Stok yetersiz ({inventory_item.available_inventory}). Satış yine de gerçekleştirildi."
    
    # Loaner tracking
    if assignment.is_loaner and assignment.loaner_inventory_id:
        try:
            loaner_item = db.get(InventoryItem, assignment.loaner_inventory_id)
            if loaner_item:
                ear_val = str(assignment.ear or '').lower()
                qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
                
                if hasattr(loaner_item, 'update_inventory'):
                    loaner_item.update_inventory(-qty, allow_negative=True)
                
                create_stock_movement(
                    inventory_id=loaner_item.id,
                    movement_type="loaner_out",
                    quantity=-qty,
                    tenant_id=loaner_item.tenant_id,
                    serial_number=assignment.loaner_serial_number,
                    transaction_id=assignment.id,
                    created_by=created_by,
                    session=db
                )
        except Exception as e:
            logger.error(f"Error tracking loaner stock: {e}")
    
    return assignment, None, warning


@router.post("/patients/{patient_id}/device-assignments", operation_id="createPatientDeviceAssignments", response_model=ResponseEnvelope[DeviceAssignmentCreateResponse])
def create_device_assignments(
    patient_id: str,
    data: DeviceAssignmentCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """
    Assign devices to a patient with sale record creation.
    
    This is the main endpoint for device assignment workflow:
    1. Creates a Sale record
    2. Creates DeviceAssignment records for each device
    3. Handles pricing calculation (SGK, discounts)
    4. Manages stock movements (if delivery_status is 'delivered')
    5. Creates payment plan if needed
    """
    from services.pricing import calculate_device_pricing, create_payment_plan
    
    access.require_permission("sales:create")
    
    # Validate patient
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        )
    if access.tenant_id and patient.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Access denied", code="FORBIDDEN").model_dump(mode="json"),
        )
    
    device_assignments = data.device_assignments
    if not device_assignments:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="At least one device assignment required", code="NO_DEVICES").model_dump(mode="json"),
        )
    
    tenant_id = access.tenant_id or patient.tenant_id
    branch_id = data.branch_id or access.branch_id
    settings = _get_settings(db, tenant_id)
    sgk_scheme = data.sgk_scheme or settings.get('sgk', {}).get('default_scheme', 'standard')
    payment_plan_type = data.payment_plan or 'cash'
    
    # Build sanitized assignments for pricing calculation
    sanitized_assignments = []
    for a in device_assignments:
        sanitized_assignments.append({
            'inventoryId': a.inventory_id,
            'base_price': a.base_price,
            'discount_type': a.discount_type,
            'discount_value': a.discount_value,
            'sgk_scheme': a.sgk_scheme,
            'ear': a.ear
        })
    
    # Calculate pricing
    pricing_calculation = calculate_device_pricing(
        device_assignments=sanitized_assignments,
        accessories=data.accessories or [],
        services=data.services or [],
        sgk_scheme=sgk_scheme,
        settings=settings
    )
    
    # Create sale record
    sale_id = gen_sale_id(db)
    sale = Sale(
        id=sale_id,
        tenant_id=tenant_id,
        branch_id=branch_id,
        patient_id=patient_id,
        list_price_total=pricing_calculation['total_amount'],
        total_amount=pricing_calculation['total_amount'],
        discount_amount=pricing_calculation['total_discount'],
        final_amount=pricing_calculation['sale_price_total'],
        sgk_coverage=pricing_calculation['sgk_coverage_amount'],
        patient_payment=pricing_calculation['patient_responsible_amount'],
        paid_amount=0,
        payment_method=payment_plan_type if payment_plan_type != 'cash' else 'cash',
        status='pending',
        sale_date=datetime.utcnow()
    )
    db.add(sale)
    db.flush()
    
    # Create device assignments
    created_assignment_ids = []
    warnings = []
    
    for i, assignment_data in enumerate(device_assignments):
        # Convert Pydantic model to dict
        a_dict = assignment_data.model_dump(by_alias=False)
        
        assignment, error, warning = _create_single_device_assignment(
            db=db,
            assignment_data=a_dict,
            patient_id=patient_id,
            sale_id=sale.id,
            sgk_scheme=sgk_scheme,
            pricing_calculation=pricing_calculation,
            index=i,
            tenant_id=tenant_id,
            branch_id=branch_id,
            created_by=access.user_id
        )
        
        if error:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=ApiError(message=error, code="ASSIGNMENT_ERROR").model_dump(mode="json"),
            )
        
        if warning:
            warnings.append(warning)
        
        created_assignment_ids.append(assignment.id)
        
        # Update sale ear assignments
        ear_val = (assignment.ear or '').lower()
        if ear_val.startswith('r') or ear_val == 'right':
            sale.right_ear_assignment_id = assignment.id
        elif ear_val.startswith('l') or ear_val == 'left':
            sale.left_ear_assignment_id = assignment.id
        else:
            if not sale.right_ear_assignment_id:
                sale.right_ear_assignment_id = assignment.id
            elif not sale.left_ear_assignment_id:
                sale.left_ear_assignment_id = assignment.id
    
    # Create payment plan if needed
    if payment_plan_type != 'cash':
        payment_plan = create_payment_plan(
            sale_id=sale.id,
            plan_type=payment_plan_type,
            amount=pricing_calculation['patient_responsible_amount'],
            settings=settings,
            tenant_id=tenant_id,
            branch_id=branch_id
        )
        db.add(payment_plan)
    
    db.commit()
    
    logger.info(f"Device assignments created for patient {patient_id}: sale={sale.id}, assignments={created_assignment_ids}")
    
    return ResponseEnvelope(
        data={
            "saleId": sale.id,
            "assignmentIds": created_assignment_ids,
            "pricing": pricing_calculation,
            "warnings": warnings
        },
        message="Device assignments created successfully"
    )


@router.patch("/device-assignments/{assignment_id}", operation_id="updateDeviceAssignment")
def update_device_assignment(
    assignment_id: str,
    updates: DeviceAssignmentUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """
    Update a device assignment with full legacy logic:
    - Pricing recalculation when base_price, discount, sgk_scheme change
    - Sale totals sync after updates
    - Delivery status change handling (stock deduction when changed to 'delivered')
    - Report status updates
    - Loaner device management (add/remove/swap loaner with stock tracking)
    - Serial number updates
    - Down payment sync to PaymentRecord
    - Status cancellation with stock return
    """
    from services.device_assignment_service import (
        ensure_loaner_serials_in_inventory,
        load_sgk_amounts,
        recalculate_assignment_pricing,
        sync_sale_totals
    )
    
    access.require_permission("sales:write")
    
    assignment = db.get(DeviceAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Assignment not found", code="ASSIGNMENT_NOT_FOUND").model_dump(mode="json"),
        )
    
    # Tenant check via sale
    if assignment.sale_id:
        sale = db.get(Sale, assignment.sale_id)
        if sale and access.tenant_id and sale.tenant_id != access.tenant_id:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Access denied", code="FORBIDDEN").model_dump(mode="json"),
            )
    
    # Convert Pydantic model to dict for easier processing
    data = updates.model_dump(exclude_unset=True, by_alias=False)
    logger.info(f"📝 UPDATE DEVICE {assignment_id} PAYLOAD: {json.dumps(data, default=str)}")
    
    # Initialize defaults for bilateral logic
    initial_ear_val = str(assignment.ear or '').upper()
    quantity = 2 if initial_ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
    
    # ==================== STATUS HANDLING (CANCEL/RETURN) ====================
    if 'status' in data:
        status_val = data['status']
        assignment.notes = (assignment.notes or '') + f"\n[İptal edildi: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]"
        
        # Stock Return Logic
        if status_val in ['cancelled', 'returned'] and assignment.inventory_id:
            inv_item = db.get(InventoryItem, assignment.inventory_id)
            if inv_item:
                # Decide if serial or quantity
                serial_to_restore = assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right
                
                restored = False
                if serial_to_restore:
                    restored = inv_item.add_serial_number(serial_to_restore)
                else:
                    # Quantity
                    ear_val = str(assignment.ear or '').lower()
                    qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
                    restored = inv_item.update_inventory(qty)
                
                if restored:
                    create_stock_movement(
                        inventory_id=inv_item.id,
                        movement_type="return",
                        quantity=1 if serial_to_restore else qty,
                        tenant_id=inv_item.tenant_id,
                        serial_number=serial_to_restore,
                        transaction_id=assignment.sale_id or assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
    
    # ==================== BASIC FIELD UPDATES ====================
    if 'ear_side' in data:
        assignment.ear = data['ear_side']
    
    if 'reason' in data:
        assignment.reason = data['reason']
    
    if 'device_id' in data:
        assignment.device_id = data['device_id']
    
    if 'inventory_id' in data:
        assignment.inventory_id = data['inventory_id']
    
    # Update pricing fields
    if 'base_price' in data:
        assignment.list_price = data['base_price']
    
    if 'discount_type' in data:
        assignment.discount_type = data['discount_type']
    
    if 'discount_value' in data:
        assignment.discount_value = data['discount_value']
    
    if 'payment_method' in data:
        assignment.payment_method = data['payment_method']
    
    if 'notes' in data:
        assignment.notes = data['notes']
    
    if 'sgk_scheme' in data:
        assignment.sgk_scheme = data['sgk_scheme']
    elif 'sgkSupportType' in data:
        assignment.sgk_scheme = data['sgkSupportType']
    
    # ==================== PRICING RECALCULATION ====================
    # Simple check: if any pricing field is in the request, recalculate
    pricing_fields = ['base_price', 'discount_type', 'discount_value', 'sgk_scheme', 'sgkSupportType']
    should_recalculate = any(key in data for key in pricing_fields)
    
    logger.info(f"🔢 Pricing recalculation check: {should_recalculate}, data keys: {list(data.keys())}")
    
    # Check for explicit pricing overrides
    explicit_sale_price = data.get('sale_price')
    explicit_patient_payment = data.get('patient_payment')
    explicit_sgk = data.get('sgk_reduction') or data.get('sgkSupport')
    
    if explicit_sale_price is not None or explicit_patient_payment is not None or explicit_sgk is not None:
        # Apply explicit pricing selectively
        if explicit_sgk is not None:
            assignment.sgk_support = Decimal(str(explicit_sgk))
        
        if explicit_patient_payment is not None:
            assignment.net_payable = Decimal(str(explicit_patient_payment))
        
        if explicit_sale_price is not None:
            assignment.sale_price = Decimal(str(explicit_sale_price))
        
        logger.info(f"✅ Selectively applied explicit pricing: sale_price={explicit_sale_price}, patient_payment={explicit_patient_payment}, sgk={explicit_sgk}")
    elif should_recalculate:
        recalculate_assignment_pricing(db, assignment)
    
    # ==================== SALE SYNC (DOWN PAYMENT & TOTALS) ====================
    if assignment.sale_id:
        try:
            sale = db.get(Sale, assignment.sale_id)
            if sale:
                # Sync down payment
                if 'down_payment' in data:
                    try:
                        down_val = float(data.get('down_payment', 0))
                        if down_val >= 0:
                            sale.paid_amount = down_val
                            
                            # Create or Update PaymentRecord for Down Payment
                            payment = db.query(PaymentRecord).filter_by(
                                sale_id=sale.id, 
                                payment_type='down_payment'
                            ).first()
                            
                            if payment:
                                payment.amount = Decimal(str(down_val))
                                payment.updated_at = datetime.utcnow()
                                logger.info(f"✅ Updated existing down payment record: {payment.id} -> {down_val}")
                            else:
                                if down_val > 0:
                                    payment = PaymentRecord(
                                        id=f"pay_{uuid4().hex}",
                                        tenant_id=sale.tenant_id,
                                        branch_id=sale.branch_id,
                                        patient_id=sale.patient_id,
                                        sale_id=sale.id,
                                        amount=Decimal(str(down_val)),
                                        payment_date=datetime.utcnow(),
                                        payment_method=assignment.payment_method or 'cash',
                                        payment_type='down_payment',
                                        status='paid',
                                        notes='Peşinat (Cihaz Düzenleme)'
                                    )
                                    db.add(payment)
                                    logger.info(f"✅ Created new down payment record for: {down_val}")
                    except Exception as e:
                        logger.error(f"Failed to sync down payment: {e}")
                
                # Sync sale totals
                sync_sale_totals(db, sale.id)
        except Exception as e:
            logger.warning(f"Failed to sync sale record: {e}")
    
    # ==================== SERIAL NUMBER UPDATES ====================
    if 'serial_number' in data:
        assignment.serial_number = data['serial_number']
    
    if 'serial_number_left' in data:
        assignment.serial_number_left = data['serial_number_left']
    
    if 'serial_number_right' in data:
        assignment.serial_number_right = data['serial_number_right']
    
    # ==================== DELIVERY STATUS HANDLING ====================
    if 'delivery_status' in data:
        new_delivery_status = data.get('delivery_status')
        old_delivery_status = assignment.delivery_status
        
        # If changing from pending to delivered, decrease stock
        if old_delivery_status != 'delivered' and new_delivery_status == 'delivered':
            if assignment.inventory_id:
                inv_item = db.get(InventoryItem, assignment.inventory_id)
                if inv_item:
                    # Determine quantity based on ear
                    ear_val = str(assignment.ear or '').upper()
                    qty = 2 if ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
                    
                    # Decrease stock
                    if not inv_item.update_inventory(-qty, allow_negative=False):
                        raise HTTPException(
                            status_code=400,
                            detail=ApiError(
                                message=f'Stok yetersiz! Mevcut stok: {inv_item.available_inventory}',
                                code="INSUFFICIENT_STOCK"
                            ).model_dump(mode="json"),
                        )
                    
                    create_stock_movement(
                        inventory_id=inv_item.id,
                        movement_type="delivery",
                        quantity=-qty,
                        tenant_id=inv_item.tenant_id,
                        serial_number=assignment.serial_number,
                        transaction_id=assignment.sale_id or assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
                    logger.info(f"📦 Delivery status changed to delivered - stock decreased by {qty}")
        
        assignment.delivery_status = new_delivery_status
    
    # ==================== REPORT STATUS ====================
    if 'report_status' in data:
        assignment.report_status = data.get('report_status')
    
    # ==================== LOANER DEVICE MANAGEMENT ====================
    if 'is_loaner' in data:
        new_is_loaner = data.get('is_loaner')
        old_is_loaner = assignment.is_loaner
        
        # If adding loaner device
        if not old_is_loaner and new_is_loaner:
            loaner_inventory_id = data.get('loaner_inventory_id')
            
            if loaner_inventory_id:
                loaner_item = db.get(InventoryItem, loaner_inventory_id)
                
                if loaner_item:
                    # Update assignment with loaner info
                    assignment.is_loaner = True
                    assignment.loaner_inventory_id = loaner_item.id
                    assignment.loaner_brand = loaner_item.brand
                    assignment.loaner_model = loaner_item.model
                    
                    # Determine if bilateral
                    ear_val = str(assignment.ear or '').lower()
                    is_bilateral = ear_val in ['both', 'bilateral', 'b']
                    
                    if is_bilateral:
                        assignment.loaner_serial_number_left = data.get('loaner_serial_number_left')
                        assignment.loaner_serial_number_right = data.get('loaner_serial_number_right')
                    else:
                        assignment.loaner_serial_number = data.get('loaner_serial_number')
                    
                    # Ensure manual serials are in inventory
                    ensure_loaner_serials_in_inventory(db, assignment, data.get('user_id', 'system'))
                    
                    # Process stock deduction
                    qty_needed = 2 if is_bilateral else 1
                    
                    serials_to_process = []
                    if is_bilateral:
                        if assignment.loaner_serial_number_left:
                            serials_to_process.append(assignment.loaner_serial_number_left)
                        if assignment.loaner_serial_number_right:
                            serials_to_process.append(assignment.loaner_serial_number_right)
                    else:
                        if assignment.loaner_serial_number:
                            serials_to_process.append(assignment.loaner_serial_number)
                    
                    # Deduct based on serials first
                    deducted_count = 0
                    consumed_serials = []
                    for s in serials_to_process:
                        if s and loaner_item.remove_serial_number(s):
                            deducted_count += 1
                            consumed_serials.append(s)
                    
                    # Deduct remaining count from anonymous stock
                    remaining_to_deduct = qty_needed - deducted_count
                    if remaining_to_deduct > 0:
                        loaner_item.update_inventory(-remaining_to_deduct, allow_negative=True)
                    
                    # Log movement
                    create_stock_movement(
                        inventory_id=loaner_item.id,
                        movement_type="loaner_out",
                        quantity=-qty_needed,
                        tenant_id=loaner_item.tenant_id,
                        serial_number=",".join(consumed_serials) if consumed_serials else None,
                        transaction_id=assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
                    logger.info(f"🔄 Loaner device assigned: {loaner_item.name} (Bilateral: {is_bilateral}, Qty: {qty_needed})")
            else:
                # Manual assignment without inventory link
                assignment.is_loaner = True
        
        # If removing loaner device (returning to stock)
        elif old_is_loaner and not new_is_loaner:
            if assignment.loaner_inventory_id:
                loaner_item = db.get(InventoryItem, assignment.loaner_inventory_id)
                
                if loaner_item:
                    # Determine qty
                    ear_val = str(assignment.ear or '').lower()
                    qty = 2 if ear_val in ['both', 'bilateral', 'b'] else 1
                    
                    # Return loaner to stock
                    loaner_item.update_inventory(qty)
                    
                    create_stock_movement(
                        inventory_id=loaner_item.id,
                        movement_type="loaner_return",
                        quantity=qty,
                        tenant_id=loaner_item.tenant_id,
                        serial_number=assignment.loaner_serial_number,
                        transaction_id=assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
                    
                    logger.info(f"↩️ Loaner device returned to stock: {loaner_item.brand} {loaner_item.model}")
            
            # Clear loaner fields
            assignment.is_loaner = False
            assignment.loaner_inventory_id = None
            assignment.loaner_serial_number = None
            assignment.loaner_serial_number_left = None
            assignment.loaner_serial_number_right = None
            assignment.loaner_brand = None
            assignment.loaner_model = None
    
    # ==================== LOANER SWAP / FIELD UPDATES ====================
    if assignment.is_loaner:
        new_loaner_inventory_id = data.get('loaner_inventory_id')
        if new_loaner_inventory_id:
            old_loaner_inventory_id = assignment.loaner_inventory_id
            
            # Only process swap if loaner is actually changing
            if old_loaner_inventory_id and old_loaner_inventory_id != new_loaner_inventory_id:
                # 1. Return OLD loaner to stock
                old_loaner = db.get(InventoryItem, old_loaner_inventory_id)
                if old_loaner:
                    ear_val = str(assignment.ear or '').lower()
                    qty = 2 if ear_val in ['both', 'bilateral', 'b'] else 1
                    
                    # Get OLD serial numbers
                    old_serials = []
                    if ear_val in ['both', 'bilateral', 'b']:
                        if assignment.loaner_serial_number_left:
                            old_serials.append(assignment.loaner_serial_number_left)
                            old_loaner.add_serial_number(assignment.loaner_serial_number_left)
                        if assignment.loaner_serial_number_right:
                            old_serials.append(assignment.loaner_serial_number_right)
                            old_loaner.add_serial_number(assignment.loaner_serial_number_right)
                    else:
                        if assignment.loaner_serial_number:
                            old_serials.append(assignment.loaner_serial_number)
                            old_loaner.add_serial_number(assignment.loaner_serial_number)
                    
                    # If no serials, just add quantity back
                    if not old_serials:
                        old_loaner.update_inventory(qty)
                    
                    create_stock_movement(
                        inventory_id=old_loaner.id,
                        movement_type="loaner_return",
                        quantity=qty,
                        tenant_id=old_loaner.tenant_id,
                        serial_number=",".join(old_serials) if old_serials else None,
                        transaction_id=assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
                    logger.info(f"↩️ OLD loaner returned to stock: {old_loaner.name} (qty={qty}, serials={old_serials})")
                
                # 2. Deduct NEW loaner from stock
                new_loaner = db.get(InventoryItem, new_loaner_inventory_id)
                if new_loaner:
                    ear_val = str(assignment.ear or '').lower()
                    qty = 2 if ear_val in ['both', 'bilateral', 'b'] else 1
                    
                    # Get NEW serial numbers from request data
                    new_serials = []
                    if ear_val in ['both', 'bilateral', 'b']:
                        new_left = data.get('loaner_serial_number_left')
                        new_right = data.get('loaner_serial_number_right')
                        if new_left:
                            new_serials.append(new_left)
                            new_loaner.remove_serial_number(new_left)
                        if new_right:
                            new_serials.append(new_right)
                            new_loaner.remove_serial_number(new_right)
                    else:
                        new_sn = data.get('loaner_serial_number')
                        if new_sn:
                            new_serials.append(new_sn)
                            new_loaner.remove_serial_number(new_sn)
                    
                    # If no serials consumed, deduct quantity
                    remaining = qty - len(new_serials)
                    if remaining > 0:
                        new_loaner.update_inventory(-remaining, allow_negative=True)
                    
                    create_stock_movement(
                        inventory_id=new_loaner.id,
                        movement_type="loaner_out",
                        quantity=-qty,
                        tenant_id=new_loaner.tenant_id,
                        serial_number=",".join(new_serials) if new_serials else None,
                        transaction_id=assignment.id,
                        created_by=data.get('user_id', 'system'),
                        session=db
                    )
                    
                    # Update assignment with new loaner info
                    assignment.loaner_inventory_id = new_loaner_inventory_id
                    assignment.loaner_brand = new_loaner.brand
                    assignment.loaner_model = new_loaner.model
                    logger.info(f"📦 NEW loaner assigned: {new_loaner.name} (qty={qty}, serials={new_serials})")
            
            elif not old_loaner_inventory_id:
                # First time setting loaner_inventory_id on existing loaner
                assignment.loaner_inventory_id = new_loaner_inventory_id
        
        # Update individual loaner fields (after swap is processed)
        if 'loaner_serial_number' in data:
            assignment.loaner_serial_number = data['loaner_serial_number']
        
        if 'loaner_brand' in data:
            assignment.loaner_brand = data['loaner_brand']
        
        if 'loaner_model' in data:
            assignment.loaner_model = data['loaner_model']
        
        if 'loaner_serial_number_left' in data:
            assignment.loaner_serial_number_left = data['loaner_serial_number_left']
        
        if 'loaner_serial_number_right' in data:
            assignment.loaner_serial_number_right = data['loaner_serial_number_right']
        
        # Ensure manual serials are in inventory if changed
        if assignment.loaner_inventory_id:
            ensure_loaner_serials_in_inventory(db, assignment, data.get('user_id', 'system'))
    
    # ==================== FINALIZE ====================
    assignment.updated_at = datetime.utcnow()
    
    logger.info(f"💾 COMMITTING UPDATE {assignment_id}: Report={assignment.report_status}, Delivery={assignment.delivery_status}, Loaner={assignment.is_loaner}")
    db.commit()
    
    return ResponseEnvelope(
        data=assignment.to_dict(),
        message="Assignment updated"
    )


@router.post("/device-assignments/{assignment_id}/return-loaner", operation_id="createDeviceAssignmentReturnLoaner")
def return_loaner_to_stock(
    assignment_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Return a loaner device to stock."""
    from services.stock_service import create_stock_movement
    
    access.require_permission("sales:write")
    
    assignment = db.get(DeviceAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Assignment not found", code="ASSIGNMENT_NOT_FOUND").model_dump(mode="json"),
        )
    
    if not assignment.is_loaner:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Assignment is not a loaner", code="NOT_LOANER").model_dump(mode="json"),
        )
    
    if not assignment.loaner_inventory_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="No loaner inventory ID", code="NO_LOANER_INVENTORY").model_dump(mode="json"),
        )
    
    loaner_item = db.get(InventoryItem, assignment.loaner_inventory_id)
    if not loaner_item:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Loaner inventory item not found", code="LOANER_NOT_FOUND").model_dump(mode="json"),
        )
    
    # Calculate quantity
    ear_val = str(assignment.ear or '').lower()
    qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
    
    # Return to stock
    if hasattr(loaner_item, 'update_inventory'):
        loaner_item.update_inventory(qty)
    else:
        loaner_item.available_inventory = (loaner_item.available_inventory or 0) + qty
    
    # Add serial back if applicable
    loaner_serials = []
    if assignment.loaner_serial_number:
        loaner_serials.append(assignment.loaner_serial_number)
    if assignment.loaner_serial_number_left:
        loaner_serials.append(assignment.loaner_serial_number_left)
    if assignment.loaner_serial_number_right:
        loaner_serials.append(assignment.loaner_serial_number_right)
    
    if loaner_serials and hasattr(loaner_item, 'add_serial_numbers'):
        loaner_item.add_serial_numbers(loaner_serials)
    
    # Stock movement
    create_stock_movement(
        inventory_id=loaner_item.id,
        movement_type="loaner_return",
        quantity=qty,
        tenant_id=loaner_item.tenant_id,
        serial_number=','.join(loaner_serials) if loaner_serials else None,
        transaction_id=assignment.id,
        created_by=access.user_id,
        session=db
    )
    
    # Clear loaner fields
    assignment.is_loaner = False
    assignment.loaner_inventory_id = None
    assignment.loaner_serial_number = None
    assignment.loaner_serial_number_left = None
    assignment.loaner_serial_number_right = None
    assignment.loaner_brand = None
    assignment.loaner_model = None
    assignment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return ResponseEnvelope(
        data=assignment.to_dict(),
        message="Loaner returned to stock"
    )


@router.post("/pricing-preview", operation_id="createPricingPreview")
def pricing_preview(
    data: DeviceAssignmentCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Preview pricing calculation without creating records."""
    from services.pricing import calculate_device_pricing
    
    tenant_id = access.tenant_id
    settings = _get_settings(db, tenant_id)
    sgk_scheme = data.sgk_scheme or settings.get('sgk', {}).get('default_scheme', 'standard')
    
    # Build sanitized assignments
    sanitized_assignments = []
    for a in data.device_assignments:
        sanitized_assignments.append({
            'inventoryId': a.inventory_id,
            'base_price': a.base_price,
            'discount_type': a.discount_type,
            'discount_value': a.discount_value,
            'sgk_scheme': a.sgk_scheme,
            'ear': a.ear
        })
    
    pricing = calculate_device_pricing(
        device_assignments=sanitized_assignments,
        accessories=data.accessories or [],
        services=data.services or [],
        sgk_scheme=sgk_scheme,
        settings=settings
    )
    
    return ResponseEnvelope(
        data=pricing,
        message="Pricing preview calculated"
    )
