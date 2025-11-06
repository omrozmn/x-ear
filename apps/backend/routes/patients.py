from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.patient import Patient
from datetime import datetime
import json
import logging
import sqlite3
import csv
import io
import os
from flask import Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction

patients_bp = Blueprint('patients', __name__)
logger = logging.getLogger(__name__)

def _is_admin_user(user_id):
    """Simple admin determination: checks if user's username or email matches configured admin values."""
    try:
        admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@x-ear.com')
        user = db.session.get(User, user_id)
        if not user:
            return False
        return (user.username == admin_username) or (user.email == admin_email)
    except Exception:
        return False


@patients_bp.route('/patients/bulk_upload', methods=['POST'])
@jwt_required(optional=True)
@idempotent(methods=['POST'])
def bulk_upload_patients():
    """Accept a multipart/form-data CSV file containing patients and upsert them into the DB.
    This endpoint is intentionally forgiving: it returns a summary of created/updated rows
    and reports per-row errors without aborting the entire batch.
    Authentication is optional for uploads in many workflows; we still log the actor when present.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part named "file" in request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400

        # Read CSV content (support UTF-8 BOM)
        raw = file.read()
        try:
            text = raw.decode('utf-8-sig')
        except Exception:
            text = raw.decode('utf-8', errors='replace')

        reader = csv.DictReader(io.StringIO(text))
        created = 0
        updated = 0
        errors = []
        row_num = 0

        for row in reader:
            row_num += 1
            try:
                # Normalize row to expected API-style keys
                payload = {
                    'tcNumber': row.get('tcNumber') or row.get('tc_number') or row.get('tc'),
                    'identityNumber': row.get('identityNumber') or row.get('identity_number'),
                    'firstName': row.get('firstName') or row.get('first_name') or row.get('first'),
                    'lastName': row.get('lastName') or row.get('last_name') or row.get('last'),
                    'phone': row.get('phone') or row.get('phone_number') or row.get('tel'),
                    'email': row.get('email'),
                    'birthDate': row.get('birthDate') or row.get('dob'),
                    'gender': row.get('gender'),
                    'status': row.get('status'),
                    'segment': row.get('segment')
                }

                # Address fields support flat CSV columns
                address = {}
                if row.get('address_city'):
                    address['city'] = row.get('address_city')
                if row.get('address_district'):
                    address['district'] = row.get('address_district')
                if row.get('address_full'):
                    address['fullAddress'] = row.get('address_full')
                if address:
                    payload['address'] = address

                # Tags may be provided as a comma/semicolon separated string
                tags_value = row.get('tags')
                if tags_value:
                    # split on comma or semicolon and strip
                    split_tags = [t.strip() for t in csv.reader([tags_value]).__next__() if t.strip()]
                    payload['tags'] = split_tags

                # Attempt to find existing patient by tc_number (strong identifier)
                existing = None
                if payload.get('tcNumber'):
                    existing = Patient.query.filter_by(tc_number=payload['tcNumber']).one_or_none()

                if existing:
                    # apply updatable fields similar to update endpoint
                    updatable = ['firstName','lastName','phone','email','birthDate','gender','status','segment','tags']
                    for k in updatable:
                        if payload.get(k) is not None:
                            if k == 'tags':
                                existing.tags = json.dumps(payload['tags'])
                            elif k == 'birthDate':
                                try:
                                    existing.birth_date = datetime.fromisoformat(payload['birthDate'])
                                except Exception:
                                    pass
                            else:
                                setattr(existing, {'firstName':'first_name','lastName':'last_name','phone':'phone','email':'email','gender':'gender','status':'status','segment':'segment'}[k], payload[k])
                    db.session.add(existing)
                    updated += 1
                else:
                    # create new patient
                    patient = Patient.from_dict(payload)
                    db.session.add(patient)
                    created += 1

                # Flush per-row to capture integrity errors early without losing context
                try:
                    db.session.flush()
                except Exception as e:
                    # Capture rollback cause and continue
                    db.session.rollback()
                    errors.append({'row': row_num, 'error': str(e)})
                    continue

            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
                continue

        # Commit everything that successfully flushed
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Commit failed: ' + str(e)}), 500

        # Log activity with the calling user if available
        user_id = None
        try:
            user_id = get_jwt_identity()
        except Exception:
            user_id = None
        from app import log_activity
        actor = user_id or 'anonymous'
        log_activity(actor, 'bulk_upload', 'patient', None, {'created': created, 'updated': updated, 'errors': errors}, request)

        return jsonify({'success': True, 'created': created, 'updated': updated, 'errors': errors}), 200
    except sqlite3.OperationalError as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database write failed: ' + str(e)}), 503
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/export', methods=['GET'])
@jwt_required()
def export_patients_csv():
    """Export patients as CSV. Only admin users are allowed to perform exports.
    Supports optional query params: status, segment, q (search term).
    """
    try:
        user_id = get_jwt_identity()
        if not _is_admin_user(user_id):
            return jsonify({'success': False, 'error': 'Forbidden: admin access required'}), 403

        status = request.args.get('status')
        segment = request.args.get('segment')
        q = request.args.get('q')

        query = Patient.query
        if status:
            query = query.filter_by(status=status)
        if segment:
            query = query.filter_by(segment=segment)
        if q:
            search_filter = f"%{q}%"
            query = query.filter(db.or_(
                Patient.first_name.ilike(search_filter),
                Patient.last_name.ilike(search_filter),
                Patient.tc_number.ilike(search_filter),
                Patient.phone.ilike(search_filter),
                Patient.email.ilike(search_filter),
            ))

        patients = query.order_by(Patient.created_at.desc()).all()

        # Build CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow(['id','tcNumber','firstName','lastName','phone','email','birthDate','gender','status','segment','tags','createdAt'])
        for p in patients:
            writer.writerow([
                p.id,
                p.tc_number,
                p.first_name,
                p.last_name,
                p.phone,
                p.email,
                p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else '',
                p.gender,
                p.status,
                p.segment,
                json.dumps(json.loads(p.tags) if p.tags else []),
                p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else ''
            ])

        csv_bytes = output.getvalue().encode('utf-8')
        output.close()

        # Log export
        from app import log_activity
        log_activity(user_id or 'unknown', 'export', 'patient', None, {'count': len(patients)}, request)

        response = make_response(csv_bytes)
        response.headers.set('Content-Type', 'text/csv; charset=utf-8')
        response.headers.set('Content-Disposition', 'attachment', filename=f'patients_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv')
        return response
    except Exception as e:
        logger.exception('Export failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients', methods=['GET'])
def list_patients():
    try:
        # Support both offset-based and cursor-based pagination
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        cursor = request.args.get('cursor')  # For cursor-based pagination
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        city = request.args.get('city', '')
        district = request.args.get('district', '')
        
        query = Patient.query
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.phone.ilike(search_term),
                    Patient.email.ilike(search_term)
                )
            )
        
        # Apply status filter
        if status:
            query = query.filter(Patient.status == status)
        
        # Apply city filter
        if city:
            query = query.filter(Patient.address_city == city)
        
        # Apply district filter
        if district:
            query = query.filter(Patient.address_district == district)
        
        # Cursor-based pagination for better performance with large datasets
        if cursor:
            try:
                # Decode cursor (base64 encoded patient ID)
                import base64
                cursor_id = base64.b64decode(cursor.encode()).decode()
                query = query.filter(Patient.id > cursor_id)
            except Exception:
                # Invalid cursor, fall back to first page
                pass
        
        # Order by ID for consistent pagination
        query = query.order_by(Patient.id)
        
        # Limit results (add 1 to check if there are more pages)
        per_page = min(per_page, 200)  # Cap at 200 for performance
        patients_list = query.limit(per_page + 1).all()
        
        # Check if there are more results
        has_next = len(patients_list) > per_page
        if has_next:
            patients_list = patients_list[:-1]  # Remove the extra item
        
        # Generate next cursor if there are more results
        next_cursor = None
        if has_next and patients_list:
            import base64
            last_id = patients_list[-1].id
            next_cursor = base64.b64encode(str(last_id).encode()).decode()
        
        results = [p.to_dict() for p in patients_list]
        
        # For backward compatibility, also support offset-based pagination
        if not cursor:
            # Traditional pagination for UI compatibility
            total_query = Patient.query
            if search:
                search_term = f"%{search}%"
                total_query = total_query.filter(
                    db.or_(
                        Patient.first_name.ilike(search_term),
                        Patient.last_name.ilike(search_term),
                        Patient.phone.ilike(search_term),
                        Patient.email.ilike(search_term)
                    )
                )
            if status:
                total_query = total_query.filter(Patient.status == status)
            if city:
                total_query = total_query.filter(Patient.address_city == city)
            if district:
                total_query = total_query.filter(Patient.address_district == district)
            
            total_count = total_query.count()
            total_pages = (total_count + per_page - 1) // per_page
            
            return jsonify({
                'success': True,
                'data': results,
                'pagination': {
                    'page': page,
                    'perPage': per_page,
                    'total': total_count,
                    'totalPages': total_pages,
                    'hasNext': has_next,
                    'nextCursor': next_cursor
                }
            })
        else:
            # Cursor-based response
            return jsonify({
                'success': True,
                'data': results,
                'pagination': {
                    'perPage': per_page,
                    'hasNext': has_next,
                    'nextCursor': next_cursor,
                    'cursor': cursor
                }
            })
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500


@patients_bp.route('/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        return jsonify({'success': True, 'data': patient.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients', methods=['POST'])
@idempotent(methods=['POST'])
def create_patient():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        logger.info(f'🔍 CREATE PATIENT - Received data: {data}')
        logger.info(f'🔍 CREATE PATIENT - city: {data.get("city")}, addressCity: {data.get("addressCity")}')
        logger.info(f'🔍 CREATE PATIENT - district: {data.get("district")}, addressDistrict: {data.get("addressDistrict")}')
        logger.info(f'🔍 CREATE PATIENT - address: {data.get("address")}')

        # Basic validation: ensure required fields exist to avoid DB integrity errors
        missing = []
        for field in ('firstName', 'lastName', 'phone'):
            if not data.get(field):
                missing.append(field)
        if missing:
            return jsonify({'success': False, 'error': f'Missing required fields: {",".join(missing)}'}), 400
        
        # Validate phone format
        phone = data.get('phone', '').strip()
        if phone:
            # Remove common phone separators
            phone_digits = ''.join(c for c in phone if c.isdigit())
            # Turkish phone numbers should be 10 or 11 digits (with or without country code)
            if len(phone_digits) < 10 or len(phone_digits) > 11:
                return jsonify({
                    'success': False, 
                    'error': 'Geçerli bir telefon numarası giriniz',
                    'details': {'phone': 'Geçerli bir telefon numarası giriniz'}
                }), 400

        # Validate TC number if provided
        tc_number = data.get('tcNumber')
        if tc_number and tc_number.strip():
            from utils.tc_validator import validate_tc_number
            is_valid, error_msg = validate_tc_number(tc_number)
            if not is_valid:
                return jsonify({'success': False, 'error': error_msg}), 400
            
            # Check if TC number already exists
            existing_tc = Patient.query.filter_by(tc_number=tc_number).first()
            if existing_tc:
                return jsonify({
                    'success': False, 
                    'error': 'Bu TC Kimlik No ile kayıtlı bir hasta zaten mevcut',
                    'existingPatient': {
                        'id': existing_tc.id,
                        'firstName': existing_tc.first_name,
                        'lastName': existing_tc.last_name,
                        'phone': existing_tc.phone
                    }
                }), 409

        # Check if patient with same phone number already exists
        phone = data.get('phone')
        if phone:
            existing_patient = Patient.query.filter_by(phone=phone).first()
            if existing_patient:
                return jsonify({
                    'success': False, 
                    'error': 'Bu telefon numarası ile kayıtlı bir hasta zaten mevcut',
                    'existingPatient': {
                        'id': existing_patient.id,
                        'firstName': existing_patient.first_name,
                        'lastName': existing_patient.last_name,
                        'phone': existing_patient.phone
                    }
                }), 409

        patient = Patient.from_dict(data)
        
        logger.info('🔍 CREATE PATIENT - After from_dict:')
        logger.info('🔍   address_full: %s', patient.address_full)
        logger.info('🔍   address_city: %s', patient.address_city)
        logger.info('🔍   address_district: %s', patient.address_district)
        
        db.session.add(patient)
        db.session.commit()

        from app import log_activity
        log_activity('system', 'create', 'patient', patient.id, {'payload': data}, request)

        resp = make_response(jsonify({'success': True, 'data': patient.to_dict()}), 201)
        resp.headers['Location'] = f"/api/patients/{patient.id}"
        return resp
    except Exception as e:
        # Rollback and provide more informative error messages in development
        db.session.rollback()
        logger.exception('Create patient failed')
        # If SQLAlchemy IntegrityError, surface as a 409 conflict
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            # Check if it's a TC number duplicate
            if 'tc_number' in str(e).lower():
                return jsonify({'success': False, 'error': 'Bu TC Kimlik No ile kayıtlı bir hasta zaten mevcut'}), 409
            return jsonify({'success': False, 'error': 'Veritabanı bütünlük hatası: Bu kayıt zaten mevcut'}), 409
        # Surface read-only DB errors with a distinct status so frontend can
        # display a clear message to operators. SQLite raises sqlite3.OperationalError
        # when the DB file is not writable (e.g. permissions or mounted read-only).
        if isinstance(e, sqlite3.OperationalError) and 'readonly' in str(e).lower():
            logger.exception('Database is read-only')
            return jsonify({'success': False, 'error': 'Database write failed: read-only database'}), 503
        return jsonify({'success': False, 'error': str(e), 'timestamp': datetime.now().isoformat()}), 500


@patients_bp.route('/patients/<patient_id>', methods=['PUT','PATCH'])
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Patient, id_param='patient_id')
@with_transaction
def update_patient(patient_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        logger.info(f'🔍 UPDATE PATIENT - Patient ID: {patient_id}')
        logger.info(f'🔍 UPDATE PATIENT - Received data: {data}')
        logger.info(f'🔍 UPDATE PATIENT - branchId in data: {data.get("branchId")}')

        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        logger.info(f'🔍 UPDATE PATIENT - Current branch_id: {patient.branch_id}')

        # Normalize keys: accept camelCase incoming fields and map to model attributes
        key_map = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'tcNumber': 'tc_number',
            'identityNumber': 'identity_number',
            'birthDate': 'birth_date',
            'gender': 'gender',
            'address': 'address',
            'status': 'status',
            'segment': 'segment',
            'acquisitionType': 'acquisition_type',
            'conversionStep': 'conversion_step',
            'referredBy': 'referred_by',
            'priorityScore': 'priority_score',
            'branchId': 'branch_id',
            'tags': 'tags',
            'sgkInfo': 'sgk_info',
            'phone': 'phone',
            'email': 'email',
            'city': 'address_city',
            'district': 'address_district',
            'addressCity': 'address_city',
            'addressDistrict': 'address_district'
        }

        # Whitelist of allowed direct-mapped model attributes (snake_case)
        allowed_attrs = {'first_name','last_name','tc_number','identity_number','phone','email','gender','status','segment','acquisition_type','conversion_step','referred_by','priority_score','branch_id','address_city','address_district','address_full'}

        for k, v in data.items():
            # Special fields handled explicitly
            if k == 'tags':
                patient.tags = json.dumps(v) if v is not None else json.dumps([])
                continue
            if k == 'sgkInfo':
                patient.sgk_info = json.dumps(v) if v is not None else json.dumps({
                    'rightEarDevice': 'available',
                    'leftEarDevice': 'available',
                    'rightEarBattery': 'available',
                    'leftEarBattery': 'available'
                })
                continue
            if k == 'birthDate' and v:
                try:
                    patient.birth_date = datetime.fromisoformat(v)
                except (ValueError, TypeError):
                    pass
                continue
            if k == 'address' or k == 'addressFull':
                logger.info('🔍 UPDATE - address field (%s): type=%s, value=%s', k, type(v).__name__, v)
                if isinstance(v, dict):
                    # Legacy dict format
                    patient.address_city = v.get('city')
                    patient.address_district = v.get('district')
                    patient.address_full = v.get('fullAddress') or v.get('address')
                    logger.info('🔍 UPDATE - address dict processed: city=%s, district=%s, address_full=%s', 
                              patient.address_city, patient.address_district, patient.address_full)
                elif isinstance(v, str):
                    # New string format - just store the address text
                    patient.address_full = v
                    logger.info('🔍 UPDATE - address string set: %s', patient.address_full)
                continue

            # Normalized key to model attribute
            normalized = key_map.get(k, k)

            # If normalized is a direct attribute, set it
            if normalized in allowed_attrs and hasattr(patient, normalized):
                try:
                    logger.info(f'🔍 Setting {normalized} = {v}')
                    setattr(patient, normalized, v)
                except Exception as e:
                    logger.debug('Failed to set attribute %s on patient: %s', normalized, e)
                continue

            # Last resort: if the original key matches a model attr, set it
            if hasattr(patient, k):
                try:
                    setattr(patient, k, v)
                except Exception as e:
                    logger.debug('Failed to set attribute %s on patient: %s', k, e)
                continue

            # Unknown/unhandled fields
            logger.debug('Ignored unknown patient update field: %s', k)

        logger.info('🔍 UPDATE PATIENT - After processing:')
        logger.info('🔍   address_full: %s', patient.address_full)
        logger.info('🔍   address_city: %s', patient.address_city)
        logger.info('🔍   address_district: %s', patient.address_district)
        logger.info('🔍   branch_id: %s', patient.branch_id)
        
        db.session.commit()
        from app import log_activity
        log_activity('system', 'update', 'patient', patient.id, {'changes': data}, request)
        return jsonify({'success': True, 'data': patient.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        # Surface read-only DB errors with a distinct status so frontend can
        # display a clear message to operators. SQLite raises sqlite3.OperationalError
        # when the DB file is not writable (e.g. permissions or mounted read-only).
        if isinstance(e, sqlite3.OperationalError) and 'readonly' in str(e).lower():
            logger.exception('Database is read-only')
            return jsonify({'success': False, 'error': 'Database write failed: read-only database'}), 503
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        db.session.delete(patient)
        db.session.commit()
        from app import log_activity
        log_activity('system', 'delete', 'patient', patient_id, {'tcNumber': patient.tc_number}, request)
        return jsonify({'success': True, 'data': {'message': 'Patient deleted successfully'}}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/search', methods=['GET'])
def search_patients():
    try:
        search_term = request.args.get('q', '')
        status = request.args.get('status')
        segment = request.args.get('segment')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Patient.query
        if search_term:
            search_filter = f"%{search_term}%"
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_filter),
                    Patient.last_name.ilike(search_filter),
                    Patient.tc_number.ilike(search_filter),
                    Patient.phone.ilike(search_filter),
                    Patient.email.ilike(search_filter)
                )
            )
        if status:
            query = query.filter_by(status=status)
        if segment:
            query = query.filter_by(segment=segment)

        patients_paginated = query.order_by(Patient.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        results = [p.to_dict() for p in patients_paginated.items]

        return jsonify({
            'success': True,
            'data': results,
            'results': results,  # backward compat
            'meta': {
                'total': patients_paginated.total,
                'page': page,
                'perPage': per_page,
                'totalPages': patients_paginated.pages
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/<patient_id>/devices', methods=['GET'])
def get_patient_devices(patient_id):
    """Get all devices assigned to a specific patient"""
    try:
        from models.device import Device
        
        # Get patient to verify existence
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({
                'success': False,
                'error': 'Patient not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get all devices for this patient
        devices = Device.query.filter_by(patient_id=patient_id).all()
        
        devices_data = [device.to_dict() for device in devices]
        
        return jsonify({
            'success': True,
            'data': devices_data,
            'meta': {
                'patientId': patient_id,
                'patientName': f"{patient.first_name} {patient.last_name}",
                'deviceCount': len(devices_data)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get patient devices error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@patients_bp.route('/patients/<patient_id>/sales', methods=['GET'])
def get_patient_sales(patient_id):
    """Get all sales for a specific patient"""
    try:
        from models.sales import Sale
        
        # Get patient to verify existence
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({
                'success': False,
                'error': 'Patient not found',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get all sales for this patient
        sales = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.sale_date.desc()).all()
        
        sales_data = [sale.to_dict() for sale in sales]
        
        return jsonify({
            'success': True,
            'data': sales_data,
            'meta': {
                'patientId': patient_id,
                'patientName': f"{patient.first_name} {patient.last_name}",
                'salesCount': len(sales_data)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get patient sales error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
