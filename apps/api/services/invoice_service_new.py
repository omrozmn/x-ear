# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ⚠️  DOKUNULMAZ DOSYA — DO NOT MODIFY — NE YAPTIĞINI BİLMEDEN DOKUNMA  ⚠️  ║
# ║                                                                         ║
# ║  Bu dosya fatura servis katmanını içerir.                               ║
# ║  InvoiceStatus enum eşleştirmesi ve list_outgoing_invoices              ║
# ║  fonksiyonu KRİTİKTİR.                                                  ║
# ║  AI veya developer: Status mapping mantığını değiştirmeyin!             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
"""
Invoice service for new invoice system.
Handles business logic for incoming/outgoing invoices.
MAX 500 LOC per project rules.
"""
import json
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, asc
from fastapi import HTTPException

from core.models.purchase_invoice import PurchaseInvoice
from core.models.invoice import Invoice
from core.models.suppliers import Supplier
from core.models.purchase import Purchase
from schemas.invoices_new import (
    IncomingInvoiceResponse, IncomingInvoiceListResponse,
    OutgoingInvoiceResponse, OutgoingInvoiceListResponse,
    ConvertToPurchaseResponse, PurchaseData, SupplierMapping, ProcessingError,
    InvoiceStatus, InvoiceSummaryStats
)
from schemas.base import PaginationInfo

logger = logging.getLogger(__name__)


