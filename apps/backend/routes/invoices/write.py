"""
Invoices Write Operations
-------------------------
POST/PUT endpoints for invoice creation and updates.
All endpoints use @unified_access for tenant scoping.
"""

from flask import request, jsonify
from sqlalchemy import desc
from datetime import datetime
from uuid import uuid4
import os

from models.base import db
from models.invoice import Invoice
from models.patient import Patient
from models.device import Device
from models.user import ActivityLog
from . import invoices_bp
from utils.decorators import unified_access
from utils.query_policy import get_or_404_scoped
from utils.xml_utils import save_invoice_xml
from utils.ubl_utils import generate_ubl_xml
import logging

logger = logging.getLogger(__name__)


def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()


@invoices_bp.route('/invoices', methods=['POST'])
@unified_access(resource='invoices', action='write')
def create_invoice(ctx):
    """Create a new invoice - Unified Access"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('patientId') or not data.get('devicePrice'):
            return jsonify({'success': False, 'message': 'patientId and devicePrice are required'}), 400
        
        # Determine tenant_id
        tenant_id = ctx.tenant_id
        if not tenant_id:
            tenant_id = data.get('tenant_id')
            if not tenant_id:
                return jsonify({'success': False, 'error': 'tenant_id is required for super admin operations'}), 400
        
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
        
        # Get patient with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, data['patientId'])
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404
        
        # Get device info if device_id provided
        device = None
        if data.get('deviceId'):
            device = db.session.get(Device, data['deviceId'])
        
        # Create invoice
        invoice = Invoice(
            tenant_id=tenant_id,
            branch_id=data.get('branchId'),
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
            tenant_id=tenant_id,
            user_id=ctx.principal_id,
            action='invoice_created',
            entity_type='invoice',
            entity_id=str(invoice.id),
            details=f"Hasta: {invoice.patient_id}, Fatura: {invoice_number}, Cihaz: {invoice.device_name}, Tutar: {invoice.device_price} TL"
        )
        db.session.add(activity)
        
        db.session.commit()

        # Persist the invoice XML snapshot for later rendering/integration
        try:
            save_invoice_xml(invoice)
        except Exception as e:
            logger.warning(f"Failed to save invoice XML for {invoice.id}: {e}")

        # Also generate a UBL XML for GİB/birfatura compatibility
        try:
            base_instance = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'instance', 'invoice_xml'))
            os.makedirs(base_instance, exist_ok=True)
            ubl_name = f"{invoice.invoice_number}_{invoice.id}_ubl.xml" if invoice.invoice_number else f"{invoice.id}_ubl.xml"
            ubl_path = os.path.join(base_instance, ubl_name)
            generate_ubl_xml(invoice.to_dict(), ubl_path)
        except Exception as e:
            logger.warning(f"Failed to generate UBL XML for invoice {invoice.id}: {e}")

        logger.info(f"Invoice created: {invoice.id} by {ctx.principal_id}")

        return jsonify({
            'success': True,
            'message': 'Invoice created successfully',
            'data': invoice.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create invoice error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500
