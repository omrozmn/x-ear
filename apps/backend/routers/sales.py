import logging
import json
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from uuid import uuid4
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, text

from dependencies import get_db, get_current_context, AccessContext
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentRecord, PaymentInstallment
from models.patient import Patient
from models.inventory import InventoryItem
from models.invoice import Invoice

from schemas.sales import (
    SaleRead, SaleCreate, SaleUpdate, 
    PaymentRecordRead, PaymentRecordCreate, 
    PaymentPlanRead, PaymentPlanCreate,
    DeviceAssignmentRead, DeviceAssignmentUpdate
)
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError

# Logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Sales"])

# ============= HELPER FUNCTIONS =============

def get_sale_or_404(db: Session, sale_id: str, ctx: AccessContext) -> Sale:
    sale = db.session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Sale not found", code="SALE_NOT_FOUND").model_dump(mode="json"),
        )
    if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
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
    device = db.session.get(Device, assignment.device_id)
    if not device:
        return None
        
    if device.inventory_id:
        inv_item = db.session.get(InventoryItem, device.inventory_id)
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

@router.get("/sales", response_model=ResponseEnvelope[List[SaleRead]])
def get_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    """Get all sales with tenant scoping."""
    ctx.require_resource_permission("sales", "read")
    
    query = db.query(Sale)
    
    if ctx.tenant_id:
        query = query.filter(Sale.tenant_id == ctx.tenant_id)
        
        # Branch scoping for Tenant Users (if admin role check logic applies)
        if ctx.is_tenant_admin and ctx.user.role == 'admin':
             # Replicate logic: if user has branches, filter by them
             user_branch_ids = [b.id for b in getattr(ctx.user, 'branches', [])]
             if user_branch_ids:
                 query = query.filter(Sale.branch_id.in_(user_branch_ids))
             elif getattr(ctx.user, 'branches', []):
                 # Has branches attribute but empty list? OR if user is restricted?
                 # Should probably return empty if they are assigned branches but none match
                 # Logic in read.py: "if user_branch_ids: filter... else: return empty"
                 # Only if they ARE assigned branches. If branches is empty list, maybe they see all?
                 # Flask logic: `if ctx.user.branches` -> filter.
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
    # SaleRead expects a strict structure. Pydantic can load from ORM.
    # But we might need to populate 'patient' if we want it embedded.
    results = []
    for s in items:
        # We ensure patient is loaded or dict is created
        s_dto = s # ORM object
        results.append(s_dto)

    return ResponseEnvelope(
        data=results,
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": (total + per_page - 1) // per_page,
        },
    )

@router.get("/patients/{patient_id}/sales", operation_id="get_patient_sales_from_sales_router")
def get_patient_sales(
    patient_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    """Get sales for specific patient."""
    # Check patient access
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
        )
        
    query = db.query(Sale).filter(Sale.patient_id == patient_id).order_by(desc(Sale.created_at))
    
    total = query.count()
    sales = query.offset((page - 1) * per_page).limit(per_page).all()
    
    sales_data = []
    for sale in sales:
        # Build complex object as per read.py logic
        
        # 1. Assignments
        assignments = db.query(DeviceAssignment).filter(DeviceAssignment.sale_id == sale.id).all()
        if not assignments:
             # Legacy fallback
             lids = []
             if getattr(sale, 'right_ear_assignment_id', None): lids.append(sale.right_ear_assignment_id)
             if getattr(sale, 'left_ear_assignment_id', None): lids.append(sale.left_ear_assignment_id)
             if lids:
                 assignments = db.query(DeviceAssignment).filter(DeviceAssignment.id.in_(lids)).all()
                 
        devices = []
        for a in assignments:
            d_info = _build_device_info_with_lookup(a, db)
            if d_info: devices.append(d_info)
            
        # 2. Payment Plan
        plan = db.query(PaymentPlan).filter(PaymentPlan.sale_id == sale.id).first()
        plan_dict = None
        if plan:
            # Build plan dict manually or use schema dump
            # We can use our helper/schema later. For now, basic fields.
            # Using PaymentPlanRead from ORM would be easiest via Pydantic using .from_orm() but here we build dict.
            # We'll use a simple dict construction as placeholder or reuse _build_payment_plan_data if we port it.
            plan_dict = {
                'id': plan.id,
                'planType': plan.plan_type,
                'installmentCount': plan.installment_count,
                'totalAmount': float(plan.total_amount or 0),
                'status': plan.status
            }

        # 3. Payments
        payments = db.query(PaymentRecord).filter(PaymentRecord.sale_id == sale.id).order_by(desc(PaymentRecord.payment_date)).all()
        payments_data = []
        for p in payments:
            payments_data.append({
                'id': p.id,
                'amount': float(p.amount or 0),
                'paymentDate': p.payment_date.isoformat(),
                'paymentMethod': p.payment_method,
                'status': p.status
            })
            
        # 4. Invoice
        invoice = db.query(Invoice).filter(Invoice.sale_id == sale.id).first()
        
        # 5. SGK
        sgk_val = float(sale.sgk_coverage or 0)
        
        sales_data.append(_build_sale_data(sale, devices, plan_dict, payments_data, invoice, sgk_val))

    return ResponseEnvelope(
        data=sales_data,
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": (total + per_page - 1) // per_page,
        },
    )

