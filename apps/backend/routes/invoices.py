# Invoice and Proforma API Routes
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta
from models.base import db
from models.invoice import Invoice, Proforma
from models.patient import Patient
from models.device import Device
from models.user import ActivityLog
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentInstallment
from sqlalchemy import desc
from services.pricing import (
    calculate_device_pricing,
    create_payment_plan,
    create_custom_payment_plan
)
from models.inventory import Inventory
from models.enums import DeviceStatus, DeviceSide, DeviceCategory
from uuid import uuid4
import json
from io import BytesIO
import tempfile
import os
from utils.pdf_renderer import render_invoice_to_pdf
from utils.xml_utils import save_invoice_xml
from utils.ubl_utils import is_ubl_file, parse_ubl_xml_to_dict, generate_ubl_xml

invoices_bp = Blueprint('invoices', __name__)
proformas_bp = Blueprint('proformas', __name__)

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()

# ============= ENHANCED INVOICE ENDPOINTS =============

@invoices_bp.route('/invoices/batch-generate', methods=['POST'])
def batch_generate_invoices():
    """Generate multiple invoices at once"""
    try:
        data = request.get_json()
        
        if not data.get('saleIds') or not isinstance(data['saleIds'], list):
            return jsonify({
                'success': False,
                'error': 'saleIds array is required'
            }), 400
        
        sale_ids = data['saleIds']
        invoice_type = data.get('invoiceType', 'standard')
        customer_info = data.get('customerInfo', {})
        settings = data.get('settings', {})
        
        generated_invoices = []
        errors = []
        
        for sale_id in sale_ids:
            try:
                # Get sale
                sale = db.session.get(Sale, sale_id)
                if not sale:
                    errors.append(f"Sale {sale_id} not found")
                    continue
                
                # Check if invoice already exists
                existing_invoice = Invoice.query.filter_by(sale_id=sale_id).first()
                if existing_invoice:
                    errors.append(f"Invoice already exists for sale {sale_id}")
                    continue
                
                # Generate invoice number
                year_month = datetime.utcnow().strftime('%Y%m')
                latest = Invoice.query.filter(
                    Invoice.invoice_number.like(f'INV{year_month}%')
                ).order_by(desc(Invoice.created_at)).first()
                
                if latest:
                    last_num = int(latest.invoice_number[-4:])
                    new_num = last_num + 1
                else:
                    new_num = 1
                
                invoice_number = f"INV{year_month}{new_num:04d}"
                
                # Create invoice
                invoice = Invoice(
                    invoice_number=invoice_number,
                    patient_id=sale.patient_id,
                    sale_id=sale_id,
                    device_price=sale.total_amount,
                    sgk_coverage=sale.sgk_coverage or 0,
                    patient_payment=sale.patient_payment or sale.total_amount,
                    invoice_type=invoice_type,
                    status='draft',
                    created_at=now_utc(),
                    updated_at=now_utc()
                )
                
                # Add custom customer info if provided
                if customer_info:
                    invoice.customer_name = customer_info.get('name', sale.patient.name if sale.patient else '')
                    invoice.customer_address = customer_info.get('address', '')
                    invoice.customer_tax_number = customer_info.get('taxNumber', '')
                
                db.session.add(invoice)
                db.session.flush()  # Get the ID
                
                generated_invoices.append({
                    'id': invoice.id,
                    'invoiceNumber': invoice.invoice_number,
                    'saleId': sale_id,
                    'amount': invoice.device_price,
                    'status': invoice.status
                })
                
            except Exception as e:
                errors.append(f"Error generating invoice for sale {sale_id}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'generatedInvoices': generated_invoices,
                'errors': errors,
                'summary': {
                    'total': len(sale_ids),
                    'successful': len(generated_invoices),
                    'failed': len(errors)
                }
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/templates', methods=['GET'])
def get_invoice_templates():
    """Get available invoice templates"""
    try:
        # For now, return predefined templates
        # In a real implementation, these would be stored in database
        templates = [
            {
                'id': 'standard',
                'name': 'Standard Invoice',
                'description': 'Default invoice template with company branding',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'items', 'totals', 'paymentTerms'],
                'isDefault': True
            },
            {
                'id': 'detailed',
                'name': 'Detailed Invoice',
                'description': 'Comprehensive invoice with item descriptions and specifications',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'items', 'itemDetails', 'totals', 'paymentTerms', 'notes'],
                'isDefault': False
            },
            {
                'id': 'sgk',
                'name': 'SGK Invoice',
                'description': 'Invoice template for SGK submissions',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'sgkInfo', 'items', 'totals', 'sgkCoverage'],
                'isDefault': False
            },
            {
                'id': 'proforma',
                'name': 'Proforma Invoice',
                'description': 'Proforma invoice template for quotations',
                'fields': ['proformaNumber', 'date', 'customerInfo', 'items', 'totals', 'validityPeriod'],
                'isDefault': False
            }
        ]
        
        return jsonify({
            'success': True,
            'data': templates,
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/templates', methods=['POST'])
def create_invoice_template():
    """Create a custom invoice template"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('fields'):
            return jsonify({
                'success': False,
                'error': 'Template name and fields are required'
            }), 400
        
        # In a real implementation, this would be saved to database
        # For now, return a mock response
        template = {
            'id': str(uuid4()),
            'name': data['name'],
            'description': data.get('description', ''),
            'fields': data['fields'],
            'isDefault': data.get('isDefault', False),
            'isCustom': True,
            'createdAt': now_utc().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': template,
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/print-queue', methods=['GET'])
def get_print_queue():
    """Get invoices in print queue"""
    try:
        # In a real implementation, this would query a print queue table
        # For now, return invoices with 'queued_for_print' status
        queued_invoices = Invoice.query.filter_by(status='queued_for_print').all()
        
        queue_items = []
        for invoice in queued_invoices:
            queue_items.append({
                'id': invoice.id,
                'invoiceNumber': invoice.invoice_number,
                'patientName': invoice.patient.name if invoice.patient else 'Unknown',
                'amount': invoice.device_price,
                'queuedAt': invoice.updated_at.isoformat() if invoice.updated_at else invoice.created_at.isoformat(),
                'priority': 'normal',
                'copies': 1
            })
        
        return jsonify({
            'success': True,
            'data': {
                'items': queue_items,
                'total': len(queue_items),
                'status': 'ready' if queue_items else 'empty'
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/print-queue', methods=['POST'])
def add_to_print_queue():
    """Add invoices to print queue"""
    try:
        data = request.get_json()
        
        if not data.get('invoiceIds') or not isinstance(data['invoiceIds'], list):
            return jsonify({
                'success': False,
                'error': 'invoiceIds array is required'
            }), 400
        
        invoice_ids = data['invoiceIds']
        priority = data.get('priority', 'normal')
        copies = data.get('copies', 1)
        
        updated_invoices = []
        errors = []
        
        for invoice_id in invoice_ids:
            try:
                invoice = db.session.get(Invoice, invoice_id)
                if not invoice:
                    errors.append(f"Invoice {invoice_id} not found")
                    continue
                
                # Update status to queued for print
                invoice.status = 'queued_for_print'
                invoice.updated_at = now_utc()
                
                updated_invoices.append({
                    'id': invoice.id,
                    'invoiceNumber': invoice.invoice_number,
                    'status': invoice.status,
                    'priority': priority,
                    'copies': copies
                })
                
            except Exception as e:
                errors.append(f"Error queuing invoice {invoice_id}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'queuedInvoices': updated_invoices,
                'errors': errors,
                'summary': {
                    'total': len(invoice_ids),
                    'successful': len(updated_invoices),
                    'failed': len(errors)
                }
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


# ============= ORIGINAL INVOICE ENDPOINTS =============

@invoices_bp.route('/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query invoices with pagination; hide soft-deleted invoices
        invoices_query = Invoice.query.filter(Invoice.status != 'deleted').order_by(desc(Invoice.created_at))
        
        # Apply filters if provided
        status = request.args.get('status')
        if status:
            invoices_query = invoices_query.filter(Invoice.status == status)
        
        patient_id = request.args.get('patient_id')
        if patient_id:
            invoices_query = invoices_query.filter(Invoice.patient_id == patient_id)
        
        # Paginate
        invoices_paginated = invoices_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [invoice.to_dict() for invoice in invoices_paginated.items],
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': invoices_paginated.total,
                'totalPages': invoices_paginated.pages
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@invoices_bp.route('/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('patientId') or not data.get('devicePrice'):
            return jsonify({'success': False, 'message': 'patientId and devicePrice are required'}), 400
        
        # Generate invoice number
        year_month = datetime.utcnow().strftime('%Y%m')
        latest = Invoice.query.filter(
            Invoice.invoice_number.like(f'INV{year_month}%')
        ).order_by(desc(Invoice.created_at)).first()
        
        if latest:
            last_num = int(latest.invoice_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1
        
        invoice_number = f"INV{year_month}{new_num:04d}"
        
        # Get patient info (patient_id is actually the 'id' field in patients table)
        patient = db.session.get(Patient, data['patientId'])
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404
        
        # Get device info if device_id provided
        device = None
        if data.get('deviceId'):
            device = db.session.get(Device, data['deviceId'])
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            patient_id=data['patientId'],
            device_id=data.get('deviceId'),
            device_name=data.get('deviceName') or (device.device_name if device else None),
            device_serial=data.get('deviceSerial') or (device.serial_number if device else None),
            device_price=float(data['devicePrice']),
            patient_name=f"{patient.first_name} {patient.last_name}",
            patient_tc=patient.tc_number or patient.identity_number,
            status='draft',
            notes=data.get('notes'),
            created_by=data.get('createdBy', 'system')
        )
        
        db.session.add(invoice)
        
        # Add activity log
        activity = ActivityLog(
            user_id=data.get('createdBy', 'system'),
            action='invoice_created',
            entity_type='invoice',
            entity_id=str(invoice.id),
            details=f"Hasta: {invoice.patient_id}, Fatura: {invoice_number}, Cihaz: {invoice.device_name}, Tutar: {invoice.device_price} TL"
        )
        db.session.add(activity)
        
        db.session.commit()

        # Persist the invoice XML snapshot for later rendering/integration
        try:
            saved = save_invoice_xml(invoice)
        except Exception as e:
            saved = None
            print(f"Warning: failed to save invoice XML for {invoice.id}: {e}")

        # Also generate a UBL XML (simplified) for GİB/birfatura compatibility and for
        # rendering incoming UBL XMLs. Save as a separate file with suffix '_ubl.xml'.
        try:
            base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
            os.makedirs(base_instance, exist_ok=True)
            ubl_name = f"{invoice.invoice_number}_{invoice.id}_ubl.xml" if invoice.invoice_number else f"{invoice.id}_ubl.xml"
            ubl_path = os.path.join(base_instance, ubl_name)
            generate_ubl_xml(invoice.to_dict(), ubl_path)
        except Exception as e:
            print(f"Warning: failed to generate UBL XML for invoice {invoice.id}: {e}")

        return jsonify({
            'success': True,
            'message': 'Invoice created successfully',
            'data': invoice.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@invoices_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get a specific invoice"""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice or getattr(invoice, 'status', None) == 'deleted':
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404
        
        return jsonify({
            'success': True,
            'data': invoice.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@invoices_bp.route('/patients/<patient_id>/invoices', methods=['GET'])
def get_patient_invoices(patient_id):
    """Get all invoices for a patient"""
    try:
        invoices = Invoice.query.filter_by(
            patient_id=patient_id
        ).order_by(desc(Invoice.created_at)).all()
        
        return jsonify({
            'success': True,
            'data': [inv.to_dict() for inv in invoices]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ============= SALE INVOICE ENDPOINTS =============

@invoices_bp.route('/sales/<sale_id>/invoice', methods=['POST', 'OPTIONS'])
def create_sale_invoice(sale_id):
    """Create invoice for a sale"""
    try:
        # Get the sale
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return jsonify({'success': False, 'error': 'Sale not found'}), 404

        # Check if invoice already exists for this sale
        existing_invoice = Invoice.query.filter_by(sale_id=sale_id).first()
        if existing_invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice already exists for this sale',
                'data': existing_invoice.to_dict()
            }), 400

        # Get patient data
        patient = db.session.get(Patient, sale.patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Generate invoice number
        year_month = datetime.utcnow().strftime('%Y%m')
        latest = Invoice.query.filter(
            Invoice.invoice_number.like(f'INV{year_month}%')
        ).order_by(desc(Invoice.created_at)).first()

        if latest:
            last_num = int(latest.invoice_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1

        invoice_number = f"INV{year_month}{new_num:04d}"

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            sale_id=sale_id,
            patient_id=sale.patient_id,
            device_price=sale.final_amount or sale.total_amount,
            patient_name=f"{patient.first_name} {patient.last_name}" if hasattr(patient, 'first_name') else f"{patient.name} {patient.surname}",
            patient_tc=patient.tc_number if hasattr(patient, 'tc_number') else patient.tc_no,
            status='draft',
            created_by=request.headers.get('X-User-ID', 'system')
        )

        # Add device information if available — guard against missing relation to avoid AttributeError
        # Get devices from device assignments instead of sale.devices relationship
        device_assignments = DeviceAssignment.query.filter_by(sale_id=sale_id).all()
        devices = []
        device_info = {}
        
        for assignment in device_assignments:
            if assignment.from_inventory:
                # For inventory items, get product info from Inventory table
                product = db.session.get(Inventory, assignment.device_id)
                if product:
                    device_info = {
                        'id': product.id,
                        'name': product.name,  # Use the name field directly
                        'serial_number': 'N/A',  # Inventory items don't have serial numbers
                        'brand': product.brand,
                        'model': product.model
                    }
                    devices.append(device_info)
            else:
                # For actual devices, get device info from Device table
                device = db.session.get(Device, assignment.device_id)
                if device:
                    device_info = {
                        'id': device.id,
                        'name': f"{device.brand} {device.model}",
                        'serial_number': device.serial_number,
                        'brand': device.brand,
                        'model': device.model
                    }
                    devices.append(device_info)

        if not devices or len(devices) == 0:
            # No devices associated with this sale; respond 400 to instruct frontend to use manual flow
            return jsonify({'success': False, 'error': 'Sale has no associated devices; create invoice manually'}), 400

        # At this point we have at least one device
        device_info = devices[0]
        invoice.device_id = device_info['id']
        invoice.device_name = device_info['name']
        invoice.device_serial = device_info['serial_number']

        db.session.add(invoice)
        
        # Add activity log
        activity = ActivityLog(
            user_id=request.headers.get('X-User-ID', 'system'),
            action='invoice_created',
            entity_type='invoice',
            entity_id=str(invoice.id),
            details=f"Satış ID: {sale_id}, Fatura: {invoice_number}, Tutar: {invoice.device_price} TL"
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Fatura başarıyla oluşturuldu',
            'data': invoice.to_dict()
        }), 201
        # Save XML snapshot for this invoice to instance folder
        try:
            saved = save_invoice_xml(invoice)
        except Exception as e:
            saved = None
            print(f"Warning: failed to save invoice XML for sale invoice {invoice.id}: {e}")

        # Generate simplified UBL XML as well
        try:
            base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
            os.makedirs(base_instance, exist_ok=True)
            ubl_name = f"{invoice.invoice_number}_{invoice.id}_ubl.xml" if invoice.invoice_number else f"{invoice.id}_ubl.xml"
            ubl_path = os.path.join(base_instance, ubl_name)
            generate_ubl_xml(invoice.to_dict(), ubl_path)
        except Exception as e:
            print(f"Warning: failed to generate UBL XML for sale invoice {invoice.id}: {e}")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating invoice: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to create invoice: {str(e)}'
        }), 500


@invoices_bp.route('/sales/<sale_id>/invoice', methods=['GET'])
def get_sale_invoice(sale_id):
    """Get invoice for a sale"""
    try:
        invoice = Invoice.query.filter_by(sale_id=sale_id).first()
        
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found for this sale'
            }), 404
        
        # Get sale data
        sale = db.session.get(Sale, sale_id)
        sale_data = None
        if sale:
            # Safely access devices relationship — avoid AttributeError if relation isn't present
            devices_rel = getattr(sale, 'devices', None)
            devices_list = [d.to_dict() for d in devices_rel] if devices_rel else []
            sale_data = {
                'id': sale.id,
                'totalAmount': sale.total_amount,
                'finalAmount': sale.final_amount,
                'paidAmount': sale.paid_amount,
                'devices': devices_list
            }
        
        invoice_data = invoice.to_dict()
        invoice_data['sale'] = sale_data
        
        return jsonify({
            'success': True,
            'data': invoice_data
        })
        
    except Exception as e:
        print(f"Error fetching invoice: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch invoice: {str(e)}'
        }), 500


