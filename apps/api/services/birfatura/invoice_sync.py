"""
Invoice Sync Service
Handles synchronization of invoices from BirFatura API to local database
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from models.purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem, SuggestedSupplier
from models.suppliers import Supplier
from core.models.purchase import Purchase
from core.database import gen_id
from services.birfatura.service import BirfaturaClient
from services.birfatura.invoice_parser import (
    parse_date,
    extract_sender_info,
    extract_invoice_amounts,
    extract_invoice_items,
)


from models.tenant import Tenant
from models.integration_config import IntegrationConfig
import os
import logging

logger = logging.getLogger(__name__)

class InvoiceSyncService:
    """Service for syncing invoices from BirFatura"""
    
    def __init__(self, db: Session):
        self.client = None
        self.db = db
    
    def sync_invoices(self, tenant_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, int]:
        """
        Sync invoices from BirFatura API
        
        Args:
            start_date: Start date for fetching invoices (default: 7 days ago)
            end_date: End date for fetching invoices (default: now)
        
        Returns:
            Dictionary with counts of imported invoices
        """
        tenant = self.db.get(Tenant, tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        tenant_invoice_settings = (tenant.settings or {}).get('invoice_integration', {})
        tenant_api_key = tenant_invoice_settings.get('api_key')
        tenant_secret_key = tenant_invoice_settings.get('secret_key')
        
        # Get Global Settings (Integration Key)
        integration_key_config = self.db.query(IntegrationConfig).filter_by(
            integration_type='birfatura', 
            config_key='integration_key'
        ).first()
        global_integration_key = integration_key_config.config_value if integration_key_config else None

        # Check credentials in non-mock env
        mock_env = os.getenv('BIRFATURA_MOCK')
        if mock_env == '1':
            using_mock = True
        elif mock_env == '0':
            using_mock = False
        else:
            using_mock = os.getenv('ENVIRONMENT', 'production') != 'production'
        if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_integration_key):
             raise ValueError("Missing BirFatura credentials. Please configure Invoice Integration settings.")
             
        self.client = BirfaturaClient(
            api_key=tenant_api_key,
            secret_key=tenant_secret_key,
            integration_key=global_integration_key
        )

        if not end_date:
            end_date = datetime.now(timezone.utc)
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
            incoming_count = self._sync_incoming_invoices(tenant_id, start_date, end_date)
            stats['incoming'] = incoming_count
        except Exception as e:
            logger.error(f"Error syncing incoming invoices: {e}")
            stats['errors'] += 1
        
        # Sync outgoing invoices (returns/corrections to suppliers)
        try:
            outgoing_count = self._sync_outgoing_invoices(tenant_id, start_date, end_date)
            stats['outgoing'] = outgoing_count
        except Exception as e:
            logger.error(f"Error syncing outgoing invoices: {e}")
            stats['errors'] += 1
        
        return stats
    
    def _sync_incoming_invoices(self, tenant_id: str, start_date: datetime, end_date: datetime) -> int:
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
            
            response = self.client.get_inbox_documents_with_detail(params)
            
            if not response.get('Success'):
                logger.error(f"API Error: {response.get('Message')}")
                break
            
            # Extract invoices from response
            result = response.get('Result', {})
            inbox_invoices = result.get('InBoxInvoices', {})
            invoices = inbox_invoices.get('objects', [])
            
            if not invoices:
                break
            
            # Process each invoice
            for raw_obj in invoices:
                try:
                    # WithDetail wraps as {inBoxInvoice: {...}, jsonData: "..."}
                    inbox_inv = raw_obj.get('inBoxInvoice', raw_obj)
                    json_data_str = raw_obj.get('jsonData')
                    
                    parsed_detail = {}
                    if json_data_str and isinstance(json_data_str, str):
                        import json
                        try:
                            parsed_detail = json.loads(json_data_str)
                        except Exception:
                            pass
                    elif isinstance(json_data_str, dict):
                        parsed_detail = json_data_str
                    
                    # Process the invoice header (uses inBoxInvoice data)
                    if self._process_incoming_invoice(tenant_id, inbox_inv):
                        # Also extract and save line items from parsed detail
                        if parsed_detail:
                            birfatura_uuid = inbox_inv.get('UUID') or inbox_inv.get('uuid')
                            inv = self.db.query(PurchaseInvoice).filter_by(
                                birfatura_uuid=birfatura_uuid, tenant_id=tenant_id
                            ).first()
                            if inv:
                                detail_items = extract_invoice_items(parsed_detail)
                                for item_data in detail_items:
                                    item = PurchaseInvoiceItem(
                                        tenant_id=tenant_id,
                                        purchase_invoice_id=inv.id,
                                        product_code=item_data['product_code'],
                                        product_name=item_data['product_name'],
                                        product_description=item_data.get('product_description', ''),
                                        quantity=item_data['quantity'],
                                        unit=item_data['unit'],
                                        unit_price=item_data['unit_price'],
                                        tax_rate=item_data['tax_rate'],
                                        tax_amount=item_data['tax_amount'],
                                        line_total=item_data['line_total'],
                                    )
                                    self.db.add(item)
                        count += 1
                except Exception as e:
                    logger.error(f"Error processing invoice: {e}")
                    continue
            
            # Check if there are more pages
            total = inbox_invoices.get('total', 0)
            if page * page_size >= total:
                break
            
            page += 1
        
        self.db.commit()
        
        # Run automation after sync
        self._run_automation(tenant_id)
        
        return count
    
    def _sync_outgoing_invoices(self, tenant_id: str, start_date: datetime, end_date: datetime) -> int:
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
                logger.error(f"API Error: {response.get('Message')}")
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
                    if self._process_outgoing_invoice(tenant_id, invoice_data):
                        count += 1
                except Exception as e:
                    logger.error(f"Error processing outgoing invoice: {e}")
                    continue
            
            # Check if there are more pages
            total = outbox_documents.get('total', 0)
            if page * page_size >= total:
                break
            
            page += 1
        
        self.db.commit()
        return count
    
    def _process_incoming_invoice(self, tenant_id: str, invoice_data: Dict[str, Any]) -> bool:
        """Process a single incoming invoice"""
        # Extract UUID (unique identifier) - API returns PascalCase
        birfatura_uuid = invoice_data.get('UUID') or invoice_data.get('uuid') or invoice_data.get('documentUUID')
        if not birfatura_uuid:
            logger.warning("Invoice missing UUID, skipping")
            return False
        
        # Check for duplicates
        existing = self.db.query(PurchaseInvoice).filter_by(birfatura_uuid=birfatura_uuid, tenant_id=tenant_id).first()
        if existing:
            return False  # Already processed
        
        # Extract sender information
        sender_info = extract_sender_info(invoice_data)
        if not sender_info['tax_number']:
            logger.warning(f"Invoice {birfatura_uuid} missing sender tax number, skipping")
            return False
        
        # Try to match with existing supplier
        supplier = self.db.query(Supplier).filter_by(tax_number=sender_info['tax_number'], tenant_id=tenant_id).first()
        
        # If no supplier match, add/update suggested supplier
        if not supplier:
            self._handle_suggested_supplier(tenant_id, sender_info, invoice_data)
        
        # Extract amounts
        amounts = extract_invoice_amounts(invoice_data)
        
        # Create purchase invoice
        purchase_invoice = PurchaseInvoice(
            tenant_id=tenant_id,
            birfatura_uuid=birfatura_uuid,
            invoice_number=invoice_data.get('InvoiceNo') or invoice_data.get('invoiceId') or invoice_data.get('invoiceNumber'),
            invoice_date=parse_date(invoice_data.get('IssueDate') or invoice_data.get('issueDate') or invoice_data.get('invoiceDate')),
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
        
        self.db.add(purchase_invoice)
        self.db.flush()  # Get ID

        # Auto-convert to Purchase when supplier is already known
        if supplier:
            purchase = Purchase(
                id=gen_id("purch"),
                tenant_id=tenant_id,
                supplier_id=supplier.id,
                purchase_date=purchase_invoice.invoice_date or datetime.now(timezone.utc),
                total_amount=amounts['total_amount'],
                currency=amounts['currency'] or 'TRY',
                status='approved',
                invoice_id=str(purchase_invoice.id),
                created_from_invoice=True,
            )
            self.db.add(purchase)
            self.db.flush()
            purchase_invoice.purchase_id = purchase.id
            purchase_invoice.status = 'PROCESSED'

        # Extract and create invoice items
        items = extract_invoice_items(invoice_data)
        for item_data in items:
            item = PurchaseInvoiceItem(
                tenant_id=tenant_id,
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
            self.db.add(item)
        
        return True
    
    def backfill_invoice_items(self, tenant_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, int]:
        """Re-fetch invoices with detail to populate missing invoice items."""
        # Initialize client (same as sync_invoices)
        tenant = self.db.get(Tenant, tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        tenant_invoice_settings = (tenant.settings or {}).get('invoice_integration', {})
        tenant_api_key = tenant_invoice_settings.get('api_key')
        tenant_secret_key = tenant_invoice_settings.get('secret_key')

        integration_key_config = self.db.query(IntegrationConfig).filter_by(
            integration_type='birfatura',
            config_key='integration_key'
        ).first()
        global_integration_key = integration_key_config.config_value if integration_key_config else None

        mock_env = os.getenv('BIRFATURA_MOCK')
        if mock_env == '1':
            using_mock = True
        elif mock_env == '0':
            using_mock = False
        else:
            using_mock = os.getenv('ENVIRONMENT', 'production') != 'production'
        if not using_mock and (not tenant_api_key or not tenant_secret_key or not global_integration_key):
            raise ValueError("Missing BirFatura credentials.")

        self.client = BirfaturaClient(
            api_key=tenant_api_key,
            secret_key=tenant_secret_key,
            integration_key=global_integration_key
        )
        
        if not end_date:
            end_date = datetime.now(timezone.utc)
        if not start_date:
            start_date = end_date - timedelta(days=365)
        
        stats = {'updated': 0, 'skipped': 0, 'errors': 0}
        page = 1
        page_size = 50
        
        while True:
            params = {
                'systemType': 'EFATURA',
                'startDateTime': start_date.isoformat(),
                'endDateTime': end_date.isoformat(),
                'documentType': 'INVOICE',
                'pageNumber': page,
                'pageSize': page_size,
            }
            
            try:
                response = self.client.get_inbox_documents_with_detail(params)
            except Exception as e:
                logger.error(f"Backfill API error page {page}: {e}")
                stats['errors'] += 1
                break
            
            if not response.get('Success'):
                logger.error(f"Backfill API Error: {response.get('Message')}")
                break
            
            result = response.get('Result', {})
            inbox_invoices = result.get('InBoxInvoices', {})
            invoices = inbox_invoices.get('objects', [])
            
            if not invoices:
                break
            
            for raw_obj in invoices:
                # WithDetail wraps each object as {inBoxInvoice: {...}, jsonData: "..."}
                inbox_inv = raw_obj.get('inBoxInvoice', raw_obj)
                json_data_str = raw_obj.get('jsonData')
                
                # Parse the jsonData string (UBL format with InvoiceLine)
                parsed_detail = {}
                if json_data_str and isinstance(json_data_str, str):
                    try:
                        import json
                        parsed_detail = json.loads(json_data_str)
                    except Exception:
                        pass
                elif isinstance(json_data_str, dict):
                    parsed_detail = json_data_str
                
                birfatura_uuid = inbox_inv.get('UUID') or inbox_inv.get('uuid')
                if not birfatura_uuid:
                    continue
                
                existing = self.db.query(PurchaseInvoice).filter_by(
                    birfatura_uuid=birfatura_uuid, tenant_id=tenant_id
                ).first()
                
                if not existing:
                    # New invoice — process with the inBoxInvoice data (flat format)
                    try:
                        if self._process_incoming_invoice(tenant_id, inbox_inv):
                            # Also try to extract items from parsed_detail
                            if parsed_detail:
                                inv = self.db.query(PurchaseInvoice).filter_by(
                                    birfatura_uuid=birfatura_uuid, tenant_id=tenant_id
                                ).first()
                                if inv:
                                    detail_items = extract_invoice_items(parsed_detail)
                                    for item_data in detail_items:
                                        item = PurchaseInvoiceItem(
                                            tenant_id=tenant_id,
                                            purchase_invoice_id=inv.id,
                                            product_code=item_data['product_code'],
                                            product_name=item_data['product_name'],
                                            product_description=item_data.get('product_description', ''),
                                            quantity=item_data['quantity'],
                                            unit=item_data['unit'],
                                            unit_price=item_data['unit_price'],
                                            tax_rate=item_data['tax_rate'],
                                            tax_amount=item_data['tax_amount'],
                                            line_total=item_data['line_total'],
                                        )
                                        self.db.add(item)
                            stats['updated'] += 1
                    except Exception as e:
                        logger.error(f"Backfill new invoice error: {e}")
                        stats['errors'] += 1
                    continue
                
                # Check if it already has items
                item_count = self.db.query(PurchaseInvoiceItem).filter_by(
                    purchase_invoice_id=existing.id
                ).count()
                
                if item_count > 0:
                    stats['skipped'] += 1
                    continue
                
                # Extract items from parsed UBL detail
                try:
                    items = extract_invoice_items(parsed_detail) if parsed_detail else []
                    if items:
                        for item_data in items:
                            item = PurchaseInvoiceItem(
                                tenant_id=tenant_id,
                                purchase_invoice_id=existing.id,
                                product_code=item_data['product_code'],
                                product_name=item_data['product_name'],
                                product_description=item_data.get('product_description', ''),
                                quantity=item_data['quantity'],
                                unit=item_data['unit'],
                                unit_price=item_data['unit_price'],
                                tax_rate=item_data['tax_rate'],
                                tax_amount=item_data['tax_amount'],
                                line_total=item_data['line_total'],
                            )
                            self.db.add(item)
                        
                        # Update raw_data with detailed version
                        existing.raw_data = parsed_detail
                        stats['updated'] += 1
                        logger.info(f"Backfilled {len(items)} items for invoice {existing.invoice_number}")
                    else:
                        stats['skipped'] += 1
                except Exception as e:
                    logger.error(f"Backfill item extraction error for {birfatura_uuid}: {e}")
                    stats['errors'] += 1
            
            total = inbox_invoices.get('total', 0)
            if page * page_size >= total:
                break
            page += 1
        
        self.db.commit()
        return stats

    def _process_outgoing_invoice(self, tenant_id: str, invoice_data: Dict[str, Any]) -> bool:
        """Process a single outgoing invoice (return/correction to supplier)"""
        # Similar to incoming but with invoice_type='OUTGOING'
        # Extract UUID
        birfatura_uuid = invoice_data.get('UUID') or invoice_data.get('uuid') or invoice_data.get('documentUUID')
        if not birfatura_uuid:
            return False
        
        # Check for duplicates
        existing = self.db.query(PurchaseInvoice).filter_by(birfatura_uuid=birfatura_uuid, tenant_id=tenant_id).first()
        if existing:
            return False
        
        # For outgoing, the receiver is the supplier
        # We skip suggested suppliers for outgoing since we're sending to them
        receiver_tax_number = invoice_data.get('ReceiverKN') or invoice_data.get('receiverTaxNumber') or invoice_data.get('receiverVKN')
        if not receiver_tax_number:
            return False
        
        supplier = self.db.query(Supplier).filter_by(tax_number=receiver_tax_number, tenant_id=tenant_id).first()
        
        amounts = extract_invoice_amounts(invoice_data)
        
        purchase_invoice = PurchaseInvoice(
            tenant_id=tenant_id,
            birfatura_uuid=birfatura_uuid,
            invoice_number=invoice_data.get('DocumentNo') or invoice_data.get('InvoiceNo') or invoice_data.get('invoiceId') or invoice_data.get('invoiceNumber'),
            invoice_date=parse_date(invoice_data.get('IssueDate') or invoice_data.get('issueDate') or invoice_data.get('invoiceDate')),
            invoice_type='OUTGOING',
            sender_name=invoice_data.get('ReceiverName') or invoice_data.get('receiverName', ''),
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
        
        self.db.add(purchase_invoice)
        self.db.flush()
        
        # Add items
        items = extract_invoice_items(invoice_data)
        for item_data in items:
            item = PurchaseInvoiceItem(
                tenant_id=tenant_id,
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
            self.db.add(item)
        
        return True
    
    def _handle_suggested_supplier(self, tenant_id: str, sender_info: Dict[str, str], invoice_data: Dict[str, Any]):
        """Add or update suggested supplier"""
        tax_number = sender_info['tax_number']
        
        suggested = self.db.query(SuggestedSupplier).filter_by(tax_number=tax_number, tenant_id=tenant_id).first()
        
        invoice_date = parse_date(invoice_data.get('IssueDate') or invoice_data.get('issueDate') or invoice_data.get('invoiceDate'))
        amounts = extract_invoice_amounts(invoice_data)
        
        if not suggested:
            # Create new suggested supplier
            suggested = SuggestedSupplier(
                tenant_id=tenant_id,
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
            self.db.add(suggested)
        else:
            # Update existing
            suggested.invoice_count += 1
            suggested.total_amount += amounts['total_amount']
            if invoice_date and (not suggested.last_invoice_date or invoice_date > suggested.last_invoice_date):
                suggested.last_invoice_date = invoice_date

    def _get_automation_settings(self, tenant_id: str) -> dict:
        """Get automation settings for a tenant"""
        configs = self.db.query(IntegrationConfig).filter(
            IntegrationConfig.tenant_id == tenant_id,
            IntegrationConfig.integration_type == 'automation',
        ).all()
        return {c.config_key: c.config_value == 'true' for c in configs}

    def _run_automation(self, tenant_id: str):
        """Run automation tasks based on tenant settings after invoice sync"""
        try:
            settings = self._get_automation_settings(tenant_id)
            if not any(settings.values()):
                return

            if settings.get('auto_add_suppliers'):
                self._auto_add_suppliers(tenant_id)

            if settings.get('auto_add_invoice_products') or settings.get('auto_update_stock'):
                self._auto_process_inventory(
                    tenant_id,
                    auto_add=settings.get('auto_add_invoice_products', False),
                    auto_update=settings.get('auto_update_stock', False),
                )

            self.db.commit()
        except Exception as e:
            logger.error(f"Automation error for tenant {tenant_id}: {e}")

    def _auto_add_suppliers(self, tenant_id: str):
        """Auto-add suggested suppliers to the suppliers list"""
        suggested_list = self.db.query(SuggestedSupplier).filter(
            SuggestedSupplier.tenant_id == tenant_id,
            SuggestedSupplier.status == 'PENDING',
        ).all()

        for suggested in suggested_list:
            existing = self.db.query(Supplier).filter(
                Supplier.tenant_id == tenant_id,
                Supplier.tax_number == suggested.tax_number,
            ).first()
            if existing:
                suggested.status = 'ADDED'
                continue

            new_supplier = Supplier(
                tenant_id=tenant_id,
                company_name=suggested.company_name,
                tax_number=suggested.tax_number,
                tax_office=suggested.tax_office,
                address=suggested.address,
                city=suggested.city,
                is_active=True,
            )
            self.db.add(new_supplier)
            self.db.flush()

            suggested.status = 'ADDED'
            # Link invoices to the new supplier
            self.db.query(PurchaseInvoice).filter(
                PurchaseInvoice.tenant_id == tenant_id,
                PurchaseInvoice.sender_tax_number == suggested.tax_number,
                PurchaseInvoice.supplier_id.is_(None),
            ).update({'supplier_id': new_supplier.id, 'is_matched': True}, synchronize_session='fetch')

        logger.info(f"Auto-added {len(suggested_list)} suppliers for tenant {tenant_id}")

    def _auto_process_inventory(self, tenant_id: str, auto_add: bool, auto_update: bool):
        """Auto-add invoice products to inventory and/or update stock"""
        from core.models.inventory import InventoryItem
        from datetime import datetime as dt, timezone as tz
        from uuid import uuid4

        # Get invoice items that are not yet linked to inventory
        unlinked_items = self.db.query(PurchaseInvoiceItem).filter(
            PurchaseInvoiceItem.tenant_id == tenant_id,
            PurchaseInvoiceItem.inventory_id.is_(None),
        ).all()

        # Build lookup caches to avoid repeated queries
        all_inv = self.db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id
        ).all()
        name_to_inv = {}
        stock_code_set = set()
        for inv in all_inv:
            name_to_inv[inv.name] = inv
            if inv.stock_code:
                stock_code_set.add(inv.stock_code)

        added = 0
        updated = 0
        skipped = 0

        for item in unlinked_items:
            if not item.product_name:
                continue

            try:
                existing_inv = name_to_inv.get(item.product_name)

                if existing_inv:
                    if auto_update:
                        existing_inv.available_inventory = (existing_inv.available_inventory or 0) + int(item.quantity or 1)
                        existing_inv.total_inventory = (existing_inv.total_inventory or 0) + int(item.quantity or 1)
                        item.inventory_id = existing_inv.id
                        updated += 1
                    else:
                        item.inventory_id = existing_inv.id
                elif auto_add:
                    brand, model = self._parse_brand_model(item.product_name)
                    invoice = self.db.query(PurchaseInvoice).filter_by(id=item.purchase_invoice_id).first()
                    supplier_name = invoice.sender_name if invoice else None

                    # Avoid stock_code unique constraint violation
                    sc = item.product_code or None
                    if sc and sc in stock_code_set:
                        sc = None

                    new_inv = InventoryItem(
                        id=f"item_{dt.now(tz.utc).strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}",
                        tenant_id=tenant_id,
                        name=item.product_name,
                        brand=brand,
                        model=model,
                        category='hearing_aid',
                        supplier=supplier_name,
                        unit=item.unit or 'Adet',
                        price=float(item.unit_price or 0),
                        cost=float(item.unit_price or 0),
                        kdv_rate=float(item.tax_rate or 18),
                        available_inventory=int(item.quantity or 1),
                        total_inventory=int(item.quantity or 1),
                        reorder_level=1,
                        stock_code=sc,
                    )
                    self.db.add(new_inv)
                    self.db.flush()
                    item.inventory_id = new_inv.id
                    # Update caches for subsequent items with same name/code
                    name_to_inv[item.product_name] = new_inv
                    if sc:
                        stock_code_set.add(sc)
                    added += 1
            except Exception as e:
                logger.warning(f"Auto-inventory item error for '{item.product_name}': {e}")
                self.db.rollback()
                skipped += 1

        logger.info(f"Auto-inventory for tenant {tenant_id}: added={added}, updated={updated}, skipped={skipped}")

    KNOWN_BRANDS = [
        'Phonak', 'Signia', 'Oticon', 'ReSound', 'Resound', 'Widex', 'Starkey',
        'Unitron', 'Bernafon', 'Sonic', 'Hansaton', 'Rexton', 'Audio Service',
        'Audifon', 'Beltone', 'Interton', 'Philips', 'Siemens', 'GN',
        'Ear Teknik', 'Rayovac', 'Duracell', 'PowerOne', 'Power One',
        'Sonova', 'WS Audiology', 'Demant', 'GN Hearing',
    ]

    def _parse_brand_model(self, product_name: str) -> tuple:
        """Parse brand and model from product name"""
        trimmed = product_name.strip()
        lower = trimmed.lower()
        sorted_brands = sorted(self.KNOWN_BRANDS, key=len, reverse=True)
        for brand in sorted_brands:
            if lower.startswith(brand.lower()):
                rest = trimmed[len(brand):].strip().lstrip('-:').strip()
                return brand, rest or trimmed
        parts = trimmed.split(None, 1)
        return parts[0] if parts else trimmed, parts[1] if len(parts) > 1 else trimmed
