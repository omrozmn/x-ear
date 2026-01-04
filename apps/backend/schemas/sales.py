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
    sale_id: str = Field(..., alias="saleId")
    patient_id: Optional[str] = Field(None, alias="patientId")

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
    patient_id: str = Field(..., alias="patientId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    ear: Optional[str] = None # L, R, B
    reason: Optional[str] = None
    
    # Pricing
    list_price: float = Field(..., alias="listPrice")
    sale_price: float = Field(..., alias="salePrice")
    sgk_support: Optional[float] = Field(0.0, alias="sgkSupport")
    net_payable: Optional[float] = Field(0.0, alias="netPayable")
    
    # Serials
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    
    # Loaner Info
    is_loaner: bool = Field(False, alias="isLoaner")
    loaner_serial_number: Optional[str] = Field(None, alias="loanerSerialNumber")

class DeviceAssignmentRead(IDMixin, DeviceAssignmentBase):
    sale_id: str = Field(..., alias="saleId")
    delivery_status: str = Field("pending", alias="deliveryStatus")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    
    # Device details (enriched)
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    barcode: Optional[str] = None
    
    # Aliases for frontend compatibility
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
    
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    notes: Optional[str] = None
    user_id: Optional[str] = Field(None, alias="userId") # For audit


# ==================== SALE SCHEMAS ====================

class SaleBase(AppBaseModel):
    patient_id: str = Field(..., alias="patientId")
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

class SaleRead(IDMixin, TimestampMixin, SaleBase):
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    sale_number: Optional[str] = Field(None, alias="saleNumber")
    report_status: Optional[str] = Field(None, alias="reportStatus")
    
    # Relations (optional/enriched)
    patient: Optional[dict] = None # Or PatientRead (circular import risk)
    devices: List[DeviceAssignmentRead] = []
    payment_plan: Optional[PaymentPlanRead] = Field(None, alias="paymentPlan")
    payment_records: List[PaymentRecordRead] = Field([], alias="paymentRecords")
    invoice: Optional[dict] = None

class SaleCreate(AppBaseModel):
    patient_id: str = Field(..., alias="patientId")
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
