from typing import Optional, List, Union, Dict, Any
from enum import Enum
from datetime import datetime
from pydantic import Field, validator
from decimal import Decimal
from .base import AppBaseModel, IDMixin, TimestampMixin

# ==================== PAYMENT SCHEMAS ====================

class PaymentRecordBase(AppBaseModel):
    amount: float
    payment_method: str = Field(..., alias="paymentMethod")
    payment_type: str = Field("payment", alias="paymentType")
    status: str = Field("paid")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")
    notes: Optional[str] = None
    promissory_note_id: Optional[str] = Field(None, alias="promissoryNoteId")
    payment_date: datetime = Field(default_factory=datetime.utcnow, alias="paymentDate")
    due_date: Optional[datetime] = Field(None, alias="dueDate")

class PaymentRecordRead(IDMixin, TimestampMixin, PaymentRecordBase):
    sale_id: Optional[str] = Field(None, alias="saleId")
    party_id: Optional[str] = Field(None, alias="partyId")

class PaymentRecordCreate(PaymentRecordBase):
    pass

class PaymentInstallmentRead(IDMixin, AppBaseModel):
    payment_plan_id: str = Field(..., alias="paymentPlanId")
    installment_number: int = Field(..., alias="installmentNumber")
    amount: float
    due_date: datetime = Field(..., alias="dueDate")
    status: str
    paid_date: Optional[datetime] = Field(None, alias="paidDate")
    notes: Optional[str] = None

class PaymentPlanBase(AppBaseModel):
    plan_name: Optional[str] = Field(None, alias="planName")
    total_amount: float = Field(..., alias="totalAmount")
    installment_count: int = Field(..., alias="installmentCount")
    down_payment: float = Field(0.0, alias="downPayment")
    monthly_amount: float = Field(0.0, alias="monthlyAmount")
    start_date: datetime = Field(..., alias="startDate")
    interest_rate: float = Field(0.0, alias="interestRate")
    notes: Optional[str] = None

class PaymentPlanRead(IDMixin, TimestampMixin, PaymentPlanBase):
    sale_id: str = Field(..., alias="saleId")
    plan_type: str = Field(..., alias="planType")
    status: str = "active"
    installments: List[PaymentInstallmentRead] = []

class PaymentPlanCreate(AppBaseModel):
    plan_type: str = Field("installment", alias="planType") # 'installment' or 'custom'
    installment_count: int = Field(6, alias="installmentCount")
    down_payment: float = Field(0.0, alias="downPayment")
    installments: Optional[List[Dict[str, Any]]] = None # For custom plans

class InstallmentPayment(AppBaseModel):
    amount: Optional[float] = None
    payment_method: str = Field("cash", alias="paymentMethod")
    payment_date: Optional[datetime] = Field(None, alias="paymentDate")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")


# ==================== DEVICE ASSIGNMENT SCHEMAS ====================

