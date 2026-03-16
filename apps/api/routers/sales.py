import logging
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from database import gen_sale_id
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentRecord, PaymentInstallment
from core.models.party import Party
from models.inventory import InventoryItem
from models.invoice import Invoice
from core.models.purchase_invoice import PurchaseInvoice
from services.stock_service import create_stock_movement
from fastapi import BackgroundTasks

from schemas.sales import (
    SaleRead, SaleCreate, SaleUpdate, 
    PaymentRecordCreate, 
    PaymentPlanCreate, InstallmentPayment,
    DeviceAssignmentRead, DeviceAssignmentUpdate,
    DeviceAssignmentCreate, DeviceAssignmentCreateResponse,
    SaleRecalcRequest, SaleRecalcResponse
)
from schemas.base import ResponseEnvelope, ApiError
from middleware.unified_access import UnifiedAccess, require_access
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
    """Build device info from assignment with inventory lookup - COMPLETE field mapping."""
    from models.device import Device
    
    logger.info(f"Building device info for assignment {assignment.id}")
    
    device_name = None
    barcode = None
    brand = None
    model = None
    serial_number = None
    serial_number_left = None
    serial_number_right = None
    category = None
    inventory_kdv_rate = None  # KDV rate from inventory item
    
    # Get down payment from payment records
    down_payment = 0.0
    if assignment.sale_id:
        payment_record = db.query(PaymentRecord).filter_by(
            sale_id=assignment.sale_id,
            payment_type='down_payment'
        ).first()
        if payment_record:
            down_payment = float(payment_record.amount or 0)
    
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
                    category = inv_item.category
                    inventory_kdv_rate = inv_item.kdv_rate
    
    # Try inventory lookup if no device
    if not brand and assignment.inventory_id:
        inv_item = db.get(InventoryItem, assignment.inventory_id)
        if inv_item:
            brand = inv_item.brand
            model = inv_item.model
            barcode = inv_item.barcode
            category = inv_item.category
            if inventory_kdv_rate is None:
                inventory_kdv_rate = inv_item.kdv_rate
            if not device_name:
                device_name = inv_item.name
    
    # Fallback for loaner devices
    if not brand:
        brand = assignment.loaner_brand or 'Unknown'
        model = assignment.loaner_model or 'Device'
    
    # Ensure brand and model are strings (not None)
    brand = brand or 'Unknown'
    model = model or ''
    
    # Build device name
    name_parts = []
    if brand: name_parts.append(brand)
    if model: name_parts.append(model)
    formatted_name = " ".join(name_parts).strip()
    if not formatted_name and device_name:
        formatted_name = device_name
    if not formatted_name:
        formatted_name = 'Device'
    
    # Map serial number to correct field based on ear side
    ear_side = str(assignment.ear or '').lower()
    if serial_number or assignment.serial_number:
        main_serial = serial_number or assignment.serial_number
        if ear_side == 'left':
            serial_number_left = serial_number_left or assignment.serial_number_left or main_serial
        elif ear_side == 'right':
            serial_number_right = serial_number_right or assignment.serial_number_right or main_serial
    
    # CRITICAL: Return ALL fields from assignment for consistency across endpoints
    result = {
        # CORRECT ID - assignment ID, not device/inventory ID!
        'id': assignment.id,
        'saleId': assignment.sale_id,
        
        # Device/Inventory references
        'deviceId': assignment.device_id,
        'inventoryId': assignment.inventory_id,
        'partyId': assignment.party_id,
        
        # Device info - FIXED: Keep both product name and formatted name
        'name': formatted_name,  # Brand + Model (e.g., "earnet force100")
        'deviceName': formatted_name,  # Brand + Model (backwards compat)
        'productName': device_name,  # Real product name from inventory (e.g., "deneme")
        'brand': brand,
        'model': model,
        'barcode': barcode,
        'category': category,
        
        # Serial numbers
        'serialNumber': serial_number or assignment.serial_number,
        'serialNumberLeft': serial_number_left or assignment.serial_number_left,
        'serialNumberRight': serial_number_right or assignment.serial_number_right,
        
        # Ear & reason
        'ear': assignment.ear,
        'earSide': assignment.ear,
        'reason': assignment.reason,
        
        # Pricing fields
        'listPrice': float(assignment.list_price) if assignment.list_price else None,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
        'sgkSupport': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
        'netPayable': float(assignment.net_payable) if assignment.net_payable else None,
        
        # Discount fields - calculate discountValue if missing
        'discountType': assignment.discount_type,
        'discountValue': (
            float(assignment.discount_value) if assignment.discount_value 
            else (
                ((float(assignment.list_price or 0) - float(assignment.sale_price or 0)) / float(assignment.list_price or 1)) * 100
                if assignment.discount_type == 'percentage' and assignment.list_price and float(assignment.list_price) > 0
                else None
            )
        ),
        
        # SGK fields
        'sgkScheme': assignment.sgk_scheme,
        'sgkSupportType': assignment.sgk_scheme,
        
        # Status fields - CRITICAL for consistency!
        'reportStatus': assignment.report_status,
        'deliveryStatus': assignment.delivery_status,
        
        # Payment fields
        'paymentMethod': assignment.payment_method,
        'downPayment': down_payment,
        
        # Assignment metadata
        'assignmentUid': assignment.assignment_uid,  # ✅ FIXED: Use snake_case from DB
        'assignedDate': assignment.created_at.isoformat() if assignment.created_at else None,
        'createdAt': assignment.created_at.isoformat() if assignment.created_at else None,
        'updatedAt': assignment.updated_at.isoformat() if assignment.updated_at else None,
        
        # Loaner fields
        'isLoaner': bool(assignment.is_loaner) if assignment.is_loaner is not None else False,
        'loanerInventoryId': assignment.loaner_inventory_id,
        'loanerBrand': assignment.loaner_brand,
        'loanerModel': assignment.loaner_model,
        'loanerSerialNumber': assignment.loaner_serial_number,
        'loanerSerialNumberLeft': assignment.loaner_serial_number_left,
        'loanerSerialNumberRight': assignment.loaner_serial_number_right,
        
        # Backwards-compatible keys for frontend
        'sgkReduction': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
        'patientPayment': float(assignment.net_payable) if assignment.net_payable else 0.0,
        'sgkCoverageAmount': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
        'patientResponsibleAmount': float(assignment.net_payable) if assignment.net_payable else 0.0,
        'kdvRate': float(inventory_kdv_rate) if inventory_kdv_rate is not None else None,
    }

    logger.info(f"Built device info: brand={result.get('brand')}, deviceName={result.get('deviceName')}, keys_count={len(result)}")
    return result  # noqa: RET504

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
            'saleId': payment_plan.sale_id,
            'planName': payment_plan.plan_name,
            'totalAmount': float(payment_plan.total_amount) if payment_plan.total_amount else 0.0,
            'installmentCount': payment_plan.installment_count,
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
        # Also find the PurchaseInvoice to get its ID for PDF viewing
        purchase_inv = db.query(PurchaseInvoice).filter(
            PurchaseInvoice.invoice_number == invoice.invoice_number,
            PurchaseInvoice.tenant_id == sale.tenant_id,
        ).first()
        invoice_data = {
            'id': invoice.id,
            'purchaseInvoiceId': purchase_inv.id if purchase_inv else None,
            'invoiceNumber': invoice.invoice_number,
            'status': invoice.status,
            'invoiceDate': invoice.issue_date.isoformat() if invoice.issue_date else None
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
    
    # Extract first device info for sale-level fields (for backwards compatibility)
    first_device = devices[0] if devices else {}
    
    # Calculate total net payable (sum of all devices' net_payable)
    total_net_payable = sum(float(d.get('netPayable') or 0) for d in devices) if devices else float(sale.patient_payment or sale.total_amount or 0)
    
    # Calculate total SGK coverage (sum of all devices' sgkSupport)
    total_sgk_coverage = sum(float(d.get('sgkSupport') or 0) for d in devices) if devices else sgk_coverage_value
    
    # Calculate correct amounts with discount applied
    # Note: list_price_total in DB is actually UNIT price, not total
    # For bilateral sales, we need to multiply by device count
    
    # Derive unit list price correctly:
    # 1. Prefer explicit unit_list_price if stored
    # 2. Use first device assignment's list_price (most accurate for legacy sales)
    # 3. Fall back to list_price_total (may be total for legacy bilateral sales)
    device_count = len(devices)
    if sale.unit_list_price:
        unit_list_price = float(sale.unit_list_price)
    elif first_device and first_device.get('listPrice'):
        unit_list_price = float(first_device['listPrice'])
    elif sale.list_price_total:
        unit_list_price = float(sale.list_price_total)
    else:
        unit_list_price = 0
    actual_list_price_total = unit_list_price * device_count if device_count > 0 else unit_list_price
    
    # ✅ UPDATED: Use stored values from database instead of recalculating
    # The update_sale function already calculates and stores these values correctly
    discount_type = getattr(sale, 'discount_type', None) or 'none'
    discount_value = float(getattr(sale, 'discount_value', None) or 0)
    discount_amount = float(sale.discount_amount) if sale.discount_amount else 0.0
    
    # NOTE: total_sgk_coverage is already correctly calculated above by summing
    # all device assignments' sgkSupport values (line ~341). Do NOT override with
    # sale.sgk_coverage here because that field may store per-ear value for bilateral sales.
    
    # Recalculate final amount for consistency with enriched SGK total
    # This handles cases where sale.sgk_coverage stored per-ear value but we need bilateral total
    final_amount = max(0, actual_list_price_total - discount_amount - total_sgk_coverage)
    
    # Debug logging
    logger.info(f"Building sale data for {sale.id}: devices count={device_count}")
    logger.info(f"Using stored values: discount_type={discount_type}, discount_value={discount_value}, discount_amount={discount_amount}")
    logger.info(f"Final amount from DB: {final_amount}")
    if first_device:
        logger.info(f"First device sample keys: {list(first_device.keys())[:10]}")
        logger.info(f"First device brand: {first_device.get('brand', 'MISSING')}, deviceName: {first_device.get('deviceName', 'MISSING')}, productName: {first_device.get('productName', 'MISSING')}")
    
    sale_dict = {
        'id': sale.id,
        'partyId': sale.party_id,
        'productId': sale.product_id,
        'salesOwnerUserId': sale.sales_owner_user_id,
        'branchId': sale.branch_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        'listPriceTotal': unit_list_price,  # Keep as unit price for backwards compatibility
        'actualListPriceTotal': actual_list_price_total,  # NEW: Actual total (unit × count)
        'unitListPrice': unit_list_price,  # NEW: Explicit unit price
        'totalAmount': final_amount,  # After SGK and discount
        'discountAmount': discount_amount,  # ✅ Calculated using new formula
        'discountType': discount_type,  # ✅ From Sale model
        'discountValue': discount_value,  # ✅ From Sale model
        'finalAmount': final_amount,  # After SGK and discount
        'paidAmount': float(sale.paid_amount) if sale.paid_amount else 0.0,
        'remainingAmount': max(0, final_amount - float(sale.paid_amount or 0)),  # NEW: Calculated remaining
        'rightEarAssignmentId': sale.right_ear_assignment_id,
        'leftEarAssignmentId': sale.left_ear_assignment_id,
        'status': sale.status,
        'paymentMethod': sale.payment_method,
        'sgkCoverage': total_sgk_coverage,  # Use calculated total SGK
        'patientPayment': final_amount,  # Patient pays final amount (after SGK and discount)
        'reportStatus': sale.report_status,
        'notes': sale.notes,
        # Prefer inventory KDV rate from first device (most accurate), fallback to sale's stored rate
        'kdvRate': first_device.get('kdvRate') if first_device.get('kdvRate') is not None else (float(sale.kdv_rate) if sale.kdv_rate else None),
        'kdvAmount': float(sale.kdv_amount) if sale.kdv_amount else 0.0,
        
        # Sale-level product fields (from first device for backwards compatibility)
        # ✅ FIXED: Use productName from device (real inventory name)
        'productName': first_device.get('productName') or first_device.get('deviceName'),  # Real product name (e.g., "deneme")
        'brand': first_device.get('brand'),
        'model': first_device.get('model'),
        'barcode': first_device.get('barcode'),
        'serialNumber': first_device.get('serialNumber'),
        'serialNumberLeft': first_device.get('serialNumberLeft'),
        'serialNumberRight': first_device.get('serialNumberRight'),
        'category': first_device.get('category'),
        'listPrice': first_device.get('listPrice'),
        'salePrice': first_device.get('salePrice'),
        'sgkSupport': first_device.get('sgkSupport'),
        'sgkScheme': first_device.get('sgkScheme'),
        'downPayment': first_device.get('downPayment'),
        'deliveryStatus': first_device.get('deliveryStatus'),
        'netPayable': total_net_payable,  # Total net payable
        
        # Override report_status from device if available
        'reportStatus': first_device.get('reportStatus') or sale.report_status,
        
        # Calculated fields - ✅ FIXED: Use final_amount for remaining amount calculation
        'remainingAmount': max(0, final_amount - float(sale.paid_amount or 0)),
        'paymentStatus': 'paid' if float(sale.paid_amount or 0) >= final_amount else 'pending',
        'invoiceStatus': invoice_data['status'] if invoice_data else 'not_issued',
        
        # Enriched
        'devices': devices,
        'paymentPlan': payment_plan_data,
        'paymentRecords': payments_data,
        'payments': payments_data,
        'invoice': invoice_data,
        'patient': patient_data
    }
    
    return sale_dict

# ============= READ ENDPOINTS =============

SALES_AMOUNT_PERMISSION = "sensitive.sales.list.amounts.view"


def _mask_sale_financials(data: dict, access: UnifiedAccess) -> dict:
    if access.has_permission(SALES_AMOUNT_PERMISSION):
        return data

    masked = dict(data)
    for key in ("totalAmount", "finalAmount", "paidAmount", "remainingAmount"):
        if key in masked:
            masked[key] = 0.0
    return masked

@router.get("/sales", operation_id="listSales", response_model=ResponseEnvelope[List[SaleRead]])
def get_sales(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    include_details: bool = Query(True, description="Include full sale details (devices, payments, invoice)"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("sales.view"))
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
                
            if isinstance(sale_data, dict):
                results.append(_mask_sale_financials(sale_data, access))
            else:
                validated = SaleRead.model_validate(sale_data).model_dump(mode="json", by_alias=True)
                results.append(_mask_sale_financials(validated, access))
        except Exception as e:
            logger.warning(f"Error building sale data for {sale.id}: {e}")
            validated = SaleRead.model_validate(sale).model_dump(mode="json", by_alias=True)
            results.append(_mask_sale_financials(validated, access))

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
    access: UnifiedAccess = Depends(require_access("sales.view"))
):
    """Get a single sale with full details - Flask parity."""
    sale = get_sale_or_404(db, sale_id, access)
    
    # Eager load relationships to avoid lazy loading issues
    db.refresh(sale)
    
    # Build full sale data with all enrichments
    try:
        sale_data = _build_full_sale_data(db, sale)
    except Exception as e:
        logger.error(f"Error building sale data for {sale_id}: {e}")
        # Fallback to basic sale data
        sale_data = {
            'id': sale.id,
            'partyId': sale.party_id,
            'productId': sale.product_id,
            'salesOwnerUserId': sale.sales_owner_user_id,
            'status': sale.status,
            'totalAmount': float(sale.total_amount) if sale.total_amount else 0.0,
            'error': 'Failed to load full details'
        }
    
    if isinstance(sale_data, dict):
        return ResponseEnvelope(data=_mask_sale_financials(sale_data, access))

    validated = SaleRead.model_validate(sale_data).model_dump(mode="json", by_alias=True)
    return ResponseEnvelope(data=_mask_sale_financials(validated, access))

# Note: /patients/{patient_id}/sales endpoint moved to patients.py to avoid duplication

# ============= PAYMENT ENDPOINTS =============

@router.get("/sales/{sale_id}/payments", operation_id="listSalePayments", response_model=ResponseEnvelope[Any])
def get_sale_payments(
    sale_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("sales.view"))
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
    access: UnifiedAccess = Depends(require_access("sales.create"))
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
    
    # Log activity
    try:
        from models.user import ActivityLog
        activity_log = ActivityLog(
            user_id=getattr(access, 'user_id', None) or 'system',
            action='payment_received',
            entity_type='payment',
            entity_id=payment.id,
            tenant_id=access.tenant_id,
            details=json.dumps({
                'sale_id': sale_id,
                'party_id': sale.party_id,
                'amount': float(amount),
                'payment_method': payment_in.payment_method,
                'payment_type': payment_in.payment_type
            })
        )
        db.add(activity_log)
        db.commit()
    except Exception as log_error:
        logger.warning(f"Failed to log payment: {log_error}")

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
    access: UnifiedAccess = Depends(require_access("sales.view"))
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
                'dueDate': i.due_date.isoformat() if i.due_date else None,
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
    access: UnifiedAccess = Depends(require_access("sales.create"))
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
                settings=settings,
                db=db
            )
        else:
            payment_plan = create_payment_plan(
                sale_id=sale_id,
                plan_type=plan_type,
                amount=float(sale.total_amount or 0) - down_payment,
                settings=settings,
                tenant_id=sale.tenant_id,
                db=db
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
                    'planType': payment_plan.plan_name,
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
    access: UnifiedAccess = Depends(require_access("sales.create"))
):
    """Pay a specific installment - Flask parity"""
    access.require_permission("sale:write")
    
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

