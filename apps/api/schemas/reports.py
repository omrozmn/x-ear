"""
Report Schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import AppBaseModel

# --- Overview ---
class ReportOverviewResponse(AppBaseModel):
    total_patients: int = Field(..., alias="totalPatients")
    new_patients: int = Field(..., alias="newPatients")
    total_appointments: int = Field(..., alias="totalAppointments")
    appointment_rate: float = Field(..., alias="appointmentRate")
    total_sales: int = Field(..., alias="totalSales")
    total_revenue: float = Field(..., alias="totalRevenue")
    conversion_rate: float = Field(..., alias="conversionRate")

# --- Patients ---
class PatientSegments(AppBaseModel):
    new: int
    active: int
    trial: int
    inactive: int

class ReportPatientsResponse(AppBaseModel):
    age_distribution: Dict[str, int] = Field(..., alias="ageDistribution")
    status_distribution: Dict[str, int] = Field(..., alias="statusDistribution")
    patient_segments: PatientSegments = Field(..., alias="patientSegments")

# --- Financial ---
class ProductSalesData(AppBaseModel):
    sales: int
    revenue: float

class PaymentMethodData(AppBaseModel):
    count: int
    amount: float

class ReportFinancialResponse(AppBaseModel):
    revenue_trend: Dict[int, float] = Field(..., alias="revenueTrend")
    product_sales: Dict[str, ProductSalesData] = Field(..., alias="productSales")
    payment_methods: Dict[str, PaymentMethodData] = Field(..., alias="paymentMethods")

# --- Campaigns ---
class CampaignReportItem(AppBaseModel):
    id: str
    name: str
    sent_count: int = Field(..., alias="sentCount")
    delivered_count: int = Field(..., alias="deliveredCount")
    delivery_rate: float = Field(..., alias="deliveryRate")
    open_rate: float = Field(..., alias="openRate")
    click_rate: float = Field(..., alias="clickRate")
    status: str

class ReportCampaignsResponse(AppBaseModel):
    campaigns: List[CampaignReportItem]
    sms_trends: Dict[str, int] = Field(..., alias="smsTrends")

# --- Revenue (Simple) ---
class ReportRevenueResponse(AppBaseModel):
    monthly: List[float]

# --- Promissory Notes ---
class PromissoryNotesSummary(AppBaseModel):
    total_notes: int = Field(..., alias="totalNotes")
    active_notes: int = Field(..., alias="activeNotes")
    overdue_notes: int = Field(..., alias="overdueNotes")
    paid_notes: int = Field(..., alias="paidNotes")
    total_amount: float = Field(..., alias="totalAmount")
    total_collected: float = Field(..., alias="totalCollected")

class MonthlyCount(AppBaseModel):
    year: int
    month: int
    count: int

class MonthlyRevenue(AppBaseModel):
    year: int
    month: int
    revenue: float

class ReportPromissoryNotesResponse(AppBaseModel):
    summary: PromissoryNotesSummary
    monthly_counts: List[MonthlyCount] = Field(..., alias="monthlyCounts")
    monthly_revenue: List[MonthlyRevenue] = Field(..., alias="monthlyRevenue")

class PromissoryNotePatientItem(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    party_name: str = Field(..., alias="partyName")
    phone: Optional[str] = None
    total_notes: int = Field(..., alias="totalNotes")
    active_notes: int = Field(..., alias="activeNotes")
    overdue_notes: int = Field(..., alias="overdueNotes")
    paid_notes: int = Field(..., alias="paidNotes")
    total_amount: float = Field(..., alias="totalAmount")
    paid_amount: float = Field(..., alias="paidAmount")
    remaining_amount: float = Field(..., alias="remainingAmount")

class ReportPromissoryNotesByPatientResponse(AppBaseModel):
    pass # Returns List[PromissoryNotePatientItem] inside ResponseEnvelope directly? Or wrapper?
    # Usually ResponseEnvelope[List[T]] is fine.

class PromissoryPartyInfo(AppBaseModel):
    id: str
    name: str
    phone: Optional[str] = None

class PromissoryNoteListItem(AppBaseModel):
    id: str
    note_number: Optional[str] = Field(None, alias="noteNumber")
    amount: float
    paid_amount: float = Field(..., alias="paidAmount")
    remaining_amount: float = Field(..., alias="remainingAmount")
    due_date: str = Field(..., alias="dueDate")
    status: str
    party: Optional[PromissoryPartyInfo] = None

# --- Remaining Payments ---
class RemainingPaymentsSummary(AppBaseModel):
    total_parties: int = Field(..., alias="totalParties")
    total_remaining: float = Field(..., alias="totalRemaining")

class RemainingPaymentItem(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    party_name: str = Field(..., alias="partyName")
    phone: Optional[str] = None
    sale_count: int = Field(..., alias="saleCount")
    total_amount: float = Field(..., alias="totalAmount")
    paid_amount: float = Field(..., alias="paidAmount")
    remaining_amount: float = Field(..., alias="remainingAmount")

class ReportRemainingPaymentsResponse(AppBaseModel):
    pass # List[RemainingPaymentItem], plus meta.
    # Actually this returns data=List, meta=...
    # Custom model needed for meta summary?
    # ResponseEnvelope[List[RemainingPaymentItem]] works, and meta is in ResponseEnvelope.meta
    # BUT the summary is in meta... Base `ResponseMeta` doesn't have `summary` field.
    # I might need to subclass ResponseMeta or put summary in data.
    # The current impl puts summary in meta.
    # I will modify base ResponseMeta to allow extra fields? It does `extra='allow'`.
    # So `meta` can have `summary`.

# --- Cashflow ---
class DailyCashflow(AppBaseModel):
    date: str
    income: float
    expense: float

class ReportCashflowResponse(AppBaseModel):
    total_revenue: float = Field(..., alias="totalRevenue")
    total_expenses: float = Field(..., alias="totalExpenses")
    net_cash: float = Field(..., alias="netCash")
    daily_breakdown: List[DailyCashflow] = Field(..., alias="dailyBreakdown")

# --- POS Movements ---
class PosMovementItem(AppBaseModel):
    id: str
    date: str
    amount: float
    status: str
    pos_provider: Optional[str] = Field(None, alias="posProvider")
    pos_transaction_id: Optional[str] = Field(None, alias="posTransactionId")
    installment: Optional[int] = None
    error_message: Optional[str] = Field(None, alias="errorMessage")
    sale_id: Optional[str] = Field(None, alias="saleId")
    patient_name: Optional[str] = Field(None, alias="patientName")

class PosMovementSummary(AppBaseModel):
    total_volume: float = Field(..., alias="totalVolume")
    success_count: int = Field(..., alias="successCount")
    fail_count: int = Field(..., alias="failCount")

# Similar issue with meta summary for POS movements.