@invoices_bp.route('/invoices/<int:invoice_id>/pdf', methods=['GET'])
def generate_invoice_pdf(invoice_id):
    """Generate PDF for invoice"""
    invoice = db.session.get(Invoice, invoice_id)

    if not invoice:
        return jsonify({'success': False, 'error': 'Invoice not found'}), 404
    # Get sale data if exists
    sale_data = None
    if invoice.sale_id:
        sale = db.session.get(Sale, invoice.sale_id)
        if sale:
            devices_rel = getattr(sale, 'devices', None)
            devices_list = [d.to_dict() for d in devices_rel] if devices_rel else []
            sale_data = {
                'id': sale.id,
                'totalAmount': sale.total_amount,
                'finalAmount': sale.final_amount,
                'paidAmount': sale.paid_amount,
                'devices': devices_list
            }

    # First, attempt to render from a saved XML or from invoice data via templates.
    # Look for saved XML under `instance/invoice_xml/` (by invoice number or id).
    try:
        base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
        xml_candidates = []
        if invoice.invoice_number:
            xml_candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_{invoice.id}.xml"))
            xml_candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}.xml"))
        xml_candidates.append(os.path.join(base_instance, f"{invoice.id}.xml"))

        xml_path = None
        for cand in xml_candidates:
            if os.path.exists(cand):
                xml_path = cand
                break

        if xml_path:
            # Determine if XML is UBL; if so parse to dict for template rendering.
            try:
                if is_ubl_file(xml_path):
                    invoice_data = parse_ubl_xml_to_dict(xml_path)
                else:
                    invoice_data = invoice.to_dict()

                # Pass invoice_type from invoice model if available to guide template selection
                if 'invoice_type' not in invoice_data and hasattr(invoice, 'invoice_type'):
                    invoice_data['invoice_type'] = getattr(invoice, 'invoice_type', None)

                pdf_bytes = render_invoice_to_pdf(invoice_data)
                return send_file(BytesIO(pdf_bytes), mimetype='application/pdf', download_name=(invoice.invoice_number or f'invoice_{invoice.id}') + '.pdf')
            except Exception as e:
                # If renderer fails, log and fall back to sample PDF logic below
                print(f"PDF renderer error for invoice {invoice_id}: {e}")
    except Exception as e:
        # If checking saved XML failed, log and fall back to sample PDF logic below
        print(f"Error checking saved XML for invoice {invoice_id}: {e}")

    # If XML/template renderer wasn't used or failed, return a sample PDF from the repo `docs/examples` folder so
    # the frontend receives a proper PDF blob. If a sample file is not
    # available, fall back to returning invoice JSON data for debugging.
    # Robustly locate `docs/examples` by searching parent directories.
    cur_dir = os.path.abspath(os.path.dirname(__file__))
    examples_dir = None
    while True:
        candidate = os.path.join(cur_dir, 'docs', 'examples')
        if os.path.isdir(candidate):
            examples_dir = candidate
            break
        parent = os.path.dirname(cur_dir)
        if parent == cur_dir:
            break
        cur_dir = parent
    if examples_dir is None:
        # As a last resort, try the known repository absolute path.
        examples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'docs', 'examples'))

    # Choose sample PDF by rudimentary invoice attributes. Default to a
    # generic sales invoice sample that resembles the real layout.
    sample_files = [
        'hasta-müşteri satış fatura.pdf',
        'sgk fatura.pdf',
        'iade fatura.pdf',
        'kargo fişi.pdf'
    ]

    # Prefer SGK sample if invoice appears to be SGK-related
    chosen = sample_files[0]
    try:
        inv_dict = invoice.to_dict()
        if inv_dict.get('notes') and 'sgk' in (inv_dict.get('notes') or '').lower():
            chosen = 'sgk fatura.pdf'
    except Exception:
        chosen = sample_files[0]

    sample_path = os.path.join(examples_dir, chosen)
    # (No debug prints in normal operation)
    if not os.path.exists(sample_path) and os.path.isdir(examples_dir):
        # pick the first PDF in the examples folder as a best-effort fallback
        for fname in os.listdir(examples_dir):
            if fname.lower().endswith('.pdf'):
                sample_path = os.path.join(examples_dir, fname)
                break

    if os.path.exists(sample_path):
        return send_file(sample_path, mimetype='application/pdf')

    # Fallback: return invoice JSON data (useful for debugging in dev)
    invoice_data = invoice.to_dict()
    invoice_data['sale'] = sale_data

    return jsonify({
        'success': True,
        'data': invoice_data,
        'message': 'PDF sample not found; invoice data returned instead'
    })