class InvoiceServiceNew:
    """Service for new invoice system operations"""
    
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _raw_payload(invoice: PurchaseInvoice) -> dict[str, Any]:
        raw = invoice.raw_data or {}
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {}
        return {}

    @staticmethod
    def _extract_value(field: Any) -> str:
        """Extract plain string value from a UBL dict like {'Value': 'SATIS', ...} or return str."""
        if isinstance(field, dict):
            return str(field.get("Value") or field.get("value") or field.get("name") or field.get("code") or "").strip()
        return str(field or "").strip()

    @staticmethod
    def _document_metadata(raw: dict[str, Any]) -> dict[str, str]:
        _ev = InvoiceServiceNew._extract_value
        system_type = str(
            raw.get("systemType")
            or raw.get("systemTypeCode")
            or raw.get("documentType")
            or raw.get("document_type")
            or "EFATURA"
        ).strip() or "EFATURA"
        profile_id = _ev(raw.get("profileId") or raw.get("ProfileId") or raw.get("profile_id") or "")
        invoice_type_code = _ev(raw.get("invoiceTypeCode") or raw.get("InvoiceTypeCode") or raw.get("invoiceType") or "")
        document_kind = "despatch" if system_type == "EIRSALIYE" or profile_id == "TEMELIRSALIYE" or invoice_type_code == "SEVK" else "invoice"
        return {
            "document_kind": document_kind,
            "document_kind_label": "E-İrsaliye" if document_kind == "despatch" else ("E-Arşiv" if system_type == "EARSIV" else "E-Fatura"),
            "system_type_code": system_type,
            "profile_id": profile_id,
            "invoice_type_code": invoice_type_code,
        }
    
    def list_incoming_invoices(
        self,
        tenant_id: str,
        status: Optional[InvoiceStatus] = None,
        supplier_name: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        per_page: int = 50,
        sort_field: Optional[str] = None,
        sort_dir: Optional[str] = None,
    ) -> IncomingInvoiceListResponse:
        """List incoming invoices with filtering"""
        
        # Base query with tenant isolation - only INCOMING type
        query = self.db.query(PurchaseInvoice).filter(
            PurchaseInvoice.tenant_id == tenant_id,
            PurchaseInvoice.invoice_type == 'INCOMING'
        )
        
        # Apply filters
        if status:
            query = query.filter(PurchaseInvoice.status == status.value)
        
        if supplier_name:
            query = query.filter(
                PurchaseInvoice.sender_name.ilike(f"%{supplier_name}%")
            )
        
        if date_from:
            query = query.filter(PurchaseInvoice.invoice_date >= date_from)
        
        if date_to:
            query = query.filter(PurchaseInvoice.invoice_date <= date_to)
        
        # Get total count
        total = query.count()
        
        # Apply sorting and pagination
        _sort_map = {
            "invoiceDate": PurchaseInvoice.invoice_date,
            "supplier": PurchaseInvoice.sender_name,
            "supplierName": PurchaseInvoice.sender_name,
            "invoiceNumber": PurchaseInvoice.invoice_number,
            "totalAmount": PurchaseInvoice.total_amount,
            "status": PurchaseInvoice.status,
        }
        offset = (page - 1) * per_page
        _ofn = asc if sort_dir == "asc" else desc
        _col = _sort_map.get(sort_field or "")
        if _col is not None:
            invoices = query.order_by(_ofn(_col), desc(PurchaseInvoice.created_at)).offset(offset).limit(per_page).all()
        else:
            invoices = query.order_by(desc(PurchaseInvoice.invoice_date), desc(PurchaseInvoice.created_at)).offset(offset).limit(per_page).all()
        
        # Convert to response format
        invoice_responses = []
        for invoice in invoices:
            raw = self._raw_payload(invoice)
            meta = self._document_metadata(raw)
            # Map DB status to enum
            status_val = (invoice.status or "RECEIVED").upper()
            try:
                inv_status = InvoiceStatus(status_val)
            except ValueError:
                inv_status = InvoiceStatus.RECEIVED
            
            invoice_responses.append(IncomingInvoiceResponse(
                invoice_id=invoice.id,
                supplier_name=invoice.sender_name or "Bilinmeyen Tedarikçi",
                supplier_tax_number=invoice.sender_tax_number,
                invoice_number=invoice.invoice_number or f"INV-{invoice.id}",
                invoice_date=invoice.invoice_date or invoice.created_at,
                total_amount=invoice.total_amount or Decimal("0"),
                currency=invoice.currency or "TRY",
                status=inv_status,
                document_kind=meta["document_kind"],
                document_kind_label=meta["document_kind_label"],
                invoice_type_code=meta["invoice_type_code"] or None,
                profile_id=meta["profile_id"] or None,
                system_type_code=meta["system_type_code"] or None,
                is_converted_to_purchase=invoice.is_matched or False,
                purchase_id=invoice.purchase_id,
                created_at=invoice.created_at
            ))
        
        # Get status counts (INCOMING only)
        pending_count = self.db.query(PurchaseInvoice).filter(
            and_(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.invoice_type == 'INCOMING',
                PurchaseInvoice.status == "RECEIVED"
            )
        ).count()
        
        processed_count = self.db.query(PurchaseInvoice).filter(
            and_(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.invoice_type == 'INCOMING',
                PurchaseInvoice.status.in_(["PROCESSED", "PAID"])
            )
        ).count()
        
        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page
        
        pagination = PaginationInfo(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages
        )
        
        return IncomingInvoiceListResponse(
            invoices=invoice_responses,
            pending_count=pending_count,
            processed_count=processed_count,
            pagination=pagination
        )
    
    def list_outgoing_invoices(
        self,
        tenant_id: str,
        status: Optional[InvoiceStatus] = None,
        party_name: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        per_page: int = 50,
        sort_field: Optional[str] = None,
        sort_dir: Optional[str] = None,
    ) -> OutgoingInvoiceListResponse:
        """List outgoing invoices from purchase_invoices (BirFatura synced)"""
        
        # Query from purchase_invoices WHERE type='OUTGOING'
        query = self.db.query(PurchaseInvoice).filter(
            PurchaseInvoice.tenant_id == tenant_id,
            PurchaseInvoice.invoice_type == 'OUTGOING'
        )
        
        # Apply filters
        if status:
            query = query.filter(PurchaseInvoice.status == status.value)
        
        if party_name:
            query = query.filter(
                PurchaseInvoice.sender_name.ilike(f"%{party_name}%")
            )
        
        if date_from:
            query = query.filter(PurchaseInvoice.invoice_date >= date_from)
        
        if date_to:
            query = query.filter(PurchaseInvoice.invoice_date <= date_to)
        
        # Get total count
        total = query.count()
        
        # Apply sorting and pagination
        _sort_map = {
            "invoiceDate": PurchaseInvoice.invoice_date,
            "party": PurchaseInvoice.sender_name,
            "invoiceNumber": PurchaseInvoice.invoice_number,
            "totalAmount": PurchaseInvoice.total_amount,
            "status": PurchaseInvoice.status,
        }
        offset = (page - 1) * per_page
        _ofn = asc if sort_dir == "asc" else desc
        _col = _sort_map.get(sort_field or "")
        if _col is not None:
            invoices = query.order_by(_ofn(_col), desc(PurchaseInvoice.created_at)).offset(offset).limit(per_page).all()
        else:
            invoices = query.order_by(desc(PurchaseInvoice.invoice_date), desc(PurchaseInvoice.created_at)).offset(offset).limit(per_page).all()
        
        # Convert to response format
        invoice_responses = []
        total_amount = Decimal("0")
        paid_amount = Decimal("0")
        
        for invoice in invoices:
            invoice_total = invoice.total_amount or Decimal("0")
            total_amount += invoice_total
            raw = self._raw_payload(invoice)
            meta = self._document_metadata(raw)
            
            # For OUTGOING, sender_name = receiver/customer name (set during sync)
            status_val = (invoice.status or "SENT").upper()
            try:
                inv_status = InvoiceStatus(status_val)
            except ValueError:
                # Try matching by enum name as fallback
                try:
                    inv_status = InvoiceStatus[status_val]
                except KeyError:
                    inv_status = InvoiceStatus.SENT
            
            # Determine e-document status from BirFatura raw data
            birfatura_status = raw.get('Status')
            edoc_status = None
            has_pdf = False
            if birfatura_status is not None:
                status_map = {
                    1200: 'queued',      # Kuyruğa Alındı
                    1210: 'processing',  # İşleniyor
                    1230: 'packaging',   # Zarflanıyor
                    1300: 'delivered',   # GİB'e İletildi
                    1310: 'waiting',     # GİB Onay Bekleniyor
                    1320: 'approved',    # Kabul Edildi
                    1330: 'rejected',    # Reddedildi
                    1340: 'returned',    # İade Edildi
                }
                edoc_status = status_map.get(int(birfatura_status), f'unknown-{birfatura_status}')
                has_pdf = int(birfatura_status) >= 1300
            elif status_val == 'DRAFT':
                edoc_status = 'draft'

            invoice_responses.append(OutgoingInvoiceResponse(
                invoice_id=str(invoice.id),
                party_id="",
                party_first_name=invoice.sender_name or "Bilinmeyen Alıcı",
                party_last_name="",
                invoice_number="Taslak" if status_val == "DRAFT" else (invoice.invoice_number or raw.get('DocumentNo') or f"INV-{invoice.id}"),
                invoice_date=invoice.invoice_date or invoice.created_at,
                due_date=None,
                total_amount=invoice_total,
                paid_amount=Decimal("0"),
                status=inv_status,
                document_kind=meta["document_kind"],
                document_kind_label=meta["document_kind_label"],
                invoice_type_code=meta["invoice_type_code"] or None,
                profile_id=meta["profile_id"] or None,
                system_type_code=meta["system_type_code"] or None,
                can_create_proforma=False,
                edocument_status=edoc_status,
                has_gib_pdf=has_pdf,
                created_at=invoice.created_at
            ))
        
        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page
        
        pagination = PaginationInfo(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages
        )
        
        return OutgoingInvoiceListResponse(
            invoices=invoice_responses,
            total_amount=total_amount,
            paid_amount=paid_amount,
            pagination=pagination
        )
    
    def convert_invoices_to_purchases(
        self,
        tenant_id: str,
        invoice_ids: List[str],
        supplier_mappings: Dict[str, str],
        user_id: str
    ) -> ConvertToPurchaseResponse:
        """Convert incoming invoices to purchase records"""
        
        created_purchases = []
        supplier_mappings_used = []
        errors = []
        
        for invoice_id in invoice_ids:
            try:
                # Get invoice with tenant check
                invoice = self.db.query(PurchaseInvoice).filter(
                    and_(
                        PurchaseInvoice.id == invoice_id,
                        PurchaseInvoice.tenant_id == tenant_id
                    )
                ).first()
                
                if not invoice:
                    errors.append(ProcessingError(
                        invoice_id=invoice_id,
                        error_message="Invoice not found",
                        error_code="INVOICE_NOT_FOUND"
                    ))
                    continue
                
                if invoice.purchase_id:
                    errors.append(ProcessingError(
                        invoice_id=invoice_id,
                        error_message="Invoice already converted to purchase",
                        error_code="ALREADY_CONVERTED"
                    ))
                    continue
                
                # Get or create supplier
                supplier_id = supplier_mappings.get(invoice_id)
                if not supplier_id:
                    errors.append(ProcessingError(
                        invoice_id=invoice_id,
                        error_message="No supplier mapping provided",
                        error_code="NO_SUPPLIER_MAPPING"
                    ))
                    continue
                
                # Validate supplier exists and belongs to tenant
                supplier = self.db.query(Supplier).filter(
                    and_(
                        Supplier.id == supplier_id,
                        Supplier.tenant_id == tenant_id
                    )
                ).first()
                
                if not supplier:
                    errors.append(ProcessingError(
                        invoice_id=invoice_id,
                        error_message="Supplier not found",
                        error_code="SUPPLIER_NOT_FOUND"
                    ))
                    continue
                
                # Create purchase record
                purchase = Purchase(
                    tenant_id=tenant_id,
                    supplier_id=supplier_id,
                    purchase_date=invoice.invoice_date or datetime.utcnow(),
                    total_amount=invoice.total_amount or Decimal("0"),
                    status="approved",
                    invoice_id=invoice_id,
                    created_by=user_id,
                    created_at=datetime.utcnow()
                )
                
                self.db.add(purchase)
                self.db.flush()  # Get the ID
                
                # Update invoice status
                invoice.status = "processed"
                invoice.purchase_id = purchase.id
                
                # Track success
                created_purchases.append(PurchaseData(
                    purchase_id=purchase.id,
                    supplier_id=supplier_id,
                    supplier_name=supplier.name,
                    total_amount=purchase.total_amount,
                    invoice_id=invoice_id
                ))
                
                supplier_mappings_used.append(SupplierMapping(
                    invoice_supplier_name=invoice.supplier_name or "Unknown",
                    system_supplier_id=supplier_id,
                    system_supplier_name=supplier.name,
                    is_new_supplier=False
                ))
                
            except Exception as e:
                logger.error(f"Error converting invoice {invoice_id}: {str(e)}")
                errors.append(ProcessingError(
                    invoice_id=invoice_id,
                    error_message=str(e),
                    error_code="CONVERSION_ERROR"
                ))
        
        # Commit all changes
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise HTTPException(status_code=500, detail="Failed to save purchase conversions")
        
        return ConvertToPurchaseResponse(
            created_purchases=created_purchases,
            supplier_mappings=supplier_mappings_used,
            errors=errors,
            success_count=len(created_purchases),
            error_count=len(errors)
        )
    
    def get_invoice_summary(self, tenant_id: str) -> InvoiceSummaryStats:
        """Get invoice summary statistics"""
        
        # Get incoming totals
        incoming_total = self.db.query(func.sum(PurchaseInvoice.total_amount)).filter(
            PurchaseInvoice.tenant_id == tenant_id
        ).scalar() or Decimal("0")
        
        # Get outgoing totals — Invoice model uses device_price, not total_amount
        outgoing_total = self.db.query(func.sum(Invoice.device_price)).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.status != 'deleted'
        ).scalar() or Decimal("0")
        
        # Get pending counts
        # PurchaseInvoice default status is 'RECEIVED' (unprocessed)
        pending_incoming = self.db.query(PurchaseInvoice).filter(
            and_(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.status == "RECEIVED"
            )
        ).count()
        
        # Invoice statuses: active, cancelled, refunded, deleted — 'active' means pending/unsettled
        pending_outgoing = self.db.query(Invoice).filter(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.status == "active"
            )
        ).count()
        
        # Get monthly totals (current month)
        current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        monthly_incoming = self.db.query(func.sum(PurchaseInvoice.total_amount)).filter(
            and_(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.created_at >= current_month
            )
        ).scalar() or Decimal("0")
        
        monthly_outgoing = self.db.query(func.sum(Invoice.device_price)).filter(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.status != 'deleted',
                Invoice.created_at >= current_month
            )
        ).scalar() or Decimal("0")
        
        return InvoiceSummaryStats(
            incoming_total=incoming_total,
            outgoing_total=outgoing_total,
            pending_incoming=pending_incoming,
            pending_outgoing=pending_outgoing,
            monthly_incoming=monthly_incoming,
            monthly_outgoing=monthly_outgoing
        )