class DeviceAssignmentBase(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    ear: Optional[str] = None # L, R, B
    reason: Optional[str] = None
    
    # Pricing
    list_price: Optional[float] = Field(0.0, alias="listPrice")
    sale_price: Optional[float] = Field(0.0, alias="salePrice")
    sgk_support: Optional[float] = Field(0.0, alias="sgkSupport")
    net_payable: Optional[float] = Field(0.0, alias="netPayable")
    
    # Serials
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    
    # Loaner Info
    is_loaner: bool = Field(False, alias="isLoaner")
    loaner_serial_number: Optional[str] = Field(None, alias="loanerSerialNumber")


# ==================== DEVICE ASSIGNMENT CREATE SCHEMA ====================

class DeviceAssignmentItemCreate(AppBaseModel):
    """Single device assignment item within a batch assignment request."""
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    ear: Optional[str] = Field("both", alias="ear")  # L, R, B, both, left, right
    reason: Optional[str] = Field("Sale")
    
    # Pricing (optional - server calculates if not provided)
    base_price: Optional[float] = Field(None, alias="basePrice")
    discount_type: Optional[str] = Field(None, alias="discountType")  # percentage, fixed
    discount_value: Optional[float] = Field(None, alias="discountValue")
    sale_price: Optional[float] = Field(None, alias="salePrice")
    patient_payment: Optional[float] = Field(None, alias="patientPayment")
    sgk_support: Optional[float] = Field(None, alias="sgkSupport")
    sgk_scheme: Optional[str] = Field(None, alias="sgkScheme")
    
    # Serials
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    
    # Manual device info (when not from inventory)
    manual_brand: Optional[str] = Field(None, alias="manualBrand")
    manual_model: Optional[str] = Field(None, alias="manualModel")
    
    # Delivery & Report
    delivery_status: Optional[str] = Field("pending", alias="deliveryStatus")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    
    # Loaner device info
    is_loaner: bool = Field(False, alias="isLoaner")
    loaner_inventory_id: Optional[str] = Field(None, alias="loanerInventoryId")
    loaner_serial_number: Optional[str] = Field(None, alias="loanerSerialNumber")
    loaner_serial_number_left: Optional[str] = Field(None, alias="loanerSerialNumberLeft")
    loaner_serial_number_right: Optional[str] = Field(None, alias="loanerSerialNumberRight")
    loaner_brand: Optional[str] = Field(None, alias="loanerBrand")
    loaner_model: Optional[str] = Field(None, alias="loanerModel")
    
    payment_method: Optional[str] = Field("cash", alias="paymentMethod")
    notes: Optional[str] = None


class DeviceAssignmentCreate(AppBaseModel):
    """Request body for POST /parties/{party_id}/device-assignments endpoint."""
    device_assignments: List[DeviceAssignmentItemCreate] = Field(..., alias="deviceAssignments")
    
    # SGK scheme for all assignments (can be overridden per item)
    sgk_scheme: Optional[str] = Field(None, alias="sgkScheme")
    
    # Payment plan type: cash, installment_3, installment_6, etc.
    payment_plan: Optional[str] = Field("cash", alias="paymentPlan")
    
    # Branch ID (optional)
    branch_id: Optional[str] = Field(None, alias="branchId")
    
    # Accessories and services (optional)
    accessories: Optional[List[Dict[str, Any]]] = None
    services: Optional[List[Dict[str, Any]]] = None


class DeviceAssignmentCreateResponse(AppBaseModel):
    """Response for device assignment creation."""
    sale_id: str = Field(..., alias="saleId")
    assignment_ids: List[str] = Field(..., alias="assignmentIds")
    pricing: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)

class DeviceAssignmentRead(IDMixin, TimestampMixin, DeviceAssignmentBase):
    sale_id: Optional[str] = Field(None, alias="saleId")
    delivery_status: str = Field("pending", alias="deliveryStatus")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    
    # Device details (enriched)
    name: Optional[str] = None
    device_name: Optional[str] = Field(None, alias="deviceName")  # Computed: brand + model
    brand: Optional[str] = None
    model: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None  # From inventory (Flask parity)
    
    # Assignment details
    assignment_uid: Optional[str] = Field(None, alias="assignmentUid")
    assigned_date: Optional[str] = Field(None, alias="assignedDate")
    
    # SGK and Payment
    sgk_scheme: Optional[str] = Field(None, alias="sgkScheme")
    sgk_support_type: Optional[str] = Field(None, alias="sgkSupportType")  # Alias for sgkScheme (Flask parity)
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    discount_type: Optional[str] = Field(None, alias="discountType")
    discount_value: Optional[float] = Field(None, alias="discountValue")
    down_payment: Optional[float] = Field(0.0, alias="downPayment")  # From PaymentRecord (Flask parity)
    
    # Ear side alias (Flask parity)
    ear_side: Optional[str] = Field(None, alias="earSide")
    
    # Loaner device details
    loaner_inventory_id: Optional[str] = Field(None, alias="loanerInventoryId")
    loaner_brand: Optional[str] = Field(None, alias="loanerBrand")
    loaner_model: Optional[str] = Field(None, alias="loanerModel")
    loaner_serial_number_left: Optional[str] = Field(None, alias="loanerSerialNumberLeft")
    loaner_serial_number_right: Optional[str] = Field(None, alias="loanerSerialNumberRight")
    
    # Aliases for frontend compatibility (Flask parity)
    sgk_reduction: float = Field(0.0, alias="sgkReduction")
    patient_payment: float = Field(0.0, alias="patientPayment")
    sgk_coverage_amount: float = Field(0.0, alias="sgkCoverageAmount")
    patient_responsible_amount: float = Field(0.0, alias="patientResponsibleAmount")