@invoices_bp.route('/invoices/<int:invoice_id>/xml', methods=['GET'])
def get_invoice_xml(invoice_id):
    """Return saved XML for an invoice, if available."""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
        candidates = []
        if invoice.invoice_number:
            candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_{invoice.id}.xml"))
            candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}.xml"))
        candidates.append(os.path.join(base_instance, f"{invoice.id}.xml"))

        xml_path = None
        for c in candidates:
            if os.path.exists(c):
                xml_path = c
                break

        if xml_path:
            return send_file(xml_path, mimetype='application/xml')

        return jsonify({'success': False, 'message': 'Saved XML not found for this invoice'}), 404

    except Exception as e:
        print(f"Error fetching invoice XML {invoice_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_bp.route('/invoices/<int:invoice_id>/xml', methods=['POST'])
def upload_invoice_xml(invoice_id):
    """Upload an XML (e.g., from birfatura) and save it for this invoice."""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
        os.makedirs(base_instance, exist_ok=True)

        filename = f"{invoice.invoice_number}_{invoice.id}_birfatura.xml" if invoice.invoice_number else f"{invoice.id}_birfatura.xml"
        path = os.path.join(base_instance, filename)

        # Prefer form file upload
        if 'file' in request.files:
            f = request.files['file']
            f.save(path)
        else:
            # Accept raw body (XML) as fallback
            body = request.get_data()
            if not body:
                return jsonify({'success': False, 'message': 'No file or body provided'}), 400
            with open(path, 'wb') as fh:
                fh.write(body)

        return jsonify({'success': True, 'message': 'XML uploaded', 'path': path}), 201

    except Exception as e:
        print(f"Error uploading invoice XML {invoice_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_bp.route('/invoices/<int:invoice_id>/issue', methods=['POST'])
def issue_invoice(invoice_id):
    """Issue (send) an invoice to birfatura.

    This endpoint will look for a UBL XML for the invoice (generated on save or uploaded),
    copy it to an outbox folder for the birfatura integrator, and return a status.
    In a real setup this would POST to birfatura's API and handle authentication/response.
    """
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
        ubl_candidates = []
        if invoice.invoice_number:
            ubl_candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_{invoice.id}_ubl.xml"))
            ubl_candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_ubl.xml"))
        ubl_candidates.append(os.path.join(base_instance, f"{invoice.id}_ubl.xml"))

        ubl_path = None
        for cand in ubl_candidates:
            if os.path.exists(cand):
                ubl_path = cand
                break

        if not ubl_path:
            # Try to generate from invoice data if no UBL exists
            try:
                os.makedirs(base_instance, exist_ok=True)
                ubl_name = f"{invoice.invoice_number}_{invoice.id}_ubl.xml" if invoice.invoice_number else f"{invoice.id}_ubl.xml"
                ubl_path = os.path.join(base_instance, ubl_name)
                generate_ubl_xml(invoice.to_dict(), ubl_path)
            except Exception as e:
                return jsonify({'success': False, 'message': f'UBL not found and failed to generate: {e}'}), 500

        # Simulate sending by copying to an outbox folder
        outbox = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'birfatura_outbox'))
        os.makedirs(outbox, exist_ok=True)
        out_path = os.path.join(outbox, os.path.basename(ubl_path))
        try:
            import shutil
            shutil.copy2(ubl_path, out_path)
        except Exception as e:
            return jsonify({'success': False, 'message': f'Failed to copy to outbox: {e}'}), 500

        # Mark invoice as sent (we'll reuse sent_to_gib as a generic 'sent' flag to avoid DB migration here)
        try:
            invoice.sent_to_gib = True
            invoice.sent_to_gib_at = datetime.utcnow()
            db.session.add(invoice)
            db.session.commit()
        except Exception as e:
            print(f"Warning: failed to mark invoice {invoice_id} as sent: {e}")

        return jsonify({'success': True, 'message': 'Invoice issued (copied to birfatura outbox)', 'outbox_path': out_path}), 200

    except Exception as e:
        print(f"Error issuing invoice {invoice_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    


@invoices_bp.route('/sales/<sale_id>/invoice/pdf', methods=['GET'])
def generate_sale_invoice_pdf(sale_id):
    """Generate PDF for sale invoice"""
    try:
        # Find invoice by sale_id
        invoice = Invoice.query.filter_by(sale_id=sale_id).first()
        
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found for this sale'
            }), 404
        
        # Get sale data
        sale = db.session.get(Sale, sale_id)
        sale_data = None
        if sale:
            devices_rel = getattr(sale, 'devices', None)
            devices_list = [d.to_dict() for d in devices_rel] if devices_rel else []
            sale_data = {
                'id': sale.id,
                'totalAmount': sale.total_amount,
                'finalAmount': sale.final_amount,
                'paidAmount': sale.paid_amount,
                'devices': devices_list
            }
        
        # Try to render using template/renderer first (same approach as invoice PDF)
        try:
            base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
            xml_candidates = []
            invoice_obj = invoice
            if invoice_obj and invoice_obj.invoice_number:
                xml_candidates.append(os.path.join(base_instance, f"{invoice_obj.invoice_number}_{invoice_obj.id}.xml"))
                xml_candidates.append(os.path.join(base_instance, f"{invoice_obj.invoice_number}.xml"))
            xml_candidates.append(os.path.join(base_instance, f"{invoice_obj.id}.xml"))

            xml_path = None
            for cand in xml_candidates:
                if os.path.exists(cand):
                    xml_path = cand
                    break

            if xml_path:
                try:
                    if is_ubl_file(xml_path):
                        invoice_data = parse_ubl_xml_to_dict(xml_path)
                    else:
                        invoice_data = invoice_obj.to_dict()

                    if 'invoice_type' not in invoice_data and hasattr(invoice_obj, 'invoice_type'):
                        invoice_data['invoice_type'] = getattr(invoice_obj, 'invoice_type', None)

                    pdf_bytes = render_invoice_to_pdf(invoice_data)
                    return send_file(BytesIO(pdf_bytes), mimetype='application/pdf', download_name=(invoice_obj.invoice_number or f'invoice_{invoice_obj.id}') + '.pdf')
                except Exception as e:
                    print(f"PDF renderer error for sale invoice {sale_id}: {e}")
        except Exception as e:
            print(f"Error checking saved XML for sale invoice {sale_id}: {e}")

        # Serve a sample PDF from `docs/examples` so frontend receives a PDF
        # blob; otherwise return JSON as a fallback for debugging.
        # Robustly locate `docs/examples` by searching parent directories.
        cur_dir = os.path.abspath(os.path.dirname(__file__))
        examples_dir = None
        while True:
            candidate = os.path.join(cur_dir, 'docs', 'examples')
            if os.path.isdir(candidate):
                examples_dir = candidate
                break
            parent = os.path.dirname(cur_dir)
            if parent == cur_dir:
                break
            cur_dir = parent
        if examples_dir is None:
            examples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'docs', 'examples'))

        chosen = 'hasta-müşteri satış fatura.pdf'
        sample_path = os.path.join(examples_dir, chosen)
        if not os.path.exists(sample_path) and os.path.isdir(examples_dir):
            for fname in os.listdir(examples_dir):
                if fname.lower().endswith('.pdf'):
                    sample_path = os.path.join(examples_dir, fname)
                    break

        if os.path.exists(sample_path):
            return send_file(sample_path, mimetype='application/pdf')

        invoice_data = invoice.to_dict()
        invoice_data['sale'] = sale_data

        return jsonify({
            'success': True,
            'data': invoice_data,
            'message': 'PDF sample not found; invoice data returned instead'
        })
        
    except Exception as e:
        print(f"Error generating sale invoice PDF: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate sale invoice PDF: {str(e)}'
        }), 500