def _get_pricing_config() -> dict:
    """Read pricing formula config from system settings.
    Returns dict with 'discount_before_sgk' (bool) and 'discount_includes_kdv' (bool).
    Defaults: discount_before_sgk=False (SGK first), discount_includes_kdv=True.
    """
    try:
        from models.system import Settings
        rec = Settings.get_system_settings()
        sgk_cfg = (rec.settings_json if rec else {}).get('sgk', {})
        return {
            'discount_before_sgk': bool(sgk_cfg.get('discount_before_sgk', False)),
            'discount_includes_kdv': bool(sgk_cfg.get('discount_includes_kdv', True)),
        }
    except Exception:
        return {'discount_before_sgk': False, 'discount_includes_kdv': True}


def _apply_discount(
    total_price: float,
    sgk_total: float,
    discount_type: str,
    discount_value: float,
    kdv_rate_pct: float = 0.0,
    pricing_cfg: dict | None = None,
) -> tuple[float, float]:
    """Calculate discount_amount and final_amount respecting pricing settings.

    Returns (discount_amount, final_amount).
    """
    if pricing_cfg is None:
        pricing_cfg = _get_pricing_config()

    discount_before_sgk = pricing_cfg.get('discount_before_sgk', False)
    discount_includes_kdv = pricing_cfg.get('discount_includes_kdv', False)

    if discount_before_sgk:
        # Discount FIRST, then SGK
        discount_base = total_price
    else:
        # SGK FIRST (default), then discount on remainder
        discount_base = total_price - sgk_total

    # If discount_includes_kdv is False, strip KDV from the base before computing %
    if not discount_includes_kdv and kdv_rate_pct > 0 and discount_type == 'percentage':
        kdv_divisor = 1 + (kdv_rate_pct / 100)
        discount_base_for_pct = discount_base / kdv_divisor
    else:
        discount_base_for_pct = discount_base

    discount_amount = 0.0
    if discount_type == 'percentage' and discount_value > 0:
        discount_amount = (discount_base_for_pct * discount_value) / 100
    elif discount_type == 'amount' and discount_value > 0:
        discount_amount = discount_value

    if discount_before_sgk:
        final_amount = max(0, total_price - discount_amount - sgk_total)
    else:
        final_amount = max(0, (total_price - sgk_total) - discount_amount)

    return discount_amount, final_amount


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
    access: UnifiedAccess = Depends(require_access("sales.create"))
):
    """Create a new sale."""
    from core.tenant_utils import get_effective_tenant_id
    
    access.require_permission("sale:write")
    
    # Get effective tenant ID (supports impersonation)
    tenant_id = get_effective_tenant_id(access)
    
    # 1. Validate Patient
    patient = db.get(Party, sale_in.party_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Party not found", code="PARTY_NOT_FOUND").model_dump(mode="json"),
        )
    if tenant_id and patient.tenant_id != tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Party not found", code="PARTY_NOT_FOUND").model_dump(mode="json"),
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
    
    # Notes - KDV bilgisini artık notes'a yazmıyoruz, ayrı alanlarda saklıyoruz
    sale_notes = sale_in.notes or ''
    
    # Determine status
    # Priority: down_payment > paid_amount > implicit full payment for cash
    if sale_in.down_payment is not None:
        paid_amt = float(sale_in.down_payment)
    elif sale_in.paid_amount is not None:
        paid_amt = float(sale_in.paid_amount)
    elif sale_in.payment_method == 'cash':
         # Implicit full payment if cash and no specific paid amount given
         # Legacy logic: if cash, paid_amount = final_price
         paid_amt = final_price
    else:
        paid_amt = 0.0
         
    status_val = 'completed' if paid_amt >= final_price else 'pending'
    
    sgk_cov = float(sale_in.sgk_coverage or 0)
    patient_pay = max(0, final_price - sgk_cov)
    
    sale = Sale(
        id=sale_id,
        tenant_id=tenant_id,
        branch_id=access.branch_id, # If applicable
        party_id=sale_in.party_id,
        product_id=sale_in.product_id,
        sales_owner_user_id=sale_in.sales_owner_user_id or getattr(access, 'user_id', None),
        sale_date=sale_in.sale_date or datetime.utcnow(),
        list_price_total=base_price,
        total_amount=base_price,
        discount_amount=discount,
        discount_type=sale_in.discount_type or 'none',
        discount_value=Decimal(str(sale_in.discount_value)) if sale_in.discount_value else None,
        final_amount=final_price,
        paid_amount=paid_amt,
        payment_method=sale_in.payment_method,
        status=status_val,
        notes=sale_notes,
        sgk_coverage=sgk_cov,
        patient_payment=patient_pay,
        report_status=sale_in.report_status,
        kdv_rate=kdv_rate * 100,  # Store as percentage (e.g., 20.0 for 20%)
        kdv_amount=kdv_amount
    )
    db.add(sale)
    db.flush() # Get ID
    
    # 5. Device Assignment - Create 2 separate assignments for bilateral
    ear_side = getattr(sale_in, 'ear_side', None) or 'both'
    
    # Determine if bilateral
    is_bilateral = ear_side.lower() in ('both', 'bilateral')
    
    # ✅ FIX: Adjust sale totals for bilateral sales
    if is_bilateral:
        # For bilateral sales, we need to double the totals since we're selling 2 devices
        sale.list_price_total = Decimal(str(base_price))  # Keep as unit price for backwards compatibility
        sale.unit_list_price = Decimal(str(base_price))   # Store unit price explicitly
        sale.total_amount = Decimal(str(base_price * 2))  # Double for 2 devices
        sale.final_amount = Decimal(str(final_price * 2)) # Double for 2 devices
        
        # Adjust patient payment and SGK coverage for bilateral
        sgk_total = sgk_cov * 2  # Double SGK coverage for 2 devices
        sale.sgk_coverage = Decimal(str(sgk_total))
        sale.patient_payment = Decimal(str(max(0, (final_price * 2) - sgk_total)))
        
        logger.info(f"🔄 Adjusted bilateral sale totals: unit={base_price}, total={base_price * 2}, sgk_total={sgk_total}")
    else:
        # Single device - keep original logic
        sale.unit_list_price = Decimal(str(base_price))   # Store unit price explicitly
    
    # Get SGK scheme and calculate per-ear SGK support
    sgk_scheme = getattr(sale_in, 'sgk_scheme', None)
    sgk_per_ear = 0.0
    
    # Fallback SGK values (per ear)
    sgk_fallback_values = {
        'no_coverage': 0,
        'under4_parent_working': 6104.44,
        'under4_parent_retired': 7630.56,
        'age5_12_parent_working': 5426.17,
        'age5_12_parent_retired': 6782.72,
        'age13_18_parent_working': 5087.04,
        'age13_18_parent_retired': 6358.88,
        'over18_working': 3391.36,
        'over18_retired': 4239.20
    }
    
    if sgk_scheme and sgk_scheme != 'no_coverage':
        try:
            # Try to get from settings first
            from models.system import Settings
            settings_record = Settings.get_system_settings()
            settings = settings_record.settings_json if settings_record else {}
            sgk_settings = settings.get('sgk', {})
            schemes = sgk_settings.get('schemes', {})
            
            # Get scheme coverage amount
            scheme_data = schemes.get(sgk_scheme, {})
            sgk_per_ear = float(scheme_data.get('coverage_amount', 0))
            
            # Fallback to hardcoded values if not in settings
            if sgk_per_ear == 0:
                sgk_per_ear = sgk_fallback_values.get(sgk_scheme, 0)
        except Exception as e:
            logger.warning(f"Failed to get SGK from settings, using fallback: {e}")
            sgk_per_ear = sgk_fallback_values.get(sgk_scheme, 0)
        
        logger.info(f"SGK scheme: {sgk_scheme}, per-ear coverage: {sgk_per_ear}")
    
    if is_bilateral:
        # Create LEFT assignment
        assignment_left = DeviceAssignment(
            tenant_id=sale.tenant_id,
            branch_id=access.branch_id if hasattr(access, 'branch_id') else None,
            party_id=sale.party_id,
            device_id=product.id,
            inventory_id=product.id,
            sale_id=sale.id,
            reason='sale',
            from_inventory=True,
            list_price=base_price,  # Full unit price per device
            sale_price=final_price,  # Full unit price per device
            sgk_support=sgk_per_ear,  # Per-ear SGK
            sgk_scheme=sgk_scheme,
            net_payable=final_price - sgk_per_ear,  # Full unit price minus SGK per ear
            discount_type=sale_in.discount_type or 'none',
            discount_value=Decimal(str(sale_in.discount_value)) if sale_in.discount_value else None,
            payment_method=sale_in.payment_method,
            report_status=sale_in.report_status,
            notes=f"Stoktan satış (Sol): {product.name} - {product.brand or ''} {product.model or ''}",
            assignment_uid=f"ATM-{datetime.now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            ear='left'
        )
        if hasattr(sale_in, 'serial_number_left') and sale_in.serial_number_left: 
            assignment_left.serial_number = sale_in.serial_number_left
            assignment_left.serial_number_left = sale_in.serial_number_left
        
        db.add(assignment_left)
        
        # Create RIGHT assignment
        assignment_right = DeviceAssignment(
            tenant_id=sale.tenant_id,
            branch_id=access.branch_id if hasattr(access, 'branch_id') else None,
            party_id=sale.party_id,
            device_id=product.id,
            inventory_id=product.id,
            sale_id=sale.id,
            reason='sale',
            from_inventory=True,
            list_price=base_price,  # Full unit price per device
            sale_price=final_price,  # Full unit price per device
            sgk_support=sgk_per_ear,  # Per-ear SGK
            sgk_scheme=sgk_scheme,
            net_payable=final_price - sgk_per_ear,  # Full unit price minus SGK per ear
            discount_type=sale_in.discount_type or 'none',
            discount_value=Decimal(str(sale_in.discount_value)) if sale_in.discount_value else None,
            payment_method=sale_in.payment_method,
            report_status=sale_in.report_status,
            notes=f"Stoktan satış (Sağ): {product.name} - {product.brand or ''} {product.model or ''}",
            assignment_uid=f"ATM-{datetime.now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            ear='right'
        )
        if hasattr(sale_in, 'serial_number_right') and sale_in.serial_number_right: 
            assignment_right.serial_number = sale_in.serial_number_right
            assignment_right.serial_number_right = sale_in.serial_number_right
        
        db.add(assignment_right)
        
        # Update sale SGK coverage to total (2 x per-ear)
        total_sgk = sgk_per_ear * 2
        sale.sgk_coverage = Decimal(str(total_sgk))
        sale.patient_payment = Decimal(str(max(0, final_price * 2 - total_sgk)))
        
        logger.info(f"✅ Created bilateral sale: 2 assignments (left + right) for sale {sale.id}, SGK per ear: {sgk_per_ear}, total SGK: {total_sgk}")
    else:
        # Single ear assignment
        assignment = DeviceAssignment(
            tenant_id=sale.tenant_id,
            branch_id=access.branch_id if hasattr(access, 'branch_id') else None,
            party_id=sale.party_id,
            device_id=product.id,
            inventory_id=product.id,
            sale_id=sale.id,
            reason='sale',
            from_inventory=True,
            list_price=base_price,
            sale_price=final_price,
            sgk_support=sgk_per_ear,  # Single ear SGK
            sgk_scheme=sgk_scheme,
            net_payable=final_price - sgk_per_ear,  # Net payable after SGK
            discount_type=sale_in.discount_type or 'none',
            discount_value=Decimal(str(sale_in.discount_value)) if sale_in.discount_value else None,
            payment_method=sale_in.payment_method,
            report_status=sale_in.report_status,
            notes=f"Stoktan satış: {product.name} - {product.brand or ''} {product.model or ''}",
            assignment_uid=f"ATM-{datetime.now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            ear=ear_side
        )
        # Set serial number based on ear side
        if hasattr(sale_in, 'serial_number') and sale_in.serial_number:
            assignment.serial_number = sale_in.serial_number
            # Also set to specific ear field based on ear_side
            if ear_side == 'left':
                assignment.serial_number_left = sale_in.serial_number
            elif ear_side == 'right':
                assignment.serial_number_right = sale_in.serial_number
        
        # Also check for specific ear serial numbers
        if hasattr(sale_in, 'serial_number_left') and sale_in.serial_number_left: 
            assignment.serial_number_left = sale_in.serial_number_left
            if not assignment.serial_number:
                assignment.serial_number = sale_in.serial_number_left
        if hasattr(sale_in, 'serial_number_right') and sale_in.serial_number_right: 
            assignment.serial_number_right = sale_in.serial_number_right
            if not assignment.serial_number:
                assignment.serial_number = sale_in.serial_number_right
        
        db.add(assignment)
        
        # Update sale SGK coverage
        sale.sgk_coverage = Decimal(str(sgk_per_ear))
        sale.patient_payment = Decimal(str(final_price - sgk_per_ear))
        
        logger.info(f"✅ Created single ear sale: 1 assignment ({ear_side}) for sale {sale.id}, SGK: {sgk_per_ear}")
    
    # 6. Create Payment Record for the actually collected amount
    if paid_amt > 0:
        from core.models.sales import PaymentRecord

        payment_type = 'down_payment' if paid_amt < float(sale.final_amount or 0) else 'payment'
        payment = PaymentRecord(
            id=f"payment_{uuid4().hex[:8]}",
            tenant_id=tenant_id,
            party_id=sale.party_id,
            sale_id=sale.id,
            amount=Decimal(str(paid_amt)),
            payment_method=sale_in.payment_method or 'cash',
            payment_type=payment_type,
            status='paid',
            notes="Satış tahsilatı (satış oluşturma sırasında)",
            payment_date=sale_in.sale_date or datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(payment)
    
    # 7. Update Inventory
    user_id = getattr(access, 'user_id', None) or 'system'
    quantity_to_deduct = 2 if is_bilateral else 1
    _update_inventory_stock(db, product, quantity_to_deduct, sale.id, user_id)
    
    db.commit()
    db.refresh(sale)  # Refresh to load relationships
    
    # Log activity
    try:
        from models.user import ActivityLog
        activity_log = ActivityLog(
            user_id=user_id,
            action='sale_created',
            entity_type='sale',
            entity_id=sale.id,
            tenant_id=tenant_id,
            details=json.dumps({
                'party_id': sale.party_id,
                'product_id': sale.product_id,
                'total_amount': float(sale.total_amount) if sale.total_amount else 0.0,
                'payment_method': sale.payment_method,
                'ear_side': ear_side
            })
        )
        db.add(activity_log)
        db.commit()
    except Exception as log_error:
        logger.warning(f"Failed to log sale creation: {log_error}")

    return ResponseEnvelope(
        data={
            "id": sale.id,
            "partyId": sale.party_id,
            "productId": sale.product_id,
            "salesOwnerUserId": sale.sales_owner_user_id,
            "status": sale.status,
            "totalAmount": float(sale.total_amount) if sale.total_amount else 0.0,
            "finalAmount": float(sale.final_amount) if sale.final_amount else 0.0,
            "paidAmount": float(sale.paid_amount) if sale.paid_amount else 0.0,
            "saleDate": sale.sale_date.isoformat() if sale.sale_date else None,
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
    access: UnifiedAccess = Depends(require_access("sales.edit"))
):
    access.require_permission("sale:write")
    
    sale = get_sale_or_404(db, sale_id, access)
    
    # Update all amount fields directly from request
    if sale_in.total_amount is not None: 
        sale.total_amount = Decimal(str(sale_in.total_amount))
    if sale_in.list_price_total is not None: 
        sale.list_price_total = Decimal(str(sale_in.list_price_total))
    if sale_in.discount_amount is not None: 
        sale.discount_amount = Decimal(str(sale_in.discount_amount))
    if sale_in.sgk_coverage is not None: 
        sale.sgk_coverage = Decimal(str(sale_in.sgk_coverage))
    if sale_in.patient_payment is not None: 
        sale.patient_payment = Decimal(str(sale_in.patient_payment))
    if sale_in.final_amount is not None: 
        sale.final_amount = Decimal(str(sale_in.final_amount))
    if sale_in.paid_amount is not None: 
        sale.paid_amount = Decimal(str(sale_in.paid_amount))
    if sale_in.sales_owner_user_id is not None:
        sale.sales_owner_user_id = sale_in.sales_owner_user_id
    
    # ✅ UPDATED: Handle new discount fields (Fix #2 - Backend Calculation)
    if sale_in.discount_type is not None:
        sale.discount_type = sale_in.discount_type
    if sale_in.discount_value is not None:
        sale.discount_value = Decimal(str(sale_in.discount_value))
    
    # ✅ UPDATED: Handle new unit_list_price field
    if sale_in.unit_list_price is not None:
        sale.unit_list_price = Decimal(str(sale_in.unit_list_price))
        
        # 🔧 PRICE SYNC FIX: Update device assignment prices when unitListPrice changes
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
        if assignments:
            new_unit_price = Decimal(str(sale_in.unit_list_price))
            for assignment in assignments:
                assignment.list_price = new_unit_price
                assignment.sale_price = new_unit_price
                logger.info(f"💰 Synced price for assignment {assignment.id}: list_price={new_unit_price}")
            
            # Also update sale totals
            device_count = len(assignments)
            sale.total_amount = new_unit_price * device_count
            sale.list_price_total = new_unit_price if device_count == 1 else new_unit_price
            logger.info(f"💰 Updated sale totals: total_amount={sale.total_amount}, device_count={device_count}")
    
    # ✅ UPDATED: Recalculate amounts when discount fields change (respects pricing settings)
    if sale_in.discount_type is not None or sale_in.discount_value is not None:
        # Get current values
        unit_list_price = float(sale.unit_list_price or sale.list_price_total or 0)
        sgk_coverage = float(sale.sgk_coverage or 0)
        discount_type = sale.discount_type or 'none'
        discount_value = float(sale.discount_value or 0)
        kdv_rate_pct = float(sale.kdv_rate or 0)
        
        # Count device assignments to calculate total list price
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
        device_count = len(assignments) if assignments else 1
        actual_list_price_total = unit_list_price * device_count
        
        pricing_cfg = _get_pricing_config()
        discount_amount, final_amount = _apply_discount(
            total_price=actual_list_price_total,
            sgk_total=sgk_coverage,
            discount_type=discount_type,
            discount_value=discount_value,
            kdv_rate_pct=kdv_rate_pct,
            pricing_cfg=pricing_cfg,
        )
        
        # Update calculated fields
        sale.discount_amount = Decimal(str(discount_amount))
        sale.total_amount = Decimal(str(actual_list_price_total))
        sale.final_amount = Decimal(str(final_amount))
        sale.patient_payment = Decimal(str(final_amount))
        
        # 🔧 DISCOUNT SYNC: Propagate sale-level discount to all device assignments
        for assignment in assignments:
            assignment.discount_type = discount_type
            assignment.discount_value = Decimal(str(discount_value)) if discount_value else None
            logger.info(f"💰 Synced discount for assignment {assignment.id}: type={discount_type}, value={discount_value}")
        
        logger.info(f"🧮 Recalculated sale {sale_id}: list_price={actual_list_price_total}, sgk={sgk_coverage}, discount={discount_amount}, final={final_amount}")
        
    if sale_in.payment_method: sale.payment_method = sale_in.payment_method
    if sale_in.status: sale.status = sale_in.status
    if sale_in.notes: sale.notes = sale_in.notes
    
    # Handle ear selection changes (bilateral ↔ single ear)
    assignments = db.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
    
    if sale_in.ear and assignments:
        current_ears = {a.ear for a in assignments}
        requested_ear = sale_in.ear.lower()
        
        # Determine current state
        is_currently_bilateral = len(assignments) == 2 and 'left' in current_ears and 'right' in current_ears
        is_currently_single = len(assignments) == 1
        
        # Determine requested state
        is_requested_bilateral = requested_ear in ('both', 'bilateral')
        is_requested_single_left = requested_ear == 'left'
        is_requested_single_right = requested_ear == 'right'
        
        logger.info(f"🔄 Ear change request: current={current_ears}, requested={requested_ear}, bilateral={is_currently_bilateral}, single={is_currently_single}")
        
        # CASE 1: Bilateral → Single (delete one assignment)
        if is_currently_bilateral and (is_requested_single_left or is_requested_single_right):
            # Keep the requested ear, delete the other
            keep_ear = 'left' if is_requested_single_left else 'right'
            delete_ear = 'right' if is_requested_single_left else 'left'
            
            assignment_to_keep = next((a for a in assignments if a.ear == keep_ear), None)
            assignment_to_delete = next((a for a in assignments if a.ear == delete_ear), None)
            
            if assignment_to_keep and assignment_to_delete:
                # Return stock for deleted assignment
                if assignment_to_delete.inventory_id:
                    inventory_item = db.get(InventoryItem, assignment_to_delete.inventory_id)
                    if inventory_item:
                        inventory_item.available_inventory = (inventory_item.available_inventory or 0) + 1
                        create_stock_movement(
                            inventory_id=assignment_to_delete.inventory_id,
                            movement_type='return',
                            quantity=1,
                            tenant_id=access.tenant_id,
                            transaction_id=sale_id,
                            session=db
                        )
                
                # Delete the assignment
                db.delete(assignment_to_delete)
                logger.info(f"✅ Deleted {delete_ear} ear assignment {assignment_to_delete.id}")
                
                # Update the remaining assignment's ear field to match the kept ear
                assignment_to_keep.ear = keep_ear
                
                # Update pricing for remaining assignment (now gets full amount)
                if sale_in.final_amount is not None:
                    assignment_to_keep.net_payable = Decimal(str(sale_in.final_amount))
                if sale_in.list_price_total is not None:
                    assignment_to_keep.list_price = Decimal(str(sale_in.list_price_total))
                
                # Recalculate sale-level pricing for single ear
                unit_price = float(sale.unit_list_price or sale.list_price_total or assignment_to_keep.list_price or 0)
                sgk_per_ear = float(assignment_to_keep.sgk_support or 0)
                sale.total_amount = Decimal(str(unit_price))
                sale.sgk_coverage = Decimal(str(sgk_per_ear))
                
                d_type = sale.discount_type or 'none'
                d_value = float(sale.discount_value or 0)
                kdv_rate_pct = float(sale.kdv_rate or 0)
                pricing_cfg = _get_pricing_config()
                new_discount, new_final = _apply_discount(
                    total_price=unit_price,
                    sgk_total=sgk_per_ear,
                    discount_type=d_type,
                    discount_value=d_value,
                    kdv_rate_pct=kdv_rate_pct,
                    pricing_cfg=pricing_cfg,
                )
                sale.discount_amount = Decimal(str(new_discount))
                sale.final_amount = Decimal(str(new_final))
                sale.patient_payment = Decimal(str(new_final))
                logger.info(f"💰 Bilateral→Single recalc: total={unit_price}, sgk={sgk_per_ear}, discount={new_discount}, final={new_final}")
                
                assignments = [assignment_to_keep]
        
        # CASE 2: Single → Bilateral (create new assignment)
        elif is_currently_single and is_requested_bilateral:
            existing_assignment = assignments[0]
            existing_ear = existing_assignment.ear
            
            # Determine which ear the existing assignment should be
            # If existing ear is already 'left' or 'right', keep it
            # If it's 'both' or something else, default to 'left'
            if existing_ear not in ('left', 'right'):
                existing_ear = 'left'
                existing_assignment.ear = 'left'
            
            new_ear = 'right' if existing_ear == 'left' else 'left'
            
            # Check inventory availability
            if existing_assignment.inventory_id:
                inventory_item = db.get(InventoryItem, existing_assignment.inventory_id)
                if inventory_item and (inventory_item.available_inventory or 0) < 1:
                    raise HTTPException(
                        status_code=400,
                        detail=ApiError(
                            message="Bilateral satış için yeterli stok yok. Lütfen stok ekleyin.",
                            code="INSUFFICIENT_STOCK"
                        ).model_dump(mode="json")
                    )
                
                # Deduct stock
                inventory_item.available_inventory = (inventory_item.available_inventory or 0) - 1
                create_stock_movement(
                    inventory_id=existing_assignment.inventory_id,
                    movement_type='sale',
                    quantity=-1,
                    tenant_id=access.tenant_id,
                    transaction_id=sale_id,
                    session=db
                )
            
            # Create new assignment for the other ear
            new_assignment = DeviceAssignment(
                id=f"assign_{uuid4().hex[:8]}",
                party_id=sale.party_id,
                sale_id=sale_id,
                device_id=existing_assignment.device_id,
                inventory_id=existing_assignment.inventory_id,
                ear=new_ear,
                reason=existing_assignment.reason,
                list_price=existing_assignment.list_price,
                sale_price=existing_assignment.sale_price,
                sgk_support=existing_assignment.sgk_support,
                sgk_scheme=existing_assignment.sgk_scheme,
                net_payable=existing_assignment.net_payable,
                discount_type=existing_assignment.discount_type,
                discount_value=existing_assignment.discount_value,
                delivery_status=existing_assignment.delivery_status,
                report_status=existing_assignment.report_status,
                payment_method=existing_assignment.payment_method,
                tenant_id=access.tenant_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_assignment)
            logger.info(f"✅ Created new {new_ear} ear assignment {new_assignment.id}")
            
            # Update pricing for both assignments — list_price stays as unit price (NOT split)
            if sale_in.list_price_total is not None:
                unit_price = Decimal(str(sale_in.list_price_total))
                existing_assignment.list_price = unit_price
                new_assignment.list_price = unit_price
            
            # Recalculate sale-level pricing for bilateral
            unit_price = float(sale.unit_list_price or sale.list_price_total or existing_assignment.list_price or 0)
            sgk_per_ear = float(existing_assignment.sgk_support or 0)
            sale.total_amount = Decimal(str(unit_price * 2))
            sale.sgk_coverage = Decimal(str(sgk_per_ear * 2))
            
            d_type = sale.discount_type or 'none'
            d_value = float(sale.discount_value or 0)
            kdv_rate_pct = float(sale.kdv_rate or 0)
            pricing_cfg = _get_pricing_config()
            new_discount, new_final = _apply_discount(
                total_price=unit_price * 2,
                sgk_total=sgk_per_ear * 2,
                discount_type=d_type,
                discount_value=d_value,
                kdv_rate_pct=kdv_rate_pct,
                pricing_cfg=pricing_cfg,
            )
            sale.discount_amount = Decimal(str(new_discount))
            sale.final_amount = Decimal(str(new_final))
            sale.patient_payment = Decimal(str(new_final))
            logger.info(f"💰 Single→Bilateral recalc: total={unit_price*2}, sgk={sgk_per_ear*2}, discount={new_discount}, final={new_final}")
            
            assignments = [existing_assignment, new_assignment]
        
        # CASE 3: Single Left → Single Right (or vice versa)
        elif is_currently_single and (is_requested_single_left or is_requested_single_right):
            assignment = assignments[0]
            old_ear = assignment.ear
            new_ear = 'left' if is_requested_single_left else 'right'
            
            if old_ear != new_ear:
                assignment.ear = new_ear
                logger.info(f"✅ Changed ear from {old_ear} to {new_ear} for assignment {assignment.id}")
    
    # Update device assignments with device-specific fields
    if not assignments:
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
    
    if assignments:
        num_assignments = len(assignments)
        
        # Calculate SGK support per assignment if sgk_scheme changed
        sgk_support_per_ear = None
        if sale_in.sgk_scheme:
            # Get SGK amount from settings or fallback
            settings = _get_settings(db, access.tenant_id)
            sgk_amounts = {
                'no_coverage': 0,
                'under4_parent_working': 6104.44,
                'under4_parent_retired': 7630.56,
                'age5_12_parent_working': 5426.17,
                'age5_12_parent_retired': 6782.72,
                'age13_18_parent_working': 5087.04,
                'age13_18_parent_retired': 6358.88,
                'over18_working': 3391.36,
                'over18_retired': 4239.20,
                'under18': 5000,
                'standard': 0
            }
            sgk_support_per_ear = Decimal(str(sgk_amounts.get(sale_in.sgk_scheme, 0)))
        
        for assignment in assignments:
            # Update device-specific fields
            if sale_in.sgk_scheme:
                assignment.sgk_scheme = sale_in.sgk_scheme
                if sgk_support_per_ear is not None:
                    assignment.sgk_support = sgk_support_per_ear
            
            # Update discount type
            if sale_in.discount_type:
                assignment.discount_type = sale_in.discount_type
            
            # ✅ NEW: Update serial numbers
            if assignment.ear == 'left' and sale_in.serial_number_left is not None:
                assignment.serial_number = sale_in.serial_number_left
                logger.info(f"📝 Updated left ear serial: {sale_in.serial_number_left}")
            elif assignment.ear == 'right' and sale_in.serial_number_right is not None:
                assignment.serial_number = sale_in.serial_number_right
                logger.info(f"📝 Updated right ear serial: {sale_in.serial_number_right}")
            
            # Update delivery and report status
            if sale_in.delivery_status is not None:
                assignment.delivery_status = sale_in.delivery_status
            if sale_in.report_status is not None:
                assignment.report_status = sale_in.report_status
            
            logger.info(f"🔄 Updated assignment {assignment.id}: ear={assignment.ear}, sgk_scheme={assignment.sgk_scheme}, sgk_support={assignment.sgk_support}")
        
        # Sync sale.sgk_coverage when SGK scheme changes
        if sale_in.sgk_scheme and sgk_support_per_ear is not None:
            sale.sgk_coverage = sgk_support_per_ear * num_assignments
            logger.info(f"💰 Synced sale.sgk_coverage = {sale.sgk_coverage} ({sgk_support_per_ear} × {num_assignments})")
    
    db.commit()
    
    # Log activity
    try:
        from models.user import ActivityLog
        changes = {}
        if sale_in.status: changes['status'] = sale_in.status
        if sale_in.payment_method: changes['payment_method'] = sale_in.payment_method
        if sale_in.final_amount is not None: changes['final_amount'] = float(sale_in.final_amount)
        if sale_in.ear: changes['ear'] = sale_in.ear
        
        activity_log = ActivityLog(
            user_id=getattr(access, 'user_id', None) or 'system',
            action='sale_updated',
            entity_type='sale',
            entity_id=sale_id,
            tenant_id=access.tenant_id,
            details=json.dumps({
                'party_id': sale.party_id,
                'changes': changes
            })
        )
        db.add(activity_log)
        db.commit()
    except Exception as log_error:
        logger.warning(f"Failed to log sale update: {log_error}")

    return ResponseEnvelope(data=sale, message="Sale updated")

@router.post("/sales/recalc", operation_id="createSaleRecalc", response_model=ResponseEnvelope[SaleRecalcResponse])
def recalc_sales(
    payload: SaleRecalcRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("sales.edit"))
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
    
    # Calculate net_payable - NO quantity multiplier needed since we create separate assignments for bilateral
    net_payable = final_sale_price
    
    # Allow explicit net_payable override
    if assignment_data.get('patient_payment') is not None or assignment_data.get('patientPayment') is not None:
        net_payable = float(assignment_data.get('patient_payment') or assignment_data.get('patientPayment'))
    elif assignment_data.get('net_payable') is not None:
        net_payable = float(assignment_data.get('net_payable'))
    
    # Create assignment
    assignment = DeviceAssignment(
        tenant_id=tenant_id,
        branch_id=branch_id,
        party_id=party_id,
        device_id=virtual_device.id if virtual_device else inventory_id,
        sale_id=sale_id,
        ear=assignment_data.get('ear') or 'both',
        reason=assignment_data.get('reason', 'Satış'),
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
        assignment_uid=f"ATM-{datetime.now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}"
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
    access: UnifiedAccess = Depends(require_access("sales.create"))
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
    
    try:
        access.require_permission("sale:write")
        
        # Validate party
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(
                status_code=404,
                detail="Party not found"
            )
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied"
            )
        
        device_assignments = data.device_assignments
        if not device_assignments:
            raise HTTPException(
                status_code=400,
                detail="At least one device assignment required"
            )
        
        tenant_id = access.tenant_id or party.tenant_id
        branch_id = data.branch_id or access.branch_id
        settings = _get_settings(db, tenant_id)
        sgk_scheme = data.sgk_scheme or settings.get('sgk', {}).get('default_scheme', 'standard')
        payment_plan_type = data.payment_plan or 'cash'
    except Exception as e:
        logger.error(f"Device assignment validation error: {e}")
        raise
    
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
        settings=settings,
        db=db
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
        
        # Check if bilateral - if so, create 2 separate assignments (left + right)
        ear_val = str(a_dict.get('ear', '')).lower()
        is_bilateral = ear_val in ['both', 'bilateral', 'b']
        
        if is_bilateral:
            # Create LEFT ear assignment
            left_dict = a_dict.copy()
            left_dict['ear'] = 'left'
            # For bilateral, split serial numbers
            if 'serial_number_left' in left_dict and left_dict['serial_number_left']:
                left_dict['serial_number'] = left_dict['serial_number_left']
            
            assignment_left, error_left, warning_left = _create_single_device_assignment(
                db=db,
                assignment_data=left_dict,
                party_id=party_id,
                sale_id=sale.id,
                sgk_scheme=sgk_scheme,
                pricing_calculation=pricing_calculation,
                index=i,
                tenant_id=tenant_id,
                branch_id=branch_id,
                created_by=access.user_id
            )
            
            if error_left:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message=f"Left ear: {error_left}", code="ASSIGNMENT_ERROR").model_dump(mode="json"),
                )
            
            if warning_left:
                warnings.append(f"Sol kulak: {warning_left}")
            
            created_assignment_ids.append(assignment_left.id)
            sale.left_ear_assignment_id = assignment_left.id
            
            # Create RIGHT ear assignment
            right_dict = a_dict.copy()
            right_dict['ear'] = 'right'
            # For bilateral, split serial numbers
            if 'serial_number_right' in right_dict and right_dict['serial_number_right']:
                right_dict['serial_number'] = right_dict['serial_number_right']
            
            assignment_right, error_right, warning_right = _create_single_device_assignment(
                db=db,
                assignment_data=right_dict,
                party_id=party_id,
                sale_id=sale.id,
                sgk_scheme=sgk_scheme,
                pricing_calculation=pricing_calculation,
                index=i,
                tenant_id=tenant_id,
                branch_id=branch_id,
                created_by=access.user_id
            )
            
            if error_right:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message=f"Right ear: {error_right}", code="ASSIGNMENT_ERROR").model_dump(mode="json"),
                )
            
            if warning_right:
                warnings.append(f"Sağ kulak: {warning_right}")
            
            created_assignment_ids.append(assignment_right.id)
            sale.right_ear_assignment_id = assignment_right.id
            
        else:
            # Single ear assignment (left or right)
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
            if ear_val.startswith('r') or ear_val == 'right':
                sale.right_ear_assignment_id = assignment.id
            elif ear_val.startswith('l') or ear_val == 'left':
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


