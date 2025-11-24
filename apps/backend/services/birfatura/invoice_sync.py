"""
Invoice Sync Service
Handles synchronization of invoices from BirFatura API to local database
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional, List

from models.base import db
from models.purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem, SuggestedSupplier
from models.suppliers import Supplier
from services.birfatura.service import BirfaturaClient
from services.birfatura.invoice_parser import (
    parse_date,
    extract_sender_info,
    extract_invoice_amounts,
    extract_invoice_items,
)


class InvoiceSyncService:
    """Service for syncing invoices from BirFatura"""
    
    def __init__(self):
        self.client = BirfaturaClient()
    
    def sync_invoices(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, int]:
        """
        Sync invoices from BirFatura API
        
        Args:
            start_date: Start date for fetching invoices (default: 7 days ago)
            end_date: End date for fetching invoices (default: now)
        
        Returns:
            Dictionary with counts of imported invoices
        """
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=7)
        
        stats = {
            'incoming': 0,
            'outgoing': 0,
            'duplicates': 0,
            'errors': 0,
        }
        
        # Sync incoming invoices (from suppliers)
        try:
            incoming_count = self._sync_incoming_invoices(start_date, end_date)
            stats['incoming'] = incoming_count
        except Exception as e:
            print(f"Error syncing incoming invoices: {e}")
            stats['errors'] += 1
        
        # Sync outgoing invoices (returns/corrections to suppliers)
        try:
            outgoing_count = self._sync_outgoing_invoices(start_date, end_date)
            stats['outgoing'] = outgoing_count
        except Exception as e:
            print(f"Error syncing outgoing invoices: {e}")
            stats['errors'] += 1
        
        return stats
    
    def _sync_incoming_invoices(self, start_date: datetime, end_date: datetime) -> int:
        """Sync incoming invoices from suppliers"""
        count = 0
        page = 1
        page_size = 50
        
        while True:
            # Fetch page of invoices
            params = {
                'systemType': 'EFATURA',
                'startDateTime': start_date.isoformat(),
                'endDateTime': end_date.isoformat(),
                'documentType': 'INVOICE',
                'pageNumber': page,
                'pageSize': page_size,
            }
            
            response = self.client.get_inbox_documents(params)
            
            if not response.get('Success'):
                print(f"API Error: {response.get('Message')}")
                break
            
            # Extract invoices from response
            result = response.get('Result', {})
            inbox_invoices = result.get('InBoxInvoices', {})
            invoices = inbox_invoices.get('objects', [])
            
            if not invoices:
                break
            
            # Process each invoice
            for invoice_data in invoices:
                try:
                    if self._process_incoming_invoice(invoice_data):
                        count += 1
                except Exception as e:
                    print(f"Error processing invoice: {e}")
                    continue
            
            # Check if there are more pages
            total = inbox_invoices.get('total', 0)
            if page * page_size >= total:
                break
            
            page += 1
        
        db.session.commit()
        return count
    
    def _sync_outgoing_invoices(self, start_date: datetime, end_date: datetime) -> int:
        """Sync outgoing invoices (returns/corrections) to suppliers"""
        count = 0
        page = 1
        page_size = 50
        
        while True:
            # Fetch page of invoices
            params = {
                'systemType': 'EFATURA',
                'startDateTime': start_date.isoformat(),
                'endDateTime': end_date.isoformat(),
                'documentType': 'INVOICE',
                'pageNumber': page,
                'pageSize': page_size,
            }
            
            response = self.client.get_outbox_documents(params)
            
            if not response.get('Success'):
                print(f"API Error: {response.get('Message')}")
                break
            
            # Extract invoices from response
            result = response.get('Result', {})
            outbox_documents = result.get('OutBoxEDocuments', {})
            invoices = outbox_documents.get('objects', [])
            
            if not invoices:
                break
            
            # Process each invoice
            for invoice_data in invoices:
                try:
                    if self._process_outgoing_invoice(invoice_data):
                        count += 1
                except Exception as e:
                    print(f"Error processing outgoing invoice: {e}")
                    continue
            
            # Check if there are more pages
            total = outbox_documents.get('total', 0)
            if page * page_size >= total:
                break
            
            page += 1
        
        db.session.commit()
        return count
    
    def _process_incoming_invoice(self, invoice_data: Dict[str, Any]) -> bool:
        """Process a single incoming invoice"""
        # Extract UUID (unique identifier)
        birfatura_uuid = invoice_data.get('uuid', invoice_data.get('documentUUID'))
        if not birfatura_uuid:
            print("Invoice missing UUID, skipping")
            return False
        
        # Check for duplicates
        existing = PurchaseInvoice.query.filter_by(birfatura_uuid=birfatura_uuid).first()
        if existing:
            return False  # Already processed
        
        # Extract sender information
        sender_info = extract_sender_info(invoice_data)
        if not sender_info['tax_number']:
            print(f"Invoice {birfatura_uuid} missing sender tax number, skipping")
            return False
        
        # Try to match with existing supplier
        supplier = Supplier.query.filter_by(tax_number=sender_info['tax_number']).first()
        
        # If no supplier match, add/update suggested supplier
        if not supplier:
            self._handle_suggested_supplier(sender_info, invoice_data)
        
        # Extract amounts
        amounts = extract_invoice_amounts(invoice_data)
        
        # Create purchase invoice
        purchase_invoice = PurchaseInvoice(
            birfatura_uuid=birfatura_uuid,
            invoice_number=invoice_data.get('invoiceId', invoice_data.get('invoiceNumber')),
            invoice_date=parse_date(invoice_data.get('issueDate', invoice_data.get('invoiceDate'))),
            invoice_type='INCOMING',
            sender_name=sender_info['name'],
            sender_tax_number=sender_info['tax_number'],
            sender_tax_office=sender_info['tax_office'],
            sender_address=sender_info['address'],
            sender_city=sender_info['city'],
            supplier_id=supplier.id if supplier else None,
            currency=amounts['currency'],
            subtotal=amounts['subtotal'],
            tax_amount=amounts['tax_amount'],
            total_amount=amounts['total_amount'],
            raw_data=invoice_data,
            is_matched=bool(supplier),
            status='RECEIVED',
        )
        
        db.session.add(purchase_invoice)
        db.session.flush()  # Get ID
        
        # Extract and create invoice items
        items = extract_invoice_items(invoice_data)
        for item_data in items:
            item = PurchaseInvoiceItem(
                purchase_invoice_id=purchase_invoice.id,
                product_code=item_data['product_code'],
                product_name=item_data['product_name'],
                product_description=item_data['product_description'],
                quantity=item_data['quantity'],
                unit=item_data['unit'],
                unit_price=item_data['unit_price'],
                tax_rate=item_data['tax_rate'],
                tax_amount=item_data['tax_amount'],
                line_total=item_data['line_total'],
            )
            db.session.add(item)
        
        return True
    
    def _process_outgoing_invoice(self, invoice_data: Dict[str, Any]) -> bool:
        """Process a single outgoing invoice (return/correction to supplier)"""
        # Similar to incoming but with invoice_type='OUTGOING'
        # Extract UUID
        birfatura_uuid = invoice_data.get('uuid', invoice_data.get('documentUUID'))
        if not birfatura_uuid:
            return False
        
        # Check for duplicates
        existing = PurchaseInvoice.query.filter_by(birfatura_uuid=birfatura_uuid).first()
        if existing:
            return False
        
        # For outgoing, the receiver is the supplier
        # We skip suggested suppliers for outgoing since we're sending to them
        receiver_tax_number = invoice_data.get('receiverTaxNumber', invoice_data.get('receiverVKN'))
        if not receiver_tax_number:
            return False
        
        supplier = Supplier.query.filter_by(tax_number=receiver_tax_number).first()
        
        amounts = extract_invoice_amounts(invoice_data)
        
        purchase_invoice = PurchaseInvoice(
            birfatura_uuid=birfatura_uuid,
            invoice_number=invoice_data.get('invoiceId', invoice_data.get('invoiceNumber')),
            invoice_date=parse_date(invoice_data.get('issueDate', invoice_data.get('invoiceDate'))),
            invoice_type='OUTGOING',
            sender_name=invoice_data.get('receiverName', ''),
            sender_tax_number=receiver_tax_number,
            supplier_id=supplier.id if supplier else None,
            currency=amounts['currency'],
            subtotal=amounts['subtotal'],
            tax_amount=amounts['tax_amount'],
            total_amount=amounts['total_amount'],
            raw_data=invoice_data,
            is_matched=bool(supplier),
            status='SENT',
        )
        
        db.session.add(purchase_invoice)
        db.session.flush()
        
        # Add items
        items = extract_invoice_items(invoice_data)
        for item_data in items:
            item = PurchaseInvoiceItem(
                purchase_invoice_id=purchase_invoice.id,
                product_code=item_data['product_code'],
                product_name=item_data['product_name'],
                quantity=item_data['quantity'],
                unit=item_data['unit'],
                unit_price=item_data['unit_price'],
                tax_rate=item_data['tax_rate'],
                tax_amount=item_data['tax_amount'],
                line_total=item_data['line_total'],
            )
            db.session.add(item)
        
        return True
    
    def _handle_suggested_supplier(self, sender_info: Dict[str, str], invoice_data: Dict[str, Any]):
        """Add or update suggested supplier"""
        tax_number = sender_info['tax_number']
        
        suggested = SuggestedSupplier.query.filter_by(tax_number=tax_number).first()
        
        invoice_date = parse_date(invoice_data.get('issueDate', invoice_data.get('invoiceDate')))
        amounts = extract_invoice_amounts(invoice_data)
        
        if not suggested:
            # Create new suggested supplier
            suggested = SuggestedSupplier(
                company_name=sender_info['name'],
                tax_number=tax_number,
                tax_office=sender_info['tax_office'],
                address=sender_info['address'],
                city=sender_info['city'],
                invoice_count=1,
                total_amount=amounts['total_amount'],
                first_invoice_date=invoice_date,
                last_invoice_date=invoice_date,
                status='PENDING',
            )
            db.session.add(suggested)
        else:
            # Update existing
            suggested.invoice_count += 1
            suggested.total_amount += amounts['total_amount']
            if invoice_date and (not suggested.last_invoice_date or invoice_date > suggested.last_invoice_date):
                suggested.last_invoice_date = invoice_date
