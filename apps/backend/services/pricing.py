from uuid import uuid4
from datetime import timedelta, datetime, timezone
from models.base import db
from models.sales import PaymentPlan, PaymentInstallment
from models.device import Device
import logging

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

logger = logging.getLogger(__name__)


def calculate_device_pricing(device_assignments, accessories, services, sgk_scheme, settings):
    try:
        base_total = 0.0  # List price toplamı (indirim öncesi)
        accessory_total = 0.0
        service_total = 0.0
        total_discount = 0.0
        sale_price_total = 0.0  # İndirim sonrası toplam (Sale Price)

        # Compute per-assignment final sale prices using frontend-aligned logic:
        # For each assignment: apply SGK first (coverage reduces price), then apply discount
        # (percentage on remaining amount or fixed amount). Honor bilateral quantity by
        # multiplying net_payable by 2 when applicable. Aggregate totals accordingly.
        per_item_details = []
        for assignment in device_assignments:
            inventory_id = assignment.get('inventoryId')
            inventory_item = None
            if inventory_id:
                from models.inventory import InventoryItem
                inventory_item = db.session.get(InventoryItem, inventory_id)

            if assignment.get('base_price') is not None:
                list_price = float(assignment.get('base_price') or 0)
            elif inventory_item and getattr(inventory_item, 'price', None) is not None:
                list_price = float(inventory_item.price)
            else:
                list_price = 0.0

            # Determine if this assignment is bilateral / both ears
            ear_val = (assignment.get('ear') or assignment.get('ear_side') or '').lower()
            is_bilateral = True if (str(ear_val).startswith('b') or ear_val in ('both', 'bilateral')) else False
            quantity = 2 if is_bilateral else 1

            # Determine SGK support for this assignment (use scheme-specific config if available)
            assignment_sgk_scheme = assignment.get('sgk_scheme', sgk_scheme)
            if not assignment_sgk_scheme:
                assignment_sgk_scheme = sgk_scheme

            sgk_conf = settings.get('sgk', {}).get('schemes', {}).get(assignment_sgk_scheme, {})
            assignment_sgk_amount = 0.0
            if sgk_conf:
                if 'coverage_amount' in sgk_conf:
                    assignment_sgk_amount = float(sgk_conf.get('coverage_amount') or 0)
                    max_amount = float(sgk_conf.get('max_amount') or 0)
                    if max_amount and assignment_sgk_amount > max_amount:
                        assignment_sgk_amount = max_amount
                elif 'coverage_percentage' in sgk_conf:
                    pct = float(sgk_conf.get('coverage_percentage', 0) or 0) / 100.0
                    assignment_sgk_amount = list_price * pct
                    max_amount = float(sgk_conf.get('max_amount') or 0)
                    if max_amount and assignment_sgk_amount > max_amount:
                        assignment_sgk_amount = max_amount

            # SGK can't exceed the list price for this assignment
            assignment_sgk_amount = min(assignment_sgk_amount, list_price)

            # Apply SGK first, then compute discount on remaining amount
            price_after_sgk = max(0.0, list_price - assignment_sgk_amount)

            discount_type = assignment.get('discount_type')
            discount_value = float(assignment.get('discount_value', 0) or 0)
            if discount_type == 'percentage' and discount_value:
                discount_amount = (price_after_sgk * (discount_value / 100.0))
            else:
                discount_amount = float(discount_value or 0)

            final_sale_price_per_item = max(0.0, price_after_sgk - discount_amount)

            # Net payable considers quantity (bilateral = x2)
            net_payable_for_assignment = final_sale_price_per_item * quantity

            # Aggregate
            base_total += list_price
            sale_price_total += final_sale_price_per_item
            total_discount += discount_amount

            per_item_details.append({
                'inventoryId': inventory_id,
                'list_price': list_price,
                'sgk_support': round(assignment_sgk_amount, 2),
                'sale_price_per_item': round(final_sale_price_per_item, 2),
                'net_payable': round(net_payable_for_assignment, 2),
                'quantity': quantity
            })

        pricing_accessories = settings.get('pricing', {}).get('accessories', {})
        pricing_services = settings.get('pricing', {}).get('services', {})

        for acc in accessories or []:
            if isinstance(acc, dict):
                acc_price = acc.get('price')
                acc_type = acc.get('type')
                if acc_price is None and acc_type:
                    acc_price = pricing_accessories.get(acc_type, 0)
                accessory_total += float(acc_price or 0)
            else:
                accessory_total += float(pricing_accessories.get(acc, 0) or 0)

        for svc in services or []:
            if isinstance(svc, dict):
                svc_price = svc.get('price')
                svc_type = svc.get('type')
                if svc_price is None and svc_type:
                    svc_price = pricing_services.get(svc_type, 0)
                service_total += float(svc_price or 0)
            else:
                service_total += float(pricing_services.get(svc, 0) or 0)

        # Recompute totals using per-item details (quantity-aware)
        # sale_items_total is the sum of (list - sgk - discount) * quantity
        sale_items_total = round(sum(d['sale_price_per_item'] * d['quantity'] for d in per_item_details), 2)
        sgk_coverage_amount = round(sum(d['sgk_support'] * d['quantity'] for d in per_item_details), 2)
        
        # total_amount: List price + accessories + services (pre-discount, pre-SGK)
        total_amount = round(sum(d['list_price'] * d['quantity'] for d in per_item_details) + accessory_total + service_total, 2)
        
        # total_discount: Sum of all discounts applied across items
        total_discount = round(sum(((d['list_price'] - d['sgk_support']) - d['sale_price_per_item']) * d['quantity'] for d in per_item_details), 2)

        # Patient responsibility: What remains after SGK and Discount from the total
        # Since sale_items_total already has sgk subtracted per item, we don't subtract it again from the total sum
        # patient_responsible_amount = sale_items_total + extras
        patient_responsible_amount = round(sale_items_total + accessory_total + service_total, 2)
        sale_price_with_extras = patient_responsible_amount
        
        # Ensure SGK doesn't exceed the list total (safety check)
        sgk_coverage_amount = round(min(sgk_coverage_amount, total_amount), 2)
        
        # Ensure patient payment isn't negative
        patient_responsible_amount = max(0.0, patient_responsible_amount)

        # Per-item SGK list (per-unit for assignment storage)
        per_item_sgk = [round(d['sgk_support'], 2) for d in per_item_details] if per_item_details else [0.0 for _ in device_assignments]

        per_item_avg = round(sum(per_item_sgk) / max(1, len(per_item_sgk)), 2)

        # Build per_item return structure for compatibility with callers
        per_item_return = []
        for d in per_item_details:
            per_item_return.append({
                'sale_price': d['sale_price_per_item'],
                'patient_payment': d['net_payable'],
                'list_price': d['list_price'],
                'quantity': d['quantity'],
                'sgk_support': d['sgk_support']
            })

        return {
            'total_amount': total_amount,  # List price + extras (indirim öncesi)
            'sale_price_total': sale_price_with_extras,  # İndirim sonrası + extras
            'sgk_coverage_amount': sgk_coverage_amount,
            'patient_responsible_amount': patient_responsible_amount,
            'sgk_coverage_amount_per_item': per_item_avg,
            'sgk_coverage_amount_per_item_list': per_item_sgk,
            'total_discount': round(total_discount, 2),
            'per_item': per_item_return
        }

    except Exception as e:
        logger.error(f"calculate_device_pricing error: {str(e)}")
        raise


