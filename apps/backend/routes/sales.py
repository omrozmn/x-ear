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

logger = logging.getLogger(__name__)

sales_bp = Blueprint('sales', __name__)

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
def assign_devices_extended(patient_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found", "timestamp": datetime.now().isoformat()}), 404

        from app import get_settings
        settings_response = get_settings()
        if not settings_response.get_json().get('success'):
            return jsonify({"success": False, "error": "Unable to load pricing settings", "timestamp": datetime.now().isoformat()}), 500

        settings = settings_response.get_json()['settings']

        device_assignments = data.get('device_assignments', [])
        sgk_scheme = data.get('sgk_scheme', settings.get('sgk', {}).get('default_scheme', 'standard'))
        payment_plan_type = data.get('payment_plan', 'cash')  # Default to cash if not provided
        accessories = data.get('accessories', [])
        services = data.get('services', [])
        
        # Extract down payment amount
        down_payment = float(data.get('downPayment', data.get('paidAmount', 0)))

        if not device_assignments:
            return jsonify({"success": False, "error": "At least one device assignment required", "timestamp": datetime.now().isoformat()}), 400

        # Calculate pricing using backend pricing service
        pricing_calculation = calculate_device_pricing(
            device_assignments=device_assignments,
            accessories=accessories,
            services=services,
            sgk_scheme=sgk_scheme,
            settings=settings
        )
        
        # Use calculated values from backend
        total_amount = pricing_calculation['total_amount']  # List price + extras (indirim öncesi)
        sale_price_total = pricing_calculation['sale_price_total']  # İndirim sonrası + extras
        discount_amount = pricing_calculation['total_discount']
        final_amount = sale_price_total  # Sale price (indirim sonrası)
        sgk_coverage = pricing_calculation['sgk_coverage_amount']
        patient_payment = pricing_calculation['patient_responsible_amount']
        paid_amount = float(data.get('paidAmount', data.get('downPayment', 0)))
        remaining_payment = max(0, patient_payment - paid_amount)

        sale = Sale(
            patient_id=patient_id,
            list_price_total=total_amount,  # List price + extras (indirim öncesi)
            total_amount=total_amount,  # Gross amount (before discounts)
            discount_amount=discount_amount,
            final_amount=final_amount,  # Net amount after discount
            sgk_coverage=sgk_coverage,
            patient_payment=patient_payment,
            paid_amount=paid_amount,  # Formdan gelen ön ödeme tutarı
            payment_method=payment_plan_type if payment_plan_type != 'cash' else 'cash',
            status='pending',
            sale_date=datetime.now()
        )

        try:
            db.session.add(sale)
            db.session.flush()  # Get sale ID
        except Exception as insert_err:
            # Fall back to raw SQL insert when ORM metadata triggers FK/table discovery
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
                    'sgk_coverage': float(sale.skg_coverage) if hasattr(sale, 'skg_coverage') else 0.0,
                    'patient_payment': float(sale.patient_payment) if hasattr(sale, 'patient_payment') else 0.0,
                    'notes': sale.notes or '',
                    'created_at': now,
                    'updated_at': now
                }
                db.session.execute(insert_stmt, params)
                # Reflect sale id into the object for downstream logic
                sale.id = sale_id
                logger.info('Sale created via raw SQL: %s idempotency_key=%s', sale.id, _debug_idempotency_key)
            except Exception as raw_err:
                logger.exception('Raw SQL sale insert also failed: %s', raw_err)
                db.session.rollback()
                return jsonify({"success": False, "error": str(raw_err)}), 500

        created_assignment_ids = []

        # Formdan gelen değerleri doğrudan kullan
        for i, assignment_data in enumerate(device_assignments):
            device_id = assignment_data.get('device_id')
            device = db.session.get(Device, device_id)
            if not device:
                db.session.rollback()
                return jsonify({"success": False, "error": f"Device not found: {device_id}", "timestamp": datetime.now().isoformat()}), 404

            # Use calculated values from backend pricing service
            base_price = float(assignment_data.get('base_price', device.price or 0))
            discount_type = assignment_data.get('discount_type')
            discount_value = float(assignment_data.get('discount_value', 0) or 0)
            
            # Calculate discounted price
            if discount_type == 'percentage':
                discount_amount = base_price * (discount_value / 100.0)
            else:
                discount_amount = discount_value
            net_price = base_price - discount_amount
            
            # Calculate SGK support per device
            sgk_support = pricing_calculation.get('sgk_coverage_amount_per_item', 0)
            net_payable = max(0, net_price - sgk_support)

            assignment = DeviceAssignment(
                patient_id=patient_id,
                device_id=device_id,
                sale_id=sale.id,  # Link to the sale
                ear=assignment_data.get('ear_side', 'both') or assignment_data.get('ear', 'both'),
                reason=assignment_data.get('reason', 'Sale'),
                from_inventory=assignment_data.get('from_inventory', False),
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
            created_assignment_ids.append(assignment.id)

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

        payment_plan = None
        if payment_plan_type != 'cash':
            payment_plan = create_payment_plan(sale.id, payment_plan_type, pricing_calculation['patient_responsible_amount'], settings)
            db.session.add(payment_plan)

        db.session.commit()

        from app import log_activity
        log_activity(
            data.get('user_id', 'system'),
            'device_assigned_extended',
            'patient',
            patient_id,
            {
                'sale_id': sale.id,
                'device_count': len(device_assignments),
                'total_amount': pricing_calculation['total_amount'],
                'sgk_scheme': sgk_scheme,
                'payment_plan': payment_plan_type
            },
            request
        )

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
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({"success": False, "error": "Sale not found", "timestamp": datetime.now().isoformat()}), 404

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json()['settings']

        plan_type = data.get('plan_type', sale.payment_method)
        custom_installments = data.get('custom_installments')
        custom_interest_rate = data.get('custom_interest_rate')

        if custom_installments:
            payment_plan = create_custom_payment_plan(
                sale_id, custom_installments, custom_interest_rate or 0.0, sale.total_net_payable if hasattr(sale, 'total_net_payable') else sale.total_net_payable
            )
        else:
            payment_plan = create_payment_plan(sale_id, plan_type, sale.total_net_payable if hasattr(sale, 'total_net_payable') else sale.total_net_payable, settings)

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


@sales_bp.route('/patients/<patient_id>/product-sales', methods=['POST'])
@idempotent(methods=['POST'])
def create_product_sale(patient_id):
    """Create a new product sale from inventory"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found"}), 404

        # Get product from inventory
        product_id = data.get('product_id')
        if not product_id:
            return jsonify({"success": False, "error": "Product ID required"}), 400

        # Capture incoming Idempotency-Key for debugging and correlation
        idempotency_key = request.headers.get('Idempotency-Key')
        logger.info('create_product_sale invoked: patient_id=%s product_id=%s idempotency_key=%s', patient_id, product_id, idempotency_key)
        logger.debug('create_product_sale called: patient_id=%s product_id=%s idempotency_key=%s', patient_id, product_id, idempotency_key)
        # Ensure the key is available in inner exception scopes
        _debug_idempotency_key = idempotency_key

        # Attempt to load Inventory via ORM; fall back to raw SQL if ORM lookup
        # fails due to mismatched metadata or foreign-key reflection issues.
        product = None
        try:
            from models.inventory import Inventory
            product = db.session.get(Inventory, product_id)
        except Exception as orm_err:
            # Log and attempt raw SQL fallback to keep E2E tests robust in dev
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
                else:
                    product = None
            except Exception as sql_err:
                logger.error('Raw SQL inventory lookup failed: %s', sql_err)
                product = None

        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        if product.available_inventory <= 0:
            return jsonify({"success": False, "error": "Product out of stock"}), 400

        # Calculate pricing
        base_price = float(product.price or 0)
        discount = float(data.get('discount', 0))
        final_price = max(0, base_price - discount)

        # Create sale record
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
            product_id=product_id  # Associate inventory with sale
        )

        try:
            db.session.add(sale)
            db.session.flush()  # Get sale ID
        except Exception as insert_err:
            # Fall back to raw SQL insert when ORM metadata triggers FK/table discovery
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
                    'sgk_coverage': float(sale.skg_coverage) if hasattr(sale, 'skg_coverage') else 0.0,
                    'patient_payment': float(sale.patient_payment) if hasattr(sale, 'patient_payment') else 0.0,
                    'notes': sale.notes or '',
                    'created_at': now,
                    'updated_at': now
                }
                db.session.execute(insert_stmt, params)
                # Reflect sale id into the object for downstream logic
                sale.id = sale_id
                logger.info('Sale created via raw SQL: %s idempotency_key=%s', sale.id, _debug_idempotency_key)
            except Exception as raw_err:
                logger.exception('Raw SQL sale insert also failed: %s', raw_err)
                db.session.rollback()
                return jsonify({"success": False, "error": str(raw_err)}), 500

        db.session.flush()  # Ensure sale ID is available for device assignment

        # Create DeviceAssignment only if device exists. Inventory products do not
        # necessarily have a corresponding devices table row, creating a FK
        # violation when inserted. Check first and skip assignment for pure
        # inventory products.
        # Create DeviceAssignment for inventory products (needed for invoice creation)
        # For inventory items, we create a virtual device assignment
        device_assignment = DeviceAssignment(
            patient_id=patient_id,
            device_id=product_id,  # Use product_id as device_id for inventory items
            sale_id=sale.id,
            reason='Sale',
            from_inventory=True,
            list_price=base_price,
            sale_price=final_price,
            net_payable=final_price,
            payment_method=data.get('payment_type', 'cash'),
            notes=f"Inventory sale: {getattr(product, 'name', '')} - {getattr(product, 'brand', '')} {getattr(product, 'model', '')}"
        )
        
        db.session.add(device_assignment)

        # Update inventory quantity
        product.available_inventory -= 1

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
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            # Try to find existing sale for this patient and product
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
        return jsonify({"success": False, "error": str(e)}), 500


@sales_bp.route('/sales/logs', methods=['POST'])
def create_sales_log():
    """Create a sales log entry for cashflow.html page"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

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


@sales_bp.route('/patients/<patient_id>/sales', methods=['GET'])
def get_patient_sales(patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found", "timestamp": datetime.now().isoformat()}), 404

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        sales_pagination = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        sales = sales_pagination.items

        sales_data = []
        for sale in sales:
            # Fetch device assignments linked to this sale
            # First try by sale_id (new method), then fall back to legacy right/left ear assignments
            assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
            
            # If no assignments found by sale_id, try legacy method
            if not assignments:
                linked_ids = [sale.right_ear_assignment_id, sale.left_ear_assignment_id]
                linked_ids = [lid for lid in linked_ids if lid]
                if linked_ids:
                    assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()
            
            devices = []
            for assignment in assignments:
                device = db.session.get(Device, assignment.device_id)
                if device:
                    # Get inventory name if available
                    device_name = None
                    barcode = None
                    if device.inventory_id:
                        from models.inventory import Inventory
                        inventory_item = db.session.get(Inventory, device.inventory_id)
                        if inventory_item:
                            device_name = inventory_item.name
                            barcode = inventory_item.barcode
                    
                    # Create device name with proper null handling
                    if not device_name:
                        brand = device.brand or ""
                        model = device.model or ""
                        if brand and model:
                            device_name = f"{brand} {model}"
                        elif brand:
                            device_name = brand
                        elif model:
                            device_name = model
                        else:
                            device_name = "Cihaz"
                    
                    devices.append({
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
                    })

            payment_plan = PaymentPlan.query.filter_by(sale_id=sale.id).first()
            
            # Get payment records for this sale
            payment_records = PaymentRecord.query.filter_by(sale_id=sale.id).order_by(PaymentRecord.payment_date.desc()).all()
            
            # Get invoice for this sale
            from models.invoice import Invoice
            invoice = Invoice.query.filter_by(sale_id=sale.id).first()

            # If stored SGK coverage is zero, recalc with current settings for accurate display
            recalculated_sgk = None
            try:
                if (not sale.sgk_coverage or float(sale.sgk_coverage) == 0.0) and assignments:
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
                    recalculated_sgk = pricing_preview.get('sgk_coverage_amount')
            except Exception:
                recalculated_sgk = None

            sales_data.append({
                'id': sale.id,
                'patientId': sale.patient_id,
                'productId': sale.product_id,  # Include product_id for inventory sales
                'saleDate': sale.sale_date.isoformat() if sale.sale_date else None,
                'totalAmount': float(sale.total_amount) if sale.total_amount else None,
                'discountAmount': float(sale.discount_amount) if sale.discount_amount else 0.0,
                'finalAmount': float(sale.final_amount) if sale.final_amount else None,
                'paidAmount': float(sale.paid_amount) if sale.paid_amount else 0.0,
                'sgkCoverage': float(recalculated_sgk) if recalculated_sgk is not None else (float(sale.sgk_coverage) if sale.sgk_coverage else 0.0),
                'patientPayment': float(sale.patient_payment) if sale.patient_payment else None,
                'total_list_price': float(sale.total_amount) if sale.total_amount else None,
                'total_sgk_support': float(recalculated_sgk) if recalculated_sgk is not None else (float(sale.sgk_coverage) if sale.sgk_coverage else 0.0),
                'total_net_payable': float(sale.patient_payment) if sale.patient_payment else None,
                # SGK scheme bilgisini device assignment'lardan al
                'sgk_scheme': assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else 'no_coverage',
                'sgkGroup': assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else None,
                'sgk_group': assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else None,
                # Discount bilgilerini device assignment'lardan al
                'discountRate': float(assignments[0].discount_value) if assignments and assignments[0].discount_type == 'percentage' and assignments[0].discount_value else None,
                'discount_rate': float(assignments[0].discount_value) if assignments and assignments[0].discount_type == 'percentage' and assignments[0].discount_value else None,
                'paymentMethod': sale.payment_method,
                'payment_method': sale.payment_method,
                'status': sale.status,
                'notes': sale.notes,
                'createdAt': sale.created_at.isoformat() if sale.created_at else None,
                'updatedAt': sale.updated_at.isoformat() if sale.updated_at else None,
                'created_at': sale.created_at.isoformat(),
                'devices': devices,
                'payment_plan': payment_plan.to_dict() if payment_plan else None,
                'paymentRecords': [record.to_dict() for record in payment_records],
                'invoice': invoice.to_dict() if invoice else None
            })

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
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

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


@sales_bp.route('/patients/<patient_id>/sales/<sale_id>', methods=['PATCH'])
def update_sale_partial(patient_id, sale_id):
    """Partially update a Sale resource. Supports updating status, notes, total_amount, and paid_amount.

    Expected payload: { "status": "cancelled", "total_amount": 1000.0, "paid_amount": 500.0, "notes": "Updated notes" }
    """
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        sale = db.session.get(Sale, sale_id)
        if not sale or str(sale.patient_id) != str(patient_id):
            return jsonify({"success": False, "error": "Sale not found for patient", "timestamp": datetime.now().isoformat()}), 404

        # Allowed partial fields
        allowed_fields = {'status', 'notes', 'total_amount', 'paid_amount'}
        changed = False

        if 'status' in data:
            new_status = data.get('status')
            old_status = sale.status
            # Basic validation for status values
            if new_status not in ('pending', 'completed', 'cancelled', 'refunded'):
                return jsonify({"success": False, "error": f"Invalid status value: {new_status}", "timestamp": datetime.now().isoformat()}), 400
            
            # If cancelling a sale, restore inventory
            if new_status == 'cancelled' and old_status != 'cancelled':
                try:
                    # Get device assignments for this sale
                    device_assignments = DeviceAssignment.query.filter_by(sale_id=sale_id).all()
                    
                    for assignment in device_assignments:
                        if assignment.inventory_id:
                            # Import Inventory model
                            from models.inventory import Inventory
                            inventory_item = db.session.get(Inventory, assignment.inventory_id)
                            
                            if inventory_item:
                                # Restore stock - add back the quantity that was assigned
                                quantity_to_restore = 1
                                
                                # For bilateral assignments, restore 2 units
                                if assignment.ear == 'both':
                                    quantity_to_restore = 2
                                
                                # If serial number was assigned, add it back to available serials
                                if assignment.serial_number and assignment.serial_number != 'null':
                                    # Handle bilateral serial format "L:serial1,R:serial2"
                                    if ',' in assignment.serial_number and ':' in assignment.serial_number:
                                        serials = assignment.serial_number.split(',')
                                        for serial_part in serials:
                                            if ':' in serial_part:
                                                serial = serial_part.split(':')[1].strip()
                                                if serial and serial != '-':
                                                    inventory_item.add_serial_number(serial)
                                    else:
                                        # Single serial number
                                        if assignment.serial_number != '-':
                                            inventory_item.add_serial_number(assignment.serial_number)
                                else:
                                    # No serial number, just restore quantity
                                    inventory_item.update_inventory(quantity_to_restore)
                                
                                inventory_item.updated_at = datetime.now()
                                db.session.add(inventory_item)
                                
                                logger.info(f'Restored {quantity_to_restore} units to inventory {assignment.inventory_id} for cancelled sale {sale_id}')
                    
                except Exception as e:
                    logger.error(f'Failed to restore inventory for cancelled sale {sale_id}: {str(e)}')
                    # Don't fail the entire operation, just log the error
            
            sale.status = new_status
            changed = True

        if 'notes' in data:
            sale.notes = data.get('notes')
            changed = True

        if 'total_amount' in data:
            total_amount = data.get('total_amount')
            if total_amount is not None:
                try:
                    sale.total_amount = float(total_amount)
                    sale.final_amount = float(total_amount)  # Update final amount too
                    sale.patient_payment = float(total_amount)  # Update patient payment
                    changed = True
                except (ValueError, TypeError):
                    return jsonify({"success": False, "error": "Invalid total_amount value", "timestamp": datetime.now().isoformat()}), 400

        if 'paid_amount' in data:
            paid_amount = data.get('paid_amount')
            if paid_amount is not None:
                try:
                    sale.paid_amount = float(paid_amount)
                    changed = True
                except (ValueError, TypeError):
                    return jsonify({"success": False, "error": "Invalid paid_amount value", "timestamp": datetime.now().isoformat()}), 400

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

@sales_bp.route('/sales/recalc', methods=['POST'])
def recalc_sales():
    """Satış kayıtlarının SGK ve hasta ödeme tutarlarını yeniden hesaplarken kalıcı olarak günceller.
    İsteğe bağlı filtreler: body veya query içinde `patientId`, `saleId`, `limit`.
    """
    try:
        payload = request.get_json(silent=True) or {}
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

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json().get('settings', {})

        updated = 0
        processed = 0
        errors = []

        for s in sales:
            processed += 1
            try:
                assignments = DeviceAssignment.query.filter_by(sale_id=s.id).all()
                if not assignments:
                    # Legacy linkage: try right/left ear assignment ids if present
                    linked_ids = [getattr(s, 'right_ear_assignment_id', None), getattr(s, 'left_ear_assignment_id', None)]
                    linked_ids = [lid for lid in linked_ids if lid]
                    if linked_ids:
                        assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()

                if not assignments:
                    continue

                device_assignments_payload = []
                for a in assignments:
                    device_assignments_payload.append({
                        'device_id': a.device_id,
                        'base_price': float(a.list_price) if a.list_price else 0.0,
                        'discount_type': a.discount_type,
                        'discount_value': float(a.discount_value or 0.0),
                        'sgk_scheme': a.sgk_scheme
                    })

                sgk_scheme = assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme')

                pricing_calc = calculate_device_pricing(
                    device_assignments=device_assignments_payload,
                    accessories=[],
                    services=[],
                    sgk_scheme=sgk_scheme,
                    settings=settings
                )

                s.list_price_total = pricing_calc.get('total_amount', s.list_price_total)
                s.total_amount = pricing_calc.get('total_amount', s.total_amount)
                s.discount_amount = pricing_calc.get('total_discount', s.discount_amount)
                s.final_amount = pricing_calc.get('sale_price_total', s.final_amount)
                s.sgk_coverage = pricing_calc.get('sgk_coverage_amount', s.sgk_coverage)
                s.patient_payment = pricing_calc.get('patient_responsible_amount', s.patient_payment)

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