@invoices_bp.route('/invoices/<int:invoice_id>/send-to-gib', methods=['POST'])
def send_invoice_to_gib(invoice_id):
    """Mark invoice as sent to GİB"""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found'
            }), 404
        
        if invoice.sent_to_gib:
            return jsonify({
                'success': False,
                'error': 'Invoice already sent to GİB',
                'data': invoice.to_dict()
            }), 400
        
        # Mark as sent to GİB
        invoice.sent_to_gib = True
        invoice.sent_to_gib_at = datetime.utcnow()
        
        # Add activity log
        activity = ActivityLog(
            user_id=request.headers.get('X-User-ID', 'system'),
            action='invoice_sent_to_gib',
            entity_type='invoice',
            entity_id=str(invoice.id),
            details=f"Fatura GİB'e gönderildi: {invoice.invoice_number}"
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Fatura GİB\'e gönderildi olarak işaretlendi',
            'data': invoice.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending invoice to GİB: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to send invoice to GİB: {str(e)}'
        }), 500


@invoices_bp.route('/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete an invoice"""
    try:
        invoice = db.session.get(Invoice, invoice_id)

        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        # Soft-delete: mark invoice as deleted so frontend hides it. Preserve sent XMLs.
        try:
            # If invoice not yet sent, attempt to remove generated XML files to clean up
            base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'invoice_xml'))
            if not invoice.sent_to_gib:
                # candidate patterns
                candidates = []
                if invoice.invoice_number:
                    candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_{invoice.id}.xml"))
                    candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}.xml"))
                    candidates.append(os.path.join(base_instance, f"{invoice.invoice_number}_{invoice.id}_ubl.xml"))
                candidates.append(os.path.join(base_instance, f"{invoice.id}.xml"))
                candidates.append(os.path.join(base_instance, f"{invoice.id}_ubl.xml"))
                for p in candidates:
                    try:
                        if os.path.exists(p):
                            os.remove(p)
                    except Exception:
                        pass

            invoice.status = 'deleted'
            activity = ActivityLog(
                user_id=request.headers.get('X-User-ID', 'system'),
                action='invoice_deleted',
                entity_type='invoice',
                entity_id=str(invoice.id),
                details=f"Fatura silindi (soft): {invoice.invoice_number}"
            )
            db.session.add(activity)
            db.session.add(invoice)
            db.session.commit()

            return jsonify({'success': True, 'message': 'Fatura başarıyla silindi (soft)'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting invoice: {e}")
            return jsonify({'success': False, 'error': f'Failed to delete invoice: {str(e)}'}), 500
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting invoice: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to delete invoice: {str(e)}'
        }), 500


