from flask import Blueprint, request, jsonify, current_app, make_response
from models.base import db
from models.patient import Patient
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
import uuid
from datetime import datetime, timezone
from models.medical import HearingTest, PatientNote, EReceipt

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

patient_subresources_bp = Blueprint('patient_subresources', __name__)


@patient_subresources_bp.route('/patients/<patient_id>/devices', methods=['GET'])
def get_patient_devices(patient_id):
    """Get all devices assigned to a specific patient"""
    from models.device import Device
    
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({
            'success': False,
            'error': 'Patient not found',
            'timestamp': datetime.now().isoformat()
        }), 404

    # Get all devices assigned to this patient
    devices = Device.query.filter_by(patient_id=patient_id).all()
    
    return jsonify({
        "success": True,
        "data": [device.to_dict() for device in devices],
        "meta": {
            "patientId": patient_id,
            "patientName": f"{patient.first_name} {patient.last_name}",
            "deviceCount": len(devices)
        },
        "timestamp": datetime.now().isoformat()
    }), 200


@patient_subresources_bp.route('/patients/<patient_id>/hearing-tests', methods=['GET'])
def get_patient_hearing_tests(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    hearing_tests = [test.to_dict() for test in patient.hearing_tests]
    return jsonify({"success": True, "data": hearing_tests, "meta": {"total": len(hearing_tests)}, "timestamp": datetime.now().isoformat()}), 200


@patient_subresources_bp.route('/patients/<patient_id>/hearing-tests', methods=['POST'])
def add_patient_hearing_test(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        new_test = HearingTest(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            test_date=datetime.fromisoformat(data['testDate']),
            audiologist=data.get('audiologist'),
            audiogram_data=json.dumps(data.get('audiogramData'))
        )
        db.session.add(new_test)
        db.session.commit()
        resp = make_response(jsonify({"success": True, "data": new_test.to_dict(), "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/patients/{patient_id}/hearing-tests/{new_test.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/hearing-tests/<test_id>', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(HearingTest, id_param='test_id')
@with_transaction
def update_patient_hearing_test(patient_id, test_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    hearing_test = HearingTest.query.filter_by(id=test_id, patient_id=patient_id).first()
    if not hearing_test:
        return jsonify({'error': 'Hearing test not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        if 'testDate' in data:
            hearing_test.test_date = datetime.fromisoformat(data['testDate'])
        if 'audiologist' in data:
            hearing_test.audiologist = data['audiologist']
        if 'audiogramData' in data:
            hearing_test.audiogram_data = json.dumps(data['audiogramData'])

        hearing_test.updated_at = now_utc()
        db.session.commit()
        return jsonify(hearing_test.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/hearing-tests/<test_id>', methods=['DELETE'])
def delete_patient_hearing_test(patient_id, test_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    hearing_test = HearingTest.query.filter_by(id=test_id, patient_id=patient_id).first()
    if not hearing_test:
        return jsonify({'error': 'Hearing test not found'}), 404

    try:
        db.session.delete(hearing_test)
        db.session.commit()
        return jsonify({'message': 'Hearing test deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


# Patient Notes Routes
@patient_subresources_bp.route('/patients/<patient_id>/notes', methods=['GET'])
def get_patient_notes(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    notes = [note.to_dict() for note in patient.notes]
    return jsonify({"success": True, "data": notes, "meta": {"total": len(notes)}, "timestamp": datetime.now().isoformat()}), 200


@patient_subresources_bp.route('/patients/<patient_id>/notes', methods=['POST'])
def create_patient_note(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        new_note = PatientNote(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            author_id=data.get('createdBy', 'system'),
            note_type=data.get('type', 'genel'),
            category=data.get('category', 'general'),
            title=data.get('type', 'genel'),  # Use type as title for now
            content=data.get('content', ''),
            is_private=data.get('isPrivate', False),
            tags=json.dumps(data.get('tags', []))
        )
        db.session.add(new_note)
        db.session.commit()
        resp = make_response(jsonify({"success": True, "data": new_note.to_dict(), "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/patients/{patient_id}/notes/{new_note.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/notes/<note_id>', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(PatientNote, id_param='note_id')
@with_transaction
def update_patient_note(patient_id, note_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    note = PatientNote.query.filter_by(id=note_id, patient_id=patient_id).first()
    if not note:
        return jsonify({'error': 'Note not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        if 'content' in data:
            note.content = data['content']
        if 'title' in data:
            note.title = data['title']
        if 'noteType' in data:
            note.note_type = data['noteType']
        if 'category' in data:
            note.category = data['category']
        if 'isPrivate' in data:
            note.is_private = data['isPrivate']
        if 'tags' in data:
            note.tags = json.dumps(data['tags'])

        note.updated_at = now_utc()
        db.session.commit()
        return jsonify(note.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/notes/<note_id>', methods=['DELETE'])
def delete_patient_note(patient_id, note_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    note = PatientNote.query.filter_by(id=note_id, patient_id=patient_id).first()
    if not note:
        return jsonify({'error': 'Note not found'}), 404

    try:
        db.session.delete(note)
        db.session.commit()
        return jsonify({'message': 'Note deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


# E-Receipt Routes
@patient_subresources_bp.route('/patients/<patient_id>/ereceipts', methods=['GET'])
def get_patient_ereceipts(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    ereceipts = [receipt.to_dict() for receipt in patient.ereceipts]
    return jsonify({"success": True, "data": ereceipts, "meta": {"total": len(ereceipts)}, "timestamp": datetime.now().isoformat()}), 200


@patient_subresources_bp.route('/patients/<patient_id>/ereceipts', methods=['POST'])
def create_patient_ereceipt(patient_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        new_ereceipt = EReceipt(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            sgk_report_id=data.get('sgkReportId'),
            receipt_number=data.get('number'),
            doctor_name=data.get('doctorName'),
            issue_date=datetime.fromisoformat(data['date']) if data.get('date') else now_utc(),
            materials=json.dumps(data.get('materials', [])),
            status=data.get('status', 'pending')
        )
        db.session.add(new_ereceipt)
        db.session.commit()
        resp = make_response(jsonify({"success": True, "data": new_ereceipt.to_dict(), "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/patients/{patient_id}/ereceipts/{new_ereceipt.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/ereceipts/<ereceipt_id>', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(EReceipt, id_param='ereceipt_id')
@with_transaction
def update_patient_ereceipt(patient_id, ereceipt_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    ereceipt = EReceipt.query.filter_by(id=ereceipt_id, patient_id=patient_id).first()
    if not ereceipt:
        return jsonify({'error': 'E-receipt not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        if 'materials' in data:
            ereceipt.materials = json.dumps(data['materials'])
        if 'status' in data:
            ereceipt.status = data['status']
        if 'doctorName' in data:
            ereceipt.doctor_name = data['doctorName']

        ereceipt.updated_at = now_utc()
        db.session.commit()
        return jsonify(ereceipt.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@patient_subresources_bp.route('/patients/<patient_id>/ereceipts/<ereceipt_id>', methods=['DELETE'])
def delete_patient_ereceipt(patient_id, ereceipt_id):
    patient = db.session.get(Patient, patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    ereceipt = EReceipt.query.filter_by(id=ereceipt_id, patient_id=patient_id).first()
    if not ereceipt:
        return jsonify({'error': 'E-receipt not found'}), 404

    try:
        db.session.delete(ereceipt)
        db.session.commit()
        return jsonify({'message': 'E-receipt deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
