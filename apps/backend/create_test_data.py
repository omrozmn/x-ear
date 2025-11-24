"""
Test Data Generator for Supplier Invoice Integration
Creates sample suppliers, invoices, and suggested suppliers for testing
"""
from datetime import datetime, timedelta
from decimal import Decimal
import random

from app import app, db
from models.suppliers import Supplier
from models.purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem, SuggestedSupplier

# Sample data
SUPPLIER_NAMES = [
    "Medikal Ürünler A.Ş.",
    "Sağlık Ekipmanları Ltd.",
    "Global Tıbbi Malzeme",
    "Türk Medikal Tic.",
    "Avrupa Sağlık Ürünleri",
]

UNMATCHED_SUPPLIERS = [
    {"name": "Yeni Tedarikçi 1 A.Ş.", "tax": "1111111111", "city": "İstanbul"},
    {"name": "Bilinmeyen Firma Ltd.", "tax": "2222222222", "city": "Ankara"},
    {"name": "Test Medikal A.Ş.", "tax": "3333333333", "city": "İzmir"},
    {"name": "Örnek Sağlık Tic.", "tax": "4444444444", "city": "Bursa"},
    {"name": "Demo Tedarikçi Ltd.", "tax": "5555555555", "city": "Antalya"},
    {"name": "Sample Medical Co.", "tax": "6666666666", "city": "Adana"},
    {"name": "Prototype Supplies", "tax": "7777777777", "city": "Gaziantep"},
    {"name": "Mock Healthcare Inc.", "tax": "8888888888", "city": "Konya"},
    {"name": "Test Equipment Ltd.", "tax": "9999999999", "city": "Mersin"},
    {"name": "Example Medical Sup.", "tax": "0000000000", "city": "Kayseri"},
]

PRODUCT_NAMES = [
    "Steril Eldiven (100'lü paket)",
    "Cerrahi Maske (50'li kutu)",
    "Dezenfektan (5L)",
    "Pamuk (500gr)",
    "Sargı Bezi (10m)",
    "Alkol (1L)",
    "Enjektör (100'lü)",
    "Serum Seti",
    "Tansiyon Aleti",
    "Termometre",
]


def create_test_suppliers():
    """Create test suppliers"""
    print("\n1. Creating test suppliers...")
    suppliers = []
    
    for i, name in enumerate(SUPPLIER_NAMES):
        supplier = Supplier(
            company_name=name,
            tax_number=f"555000{i:04d}",
            tax_office=f"Kadıköy {i+1}. Vergi Dairesi",
            contact_person=f"Ahmet {i+1}",
            email=f"info{i+1}@supplier.com",
            phone=f"0212 555 {i:02d} {i:02d}",
            address=f"Test Sokak No:{i+1}",
            city=["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"][i],
            is_active=True
        )
        db.session.add(supplier)
        suppliers.append(supplier)
    
    db.session.flush()
    print(f"✓ Created {len(suppliers)} suppliers")
    return suppliers


