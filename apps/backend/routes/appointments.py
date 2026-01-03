from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.appointment import Appointment
from models.enums import AppointmentStatus
from datetime import datetime, timedelta
import logging
import traceback
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.decorators import unified_access
from utils.response import success_response, error_response

logger = logging.getLogger(__name__)

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/appointments', methods=['GET'])
@unified_access(resource='appointments', action='read')
def get_appointments(ctx):
    """Get appointments with filtering and pagination"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        patient_id = request.args.get('patient_id')
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Appointment.query
        
        # Apply tenant scope
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)

        # Date filters
        if start_date:
            start_dt = datetime.fromisoformat(start_date) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)
        if end_date:
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)
        
        # Other filters
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if status:
            try:
                status_enum = AppointmentStatus.from_legacy(status) if isinstance(status, str) else status
                query = query.filter_by(status=status_enum)
            except (ValueError, AttributeError):
                pass

        query = query.order_by(Appointment.date)
        appointments = query.paginate(page=page, per_page=per_page, error_out=False)

        return success_response(
            data=[apt.to_dict() for apt in appointments.items],
            meta={
                "total": appointments.total,
                "page": page,
                "perPage": per_page,
                "totalPages": appointments.pages,
                "tenant_scope": ctx.tenant_id
            }
        )
    except Exception as e:
        logger.error(f"Get appointments error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments', methods=['POST'])
@unified_access(resource='appointments', action='create')
@idempotent(methods=['POST'])
def create_appointment(ctx):
    """Create a new appointment"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)

        required_fields = ['patientId', 'date', 'time']
        for field in required_fields:
            if field not in data:
                return error_response(f"Missing required field: {field}", status_code=400)

        if 'id' not in data:
            data['id'] = f"apt_{datetime.now().strftime('%d%m%Y_%H%M%S')}_{str(hash(data['patientId']))[-6:]}"

        appointment = Appointment()
        appointment.id = data['id']
        appointment.patient_id = data['patientId']
        appointment.clinician_id = data.get('clinicianId')
        appointment.branch_id = data.get('branchId')
        appointment.tenant_id = ctx.tenant_id
        
        # Parse date
        date_str = data['date'].split('T')[0] if 'T' in data['date'] else data['date']
        appointment.date = datetime.strptime(date_str, '%Y-%m-%d')
        appointment.time = data['time']
        appointment.duration = data.get('duration', 30)
        appointment.appointment_type = data.get('type', 'consultation')
        
        # Handle status
        status_value = data.get('status', 'SCHEDULED')
        appointment.status = AppointmentStatus.from_legacy(status_value) if isinstance(status_value, str) else status_value or AppointmentStatus.SCHEDULED
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

        resp = make_response(success_response(data=appointment.to_dict(), status_code=201))
        resp.headers['Location'] = f"/api/appointments/{appointment.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create appointment error: {str(e)}")
        traceback.print_exc()
        
        # Handle idempotency
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            appointment_id = data.get('id')
            if appointment_id:
                existing = Appointment.query.filter_by(id=appointment_id, tenant_id=ctx.tenant_id).first()
                if existing:
                    return success_response(data=existing.to_dict())
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>', methods=['GET'])
@unified_access(resource='appointments', action='read')
def get_appointment(ctx, appointment_id):
    """Get a single appointment"""
    try:
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or (ctx.tenant_id and appointment.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)
        return success_response(data=appointment.to_dict())
    except Exception as e:
        logger.error(f"Get appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>', methods=['PUT', 'PATCH'])
@unified_access(resource='appointments', action='edit')
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Appointment, id_param='appointment_id')
@with_transaction
def update_appointment(ctx, appointment_id):
    """Update appointment"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or (ctx.tenant_id and appointment.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)

        if 'date' in data:
            date_str = data['date'].split('T')[0] if 'T' in data['date'] else data['date']
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
        return success_response(data=appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>', methods=['DELETE'])
@unified_access(resource='appointments', action='delete')
def delete_appointment(ctx, appointment_id):
    """Delete an appointment"""
    try:
        appt = db.session.get(Appointment, appointment_id)
        if not appt or (ctx.tenant_id and appt.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)
        db.session.delete(appt)
        db.session.commit()
        return success_response(data={'message': 'Appointment deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>/reschedule', methods=['POST'])
@unified_access(resource='appointments', action='edit')
def reschedule_appointment(ctx, appointment_id):
    """Reschedule an appointment"""
    try:
        data = request.get_json()
        if not data or 'date' not in data or 'time' not in data:
            return error_response("New date and time required", status_code=400)

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or (ctx.tenant_id and appointment.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)

        date_str = data['date'].split('T')[0] if 'T' in data['date'] else data['date']
        appointment.date = datetime.strptime(date_str, '%Y-%m-%d')
        appointment.time = data['time']
        appointment.status = 'rescheduled'

        db.session.commit()
        return success_response(data=appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reschedule appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>/cancel', methods=['POST'])
@unified_access(resource='appointments', action='edit')
def cancel_appointment(ctx, appointment_id):
    """Cancel an appointment"""
    try:
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or (ctx.tenant_id and appointment.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)

        appointment.status = 'cancelled'
        db.session.commit()
        return success_response(data=appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Cancel appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/<appointment_id>/complete', methods=['POST'])
@unified_access(resource='appointments', action='edit')
def complete_appointment(ctx, appointment_id):
    """Mark appointment as completed"""
    try:
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment or (ctx.tenant_id and appointment.tenant_id != ctx.tenant_id):
            return error_response("Appointment not found", status_code=404)

        appointment.status = AppointmentStatus.COMPLETED
        db.session.commit()
        return success_response(data=appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Complete appointment error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/availability', methods=['GET'])
@unified_access(resource='appointments', action='read')
def get_availability(ctx):
    """Get available time slots for a date"""
    try:
        date = request.args.get('date')
        duration = int(request.args.get('duration', 30))

        if not date:
            return error_response("Date parameter required", status_code=400)

        target_date = datetime.fromisoformat(date).date()
        query = Appointment.query.filter(
            db.func.date(Appointment.date) == target_date,
            Appointment.status.in_(['scheduled', 'confirmed'])
        )
        
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
            
        appointments = query.all()

        # Generate time slots
        time_slots = [f"{hour:02d}:{minute:02d}" for hour in range(9, 18) for minute in [0, 30]]

        # Calculate occupied slots
        occupied_slots = set()
        for apt in appointments:
            apt_hour, apt_minute = map(int, apt.time.split(':'))
            current_minute = apt_hour * 60 + apt_minute
            end_minute = current_minute + apt.duration

            slot_minute = 9 * 60
            while slot_minute < 18 * 60:
                slot_end_minute = slot_minute + 30
                if current_minute < slot_end_minute and end_minute > slot_minute:
                    slot_hour = slot_minute // 60
                    slot_min = slot_minute % 60
                    occupied_slots.add(f"{slot_hour:02d}:{slot_min:02d}")
                slot_minute += 30

        available_slots = [slot for slot in time_slots if slot not in occupied_slots]

        return success_response(data={
            "availableSlots": available_slots,
            "occupiedSlots": list(occupied_slots),
            "date": date
        })
    except Exception as e:
        logger.error(f"Get availability error: {str(e)}")
        return error_response(str(e), status_code=500)


@appointments_bp.route('/appointments/list', methods=['GET'])
@unified_access(resource='appointments', action='read')
def list_appointments(ctx):
    """List appointments with filters"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = Appointment.query
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)

        # Apply filters
        patient_id = request.args.get('patient_id')
        if patient_id:
            query = query.filter_by(patient_id=patient_id)

        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)

        start_date = request.args.get('start_date')
        if start_date:
            start_dt = datetime.fromisoformat(start_date) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)

        end_date = request.args.get('end_date')
        if end_date:
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)

        appointments = query.order_by(Appointment.date.desc()).paginate(page=page, per_page=per_page, error_out=False)

        return success_response(
            data=[apt.to_dict() for apt in appointments.items],
            meta={
                "total": appointments.total,
                "page": page,
                "perPage": per_page,
                "totalPages": appointments.pages
            }
        )
    except Exception as e:
        logger.exception('List appointments failed')
        return error_response(str(e), status_code=500)
