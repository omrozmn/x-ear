from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.appointment import Appointment
from models.device import Device
from models.user import User
from datetime import datetime, timedelta
from sqlalchemy.orm import load_only
import logging
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from models.enums import AppointmentStatus

logger = logging.getLogger(__name__)

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        patient_id = request.args.get('patient_id')
        status = request.args.get('status')
        view = request.args.get('view', 'month')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Appointment.query.filter_by(tenant_id=user.tenant_id)

        if start_date:
            # Interpret date-only strings as start of day (inclusive)
            if 'T' in start_date:
                start_dt = datetime.fromisoformat(start_date)
            else:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)
        if end_date:
            # Interpret date-only strings as end of day (inclusive)
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                # make the end_date inclusive for the entire day
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        # Handle status filter with automatic conversion
        if status:
            try:
                # Try to convert status to enum if it's a string
                if isinstance(status, str):
                    status_enum = AppointmentStatus.from_legacy(status)
                    query = query.filter_by(status=status_enum)
                else:
                    query = query.filter_by(status=status)
            except (ValueError, AttributeError):
                # If conversion fails, skip the filter
                pass

        query = query.order_by(Appointment.date)
        appointments = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "success": True,
            "data": [apt.to_dict() for apt in appointments.items],
            "meta": {
                "total": appointments.total,
                "page": page,
                "perPage": per_page,
                "totalPages": appointments.pages
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get appointments error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments', methods=['POST'])
@jwt_required()
@idempotent(methods=['POST'])
def create_appointment():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        required_fields = ['patientId', 'date', 'time']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}", "timestamp": datetime.now().isoformat()}), 400

        if 'id' not in data:
            data['id'] = f"apt_{datetime.now().strftime('%d%m%Y_%H%M%S')}_{str(hash(data['patientId']))[-6:]}"

        appointment = Appointment()
        appointment.id = data['id']
        appointment.patient_id = data['patientId']
        appointment.clinician_id = data.get('clinicianId')
        appointment.branch_id = data.get('branchId')
        appointment.tenant_id = user.tenant_id
        # Parse date without timezone conversion to avoid day shift
        date_str = data['date']
        if 'T' in date_str:
            date_str = date_str.split('T')[0]  # Remove time part if present
        appointment.date = datetime.strptime(date_str, '%Y-%m-%d')
        appointment.time = data['time']
        appointment.duration = data.get('duration', 30)
        appointment.appointment_type = data.get('type', 'consultation')
        
        # Handle status properly - convert string to enum using from_legacy
        status_value = data.get('status', 'SCHEDULED')
        if isinstance(status_value, str):
            # Use from_legacy to handle both uppercase and lowercase values
            appointment.status = AppointmentStatus.from_legacy(status_value)
        else:
            appointment.status = status_value or AppointmentStatus.SCHEDULED
            
        appointment.notes = data.get('notes')

        db.session.add(appointment)
        db.session.commit()

        from app import log_activity
        log_activity('system', 'create', 'appointment', appointment.id, {
            'patientId': appointment.patient_id,
            'date': appointment.date.isoformat(),
            'time': appointment.time,
            'type': appointment.appointment_type
        }, request)

        resp = make_response(jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment created successfully", "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/appointments/{appointment.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create appointment error: {str(e)}")
        # Handle integrity errors for idempotency
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            # If it's a duplicate appointment, try to find and return existing one
            appointment_id = data.get('id')
            if appointment_id:
                existing_appointment = Appointment.query.filter_by(id=appointment_id, tenant_id=user.tenant_id).first()
                if existing_appointment:
                    return jsonify({"success": True, "data": existing_appointment.to_dict(), "message": "Appointment already exists", "timestamp": datetime.now().isoformat()}), 200
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/<appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or appointment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Appointment not found", "timestamp": datetime.now().isoformat()}), 404
        return jsonify({"success": True, "data": appointment.to_dict(), "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logger.error(f"Get appointment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/<appointment_id>', methods=['PUT','PATCH'])
@jwt_required()
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Appointment, id_param='appointment_id')
@with_transaction
def update_appointment(appointment_id):
    """Update appointment (PUT full update or PATCH partial update)"""
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or appointment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Appointment not found", "timestamp": datetime.now().isoformat()}), 404

        if 'date' in data:
            # Parse date without timezone conversion to avoid day shift
            date_str = data['date']
            if 'T' in date_str:
                date_str = date_str.split('T')[0]  # Remove time part if present
            appointment.date = datetime.strptime(date_str, '%Y-%m-%d')
        if 'time' in data:
            appointment.time = data['time']
        if 'duration' in data:
            appointment.duration = data['duration']
        if 'type' in data:
            appointment.appointment_type = data['type']
        if 'status' in data:
            appointment.status = data['status']
        if 'notes' in data:
            appointment.notes = data['notes']
        if 'clinicianId' in data:
            appointment.clinician_id = data['clinicianId']
        if 'branchId' in data:
            appointment.branch_id = data['branchId']

        db.session.commit()

        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment updated successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update appointment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/<appointment_id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        appt = db.session.get(Appointment, appointment_id)
        if not appt or appt.tenant_id != user.tenant_id:
            return jsonify({'success': False, 'error': 'Appointment not found'}), 404
        db.session.delete(appt)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Appointment deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete appointment error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@appointments_bp.route('/appointments/<appointment_id>/reschedule', methods=['POST'])
@jwt_required()
def reschedule_appointment(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        data = request.get_json()
        if not data or 'date' not in data or 'time' not in data:
            return jsonify({"success": False, "error": "New date and time required", "timestamp": datetime.now().isoformat()}), 400

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or appointment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Appointment not found", "timestamp": datetime.now().isoformat()}), 404

        # Parse date without timezone conversion to avoid day shift
        date_str = data['date']
        if 'T' in date_str:
            date_str = date_str.split('T')[0]  # Remove time part if present
        appointment.date = datetime.strptime(date_str, '%Y-%m-%d')
        appointment.time = data['time']
        appointment.status = 'rescheduled'

        db.session.commit()

        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment rescheduled successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reschedule appointment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/<appointment_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or appointment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Appointment not found", "timestamp": datetime.now().isoformat()}), 404

        appointment.status = 'cancelled'
        db.session.commit()

        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment cancelled successfully", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Cancel appointment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/<appointment_id>/complete', methods=['POST'])
@jwt_required()
def complete_appointment(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or appointment.tenant_id != user.tenant_id:
            return jsonify({"success": False, "error": "Appointment not found", "timestamp": datetime.now().isoformat()}), 404

        from models.enums import AppointmentStatus
        appointment.status = AppointmentStatus.COMPLETED
        db.session.commit()

        return jsonify({"success": True, "data": appointment.to_dict(), "message": "Appointment marked as completed", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Complete appointment error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@appointments_bp.route('/appointments/availability', methods=['GET'])
@jwt_required()
def get_availability():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        date = request.args.get('date')
        duration = int(request.args.get('duration', 30))

        if not date:
            return jsonify({"success": False, "error": "Date parameter required", "timestamp": datetime.now().isoformat()}), 400

        target_date = datetime.fromisoformat(date).date()
        appointments = Appointment.query.filter(
            db.func.date(Appointment.date) == target_date,
            Appointment.status.in_(['scheduled', 'confirmed']),
            Appointment.tenant_id == user.tenant_id
        ).all()

        time_slots = []
        for hour in range(9, 18):
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                time_slots.append(slot_time)

        occupied_slots = set()
        for apt in appointments:
            apt_hour = int(apt.time.split(':')[0])
            apt_minute = int(apt.time.split(':')[1])
            apt_duration = apt.duration

            current_minute = apt_hour * 60 + apt_minute
            end_minute = current_minute + apt_duration

            slot_minute = 9 * 60  # 9 AM
            while slot_minute < 18 * 60:  # Until 6 PM
                slot_end_minute = slot_minute + 30
                if current_minute < slot_end_minute and end_minute > slot_minute:
                    slot_hour = slot_minute // 60
                    slot_min = slot_minute % 60
                    occupied_slots.add(f"{slot_hour:02d}:{slot_min:02d}")
                slot_minute += 30

        available_slots = [slot for slot in time_slots if slot not in occupied_slots]

        return jsonify({
            "success": True,
            "availableSlots": available_slots,
            "occupiedSlots": list(occupied_slots),
            "date": date,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Get availability error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@appointments_bp.route('/appointments/list', methods=['GET'])
@jwt_required()
def list_appointments():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 401

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        query = Appointment.query.filter_by(tenant_id=user.tenant_id)

        # Apply filters based on query parameters
        patient_id = request.args.get('patient_id')
        if patient_id:
            query = query.filter_by(patient_id=patient_id)

        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)

        start_date = request.args.get('start_date')
        if start_date:
            if 'T' in start_date:
                start_dt = datetime.fromisoformat(start_date)
            else:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)

        end_date = request.args.get('end_date')
        if end_date:
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)

        appointments = query.order_by(Appointment.date.desc()).paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "success": True,
            "data": [apt.to_dict() for apt in appointments.items],
            "meta": {
                "total": appointments.total,
                "page": page,
                "perPage": per_page,
                "totalPages": appointments.pages
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        db.session.rollback()
        logger = logging.getLogger(__name__)
        logger.exception('List appointments failed')
        return jsonify({'success': False, 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500
