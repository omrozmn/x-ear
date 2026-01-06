"""
Replacements API

Handles device replacement workflows for patients.
Supports unified access pattern for Super Admin and Tenant users.
"""
from flask import Blueprint, request
from models.base import db
from models.replacement import Replacement
import json
from datetime import datetime
import logging
import time
import os
from models.efatura_outbox import EFaturaOutbox
from utils.efatura import build_return_invoice_xml, write_outbox_file
from models.inventory import InventoryItem
from models.patient import Patient
from models.user import ActivityLog
from utils.decorators import unified_access
from utils.response import success_response, error_response
from services.stock_service import create_stock_movement

logger = logging.getLogger(__name__)

# This blueprint registers under /api when imported from app.py
replacements_bp = Blueprint('replacements', __name__, url_prefix='/api')


@replacements_bp.route('/patients/<patient_id>/replacements', methods=['GET'])
@unified_access(resource='replacements', action='read')
def get_patient_replacements(ctx, patient_id):
    """Get replacement history for a patient"""
    try:
        query = Replacement.query.filter_by(patient_id=patient_id)
        
        # Apply tenant filtering for non-admin users
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        reps = query.order_by(Replacement.created_at.desc()).all()
        
        return success_response(
            data=[r.to_dict() for r in reps],
            meta={'count': len(reps), 'timestamp': datetime.now().isoformat()}
        )
    except Exception as e:
        logger.exception('Get patient replacements failed')
        return error_response(str(e), 500)


