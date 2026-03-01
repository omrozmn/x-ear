# Sales Models (formerly Patient sales models)
from sqlalchemy import Column, Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text, Time, Index
from sqlalchemy.orm import relationship, backref
from core.models.base import Base
from .base import db, BaseModel, gen_id, gen_sale_id, JSONMixin
from .mixins import TenantScopedMixin
from .enums import DeviceSide
from .device import Device
from decimal import Decimal
import sqlalchemy as sa

class PaymentRecord(BaseModel, TenantScopedMixin):
    """Payment tracking for sales, promissory notes, and partial payments"""
    __tablename__ = "payment_records"
    
    # Primary key
    id = Column(String(50), primary_key=True, default=lambda: gen_id("payment"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=True)
    sale_id = Column(String(50), ForeignKey('sales.id'))  # Optional: link to sale
    promissory_note_id = Column(String(50))  # Link to promissory note if applicable
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Payment details
    amount = Column(sa.Numeric(12, 2), nullable=False)
    payment_date = Column(DateTime, nullable=False)  # When payment was made/recorded
    due_date = Column(DateTime)  # For promissory notes or installments
    payment_method = Column(String(20), nullable=False)  # cash, card, transfer, promissory_note
    payment_type = Column(String(20), default='payment')  # payment, down_payment, installment, promissory_note
    
    # Status
    status = Column(String(20), default='pending')  # pending, paid, partial, overdue, cancelled
    
    # Reference info
    reference_number = Column(String(100))  # Check number, transaction ID, etc.
    notes = Column(Text)  # Additional notes about the payment
    # POS / Online Payment details
    pos_provider = Column(String(50))  # e.g., paytr, iyzico
    pos_transaction_id = Column(String(100), index=True)
    pos_status = Column(String(50))  # success, failed, refund
    installment_count = Column(Integer, default=1)
    is_3d_secure = Column(Boolean, default=False)
    pos_raw_response = Column(JSON)  # Store full callback for audit
    gross_amount = Column(sa.Numeric(12, 2))  # Amount charged to card
    net_amount = Column(sa.Numeric(12, 2))  # Amount after commission
    error_message = Column(Text)

    def to_dict(self):
        base_dict = self.to_dict_base()
        payment_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'saleId': self.sale_id,
            'promissoryNoteId': self.promissory_note_id,
            'branchId': self.branch_id,
            'amount': float(self.amount) if self.amount else None,
            'paymentDate': self.payment_date.isoformat() if self.payment_date else None,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'paymentMethod': self.payment_method,
            'paymentType': self.payment_type,
            'status': self.status,
            'referenceNumber': self.reference_number,
            'notes': self.notes,
            # POS Details
            'posProvider': self.pos_provider,
            'posStatus': self.pos_status,
            'installmentCount': self.installment_count,
            'grossAmount': float(self.gross_amount) if self.gross_amount else None,
            'netAmount': float(self.net_amount) if self.net_amount else None
        }
        payment_dict.update(base_dict)
        return payment_dict

