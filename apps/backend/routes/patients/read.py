from flask import request, jsonify
from models.base import db
from models.patient import Patient
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.user import User
from datetime import datetime
import logging
from . import patients_bp
from utils.decorators import unified_access
from utils.response import success_response
from flask_jwt_extended import jwt_required, get_jwt_identity

logger = logging.getLogger(__name__)

@patients_bp.route('/patients', methods=['GET'])
@unified_access(resource='patients', action='read')
def list_patients(ctx):
    try:
        # Support both offset-based and cursor-based pagination
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        cursor = request.args.get('cursor')
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        city = request.args.get('city', '')
        district = request.args.get('district', '')
        
        query = Patient.query
        
        # 1. Tenant Scope (ABAC)
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)

        # 2. Branch Logic (Legacy preservation for Tenant Admin)
        # Using ctx._principal to access the underlying user object
        if ctx.is_tenant_member and ctx._principal.user and ctx._principal.user.role == 'admin':
            user = ctx._principal.user
            user_branch_ids = [b.id for b in user.branches]
            if user_branch_ids:
                query = query.filter(Patient.branch_id.in_(user_branch_ids))
            else:
                # If admin has no branches assigned, they see nothing (Legacy behavior)
                return success_response([], meta={
                    'pagination': {
                        'page': page,
                        'perPage': per_page,
                        'total': 0,
                        'totalPages': 0,
                        'hasNext': False,
                        'nextCursor': None
                    }
                })
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.phone.ilike(search_term),
                    Patient.email.ilike(search_term),
                    Patient.id.ilike(search_term)
                )
            )
        
        # Apply filters
        if status:
            query = query.filter(Patient.status == status)
        if city:
            query = query.filter(Patient.address_city == city)
        if district:
            query = query.filter(Patient.address_district == district)
        
        # Cursor-based pagination
        if cursor:
            try:
                import base64
                cursor_id = base64.b64decode(cursor.encode()).decode()
                query = query.filter(Patient.id > cursor_id)
            except Exception:
                pass
        
        # Order by ID
        query = query.order_by(Patient.id)
        
        # Limit results
        per_page = min(per_page, 200)
        patients_list = query.limit(per_page + 1).all()
        
        # Check next page
        has_next = len(patients_list) > per_page
        if has_next:
            patients_list = patients_list[:-1]
        
        # Generate cursor
        next_cursor = None
        if has_next and patients_list:
            import base64
            last_id = patients_list[-1].id
            next_cursor = base64.b64encode(str(last_id).encode()).decode()
        
        results = [p.to_dict() for p in patients_list]
        
        # Attach tenant name for Super Admin view (if cross-tenant)
        if ctx.is_super_admin and not ctx.tenant_id:
            # Placeholder for potential tenant name injection if needed
            pass

        # Calculate totals only if offset-based pagination is used (Cursor is None)
        pagination_meta = {
            'perPage': per_page,
            'hasNext': has_next,
            'nextCursor': next_cursor,
            'cursor': cursor
        }

        if not cursor:
            # Traditional pagination logic
            total_query = Patient.query
            if ctx.tenant_id:
                total_query = total_query.filter_by(tenant_id=ctx.tenant_id)
                
            if search:
                search_term = f"%{search}%"
                total_query = total_query.filter(db.or_(Patient.first_name.ilike(search_term), Patient.last_name.ilike(search_term), Patient.phone.ilike(search_term), Patient.email.ilike(search_term)))
            if status: total_query = total_query.filter(Patient.status == status)
            if city: total_query = total_query.filter(Patient.address_city == city)
            if district: total_query = total_query.filter(Patient.address_district == district)
            
            if ctx.is_tenant_member and ctx._principal.user and ctx._principal.user.role == 'admin':
                user = ctx._principal.user
                user_branch_ids = [b.id for b in user.branches]
                if user_branch_ids:
                    total_query = total_query.filter(Patient.branch_id.in_(user_branch_ids))

            total_count = total_query.count()
            total_pages = (total_count + per_page - 1) // per_page
            
            pagination_meta.update({
                'page': page,
                'total': total_count,
                'totalPages': total_pages
            })

        return success_response(results, meta={'pagination': pagination_meta})
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"List patients error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500