@replacements_bp.route('/patients/<patient_id>/replacements', methods=['POST'])
@unified_access(resource='replacements', action='write')
def create_patient_replacement(ctx, patient_id):
    """Create a replacement for a patient. Request body mirrors legacy fields."""
    try:
        if not ctx.tenant_id:
            return error_response('Tenant context required', 400)

        data = request.get_json() or {}
        replacement_id = data.get('id') or f"REPL-{int(time.time() * 1000)}"
        
        # Ensure device info fields are stored as JSON/text-compatible values
        old_info = data.get('oldDeviceInfo') or data.get('old_device_info')
        new_info = data.get('newDeviceInfo') or data.get('new_device_info')

        if isinstance(old_info, dict):
            old_info_to_store = json.dumps(old_info, ensure_ascii=False)
        else:
            old_info_to_store = old_info

        if isinstance(new_info, dict):
            new_info_to_store = json.dumps(new_info, ensure_ascii=False)
        else:
            new_info_to_store = new_info

        r = Replacement(
            id=replacement_id,
            tenant_id=ctx.tenant_id,
            patient_id=patient_id,
            sale_id=data.get('saleId') or data.get('sale_id'),
            old_device_id=data.get('oldDeviceId') or data.get('old_device_id'),
            new_device_id=data.get('newInventoryId') or data.get('new_device_id') or data.get('newDeviceId'),
            old_device_info=old_info_to_store,
            new_device_info=new_info_to_store,
            replacement_reason=data.get('replacementReason') or data.get('replacement_reason'),
            status='pending',
            price_difference=data.get('priceDifference') or data.get('price_difference'),
            notes=data.get('notes'),
            created_by=data.get('createdBy') or (ctx.user.id if ctx.user else 'system')
        )
        db.session.add(r)
        db.session.commit()
        
        return success_response(data=r.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.exception('Create patient replacement failed')
        return error_response(str(e), 500)


@replacements_bp.route('/replacements/<replacement_id>', methods=['GET'])
@unified_access(resource='replacements', action='read')
def get_replacement(ctx, replacement_id):
    """Get a single replacement by ID"""
    r = db.session.get(Replacement, replacement_id)
    
    if not r:
        return error_response('Replacement not found', 404)
    
    # Tenant scoping check
    if ctx.tenant_id and r.tenant_id != ctx.tenant_id:
        return error_response('Replacement not found', 404)
    
    return success_response(data=r.to_dict())


@replacements_bp.route('/replacements/<replacement_id>/status', methods=['PATCH'])
@unified_access(resource='replacements', action='write')
def patch_replacement_status(ctx, replacement_id):
    """Update replacement status"""
    data = request.get_json() or {}
    new_status = data.get('status')
    notes = data.get('notes')
    
    r = db.session.get(Replacement, replacement_id)
    
    if not r:
        return error_response('Replacement not found', 404)
    
    # Tenant scoping check
    if ctx.tenant_id and r.tenant_id != ctx.tenant_id:
        return error_response('Replacement not found', 404)
    
    r.status = new_status or r.status
    if notes:
        r.notes = (r.notes or '') + '\n' + notes
    r.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(data=r.to_dict())


@replacements_bp.route('/replacements/<replacement_id>/invoice', methods=['POST'])
@unified_access(resource='replacements', action='write')
def create_return_invoice(ctx, replacement_id):
    """Create a supplier return invoice record linked to a replacement."""
    try:
        data = request.get_json() or {}
        r = db.session.get(Replacement, replacement_id)
        
        if not r:
            return error_response('Replacement not found', 404)
        
        # Tenant scoping check
        if ctx.tenant_id and r.tenant_id != ctx.tenant_id:
            return error_response('Replacement not found', 404)

        if r.return_invoice_id:
            return error_response('Return invoice already exists for this replacement', 400)

        # Minimal required fields validation
        if not data.get('invoiceNumber') and not data.get('supplierInvoiceNumber'):
            return error_response('supplierInvoiceNumber or invoiceNumber required', 400)

        invoice_id = data.get('invoiceId') or f"RET-INV-{int(time.time() * 1000)}"
        r.return_invoice_id = invoice_id
        r.return_invoice_status = 'created'
        r.updated_at = datetime.utcnow()
        r.notes = (r.notes or '') + f"\nReturn invoice created: {invoice_id} supplier_invoice:{data.get('supplierInvoiceNumber')}"
        db.session.commit()
        
        return success_response(
            data={'invoiceId': invoice_id, 'replacement': r.to_dict()},
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        logger.exception('Create return invoice failed')
        return error_response(str(e), 500)


@replacements_bp.route('/return-invoices/<invoice_id>/send-to-gib', methods=['POST'])
@unified_access(resource='replacements', action='write')
def send_invoice_to_gib(ctx, invoice_id):
    """Mark return invoice as sent to GIB and trigger completion workflow."""
    try:
        # Locate replacement by invoice_id
        r = Replacement.query.filter_by(return_invoice_id=invoice_id).first()
        
        if not r:
            return error_response('Invoice or replacement not found', 404)
        
        # Tenant scoping check
        if ctx.tenant_id and r.tenant_id != ctx.tenant_id:
            return error_response('Invoice or replacement not found', 404)

        if r.gib_sent:
            return error_response('Invoice already sent to GIB', 400)

        # Generate minimal EFatura XML artifact and persist to outbox
        try:
            file_name, ettn, uid, xml_content = build_return_invoice_xml(r, invoice_meta=None)
            outbox = EFaturaOutbox(
                invoice_id=invoice_id,
                replacement_id=r.id,
                file_name=file_name,
                ettn=ettn,
                uuid=uid,
                xml_content=xml_content,
                status='pending'
            )
            db.session.add(outbox)

            # Inventory adjustments
            inventory_note = None
            user_id = ctx.user.id if ctx.user else (ctx.admin.id if ctx.admin else 'system')
            
            try:
                if r.new_device_id:
                    inv = db.session.get(InventoryItem, r.new_device_id)
                    new_info = r.new_device_info
                    if isinstance(new_info, str):
                        try:
                            new_info_parsed = json.loads(new_info)
                        except Exception:
                            new_info_parsed = {}
                    else:
                        new_info_parsed = new_info or {}

                    serial = new_info_parsed.get('serial') if isinstance(new_info_parsed, dict) else None
                    if inv:
                        if serial and inv.category == 'hearing_aid':
                            removed = inv.remove_serial_number(serial)
                            if not removed:
                                inventory_note = f"Serial {serial} not found in inventory {inv.id}; marked as sold but not in stock"
                        else:
                            success = inv.update_inventory(-1)
                            if not success:
                                inventory_note = f"Insufficient stock for inventory {inv.id}; could not decrement"
                        
                        # Stock Movement Log
                        if not inventory_note:
                            create_stock_movement(
                                inventory_id=inv.id,
                                movement_type="sale",
                                quantity=-1,
                                tenant_id=inv.tenant_id,
                                serial_number=serial if (serial and inv.category == 'hearing_aid') else None,
                                transaction_id=r.id,
                                created_by=user_id,
                                session=db.session
                            )

                        db.session.add(inv)
            except Exception as e:
                logger.warning('Inventory update failed: %s', e)
                inventory_note = (inventory_note or '') + f' | Inventory update error: {str(e)}'

            # Write outbox file
            outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'efatura_outbox'))
            try:
                write_outbox_file(outbox_dir, file_name, xml_content)
                outbox.status = 'sent'
            except Exception as wf_e:
                logger.warning('Failed to write outbox file: %s', wf_e)
                outbox.status = 'error'

            # Mark replacement as completed
            r.gib_sent = True
            r.gib_sent_date = datetime.utcnow()
            r.return_invoice_status = 'gib_sent'
            r.status = 'completed'
            r.updated_at = datetime.utcnow()
            if inventory_note:
                r.notes = (r.notes or '') + '\n' + inventory_note

            # Add timeline event to patient
            try:
                patient = db.session.get(Patient, r.patient_id)
                if patient:
                    custom = patient.custom_data_json or {}
                    timeline = custom.get('timeline', [])
                    event = {
                        'id': f"evt-{int(time.time() * 1000)}",
                        'type': 'return_invoice_sent',
                        'title': 'İade Faturası GİB Gönderildi',
                        'description': f'Return invoice {invoice_id} handed to integrator',
                        'timestamp': datetime.utcnow().isoformat(),
                        'user': 'system'
                    }
                    timeline.insert(0, event)
                    custom['timeline'] = timeline
                    patient.custom_data_json = custom

                    # Activity log entry
                    try:
                        log = ActivityLog(
                            user_id=user_id,
                            action='return_invoice_sent',
                            entity_type='patient',
                            entity_id=patient.id,
                            tenant_id=ctx.tenant_id or r.tenant_id
                        )
                        log.details_json = {'invoiceId': invoice_id, 'replacementId': r.id}
                        db.session.add(log)
                    except Exception as _e:
                        logger.warning('Could not add activity log: %s', _e)

                    db.session.add(patient)
            except Exception as e:
                logger.warning('Could not add timeline event: %s', e)

            db.session.commit()
            
            return success_response(
                data={'replacement': r.to_dict(), 'outbox': outbox.to_dict()},
                message='Invoice handed off to integrator (outbox) and marked as sent'
            )
        except Exception as e:
            db.session.rollback()
            logger.exception('Failed to generate/send EFatura outbox entry')
            return error_response(str(e), 500)
    except Exception as e:
        db.session.rollback()
        logger.exception('Send invoice to GIB failed')
        return error_response(str(e), 500)
