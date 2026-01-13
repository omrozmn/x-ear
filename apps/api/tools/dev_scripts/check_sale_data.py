import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

"""Legacy data inspection script.

Reason: This script previously booted a Flask app context to access SQLAlchemy; the backend no longer uses Flask.
Expected outcome: Script remains usable without Flask installed by using `database.SessionLocal` directly.
"""

import sys
import os

from database import SessionLocal, set_current_tenant_id
from models.sales import Sale, PaymentRecord, DeviceAssignment

def check_sale(sale_id):
    print(f"--- Checking Sale ID: {sale_id} ---")

    # Optional for scripts: allow tenant scoping via env
    tenant_id = os.getenv("TENANT_ID")
    if tenant_id:
        set_current_tenant_id(tenant_id)

    with SessionLocal() as session:
        sale = session.get(Sale, sale_id)
        if not sale:
            sale = session.query(Sale).filter(Sale.id == str(sale_id)).first()
        if not sale:
            print(f"Sale {sale_id} NOT FOUND.")
            return

        print(f"Sale Found: ID={sale.id}")
        print(f"  Paid Amount (DB): {sale.paid_amount}")
        print(f"  Total Amount: {sale.total_amount}")
        print(f"  Final Amount: {sale.final_amount}")
        print(f"  Discount Amount: {sale.discount_amount}")
        print(f"  SGK Coverage: {sale.sgk_coverage}")

        payments = session.query(PaymentRecord).filter(PaymentRecord.sale_id == str(sale.id)).all()
        print(f"  Payment Records: {len(payments)}")
        for p in payments:
            print(f"    - ID: {p.id}, Type: {p.payment_type}, Amount: {p.amount}, Date: {p.payment_date}")

        assignments = session.query(DeviceAssignment).filter(DeviceAssignment.sale_id == str(sale.id)).all()
        print(f"  Assignments: {len(assignments)}")
        for a in assignments:
            print(f"    - ID: {a.id}, SGK: {a.sgk_scheme}, Support: {a.sgk_support}, Net: {a.net_payable}")

if __name__ == "__main__":
    check_sale("2512310102")
