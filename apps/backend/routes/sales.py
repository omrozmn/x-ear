from flask import Blueprint, request, jsonify
from flask import make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db, gen_sale_id
from models.patient import Patient
from models.device import Device
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentInstallment, PaymentRecord
from models.user import ActivityLog, User
from services.pricing import (
    calculate_device_pricing,
    create_payment_plan,
    create_custom_payment_plan
)
from services.stock_service import create_stock_movement
from utils.idempotency import idempotent
from utils.authorization import crm_permission_required
from datetime import datetime
import logging
import json
import os
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
@jwt_required()
def get_sales():
    """Get all sales with pagination and filtering"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)
        search = request.args.get('search', '').strip()
        
        query = Sale.query.filter_by(tenant_id=user.tenant_id)

        # If user is admin (branch admin), filter by assigned branches
        if user.role == 'admin':
            user_branch_ids = [b.id for b in user.branches]
            if user_branch_ids:
                query = query.filter(Sale.branch_id.in_(user_branch_ids))
            else:
                return jsonify({
                    'success': True,
                    'data': [],
                    'meta': {
                        'page': page,
                        'perPage': per_page,
                        'total': 0,
                        'totalPages': 0
                    },
                    'timestamp': datetime.now().isoformat()
                }), 200
        
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

@sales_bp.route('/sales', methods=['POST'])
@jwt_required()
@idempotent(methods=['POST'])
def create_sale():
    """Create a new sale directly (e.g. from frontend form)."""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

        patient_id = data.get('patientId') or data.get('patient_id')
        if not patient_id:
             return jsonify({"success": False, "error": "Patient ID required"}), 400

        patient = db.session.get(Patient, patient_id)
        if not patient or patient.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": ERROR_PATIENT_NOT_FOUND}), 404

        product_id = data.get('productId') or data.get('product_id')
        if not product_id:
             return jsonify({"success": False, "error": "Product ID required"}), 400

        product = _load_product_from_inventory(product_id)
        if not product:
             return jsonify({"success": False, "error": "Product not found"}), 404

        # Warning check for stock
        warnings = []
        if product.available_inventory <= 0:
            warnings.append(f"Stok uyarısı: {getattr(product, 'name', 'Ürün')} stoğu yetersiz ({product.available_inventory}).")
        elif product.available_inventory <= (getattr(product, 'reorder_level', 5) or 5):
             warnings.append(f"Stok uyarısı: {getattr(product, 'name', 'Ürün')} kritik seviyede ({product.available_inventory}).")

        # Calculate pricing
        base_price, discount, final_price = _calculate_product_pricing(product, data)

        # Create sale record
        sale, error_response = _create_product_sale_record(patient_id, product.id, base_price, discount, final_price, data, user.tenant_id)
        if error_response:
             return error_response

        # Device assignment
        _create_product_device_assignment(patient_id, product.id, sale.id, base_price, final_price, product, data, user.tenant_id)

        # Inventory update (handles logic for negative stock allow via update_inventory call logic which we fixed)
        _update_product_inventory(product, transaction_id=sale.id, created_by=user.id)

        db.session.commit()

        return jsonify({
            "success": True,
            "sale": sale.to_dict(),
            "message": "Sale created successfully",
            "warnings": warnings 
        }), 201

    except Exception as e:
        import traceback
        try:
             db.session.rollback()
        except:
             pass
        logger.exception('Error creating sale')
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500


@sales_bp.route('/device-assignments/<assignment_id>', methods=['PATCH'])
def update_device_assignment(assignment_id):
    """Update a device assignment (e.g., cancel, update serial numbers, pricing)"""
    try:
        import json
        from models.sales import DeviceAssignment
        
        assignment = db.session.get(DeviceAssignment, assignment_id)
        
        # Log incoming update data
        data = request.get_json()
        logger.info(f"📝 UPDATE DEVICE {assignment_id} PAYLOAD: {json.dumps(data, default=str)}")
        
        if not assignment:
            return jsonify({
                'success': False,
                'error': 'Device assignment not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        data = request.get_json()
        
        # Initialize defaults for bilateral logic
        # Initialize defaults for bilateral logic - will be updated after applying data changes
        initial_ear_val = str(assignment.ear or '').upper()
        quantity = 2 if initial_ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
        
        # Update fields if provided
        # Update fields if provided
        if 'status' in data:
            status_val = data['status']
            assignment.notes = (assignment.notes or '') + f"\n[İptal edildi: {datetime.now().strftime('%Y-%m-%d %H:%M')}]"
            
            # Stock Return Logic
            if status_val in ['cancelled', 'returned'] and assignment.inventory_id:
                from models.inventory import InventoryItem
                inv_item = db.session.get(InventoryItem, assignment.inventory_id)
                if inv_item:
                    # Decide if serial or quantity
                    serial_to_restore = assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right
                    
                    restored = False
                    if serial_to_restore:
                         restored = inv_item.add_serial_number(serial_to_restore)
                    else:
                         # Quantity
                         ear_val = str(assignment.ear or '').lower()
                         qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
                         restored = inv_item.update_inventory(qty)
                    
                    if restored:
                         create_stock_movement(
                            inventory_id=inv_item.id,
                            movement_type="return",
                            quantity=1 if serial_to_restore else qty,
                            tenant_id=inv_item.tenant_id,
                            serial_number=serial_to_restore,
                            transaction_id=assignment.sale_id or assignment.id,
                            created_by=data.get('user_id', 'system'),
                            session=db.session
                         )
        
        if 'ear_side' in data:
            assignment.ear = data['ear_side']
        elif 'ear' in data:
            assignment.ear = data['ear']
        
        if 'reason' in data:
            assignment.reason = data['reason']
        
        # Update device/inventory if changed
        if 'device_id' in data:
            assignment.device_id = data['device_id']
        
        if 'inventory_id' in data:
            assignment.inventory_id = data['inventory_id']
        
        # Update pricing fields
        if 'base_price' in data:
            assignment.list_price = data['base_price']
        
        if 'discount_type' in data:
            assignment.discount_type = data['discount_type']
        
        if 'discount_value' in data:
            assignment.discount_value = data['discount_value']
        
        if 'payment_method' in data:
            assignment.payment_method = data['payment_method']
        
        if 'notes' in data:
            assignment.notes = data['notes']
        
        if 'sgk_scheme' in data:
            assignment.sgk_scheme = data['sgk_scheme']
        elif 'sgkSupportType' in data:
            assignment.sgk_scheme = data['sgkSupportType']
            
        # Report/Delivery/Loaner fields handled later with logic checks
        
        # Recalculate pricing only if pricing fields actually changed (avoid overwrite on save-without-edit)
        pricing_fields = ['base_price', 'discount_type', 'discount_value', 'sgk_scheme', 'sgkSupportType']
        should_recalculate = False
        try:
            for key in pricing_fields:
                if key in data:
                    new_val = data.get(key)
                    # Map request key names to assignment attributes
                    if key == 'base_price':
                        current = float(assignment.list_price or 0)
                        try:
                            incoming = float(new_val)
                        except Exception:
                            incoming = None
                        if incoming is not None and abs(current - incoming) > 0.005:
                            should_recalculate = True
                            break
                    elif key == 'discount_value':
                        current = float(assignment.discount_value or 0)
                        try:
                            incoming = float(new_val or 0)
                        except Exception:
                            incoming = None
                        if incoming is not None and abs(current - incoming) > 0.0001:
                            should_recalculate = True
                            break
                    else:
                        # discount_type or sgk_scheme string comparison
                        if key == 'sgkSupportType' or key == 'sgk_scheme':
                             current = getattr(assignment, 'sgk_scheme', None)
                        else:
                             current = getattr(assignment, 'discount_type', None)
                             
                        if (new_val or None) != (current or None):
                            should_recalculate = True
                            break
        except Exception:
            # Fallback to previous behavior if any unexpected error occurs
            should_recalculate = any(key in data for key in pricing_fields)

        logger.info(f"🔢 Pricing recalculation check: {should_recalculate}, data keys: {list(data.keys())}")
        # If client provided explicit sale_price or patient_payment, prefer those
        explicit_sale_price = None
        explicit_patient_payment = None
        explicit_sgk = None
        if 'sale_price' in data:
            try:
                explicit_sale_price = float(data.get('sale_price'))
            except Exception:
                explicit_sale_price = None
        if 'patient_payment' in data:
            try:
                explicit_patient_payment = float(data.get('patient_payment'))
            except Exception:
                explicit_patient_payment = None
        # Accept sgk_reduction or sgk_support keys from client if present
        if 'sgk_reduction' in data:
            try:
                explicit_sgk = float(data.get('sgk_reduction'))
            except Exception:
                explicit_sgk = None
        elif 'sgkSupport' in data:
            try:
                explicit_sgk = float(data.get('sgkSupport'))
            except Exception:
                explicit_sgk = None

        # If explicit pricing provided, apply selectively and avoid overwriting patient-facing amounts
        if explicit_sale_price is not None or explicit_patient_payment is not None or explicit_sgk is not None:
            from decimal import Decimal
            # Only update sgk_support when an explicit sgk value is provided
            if explicit_sgk is not None:
                assignment.sgk_support = Decimal(str(explicit_sgk))

            # Prefer explicit patient_payment as net_payable when provided
            if explicit_patient_payment is not None:
                assignment.net_payable = Decimal(str(explicit_patient_payment))

            # If only sale_price is provided (e.g., form posts unchanged fields), update per-item sale_price
            # but do NOT overwrite net_payable or sgk_support unless corresponding explicit fields are present.
            if explicit_sale_price is not None:
                assignment.sale_price = Decimal(str(explicit_sale_price))

            logger.info(f"✅ Selectively applied explicit pricing from request: sale_price={explicit_sale_price}, patient_payment={explicit_patient_payment}, sgk={explicit_sgk}")
        elif should_recalculate:


            
            list_price = float(assignment.list_price or 0)
            logger.info(f"💰 Starting pricing calculation: list_price={list_price}, sgk_scheme={assignment.sgk_scheme}")
            
            # Load SGK amounts from settings
            settings_path = os.path.join(os.path.dirname(__file__), '..', 'current_settings.json')
            sgk_amounts = {}
            try:
                with open(settings_path, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    sgk_config = settings.get('data', {}).get('sgk', {}).get('schemes', {})
                    for scheme_key, scheme_data in sgk_config.items():
                        if 'coverage_amount' in scheme_data:
                            sgk_amounts[scheme_key] = float(scheme_data['coverage_amount'])
            except Exception as e:
                logger.error(f"Failed to load SGK amounts from settings: {e}")
                # Fallback to hardcoded values if settings file not found
                sgk_amounts = {
                    'under4_parent_working': 6104.44,
                    'under4_parent_retired': 7630.56,
                    'age5_12_parent_working': 5426.17,
                    'age5_12_parent_retired': 6782.72,
                    'age13_18_parent_working': 5087.04,
                    'age13_18_parent_retired': 6358.88,
                    'over18_working': 3391.36,
                    'over18_retired': 4239.20
                }
            
            # Calculate SGK support (per ear)
            sgk_support_per_ear = 0
            if assignment.sgk_scheme and assignment.sgk_scheme != 'no_coverage':
                sgk_support_per_ear = sgk_amounts.get(assignment.sgk_scheme, 0)
                sgk_support_per_ear = min(sgk_support_per_ear, list_price)  # SGK can't be more than list price
            
            # Apply discount on price after SGK
            price_after_sgk = list_price - sgk_support_per_ear
            discount_amount = 0
            if assignment.discount_type == 'percentage' and assignment.discount_value:
                try:
                    discount_amount = (price_after_sgk * float(assignment.discount_value)) / 100
                except (ValueError, TypeError):
                    discount_amount = 0
            elif assignment.discount_type == 'amount' and assignment.discount_value:
                try:
                    discount_amount = float(assignment.discount_value)
                except (ValueError, TypeError):
                    discount_amount = 0
            
            # Re-calculate quantity after applying ear updates
            ear_val = str(assignment.ear or '').upper()
            quantity = 2 if ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
            
            sale_price = max(0, price_after_sgk - discount_amount)
            
            # Handle bilateral (x2) - quantity affects net_payable only
            net_payable = sale_price * quantity
            
            # Update calculated fields - store per-ear amounts (per-unit storage)
            assignment.sgk_support = Decimal(str(sgk_support_per_ear))
            assignment.sale_price = Decimal(str(sale_price))
            assignment.net_payable = Decimal(str(net_payable))
            
            logger.info(f"✅ Pricing calculated: sgk_support={sgk_support_per_ear}, sale_price={sale_price}, net_payable={net_payable}, qty={quantity}")
        
        if assignment.sale_id:
            try:
                from models.sales import Sale, PaymentRecord
                sale = db.session.get(Sale, assignment.sale_id)
                if sale:
                    # Sync down payment
                    if 'down_payment' in data:
                        try:
                            down_val = float(data.get('down_payment', 0))
                            if down_val >= 0:
                                sale.paid_amount = down_val
                                
                                # Create or Update PaymentRecord for Down Payment
                                payment = PaymentRecord.query.filter_by(
                                    sale_id=sale.id, 
                                    payment_type='down_payment'
                                ).first()
                                
                                if payment:
                                    payment.amount = Decimal(str(down_val))
                                    payment.updated_at = now_utc()
                                    logger.info(f"✅ Updated existing down payment record: {payment.id} -> {down_val}")
                                else:
                                    if down_val > 0:
                                        payment = PaymentRecord(
                                            tenant_id=sale.tenant_id,
                                            branch_id=sale.branch_id,
                                            patient_id=sale.patient_id,
                                            sale_id=sale.id,
                                            amount=Decimal(str(down_val)),
                                            payment_date=now_utc(),
                                            payment_method=assignment.payment_method or 'cash',
                                            payment_type='down_payment',
                                            status='paid',
                                            notes='Peşinat (Cihaz Düzenleme)'
                                        )
                                        db.session.add(payment)
                                        logger.info(f"✅ Created new down payment record for: {down_val}")

                        except Exception as e:
                            logger.error(f"Failed to sync down payment: {e}")

                    # Correct synchronization: Sum all assignments for this sale to avoid overwriting bilateral data
                    from models.sales import DeviceAssignment
                    all_assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
                    
                    total_list = 0.0
                    total_final = 0.0
                    total_sgk = 0.0
                    
                    for a in all_assignments:
                        # Determine quantity for this assignment
                        a_ear = str(a.ear or '').upper()
                        a_qty = 2 if a_ear in ['B', 'BOTH', 'BILATERAL'] else 1
                        
                        total_list += float(a.list_price or 0) * a_qty
                        total_final += float(a.net_payable or 0)
                        total_sgk += float(a.sgk_support or 0) * a_qty
                    
                    # Update sale totals
                    sale.total_amount = total_list
                    sale.final_amount = total_final
                    sale.sgk_coverage = total_sgk
                    
                    # Correct discount amount for Sale: Total List - SGK - Net Payable
                    sale.discount_amount = max(0, float(sale.total_amount or 0) - float(sale.sgk_coverage or 0) - float(sale.final_amount or 0))
                    
                    # Ensure positive values
                    sale.sgk_coverage = max(0, sale.sgk_coverage)
                    sale.final_amount = max(0, sale.final_amount)

                    db.session.add(sale)
                    logger.info(f"🔄 Synced Sale {sale.id}: List={sale.total_amount}, Net={sale.final_amount}, SGK={sale.sgk_coverage}, Discount={sale.discount_amount}")
            except Exception as e:
                logger.warning(f"Failed to sync sale record: {e}")
        
        # Update serial numbers
        if 'serial_number' in data:
            assignment.serial_number = data['serial_number']
        
        if 'serial_number_left' in data:
            assignment.serial_number_left = data['serial_number_left']
        
        if 'serial_number_right' in data:
            assignment.serial_number_right = data['serial_number_right']
        
        # Handle delivery status changes
        if 'delivery_status' in data or 'deliveryStatus' in data:
            new_delivery_status = data.get('delivery_status') or data.get('deliveryStatus')
            old_delivery_status = assignment.delivery_status
            
            # If changing from pending to delivered, decrease stock
            if old_delivery_status != 'delivered' and new_delivery_status == 'delivered':
                if assignment.inventory_id:
                    from models.inventory import InventoryItem
                    inv_item = db.session.get(InventoryItem, assignment.inventory_id)
                    if inv_item:
                        # Determine quantity based on ear
                        ear_val = str(assignment.ear or '').upper()
                        qty = 2 if ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
                        
                        # Decrease stock
                        if not inv_item.update_inventory(-qty, allow_negative=False):
                            return jsonify({'success': False, 'error': f'Stok yetersiz! Mevcut stok: {inv_item.available_inventory}'}), 400
                        
                        create_stock_movement(
                            inventory_id=inv_item.id,
                            movement_type="delivery",
                            quantity=-qty,
                            tenant_id=inv_item.tenant_id,
                            serial_number=assignment.serial_number,
                            transaction_id=assignment.sale_id or assignment.id,
                            created_by=data.get('user_id', 'system'),
                            session=db.session
                        )
                        logger.info(f"📦 Delivery status changed to delivered - stock decreased by {qty}")
            
            assignment.delivery_status = new_delivery_status
        
        # Handle report status updates
        if 'report_status' in data or 'reportStatus' in data:
            assignment.report_status = data.get('report_status') or data.get('reportStatus')
        
        # Handle loaner device management
        if 'is_loaner' in data or 'isLoaner' in data:
            new_is_loaner = data.get('is_loaner') or data.get('isLoaner')
            old_is_loaner = assignment.is_loaner
            
            # If adding loaner device
            if not old_is_loaner and new_is_loaner:
                loaner_inventory_id = data.get('loaner_inventory_id') or data.get('loanerInventoryId')
                
                if loaner_inventory_id:
                    from models.inventory import InventoryItem
                    loaner_item = db.session.get(InventoryItem, loaner_inventory_id)
                    
                    if loaner_item:
                        # 1. Update assignment with loaner info FIRST so helper can access it
                        assignment.is_loaner = True
                        assignment.loaner_inventory_id = loaner_item.id
                        assignment.loaner_brand = loaner_item.brand
                        assignment.loaner_model = loaner_item.model
                        
                        # Determine if bilateral
                        ear_val = str(assignment.ear or '').lower()
                        is_bilateral = ear_val in ['both', 'bilateral', 'b']

                        if is_bilateral:
                            assignment.loaner_serial_number_left = data.get('loaner_serial_number_left') or data.get('loanerSerialNumberLeft')
                            assignment.loaner_serial_number_right = data.get('loaner_serial_number_right') or data.get('loanerSerialNumberRight')
                        else:
                            assignment.loaner_serial_number = data.get('loaner_serial_number') or data.get('loanerSerialNumber')

                        # 2. Ensure manual serials are in inventory
                        _ensure_loaner_serials_in_inventory(assignment, data.get('user_id', 'system'))
                        
                        # 3. Process stock deduction
                        # FIX: Calculate exact quantity needed
                        qty_needed = 2 if is_bilateral else 1
                        
                        serials_to_process = []
                        if is_bilateral:
                            s_left = assignment.loaner_serial_number_left
                            s_right = assignment.loaner_serial_number_right
                            if s_left: serials_to_process.append(s_left)
                            if s_right: serials_to_process.append(s_right)
                            # If bilateral but no serials, we need to deduct 2 counts
                            # If bilateral and 1 serial (e.g. only left entered), we deduct 1 serial + 1 count?
                            # User says "loaner device... 1 device drop for each ear"
                            # So we target 2 items total.
                        else:
                            if assignment.loaner_serial_number:
                                serials_to_process.append(assignment.loaner_serial_number)
                                
                        # Deduct based on serials first
                        deducted_count = 0
                        consumed_serials = []
                        for s in serials_to_process:
                             if s and loaner_item.remove_serial_number(s):
                                 deducted_count += 1
                                 consumed_serials.append(s)
                        
                        # Deduct remaining count from anonymous stock
                        remaining_to_deduct = qty_needed - deducted_count
                        if remaining_to_deduct > 0:
                            loaner_item.update_inventory(-remaining_to_deduct, allow_negative=True)
                            
                        # Log movement
                        create_stock_movement(
                            inventory_id=loaner_item.id,
                            movement_type="loaner_out",
                            quantity=-qty_needed,
                            tenant_id=loaner_item.tenant_id,
                            serial_number=",".join(consumed_serials) if consumed_serials else None,
                            transaction_id=assignment.id,
                            created_by=data.get('user_id', 'system'),
                            session=db.session
                        )
                        logger.info(f"🔄 Loaner device assigned: {loaner_item.name} (Bilateral: {is_bilateral}, Qty: {qty_needed})")
                        consumed_count = 0
                        for serial_to_assign in serials_to_process:
                             # Decrease loaner stock (try removing serial first, else just quantity)
                             stock_updated = False
                             if serial_to_assign:
                                  stock_updated = loaner_item.remove_serial_number(serial_to_assign)
                                  if stock_updated:
                                      consumed_count += 1
                             
                             # If not removed (maybe not in list or no serial provided), check if we need to decrement count manually
                             if not stock_updated:
                                  # Only decrement if not already done by remove_serial_number
                                  if not loaner_item.update_inventory(-1, allow_negative=False):
                                       return jsonify({'success': False, 'error': f'Emanet cihaz stoğu yetersiz! Mevcut stok: {loaner_item.available_inventory}'}), 400
                             
                             create_stock_movement(
                                 inventory_id=loaner_item.id,
                                 movement_type="loaner_out",
                                 quantity=-1,
                                 tenant_id=loaner_item.tenant_id,
                                 serial_number=serial_to_assign,
                                 transaction_id=assignment.id,
                                 created_by=data.get('user_id', 'system'),
                                 session=db.session
                             )
                        
                        logger.info(f"🔄 Loaner device assigned: {loaner_item.brand} {loaner_item.model} (Bilateral: {is_bilateral})")
                else:
                    # Manual assignment without inventory link
                    assignment.is_loaner = True
                    # Fields will be updated in the common block below
            
            # If removing loaner device (returning to stock)
            elif old_is_loaner and not new_is_loaner:
                if assignment.loaner_inventory_id:
                    from models.inventory import InventoryItem
                    loaner_item = db.session.get(InventoryItem, assignment.loaner_inventory_id)
                    
                    if loaner_item:
                        # Return loaner to stock
                        loaner_item.update_inventory(1)
                        
                        create_stock_movement(
                            inventory_id=loaner_item.id,
                            movement_type="loaner_return",
                            quantity=1,
                            tenant_id=loaner_item.tenant_id,
                            serial_number=assignment.loaner_serial_number,
                            transaction_id=assignment.id,
                            created_by=data.get('user_id', 'system'),
                            session=db.session
                        )
                        
                        logger.info(f"↩️ Loaner device returned to stock: {loaner_item.brand} {loaner_item.model}")
                
                # Clear loaner fields
                assignment.is_loaner = False
                assignment.loaner_inventory_id = None
                assignment.loaner_serial_number = None
                assignment.loaner_brand = None
                assignment.loaner_model = None

        # Allow updating individual loaner fields if loaner is already set or just set
        if assignment.is_loaner:
            # Handle camelCase and snake_case for all loaner fields from frontend
            if 'loaner_serial_number' in data:
                 assignment.loaner_serial_number = data['loaner_serial_number']
            elif 'loanerSerialNumber' in data:
                 assignment.loaner_serial_number = data['loanerSerialNumber']
            
            if 'loaner_brand' in data:
                 assignment.loaner_brand = data['loaner_brand']
            elif 'loanerBrand' in data:
                 assignment.loaner_brand = data['loanerBrand']

            if 'loaner_model' in data:
                 assignment.loaner_model = data['loaner_model']
            elif 'loanerModel' in data:
                 assignment.loaner_model = data['loanerModel']

            # Handle bilateral serials update
            if 'loaner_serial_number_left' in data:
                 assignment.loaner_serial_number_left = data['loaner_serial_number_left']
            elif 'loanerSerialNumberLeft' in data:
                 assignment.loaner_serial_number_left = data['loanerSerialNumberLeft']
            
            if 'loaner_serial_number_right' in data:
                 assignment.loaner_serial_number_right = data['loaner_serial_number_right']
            elif 'loanerSerialNumberRight' in data:
                 assignment.loaner_serial_number_right = data['loanerSerialNumberRight']
                             
            # Ensure manual serials are in inventory if changed
            if assignment.loaner_inventory_id:
                _ensure_loaner_serials_in_inventory(assignment, data.get('user_id', 'system'))

            if 'loaner_inventory_id' in data:
                 assignment.loaner_inventory_id = data['loaner_inventory_id']
            elif 'loanerInventoryId' in data:
                 assignment.loaner_inventory_id = data['loanerInventoryId']
        
        logger.info(f"💾 COMMITTING UPDATE {assignment_id}: Report={assignment.report_status}, Delivery={assignment.delivery_status}, Loaner={assignment.is_loaner}, L={assignment.loaner_serial_number_left}, R={assignment.loaner_serial_number_right}")
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device assignment updated successfully',
            'data': assignment.to_dict(),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device assignment error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@sales_bp.route('/patients/<patient_id>/assign-devices-extended', methods=['POST'])
@idempotent(methods=['POST'])
def assign_devices_extended(patient_id):
    """Assign devices to patient with extended sale record creation."""
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

        device_assignments = data.get('device_assignments', [])
        if not device_assignments:
            return jsonify({"success": False, "error": "At least one device assignment required", "timestamp": datetime.now().isoformat()}), 400

        # Continue with the rest of the function...
        return _assign_devices_extended_impl(patient_id, data)
    except Exception as e:
        db.session.rollback()
        import traceback
        with open("last_error.txt", "w") as f:
            f.write(traceback.format_exc())
            f.write(f"\nError: {str(e)}")
        logger.error(f"Extended device assignment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


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


def _create_sale_record(patient_id, pricing_calculation, paid_amount, payment_plan_type, tenant_id, branch_id=None):
    """Create sale record with pricing data."""
    # Generate tenant-specific sale ID
    from models.base import gen_sale_id
    sale_id = gen_sale_id(tenant_id=tenant_id)
    
    sale = Sale(
        id=sale_id,
        tenant_id=tenant_id,
        branch_id=branch_id,
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
                "INSERT INTO sales (id, tenant_id, patient_id, product_id, sale_date, list_price_total, total_amount, discount_amount, final_amount, paid_amount, payment_method, status, sgk_coverage, patient_payment, notes, created_at, updated_at) VALUES (:id, :tenant_id, :patient_id, :product_id, :sale_date, :list_price_total, :total_amount, :discount_amount, :final_amount, :paid_amount, :payment_method, :status, :sgk_coverage, :patient_payment, :notes, :created_at, :updated_at)"
            )
            now = datetime.now()
            params = {
                'id': sale_id,
                'tenant_id': tenant_id,
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
            return None, (jsonify({"success": False, "error": str(raw_err)}), 500)


def _create_single_device_assignment(assignment_data, patient_id, sale_id, sgk_scheme, pricing_calculation, index=0, tenant_id=None, branch_id=None, created_by=None):
    """Create a single device assignment."""
    inventory_id = assignment_data.get('inventoryId')
    
    # Initialize variables
    inventory_item = None
    virtual_device = None
    warning = None
    
    if inventory_id:
        from models.inventory import InventoryItem
        inventory_item = db.session.get(InventoryItem, inventory_id)
        if not inventory_item:
            return None, f"Inventory item not found: {inventory_id}", None
    else:
        # Check for manual assignment data
        manual_brand = assignment_data.get('manualBrand')
        manual_model = assignment_data.get('manualModel')
        
        if manual_brand and manual_model:
            # Create a virtual device for tracking
            from models.device import Device
            virtual_device = Device(
                tenant_id=tenant_id,
                patient_id=patient_id,
                brand=manual_brand,
                model=manual_model,
                device_type='HEARING_AID', # Default
                status='ASSIGNED',
                ear=assignment_data.get('ear_side') or assignment_data.get('ear') or 'LEFT',
                serial_number=assignment_data.get('serial_number') or assignment_data.get('serialNumber'),
                notes="Manually assigned device"
            )
            db.session.add(virtual_device)
            db.session.flush() # Get ID
        else:
             return None, "Inventory ID or Manual Brand/Model required for assignment", None

    # Accept both snake_case and camelCase keys from clients
    base_price = float(
        assignment_data.get('base_price')
        if 'base_price' in assignment_data
        else assignment_data.get('basePrice', (inventory_item.price if inventory_item else 0) or 0)
    )
    discount_type = assignment_data.get('discount_type') if 'discount_type' in assignment_data else assignment_data.get('discountType')
    discount_value = float(
        assignment_data.get('discount_value')
        if 'discount_value' in assignment_data
        else assignment_data.get('discountValue', 0) or 0
    )

    # Allow client to specify explicit pricing values. Accept camelCase and snake_case.
    explicit_sale_price = None
    if 'sale_price' in assignment_data:
        explicit_sale_price = assignment_data.get('sale_price')
    elif 'salePrice' in assignment_data:
        explicit_sale_price = assignment_data.get('salePrice')

    explicit_patient_payment = None
    if 'patient_payment' in assignment_data:
        explicit_patient_payment = assignment_data.get('patient_payment')
    elif 'patientPayment' in assignment_data:
        explicit_patient_payment = assignment_data.get('patientPayment')

    explicit_sgk = None
    if 'sgk_reduction' in assignment_data:
        explicit_sgk = assignment_data.get('sgk_reduction')
    elif 'sgk_support' in assignment_data:
        explicit_sgk = assignment_data.get('sgk_support')
    elif 'sgkSupport' in assignment_data:
        explicit_sgk = assignment_data.get('sgkSupport')

    # Prefer per-item details from pricing_calculation if available (contains per-unit sale_price and sgk_support)
    per_item_list = pricing_calculation.get('per_item', []) if isinstance(pricing_calculation, dict) else []
    sgk_support = None
    final_sale_price = None
    if per_item_list and index < len(per_item_list):
        try:
            per = per_item_list[index]
            if per.get('sgk_support') is not None:
                sgk_support = float(per.get('sgk_support'))
            if per.get('sale_price') is not None:
                final_sale_price = float(per.get('sale_price'))
        except Exception:
            sgk_support = None
            final_sale_price = None

    # Use pricing_calculation per-item SGK support average as fallback
    if sgk_support is None:
        try:
            sgk_support = float(pricing_calculation.get('sgk_coverage_amount_per_item', 0))
        except Exception:
            sgk_support = 0

    # If explicit sale_price provided, prefer it (client override) otherwise compute if missing
    if explicit_sale_price is not None:
        try:
            final_sale_price = float(explicit_sale_price)
        except Exception:
            final_sale_price = final_sale_price
    if final_sale_price is None:
        # Apply SGK first (coverage reduces the price) then apply discount on the remaining amount
        price_after_sgk = max(0.0, base_price - float(sgk_support or 0))

        if discount_type == 'percentage':
            discount_amount = price_after_sgk * (discount_value / 100.0)
        else:
            discount_amount = float(discount_value or 0)

        # Final per-item sale price (after SGK and discount)
        final_sale_price = max(0.0, price_after_sgk - discount_amount)

    # For net_payable: prefer explicit_patient_payment if provided, otherwise final_sale_price
    if explicit_patient_payment is not None:
        try:
            net_payable = float(explicit_patient_payment)
        except Exception:
            net_payable = final_sale_price
    else:
        net_payable = final_sale_price

    logger.info(f"🆕 CREATING ASSIGNMENT: report={assignment_data.get('reportStatus')}, delivery={assignment_data.get('deliveryStatus')}")
    
    assignment = DeviceAssignment(
        tenant_id=tenant_id,
        branch_id=branch_id,
        patient_id=patient_id,
        device_id=virtual_device.id if virtual_device else inventory_id,
        sale_id=sale_id,
        ear=assignment_data.get('ear_side') or assignment_data.get('ear') or 'both',
        reason=assignment_data.get('reason', 'Sale'),
        from_inventory=(inventory_item is not None),
        inventory_id=inventory_id,
        list_price=base_price,
        sale_price=final_sale_price,
        sgk_scheme=sgk_scheme,
        sgk_support=sgk_support,
        discount_type=discount_type,
        discount_value=discount_value,
        net_payable=net_payable,
        payment_method=assignment_data.get('payment_method', 'cash'),
        notes=assignment_data.get('notes', ''),
        serial_number=assignment_data.get('serial_number') or assignment_data.get('serialNumber'),
        serial_number_left=assignment_data.get('serial_number_left') or assignment_data.get('serialNumberLeft'),
        serial_number_right=assignment_data.get('serial_number_right') or assignment_data.get('serialNumberRight'),
        
        # New Report & Delivery Fields
        report_status=assignment_data.get('reportStatus') or assignment_data.get('report_status'),
        delivery_status=assignment_data.get('deliveryStatus') or assignment_data.get('delivery_status') or 'pending',
        
        # Loaner Device Fields
        is_loaner=assignment_data.get('isLoaner') or assignment_data.get('is_loaner') or False,
        loaner_inventory_id=assignment_data.get('loanerInventoryId') or assignment_data.get('loaner_inventory_id'),
        loaner_serial_number=assignment_data.get('loanerSerialNumber') or assignment_data.get('loaner_serial_number'),
        loaner_serial_number_left=assignment_data.get('loanerSerialNumberLeft') or assignment_data.get('loaner_serial_number_left'),
        loaner_serial_number_right=assignment_data.get('loanerSerialNumberRight') or assignment_data.get('loaner_serial_number_right'),
        loaner_brand=assignment_data.get('loanerBrand') or assignment_data.get('loaner_brand'),
        loaner_model=assignment_data.get('loanerModel') or assignment_data.get('loaner_model'),
        
        # Generate generic Assignment UID
        assignment_uid=f"ATM-{uuid4().hex[:6].upper()}"
    )

    db.session.add(assignment)
    db.session.flush()

    # Stock Movement and Inventory Deduction
    # ONLY deduct if delivery status is 'delivered'. 
    # Otherwise, it's just an assignment (reservation logic could be added here if needed, but per user request "only delivered drops stock")
    if str(assignment.delivery_status) == 'delivered':
        assigned_serial = assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right
        
        if assigned_serial:
            # Serialized item: remove serial number
            # Auto-register manual serial numbers per user request
            if inventory_item:
                current_serials = inventory_item.get_serial_numbers()
                if assigned_serial not in current_serials:
                    # If manual serial not in stock, add it first so we can track it properly
                    inventory_item.add_serial_numbers([assigned_serial])
                    db.session.flush()

            if inventory_item.remove_serial_number(assigned_serial):
                create_stock_movement(
                    inventory_id=inventory_item.id,
                    movement_type="sale",
                    quantity=-1,
                    tenant_id=inventory_item.tenant_id,
                    serial_number=assigned_serial,
                    transaction_id=sale_id,
                    created_by=created_by,
                    session=db.session
                )
        else:
            # Non-serialized item: deduct quantity based on ear configuration
            ear_val = str(assignment.ear or '').lower()
            qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
            
            # Pass allow_negative=True to permit assignment even if stock is insufficient
            inventory_item.update_inventory(-qty, allow_negative=True)
            
            create_stock_movement(
                inventory_id=inventory_item.id,
                movement_type="sale",
                quantity=-qty,
                tenant_id=inventory_item.tenant_id,
                serial_number=None,
                transaction_id=sale_id,
                created_by=created_by,
                session=db.session
            )

            if inventory_item.available_inventory < 0:
                warning = f"Stok yetersiz ({inventory_item.available_inventory}). Satış yine de gerçekleştirildi."

    # --- LOANER DEVICE TRACKING LOGIC ---
    if assignment.is_loaner and assignment.loaner_inventory_id:
        try:
            # First, ensure any manual serial numbers are added to the inventory master list
            # This handles the case where a user types a new serial number for a loaner
            _ensure_loaner_serials_in_inventory(assignment, created_by)

            from models.inventory import InventoryItem
            loaner_item = db.session.get(InventoryItem, assignment.loaner_inventory_id)
            if loaner_item:
                # Determine quantity and serials
                ear_val = str(assignment.ear or '').lower()
                qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
                
                loaner_serials = []
                if assignment.loaner_serial_number: loaner_serials.append(assignment.loaner_serial_number)
                if assignment.loaner_serial_number_left: loaner_serials.append(assignment.loaner_serial_number_left)
                if assignment.loaner_serial_number_right: loaner_serials.append(assignment.loaner_serial_number_right)

                # Deduct stock and log movement
                # If serials provided, consume them. 
                # Note: The UI might send 'manual' serials not in the list.
                # Logic: If serial exists in available_serials, remove it. If not, just deduct count (assuming manual entry was 'found' or 'added' physically).
                # Actually, per user request: "if user inputs serial no... add it to inventory... then mark used".
                # Simplify: Just try to remove. If generic count, deduct count.
                
                # Deduct stock and log movement
                # Logic: If serial exists in available_serials, remove it (which updates count). 
                # If not, just deduct count (assuming manual entry was 'found' or 'added' physically).
                
                consumed_serials = []
                # First try to consume specific serials
                for s in loaner_serials:
                    if s and s != 'null' and s != '-':
                        if loaner_item.remove_serial_number(s):
                            consumed_serials.append(s)
                
                # If we consumed serials, the inventory count is auto-updated by remove_serial_number.
                # If we did NOT consume enough serials (e.g. manual entry that wasn't added to list, or non-serial tracking),
                # we might need to deduct remaining quantity.
                # However, our new helper _ensure_loaner_serials_in_inventory ensures they ARE in the list.
                # So usually consumed_serials count matches qty.
                
                remaining_qty_to_deduct = qty - len(consumed_serials)
                if remaining_qty_to_deduct > 0:
                     loaner_item.update_inventory(-remaining_qty_to_deduct, allow_negative=True)
                
                # Log movement
                create_stock_movement(
                    inventory_id=loaner_item.id,
                    movement_type="loaner_out",
                    quantity=-qty,
                    tenant_id=loaner_item.tenant_id,
                    serial_number=','.join(consumed_serials) if consumed_serials else (loaner_serials[0] if loaner_serials else None),
                    transaction_id=assignment.id, # Link to assignment, not sale, tracking specific loan event
                    created_by=created_by,
                    session=db.session
                )
        except Exception as e:
            logger.error(f"Error tracking loaner stock for assignment {assignment.id}: {e}")
            # Do not fail the sale for loaner tracking error


    return assignment, None, warning


def _ensure_loaner_serials_in_inventory(assignment, created_by='system'):
    """
    Ensure that any manually entered loaner serial numbers are added to the inventory.
    This supports the workflow where a user enters a serial number for a loaner device
    that hasn't been explicitly added to the system yet.
    """
    if not assignment.loaner_inventory_id:
        return

    try:
        from models.inventory import InventoryItem
        loaner_item = db.session.get(InventoryItem, assignment.loaner_inventory_id)
        if not loaner_item:
            return

        # Collect all serials from assignment
        serials_to_check = []
        if assignment.loaner_serial_number: 
            serials_to_check.append(assignment.loaner_serial_number)
        if hasattr(assignment, 'loaner_serial_number_left') and assignment.loaner_serial_number_left: 
            serials_to_check.append(assignment.loaner_serial_number_left)
        if hasattr(assignment, 'loaner_serial_number_right') and assignment.loaner_serial_number_right: 
            serials_to_check.append(assignment.loaner_serial_number_right)
        
        # Filter out empty or invalid values
        serials_to_check = [s for s in serials_to_check if s and str(s).lower() not in ['null', 'none', '-', '']]
        
        if not serials_to_check:
            return

        added_some = False
        current_serials = json.loads(loaner_item.available_serials) if loaner_item.available_serials else []
        
        for serial in serials_to_check:
            if serial not in current_serials:
                # Add to inventory
                if loaner_item.add_serial_number(serial):
                    added_some = True
                    # Log movement for audit
                    create_stock_movement(
                        inventory_id=loaner_item.id,
                        movement_type="manual_add", # Or "adjustment_in"
                        quantity=1,
                        tenant_id=loaner_item.tenant_id,
                        serial_number=serial,
                        transaction_id=assignment.id,
                        created_by=created_by,
                        session=db.session
                    )
        
        if added_some:
            # We must commit/flush here so that subsequent remove_serial_number calls work?
            # Actually, add_serial_number checks self.available_serials which is updated in memory.
            logger.info(f"Auto-added manual loaner serials to inventory {loaner_item.id}: {serials_to_check}")

    except Exception as e:
        logger.error(f"Error ensuring loaner serials in inventory: {e}")


def _create_device_assignments(device_assignments, patient_id, sale, sgk_scheme, pricing_calculation, tenant_id, branch_id=None, created_by=None):
    """Create all device assignments for a sale."""
    created_assignment_ids = []
    warnings = []

    for i, assignment_data in enumerate(device_assignments):
        assignment, error, warning = _create_single_device_assignment(assignment_data, patient_id, sale.id, sgk_scheme, pricing_calculation, i, tenant_id, branch_id, created_by=created_by)
        if error:
            db.session.rollback()
            return None, jsonify({"success": False, "error": error, "timestamp": datetime.now().isoformat()}), 400, []

        if warning:
            warnings.append(warning)

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

    return created_assignment_ids, None, None, warnings


def _setup_payment_plan(payment_plan_type, sale_id, pricing_calculation, settings, tenant_id, branch_id=None):
    """Create payment plan if needed."""
    if payment_plan_type != 'cash':
        payment_plan = create_payment_plan(sale_id, payment_plan_type, pricing_calculation['patient_responsible_amount'], settings, tenant_id, branch_id)
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


def _assign_devices_extended_impl(patient_id, data):
    """Implementation of device assignment with extended sale record."""
    try:
        # Validate input
        data, error_response, status_code = _validate_assignment_input(data)
        if error_response:
            return error_response, status_code

        # Load settings and validate patient
        patient, settings, error_response, status_code = _load_settings_and_patient(patient_id)
        if error_response:
            return error_response, status_code

        device_assignments = data.get('device_assignments', [])
        sgk_scheme = data.get('sgk_scheme', settings.get('sgk', {}).get('default_scheme', 'standard'))
        payment_plan_type = data.get('payment_plan', 'cash')
        branch_id = data.get('branchId')
        accessories = data.get('accessories', [])
        services = data.get('services', [])

        # Build a sanitized assignments payload for server-side calculation (ignore client explicit sale_price/patient_payment)
        sanitized_assignments = []
        for a in device_assignments:
            sanitized_assignments.append({
                'inventoryId': a.get('inventoryId'),
                'base_price': a.get('base_price') if 'base_price' in a else a.get('basePrice'),
                'discount_type': a.get('discount_type') if 'discount_type' in a else a.get('discountType'),
                'discount_value': a.get('discount_value') if 'discount_value' in a else a.get('discountValue'),
                'sgk_scheme': a.get('sgk_scheme') if 'sgk_scheme' in a else a.get('sgkScheme'),
                # Preserve ear/ear_side so pricing can account for bilateral (quantity)
                'ear': a.get('ear') if 'ear' in a else a.get('ear_side') if 'ear_side' in a else a.get('earSide')
            })

        # Server computes canonical pricing based on sanitized inputs
        server_pricing = calculate_device_pricing(
            device_assignments=sanitized_assignments,
            accessories=accessories,
            services=services,
            sgk_scheme=sgk_scheme,
            settings=settings
        )

        # Validate client-submitted explicit pricing if any
        # Tolerance (allow small rounding differences)
        EPSILON = float(settings.get('pricing', {}).get('tolerance', 0.01))

        mismatches = []
        # Build base_total to distribute discounts proportionally (same logic as calculate_device_pricing)
        base_total = 0.0
        per_item_list = []
        for a in sanitized_assignments:
            lp = float(a.get('base_price') or 0)
            per_item_list.append(lp)
            base_total += lp

        total_discount = float(server_pricing.get('total_discount', 0.0))
        per_item_sgk_list = server_pricing.get('sgk_coverage_amount_per_item_list', [])

        for idx, a in enumerate(device_assignments):
            # client provided values (if any)
            client_sp = None
            client_pp = None
            if 'sale_price' in a:
                try:
                    client_sp = float(a.get('sale_price'))
                except Exception:
                    client_sp = None
            elif 'salePrice' in a:
                try:
                    client_sp = float(a.get('salePrice'))
                except Exception:
                    client_sp = None

            if 'patient_payment' in a:
                try:
                    client_pp = float(a.get('patient_payment'))
                except Exception:
                    client_pp = None
            elif 'patientPayment' in a:
                try:
                    client_pp = float(a.get('patientPayment'))
                except Exception:
                    client_pp = None

            # Compute expected per-assignment sale price and patient payment according to server rules
            list_price = float(per_item_list[idx] if idx < len(per_item_list) else 0.0)
            proportional_share = (list_price / base_total) if base_total > 0 else 0.0
            assignment_discount_share = total_discount * proportional_share
            expected_sale_price = max(0.0, list_price - assignment_discount_share)

            expected_sgk = float(per_item_sgk_list[idx]) if (per_item_sgk_list and idx < len(per_item_sgk_list)) else float(server_pricing.get('sgk_coverage_amount_per_item', 0.0))
            # SGK cannot exceed expected_sale_price
            expected_sgk = min(expected_sgk, expected_sale_price)

            expected_patient_payment = round(max(expected_sale_price - expected_sgk, 0.0), 2)
            expected_sale_price = round(expected_sale_price, 2)

            # Build alternate plausible calculations so backend accepts any correct variant
            alternate_expected_values = []

            # 1) Server canonical (already computed)
            alternate_expected_values.append({
                'label': 'server_canonical',
                'sale_price': expected_sale_price,
                'patient_payment': expected_patient_payment
            })

            # 2) No discount (apply only SGK)
            no_discount_sale = round(max(0.0, list_price - expected_sgk), 2)
            alternate_expected_values.append({
                'label': 'no_discount',
                'sale_price': no_discount_sale,
                'patient_payment': round(max(0.0, no_discount_sale - expected_sgk), 2)
            })

            # 3) No SGK (apply only discount)
            if assignment_discount_share:
                no_sgk_sale = round(max(0.0, list_price - assignment_discount_share), 2)
            else:
                no_sgk_sale = round(list_price, 2)
            alternate_expected_values.append({
                'label': 'no_sgk',
                'sale_price': no_sgk_sale,
                'patient_payment': round(max(0.0, no_sgk_sale - 0.0), 2)
            })

            # 4) Discount before SGK (discount reduces base price first, then SGK applied to remaining)
            if assignment_discount_share:
                price_after_discount = max(0.0, list_price - assignment_discount_share)
                # SGK limited to remaining amount
                sgk_after_discount = min(expected_sgk, price_after_discount)
                discount_before_sgk_sale = round(max(0.0, price_after_discount - 0.0), 2)
                discount_before_sgk_patient = round(max(0.0, discount_before_sgk_sale - sgk_after_discount), 2)
                alternate_expected_values.append({
                    'label': 'discount_before_sgk',
                    'sale_price': discount_before_sgk_sale,
                    'patient_payment': discount_before_sgk_patient
                })

            # 5) Per-item fallback values from server_pricing detail (if present)
            per_item_detail = server_pricing.get('per_item', []) if isinstance(server_pricing, dict) else []
            if per_item_detail and idx < len(per_item_detail):
                try:
                    detail = per_item_detail[idx]
                    detail_sp = round(float(detail.get('sale_price', detail.get('salePrice', expected_sale_price))), 2)
                    detail_pp = round(float(detail.get('patient_payment', detail.get('patientPayment', expected_patient_payment))), 2)
                    alternate_expected_values.append({
                        'label': 'per_item_detail',
                        'sale_price': detail_sp,
                        'patient_payment': detail_pp
                    })
                except Exception:
                    pass

            # Determine assignment quantity (bilateral handling)
            ear_val = (a.get('ear') or a.get('ear_side') or a.get('earSide') or '').lower()
            quantity = 2 if (str(ear_val).startswith('b') or ear_val in ('both', 'bilateral')) else 1

            # Now check whether client values match any of the alternate expected values within EPSILON
            def matches_any(client_val, key):
                for alt in alternate_expected_values:
                    if client_val is None:
                        return True
                    try:
                        expected = float(alt.get(key, 0.0))
                        # Direct match
                        if abs(client_val - expected) <= EPSILON:
                            return True
                        # If client provided per-unit value but server expects total for bilateral,
                        # accept if client_val * quantity matches expected
                        if quantity > 1 and abs((client_val * quantity) - expected) <= EPSILON:
                            return True
                    except Exception:
                        continue
                return False

            if client_sp is not None and not matches_any(client_sp, 'sale_price'):
                mismatches.append({
                    'index': idx,
                    'inventoryId': a.get('inventoryId'),
                    'field': 'sale_price',
                    'client': client_sp,
                    'server_suggestions': alternate_expected_values
                })
            if client_pp is not None and not matches_any(client_pp, 'patient_payment'):
                mismatches.append({
                    'index': idx,
                    'inventoryId': a.get('inventoryId'),
                    'field': 'patient_payment',
                    'client': client_pp,
                    'server_suggestions': alternate_expected_values
                })

        force_accept = bool(data.get('force_accept', False))
        if mismatches and not force_accept:
            # Return 400 with server-suggested values and a clear reason so UI can show toast
            return jsonify({
                'success': False,
                'error': 'price_mismatch',
                'reason': 'submitted_values_do_not_match_any_valid_calculation',
                'message': 'Submitted pricing could not be reconciled with server calculations. See mismatches for details.',
                'mismatches': mismatches,
                'server_pricing': server_pricing,
                'timestamp': datetime.now().isoformat()
            }), 400

        # If force_accept, continue but add audit note
        if mismatches and force_accept:
            logger.warning(f"Price mismatches accepted via force_accept by user {data.get('user_id')}: %s", mismatches)

        # By default, use server_pricing for sale-level fields unless force_accept intended to override per-assignment values
        pricing_calculation = server_pricing

        paid_amount = float(data.get('paidAmount', data.get('downPayment', 0)))

        # Create sale record
        sale, error_response = _create_sale_record(patient_id, pricing_calculation, paid_amount, payment_plan_type, patient.tenant_id, branch_id)
        if error_response:
            # error_response is a tuple: (jsonify_response, status_code)
            return error_response[0], error_response[1]

        # Create device assignments
        created_assignment_ids, error_response, status_code, warnings = _create_device_assignments(
            device_assignments, patient_id, sale, sgk_scheme, pricing_calculation, patient.tenant_id, branch_id, created_by=data.get('user_id', 'system')
        )
        if error_response:
            return error_response, status_code

        # Setup payment plan
        payment_plan = _setup_payment_plan(payment_plan_type, sale.id, pricing_calculation, settings, patient.tenant_id, branch_id)

        db.session.commit()

        # Log activity
        _log_device_assignment_activity(
            data.get('user_id', 'system'), sale.id, len(device_assignments),
            pricing_calculation['total_amount'], sgk_scheme, payment_plan_type, request
        )

        # Build response
        assignments_resp = [db.session.get(DeviceAssignment, aid).to_dict() for aid in created_assignment_ids]

        # If server pricing contains per_item details, attach per-item fields to each assignment response
        try:
            per_item = pricing_calculation.get('per_item', []) if isinstance(pricing_calculation, dict) else []
            for idx, a in enumerate(assignments_resp):
                if idx < len(per_item):
                    p = per_item[idx]
                    # attach camelCase and snake_case helpers for frontend compatibility
                    a['sgkSupportPerItem'] = p.get('sgk_support') if p.get('sgk_support') is not None else p.get('sgkSupport')
                    a['sgk_support_per_item'] = p.get('sgk_support') if p.get('sgk_support') is not None else p.get('sgkSupport')
                    a['salePricePerItem'] = p.get('sale_price') if p.get('sale_price') is not None else p.get('salePrice')
                    a['sale_price_per_item'] = p.get('sale_price') if p.get('sale_price') is not None else p.get('salePrice')
        except Exception:
            pass

        return jsonify({
            "success": True,
            "sale": sale.to_dict(),
            "device_assignments": assignments_resp,
            "pricing": pricing_calculation,
            "payment_plan": payment_plan.to_dict() if payment_plan else None,
            "message": "Devices assigned successfully with sale record",
            "warnings": warnings,  # Include warnings in response
            "timestamp": datetime.now().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Extended device assignment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@sales_bp.route('/sales/<sale_id>/payment-plan', methods=['POST'])
@jwt_required()
def create_sale_payment_plan(sale_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED, "timestamp": datetime.now().isoformat()}), 400

        sale = db.session.get(Sale, sale_id)
        if not sale or sale.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": ERROR_SALE_NOT_FOUND, "timestamp": datetime.now().isoformat()}), 404

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json()['settings']

        plan_type = data.get('plan_type', sale.payment_method)
        custom_installments = data.get('custom_installments')
        custom_interest_rate = data.get('custom_interest_rate')

        if custom_installments:
            payment_plan = create_custom_payment_plan(
                sale_id, custom_installments, custom_interest_rate or 0.0, sale.patient_payment, user.tenant_id
            )
        else:
            payment_plan = create_payment_plan(sale_id, plan_type, sale.patient_payment, settings, user.tenant_id)

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
        from models.inventory import InventoryItem
        product = db.session.get(InventoryItem, product_id)
    except Exception as orm_err:
        logger.warning('ORM Inventory lookup failed, falling back to raw SQL: %s', orm_err)
        try:
            row = db.session.execute(text('SELECT id, available_inventory, price, name, tenant_id, brand, model FROM inventory WHERE id = :id'), {'id': product_id}).fetchone()
            if row:
                class _P:
                    pass
                p = _P()
                p.id = row[0]
                p.available_inventory = row[1]
                p.price = row[2]
                p.name = row[3]
                p.tenant_id = row[4]
                p.brand = row[5]
                p.model = row[6]
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
    # Allow override from data (frontend sale price)
    override_price = data.get('price') or data.get('amount') or data.get('base_price')
    
    if override_price is not None:
        try:
            base_price = float(override_price)
        except (ValueError, TypeError):
             base_price = float(product.price or 0)
    else:
        base_price = float(product.price or 0)
        
    discount = float(data.get('discount', 0))
    final_price = max(0, base_price - discount)
    return base_price, discount, final_price


def _create_product_sale_record(patient_id, product_id, base_price, discount, final_price, data, tenant_id):
    """Create product sale record with ORM fallback."""
    # Parse sale_date
    sale_date = datetime.now()
    if data.get('sale_date'):
        try:
            # Handle potential ISO format with timezone
            d_str = str(data.get('sale_date')).replace('Z', '+00:00')
            # If it's just YYYY-MM-DD, fromisoformat handles it fine
            sale_date = datetime.fromisoformat(d_str)
        except ValueError:
            pass

    # Handle amounts
    paid_amount = 0.0
    if 'down_payment' in data:
        try:
            paid_amount = float(data.get('down_payment', 0))
        except (ValueError, TypeError):
            paid_amount = 0.0
    elif 'paid_amount' in data:
        paid_amount = float(data.get('paid_amount'))
    elif data.get('payment_type') == 'cash':
        paid_amount = float(final_price)
    
    sgk_coverage = float(data.get('sgk_coverage', 0))
    report_status = data.get('report_status')
    
    # Calculate KDV (assuming 20% rate for Turkey)
    # KDV is calculated on the base_price before any discounts
    kdv_rate = 0.20  # 20% KDV
    kdv_base = base_price / 1.20  # Net price (without KDV)
    kdv_amount = base_price - kdv_base  # KDV amount
    
    # Determine status
    status = 'pending'
    if paid_amount >= final_price:
        status = 'completed'

    patient_payment = max(0, final_price - sgk_coverage)
    
    # Add KDV info to notes for display
    kdv_note = f"KDV Oranı: %{int(kdv_rate*100)}, KDV Tutarı: ₺{kdv_amount:.2f}"
    sale_notes = data.get('notes', '')
    if sale_notes:
        sale_notes = f"{sale_notes}\n{kdv_note}"
    else:
        sale_notes = kdv_note

    # Generate tenant-specific sale ID
    from models.base import gen_sale_id
    sale_id = gen_sale_id(tenant_id=tenant_id)

    sale = Sale(
        id=sale_id,
        tenant_id=tenant_id,
        patient_id=patient_id,
        list_price_total=base_price,
        total_amount=base_price,
        discount_amount=discount,
        final_amount=final_price,
        paid_amount=paid_amount,
        payment_method=data.get('payment_type') or data.get('paymentMethod', 'cash'),
        status=status,
        sale_date=sale_date,
        notes=sale_notes,
        product_id=product_id,
        sgk_coverage=sgk_coverage,
        report_status=report_status,
        patient_payment=patient_payment
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
                "INSERT INTO sales (id, tenant_id, patient_id, product_id, sale_date, list_price_total, total_amount, discount_amount, final_amount, paid_amount, payment_method, status, sgk_coverage, patient_payment, notes, report_status, created_at, updated_at) VALUES (:id, :tenant_id, :patient_id, :product_id, :sale_date, :list_price_total, :total_amount, :discount_amount, :final_amount, :paid_amount, :payment_method, :status, :sgk_coverage, :patient_payment, :notes, :report_status, :created_at, :updated_at)"
            )
            now = datetime.now()
            params = {
                'id': sale_id,
                'tenant_id': tenant_id,
                'patient_id': patient_id,
                'product_id': product_id,
                'sale_date': sale_date,
                'list_price_total': float(base_price),
                'total_amount': float(base_price),
                'discount_amount': float(discount),
                'final_amount': float(final_price),
                'paid_amount': float(paid_amount),
                'payment_method': sale.payment_method,
                'status': status,
                'sgk_coverage': float(sgk_coverage),
                'patient_payment': float(patient_payment),
                'notes': sale.notes or '',
                'report_status': report_status,
                'created_at': now,
                'updated_at': now
            }
            db.session.execute(insert_stmt, params)
            sale.id = sale_id
            return sale, None
        except Exception as raw_err:
            logger.exception('Raw SQL sale insert also failed: %s', raw_err)
            db.session.rollback()
            return None, (jsonify({"success": False, "error": str(raw_err)}), 500)


def _create_product_device_assignment(patient_id, product_id, sale_id, base_price, final_price, product, data, tenant_id):
    """Create device assignment for product sale."""
    device_assignment = DeviceAssignment(
        tenant_id=tenant_id,
        patient_id=patient_id,
        device_id=product_id,
        sale_id=sale_id,
        reason='Sale',
        from_inventory=True,
        list_price=base_price,
        sale_price=final_price,
        net_payable=final_price,
        payment_method=data.get('payment_type', 'cash'),
        notes=f"Stoktan satış: {getattr(product, 'name', '')} - {getattr(product, 'brand', '')} {getattr(product, 'model', '')}",
        assignment_uid=f"ATM-{uuid4().hex[:6].upper()}"
    )

    db.session.add(device_assignment)


def _update_product_inventory(product, transaction_id=None, created_by=None):
    """Update product inventory quantity."""
    # Check if product is ORM instance or has update_inventory method
    if hasattr(product, 'update_inventory'):
        if product.update_inventory(-1, allow_negative=True):
             create_stock_movement(
                inventory_id=product.id,
                movement_type="sale",
                quantity=-1,
                tenant_id=product.tenant_id,
                serial_number=None,
                transaction_id=transaction_id,
                created_by=created_by,
                session=db.session
             )
    else:
        # Fallback for raw object
        product.available_inventory -= 1
        # Try raw SQL update
        try:
             db.session.execute(
                 text("UPDATE inventory SET available_inventory = available_inventory - 1, used_inventory = used_inventory + 1 WHERE id = :id"),
                 {'id': product.id}
             )
             create_stock_movement(
                inventory_id=product.id,
                movement_type="sale",
                quantity=-1,
                tenant_id=product.tenant_id,
                serial_number=None,
                transaction_id=transaction_id,
                created_by=created_by,
                session=db.session
             )
        except Exception as e:
             logger.error(f"Failed to update inventory for raw product {product.id}: {e}")


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
@jwt_required()
@idempotent(methods=['POST'])
def create_product_sale(patient_id):
    """Create a new product sale from inventory"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        # Validate input
        data, error_response, status_code = _validate_product_sale_input(request.get_json())
        if error_response:
            return error_response, status_code

        # Validate patient
        patient = db.session.get(Patient, patient_id)
        if not patient or patient.tenant_id != user.tenant_id:
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
        sale, error_response = _create_product_sale_record(patient_id, product.id, base_price, discount, final_price, data, user.tenant_id)
        if error_response:
            return error_response

        # Create device assignment
        _create_product_device_assignment(patient_id, product.id, sale.id, base_price, final_price, product, data, user.tenant_id)

        # Update inventory
        _update_product_inventory(product, transaction_id=sale.id, created_by=user.id)

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
        import traceback
        try:
            db.session.rollback()
        except:
            pass
        # Log full exception with traceback to aid debugging of FK/ORM metadata issues
        logger.exception('Error creating product sale')
        # Handle integrity errors for idempotency
        idempotency_response = _handle_product_sale_idempotency(e, patient_id, data, idempotency_key)
        if idempotency_response:
            return idempotency_response
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500


