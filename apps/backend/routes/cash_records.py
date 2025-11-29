from flask import Blueprint, request, jsonify
from datetime import datetime
from models.base import db
from models.patient import Patient
from models.sales import PaymentRecord
import logging
from models.tenant import Tenant
from flask_jwt_extended import get_jwt_identity, jwt_required
from models.user import User

logger = logging.getLogger(__name__)

cash_records_bp = Blueprint('cash_records', __name__)


@cash_records_bp.route('/cash-records', methods=['GET'])
def get_cash_records():
    """Return cash register records for cashflow.html consumption.

    Maps PaymentRecord rows to a simplified format:
    {
      id, date, transactionType, recordType, patientId, patientName, amount, description
    }
    Optional query params:
      - limit: max number of rows (default 200)
      - start_date, end_date: ISO date filters
      - status: filter by payment status (paid/pending/partial)
    """
    try:
        limit = int(request.args.get('limit', '200'))
        status = request.args.get('status')  # optional
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')  # optional search term

        query = PaymentRecord.query
        if status:
            query = query.filter(PaymentRecord.status == status)
        if start_date:
            try:
                # Parse start date and set to beginning of day
                sd = datetime.fromisoformat(start_date)
                if sd.tzinfo is None:
                    # If no timezone info, treat as local date
                    sd = sd.replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(PaymentRecord.payment_date >= sd)
            except Exception:
                pass
        if end_date:
            try:
                # Parse end date and set to end of day to include all records from that day
                ed = datetime.fromisoformat(end_date)
                if ed.tzinfo is None:
                    # If no timezone info, treat as local date and set to end of day
                    ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = query.filter(PaymentRecord.payment_date <= ed)
            except Exception:
                pass

        query = query.order_by(PaymentRecord.payment_date.desc())
        rows = query.limit(limit).all()

        def derive_record_type(notes: str) -> str:
            """Map notes to a simple record type used by cashflow.html."""
            n = (notes or '').lower()
            if 'pil' in n or 'batarya' in n:
                return 'pil'
            if 'filtre' in n:
                return 'filtre'
            if 'tamir' in n or 'onarım' in n:
                return 'tamir'
            if 'kaparo' in n or 'kapora' in n:
                return 'kaparo'
            if 'kalıp' in n:
                return 'kalip'
            if 'teslim' in n:
                return 'teslimat'
            return 'diger'

        records = []
        for r in rows:
            patient = db.session.get(Patient, r.patient_id) if r.patient_id else None
            patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''

            record = {
                'id': r.id,
                'date': (r.payment_date.isoformat() if r.payment_date else datetime.now().isoformat()),
                'transactionType': 'income' if (r.amount or 0) >= 0 else 'expense',
                'recordType': derive_record_type(r.notes or ''),
                'patientId': r.patient_id,
                'patientName': patient_name,
                'amount': float(r.amount or 0),
                'description': r.notes or ''
            }
            records.append(record)

        # Apply search filter after processing records (for patient names and descriptions)
        if search:
            search_term = search.lower()
            records = [r for r in records if 
                      search_term in (r['patientName'] or '').lower() or 
                      search_term in (r['description'] or '').lower()]

        return jsonify({'success': True, 'data': records, 'count': len(records)})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@cash_records_bp.route('/cash-records', methods=['POST'])
@jwt_required()
def create_cash_record():
    """Create a new cash record from cashflow.html form submission."""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        # Validate required fields
        if not data.get('transactionType'):
            return jsonify({"success": False, "error": "Transaction type is required"}), 400
        
        if not data.get('amount'):
            return jsonify({"success": False, "error": "Amount is required"}), 400

        # Create payment record
        payment = PaymentRecord()
        
        # Set patient if provided, otherwise create a default "Genel" patient or use None
        patient_id = None
        if data.get('patientName') and data['patientName'].strip():
            # Try to find patient by name
            patient_name = data['patientName'].strip()
            patient = Patient.query.filter(
                (Patient.first_name + ' ' + Patient.last_name).like(f"%{patient_name}%"),
                Patient.tenant_id == user.tenant_id
            ).first()
            if patient:
                patient_id = patient.id
            else:
                # Try to find by first name or last name separately
                patient = Patient.query.filter(
                    db.or_(
                        Patient.first_name.like(f"%{patient_name}%"),
                        Patient.last_name.like(f"%{patient_name}%")
                    ),
                    Patient.tenant_id == user.tenant_id
                ).first()
                if patient:
                    patient_id = patient.id
        
        # If we have a patientId directly provided, use it
        if data.get('patientId'):
            patient_id = data['patientId']
        
        # For cash records without a specific patient, we'll allow null patient_id
        # but ensure the database schema allows this
        payment.patient_id = patient_id

        # Set tenant_id from user
        payment.tenant_id = user.tenant_id

        # Set amount (negative for expenses)
        try:
            amount = float(data['amount'])
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid amount format"}), 400

        if data['transactionType'] == 'expense':
            amount = -abs(amount)
        payment.amount = amount
        
        # Set payment date
        if data.get('date'):
            try:
                payment.payment_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except:
                payment.payment_date = datetime.now()
        else:
            payment.payment_date = datetime.now()
        
        # Set other fields
        payment.payment_method = 'cash'  # Default for cash records
        payment.payment_type = 'payment'
        payment.status = 'paid'
        payment.notes = f"{data.get('recordType', 'diger')} - {data.get('description', '')}"
        
        # Generate ID if not provided
        if data.get('id'):
            payment.id = data['id']

        db.session.add(payment)
        db.session.commit()

        # Return the created record in the same format as GET
        patient = db.session.get(Patient, payment.patient_id) if payment.patient_id else None
        patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''

        record = {
            'id': payment.id,
            'date': payment.payment_date.isoformat(),
            'transactionType': data['transactionType'],
            'recordType': data.get('recordType', 'diger'),
            'patientId': payment.patient_id,
            'patientName': patient_name,
            'amount': float(payment.amount),
            'description': data.get('description', '')
        }

        return jsonify({
            "success": True,
            "data": record,
            "message": "Cash record created successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create cash record error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@cash_records_bp.route('/cash-records/<record_id>', methods=['DELETE'])
@jwt_required()
def delete_cash_record(record_id):
    """Delete a cash record by ID."""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        payment = db.session.get(PaymentRecord, record_id)
        if not payment:
            return jsonify({"success": False, "error": "Record not found"}), 404
        
        if payment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Unauthorized"}), 403
        
        db.session.delete(payment)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Cash record deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete cash record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500