class DeviceAssignment(BaseModel, TenantScopedMixin):
    __tablename__ = "device_assignments"
    
    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("assign"))
    
    # User-facing ID (e.g., ATM-123456)
    assignment_uid = Column(String(20), unique=True, nullable=True)
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    device_id = Column(String(50), nullable=True)  # Can be inventory_id or actual device_id
    sale_id = Column(String(50), ForeignKey('sales.id'), nullable=True)  # Link to sale
    inventory_id = Column(String(50), ForeignKey('inventory.id'), nullable=True)  # Link to inventory item
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Assignment details
    ear = Column(String(1))  # L, R, B for Left, Right, Both/Bilateral
    reason = Column(String(50))  # Sale, Trial, Replacement, etc.
    from_inventory = Column(Boolean, default=False)
    
    # Serial numbers for bilateral assignments
    serial_number = Column(String(100))  # For single ear assignments
    serial_number_left = Column(String(100))  # For bilateral - left ear
    serial_number_right = Column(String(100))  # For bilateral - right ear
    
    # Pricing details
    list_price = Column(sa.Numeric(12, 2))
    sale_price = Column(sa.Numeric(12, 2))
    sgk_scheme = Column(String(50))
    sgk_support = Column(sa.Numeric(12, 2))
    discount_type = Column(String(10))
    discount_value = Column(sa.Numeric(12, 2))
    net_payable = Column(sa.Numeric(12, 2))
    payment_method = Column(String(20))
    
    # Delivery and loaner tracking
    delivery_status = Column(String(20), default='pending')  # pending, delivered
    is_loaner = Column(Boolean, default=False)  # Is this assignment using a loaner device
    loaner_inventory_id = Column(String(50), ForeignKey('inventory.id'), nullable=True)  # Loaner device from inventory
    loaner_serial_number = Column(String(100))  # Serial number of loaner device
    loaner_serial_number_left = Column(String(100))  # Serial number of loaner device (Left)
    loaner_serial_number_right = Column(String(100))  # Serial number of loaner device (Right)
    loaner_brand = Column(String(100))  # Brand of loaner device
    loaner_model = Column(String(100))  # Model of loaner device
    
    # Additional info
    report_status = Column(String(50))  # raporlu, raporsuz, bekleniyor
    notes = Column(Text)

    # Relationships
    # Note: device_id is not a foreign key, we use inventory relationship instead
    inventory = relationship('InventoryItem', foreign_keys=[inventory_id], backref='device_assignments', lazy=True)
    loaner_inventory = relationship('InventoryItem', foreign_keys=[loaner_inventory_id], backref='loaner_assignments', lazy=True)
    
    # We keep 'device' relationship for Manual/Virtual assignments that don't have inventory_id
    # FIX: Explicitly specify foreign_keys because device_id is not a DB ForeignKey
    # AND specify primaryjoin so SQLAlchemy knows how to join despite missing FK
    device = relationship(
        'Device', 
        foreign_keys=[device_id], 
        primaryjoin="DeviceAssignment.device_id == Device.id",
        backref='assignments', 
        lazy=True
    )

    def to_dict(self):
        base_dict = self.to_dict_base()
        
        # Fetch device details
        brand = None
        model = None
        barcode = None
        
        # Strategy: Try specific Device record first (handles Manual/Virtual), then fallback to Inventory
        if self.device:
            brand = self.device.brand
            model = self.device.model
            barcode = getattr(self.device, 'barcode', None)
        
        if not brand and self.inventory:
            brand = self.inventory.brand
            model = self.inventory.model
            if not barcode:
                 barcode = self.inventory.barcode
        
        # Loaner logic fallback
        if self.is_loaner and not brand:
             brand = self.loaner_brand
             model = self.loaner_model
        
        assignment_dict = {
            'id': self.id,
            'assignmentUid': self.assignment_uid,
            'brand': brand,
            'model': model,
            'deviceName': f"{brand or ''} {model or ''}".strip(),
            'barcode': barcode,
            'partyId': self.party_id,
            'deviceId': self.device_id,
            'saleId': self.sale_id,
            'inventoryId': self.inventory_id,
            'branchId': self.branch_id,
            'ear': self.ear,
            'reason': self.reason,
            'fromInventory': bool(self.from_inventory) if self.from_inventory is not None else False,
            'listPrice': float(self.list_price) if self.list_price else None,
            'salePrice': float(self.sale_price) if self.sale_price else None,
            'sgkScheme': self.sgk_scheme,
            'sgkSupport': float(self.sgk_support) if self.sgk_support else None,
            'discountType': self.discount_type,
            'discountValue': float(self.discount_value) if self.discount_value else None,
            'netPayable': float(self.net_payable) if self.net_payable else None,
            'paymentMethod': self.payment_method,
            'notes': self.notes,
            'serialNumber': self.serial_number,
            'serialNumberLeft': self.serial_number_left,
            'serialNumberRight': self.serial_number_right,
            'deliveryStatus': self.delivery_status,
            'isLoaner': bool(self.is_loaner) if self.is_loaner is not None else False,
            'loanerInventoryId': self.loaner_inventory_id,
            'loanerSerialNumber': self.loaner_serial_number,
            'loanerSerialNumberLeft': self.loaner_serial_number_left,
            'loanerSerialNumberRight': self.loaner_serial_number_right,
            'loanerBrand': self.loaner_brand,
            'loanerModel': self.loaner_model,
            'reportStatus': self.report_status,
            'assignedDate': self.created_at.isoformat() if self.created_at else None, # key fix
            'createdAt': self.created_at.isoformat() if self.created_at else None 
        }
        assignment_dict.update(base_dict)
        return assignment_dict