@patients_bp.route('/patients/<patient_id>', methods=['GET'])
@unified_access(resource='patients', action='read')
def get_patient(ctx, patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if ctx.tenant_id and (not patient or patient.tenant_id != ctx.tenant_id):
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        return success_response(patient.to_dict())
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/search', methods=['GET'])
@unified_access(resource='patients', action='read')
def search_patients(ctx):
    """Search patients with filters - Unified Access"""
    try:
        from utils.query_policy import tenant_scoped_query, branch_filtered_query
        
        search_term = request.args.get('q', '')
        status = request.args.get('status')
        segment = request.args.get('segment')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Patient)
        
        # Apply branch filtering for tenant admins
        query = branch_filtered_query(ctx, query, Patient)
        if query is None:
            return jsonify({'success': True, 'data': [], 'meta': {'total': 0}})

        if search_term:
            s = f"%{search_term}%"
            query = query.filter(db.or_(Patient.first_name.ilike(s), Patient.last_name.ilike(s), Patient.tc_number.ilike(s), Patient.phone.ilike(s), Patient.email.ilike(s)))
        if status: query = query.filter_by(status=status)
        if segment: query = query.filter_by(segment=segment)

        patients_paginated = query.order_by(Patient.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        results = [p.to_dict() for p in patients_paginated.items]

        return jsonify({'success': True, 'data': results, 'meta': {'total': patients_paginated.total, 'page': page, 'perPage': per_page}}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/<patient_id>/devices', methods=['GET'])
@unified_access(resource='patients', action='read')
def get_patient_devices(ctx, patient_id):
    """Get all devices assigned to a specific patient - Unified Access"""
    try:
        from utils.query_policy import get_or_404_scoped
        
        # Get patient with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({
                'success': False,
                'error': 'Patient not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get all device assignments for this patient
        assignments = DeviceAssignment.query.filter_by(patient_id=patient_id).all()
        
        devices_data = []
        for assignment in assignments:
            # Get inventory item details if available
            inventory_item = None
            if assignment.inventory_id:
                from models.inventory import InventoryItem
                inventory_item = db.session.get(InventoryItem, assignment.inventory_id)
            
            # Start with the model's to_dict output which contains most fields
            device_dict = assignment.to_dict()
            
            # Enhance with inventory details if linked
            if inventory_item:
                device_dict['brand'] = inventory_item.brand
                device_dict['model'] = inventory_item.model
                device_dict['deviceName'] = f"{inventory_item.brand} {inventory_item.model}"
                device_dict['category'] = inventory_item.category
                device_dict['barcode'] = inventory_item.barcode
            else:
                # Fallback if no inventory link (e.g., manual entry)
                device_dict['deviceName'] = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}" if assignment.is_loaner else f"Device {assignment.device_id or ''}"
            
            device_dict['earSide'] = assignment.ear
            device_dict['status'] = 'assigned' # Base status
            
            # Map delivery status explicitly if not in to_dict
            if 'deliveryStatus' not in device_dict:
                 device_dict['deliveryStatus'] = getattr(assignment, 'delivery_status', 'pending')

            # Ensure loaner fields are present
            if 'isLoaner' not in device_dict:
                device_dict['isLoaner'] = getattr(assignment, 'is_loaner', False)
            if 'loanerInventoryId' not in device_dict:
                device_dict['loanerInventoryId'] = getattr(assignment, 'loaner_inventory_id', None)
            
            # Ensure Sale ID is passed
            device_dict['saleId'] = assignment.sale_id
            
            # Fetch related sale to get down payment info (source from PaymentRecord for accuracy)
            device_dict['downPayment'] = 0.0
            
            if assignment.sale_id:
                sale = db.session.get(Sale, assignment.sale_id)
                if sale:
                    # Try to get explicit down payment record first
                    down_payment_record = PaymentRecord.query.filter_by(
                        sale_id=sale.id,
                        payment_type='down_payment'
                    ).first()
                    
                    if down_payment_record:
                        device_dict['downPayment'] = float(down_payment_record.amount)
                    else:
                        device_dict['downPayment'] = float(sale.paid_amount) if sale.paid_amount else 0.0

            # assignedDate
            device_dict['assignedDate'] = assignment.created_at.isoformat() if assignment.created_at else None

            # Pricing fields - Ensure they are float for JSON serialization
            try:
                device_dict['sgkReduction'] = float(assignment.sgk_support) if getattr(assignment, 'sgk_support', None) is not None else 0.0
                device_dict['patientPayment'] = float(assignment.net_payable) if getattr(assignment, 'net_payable', None) is not None else 0.0
                device_dict['salePrice'] = float(assignment.sale_price) if getattr(assignment, 'sale_price', None) is not None else 0.0
                device_dict['listPrice'] = float(assignment.list_price) if getattr(assignment, 'list_price', None) is not None else 0.0
                device_dict['sgkSupportType'] = assignment.sgk_scheme
            except (ValueError, TypeError):
                logger.warning(f"Error converting prices for assignment {assignment.id}")

            devices_data.append(device_dict)
        
        return jsonify({
            'success': True,
            'data': devices_data,
            'meta': {
                'patientId': patient_id,
                'patientName': f"{patient.first_name} {patient.last_name}",
                'deviceCount': len(devices_data)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get patient devices error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@patients_bp.route('/patients/<patient_id>/sales', methods=['GET'])
@unified_access(resource='patients', action='read')
def get_patient_sales(ctx, patient_id):
    """Get all sales for a specific patient - Unified Access"""
    try:
        from utils.query_policy import get_or_404_scoped
        
        # Get patient with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({
                'success': False,
                'error': 'Patient not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get all sales for this patient
        sales = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.sale_date.desc()).all()
        
        sales_data = []
        for sale in sales:
            sale_dict = sale.to_dict()
            
            # Add devices from assignments
            devices = []
            assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
            for assignment in assignments:
                # Get inventory item details if available
                inventory_item = None
                if assignment.inventory_id:
                    from models.inventory import InventoryItem
                    inventory_item = db.session.get(InventoryItem, assignment.inventory_id)
                
                # Build device info with inventory details
                if inventory_item:
                    device_name = f"{inventory_item.brand} {inventory_item.model}"
                    brand = inventory_item.brand
                    model = inventory_item.model
                    barcode = inventory_item.barcode
                else:
                    # Fallback for manual/loaner devices
                    device_name = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}".strip()
                    brand = assignment.loaner_brand or ''
                    model = assignment.loaner_model or ''
                    barcode = None
                
                device_info = {
                    'id': assignment.inventory_id or assignment.device_id,
                    'name': device_name,
                    'brand': brand,
                    'model': model,
                    'serialNumber': assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right,
                    'barcode': barcode,
                    'ear': assignment.ear,
                    'listPrice': float(assignment.list_price) if assignment.list_price else None,
                    'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
                    'sgkCoverageAmount': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
                    'patientResponsibleAmount': float(assignment.net_payable) if assignment.net_payable else None
                }
                devices.append(device_info)
            
            sale_dict['devices'] = devices
            
            # Add payment records
            payment_records = []
            payments = PaymentRecord.query.filter_by(sale_id=sale.id).all()
            for payment in payments:
                payment_info = {
                    'id': payment.id,
                    'amount': float(payment.amount) if payment.amount else 0.0,
                    'paymentDate': payment.payment_date.isoformat() if payment.payment_date else None,
                    'paymentMethod': payment.payment_method,
                    'paymentType': payment.payment_type,
                    'status': 'paid',
                    'referenceNumber': None,
                    'notes': None
                }
                payment_records.append(payment_info)
            
            sale_dict['paymentRecords'] = payment_records
            
            sales_data.append(sale_dict)
        
        return jsonify({
            'success': True,
            'data': sales_data,
            'meta': {
                'patientId': patient_id,
                'patientName': f"{patient.first_name} {patient.last_name}",
                'salesCount': len(sales_data)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get patient sales error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@patients_bp.route('/patients/count', methods=['GET'])
@unified_access(resource='patients', action='read')
def count_patients(ctx):
    """Count patients with optional filters for SMS campaigns - Unified Access"""
    try:
        from utils.query_policy import tenant_scoped_query, branch_filtered_query
        
        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Patient)
        
        # Only count patients with valid phone numbers (for SMS campaigns)
        query = query.filter(Patient.phone.isnot(None))
        query = query.filter(Patient.phone != '')

        # Apply branch filtering for tenant admins
        query = branch_filtered_query(ctx, query, Patient)
        if query is None:
            return jsonify({
                'success': True,
                'data': {'count': 0}
            })

        # Apply filters
        status = request.args.get('status')
        if status:
            query = query.filter(Patient.status == status)

        segment = request.args.get('segment')
        if segment:
            query = query.filter(Patient.segment == segment)

        acquisition_type = request.args.get('acquisitionType')
        if acquisition_type:
            query = query.filter(Patient.acquisition_type == acquisition_type)

        branch_id = request.args.get('branchId')
        if branch_id:
            query = query.filter(Patient.branch_id == branch_id)

        date_start = request.args.get('dateStart')
        if date_start:
            try:
                start_date = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
                query = query.filter(Patient.created_at >= start_date)
            except ValueError:
                pass

        date_end = request.args.get('dateEnd')
        if date_end:
            try:
                end_date = datetime.fromisoformat(date_end.replace('Z', '+00:00'))
                query = query.filter(Patient.created_at <= end_date)
            except ValueError:
                pass

        count = query.count()

        return jsonify({
            'success': True,
            'data': {
                'count': count
            }
        }), 200

    except Exception as e:
        logger.error(f"Count patients error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
