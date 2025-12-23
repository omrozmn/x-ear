# Sales-related Models: Sale, PaymentPlan, PaymentInstallment, DeviceAssignment, PaymentRecord
from .base import db, BaseModel, gen_id, gen_sale_id, JSONMixin
from .enums import DeviceSide
from decimal import Decimal
import sqlalchemy as sa

class PaymentRecord(BaseModel):
    """Payment tracking for sales, promissory notes, and partial payments"""
    __tablename__ = "payment_records"
    
    # Primary key
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("payment"))
    
    # Foreign keys
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True)
    sale_id = db.Column(db.String(50), db.ForeignKey('sales.id'))  # Optional: link to sale
    promissory_note_id = db.Column(db.String(50))  # Link to promissory note if applicable
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    
    # Payment details
    amount = db.Column(sa.Numeric(12, 2), nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False)  # When payment was made/recorded
    due_date = db.Column(db.DateTime)  # For promissory notes or installments
    payment_method = db.Column(db.String(20), nullable=False)  # cash, card, transfer, promissory_note
    payment_type = db.Column(db.String(20), default='payment')  # payment, down_payment, installment, promissory_note
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, paid, partial, overdue, cancelled
    
    # Reference info
    reference_number = db.Column(db.String(100))  # Check number, transaction ID, etc.
    # POS / Online Payment details
    pos_provider = db.Column(db.String(50))  # e.g., paytr, iyzico
    pos_transaction_id = db.Column(db.String(100), index=True)
    pos_status = db.Column(db.String(50))  # success, failed, refund
    installment_count = db.Column(db.Integer, default=1)
    is_3d_secure = db.Column(db.Boolean, default=False)
    pos_raw_response = db.Column(db.JSON)  # Store full callback for audit
    gross_amount = db.Column(sa.Numeric(12, 2))  # Amount charged to card
    net_amount = db.Column(sa.Numeric(12, 2))  # Amount after commission
    error_message = db.Column(db.Text)

    def to_dict(self):
        base_dict = self.to_dict_base()
        payment_dict = {
            'id': self.id,
            'patientId': self.patient_id,
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

class DeviceAssignment(BaseModel):
    __tablename__ = "device_assignments"
    
    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("assign"))
    
    # Foreign keys
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    device_id = db.Column(db.String(50), nullable=True)  # Can be inventory_id or actual device_id
    sale_id = db.Column(db.String(50), db.ForeignKey('sales.id'), nullable=True)  # Link to sale
    inventory_id = db.Column(db.String(50), db.ForeignKey('inventory.id'), nullable=True)  # Link to inventory item
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    
    # Assignment details
    ear = db.Column(db.String(1))  # L, R, B for Left, Right, Both/Bilateral
    reason = db.Column(db.String(50))  # Sale, Trial, Replacement, etc.
    from_inventory = db.Column(db.Boolean, default=False)
    
    # Serial numbers for bilateral assignments
    serial_number = db.Column(db.String(100))  # For single ear assignments
    serial_number_left = db.Column(db.String(100))  # For bilateral - left ear
    serial_number_right = db.Column(db.String(100))  # For bilateral - right ear
    
    # Pricing details
    list_price = db.Column(sa.Numeric(12, 2))
    sale_price = db.Column(sa.Numeric(12, 2))
    sgk_scheme = db.Column(db.String(50))
    sgk_support = db.Column(sa.Numeric(12, 2))
    discount_type = db.Column(db.String(10))
    discount_value = db.Column(sa.Numeric(12, 2))
    net_payable = db.Column(sa.Numeric(12, 2))
    payment_method = db.Column(db.String(20))
    
    # Additional info
    notes = db.Column(db.Text)

    # Relationships
    # device = db.relationship('Device', backref='assignments', lazy=True)  # Removed - device_id is not FK anymore

    def to_dict(self):
        base_dict = self.to_dict_base()
        assignment_dict = {
            'id': self.id,
            'patientId': self.patient_id,
            'deviceId': self.device_id,
            'saleId': self.sale_id,
            'inventoryId': self.inventory_id,
            'branchId': self.branch_id,
            'ear': self.ear,
            'reason': self.reason,
            'fromInventory': self.from_inventory,
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
            'serialNumberRight': self.serial_number_right
        }
        assignment_dict.update(base_dict)
        return assignment_dict