class Sale(BaseModel, TenantScopedMixin):
    __tablename__ = "sales"
    
    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=gen_sale_id)
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    product_id = Column(String(50), ForeignKey('inventory.id'), nullable=True)  # Link to inventory product
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Sale details
    sale_date = Column(DateTime, nullable=False)
    list_price_total = Column(sa.Numeric(12,2))  # Total list price (before discount)
    total_amount = Column(sa.Numeric(12,2))  # Precise money handling
    discount_amount = Column(sa.Numeric(12,2), default=0.0)  # Precise money handling
    final_amount = Column(sa.Numeric(12,2))  # Precise money handling
    paid_amount = Column(sa.Numeric(12,2), default=0.0)  # Track paid amount for partial payments
    
    # Device assignments (will be replaced by sale_items table in future)
    right_ear_assignment_id = Column(String(50), ForeignKey('device_assignments.id', use_alter=True))
    left_ear_assignment_id = Column(String(50), ForeignKey('device_assignments.id', use_alter=True))
    
    # Status and payment
    status = Column(String(20), default='pending')  # pending, completed, cancelled, refunded
    payment_method = Column(String(20), default='cash')  # cash, card, installment, insurance
    
    # SGK integration
    sgk_coverage = Column(sa.Numeric(12,2), default=0.0)  # Precise money handling
    patient_payment = Column(sa.Numeric(12,2))  # Precise money handling
    
    # Additional info
    report_status = Column(String(50))
    notes = Column(Text)
    
    # KDV (VAT) information
    kdv_rate = Column(Float, default=20.0)  # KDV oranı (%)
    kdv_amount = Column(sa.Numeric(12,2), default=0.0)  # KDV tutarı
    
    # Relationships
    party = relationship('Party', backref=backref('sales', cascade='all, delete-orphan'), lazy=True)

    def to_dict(self):
        base_dict = self.to_dict_base()
        sale_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'productId': self.product_id,
            'branchId': self.branch_id,
            'saleDate': self.sale_date.isoformat() if self.sale_date else None,
            'listPriceTotal': float(self.list_price_total) if self.list_price_total else None,
            'totalAmount': float(self.total_amount) if self.total_amount else None,
            'discountAmount': float(self.discount_amount) if self.discount_amount else 0.0,
            'finalAmount': float(self.final_amount) if self.final_amount else None,
            'paidAmount': float(self.paid_amount) if self.paid_amount else 0.0,
            'rightEarAssignmentId': self.right_ear_assignment_id,
            'leftEarAssignmentId': self.left_ear_assignment_id,
            'status': self.status,
            'paymentMethod': self.payment_method,
            'sgkCoverage': float(self.sgk_coverage) if self.sgk_coverage else 0.0,
            'patientPayment': float(self.patient_payment) if self.patient_payment else None,
            'reportStatus': self.report_status,
            'notes': self.notes,
            'kdvRate': float(self.kdv_rate) if self.kdv_rate else 20.0,
            'kdvAmount': float(self.kdv_amount) if self.kdv_amount else 0.0
        }
        sale_dict.update(base_dict)
        return sale_dict

class PaymentPlan(BaseModel, TenantScopedMixin):
    __tablename__ = "payment_plans"
    
    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("plan"))
    
    # Foreign keys
    sale_id = Column(String(50), ForeignKey('sales.id'), nullable=False)
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Plan details
    plan_name = Column(String(100), nullable=False)
    total_amount = Column(Float, nullable=False)  # TODO: Change to Numeric(12,2)
    installment_count = Column(Integer, nullable=False)
    installment_amount = Column(Float, nullable=False)  # TODO: Change to Numeric(12,2)
    
    # Backwards-compatible alias expected by older tests and frontend code
    @property
    def installments(self):
        """Alias for installment_count kept for backward compatibility."""
        return self.installment_count
    
    @installments.setter
    def installments(self, value):
        try:
            self.installment_count = int(value)
        except Exception:
            self.installment_count = value

    # Interest and fees
    interest_rate = Column(Float, default=0.0)
    processing_fee = Column(Float, default=0.0)  # TODO: Change to Numeric(12,2)
    
    # Status
    status = Column(String(20), default='active')  # active, completed, cancelled
    start_date = Column(DateTime, nullable=False)

    def to_dict(self):
        base_dict = self.to_dict_base()
        plan_dict = {
            'id': self.id,
            'saleId': self.sale_id,
            'branchId': self.branch_id,
            'planName': self.plan_name,
            'totalAmount': float(self.total_amount) if self.total_amount else None,
            'installmentCount': self.installment_count,
            # Keep a camel-cased alias used around the codebase
            'installments': self.installment_count,
            'installmentAmount': float(self.installment_amount) if self.installment_amount else None,
            'interestRate': float(self.interest_rate) if self.interest_rate else 0.0,
            'processingFee': float(self.processing_fee) if self.processing_fee else 0.0,
            'status': self.status,
            'startDate': self.start_date.isoformat() if self.start_date else None
        }
        plan_dict.update(base_dict)
        return plan_dict

class PaymentInstallment(BaseModel, TenantScopedMixin):
    __tablename__ = "payment_installments"
    
    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("inst"))
    
    # Foreign keys
    payment_plan_id = Column(String(50), ForeignKey('payment_plans.id'), nullable=False)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Installment details
    installment_number = Column(Integer, nullable=False)
    due_date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)  # TODO: Change to Numeric(12,2)
    
    # Payment tracking
    paid_date = Column(DateTime)
    paid_amount = Column(Float)  # TODO: Change to Numeric(12,2)
    status = Column(String(20), default='pending')  # pending, paid, overdue, cancelled
    
    # Late fees
    late_fee = Column(Float, default=0.0)  # TODO: Change to Numeric(12,2)
    notes = Column(Text)

    def to_dict(self):
        base_dict = self.to_dict_base()
        installment_dict = {
            'id': self.id,
            'paymentPlanId': self.payment_plan_id,
            'installmentNumber': self.installment_number,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'amount': float(self.amount) if self.amount else None,
            'paidDate': self.paid_date.isoformat() if self.paid_date else None,
            'paidAmount': float(self.paid_amount) if self.paid_amount else None,
            'status': self.status,
            'lateFee': float(self.late_fee) if self.late_fee else 0.0,
            'notes': self.notes
        }
        installment_dict.update(base_dict)
        return installment_dict

    # Index suggestions
    __table_args__ = (
        Index('ix_installment_plan', 'payment_plan_id'),
        Index('ix_installment_due_date', 'due_date'),
        Index('ix_installment_status', 'status'),
    )