from flask import Blueprint, request, jsonify, send_file
from models.base import db
from models.invoice import Invoice
from models.user import ActivityLog
from models.efatura_outbox import EFaturaOutbox
from utils.efatura import build_return_invoice_xml, write_outbox_file, generate_simple_ettn
from datetime import datetime
import os
from uuid import uuid4

invoices_actions_bp = Blueprint('invoices_actions', __name__, url_prefix='/api')


@invoices_actions_bp.route('/invoices/<int:invoice_id>/issue', methods=['POST'])
def issue_invoice(invoice_id):
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        if getattr(invoice, 'sent_to_gib', False):
            return jsonify({'success': False, 'error': 'Invoice already sent to GİB'}), 400

        # Build minimal xml using invoice metadata
        invoice_meta = {
            'invoiceNumber': getattr(invoice, 'invoice_number', str(invoice.id)),
            'items': getattr(invoice, 'items', [])
        }

        file_name, ettn, uid, xml_content = build_return_invoice_xml(type('X', (), {'id': invoice.id}), invoice_meta=invoice_meta)

        outbox = EFaturaOutbox(
            invoice_id=str(invoice.id),
            file_name=file_name,
            ettn=ettn,
            uuid=uid,
            xml_content=xml_content,
            status='pending'
        )
        db.session.add(outbox)

        # Attempt to write outbox file to instance folder (non-fatal)
        outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance', 'efatura_outbox'))
        try:
            write_outbox_file(outbox_dir, file_name, xml_content)
            outbox.status = 'sent'
        except Exception:
            outbox.status = 'error'

        # Mark invoice metadata
        invoice.sent_to_gib = True
        invoice.sent_to_gib_at = datetime.utcnow()
        invoice.status = 'sent'
        invoice.updated_at = datetime.utcnow()

        # Activity log
        try:
            log = ActivityLog(user_id=request.headers.get('X-User-ID', 'system'), action='invoice_issued', entity_type='invoice', entity_id=str(invoice.id))
            db.session.add(log)
        except Exception:
            pass

        db.session.commit()

        return jsonify({'success': True, 'data': {'invoice': invoice.to_dict(), 'outbox': outbox.to_dict()}}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_actions_bp.route('/invoices/<int:invoice_id>/copy', methods=['POST'])
def copy_invoice(invoice_id):
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        # Create a lightweight copy record
        new_inv = Invoice()
        # copy relevant fields conservatively
        new_inv.invoice_number = f"{getattr(invoice, 'invoice_number', 'COPY')}-COPY-{int(datetime.utcnow().timestamp())}"
        new_inv.patient_id = invoice.patient_id
        new_inv.patient_name = getattr(invoice, 'patient_name', None)
        new_inv.device_price = getattr(invoice, 'device_price', getattr(invoice, 'total_amount', 0))
        new_inv.status = 'draft'
        new_inv.notes = (getattr(invoice, 'notes', '') or '') + '\n[copy created]'
        new_inv.created_at = datetime.utcnow()
        new_inv.updated_at = datetime.utcnow()

        db.session.add(new_inv)
        db.session.commit()

        return jsonify({'success': True, 'data': new_inv.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_actions_bp.route('/invoices/<int:invoice_id>/copy-cancel', methods=['POST'])
def copy_invoice_cancel(invoice_id):
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404

        # Create copy
        copy_inv = Invoice()
        copy_inv.invoice_number = f"{getattr(invoice, 'invoice_number', 'COPY')}-COPY-{int(datetime.utcnow().timestamp())}"
        copy_inv.patient_id = invoice.patient_id
        copy_inv.status = 'draft'
        copy_inv.created_at = datetime.utcnow()
        copy_inv.updated_at = datetime.utcnow()
        db.session.add(copy_inv)
        db.session.flush()

        # Create cancellation draft
        cancel_inv = Invoice()
        cancel_inv.invoice_number = f"CNL-{copy_inv.invoice_number}"
        cancel_inv.patient_id = copy_inv.patient_id
        cancel_inv.status = 'draft'
        cancel_inv.notes = f"Cancellation draft for {copy_inv.invoice_number}"
        cancel_inv.created_at = datetime.utcnow()
        cancel_inv.updated_at = datetime.utcnow()
        db.session.add(cancel_inv)

        db.session.commit()

        return jsonify({'success': True, 'data': {'copy': copy_inv.to_dict(), 'cancellation': cancel_inv.to_dict()}}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_actions_bp.route('/invoices/<int:invoice_id>/pdf', methods=['GET'])
def serve_invoice_pdf(invoice_id):
    try:
        # Serve example PDF from docs/examples for now
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'examples'))
        candidate = os.path.join(base, 'hasta-müşteri satış fatura.pdf')
        if not os.path.exists(candidate):
            return jsonify({'success': False, 'error': 'Example PDF not available'}), 404
        return send_file(candidate, mimetype='application/pdf', as_attachment=False)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@invoices_actions_bp.route('/invoices/<int:invoice_id>/shipping-pdf', methods=['GET'])
def serve_shipping_pdf(invoice_id):
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'examples'))
        candidate = os.path.join(base, 'kargo fişi.pdf')
        if not os.path.exists(candidate):
            return jsonify({'success': False, 'error': 'Shipping PDF not available'}), 404
        return send_file(candidate, mimetype='application/pdf', as_attachment=False)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