class Sale(BaseModel):
    __tablename__ = "sales"
    
    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=gen_sale_id)
    
    # Foreign keys
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    product_id = db.Column(db.String(50), db.ForeignKey('inventory.id'), nullable=True)  # Link to inventory product
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    
    # Sale details
    sale_date = db.Column(db.DateTime, nullable=False)
    list_price_total = db.Column(sa.Numeric(12,2))  # Total list price (before discount)
    total_amount = db.Column(sa.Numeric(12,2))  # Precise money handling
    discount_amount = db.Column(sa.Numeric(12,2), default=0.0)  # Precise money handling
    final_amount = db.Column(sa.Numeric(12,2))  # Precise money handling
    paid_amount = db.Column(sa.Numeric(12,2), default=0.0)  # Track paid amount for partial payments
    
    # Device assignments (will be replaced by sale_items table in future)
    right_ear_assignment_id = db.Column(db.String(50), db.ForeignKey('device_assignments.id'))
    left_ear_assignment_id = db.Column(db.String(50), db.ForeignKey('device_assignments.id'))
    
    # Status and payment
    status = db.Column(db.String(20), default='pending')  # pending, completed, cancelled, refunded
    payment_method = db.Column(db.String(20), default='cash')  # cash, card, installment, insurance
    
    # SGK integration
    sgk_coverage = db.Column(sa.Numeric(12,2), default=0.0)  # Precise money handling
    patient_payment = db.Column(sa.Numeric(12,2))  # Precise money handling
    
    # Additional info
    report_status = db.Column(db.String(50))
    notes = db.Column(db.Text)
    
    # Relationships
    patient = db.relationship('Patient', backref='sales', lazy=True)

    def to_dict(self):
        base_dict = self.to_dict_base()
        sale_dict = {
            'id': self.id,
            'patientId': self.patient_id,
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
            'notes': self.notes
        }
        sale_dict.update(base_dict)
        return sale_dict

class PaymentPlan(BaseModel):
    __tablename__ = "payment_plans"
    
    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("plan"))
    
    # Foreign keys
    sale_id = db.Column(db.String(50), db.ForeignKey('sales.id'), nullable=False)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    
    # Plan details
    plan_name = db.Column(db.String(100), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)  # TODO: Change to Numeric(12,2)
    installment_count = db.Column(db.Integer, nullable=False)
    installment_amount = db.Column(db.Float, nullable=False)  # TODO: Change to Numeric(12,2)
    
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
    interest_rate = db.Column(db.Float, default=0.0)
    processing_fee = db.Column(db.Float, default=0.0)  # TODO: Change to Numeric(12,2)
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, completed, cancelled
    start_date = db.Column(db.DateTime, nullable=False)

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

class PaymentInstallment(BaseModel):
    __tablename__ = "payment_installments"
    
    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("inst"))
    
    # Foreign keys
    payment_plan_id = db.Column(db.String(50), db.ForeignKey('payment_plans.id'), nullable=False)
    
    # Installment details
    installment_number = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Float, nullable=False)  # TODO: Change to Numeric(12,2)
    
    # Payment tracking
    paid_date = db.Column(db.DateTime)
    paid_amount = db.Column(db.Float)  # TODO: Change to Numeric(12,2)
    status = db.Column(db.String(20), default='pending')  # pending, paid, overdue, cancelled
    
    # Late fees
    late_fee = db.Column(db.Float, default=0.0)  # TODO: Change to Numeric(12,2)
    notes = db.Column(db.Text)

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
        db.Index('ix_installment_plan', 'payment_plan_id'),
        db.Index('ix_installment_due_date', 'due_date'),
        db.Index('ix_installment_status', 'status'),
    )