def calculate_payment_plan(principal, installments, interest_rate):
    try:
        principal = float(principal or 0)
        installments = int(installments or 1)
        interest_rate = float(interest_rate or 0.0)

        interest_total = round(principal * (interest_rate / 100.0) * (installments / 12.0), 2)
        total_amount = round(principal + interest_total, 2)
        installment_amount = round(total_amount / max(1, installments), 2)

        return {
            'installments': installments,
            'interest_rate': interest_rate,
            'principal': principal,
            'interest_total': interest_total,
            'total_amount': total_amount,
            'installment_amount': installment_amount
        }
    except Exception as e:
        logger.error(f"calculate_payment_plan error: {str(e)}")
        raise


def create_payment_plan(sale_id, plan_type, amount, settings, tenant_id, branch_id=None):
    try:
        plans = settings.get('payment', {}).get('plans', {})
        plan_conf = plans.get(plan_type, {}) if plans else {}
        installments = int(plan_conf.get('installments', 1) or 1)
        interest_rate = float(plan_conf.get('interest_rate', 0.0) or 0.0)

        preview = calculate_payment_plan(amount, installments, interest_rate)

        plan_id = f"pp_{uuid4().hex[:8]}_{now_utc().strftime('%d%m%Y%H%M%S') }"
        payment_plan = PaymentPlan(
            id=plan_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            sale_id=sale_id,
            plan_name=plan_type,
            installment_count=preview['installments'],
            interest_rate=preview['interest_rate'],
            total_amount=preview['total_amount'],
            installment_amount=preview['installment_amount'],
            start_date=now_utc(),
            status='active'
        )

        for i in range(preview['installments']):
            inst_id = f"ppi_{uuid4().hex[:8]}_{i+1}"
            due_date = now_utc() + timedelta(days=30 * (i + 1))
            installment = PaymentInstallment(
                id=inst_id,
                payment_plan_id=plan_id,
                installment_number=i + 1,
                amount=preview['installment_amount'],
                due_date=due_date,
                status='pending'
            )
            db.session.add(installment)

        return payment_plan

    except Exception as e:
        logger.error(f"create_payment_plan error: {str(e)}")
        raise


def create_custom_payment_plan(sale_id, custom_installments, custom_interest_rate, principal_amount, tenant_id, branch_id=None):
    try:
        preview = calculate_payment_plan(principal_amount, custom_installments, custom_interest_rate)
        plan_id = f"pp_{uuid4().hex[:8]}_{now_utc().strftime('%d%m%Y%H%M%S') }"
        payment_plan = PaymentPlan(
            id=plan_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            sale_id=sale_id,
            plan_name='custom',
            installment_count=preview['installments'],
            interest_rate=preview['interest_rate'],
            start_date=now_utc(),
            total_amount=preview['total_amount'],
            installment_amount=preview['installment_amount'],
            status='active'
        )

        for i in range(preview['installments']):
            inst_id = f"ppi_{uuid4().hex[:8]}_{i+1}"
            due_date = now_utc() + timedelta(days=30 * (i + 1))
            installment = PaymentInstallment(
                id=inst_id,
                payment_plan_id=plan_id,
                installment_number=i + 1,
                amount=preview['installment_amount'],
                due_date=due_date,
                status='pending'
            )
            db.session.add(installment)

        return payment_plan

    except Exception as e:
        logger.error(f"create_custom_payment_plan error: {str(e)}")
        raise
