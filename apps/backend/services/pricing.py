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

        for assignment in device_assignments:
            inventory_id = assignment.get('inventoryId')
            inventory_item = None
            if inventory_id:
                from models.inventory import Inventory
                inventory_item = db.session.get(Inventory, inventory_id)
            
            list_price = None
            if assignment.get('base_price') is not None:
                list_price = float(assignment.get('base_price') or 0)
            elif inventory_item and getattr(inventory_item, 'price', None) is not None:
                list_price = float(inventory_item.price)
            else:
                list_price = 0.0

            base_total += list_price

            # İndirim hesaplama - yüzde veya sabit miktar
            try:
                discount_type = assignment.get('discount_type', 'amount')  # 'percentage' veya 'amount'
                discount_value = float(assignment.get('discount_value', 0) or 0)
                
                if discount_type == 'percentage':
                    # Yüzde indirimi - bu cihazın list price'ı üzerinden hesapla
                    discount_amount = list_price * (discount_value / 100.0)
                else:
                    # Sabit miktar indirimi
                    discount_amount = discount_value
                    
                total_discount += discount_amount
                
                # Sale price = List price - discount
                sale_price = list_price - discount_amount
                sale_price_total += sale_price
                
            except Exception:
                total_discount += 0.0
                sale_price_total += list_price

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

        # Frontend mantığına uygun hesaplama:
        # 1. Total amount = List price + accessories + services (indirim öncesi)
        # 2. Sale price total = İndirim sonrası cihaz fiyatları + accessories + services
        total_amount = round(base_total + accessory_total + service_total, 2)
        sale_price_with_extras = round(sale_price_total + accessory_total + service_total, 2)

        # SGK desteği hesaplama - Her assignment'ın kendi sgk_scheme'ini kullan
        sgk_coverage_amount = 0.0
        
        # Her device assignment için ayrı SGK hesaplama yap
        for assignment in device_assignments:
            assignment_sgk_scheme = assignment.get('sgk_scheme', sgk_scheme)
            if not assignment_sgk_scheme:
                assignment_sgk_scheme = sgk_scheme
                
            sgk_conf = settings.get('sgk', {}).get('schemes', {}).get(assignment_sgk_scheme, {})
            assignment_sgk_amount = 0.0
            
            if sgk_conf:
                # Bu assignment için list price al
                inventory_id = assignment.get('inventoryId')
                inventory_item = None
                if inventory_id:
                    from models.inventory import Inventory
                    inventory_item = db.session.get(Inventory, inventory_id)
                    
                assignment_list_price = None
                if assignment.get('base_price') is not None:
                    assignment_list_price = float(assignment.get('base_price') or 0)
                elif inventory_item and getattr(inventory_item, 'price', None) is not None:
                    assignment_list_price = float(inventory_item.price)
                else:
                    assignment_list_price = 0.0
                
                if 'coverage_amount' in sgk_conf:
                    # Sabit miktar - bu assignment için
                    assignment_sgk_amount = float(sgk_conf.get('coverage_amount') or 0)
                    
                    # Maksimum limit kontrolü
                    max_amount = float(sgk_conf.get('max_amount') or 0)
                    if max_amount and assignment_sgk_amount > max_amount:
                        assignment_sgk_amount = max_amount
                elif 'coverage_percentage' in sgk_conf:
                    # Yüzde hesaplama - bu assignment'ın list price'ı üzerinden
                    pct = float(sgk_conf.get('coverage_percentage', 0) or 0) / 100.0
                    assignment_sgk_amount = assignment_list_price * pct
                    max_amount = float(sgk_conf.get('max_amount') or 0)
                    if max_amount and assignment_sgk_amount > max_amount:
                        assignment_sgk_amount = max_amount
                
                # Bu assignment'ın sale price'ını hesapla
                try:
                    discount_type = assignment.get('discount_type', 'amount')
                    discount_value = float(assignment.get('discount_value', 0) or 0)
                    
                    if discount_type == 'percentage':
                        discount_amount = assignment_list_price * (discount_value / 100.0)
                    else:
                        discount_amount = discount_value
                        
                    assignment_sale_price = assignment_list_price - discount_amount
                    
                    # SGK tutarı bu assignment'ın sale price'ını geçemez
                    assignment_sgk_amount = min(assignment_sgk_amount, assignment_sale_price)
                    
                except Exception:
                    assignment_sgk_amount = min(assignment_sgk_amount, assignment_list_price)
            
            # Toplam SGK kapsamına ekle
            sgk_coverage_amount += assignment_sgk_amount

        # Toplam SGK tutarı toplam sale price'ı geçemez
        sgk_coverage_amount = round(min(sgk_coverage_amount, sale_price_with_extras), 2)

        # Frontend mantığına uygun hasta sorumluluğu = Sale Price - SGK desteği
        patient_responsible_amount = round(max(sale_price_with_extras - sgk_coverage_amount, 0.0), 2)

        # Cihaz başına SGK desteği hesaplama
        per_item_sgk = round(sgk_coverage_amount / max(1, len(device_assignments)), 2)

        return {
            'total_amount': total_amount,  # List price + extras (indirim öncesi)
            'sale_price_total': sale_price_with_extras,  # İndirim sonrası + extras
            'sgk_coverage_amount': sgk_coverage_amount,
            'patient_responsible_amount': patient_responsible_amount,
            'sgk_coverage_amount_per_item': per_item_sgk,
            'total_discount': round(total_discount, 2)
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


def create_payment_plan(sale_id, plan_type, amount, settings):
    try:
        plans = settings.get('payment', {}).get('plans', {})
        plan_conf = plans.get(plan_type, {}) if plans else {}
        installments = int(plan_conf.get('installments', 1) or 1)
        interest_rate = float(plan_conf.get('interest_rate', 0.0) or 0.0)

        preview = calculate_payment_plan(amount, installments, interest_rate)

        plan_id = f"pp_{uuid4().hex[:8]}_{now_utc().strftime('%d%m%Y%H%M%S') }"
        payment_plan = PaymentPlan(
            id=plan_id,
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


def create_custom_payment_plan(sale_id, custom_installments, custom_interest_rate, principal_amount):
    try:
        preview = calculate_payment_plan(principal_amount, custom_installments, custom_interest_rate)
        plan_id = f"pp_{uuid4().hex[:8]}_{now_utc().strftime('%d%m%Y%H%M%S') }"
        payment_plan = PaymentPlan(
            id=plan_id,
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