def create_incoming_invoices(suppliers):
    """Create incoming invoices (from suppliers to us)"""
    print("\n2. Creating incoming invoices...")
    invoices = []
    
    for i, supplier in enumerate(suppliers):
        # Create 2-3 invoices per supplier
        num_invoices = random.randint(2, 3)
        
        for j in range(num_invoices):
            invoice_date = datetime.utcnow() - timedelta(days=random.randint(1, 90))
            
            invoice = PurchaseInvoice(
                birfatura_uuid=f"TEST-INCOMING-{supplier.id}-{j}-{random.randint(1000, 9999)}",
                invoice_number=f"2025/IN/{i+1:04d}/{j+1:03d}",
                invoice_date=invoice_date,
                invoice_type='INCOMING',
                sender_name=supplier.company_name,
                sender_tax_number=supplier.tax_number,
                sender_tax_office=supplier.tax_office,
                sender_address=supplier.address,
                sender_city=supplier.city,
                supplier_id=supplier.id,
                currency='TRY',
                subtotal=Decimal('0'),
                tax_amount=Decimal('0'),
                total_amount=Decimal('0'),
                status='RECEIVED',
                is_matched=True,
                raw_data={"test": True}
            )
            db.session.add(invoice)
            db.session.flush()
            
            # Add invoice items
            num_items = random.randint(2, 5)
            invoice_subtotal = Decimal('0')
            invoice_tax = Decimal('0')
            
            for k in range(num_items):
                unit_price = Decimal(str(random.uniform(10, 500)))
                quantity = Decimal(str(random.randint(1, 20)))
                tax_rate = 18
                
                line_subtotal = unit_price * quantity
                line_tax = line_subtotal * Decimal('0.18')
                line_total = line_subtotal + line_tax
                
                item = PurchaseInvoiceItem(
                    purchase_invoice_id=invoice.id,
                    product_code=f"PRD-{k:04d}",
                    product_name=PRODUCT_NAMES[k % len(PRODUCT_NAMES)],
                    quantity=quantity,
                    unit='Adet',
                    unit_price=unit_price,
                    tax_rate=tax_rate,
                    tax_amount=line_tax,
                    line_total=line_total
                )
                db.session.add(item)
                
                invoice_subtotal += line_subtotal
                invoice_tax += line_tax
            
            # Update invoice totals
            invoice.subtotal = invoice_subtotal
            invoice.tax_amount = invoice_tax
            invoice.total_amount = invoice_subtotal + invoice_tax
            
            invoices.append(invoice)
    
    print(f"✓ Created {len(invoices)} incoming invoices")
    return invoices


def create_outgoing_invoices(suppliers):
    """Create outgoing invoices (returns/corrections to suppliers)"""
    print("\n3. Creating outgoing invoices (returns)...")
    invoices = []
    
    # Create 1 return invoice for some suppliers
    for i in range(3):
        supplier = suppliers[i]
        invoice_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        invoice = PurchaseInvoice(
            birfatura_uuid=f"TEST-OUTGOING-{supplier.id}-{random.randint(1000, 9999)}",
            invoice_number=f"2025/OUT/{i+1:04d}/001",
            invoice_date=invoice_date,
            invoice_type='OUTGOING',
            sender_name=supplier.company_name,
            sender_tax_number=supplier.tax_number,
            supplier_id=supplier.id,
            currency='TRY',
            subtotal=Decimal('0'),
            tax_amount=Decimal('0'),
            total_amount=Decimal('0'),
            status='SENT',
            is_matched=True,
            raw_data={"test": True, "type": "return"}
        )
        db.session.add(invoice)
        db.session.flush()
        
        # Add 1-2 items
        num_items = random.randint(1, 2)
        invoice_subtotal = Decimal('0')
        invoice_tax = Decimal('0')
        
        for k in range(num_items):
            unit_price = Decimal(str(random.uniform(50, 300)))
            quantity = Decimal(str(random.randint(1, 5)))
            
            line_subtotal = unit_price * quantity
            line_tax = line_subtotal * Decimal('0.18')
            line_total = line_subtotal + line_tax
            
            item = PurchaseInvoiceItem(
                purchase_invoice_id=invoice.id,
                product_code=f"RET-{k:04d}",
                product_name=f"İade: {PRODUCT_NAMES[k % len(PRODUCT_NAMES)]}",
                quantity=quantity,
                unit='Adet',
                unit_price=unit_price,
                tax_rate=18,
                tax_amount=line_tax,
                line_total=line_total
            )
            db.session.add(item)
            
            invoice_subtotal += line_subtotal
            invoice_tax += line_tax
        
        invoice.subtotal = invoice_subtotal
        invoice.tax_amount = invoice_tax
        invoice.total_amount = invoice_subtotal + invoice_tax
        
        invoices.append(invoice)
    
    print(f"✓ Created {len(invoices)} outgoing invoices (returns)")
    return invoices


