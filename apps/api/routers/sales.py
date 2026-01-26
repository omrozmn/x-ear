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
from core.models.party import Party
from models.inventory import InventoryItem
from models.invoice import Invoice
from services.stock_service import create_stock_movement
from services.device_assignment_service import DeviceAssignmentService
from services.event_service import event_service
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks

from schemas.sales import (
    SaleRead, SaleCreate, SaleUpdate, 
    PaymentRecordRead, PaymentRecordCreate, 
    PaymentPlanRead, PaymentPlanCreate, InstallmentPayment,
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

# ============= HELPER FUNCTIONS FOR FLASK PARITY =============

def _get_device_assignments_for_sale(db: Session, sale: Sale) -> List[DeviceAssignment]:
    """Get device assignments for a sale, trying new method first, then legacy."""
    assignments = db.query(DeviceAssignment).filter_by(sale_id=sale.id).all()
    
    # If no assignments found by sale_id, try legacy method
    if not assignments:
        linked_ids = [
            getattr(sale, 'right_ear_assignment_id', None),
            getattr(sale, 'left_ear_assignment_id', None)
        ]
        linked_ids = [lid for lid in linked_ids if lid]
        if linked_ids:
            assignments = db.query(DeviceAssignment).filter(DeviceAssignment.id.in_(linked_ids)).all()
    
    return assignments

def _calculate_sgk_coverage(db: Session, sale: Sale, assignments: List[DeviceAssignment]) -> float:
    """Calculate SGK coverage for a sale, recalculating if needed."""
    # If stored SGK coverage is zero, recalc from assignments
    if (not sale.sgk_coverage or abs(float(sale.sgk_coverage)) < 0.01) and assignments:
        try:
            # Simple recalculation from assignments
            total_sgk = sum(float(a.sgk_support or 0) for a in assignments)
            return total_sgk
        except Exception as e:
            logger.warning(f"Failed to recalculate SGK coverage: {e}")
            return 0.0
    return float(sale.sgk_coverage) if sale.sgk_coverage else 0.0

def _build_device_info_from_assignment(db: Session, assignment: DeviceAssignment) -> Dict[str, Any]:
    """Build device info from assignment with inventory lookup."""
    from models.device import Device
    
    device_name = None
    barcode = None
    brand = None
    model = None
    serial_number = None
    serial_number_left = None
    serial_number_right = None
    
    # Try device lookup first
    if assignment.device_id:
        device = db.get(Device, assignment.device_id)
        if device:
            brand = device.brand
            model = device.model
            serial_number = device.serial_number
            serial_number_left = device.serial_number_left
            serial_number_right = device.serial_number_right
            
            # Get inventory details if linked
            if device.inventory_id:
                inv_item = db.get(InventoryItem, device.inventory_id)
                if inv_item:
                    device_name = inv_item.name
                    barcode = inv_item.barcode
    
    # Try inventory lookup if no device
    if not brand and assignment.inventory_id:
        inv_item = db.get(InventoryItem, assignment.inventory_id)
        if inv_item:
            brand = inv_item.brand
            model = inv_item.model
            barcode = inv_item.barcode
            serial_number = inv_item.serial_number
    
    # Fallback for loaner devices
    if not brand:
        brand = assignment.loaner_brand or 'Unknown'
        model = assignment.loaner_model or 'Device'
    
    # Build device name
    name_parts = []
    if brand: name_parts.append(brand)
    if model: name_parts.append(model)
    formatted_name = " ".join(name_parts)
    if not formatted_name and device_name:
        formatted_name = device_name
    
    return {
        'id': assignment.device_id or assignment.inventory_id,
        'name': formatted_name,
        'brand': brand,
        'model': model,
        'serialNumber': serial_number or assignment.serial_number,
        'serialNumberLeft': serial_number_left or assignment.serial_number_left,
        'serialNumberRight': serial_number_right or assignment.serial_number_right,
        'barcode': barcode,
        'ear': assignment.ear,
        'listPrice': float(assignment.list_price) if assignment.list_price else None,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
        'sgk_coverage_amount': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
        'patient_responsible_amount': float(assignment.net_payable) if assignment.net_payable else None,
        # Backwards-compatible keys for frontend
        'sgkReduction': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
        'patientPayment': float(assignment.net_payable) if assignment.net_payable else None
    }

def _build_full_sale_data(db: Session, sale: Sale) -> Dict[str, Any]:
    """Build complete sale data with all enrichments - Flask parity."""
    # Get device assignments (new + legacy method)
    assignments = _get_device_assignments_for_sale(db, sale)
    
    # Build devices list
    devices = []
    for assignment in assignments:
        device_info = _build_device_info_from_assignment(db, assignment)
        if device_info:
            devices.append(device_info)
    
    # Get payment plan
    payment_plan = db.query(PaymentPlan).filter_by(sale_id=sale.id).first()
    payment_plan_data = None
    if payment_plan:
        # Manual dict construction instead of to_dict serialization
        payment_plan_data = {
            'id': payment_plan.id,
            'planName': payment_plan.plan_name,
            'totalAmount': float(payment_plan.total_amount) if payment_plan.total_amount else 0.0,
            'installmentCount': payment_plan.installment_count,
            'installments': payment_plan.installment_count, # Alias
            'installmentAmount': float(payment_plan.installment_amount) if payment_plan.installment_amount else None,
            'status': payment_plan.status,
            'startDate': payment_plan.start_date.isoformat() if payment_plan.start_date else None
        }
    
    # Get payment records
    payment_records = db.query(PaymentRecord).filter_by(sale_id=sale.id).order_by(desc(PaymentRecord.payment_date)).all()
    payments_data = []
    for p in payment_records:
        payments_data.append({
            'id': p.id,
            'amount': float(p.amount) if p.amount else 0.0,
            'paymentDate': p.payment_date.isoformat() if p.payment_date else None,
            'paymentMethod': p.payment_method,
            'paymentType': p.payment_type,
            'status': p.status or 'paid',
            'referenceNumber': p.reference_number,
            'notes': getattr(p, 'notes', None)
        })
    
    # Get invoice
    invoice = db.query(Invoice).filter_by(sale_id=sale.id).first()
    invoice_data = None
    if invoice:
        invoice_data = {
            'id': invoice.id,
            'invoiceNumber': invoice.invoice_number,
            'status': invoice.status,
            'invoiceDate': invoice.invoice_date.isoformat() if invoice.invoice_date else None
        }
    
    # Calculate SGK coverage (recalc if zero)
    sgk_coverage_value = _calculate_sgk_coverage(db, sale, assignments)
    
    # Get patient info
    patient_data = None
    if sale.party:
        patient_data = {
            'id': sale.party.id,
            'firstName': sale.party.first_name,
            'lastName': sale.party.last_name,
            'fullName': f"{sale.party.first_name} {sale.party.last_name}"
        }
    
    # Build complete sale data using SaleRead schema logic (manually to avoid full pydantic overhead here)
    # Ideally we'd validte through SaleRead.model_validate(sale).model_dump(by_alias=True)
    # But for parity with existing keys, manual is safer for now.
    sale_dict = {
        'id': sale.id,
        'partyId': sale.party_id,
        'productId': sale.product_id,
        'branchId': sale.branch_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        'listPriceTotal': float(sale.list_price_total) if sale.list_price_total else None,
        'totalAmount': float(sale.total_amount) if sale.total_amount else None,
        'discountAmount': float(sale.discount_amount) if sale.discount_amount else 0.0,
        'finalAmount': float(sale.final_amount) if sale.final_amount else None,
        'paidAmount': float(sale.paid_amount) if sale.paid_amount else 0.0,
        'rightEarAssignmentId': sale.right_ear_assignment_id,
        'leftEarAssignmentId': sale.left_ear_assignment_id,
        'status': sale.status,
        'paymentMethod': sale.payment_method,
        'sgkCoverage': float(sale.sgk_coverage) if sale.sgk_coverage else 0.0,
        'patientPayment': float(sale.patient_payment) if sale.patient_payment else None,
        'reportStatus': sale.report_status,
        'notes': sale.notes,
        
        # Enriched
        'devices': devices,
        'paymentPlan': payment_plan_data,
        'paymentRecords': payments_data,
        'payments': payments_data,
        'invoice': invoice_data,
        'patient': patient_data,
        'sgkCoverage': sgk_coverage_value # Override with recalc check if needed
    }
    
    return sale_dict

# ============= READ ENDPOINTS =============

@router.get("/sales", operation_id="listSales", response_model=ResponseEnvelope[List[SaleRead]])
def get_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    include_details: bool = Query(False, description="Include full sale details (devices, payments, invoice)"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get all sales with tenant scoping and optional full details."""
    query = db.query(Sale)
    
    if access.tenant_id:
        query = query.filter(Sale.tenant_id == access.tenant_id)
        
        # Branch scoping for Tenant Users with admin role
        if access.is_tenant_admin and hasattr(access, 'user') and access.user:
            user_role = getattr(access.user, 'role', None)
            if user_role == 'admin':
                user_branches = getattr(access.user, 'branches', [])
                user_branch_ids = [b.id for b in user_branches] if user_branches else []
                if user_branch_ids:
                    query = query.filter(Sale.branch_id.in_(user_branch_ids))
                elif user_branches:
                    # User has branches attribute but empty - return empty result
                    return ResponseEnvelope(
                        data=[],
                        meta={
                            "total": 0,
                            "page": page,
                            "perPage": per_page,
                            "totalPages": 0,
                            "tenantScope": access.tenant_id
                        }
                    )
                 
    if search:
        query = query.join(Party).filter(
            or_(
                Party.first_name.ilike(f"%{search}%"),
                Party.last_name.ilike(f"%{search}%"),
                Sale.id.ilike(f"%{search}%")
            )
        )
        
    query = query.order_by(desc(Sale.sale_date))
    
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Transform items with full details if requested
    results = []
    for sale in items:
        try:
            if include_details:
                # Full Flask-parity enrichment
                sale_data = _build_full_sale_data(db, sale)
            else:
                # Basic sale data with patient info
                # We can return the model directly, but need to attach patient info for Pydantic to pick up if defined in schema
                # For now, let's trust Pydantic's from_attributes for the base fields, 
                # but we need to manually inject 'patient' dict if we want it in the basic view without full details
                # Actually, SaleRead has 'patient' field.
                
                # Check if we can just return the model? 
                # The model 'patient' relationship is loaded.
                # However, SaleRead defines patient as Optional[Dict].
                # If we return the SQLAlchemy model, Pydantic might try to serialize 'sale.patient' model to Dict.
                # Pydantic v2 is smart. Let's try returning validation explicit or just dict.
                
                # To be safe and compliant with legacy helper 'patients' manual construction:
                sale_data = sale
                # If we return the object, we need to ensure properties like 'patient' are serialized correctly.
                # The schema expects 'patient' to be Dict. 
                # Let's construct a cleaner dict or stick to to_dict for the complex transition?
                # The goal is to REMOVE to_dict.
                
                # Let's return the SQLAlchemy object and let Pydantic handle it, 
                # assuming we update SaleRead to have proper nested models instead of Dict[str, Any].
                # But I updated it to use Dict[str, Any].
                
                # Intermediate step: Manually construct just the needed parts if straightforward, 
                # or rely on a helper that DOES NOT use to_dict but builds the response structure.
                
                # _build_full_sale_data uses to_dict internally. I should refactor IT too later.
                # For now, let's keep _build_full_sale_data returning dict (it works),
                # but for the `else` block (basic view):
                sale_data = sale
                
            results.append(sale_data)
        except Exception as e:
            logger.warning(f"Error building sale data for {sale.id}: {e}")
            results.append(sale)

    return ResponseEnvelope(
        data=results,
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": (total + per_page - 1) // per_page,
            "tenantScope": access.tenant_id
        },
    )

@router.get("/sales/{sale_id}", operation_id="getSale", response_model=ResponseEnvelope[SaleRead])
def get_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get a single sale with full details - Flask parity."""
    sale = get_sale_or_404(db, sale_id, access)
    
    # Build full sale data with all enrichments
    sale_data = _build_full_sale_data(db, sale)
    
    return ResponseEnvelope(data=sale_data)

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
        party_id=sale.party_id,
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

# --- Payment Plan Create & Installment Pay Endpoints (Flask Parity) ---

@router.post("/sales/{sale_id}/payment-plan", operation_id="createSalePaymentPlan")
def create_sale_payment_plan(
    sale_id: str,
    request_data: PaymentPlanCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create payment plan for a sale - Flask parity"""
    access.require_permission("sale:write")
    
    sale = get_sale_or_404(db, sale_id, access)
    
    # Get system settings
    from models.system import Settings
    settings_record = Settings.get_system_settings()
    settings = settings_record.settings_json if settings_record else {}
    
    plan_type = request_data.plan_type
    installment_count = request_data.installment_count
    down_payment = request_data.down_payment
    
    from services.pricing import create_payment_plan, create_custom_payment_plan
    
    try:
        if plan_type == 'custom' and request_data.installments:
            payment_plan = create_custom_payment_plan(
                sale_id=sale_id,
                installments_data=request_data.installments,
                settings=settings
            )
        else:
            payment_plan = create_payment_plan(
                sale_id=sale_id,
                plan_type=plan_type,
                amount=float(sale.total_amount or 0) - down_payment,
                settings=settings,
                tenant_id=sale.tenant_id
            )
        
        if payment_plan:
            db.add(payment_plan)
            db.commit()
            db.refresh(payment_plan)
            
            # Build response with installments
            insts = db.query(PaymentInstallment).filter_by(payment_plan_id=payment_plan.id).order_by(PaymentInstallment.due_date).all()
            inst_data = [
                {
                    'id': i.id,
                    'installmentNumber': i.installment_number,
                    'amount': float(i.amount),
                    'dueDate': i.due_date.isoformat() if i.due_date else None,
                    'status': i.status
                }
                for i in insts
            ]
            
            return ResponseEnvelope(
                data={
                    'id': payment_plan.id,
                    'planType': payment_plan.plan_type,
                    'totalAmount': float(payment_plan.total_amount or 0),
                    'installments': inst_data
                },
                message="Payment plan created successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create payment plan")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create payment plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sales/{sale_id}/installments/{installment_id}/pay", operation_id="createSaleInstallmentPay")
def pay_installment(
    sale_id: str,
    installment_id: str,
    request_data: InstallmentPayment,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Pay a specific installment - Flask parity"""
    access.require_permission("sale:write")
    
    from datetime import timezone
    from uuid import uuid4
    from decimal import Decimal
    
    # Verify sale exists
    sale = get_sale_or_404(db, sale_id, access)
    
    # Get installment
    installment = db.query(PaymentInstallment).filter_by(id=installment_id).first()
    
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")
    
    if installment.status == 'paid':
        raise HTTPException(status_code=400, detail="Installment already paid")
    
    # Validate payment data
    amount = request_data.amount if request_data.amount is not None else float(installment.amount)
    payment_method = request_data.payment_method
    payment_date = request_data.payment_date or datetime.now(timezone.utc)
    
    # Create payment record
    payment = PaymentRecord()
    payment.id = f"payment_{uuid4().hex[:8]}"
    payment.party_id = sale.party_id
    payment.sale_id = sale_id
    payment.amount = Decimal(str(amount))
    payment.payment_method = payment_method
    payment.payment_type = 'installment'
    payment.status = 'paid'
    payment.reference_number = request_data.reference_number
    payment.notes = f"Installment {installment.installment_number} payment"
    payment.payment_date = payment_date
    payment.created_at = datetime.now(timezone.utc)
    payment.updated_at = datetime.now(timezone.utc)
    
    # Update installment status
    installment.status = 'paid'
    installment.paid_date = payment.payment_date
    installment.updated_at = datetime.now(timezone.utc)
    
    db.add(payment)
    db.commit()
    
    return ResponseEnvelope(
        data={
            'paymentId': payment.id,
            'installmentId': installment_id,
            'amount': float(payment.amount),
            'paymentDate': payment.payment_date.isoformat(),
            'status': installment.status
        },
        message="Installment paid successfully"
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a new sale."""
    access.require_permission("sale:write")
    
    # 1. Validate Patient
    patient = db.get(Party, sale_in.party_id)
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
    
    # KDV Logic - Use product tax rate or default to 0 for hearing aids if not set (Hearing aids are 0% in TR, but system default is 18/20)
    # If product has a tax rate, use it. Otherwise, fallback to system default (0.20) only if absolutely necessary.
    # Note: inventory.kdv_rate is stored as percentage (e.g. 18.0 or 20.0 or 0.0)
    
    product_tax_rate = getattr(product, 'kdv_rate', 20.0)
    # Handle None case
    if product_tax_rate is None:
        product_tax_rate = 20.0
        
    kdv_rate = float(product_tax_rate) / 100.0
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
        party_id=sale_in.party_id,
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
        party_id=sale.party_id,
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
            "sale": SaleRead.model_validate(sale),
            "warnings": warnings,
            "saleId": sale.id,
        },
        message="Sale created successfully",
    )

@router.put("/sales/{sale_id}", operation_id="updateSale", response_model=ResponseEnvelope[SaleRead])
def update_sale(
    sale_id: str,
    sale_in: SaleUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    access.require_permission("sale:write")
    
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

    return ResponseEnvelope(data=sale, message="Sale updated")

@router.post("/sales/recalc", operation_id="createSaleRecalc", response_model=ResponseEnvelope[SaleRecalcResponse])
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
        
    if payload.party_id:
        query = query.filter(Sale.party_id == payload.party_id)
        
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
    party_id: str,
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
                party_id=party_id,
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
        party_id=party_id,
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


@router.post("/parties/{party_id}/device-assignments", operation_id="createPartyDeviceAssignments", response_model=ResponseEnvelope[DeviceAssignmentCreateResponse])
def create_device_assignments(
    party_id: str,
    data: DeviceAssignmentCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """
    Assign devices to a party with sale record creation.
    
    This is the main endpoint for device assignment workflow:
    1. Creates a Sale record
    2. Creates DeviceAssignment records for each device
    3. Handles pricing calculation (SGK, discounts)
    4. Manages stock movements (if delivery_status is 'delivered')
    5. Creates payment plan if needed
    """
    from services.pricing import calculate_device_pricing, create_payment_plan
    
    access.require_permission("sale:write")
    
    # Validate party
    party = db.get(Party, party_id)
    if not party:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Party not found", code="PARTY_NOT_FOUND").model_dump(mode="json"),
        )
    if access.tenant_id and party.tenant_id != access.tenant_id:
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
    
    tenant_id = access.tenant_id or party.tenant_id
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
        party_id=party_id,
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
            party_id=party_id,
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
    
    logger.info(f"Device assignments created for party {party_id}: sale={sale.id}, assignments={created_assignment_ids}")
    
    return ResponseEnvelope(
        data={
            "saleId": sale.id,
            "assignmentIds": created_assignment_ids,
            "pricing": pricing_calculation,
            "warnings": warnings
        },
        message="Device assignments created successfully"
    )


@router.patch("/device-assignments/{assignment_id}", operation_id="updateDeviceAssignment", response_model=ResponseEnvelope[DeviceAssignmentRead])
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
    
    access.require_permission("sale:write")
    
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
                                        party_id=sale.party_id,
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
        data=assignment,
        message="Assignment updated"
    )


@router.post("/device-assignments/{assignment_id}/return-loaner", operation_id="createDeviceAssignmentReturnLoaner", response_model=ResponseEnvelope[DeviceAssignmentRead])
def return_loaner_to_stock(
    assignment_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Return a loaner device to stock."""
    from services.stock_service import create_stock_movement
    
    access.require_permission("sale:write")
    
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
        data=assignment,
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
