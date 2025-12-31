
import sys
import os
from flask import Flask
from models.sales import Sale, PaymentRecord
from extensions import db
from decimal import Decimal

# Initialize Flask App
app = Flask(__name__)
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'instance', 'xear_crm.db')

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def fix_sale_down_payment(sale_id, amount):
    with app.app_context():
        print(f"--- Fixing Sale ID: {sale_id} to {amount} ---")
        sale = db.session.get(Sale, sale_id)
        if not sale:
            print("Sale NOT FOUND.")
            return

        print(f"Before: Paid={sale.paid_amount}")
        
        # Update Sale
        sale.paid_amount = Decimal(str(amount))
        
        # Update or Create PaymentRecord
        payment = PaymentRecord.query.filter_by(
            sale_id=sale.id, 
            payment_type='down_payment'
        ).first()
        
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
                payment_method='cash' # Default
            )
            db.session.add(payment)
            print("Created new PaymentRecord")
            
        db.session.commit()
        print(f"After: Paid={sale.paid_amount}")
        print("✅ Success")

if __name__ == "__main__":
    fix_sale_down_payment("2512310102", 5000)