class DeviceAssignmentUpdate(AppBaseModel):
    device_id: Optional[str] = Field(None, alias="deviceId")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    ear_side: Optional[str] = Field(None, alias="ear") # Accept 'ear' or 'ear_side'
    
    status: Optional[str] = None
    reason: Optional[str] = None
    
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    
    delivery_status: Optional[str] = Field(None, alias="deliveryStatus")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    
    # Pricing
    base_price: Optional[float] = Field(None, alias="basePrice")
    discount_type: Optional[str] = Field(None, alias="discountType")
    discount_value: Optional[float] = Field(None, alias="discountValue")
    sgk_scheme: Optional[str] = Field(None, alias="sgkScheme")
    sgkSupportType: Optional[str] = None # Alias
    
    # Explicit overrides
    sale_price: Optional[float] = Field(None, alias="salePrice")
    patient_payment: Optional[float] = Field(None, alias="patientPayment")
    sgk_reduction: Optional[float] = Field(None, alias="sgkReduction")
    sgkSupport: Optional[float] = None # Alias
    
    # Down payment
    down_payment: Optional[float] = Field(None, alias="downPayment")
    
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    notes: Optional[str] = None
    user_id: Optional[str] = Field(None, alias="userId") # For audit
    
    # Loaner device fields
    is_loaner: Optional[bool] = Field(None, alias="isLoaner")
    loaner_inventory_id: Optional[str] = Field(None, alias="loanerInventoryId")
    loaner_serial_number: Optional[str] = Field(None, alias="loanerSerialNumber")
    loaner_serial_number_left: Optional[str] = Field(None, alias="loanerSerialNumberLeft")
    loaner_serial_number_right: Optional[str] = Field(None, alias="loanerSerialNumberRight")
    loaner_brand: Optional[str] = Field(None, alias="loanerBrand")
    loaner_model: Optional[str] = Field(None, alias="loanerModel")


# ==================== SALE SCHEMAS ====================