# ============= PAYMENT ENDPOINTS =============

@router.get("/sales/{sale_id}/payments", response_model=ResponseEnvelope[Any])
def get_sale_payments(
    sale_id: str,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    sale = get_sale_or_404(db, sale_id, ctx)
    
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

@router.post("/sales/{sale_id}/payments")
def record_sale_payment(
    sale_id: str,
    payment_in: PaymentRecordCreate,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    ctx.require_resource_permission("sales", "write") # Assume write permission
    
    sale = get_sale_or_404(db, sale_id, ctx)
    
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
        raise HTTPException(400, f"Amount {amount} exceeds remaining {remaining}")
        
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
    
    db.session.add(payment)
    db.session.commit()

    return ResponseEnvelope(
        data={
            "id": payment.id,
            "status": "paid",
        },
        message="Payment recorded",
    )

@router.get("/sales/{sale_id}/payment-plan")
def get_sale_payment_plan(
    sale_id: str,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    sale = get_sale_or_404(db, sale_id, ctx)
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
    db.session.add(product)
    
    # Stock movement
    create_stock_movement(
        inventory_id=product.id,
        movement_type="sale",
        quantity=-qty,
        tenant_id=product.tenant_id,
        transaction_id=transaction_id,
        created_by=user_id,
        session=db.session
    )

# ============= WRITE ENDPOINTS =============

@router.post("/sales")
def create_sale(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    """Create a new sale."""
    ctx.require_resource_permission("sales", "create")
    
    # 1. Validate Patient
    patient = db.session.get(Patient, sale_in.patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        )
    if ctx.tenant_id and patient.tenant_id != ctx.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        ) # Cross-tenant protection
        
    # 2. Validate Product
    product = db.session.get(InventoryItem, sale_in.product_id)
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
    from models.base import gen_sale_id
    sale_id = gen_sale_id(tenant_id=ctx.tenant_id or patient.tenant_id)
    
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
        tenant_id=ctx.tenant_id or patient.tenant_id,
        branch_id=ctx.branch_id, # If applicable
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
    db.session.add(sale)
    db.session.flush() # Get ID
    
    # 5. Device Assignment
    assignment = DeviceAssignment(
        tenant_id=sale.tenant_id,
        patient_id=sale.patient_id,
        device_id=product.id,
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
    
    db.session.add(assignment)
    
    # 6. Update Inventory
    # Should decrease by quantity? Sales usually 1 unless bulk?
    # Monolithic logic was -1 or raw update.
    _update_inventory_stock(db, product, 1, sale.id, ctx.principal_id)
    
    db.session.commit()

    return ResponseEnvelope(
        data={
            "sale": sale.to_dict(),
            "warnings": warnings,
            "saleId": sale.id,
        },
        message="Sale created successfully",
    )

@router.put("/sales/{sale_id}")
def update_sale(
    sale_id: str,
    sale_in: SaleUpdate,
    db: Session = Depends(get_db),
    ctx: AccessContext = Depends(get_current_context)
):
    ctx.require_resource_permission("sales", "write")
    
    sale = get_sale_or_404(db, sale_id, ctx)
    
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
    
    db.session.commit()

    return ResponseEnvelope(data=sale.to_dict(), message="Sale updated")
