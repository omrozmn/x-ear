
from app import create_app, db
from models.sales import Sale, DeviceAssignment

app = create_app()

def fix_sale():
    with app.app_context():
        sale_id = '2512310103'
        sale = Sale.query.filter_by(id=sale_id).first()
        
        if not sale:
            print(f"Sale {sale_id} not found!")
            return

        print(f"--- Before Fix ---")
        print(f"List: {sale.total_amount}, SGK: {sale.sgk_coverage}, Disc: {sale.discount_amount}, Final: {sale.final_amount}")

        # Target Values based on User Feedback and preserving 'Final Amount'
        # Formula: Final = List - SGK - Discount
        # SGK = List - Final - Discount
        
        target_list = 25996.00
        target_final = 12408.41
        target_discount = 1000.00
        
        calculated_sgk = target_list - target_final - target_discount
        # 25996 - 12408.41 - 1000 = 12587.59
        
        print(f"--- Target Values ---")
        print(f"List: {target_list}")
        print(f"Final (Total): {target_final}")
        print(f"Discount: {target_discount}")
        print(f"Calculated SGK: {calculated_sgk}")
        
        # Update SALE
        sale.total_amount = target_list
        sale.final_amount = target_final
        sale.discount_amount = target_discount
        sale.sgk_coverage = calculated_sgk
        
        # Update ASSIGNMENT (to stay consistent)
        for assignment in sale.device_assignments:
            print(f"Updating Assignment {assignment.id}...")
            # We assume the assignment accounts for the whole sale here since there is only one valid one left.
            # If 'Ear: both' implies double value, we put the full values here.
            
            assignment.sgk_support = calculated_sgk
            assignment.discount_type = 'amount'
            assignment.discount_value = target_discount
            # assignment.net_payable should matches sale.final_amount
            assignment.net_payable = target_final
            
            # List price on assignment is usually per-unit or total. 
            # To be safe, let's leave list_price on assignment as is (12998) if it represents unit price,
            # OR update it to 12998. 
            # If sale List is 25996, and assignment list is 12998, it implies Quantity 2 or Bilateral x2 logic.
            # We won't touch assignment.list_price to avoid breaking unit logic, 
            # but we WILL update the financial totals (sgk, discount, net).

        db.session.commit()
        print("--- Fix Applied & Committed ---")

if __name__ == '__main__':
    fix_sale()
