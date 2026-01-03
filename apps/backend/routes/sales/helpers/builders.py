"""
Sales Helper Utilities - Data Builders

Provides functions to build data dictionaries for API responses.
"""
from models.sales import PaymentInstallment


def build_installment_data(installment):
    """Build installment data dictionary."""
    return {
        'id': installment.id,
        'installmentNumber': installment.installment_number,
        'amount': float(installment.amount),
        'dueDate': installment.due_date.isoformat(),
        'status': installment.status,
        'paidDate': installment.paid_date.isoformat() if installment.paid_date else None,
        'notes': installment.notes
    }


def build_payment_plan_data(plan):
    """Build payment plan data dictionary."""
    installments = PaymentInstallment.query.filter_by(
        payment_plan_id=plan.id
    ).order_by(PaymentInstallment.due_date.asc()).all()

    installments_data = [build_installment_data(installment) for installment in installments]

    return {
        'id': plan.id,
        'planType': plan.plan_type,
        'installmentCount': plan.installment_count,
        'downPayment': float(plan.down_payment) if plan.down_payment else 0,
        'monthlyAmount': float(plan.monthly_amount) if plan.monthly_amount else 0,
        'startDate': plan.start_date.isoformat() if plan.start_date else None,
        'interestRate': float(plan.interest_rate) if plan.interest_rate else 0,
        'notes': plan.notes,
        'status': plan.status,
        'installments': installments_data,
        'createdAt': plan.created_at.isoformat() if plan.created_at else None
    }


def build_device_info(assignment):
    """Build device info dictionary for a device assignment."""
    device_info = {
        'id': assignment.id,
        'deviceId': assignment.device_id,
        'inventoryId': assignment.inventory_id,
        'ear': assignment.ear,
        'serialNumber': assignment.serial_number,
        'serialNumberLeft': assignment.serial_number_left,
        'serialNumberRight': assignment.serial_number_right,
        'reportStatus': assignment.report_status,
        'deliveryStatus': assignment.delivery_status,
        'isLoaner': assignment.is_loaner,
        'loanerInventoryId': assignment.loaner_inventory_id,
        'loanerSerialNumber': assignment.loaner_serial_number,
        'loanerSerialNumberLeft': assignment.loaner_serial_number_left,
        'loanerSerialNumberRight': assignment.loaner_serial_number_right,
        'loanerBrand': assignment.loaner_brand,
        'loanerModel': assignment.loaner_model,
        'listPrice': float(assignment.list_price) if assignment.list_price else 0,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else 0,
        'sgkSupport': float(assignment.sgk_support) if assignment.sgk_support else 0,
        'sgkScheme': assignment.sgk_scheme,
        'discountType': assignment.discount_type,
        'discountValue': float(assignment.discount_value) if assignment.discount_value else 0,
        'netPayable': float(assignment.net_payable) if assignment.net_payable else 0,
        'paymentMethod': assignment.payment_method,
        'notes': assignment.notes,
        'createdAt': assignment.created_at.isoformat() if assignment.created_at else None
    }
    
    # Add device/inventory info if available
    if assignment.device:
        device_info['deviceName'] = f"{assignment.device.brand} {assignment.device.model}"
        device_info['brand'] = assignment.device.brand
        device_info['model'] = assignment.device.model
    
    if assignment.inventory:
        device_info['inventoryName'] = assignment.inventory.name if hasattr(assignment.inventory, 'name') else None
    
    return device_info


def create_device_name(device, inventory_name):
    """Create a formatted device name."""
    if device:
        return f"{device.brand} {device.model}"
    if inventory_name:
        return inventory_name
    return "Unknown Device"


def build_sale_financial_data(sale, sgk_coverage_value):
    """Build financial data dictionary for a sale."""
    return {
        'listPriceTotal': float(sale.list_price_total) if sale.list_price_total else float(sale.total_amount or 0),
        'totalAmount': float(sale.total_amount) if sale.total_amount else 0,
        'discountAmount': float(sale.discount_amount) if sale.discount_amount else 0,
        'finalAmount': float(sale.final_amount) if sale.final_amount else 0,
        'sgkCoverage': sgk_coverage_value,
        'patientPayment': float(sale.patient_payment) if sale.patient_payment else 0,
        'paidAmount': float(sale.paid_amount) if sale.paid_amount else 0,
        'remainingAmount': max(0, float(sale.final_amount or 0) - float(sale.paid_amount or 0))
    }


def build_sale_metadata(sale, devices):
    """Build metadata dictionary for a sale."""
    return {
        'createdAt': sale.created_at.isoformat() if sale.created_at else None,
        'updatedAt': sale.updated_at.isoformat() if sale.updated_at else None,
        'deviceCount': len(devices),
        'hasPaymentPlan': hasattr(sale, 'payment_plans') and len(sale.payment_plans) > 0 if hasattr(sale, 'payment_plans') else False
    }


def build_sale_data(sale, devices, payment_plan, payment_records, invoice, sgk_coverage_value):
    """Build complete sale data dictionary."""
    financial_data = build_sale_financial_data(sale, sgk_coverage_value)
    metadata = build_sale_metadata(sale, devices)
    
    return {
        'id': sale.id,
        'patientId': sale.patient_id,
        'branchId': sale.branch_id,
        'tenantId': sale.tenant_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        'status': sale.status,
        'paymentMethod': sale.payment_method,
        **financial_data,
        'devices': devices,
        'paymentPlan': payment_plan,
        'payments': payment_records,
        'invoice': invoice,
        **metadata
    }
