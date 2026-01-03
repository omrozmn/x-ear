"""
Cash Records Management
-----------------------
Cash register records for cashflow with unified access control.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from models.base import db
from models.patient import Patient
from models.sales import PaymentRecord
import logging

from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query, get_or_404_scoped

logger = logging.getLogger(__name__)

cash_records_bp = Blueprint('cash_records', __name__)


@cash_records_bp.route('/cash-records', methods=['GET'])
@unified_access(resource='cash_records', action='read')
def get_cash_records(ctx):
    """Return cash register records - Unified Access"""
    try:
        limit = int(request.args.get('limit', '200'))
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')

        query = tenant_scoped_query(ctx, PaymentRecord)

        if status:
            query = query.filter(PaymentRecord.status == status)
        if start_date:
            try:
                sd = datetime.fromisoformat(start_date)
                if sd.tzinfo is None:
                    sd = sd.replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(PaymentRecord.payment_date >= sd)
            except Exception:
                pass
        if end_date:
            try:
                ed = datetime.fromisoformat(end_date)
                if ed.tzinfo is None:
                    ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = query.filter(PaymentRecord.payment_date <= ed)
            except Exception:
                pass

        query = query.order_by(PaymentRecord.payment_date.desc())
        rows = query.limit(limit).all()

        def derive_record_type(notes: str) -> str:
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

        patient_ids = {r.patient_id for r in rows if r.patient_id}
        patients_map = {}
        if patient_ids:
            patients = Patient.query.filter(Patient.id.in_(patient_ids)).all()
            patients_map = {p.id: p for p in patients}

        records = []
        for r in rows:
            try:
                patient = patients_map.get(r.patient_id) if r.patient_id else None
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
            except Exception as inner_e:
                logger.error(f"Error processing cash record {getattr(r, 'id', 'unknown')}: {inner_e}")
                continue

        if search:
            search_term = search.lower()
            records = [r for r in records if 
                      search_term in (r['patientName'] or '').lower() or 
                      search_term in (r['description'] or '').lower()]

        return jsonify({'success': True, 'data': records, 'count': len(records)})

    except Exception as e:
        logger.error(f"Error fetching cash records: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@cash_records_bp.route('/cash-records', methods=['POST'])
@unified_access(resource='cash_records', action='write')
def create_cash_record(ctx):
    """Create a new cash record - Unified Access"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        if not data.get('transactionType'):
            return jsonify({"success": False, "error": "Transaction type is required"}), 400
        
        if not data.get('amount'):
            return jsonify({"success": False, "error": "Amount is required"}), 400

        tenant_id = ctx.tenant_id
        if not tenant_id:
            tenant_id = data.get('tenant_id')
            # For super admin without explicit tenant_id, try to use first allowed tenant
            if not tenant_id and ctx.is_super_admin:
                if ctx.allowed_tenants:
                    tenant_id = ctx.allowed_tenants[0]
                else:
                    # Super admin can create records without tenant for global records
                    tenant_id = None
            elif not tenant_id:
                return jsonify({"success": False, "error": "tenant_id is required for this operation"}), 400


        payment = PaymentRecord()
        
        patient_id = None
        if data.get('patientName') and data['patientName'].strip():
            patient_name = data['patientName'].strip()
            patient = tenant_scoped_query(ctx, Patient).filter(
                (Patient.first_name + ' ' + Patient.last_name).like(f"%{patient_name}%")
            ).first()
            if patient:
                patient_id = patient.id
            else:
                patient = tenant_scoped_query(ctx, Patient).filter(
                    db.or_(
                        Patient.first_name.like(f"%{patient_name}%"),
                        Patient.last_name.like(f"%{patient_name}%")
                    )
                ).first()
                if patient:
                    patient_id = patient.id
        
        if data.get('patientId'):
            patient_id = data['patientId']
        
        payment.patient_id = patient_id
        payment.tenant_id = tenant_id

        try:
            amount = float(data['amount'])
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid amount format"}), 400

        if data['transactionType'] == 'expense':
            amount = -abs(amount)
        payment.amount = amount
        
        if data.get('date'):
            try:
                payment.payment_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except:
                payment.payment_date = datetime.now()
        else:
            payment.payment_date = datetime.now()
        
        payment.payment_method = 'cash'
        payment.payment_type = 'payment'
        payment.status = 'paid'
        payment.notes = f"{data.get('recordType', 'diger')} - {data.get('description', '')}"
        
        if data.get('id'):
            payment.id = data['id']

        db.session.add(payment)
        db.session.commit()

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

        logger.info(f"Cash record created: {payment.id} by {ctx.principal_id}")

        return jsonify({
            "success": True,
            "data": record,
            "message": "Cash record created successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create cash record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@cash_records_bp.route('/cash-records/<record_id>', methods=['DELETE'])
@unified_access(resource='cash_records', action='delete')
def delete_cash_record(ctx, record_id):
    """Delete a cash record - Unified Access"""
    try:
        payment = get_or_404_scoped(ctx, PaymentRecord, record_id)
        if not payment:
            return jsonify({"success": False, "error": "Record not found"}), 404
        
        db.session.delete(payment)
        db.session.commit()
        
        logger.info(f"Cash record deleted: {record_id} by {ctx.principal_id}")
        
        return jsonify({
            "success": True,
            "message": "Cash record deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete cash record error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500