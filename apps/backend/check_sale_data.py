
import sys
import os
from flask import Flask
from models.sales import Sale, PaymentRecord, DeviceAssignment
from extensions import db

# Initialize Flask App
app = Flask(__name__)
base_dir = os.path.abspath(os.path.dirname(__file__))
# Check if instance folder exists, if not use current dir
db_path = os.path.join(base_dir, 'instance', 'xear.db')
if not os.path.exists(db_path):
    db_path = os.path.join(base_dir, 'xear.db')

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def check_sale(sale_id):
    with app.app_context():
        print(f"--- Checking Sale ID: {sale_id} ---")
        # Try finding by string or integer
        sale = Sale.query.filter_by(id=sale_id).first()
        if not sale:
            print(f"Sale {sale_id} NOT FOUND.")
            return

        print(f"Sale Found: ID={sale.id}")
        print(f"  Paid Amount (DB): {sale.paid_amount}")
        print(f"  Total Amount: {sale.total_amount}")
        print(f"  Final Amount: {sale.final_amount}")
        print(f"  Discount Amount: {sale.discount_amount}")
        print(f"  SGK Coverage: {sale.sgk_coverage}")
        
        # Check payments
        payments = PaymentRecord.query.filter_by(sale_id=str(sale.id)).all()
        print(f"  Payment Records: {len(payments)}")
        for p in payments:
            print(f"    - ID: {p.id}, Type: {p.payment_type}, Amount: {p.amount}, Date: {p.payment_date}")

        # Check assignments
        assignments = DeviceAssignment.query.filter_by(sale_id=str(sale.id)).all()
        print(f"  Assignments: {len(assignments)}")
        for a in assignments:
            print(f"    - ID: {a.id}, SGK: {a.sgk_scheme}, Support: {a.sgk_support}, Net: {a.net_payable}")

if __name__ == "__main__":
    check_sale("2512310102")