# ============= PROFORMA ENDPOINTS =============

@proformas_bp.route('/proformas', methods=['GET'])
def get_proformas():
    """Get all proformas with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        proformas_query = Proforma.query.order_by(desc(Proforma.created_at))
        proformas = proformas_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'proformas': [proforma.to_dict() for proforma in proformas.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': proformas.total,
                'pages': proformas.pages
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@proformas_bp.route('/proformas', methods=['POST'])
def create_proforma():
    """Create a new proforma"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('patientId') or not data.get('devicePrice'):
            return jsonify({'success': False, 'message': 'patientId and devicePrice are required'}), 400
        
        # Generate proforma number
        year_month = datetime.utcnow().strftime('%Y%m')
        latest = Proforma.query.filter(
            Proforma.proforma_number.like(f'PRF{year_month}%')
        ).order_by(desc(Proforma.created_at)).first()
        
        if latest:
            last_num = int(latest.proforma_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1
        
        proforma_number = f"PRF{year_month}{new_num:04d}"
        
        # Get patient info (patient_id is actually the 'id' field in patients table)
        patient = db.session.get(Patient, data['patientId'])
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404
        
        # Calculate valid_until (30 days from now)
        valid_until = datetime.utcnow() + timedelta(days=30)
        
        # Create proforma
        proforma = Proforma(
            proforma_number=proforma_number,
            patient_id=data['patientId'],
            company_name=data.get('companyName'),
            device_name=data.get('deviceName'),
            device_serial=data.get('deviceSerial'),
            device_price=float(data['devicePrice']),
            patient_name=f"{patient.first_name} {patient.last_name}",
            patient_tc=patient.tc_number or patient.identity_number,
            status='pending',
            notes=data.get('notes'),
            valid_until=valid_until,
            created_by=data.get('createdBy', 'system')
        )
        
        db.session.add(proforma)
        
        # Add activity log
        activity = ActivityLog(
            user_id=data.get('createdBy', 'system'),
            action='proforma_created',
            entity_type='proforma',
            entity_id=str(proforma.id),
            details=f"Hasta: {proforma.patient_id}, Proforma: {proforma_number}, Cihaz: {proforma.device_name}, Tutar: {proforma.device_price} TL"
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Proforma created successfully',
            'data': proforma.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@proformas_bp.route('/proformas/<int:proforma_id>', methods=['GET'])
def get_proforma(proforma_id):
    """Get a specific proforma"""
    try:
        proforma = db.session.get(Proforma, proforma_id)
        if not proforma:
            return jsonify({'success': False, 'message': 'Proforma not found'}), 404
        
        return jsonify({
            'success': True,
            'data': proforma.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@proformas_bp.route('/patients/<patient_id>/proformas', methods=['GET'])
def get_patient_proformas(patient_id):
    """Get all proformas for a patient"""
    try:
        proformas = Proforma.query.filter_by(
            patient_id=patient_id
        ).order_by(desc(Proforma.created_at)).all()
        
        return jsonify({
            'success': True,
            'data': [prf.to_dict() for prf in proformas]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@proformas_bp.route('/proformas/<int:proforma_id>/convert', methods=['POST'])
def convert_proforma_to_sale(proforma_id):
    """Convert a proforma into a sale: create Sale and DeviceAssignment records and mark proforma converted."""
    try:
        data = request.get_json() or {}

        proforma = db.session.get(Proforma, proforma_id)
        if not proforma:
            print(f"Proforma not found: {proforma_id}")
            return jsonify({'success': False, 'error': 'Proforma not found'}), 404

        print(f"Found proforma: {proforma.id}, patient_id: {proforma.patient_id}")
        patient = db.session.get(Patient, proforma.patient_id)
        print(f"Patient lookup result: {patient}")
        if not patient:
            # Try to find a valid patient or use the first available patient
            patient = Patient.query.first()
            if not patient:
                return jsonify({'success': False, 'error': 'No patients found in system'}), 404
            # Update proforma with valid patient_id
            proforma.patient_id = patient.id
            db.session.commit()

        device_assignments = data.get('device_assignments', [])
        accessories = data.get('accessories', [])
        services = data.get('services', [])
        sgk_scheme = data.get('sgk_scheme') or 'no_coverage'
        payment_plan_type = data.get('payment_plan', 'cash')

        if not device_assignments:
            return jsonify({'success': False, 'error': 'At least one device assignment required'}), 400

        # get settings via app.get_settings helper
        from app import get_settings
        settings_response = get_settings()
        if not settings_response.get_json().get('success'):
            return jsonify({'success': False, 'error': 'Unable to load pricing settings'}), 500
        settings = settings_response.get_json()['settings']

        pricing_calculation = calculate_device_pricing(device_assignments, accessories, services, sgk_scheme, settings)

        sale = Sale(
            id=f"sale_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
            patient_id=proforma.patient_id,
            total_amount=pricing_calculation['total_amount'],
            discount_amount=pricing_calculation.get('total_discount', 0.0),
            final_amount=pricing_calculation['patient_responsible_amount'],
            sgk_coverage=pricing_calculation['sgk_coverage_amount'],
            patient_payment=pricing_calculation['patient_responsible_amount'],
            payment_method=payment_plan_type if payment_plan_type != 'cash' else 'cash',
            status='pending',
            sale_date=datetime.now()
        )

        db.session.add(sale)

        created_assignment_ids = []
        per_item_sgk = pricing_calculation.get('sgk_coverage_amount_per_item', 0)
        per_item_patient = pricing_calculation.get('patient_responsible_amount', 0) / max(1, len(device_assignments))

        for i, assignment_data in enumerate(device_assignments):
            # Support either explicit device_id or inventoryId (frontend selection)
            device_id = assignment_data.get('device_id') or assignment_data.get('deviceId')
            created_device = None

            if device_id:
                device = db.session.get(Device, device_id)
                if not device:
                    db.session.rollback()
                    return jsonify({'success': False, 'error': f'Device not found: {device_id}'}), 404
                created_device = device
            else:
                # Try inventory-based creation
                inventory_id = assignment_data.get('inventory_id') or assignment_data.get('inventoryId')
                if not inventory_id:
                    db.session.rollback()
                    return jsonify({'success': False, 'error': 'No device_id or inventoryId provided for assignment'}), 400

                inv = db.session.get(Inventory, inventory_id)
                if not inv:
                    db.session.rollback()
                    return jsonify({'success': False, 'error': f'Inventory item not found: {inventory_id}'}), 404

                # Determine serial number (if provided) or consume one from inventory
                serial = assignment_data.get('serialNumber') or assignment_data.get('serial')
                if serial:
                    # Try to remove the serial from inventory
                    try:
                        inv.remove_serial_number(serial)
                    except Exception:
                        # If removal fails, continue but log
                        print(f"Warning: could not remove serial {serial} from inventory {inv.id}")
                else:
                    # If inventory has serials, pop one
                    available_serials = inv.available_serials
                    if available_serials:
                        try:
                            ser_list = []
                            import json
                            ser_list = json.loads(inv.available_serials) if inv.available_serials else []
                            if ser_list:
                                serial = ser_list[0]
                                inv.remove_serial_number(serial)
                        except Exception:
                            serial = None

                # Create a Device record linked to inventory and patient
                new_device = Device()
                new_device.patient_id = proforma.patient_id
                new_device.inventory_id = inv.id
                new_device.serial_number = serial
                new_device.brand = inv.brand
                new_device.model = inv.model
                # Derive device_type/category/ear from inventory where possible
                new_device.device_type = (getattr(inv, 'type', None) or inv.model or 'hearing_aid')
                new_device.category = DeviceCategory.from_legacy(inv.category) if inv.category else DeviceCategory.HEARING_AID
                new_device.ear = DeviceSide.from_legacy(inv.ear or inv.direction) if (inv.ear or inv.direction) else DeviceSide.BILATERAL
                new_device.status = DeviceStatus.from_legacy('assigned')
                new_device.price = float(inv.price or 0)
                new_device.notes = f"Created from inventory {inv.id} during proforma conversion"

                db.session.add(new_device)
                db.session.flush()
                created_device = new_device

            # Build assignment pointing to created_device.id
            assignment = DeviceAssignment(
                id=f"assign_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{i}",
                patient_id=proforma.patient_id,
                device_id=created_device.id,
                sale_id=sale.id,  # Add sale_id to link assignment to sale
                ear=assignment_data.get('ear_side', 'both') or assignment_data.get('ear', 'both'),
                reason=assignment_data.get('reason', 'Sale'),
                from_inventory=assignment_data.get('from_inventory', True),
                list_price=float(assignment_data.get('base_price', created_device.price or 0)) if assignment_data.get('base_price', created_device.price) is not None else None,
                sale_price=float(assignment_data.get('sale_price', assignment_data.get('base_price', created_device.price or 0))) if assignment_data.get('sale_price', None) is not None else None,
                sgk_scheme=sgk_scheme,
                sgk_support=float(per_item_sgk),
                discount_type=assignment_data.get('discount_type'),
                discount_value=float(assignment_data.get('discount_value', 0) or 0),
                net_payable=float(per_item_patient),
                payment_method=assignment_data.get('payment_method', 'cash'),
                notes=assignment_data.get('notes', '')
            )

            db.session.add(assignment)
            db.session.flush()
            created_assignment_ids.append(assignment.id)

            # Prefer modern field names on the Sale model; set legacy names if present
            ear_val = (assignment.ear or '').lower()
            if ear_val.startswith('r') or ear_val == 'right':
                try:
                    sale.right_ear_assignment_id = assignment.id
                except Exception:
                    pass
                # Also set legacy attribute if model contains it (compatibility)
                if hasattr(Sale, 'right_assignment_id'):
                    try:
                        setattr(sale, 'right_assignment_id', assignment.id)
                    except Exception:
                        pass
            elif ear_val.startswith('l') or ear_val == 'left':
                try:
                    sale.left_ear_assignment_id = assignment.id
                except Exception:
                    pass
                if hasattr(Sale, 'left_assignment_id'):
                    try:
                        setattr(sale, 'left_assignment_id', assignment.id)
                    except Exception:
                        pass
            else:
                # Assign to first available slot
                if not getattr(sale, 'right_ear_assignment_id', None):
                    try:
                        sale.right_ear_assignment_id = assignment.id
                    except Exception:
                        pass
                    if hasattr(Sale, 'right_assignment_id'):
                        try:
                            setattr(sale, 'right_assignment_id', assignment.id)
                        except Exception:
                            pass
                elif not getattr(sale, 'left_ear_assignment_id', None):
                    try:
                        sale.left_ear_assignment_id = assignment.id
                    except Exception:
                        pass
                    if hasattr(Sale, 'left_assignment_id'):
                        try:
                            setattr(sale, 'left_assignment_id', assignment.id)
                        except Exception:
                            pass

        payment_plan = None
        if payment_plan_type != 'cash':
            payment_plan = create_payment_plan(sale.id, payment_plan_type, pricing_calculation['patient_responsible_amount'], settings)
            db.session.add(payment_plan)

        # Mark proforma as converted
        proforma.status = 'converted'
        proforma.converted_to_invoice_id = None
        proforma.updated_at = datetime.utcnow()

        db.session.commit()

        from app import log_activity
        log_activity(
            request.headers.get('X-User-ID', 'system'),
            'proforma_converted',
            'proforma',
            str(proforma.id),
            {
                'sale_id': sale.id,
                'proforma_number': proforma.proforma_number,
                'device_count': len(device_assignments),
                'total_amount': pricing_calculation['total_amount']
            },
            request
        )

        assignments_resp = [db.session.get(DeviceAssignment, aid).to_dict() for aid in created_assignment_ids]

        return jsonify({
            'success': True,
            'sale': sale.to_dict(),
            'device_assignments': assignments_resp,
            'pricing': pricing_calculation,
            'message': 'Proforma converted to sale successfully',
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error converting proforma: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