class SaleBase(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    sale_date: datetime = Field(default_factory=datetime.utcnow, alias="saleDate")
    status: str = Field("completed")
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    notes: Optional[str] = None
    
    # Financials
    list_price_total: float = Field(0.0, alias="listPriceTotal")
    total_amount: float = Field(..., alias="totalAmount") # Often same as list_price_total or final_amount depending on context
    discount_amount: float = Field(0.0, alias="discountAmount")
    sgk_coverage: float = Field(0.0, alias="sgkCoverage")
    final_amount: float = Field(..., alias="finalAmount") # Net payable
    paid_amount: float = Field(0.0, alias="paidAmount")
    patient_payment: float = Field(0.0, alias="patientPayment") # Usually final_amount - sgk (or similar logic)
    
    # Assignments (IDs kept for reference)
    right_ear_assignment_id: Optional[str] = Field(None, alias="rightEarAssignmentId")
    left_ear_assignment_id: Optional[str] = Field(None, alias="leftEarAssignmentId")

from pydantic import model_validator

class SaleRead(IDMixin, TimestampMixin, AppBaseModel):
    """Schema for reading a sale - matches Sale.to_dict() output"""
    party_id: str = Field(..., alias="partyId")
    product_id: Optional[str] = Field(None, alias="productId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    
    sale_date: Optional[datetime] = Field(None, alias="saleDate")
    status: Optional[str] = None
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    notes: Optional[str] = None
    
    remaining_amount: Optional[float] = Field(0.0, alias="remainingAmount")

    @model_validator(mode='before')
    @classmethod
    def map_orm_fields(cls, data: Any) -> Any:
        """Map ORM field names to schema field names"""
        if isinstance(data, dict):
            return data
        elif hasattr(data, '_sa_instance_state') or hasattr(data, '__dict__'):
            # Convert to structured dict to handle complex fields and relations
            res = {}
            for field_name, schema_field in cls.model_fields.items():
                # Skip computed fields or those handled specially
                if field_name == 'remaining_amount':
                    continue
                
                # Fetch attribute
                val = getattr(data, field_name, None)
                
                # Handle relationships or complex types by preserving them
                # Pydantic will validate them against their own schemas (e.g., DeviceAssignmentRead)
                # IF those schemas also have from_attributes=True.
                res[field_name] = val
            
            # Explicitly compute remaining_amount for dict output
            final = getattr(data, 'final_amount', 0.0) or 0.0
            paid = getattr(data, 'paid_amount', 0.0) or 0.0
            res['remaining_amount'] = max(0.0, float(final) - float(paid))
            
            return res
        return data

    # Assignments
    right_ear_assignment_id: Optional[str] = Field(None, alias="rightEarAssignmentId")
    left_ear_assignment_id: Optional[str] = Field(None, alias="leftEarAssignmentId")
    
    report_status: Optional[str] = Field(None, alias="reportStatus")

    # Enriched Data (for include_details=True)
    patient: Optional[Dict[str, Any]] = None
    
    # Golden Path: Strict typing for improved type safety
    devices: Optional[List[DeviceAssignmentRead]] = Field(default_factory=list)
    payment_plan: Optional[PaymentPlanRead] = Field(None, alias="paymentPlan") 
    payment_records: Optional[List[PaymentRecordRead]] = Field(default_factory=list, alias="paymentRecords") 
    payments: Optional[List[Dict[str, Any]]] = None # Backward compatibility alias
    invoice: Optional[Dict[str, Any]] = None

class SaleCreate(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    product_id: str = Field(..., alias="productId")
    
    # Optional overrides
    sales_price: Optional[float] = Field(None, alias="salesPrice")
    quantity: int = Field(1)
    
    discount_type: Optional[str] = Field(None, alias="discountType")
    discount_amount: Optional[float] = Field(None, alias="discountAmount")
    
    payment_method: Optional[str] = Field("cash", alias="paymentMethod")
    notes: Optional[str] = None
    
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    
    ear_side: Optional[str] = Field(None, alias="earSide")
    sgk_scheme: Optional[str] = Field(None, alias="sgkScheme")
    
    # Financial overrides
    down_payment: Optional[float] = Field(None, alias="downPayment")
    paid_amount: Optional[float] = Field(None, alias="paidAmount")
    sgk_coverage: Optional[float] = Field(None, alias="sgkCoverage")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    sale_date: Optional[datetime] = Field(None, alias="saleDate")

class SaleUpdate(AppBaseModel):
    list_price_total: Optional[float] = Field(None, alias="listPriceTotal")
    discount_amount: Optional[float] = Field(None, alias="discountAmount")
    sgk_coverage: Optional[float] = Field(None, alias="sgkCoverage")
    patient_payment: Optional[float] = Field(None, alias="patientPayment")
    final_amount: Optional[float] = Field(None, alias="finalAmount")
    
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    status: Optional[str] = None
    notes: Optional[str] = None

class SaleRecalcRequest(AppBaseModel):
    party_id: Optional[str] = Field(None, alias="partyId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    limit: Optional[int] = None

class SaleRecalcResponse(AppBaseModel):
    success: bool
    updated: int
    processed: int
    errors: List[Dict[str, Any]]

# ==================== PROMISSORY NOTE SCHEMAS ====================

class PromissoryNoteBase(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    note_number: int = Field(..., alias="noteNumber")
    total_notes: int = Field(..., alias="totalNotes")
    amount: float
    paid_amount: float = Field(0.0, alias="paidAmount")
    total_amount: Optional[float] = Field(None, alias="totalAmount")
    
    issue_date: Optional[datetime] = Field(None, alias="issueDate")
    due_date: Optional[datetime] = Field(None, alias="dueDate")
    status: str = "active"
    paid_date: Optional[datetime] = Field(None, alias="paidDate")
    
    # Debtor Info
    debtor_name: str = Field(..., alias="debtorName")
    debtor_tc: Optional[str] = Field(None, alias="debtorTc")
    debtor_address: Optional[str] = Field(None, alias="debtorAddress")
    debtor_tax_office: Optional[str] = Field(None, alias="debtorTaxOffice")
    debtor_phone: Optional[str] = Field(None, alias="debtorPhone")
    
    # Guarantor Info
    has_guarantor: bool = Field(False, alias="hasGuarantor")
    guarantor_name: Optional[str] = Field(None, alias="guarantorName")
    guarantor_tc: Optional[str] = Field(None, alias="guarantorTc")
    guarantor_address: Optional[str] = Field(None, alias="guarantorAddress")
    guarantor_phone: Optional[str] = Field(None, alias="guarantorPhone")
    
    authorized_court: str = Field("İstanbul (Çağlayan)", alias="authorizedCourt")
    document_id: Optional[str] = Field(None, alias="documentId")
    file_name: Optional[str] = Field(None, alias="fileName")
    notes: Optional[str] = None

class PromissoryNoteRead(IDMixin, TimestampMixin, PromissoryNoteBase):
    """Schema for reading Promissory Note"""
    pass

class PromissoryNoteCollectionResponse(AppBaseModel):
    note: PromissoryNoteRead
    payment: PaymentRecordRead

