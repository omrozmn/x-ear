"""Legacy data fix script.

Reason: This script previously used Flask app_context to update records; backend is FastAPI-only now.
Expected outcome: Script runs without Flask installed by using `database.SessionLocal` directly.
"""

import os
from decimal import Decimal

from database import SessionLocal
from models.sales import Sale, PaymentRecord

def fix_sale_down_payment(sale_id, amount):
    print(f"--- Fixing Sale ID: {sale_id} to {amount} ---")

    with SessionLocal() as session:
        sale = session.get(Sale, sale_id)
        if not sale:
            sale = session.query(Sale).filter(Sale.id == str(sale_id)).first()
        if not sale:
            print("Sale NOT FOUND.")
            return

        print(f"Before: Paid={sale.paid_amount}")

        sale.paid_amount = Decimal(str(amount))

        payment = (
            session.query(PaymentRecord)
            .filter(PaymentRecord.sale_id == str(sale.id), PaymentRecord.payment_type == 'down_payment')
            .first()
        )
        if payment:
            payment.amount = Decimal(str(amount))
            print("Updated existing PaymentRecord")
        else:
            from datetime import datetime

            payment = PaymentRecord(
                tenant_id=sale.tenant_id,
                branch_id=sale.branch_id,
                patient_id=sale.patient_id,
                sale_id=sale.id,
                amount=Decimal(str(amount)),
                payment_date=datetime.utcnow(),
                payment_type='down_payment',
                payment_method='cash',
            )
            session.add(payment)
            print("Created new PaymentRecord")

        session.commit()
        print(f"After: Paid={sale.paid_amount}")
        print("✅ Success")

if __name__ == "__main__":
    fix_sale_down_payment("2512310102", 5000)