def create_unmatched_invoices():
    """Create invoices from unmatched suppliers (should create suggested suppliers)"""
    print("\n4. Creating invoices from unknown suppliers...")
    invoices = []
    suggested = []
    
    for i, supplier_data in enumerate(UNMATCHED_SUPPLIERS):
        # Create suggested supplier entry
        invoice_date = datetime.utcnow() - timedelta(days=random.randint(1, 60))
        total_amount = Decimal(str(random.uniform(1000, 10000)))
        
        sugg = SuggestedSupplier(
            company_name=supplier_data["name"],
            tax_number=supplier_data["tax"],
            tax_office=f"{supplier_data['city']} Vergi Dairesi",
            address=f"{supplier_data['city']} Test Sok. No:{i+1}",
            city=supplier_data["city"],
            invoice_count=random.randint(1, 5),
            total_amount=total_amount,
            first_invoice_date=invoice_date,
            last_invoice_date=invoice_date,
            status='PENDING'
        )
        db.session.add(sugg)
        db.session.flush()
        suggested.append(sugg)
        
        # Create invoice
        invoice = PurchaseInvoice(
            birfatura_uuid=f"TEST-UNMATCHED-{i}-{random.randint(1000, 9999)}",
            invoice_number=f"2025/UNK/{i+1:04d}/001",
            invoice_date=invoice_date,
            invoice_type='INCOMING',
            sender_name=supplier_data["name"],
            sender_tax_number=supplier_data["tax"],
            sender_tax_office=f"{supplier_data['city']} Vergi Dairesi",
            sender_address=f"{supplier_data['city']} Test Sok.",
            sender_city=supplier_data["city"],
            supplier_id=None,  # Not matched
            currency='TRY',
            subtotal=total_amount / Decimal('1.18'),
            tax_amount=total_amount - (total_amount / Decimal('1.18')),
            total_amount=total_amount,
            status='RECEIVED',
            is_matched=False,
            raw_data={"test": True, "unmatched": True}
        )
        db.session.add(invoice)
        db.session.flush()
        
        # Add items
        num_items = random.randint(1, 3)
        for k in range(num_items):
            item = PurchaseInvoiceItem(
                purchase_invoice_id=invoice.id,
                product_code=f"UNK-{k:04d}",
                product_name=PRODUCT_NAMES[k % len(PRODUCT_NAMES)],
                quantity=Decimal(str(random.randint(1, 10))),
                unit='Adet',
                unit_price=Decimal(str(random.uniform(50, 500))),
                tax_rate=18,
                tax_amount=Decimal('0'),
                line_total=total_amount / num_items
            )
            db.session.add(item)
        
        invoices.append(invoice)
    
    print(f"✓ Created {len(suggested)} suggested suppliers")
    print(f"✓ Created {len(invoices)} unmatched invoices")
    return invoices, suggested


def main():
    """Main test data generation"""
    with app.app_context():
        print("=" * 60)
        print("CREATING TEST DATA FOR SUPPLIER INVOICE INTEGRATION")
        print("=" * 60)
        
        # Create test data
        suppliers = create_test_suppliers()
        incoming = create_incoming_invoices(suppliers)
        outgoing = create_outgoing_invoices(suppliers)
        unmatched, suggested = create_unmatched_invoices()
        
        # Commit all
        db.session.commit()
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"✓ Suppliers created: {len(suppliers)}")
        print(f"✓ Incoming invoices: {len(incoming)}")
        print(f"✓ Outgoing invoices: {len(outgoing)}")
        print(f"✓ Unmatched invoices: {len(unmatched)}")
        print(f"✓ Suggested suppliers: {len(suggested)}")
        print(f"\nTotal invoices: {len(incoming) + len(outgoing) + len(unmatched)}")
        print("=" * 60)
        
        # Verification
        print("\nVERIFICATION:")
        total_purchase_invoices = PurchaseInvoice.query.count()
        total_items = PurchaseInvoiceItem.query.count()
        total_suggested = SuggestedSupplier.query.count()
        total_suppliers = Supplier.query.count()
        
        print(f"✓ Total suppliers in DB: {total_suppliers}")
        print(f"✓ Total purchase invoices in DB: {total_purchase_invoices}")
        print(f"✓ Total invoice items in DB: {total_items}")
        print(f"✓ Total suggested suppliers in DB: {total_suggested}")
        
        print("\n✅ TEST DATA CREATED SUCCESSFULLY!")


if __name__ == '__main__':
    main()
