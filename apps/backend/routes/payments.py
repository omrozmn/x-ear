from flask import Blueprint, request, jsonify
from models.base import db
from models.sales import Sale, PaymentRecord
from models.promissory_note import PromissoryNote
from models.user import User
from models.patient import Patient
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/payment-records', methods=['POST'])
@jwt_required()
def create_payment_record():
    """Create a new payment record"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['patient_id', 'amount', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

        # Create payment record
        payment = PaymentRecord()
        payment.tenant_id = user.tenant_id
        payment.branch_id = data.get('branchId')
        payment.patient_id = data['patient_id']
        payment.sale_id = data.get('sale_id')
        payment.promissory_note_id = data.get('promissory_note_id')
        payment.amount = float(data['amount'])
        payment.payment_date = datetime.fromisoformat(data.get('payment_date', datetime.now().isoformat()).replace('Z', '+00:00'))
        
        if data.get('due_date'):
            payment.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        
        payment.payment_method = data['payment_method']
        payment.payment_type = data.get('payment_type', 'payment')
        payment.status = 'paid'  # Set status to 'paid' by default for successful payments
        payment.reference_number = data.get('reference_number')
        payment.notes = data.get('notes')

        db.session.add(payment)
        
        # Update sale if sale_id is provided
        if payment.sale_id:
            from models.sales import Sale
            from decimal import Decimal
            
            sale = db.session.query(Sale).filter_by(id=payment.sale_id).first()
            if sale:
                # Calculate total paid amount for this sale (including this new payment)
                existing_payments = PaymentRecord.query.filter_by(
                    sale_id=payment.sale_id,
                    status='paid'
                ).all()
                total_paid = sum(float(p.amount) for p in existing_payments) + float(payment.amount)
                
                # Update sale with new paid amount
                sale.paid_amount = Decimal(str(total_paid))
                
                # Update sale status based on paid amount
                sale_total = float(sale.total_amount or sale.final_amount or 0)
                if total_paid >= sale_total - 0.01:  # Allow small rounding differences
                    sale.status = 'paid'
                elif total_paid > 0:
                    sale.status = 'partial'
                
                db.session.add(sale)
                logger.info(f"Updated sale {sale.id}: paid_amount={total_paid}, status={sale.status}")
        
        db.session.commit()
        logger.info(f"Payment record created: {payment.id}, amount={payment.amount}")

        # Log to activity
        from app import log_activity
        log_activity(user.id, 'create', 'payment_record', payment.id, {
            'patientId': payment.patient_id,
            'amount': float(payment.amount),
            'method': payment.payment_method
        }, request, tenant_id=user.tenant_id)

        return jsonify({
            "success": True,
            "data": payment.to_dict(),
            "message": "Payment record created successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create payment record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/patients/<patient_id>/payment-records', methods=['GET'])
@jwt_required()
def get_patient_payment_records(patient_id):
    """Get all payment records for a patient"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))

        query = PaymentRecord.query.filter_by(
            patient_id=patient_id,
            tenant_id=user.tenant_id
        )

        # If user is admin (branch admin), filter by assigned branches
        if user.role == 'admin':
            user_branch_ids = [b.id for b in user.branches]
            if user_branch_ids:
                query = query.filter(PaymentRecord.branch_id.in_(user_branch_ids))
            else:
                return jsonify({
                    "success": True,
                    "data": [],
                    "meta": {
                        "total": 0,
                        "page": page,
                        "perPage": per_page,
                        "totalPages": 0
                    }
                })

        payment_records = query.order_by(PaymentRecord.payment_date.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "success": True,
            "data": [record.to_dict() for record in payment_records.items],
            "meta": {
                "total": payment_records.total,
                "page": page,
                "perPage": per_page,
                "totalPages": payment_records.pages
            }
        })

    except Exception as e:
        logger.error(f"Get patient payment records error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/payment-records/<record_id>', methods=['PATCH'])
@jwt_required()
def update_payment_record(record_id):
    """Update a payment record"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        payment = db.session.get(PaymentRecord, record_id)
        
        if not payment or payment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Payment record not found"}), 404

        # Update allowed fields
        if 'status' in data:
            payment.status = data['status']
        if 'notes' in data:
            payment.notes = data['notes']
        if 'paid_date' in data and data['paid_date']:
            payment.payment_date = datetime.fromisoformat(data['paid_date'].replace('Z', '+00:00'))

        db.session.commit()

        return jsonify({
            "success": True,
            "data": payment.to_dict(),
            "message": "Payment record updated successfully"
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update payment record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/patients/<patient_id>/promissory-notes', methods=['GET'])
@jwt_required()
def get_patient_promissory_notes(patient_id):
    """Get all promissory notes for a patient"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        sale_id = request.args.get('sale_id')  # Optional: filter by sale_id
        
        query = PromissoryNote.query.filter_by(patient_id=patient_id, tenant_id=user.tenant_id)
        
        if sale_id:
            query = query.filter_by(sale_id=sale_id)
        
        notes = query.order_by(PromissoryNote.due_date.asc()).all()
        
        return jsonify({
            "success": True,
            "data": [note.to_dict() for note in notes],
            "count": len(notes)
        })

    except Exception as e:
        logger.error(f"Get patient promissory notes error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/promissory-notes', methods=['POST'])
@jwt_required()
def create_promissory_notes():
    """Create multiple promissory notes"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['patient_id', 'notes']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

        notes_data = data['notes']
        if not isinstance(notes_data, list) or len(notes_data) == 0:
            return jsonify({"success": False, "error": "Notes must be a non-empty list"}), 400

        created_notes = []
        
        for note_data in notes_data:
            note = PromissoryNote()
            note.tenant_id = user.tenant_id
            note.patient_id = data['patient_id']
            note.sale_id = data.get('sale_id')
            note.note_number = note_data['note_number']
            note.total_notes = len(notes_data)
            note.amount = float(note_data['amount'])
            note.total_amount = float(data.get('total_amount', 0))
            
            # Parse dates
            note.issue_date = datetime.fromisoformat(note_data['issue_date'].replace('Z', '+00:00'))
            note.due_date = datetime.fromisoformat(note_data['due_date'].replace('Z', '+00:00'))
            
            # Debtor information
            note.debtor_name = note_data['debtor_name']
            note.debtor_tc = note_data.get('debtor_tc')
            note.debtor_address = note_data.get('debtor_address')
            note.debtor_tax_office = note_data.get('debtor_tax_office')
            note.debtor_phone = note_data.get('debtor_phone')
            
            # Guarantor information (optional)
            note.has_guarantor = note_data.get('has_guarantor', False)
            if note.has_guarantor:
                note.guarantor_name = note_data.get('guarantor_name')
                note.guarantor_tc = note_data.get('guarantor_tc')
                note.guarantor_address = note_data.get('guarantor_address')
                note.guarantor_phone = note_data.get('guarantor_phone')
            
            # Legal details
            note.authorized_court = note_data.get('authorized_court', 'İstanbul (Çağlayan)')
            
            # Document reference
            note.document_id = note_data.get('document_id')
            note.file_name = note_data.get('file_name')
            note.notes = note_data.get('notes')
            
            note.status = 'active'
            
            db.session.add(note)
            created_notes.append(note)
        
        db.session.commit()

        # Log to activity
        from app import log_activity
        log_activity(user.id, 'create', 'promissory_notes', f"batch_{len(created_notes)}", {
            'patientId': data['patient_id'],
            'saleId': data.get('sale_id'),
            'count': len(created_notes),
            'totalAmount': float(data.get('total_amount', 0))
        }, request, tenant_id=user.tenant_id)

        return jsonify({
            "success": True,
            "data": [note.to_dict() for note in created_notes],
            "message": f"{len(created_notes)} promissory notes created successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create promissory notes error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/promissory-notes/<note_id>', methods=['PATCH'])
@jwt_required()
def update_promissory_note(note_id):
    """Update a promissory note"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        note = db.session.get(PromissoryNote, note_id)
        
        if not note or note.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Promissory note not found"}), 404

        # Update allowed fields
        if 'status' in data:
            note.status = data['status']
        if 'paid_date' in data and data['paid_date']:
            note.paid_date = datetime.fromisoformat(data['paid_date'].replace('Z', '+00:00'))
        if 'notes' in data:
            note.notes = data['notes']

        db.session.commit()

        return jsonify({
            "success": True,
            "data": note.to_dict(),
            "message": "Promissory note updated successfully"
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update promissory note error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/promissory-notes/<note_id>/collect', methods=['POST'])
@jwt_required()
def collect_promissory_note(note_id):
    """Collect payment for a promissory note (full or partial)"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        from decimal import Decimal
        
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        # Get the promissory note
        note = db.session.get(PromissoryNote, note_id)
        if not note or note.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Promissory note not found"}), 404

        # Validate amount
        payment_amount = float(data.get('amount', 0))
        if payment_amount <= 0:
            return jsonify({"success": False, "error": "Invalid payment amount"}), 400

        # Calculate remaining amount
        note_amount = float(note.amount)
        paid_amount = float(note.paid_amount or 0)
        remaining = note_amount - paid_amount

        if payment_amount > remaining + 0.01:  # Allow small rounding differences
            return jsonify({"success": False, "error": f"Payment amount ({payment_amount}) exceeds remaining balance ({remaining})"}), 400

        # Create payment record
        payment = PaymentRecord()
        payment.tenant_id = user.tenant_id
        payment.patient_id = note.patient_id
        payment.sale_id = note.sale_id
        payment.promissory_note_id = note_id
        payment.amount = Decimal(str(payment_amount))
        payment.payment_date = datetime.fromisoformat(data.get('payment_date', datetime.now().isoformat()).replace('Z', '+00:00'))
        payment.payment_method = data.get('payment_method', 'cash')
        payment.payment_type = 'promissory_note'
        payment.status = 'paid'
        payment.reference_number = data.get('reference_number', f'SENET-{note_id}')
        payment.notes = data.get('notes')

        db.session.add(payment)

        # Update promissory note paid amount
        new_paid_amount = paid_amount + payment_amount
        note.paid_amount = Decimal(str(new_paid_amount))

        # Update note status
        if new_paid_amount >= note_amount - 0.01:  # Fully paid (allow small rounding differences)
            note.status = 'paid'
            note.paid_date = payment.payment_date
        else:  # Partially paid
            note.status = 'partial'

        # Update associated sale if exists
        if note.sale_id:
            sale = db.session.get(Sale, note.sale_id)
            if sale:
                # Get all payments for this sale
                sale_payments = PaymentRecord.query.filter_by(
                    sale_id=note.sale_id,
                    status='paid'
                ).all()
                
                # Calculate total paid including this new payment
                total_sale_paid = sum(float(p.amount) for p in sale_payments) + payment_amount
                sale.paid_amount = Decimal(str(total_sale_paid))
                
                # Update sale status
                sale_total = float(sale.total_amount or sale.final_amount or 0)
                if total_sale_paid >= sale_total - 0.01:
                    sale.status = 'paid'
                elif total_sale_paid > 0:
                    sale.status = 'partial'
                
                db.session.add(sale)
                logger.info(f"Updated sale {sale.id}: paid_amount={total_sale_paid}, status={sale.status}")

        db.session.commit()
        logger.info(f"Promissory note {note_id} payment collected: {payment_amount} TL, new status: {note.status}")

        # Log to activity
        from app import log_activity
        log_activity(user.id, 'collect', 'promissory_note', note_id, {
            'amount': payment_amount,
            'method': payment.payment_method,
            'status': note.status
        }, request, tenant_id=user.tenant_id)

        return jsonify({
            "success": True,
            "data": {
                "note": note.to_dict(),
                "payment": payment.to_dict()
            },
            "message": "Payment collected successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Collect promissory note error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@payments_bp.route('/sales/<sale_id>/promissory-notes', methods=['GET'])
@jwt_required()
def get_sale_promissory_notes(sale_id):
    """Get all promissory notes for a specific sale"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        notes = PromissoryNote.query.filter_by(sale_id=sale_id, tenant_id=user.tenant_id)\
            .order_by(PromissoryNote.note_number.asc()).all()
        
        return jsonify({
            "success": True,
            "data": [note.to_dict() for note in notes],
            "count": len(notes)
        })

    except Exception as e:
        logger.error(f"Get sale promissory notes error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update payment record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