@router.get("/device-assignments/{assignment_id}", operation_id="getDeviceAssignment", response_model=ResponseEnvelope[DeviceAssignmentRead])
def get_device_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("sales.view"))
):
    """Get a single device assignment with full details."""
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
    
    # Build full assignment data using the same helper as sales
    assignment_data = _build_device_info_from_assignment(db, assignment)
    
    return ResponseEnvelope(data=assignment_data)


@router.patch("/device-assignments/{assignment_id}", operation_id="updateDeviceAssignment", response_model=ResponseEnvelope[DeviceAssignmentRead])
def update_device_assignment(
    assignment_id: str,
    updates: DeviceAssignmentUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("sales.edit"))
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
    data = updates.model_dump(exclude_unset=True, by_alias=True)
    logger.info(f"📝 UPDATE DEVICE {assignment_id} PAYLOAD: {json.dumps(data, default=str)}")
    logger.info(f"🔍 DOWN_PAYMENT CHECK: 'down_payment' in data = {'down_payment' in data}, 'downPayment' in data = {'downPayment' in data}, down_payment value = {data.get('down_payment', 'NOT_FOUND')}, downPayment value = {data.get('downPayment', 'NOT_FOUND')}")
    
    # Also try with by_alias=True to see the difference
    data_with_alias = updates.model_dump(exclude_unset=True, by_alias=True)
    logger.info(f"📝 WITH ALIAS: {json.dumps(data_with_alias, default=str)}")
    
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
    if 'ear' in data:
        assignment.ear = data['ear']
    
    if 'reason' in data:
        assignment.reason = data['reason']
    
    if 'deviceId' in data:
        assignment.device_id = data['deviceId']
    
    # ==================== INVENTORY CHANGE (DEVICE SWAP) ====================
    if 'inventoryId' in data:
        new_inventory_id = data['inventoryId']
        old_inventory_id = assignment.inventory_id
        
        # Update inventory_id
        assignment.inventory_id = new_inventory_id
        
        # If inventory changed, fetch new item and update pricing
        if new_inventory_id and new_inventory_id != old_inventory_id:
            new_inv_item = db.get(InventoryItem, new_inventory_id)
            if new_inv_item:
                # Update base price from new inventory item
                assignment.list_price = new_inv_item.price
                
                logger.info(f"🔄 Device swapped: inventory_id changed from {old_inventory_id} to {new_inventory_id}")
                logger.info(f"   New price: {new_inv_item.price}, Brand: {new_inv_item.brand}, Model: {new_inv_item.model}")
                
                # Force pricing recalculation since base price changed
                data['basePrice'] = new_inv_item.price
    
    # Update pricing fields
    if 'basePrice' in data:
        assignment.list_price = data['basePrice']
    
    if 'discountType' in data:
        assignment.discount_type = data['discountType']
    
    if 'discountValue' in data:
        assignment.discount_value = data['discountValue']
    
    if 'paymentMethod' in data:
        assignment.payment_method = data['paymentMethod']
    
    if 'notes' in data:
        assignment.notes = data['notes']
    
    if 'sgkScheme' in data:
        assignment.sgk_scheme = data['sgkScheme']
    elif 'sgkSupportType' in data:
        assignment.sgk_scheme = data['sgkSupportType']
    
    # ==================== PRICING RECALCULATION ====================
    # Simple check: if any pricing field is in the request, recalculate
    # IMPORTANT: inventory_id change also triggers recalculation (device swap)
    pricing_fields = ['basePrice', 'discountType', 'discountValue', 'sgkScheme', 'sgkSupportType', 'inventoryId']
    should_recalculate = any(key in data for key in pricing_fields)
    
    logger.info(f"🔢 Pricing recalculation check: {should_recalculate}, data keys: {list(data.keys())}")
    
    # Check for explicit pricing overrides (support both snake_case and camelCase)
    explicit_list_price = data.get('listPrice')
    explicit_sale_price = data.get('salePrice')
    explicit_patient_payment = data.get('patientPayment') or data.get('netPayable')
    explicit_sgk = data.get('sgkSupport') or data.get('sgkReduction')
    
    if explicit_list_price is not None or explicit_sale_price is not None or explicit_patient_payment is not None or explicit_sgk is not None:
        # Apply explicit pricing selectively
        if explicit_list_price is not None:
            assignment.list_price = Decimal(str(explicit_list_price))
        
        if explicit_sgk is not None:
            assignment.sgk_support = Decimal(str(explicit_sgk))
        
        if explicit_patient_payment is not None:
            assignment.net_payable = Decimal(str(explicit_patient_payment))
        
        if explicit_sale_price is not None:
            assignment.sale_price = Decimal(str(explicit_sale_price))
        
        logger.info(f"✅ Selectively applied explicit pricing: list_price={explicit_list_price}, sale_price={explicit_sale_price}, patient_payment={explicit_patient_payment}, sgk={explicit_sgk}")
        
        # Flush and refresh to ensure sync_sale_totals sees updated values
        db.flush()
        db.refresh(assignment)
    elif should_recalculate:
        recalculate_assignment_pricing(db, assignment)
    
    # ==================== SALE SYNC (DOWN PAYMENT & TOTALS) ====================
    if assignment.sale_id:
        try:
            sale = db.get(Sale, assignment.sale_id)
            if sale:
                # First sync sale totals
                db.expire_all()  # Clear session cache before sync
                sync_sale_totals(db, sale.id)
                
                # Then sync down payment (after totals sync to avoid cache issues)
                down_payment_value = data.get('downPayment')
                if down_payment_value is not None:
                    try:
                        down_val = float(down_payment_value)
                        if down_val >= 0:
                            # Refresh sale object after sync_sale_totals
                            db.refresh(sale)
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
                                        notes='Ön ödeme (Cihaz Düzenleme)'
                                    )
                                    db.add(payment)
                                    logger.info(f"✅ Created new down payment record for: {down_val}")
                            
                            # Flush to ensure paid_amount is saved
                            db.flush()
                            logger.info(f"💰 Updated sale.paid_amount to: {down_val}")
                    except Exception as e:
                        logger.error(f"Failed to sync down payment: {e}")
        except Exception as e:
            logger.warning(f"Failed to sync sale record: {e}")
    
    # ==================== SERIAL NUMBER UPDATES ====================
    if 'serialNumber' in data:
        assignment.serial_number = data['serialNumber']
    
    if 'serialNumberLeft' in data:
        assignment.serial_number_left = data['serialNumberLeft']
    
    if 'serialNumberRight' in data:
        assignment.serial_number_right = data['serialNumberRight']
    
    # ==================== DELIVERY STATUS HANDLING ====================
    if 'deliveryStatus' in data:
        new_delivery_status = data.get('deliveryStatus')
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
    if 'reportStatus' in data:
        assignment.report_status = data.get('reportStatus')
    
    # ==================== LOANER DEVICE MANAGEMENT ====================
    if 'isLoaner' in data:
        new_is_loaner = data.get('isLoaner')
        old_is_loaner = assignment.is_loaner
        
        # If adding loaner device
        if not old_is_loaner and new_is_loaner:
            loaner_inventory_id = data.get('loanerInventoryId')
            
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
                        assignment.loaner_serial_number_left = data.get('loanerSerialNumberLeft')
                        assignment.loaner_serial_number_right = data.get('loanerSerialNumberRight')
                    else:
                        assignment.loaner_serial_number = data.get('loanerSerialNumber')
                    
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
        new_loaner_inventory_id = data.get('loanerInventoryId')
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
                        new_left = data.get('loanerSerialNumberLeft')
                        new_right = data.get('loanerSerialNumberRight')
                        if new_left:
                            new_serials.append(new_left)
                            new_loaner.remove_serial_number(new_left)
                        if new_right:
                            new_serials.append(new_right)
                            new_loaner.remove_serial_number(new_right)
                    else:
                        new_sn = data.get('loanerSerialNumber')
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
        if 'loanerSerialNumber' in data:
            assignment.loaner_serial_number = data['loanerSerialNumber']
        
        if 'loanerBrand' in data:
            assignment.loaner_brand = data['loanerBrand']
        
        if 'loanerModel' in data:
            assignment.loaner_model = data['loanerModel']
        
        if 'loanerSerialNumberLeft' in data:
            assignment.loaner_serial_number_left = data['loanerSerialNumberLeft']
        
        if 'loanerSerialNumberRight' in data:
            assignment.loaner_serial_number_right = data['loanerSerialNumberRight']
        
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
    access: UnifiedAccess = Depends(require_access("sales.edit"))
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
    access: UnifiedAccess = Depends(require_access("sales.view"))
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
