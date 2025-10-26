from flask import Blueprint, request, jsonify
from flask import make_response
from models.base import db, gen_sale_id
from models.patient import Patient
from models.device import Device
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentInstallment, PaymentRecord
from models.user import ActivityLog
from services.pricing import (
    calculate_device_pricing,
    create_payment_plan,
    create_custom_payment_plan
)
from utils.idempotency import idempotent
from datetime import datetime
import logging
from sqlalchemy import text
from uuid import uuid4
from decimal import Decimal

logger = logging.getLogger(__name__)

# Constants
ERROR_SALE_NOT_FOUND = "Sale not found"
ERROR_NO_DATA_PROVIDED = "No data provided"
ERROR_PATIENT_NOT_FOUND = "Patient not found"
UTC_OFFSET = "+00:00"

sales_bp = Blueprint('sales', __name__)

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()

# ============= ENHANCED PAYMENT TRACKING ENDPOINTS =============

@sales_bp.route('/sales/<sale_id>/payments', methods=['GET'])
def get_sale_payments(sale_id):
    """Get all payments for a specific sale"""
    try:
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
        # Get all payment records for this sale
        payments = PaymentRecord.query.filter_by(sale_id=sale_id)\
            .order_by(PaymentRecord.payment_date.desc()).all()
        
        payment_data = []
        for payment in payments:
            payment_dict = {
                'id': payment.id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'dueDate': payment.due_date.isoformat() if payment.due_date else None,
                'paymentMethod': payment.payment_method,
                'paymentType': payment.payment_type,
                'status': payment.status,
                'referenceNumber': payment.reference_number,
                'notes': payment.notes,
                'promissoryNoteId': payment.promissory_note_id,
                'createdAt': payment.created_at.isoformat() if payment.created_at else None,
                'updatedAt': payment.updated_at.isoformat() if payment.updated_at else None
            }
            payment_data.append(payment_dict)
        
        # Calculate payment summary
        total_paid = sum(float(p.amount) for p in payments if p.status == 'paid')
        total_pending = sum(float(p.amount) for p in payments if p.status == 'pending')
        remaining_balance = float(sale.total_amount) - total_paid
        
        return jsonify({
            'success': True,
            'data': {
                'payments': payment_data,
                'summary': {
                    'totalAmount': float(sale.total_amount),
                    'totalPaid': total_paid,
                    'totalPending': total_pending,
                    'remainingBalance': remaining_balance,
                    'paymentCount': len(payments)
                }
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get sale payments error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@sales_bp.route('/sales/<sale_id>/payments', methods=['POST'])
def record_sale_payment(sale_id):
    """Record a new payment for a sale"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
        # Validate required fields
        required_fields = ['amount', 'paymentMethod', 'paymentDate']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate amount
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({
                'success': False,
                'error': 'Payment amount must be greater than 0'
            }), 400
        
        # Check if payment exceeds remaining balance
        existing_payments = PaymentRecord.query.filter_by(
            sale_id=sale_id, 
            status='paid'
        ).all()
        total_paid = sum(float(p.amount) for p in existing_payments)
        remaining = float(sale.total_amount) - total_paid
        
        if amount > remaining + 0.01:  # Allow small rounding differences
            return jsonify({
                'success': False,
                'error': f'Payment amount ({amount}) exceeds remaining balance ({remaining})'
            }), 400
        
        # Create payment record
        payment = PaymentRecord()
        payment.id = f"payment_{uuid4().hex[:8]}"
        payment.patient_id = sale.patient_id
        payment.sale_id = sale_id
        payment.amount = Decimal(str(amount))
        payment.payment_method = data['paymentMethod']
        payment.payment_type = data.get('paymentType', 'payment')
        payment.status = data.get('status', 'paid')
        payment.reference_number = data.get('referenceNumber')
        payment.notes = data.get('notes')
        payment.promissory_note_id = data.get('promissoryNoteId')
        
        # Parse payment date
        try:
            payment.payment_date = datetime.fromisoformat(
                data['paymentDate'].replace('Z', UTC_OFFSET)
            )
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid payment date format'
            }), 400
        
        # Parse due date if provided
        if data.get('dueDate'):
            try:
                payment.due_date = datetime.fromisoformat(
                    data['dueDate'].replace('Z', UTC_OFFSET)
                )
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid due date format'
                }), 400
        
        payment.created_at = now_utc()
        payment.updated_at = now_utc()
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': payment.id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'paymentMethod': payment.payment_method,
                'status': payment.status,
                'saleId': sale_id
            },
            'message': 'Payment recorded successfully',
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Record sale payment error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@sales_bp.route('/sales/<sale_id>/installments/<installment_id>/pay', methods=['POST'])
def pay_installment(sale_id, installment_id):
    """Pay a specific installment"""
    try:
        data = request.get_json()
        
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404
        
        # Get installment
        installment = PaymentInstallment.query.filter_by(
            id=installment_id,
            payment_plan_id__in=[pp.id for pp in sale.payment_plans]
        ).first()
        
        if not installment:
            return jsonify({
                'success': False,
                'error': 'Installment not found'
            }), 404
        
        if installment.status == 'paid':
            return jsonify({
                'success': False,
                'error': 'Installment already paid'
            }), 400
        
        # Validate payment data
        amount = data.get('amount', float(installment.amount))
        payment_method = data.get('paymentMethod', 'cash')
        payment_date = data.get('paymentDate', now_utc().isoformat())
        
        # Create payment record
        payment = PaymentRecord()
        payment.id = f"payment_{uuid4().hex[:8]}"
        payment.patient_id = sale.patient_id
        payment.sale_id = sale_id
        payment.amount = Decimal(str(amount))
        payment.payment_method = payment_method
        payment.payment_type = 'installment'
        payment.status = 'paid'
        payment.reference_number = data.get('referenceNumber')
        payment.notes = f"Installment {installment.installment_number} payment"
        
        try:
            payment.payment_date = datetime.fromisoformat(
                payment_date.replace('Z', UTC_OFFSET)
            )
        except ValueError:
            payment.payment_date = now_utc()
        
        payment.created_at = now_utc()
        payment.updated_at = now_utc()
        
        # Update installment status
        installment.status = 'paid'
        installment.paid_date = payment.payment_date
        installment.updated_at = now_utc()
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'paymentId': payment.id,
                'installmentId': installment_id,
                'amount': float(payment.amount),
                'paymentDate': payment.payment_date.isoformat(),
                'status': installment.status
            },
            'message': 'Installment paid successfully',
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Pay installment error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


def _build_installment_data(installment):
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


def _build_payment_plan_data(plan):
    """Build payment plan data dictionary."""
    installments = PaymentInstallment.query.filter_by(
        payment_plan_id=plan.id
    ).order_by(PaymentInstallment.due_date.asc()).all()

    installments_data = [_build_installment_data(installment) for installment in installments]

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


@sales_bp.route('/sales/<sale_id>/payment-plan', methods=['GET'])
def get_sale_payment_plan(sale_id):
    """Get payment plan details for a sale"""
    try:
        # Verify sale exists
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({
                'success': False,
                'error': ERROR_SALE_NOT_FOUND
            }), 404

        # Get payment plans for this sale
        payment_plans = PaymentPlan.query.filter_by(sale_id=sale_id).all()
        plans_data = [_build_payment_plan_data(plan) for plan in payment_plans]

        return jsonify({
            'success': True,
            'data': {
                'paymentPlans': plans_data,
                'saleId': sale_id,
                'totalAmount': float(sale.total_amount)
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Get sale payment plan error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


# ============= ORIGINAL SALES ENDPOINTS =============

@sales_bp.route('/sales', methods=['GET'])
def get_sales():
    """Get all sales with pagination and filtering"""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)
        search = request.args.get('search', '').strip()
        
        query = Sale.query
        
        # Search functionality
        if search:
            query = query.join(Patient).filter(
                db.or_(
                    Patient.first_name.ilike(f'%{search}%'),
                    Patient.last_name.ilike(f'%{search}%'),
                    Sale.id.ilike(f'%{search}%')
                )
            )
        
        # Order by sale date descending
        query = query.order_by(Sale.sale_date.desc())
        
        # Paginate
        paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        sales_data = []
        for sale in paginated.items:
            sale_dict = sale.to_dict()
            # Add patient info
            if sale.patient:
                sale_dict['patient'] = {
                    'id': sale.patient.id,
                    'first_name': sale.patient.first_name,
                    'last_name': sale.patient.last_name
                }
            sales_data.append(sale_dict)
        
        return jsonify({
            'success': True,
            'data': sales_data,
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': paginated.total,
                'totalPages': paginated.pages
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get sales error: {str(e)}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@sales_bp.route('/patients/<patient_id>/assign-devices-extended', methods=['POST'])
@idempotent(methods=['POST'])
def _validate_assignment_input(data):
    """Validate input data for device assignment."""
    if not data:
        return None, jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

    device_assignments = data.get('device_assignments', [])
    if not device_assignments:
        return None, jsonify({"success": False, "error": "At least one device assignment required", "timestamp": datetime.now().isoformat()}), 400

    return data, None, None


def _load_settings_and_patient(patient_id):
    """Load settings and validate patient."""
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return None, None, jsonify({"success": False, "error": ERROR_PATIENT_NOT_FOUND, "timestamp": datetime.now().isoformat()}), 404

    from app import get_settings
    settings_response = get_settings()
    if not settings_response.get_json().get('success'):
        return None, None, jsonify({"success": False, "error": "Unable to load pricing settings", "timestamp": datetime.now().isoformat()}), 500

    settings = settings_response.get_json()['settings']
    return patient, settings, None, None


def _create_sale_record(patient_id, pricing_calculation, paid_amount, payment_plan_type):
    """Create sale record with pricing data."""
    sale = Sale(
        patient_id=patient_id,
        list_price_total=pricing_calculation['total_amount'],
        total_amount=pricing_calculation['total_amount'],
        discount_amount=pricing_calculation['total_discount'],
        final_amount=pricing_calculation['sale_price_total'],
        sgk_coverage=pricing_calculation['sgk_coverage_amount'],
        patient_payment=pricing_calculation['patient_responsible_amount'],
        paid_amount=paid_amount,
        payment_method=payment_plan_type if payment_plan_type != 'cash' else 'cash',
        status='pending',
        sale_date=datetime.now()
    )

    try:
        db.session.add(sale)
        db.session.flush()
        return sale, None
    except Exception as insert_err:
        logger.warning('ORM sale insert failed, falling back to raw SQL insert: %s', insert_err)
        try:
            sale_id = sale.id or gen_sale_id()
            insert_stmt = text(
                "INSERT INTO sales (id, patient_id, product_id, sale_date, list_price_total, total_amount, discount_amount, final_amount, paid_amount, payment_method, status, sgk_coverage, patient_payment, notes, created_at, updated_at) VALUES (:id, :patient_id, :product_id, :sale_date, :list_price_total, :total_amount, :discount_amount, :final_amount, :paid_amount, :payment_method, :status, :sgk_coverage, :patient_payment, :notes, :created_at, :updated_at)"
            )
            now = datetime.now()
            params = {
                'id': sale_id,
                'patient_id': patient_id,
                'product_id': None,
                'sale_date': now,
                'list_price_total': float(pricing_calculation['total_amount']),
                'total_amount': float(pricing_calculation['total_amount']),
                'discount_amount': float(pricing_calculation['total_discount']),
                'final_amount': float(pricing_calculation['sale_price_total']),
                'paid_amount': float(paid_amount),
                'payment_method': sale.payment_method,
                'status': sale.status,
                'sgk_coverage': float(pricing_calculation['sgk_coverage_amount']),
                'patient_payment': float(pricing_calculation['patient_responsible_amount']),
                'notes': '',
                'created_at': now,
                'updated_at': now
            }
            db.session.execute(insert_stmt, params)
            sale.id = sale_id
            return sale, None
        except Exception as raw_err:
            logger.exception('Raw SQL sale insert also failed: %s', raw_err)
            db.session.rollback()
            return None, jsonify({"success": False, "error": str(raw_err)}), 500


def _create_single_device_assignment(assignment_data, patient_id, sale_id, sgk_scheme, pricing_calculation):
    """Create a single device assignment."""
    inventory_id = assignment_data.get('inventoryId')
    if not inventory_id:
        return None, "Inventory ID required for assignment"

    from models.inventory import Inventory
    inventory_item = db.session.get(Inventory, inventory_id)
    if not inventory_item:
        return None, f"Inventory item not found: {inventory_id}"

    base_price = float(assignment_data.get('base_price', inventory_item.price or 0))
    discount_type = assignment_data.get('discount_type')
    discount_value = float(assignment_data.get('discount_value', 0) or 0)

    if discount_type == 'percentage':
        discount_amount = base_price * (discount_value / 100.0)
    else:
        discount_amount = discount_value
    net_price = base_price - discount_amount

    sgk_support = pricing_calculation.get('sgk_coverage_amount_per_item', 0)
    net_payable = max(0, net_price - sgk_support)

    assignment = DeviceAssignment(
        patient_id=patient_id,
        device_id=inventory_id,
        sale_id=sale_id,
        ear=assignment_data.get('ear_side', 'both') or assignment_data.get('ear', 'both'),
        reason=assignment_data.get('reason', 'Sale'),
        from_inventory=True,
        inventory_id=inventory_id,
        list_price=base_price,
        sale_price=net_price,
        sgk_scheme=sgk_scheme,
        sgk_support=sgk_support,
        discount_type=discount_type,
        discount_value=discount_value,
        net_payable=net_payable,
        payment_method=assignment_data.get('payment_method', 'cash'),
        notes=assignment_data.get('notes', '')
    )

    db.session.add(assignment)
    db.session.flush()
    return assignment, None


def _create_device_assignments(device_assignments, patient_id, sale, sgk_scheme, pricing_calculation):
    """Create all device assignments for a sale."""
    created_assignment_ids = []

    for i, assignment_data in enumerate(device_assignments):
        assignment, error = _create_single_device_assignment(assignment_data, patient_id, sale.id, sgk_scheme, pricing_calculation)
        if error:
            db.session.rollback()
            return None, jsonify({"success": False, "error": error, "timestamp": datetime.now().isoformat()}), 400

        created_assignment_ids.append(assignment.id)

        # Update sale ear assignments
        ear_val = (assignment.ear or '').lower()
        if ear_val.startswith('r') or ear_val == 'right':
            sale.right_assignment_id = assignment.id
        elif ear_val.startswith('l') or ear_val == 'left':
            sale.left_assignment_id = assignment.id
        else:
            if not getattr(sale, 'right_assignment_id', None):
                sale.right_assignment_id = assignment.id
            elif not getattr(sale, 'left_assignment_id', None):
                sale.left_assignment_id = assignment.id

    return created_assignment_ids, None, None


def _setup_payment_plan(payment_plan_type, sale_id, pricing_calculation, settings):
    """Create payment plan if needed."""
    if payment_plan_type != 'cash':
        payment_plan = create_payment_plan(sale_id, payment_plan_type, pricing_calculation['patient_responsible_amount'], settings)
        db.session.add(payment_plan)
        return payment_plan
    return None


def _log_device_assignment_activity(user_id, sale_id, device_count, total_amount, sgk_scheme, payment_plan_type, request):
    """Log device assignment activity."""
    from app import log_activity
    log_activity(
        user_id,
        'device_assigned_extended',
        'patient',
        None,  # patient_id not needed for this log
        {
            'sale_id': sale_id,
            'device_count': device_count,
            'total_amount': total_amount,
            'sgk_scheme': sgk_scheme,
            'payment_plan': payment_plan_type
        },
        request
    )


def assign_devices_extended(patient_id):
    try:
        # Validate input
        data, error_response, status_code = _validate_assignment_input(request.get_json())
        if error_response:
            return error_response, status_code

        # Load settings and validate patient
        _, settings, error_response, status_code = _load_settings_and_patient(patient_id)
        if error_response:
            return error_response, status_code

        device_assignments = data.get('device_assignments', [])
        sgk_scheme = data.get('sgk_scheme', settings.get('sgk', {}).get('default_scheme', 'standard'))
        payment_plan_type = data.get('payment_plan', 'cash')
        accessories = data.get('accessories', [])
        services = data.get('services', [])

        # Calculate pricing
        pricing_calculation = calculate_device_pricing(
            device_assignments=device_assignments,
            accessories=accessories,
            services=services,
            sgk_scheme=sgk_scheme,
            settings=settings
        )

        paid_amount = float(data.get('paidAmount', data.get('downPayment', 0)))

        # Create sale record
        sale, error_response = _create_sale_record(patient_id, pricing_calculation, paid_amount, payment_plan_type)
        if error_response:
            return error_response

        # Create device assignments
        created_assignment_ids, error_response, status_code = _create_device_assignments(
            device_assignments, patient_id, sale, sgk_scheme, pricing_calculation
        )
        if error_response:
            return error_response, status_code

        # Setup payment plan
        payment_plan = _setup_payment_plan(payment_plan_type, sale.id, pricing_calculation, settings)

        db.session.commit()

        # Log activity
        _log_device_assignment_activity(
            data.get('user_id', 'system'), sale.id, len(device_assignments),
            pricing_calculation['total_amount'], sgk_scheme, payment_plan_type, request
        )

        # Build response
        assignments_resp = [db.session.get(DeviceAssignment, aid).to_dict() for aid in created_assignment_ids]

        return jsonify({
            "success": True,
            "sale": sale.to_dict(),
            "device_assignments": assignments_resp,
            "pricing": pricing_calculation,
            "payment_plan": payment_plan.to_dict() if payment_plan else None,
            "message": "Devices assigned successfully with sale record",
            "timestamp": datetime.now().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Extended device assignment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sales_bp.route('/sales/<sale_id>/payment-plan', methods=['POST'])
def create_sale_payment_plan(sale_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({"success": False, "error": ERROR_SALE_NOT_FOUND, "timestamp": datetime.now().isoformat()}), 404

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json()['settings']

        plan_type = data.get('plan_type', sale.payment_method)
        custom_installments = data.get('custom_installments')
        custom_interest_rate = data.get('custom_interest_rate')

        if custom_installments:
            payment_plan = create_custom_payment_plan(
                sale_id, custom_installments, custom_interest_rate or 0.0, sale.patient_payment
            )
        else:
            payment_plan = create_payment_plan(sale_id, plan_type, sale.patient_payment, settings)

        sale.payment_method = plan_type
        db.session.add(payment_plan)
        db.session.commit()

        from app import log_activity
        log_activity(
            data.get('user_id', 'system'),
            'payment_plan_created',
            'sale',
            sale_id,
            {
                'plan_type': payment_plan.plan_name,
                'installments': payment_plan.installment_count,
                'total_amount': payment_plan.total_amount
            },
            request
        )

        return jsonify({"success": True, "payment_plan": payment_plan.to_dict(), "message": "Payment plan created successfully", "timestamp": datetime.now().isoformat()}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create payment plan error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


def _validate_product_sale_input(data):
    """Validate input data for product sale."""
    if not data:
        return None, jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

    product_id = data.get('product_id')
    if not product_id:
        return None, jsonify({"success": False, "error": "Product ID required"}), 400

    return data, None, None


def _load_product_from_inventory(product_id):
    """Load product from inventory with ORM fallback to raw SQL."""
    product = None
    try:
        from models.inventory import Inventory
        product = db.session.get(Inventory, product_id)
    except Exception as orm_err:
        logger.warning('ORM Inventory lookup failed, falling back to raw SQL: %s', orm_err)
        try:
            row = db.session.execute(text('SELECT id, available_inventory, price, name FROM inventory WHERE id = :id'), {'id': product_id}).fetchone()
            if row:
                class _P:
                    pass
                p = _P()
                p.id = row[0]
                p.available_inventory = row[1]
                p.price = row[2]
                p.name = row[3]
                product = p
        except Exception as sql_err:
            logger.error('Raw SQL inventory lookup failed: %s', sql_err)

    return product


def _validate_product_availability(product):
    """Validate product availability."""
    if not product:
        return jsonify({"success": False, "error": "Product not found"}), 404

    if product.available_inventory <= 0:
        return jsonify({"success": False, "error": "Product out of stock"}), 400

    return None, None


def _calculate_product_pricing(product, data):
    """Calculate pricing for product sale."""
    base_price = float(product.price or 0)
    discount = float(data.get('discount', 0))
    final_price = max(0, base_price - discount)
    return base_price, discount, final_price


def _create_product_sale_record(patient_id, product_id, base_price, discount, final_price, data):
    """Create product sale record with ORM fallback."""
    sale = Sale(
        patient_id=patient_id,
        list_price_total=base_price,
        total_amount=base_price,
        discount_amount=discount,
        final_amount=final_price,
        paid_amount=final_price if data.get('payment_type') == 'cash' else 0,
        payment_method=data.get('payment_type', 'cash'),
        status='completed' if data.get('payment_type') == 'cash' else 'pending',
        sale_date=datetime.now(),
        notes=data.get('notes', ''),
        product_id=product_id
    )

    try:
        db.session.add(sale)
        db.session.flush()
        return sale, None
    except Exception as insert_err:
        logger.warning('ORM sale insert failed, falling back to raw SQL insert: %s', insert_err)
        try:
            sale_id = sale.id or gen_sale_id()
            insert_stmt = text(
                "INSERT INTO sales (id, patient_id, product_id, sale_date, list_price_total, total_amount, discount_amount, final_amount, paid_amount, payment_method, status, sgk_coverage, patient_payment, notes, created_at, updated_at) VALUES (:id, :patient_id, :product_id, :sale_date, :list_price_total, :total_amount, :discount_amount, :final_amount, :paid_amount, :payment_method, :status, :sgk_coverage, :patient_payment, :notes, :created_at, :updated_at)"
            )
            now = datetime.now()
            params = {
                'id': sale_id,
                'patient_id': patient_id,
                'product_id': product_id,
                'sale_date': now,
                'list_price_total': float(base_price),
                'total_amount': float(base_price),
                'discount_amount': float(discount),
                'final_amount': float(final_price),
                'paid_amount': float(sale.paid_amount),
                'payment_method': sale.payment_method,
                'status': sale.status,
                'sgk_coverage': 0.0,
                'patient_payment': float(final_price),
                'notes': sale.notes or '',
                'created_at': now,
                'updated_at': now
            }
            db.session.execute(insert_stmt, params)
            sale.id = sale_id
            return sale, None
        except Exception as raw_err:
            logger.exception('Raw SQL sale insert also failed: %s', raw_err)
            db.session.rollback()
            return None, jsonify({"success": False, "error": str(raw_err)}), 500


def _create_product_device_assignment(patient_id, product_id, sale_id, base_price, final_price, product, data):
    """Create device assignment for product sale."""
    device_assignment = DeviceAssignment(
        patient_id=patient_id,
        device_id=product_id,
        sale_id=sale_id,
        reason='Sale',
        from_inventory=True,
        list_price=base_price,
        sale_price=final_price,
        net_payable=final_price,
        payment_method=data.get('payment_type', 'cash'),
        notes=f"Inventory sale: {getattr(product, 'name', '')} - {getattr(product, 'brand', '')} {getattr(product, 'model', '')}"
    )

    db.session.add(device_assignment)


def _update_product_inventory(product):
    """Update product inventory quantity."""
    product.available_inventory -= 1


def _handle_product_sale_idempotency(e, patient_id, data, idempotency_key):
    """Handle idempotency for product sale errors."""
    from sqlalchemy.exc import IntegrityError
    if isinstance(e, IntegrityError):
        existing_sale = Sale.query.filter_by(
            patient_id=patient_id,
            product_id=data.get('product_id')
        ).order_by(Sale.created_at.desc()).first()
        if existing_sale:
            logger.info('Returning existing sale %s for patient %s product %s idempotency_key=%s', existing_sale.id, patient_id, data.get('product_id'), idempotency_key)
            return make_response(jsonify({
                "success": True,
                "sale_id": existing_sale.id,
                "message": "Sale already exists"
            }), 200)
    return None


@sales_bp.route('/patients/<patient_id>/product-sales', methods=['POST'])
@idempotent(methods=['POST'])
def create_product_sale(patient_id):
    """Create a new product sale from inventory"""
    try:
        # Validate input
        data, error_response, status_code = _validate_product_sale_input(request.get_json())
        if error_response:
            return error_response, status_code

        # Validate patient
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": ERROR_PATIENT_NOT_FOUND}), 404

        # Setup logging
        idempotency_key = request.headers.get('Idempotency-Key')
        logger.info('create_product_sale invoked: patient_id=%s product_id=%s idempotency_key=%s', patient_id, data.get('product_id'), idempotency_key)
        _debug_idempotency_key = idempotency_key

        # Load and validate product
        product = _load_product_from_inventory(data.get('product_id'))
        error_response, status_code = _validate_product_availability(product)
        if error_response:
            return error_response, status_code

        # Calculate pricing
        base_price, discount, final_price = _calculate_product_pricing(product, data)

        # Create sale record
        sale, error_response = _create_product_sale_record(patient_id, product.id, base_price, discount, final_price, data)
        if error_response:
            return error_response

        # Create device assignment
        _create_product_device_assignment(patient_id, product.id, sale.id, base_price, final_price, product, data)

        # Update inventory
        _update_product_inventory(product)

        db.session.commit()
        logger.info('Sale created successfully: %s idempotency_key=%s', sale.id, idempotency_key)

        resp_payload = {
            "success": True,
            "sale_id": sale.id,
            "message": "Product sale completed successfully"
        }
        logger.info('create_product_sale returning sale_id=%s idempotency_key=%s status=201', sale.id, idempotency_key)
        return make_response(jsonify(resp_payload), 201)

    except Exception as e:
        db.session.rollback()
        # Log full exception with traceback to aid debugging of FK/ORM metadata issues
        logger.exception('Error creating product sale')
        # Handle integrity errors for idempotency
        idempotency_response = _handle_product_sale_idempotency(e, patient_id, data, idempotency_key)
        if idempotency_response:
            return idempotency_response
        return jsonify({"success": False, "error": str(e)}), 500


@sales_bp.route('/sales/logs', methods=['POST'])
def create_sales_log():
    """Create a sales log entry for cashflow.html page"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

        # Get patient information for proper formatting
        patient = Patient.query.get(data.get('patient_id'))
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Bilinmeyen Hasta"

        # Create ActivityLog entry for backend tracking
        
        log_entry = ActivityLog(
            user_id=data.get('user_name', 'system'),
            action='product_sale',
            entity_type='sale',
            entity_id=str(data.get('sale_id')),  # Convert to string
            details=f"Product sale - Patient: {data.get('patient_id')}, Sale: {data.get('sale_id')}, Amount: {data.get('amount', 0)}"
        )
        
        db.session.add(log_entry)
        db.session.commit()

        # Determine recordType based on product category or notes
        record_type = "teslimat"  # Default
        notes = data.get('notes', '').lower()
        
        # Map common terms to record types
        if 'pil' in notes or 'batarya' in notes:
            record_type = "pil"
        elif 'filtre' in notes:
            record_type = "filtre"
        elif 'tamir' in notes or 'onarım' in notes:
            record_type = "tamir"
        elif 'kaparo' in notes or 'kapora' in notes:
            record_type = "kalip"
        elif 'aksesuar' in notes or 'aksesuvar' in notes:
            record_type = "diger"

        # Create cashflow.html compatible format
        sales_html_format = {
            "transactionType": "income",  # Product sales are always income
            "recordType": record_type,
            "patientId": data.get('patient_id'),
            "patientName": patient_name,
            "amount": float(data.get('amount', 0)),
            "description": data.get('notes', f"Ürün satışı - Satış ID: {data.get('sale_id')}"),
            "date": data.get('timestamp', datetime.now().isoformat()),
            "id": data.get('sale_id', f"sale_{int(datetime.now().timestamp() * 1000)}")
        }

        return jsonify({
            "success": True, 
            "message": "Sales log created",
            "sales_html_data": sales_html_format
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating sales log: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


def _get_device_assignments_for_sale(sale):
    """Get device assignments for a sale, trying new method first, then legacy."""
    assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()

    # If no assignments found by sale_id, try legacy method
    if not assignments:
        linked_ids = [sale.right_ear_assignment_id, sale.left_ear_assignment_id]
        linked_ids = [lid for lid in linked_ids if lid]
        if linked_ids:
            assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()

    return assignments


def _create_device_name(device, inventory_name):
    """Create a display name for a device."""
    if inventory_name:
        return inventory_name

    brand = device.brand or ""
    model = device.model or ""
    if brand and model:
        return f"{brand} {model}"
    elif brand:
        return brand
    elif model:
        return model
    else:
        return "Cihaz"


def _build_device_info(assignment):
    """Build device information dictionary from assignment."""
    device = db.session.get(Device, assignment.device_id)
    if not device:
        return None

    # Get inventory name if available
    device_name = None
    barcode = None
    if device.inventory_id:
        from models.inventory import Inventory
        inventory_item = db.session.get(Inventory, device.inventory_id)
        if inventory_item:
            device_name = inventory_item.name
            barcode = inventory_item.barcode

    device_name = _create_device_name(device, device_name)

    return {
        'id': device.id,
        'name': device_name,
        'brand': device.brand,
        'model': device.model,
        'serialNumber': device.serial_number,
        'barcode': barcode,
        'ear': assignment.ear,
        'listPrice': float(assignment.list_price) if assignment.list_price else None,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
        'sgk_coverage_amount': float(assignment.sgk_support) if assignment.sgk_support else None,
        'patient_responsible_amount': float(assignment.net_payable) if hasattr(assignment, 'net_payable') and assignment.net_payable is not None else None
    }


def _calculate_sgk_coverage(sale, assignments):
    """Calculate SGK coverage for a sale, recalculating if needed."""
    # If stored SGK coverage is zero, recalc with current settings for accurate display
    if (not sale.sgk_coverage or abs(float(sale.sgk_coverage)) < 0.01) and assignments:
        try:
            from app import get_settings
            settings_response = get_settings()
            settings = settings_response.get_json().get('settings', {})
            device_assignments_payload = []
            for a in assignments:
                device_assignments_payload.append({
                    'device_id': a.device_id,
                    'base_price': float(a.list_price) if a.list_price else 0.0,
                    'discount_type': a.discount_type,
                    'discount_value': float(a.discount_value or 0.0),
                    'sgk_scheme': a.sgk_scheme
                })
            pricing_preview = calculate_device_pricing(
                device_assignments=device_assignments_payload,
                accessories=[],
                services=[],
                sgk_scheme=(assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme')),
                settings=settings
            )
            return float(pricing_preview.get('sgk_coverage_amount'))
        except Exception:
            pass

    return float(sale.sgk_coverage) if sale.sgk_coverage else 0.0


def _build_sale_financial_data(sale, sgk_coverage_value):
    """Build financial data portion of sale data."""
    return {
        'totalAmount': float(sale.total_amount) if sale.total_amount else None,
        'discountAmount': float(sale.discount_amount) if sale.discount_amount else 0.0,
        'finalAmount': float(sale.final_amount) if sale.final_amount else None,
        'paidAmount': float(sale.paid_amount) if sale.paid_amount else 0.0,
        'sgkCoverage': sgk_coverage_value,
        'patientPayment': float(sale.patient_payment) if sale.patient_payment else None,
        'total_list_price': float(sale.total_amount) if sale.total_amount else None,
        'total_sgk_support': sgk_coverage_value,
        'total_net_payable': float(sale.patient_payment) if sale.patient_payment else None,
    }


def _build_sale_metadata(sale, devices):
    """Build metadata portion of sale data."""
    first_device = devices[0] if devices else {}
    sgk_scheme = first_device.get('sgk_scheme') or 'no_coverage'
    discount_value = first_device.get('discount_value') if first_device.get('discount_type') == 'percentage' else None

    return {
        'sgk_scheme': sgk_scheme,
        'sgkGroup': sgk_scheme if sgk_scheme != 'no_coverage' else None,
        'sgk_group': sgk_scheme if sgk_scheme != 'no_coverage' else None,
        'discountRate': discount_value,
        'discount_rate': discount_value,
        'paymentMethod': sale.payment_method,
        'payment_method': sale.payment_method,
    }


def _build_sale_data(sale, devices, payment_plan, payment_records, invoice, sgk_coverage_value):
    """Build sale data dictionary."""
    return {
        'id': sale.id,
        'patientId': sale.patient_id,
        'productId': sale.product_id,
        'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
        **_build_sale_financial_data(sale, sgk_coverage_value),
        **_build_sale_metadata(sale, devices),
        'status': sale.status,
        'notes': sale.notes,
        'createdAt': sale.created_at.isoformat() if sale.created_at else None,
        'updatedAt': sale.updated_at.isoformat() if sale.updated_at else None,
        'created_at': sale.created_at.isoformat(),
        'devices': devices,
        'payment_plan': payment_plan.to_dict() if payment_plan else None,
        'paymentRecords': [record.to_dict() for record in payment_records],
        'invoice': invoice.to_dict() if invoice else None
    }


@sales_bp.route('/patients/<patient_id>/sales', methods=['GET'])
def get_patient_sales(patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": ERROR_PATIENT_NOT_FOUND, "timestamp": datetime.now().isoformat()}), 404

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        sales_pagination = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        sales = sales_pagination.items

        sales_data = []
        for sale in sales:
            assignments = _get_device_assignments_for_sale(sale)

            devices = []
            for assignment in assignments:
                device_info = _build_device_info(assignment)
                if device_info:
                    devices.append(device_info)

            payment_plan = PaymentPlan.query.filter_by(sale_id=sale.id).first()
            payment_records = PaymentRecord.query.filter_by(sale_id=sale.id).order_by(PaymentRecord.payment_date.desc()).all()

            from models.invoice import Invoice
            invoice = Invoice.query.filter_by(sale_id=sale.id).first()

            sgk_coverage_value = _calculate_sgk_coverage(sale, assignments)

            sales_data.append(_build_sale_data(sale, devices, payment_plan, payment_records, invoice, sgk_coverage_value))

        return jsonify({
            "success": True,
            "data": sales_data,
            "meta": {
                "total": sales_pagination.total,
                "page": page,
                "perPage": per_page,
                "totalPages": sales_pagination.pages
            },
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get patient sales error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sales_bp.route('/pricing-preview', methods=['POST'])
def pricing_preview():
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

        device_assignments = data.get('device_assignments', [])
        accessories = data.get('accessories', [])
        services = data.get('services', [])
        sgk_scheme = data.get('sgk_scheme')

        from app import get_settings
        settings_response = get_settings()
        if not settings_response.get_json().get('success'):
            return jsonify({"success": False, "error": "Unable to load settings", "timestamp": datetime.now().isoformat()}), 500
        settings = settings_response.get_json()['settings']

        sgk_scheme = sgk_scheme or settings['sgk']['default_scheme']

        pricing = calculate_device_pricing(device_assignments, accessories, services, sgk_scheme, settings)

        return jsonify({"success": True, "pricing": pricing, "timestamp": datetime.now().isoformat()}), 200

    except Exception as e:
        logger.error(f"Pricing preview error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


def _validate_status_value(status):
    """Validate sale status value."""
    if status not in ('pending', 'completed', 'cancelled', 'refunded'):
        raise ValueError(f"Invalid status value: {status}")


def _restore_serial_numbers(inventory_item, serial_number):
    """Restore serial numbers to inventory item."""
    if ',' in serial_number and ':' in serial_number:
        serials = serial_number.split(',')
        for serial_part in serials:
            if ':' in serial_part:
                serial = serial_part.split(':')[1].strip()
                if serial and serial != '-':
                    inventory_item.add_serial_number(serial)
    else:
        if serial_number != '-':
            inventory_item.add_serial_number(serial_number)


def _process_inventory_restoration(assignment, sale_id):
    """Process inventory restoration for a single assignment."""
    if not assignment.inventory_id:
        return

    from models.inventory import Inventory
    inventory_item = db.session.get(Inventory, assignment.inventory_id)
    if not inventory_item:
        return

    quantity_to_restore = 1 if assignment.ear != 'both' else 2

    if assignment.serial_number and assignment.serial_number != 'null':
        _restore_serial_numbers(inventory_item, assignment.serial_number)
    else:
        inventory_item.update_inventory(quantity_to_restore)

    inventory_item.updated_at = datetime.now()
    db.session.add(inventory_item)

    logger.info(f'Restored {quantity_to_restore} units to inventory {assignment.inventory_id} for cancelled sale {sale_id}')


def _restore_inventory_for_cancelled_sale(sale_id):
    """Restore inventory when a sale is cancelled."""
    try:
        device_assignments = DeviceAssignment.query.filter_by(sale_id=sale_id).all()
        for assignment in device_assignments:
            _process_inventory_restoration(assignment, sale_id)
    except Exception as e:
        logger.error(f'Failed to restore inventory for cancelled sale {sale_id}: {str(e)}')


def _update_sale_status(sale, new_status):
    """Update sale status and handle inventory restoration if cancelling."""
    old_status = sale.status
    _validate_status_value(new_status)

    if new_status == 'cancelled' and old_status != 'cancelled':
        _restore_inventory_for_cancelled_sale(sale.id)

    sale.status = new_status
    return True


def _update_sale_amounts(sale, data):
    """Update sale amounts (total_amount, paid_amount)."""
    changed = False

    if 'total_amount' in data:
        total_amount = data.get('total_amount')
        if total_amount is not None:
            sale.total_amount = float(total_amount)
            sale.final_amount = float(total_amount)
            sale.patient_payment = float(total_amount)
            changed = True

    if 'paid_amount' in data:
        paid_amount = data.get('paid_amount')
        if paid_amount is not None:
            sale.paid_amount = float(paid_amount)
            changed = True

    return changed


@sales_bp.route('/patients/<patient_id>/sales/<sale_id>', methods=['PATCH'])
def update_sale_partial(patient_id, sale_id):
    """Partially update a Sale resource. Supports updating status, notes, total_amount, and paid_amount.

    Expected payload: { "status": "cancelled", "total_amount": 1000.0, "paid_amount": 500.0, "notes": "Updated notes" }
    """
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

        sale = db.session.get(Sale, sale_id)
        if not sale or str(sale.patient_id) != str(patient_id):
            return jsonify({"success": False, "error": "Sale not found for patient", "timestamp": datetime.now().isoformat()}), 404

        # Allowed partial fields
        allowed_fields = {'status', 'notes', 'total_amount', 'paid_amount'}
        changed = False

        if 'status' in data:
            try:
                changed = _update_sale_status(sale, data.get('status')) or changed
            except ValueError as e:
                return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 400

        if 'notes' in data:
            sale.notes = data.get('notes')
            changed = True

        try:
            changed = _update_sale_amounts(sale, data) or changed
        except (ValueError, TypeError) as e:
            return jsonify({"success": False, "error": f"Invalid amount value: {str(e)}", "timestamp": datetime.now().isoformat()}), 400

        if not changed:
            return jsonify({"success": False, "error": "No valid fields to update", "timestamp": datetime.now().isoformat()}), 400

        db.session.add(sale)
        db.session.commit()

        from app import log_activity
        log_activity(
            data.get('user_id', 'system'),
            'sale_updated',
            'sale',
            sale.id,
            {k: data.get(k) for k in allowed_fields if k in data},
            request
        )

        return jsonify({"success": True, "data": sale.to_dict(), "message": "Sale updated", "timestamp": datetime.now().isoformat()}), 200

    except Exception as e:
        db.session.rollback()
        logger.exception('Failed to update sale %s for patient %s: %s', sale_id, patient_id, str(e))
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

def _get_sales_for_recalc(payload):
    """Get filtered sales for recalculation."""
    patient_id = payload.get('patientId') or request.args.get('patientId')
    sale_id = payload.get('saleId') or request.args.get('saleId')
    limit_val = payload.get('limit') or request.args.get('limit')
    limit = int(limit_val) if limit_val else None

    q = Sale.query
    if sale_id:
        q = q.filter_by(id=sale_id)
    if patient_id:
        q = q.filter_by(patient_id=patient_id)

    sales = q.order_by(Sale.created_at.desc()).all()
    if limit:
        sales = sales[:limit]

    return sales


def _get_assignments_for_sale(sale):
    """Get device assignments for a sale, trying new method first, then legacy."""
    assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
    if not assignments:
        # Legacy linkage: try right/left ear assignment ids if present
        linked_ids = [getattr(sale, 'right_ear_assignment_id', None), getattr(sale, 'left_ear_assignment_id', None)]
        linked_ids = [lid for lid in linked_ids if lid]
        if linked_ids:
            assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()
    return assignments


def _prepare_device_assignments_payload(assignments):
    """Prepare device assignments payload for pricing calculation."""
    return [{
        'device_id': a.device_id,
        'base_price': float(a.list_price) if a.list_price else 0.0,
        'discount_type': a.discount_type,
        'discount_value': float(a.discount_value or 0.0),
        'sgk_scheme': a.sgk_scheme
    } for a in assignments]


def _update_sale_pricing(sale, pricing_calc):
    """Update sale with recalculated pricing."""
    sale.list_price_total = pricing_calc.get('total_amount', sale.list_price_total)
    sale.total_amount = pricing_calc.get('total_amount', sale.total_amount)
    sale.discount_amount = pricing_calc.get('total_discount', sale.discount_amount)
    sale.final_amount = pricing_calc.get('sale_price_total', sale.final_amount)
    sale.sgk_coverage = pricing_calc.get('sgk_coverage_amount', sale.sgk_coverage)
    sale.patient_payment = pricing_calc.get('patient_responsible_amount', sale.patient_payment)


@sales_bp.route('/sales/recalc', methods=['POST'])
def recalc_sales():
    """Satış kayıtlarının SGK ve hasta ödeme tutarlarını yeniden hesaplarken kalıcı olarak günceller.
    İsteğe bağlı filtreler: body veya query içinde `patientId`, `saleId`, `limit`.
    """
    try:
        payload = request.get_json(silent=True) or {}
        sales = _get_sales_for_recalc(payload)

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json().get('settings', {})

        updated = 0
        processed = 0
        errors = []

        for s in sales:
            processed += 1
            try:
                assignments = _get_assignments_for_sale(s)
                if not assignments:
                    continue

                device_assignments_payload = _prepare_device_assignments_payload(assignments)
                sgk_scheme = assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme')

                pricing_calc = calculate_device_pricing(
                    device_assignments=device_assignments_payload,
                    accessories=[],
                    services=[],
                    sgk_scheme=sgk_scheme,
                    settings=settings
                )

                _update_sale_pricing(s, pricing_calc)
                db.session.add(s)
                updated += 1
            except Exception as ie:
                errors.append({'sale_id': s.id, 'error': str(ie)})

        try:
            db.session.commit()
        except Exception as ce:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(ce), 'updated': updated, 'processed': processed, 'errors': errors}), 500

        return jsonify({'success': True, 'updated': updated, 'processed': processed, 'errors': errors, 'timestamp': datetime.now().isoformat()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Recalc sales error: {str(e)}")
        return jsonify({'success': False, 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500