@sales_bp.route('/sales/logs', methods=['POST'])
@jwt_required()
def create_sales_log():
    """Create a sales log entry for cashflow.html page"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": ERROR_NO_DATA_PROVIDED}), 400

        # Get patient information for proper formatting
        patient = Patient.query.get(data.get('patient_id'))
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Bilinmeyen Hasta"

        # Create ActivityLog entry for backend tracking
        
        log_entry = ActivityLog(
            tenant_id=user.tenant_id,
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
        from models.inventory import InventoryItem
        inventory_item = db.session.get(InventoryItem, device.inventory_id)
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
        'serialNumberLeft': device.serial_number_left,
        'serialNumberRight': device.serial_number_right,
        'barcode': barcode,
        'ear': assignment.ear,
        'listPrice': float(assignment.list_price) if assignment.list_price else None,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
        'sgk_coverage_amount': float(assignment.sgk_support) if assignment.sgk_support else None,
        'patient_responsible_amount': float(assignment.net_payable) if hasattr(assignment, 'net_payable') and assignment.net_payable is not None else None,
        # Backwards-compatible keys used by frontend components
        'sgkReduction': float(assignment.sgk_support) if assignment.sgk_support else None,
        'patientPayment': float(assignment.net_payable) if hasattr(assignment, 'net_payable') and assignment.net_payable is not None else None
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


@sales_bp.route('/device-assignments/<assignment_id>/return-loaner', methods=['POST'])
@jwt_required()
def return_loaner_to_stock(assignment_id):
    """Return a loaner device to stock."""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401
        
        assignment = db.session.get(DeviceAssignment, assignment_id)
        if not assignment:
            return jsonify({'success': False, 'error': 'Assignment not found'}), 404
        
        # Verify it is a loaner
        if not assignment.is_loaner:
             return jsonify({'success': False, 'error': 'This is not a loaner assignment'}), 400

        if not assignment.loaner_inventory_id:
             return jsonify({'success': False, 'error': 'No loaner inventory link found'}), 400

        from models.inventory import InventoryItem
        loaner_item = db.session.get(InventoryItem, assignment.loaner_inventory_id)
        if not loaner_item:
             return jsonify({'success': False, 'error': 'Loaner inventory item not found'}), 404

        # Calculate quantity to return
        ear_val = str(assignment.ear or '').lower()
        qty = 2 if (ear_val.startswith('b') or ear_val in ['both', 'bilateral']) else 1
        
        # Collect serials to restore
        loaner_serials = []
        if assignment.loaner_serial_number and assignment.loaner_serial_number != 'null': loaner_serials.append(assignment.loaner_serial_number)
        if assignment.loaner_serial_number_left and assignment.loaner_serial_number_left != 'null': loaner_serials.append(assignment.loaner_serial_number_left)
        if assignment.loaner_serial_number_right and assignment.loaner_serial_number_right != 'null': loaner_serials.append(assignment.loaner_serial_number_right)

        # Restore inventory
        loaner_item.update_inventory(qty)
        
        # Restore serials
        restored_serials = []
        for s in loaner_serials:
             if s and s != '-':
                 loaner_item.add_serial_number(s)
                 restored_serials.append(s)

        # Log movement
        create_stock_movement(
            inventory_id=loaner_item.id,
            movement_type="loaner_return",
            quantity=qty,
            tenant_id=loaner_item.tenant_id,
            serial_number=','.join(restored_serials) if restored_serials else None,
            transaction_id=assignment.id,
            created_by=user.id,
            session=db.session
        )

        # Update assignment status
        assignment.status = 'returned'
        assignment.return_date = datetime.now()
        
        data = request.get_json() or {}
        if data.get('notes'):
            assignment.notes = (assignment.notes or '') + f"\nEmanet İade Notu: {data.get('notes')}"

        db.session.add(loaner_item)
        db.session.add(assignment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Loaner returned to stock successfully',
            'inventory_updated': True,
            'new_status': 'returned'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error returning loaner: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



def _process_inventory_restoration(assignment, sale_id):
    """Process inventory restoration for a single assignment."""
    if not assignment.inventory_id:
        return

    from models.inventory import InventoryItem
    inventory_item = db.session.get(InventoryItem, assignment.inventory_id)
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


@sales_bp.route('/sales/<sale_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_sale(sale_id):
    """
    Update sale details, specifically pricing and financial info.
    Used when device assignments are edited (price change, discount change).
    """
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        sale = db.session.get(Sale, sale_id)
        if not sale:
             return jsonify({'success': False, 'error': 'Sale not found'}), 404
        
        if sale.tenant_id != user.tenant_id:
             return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        data = request.get_json()
        
        # Update financial fields if provided
        if 'listPriceTotal' in data:
            try:
                sale.list_price_total = Decimal(str(data['listPriceTotal']))
            except: pass
            
        if 'discountAmount' in data:
            try:
                sale.discount_amount = Decimal(str(data['discountAmount']))
            except: pass
            
        if 'sgkCoverage' in data:
            try:
                sale.sgk_coverage = Decimal(str(data['sgkCoverage']))
            except: pass
            
        if 'patientPayment' in data:
            try:
                sale.patient_payment = Decimal(str(data['patientPayment']))
            except: pass
            
        if 'finalAmount' in data:
             try:
                sale.final_amount = Decimal(str(data['finalAmount']))
                sale.total_amount = sale.final_amount 
             except: pass

        if 'notes' in data:
            sale.notes = data['notes']
            
        if 'paymentMethod' in data:
             sale.payment_method = data['paymentMethod']
             
        if 'status' in data:
            sale.status = data['status']

        db.session.commit()
        
        return jsonify({
            'success': True, 
            'data': sale.to_dict(),
            'message': 'Sale updated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update sale error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
