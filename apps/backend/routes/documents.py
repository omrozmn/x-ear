"""
Patient Documents API
Handles document storage and retrieval for patients
"""

from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.patient import Patient
from datetime import datetime
import json
import logging
import uuid

logger = logging.getLogger(__name__)

documents_bp = Blueprint('documents', __name__)


@documents_bp.route('/patients/<patient_id>/documents', methods=['GET'])
def get_patient_documents(patient_id):
    """Get all documents for a patient"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get documents from patient's custom data field
        documents = []
        try:
            custom_data = patient.custom_data_json or {}
            documents = custom_data.get('documents', [])
        except Exception as e:
            logger.error(f"Error parsing patient custom data: {e}")

        return jsonify({
            'success': True,
            'data': documents,
            'meta': {
                'total': len(documents),
                'patient_id': patient_id
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting patient documents: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@documents_bp.route('/patients/<patient_id>/documents', methods=['POST'])
def add_patient_document(patient_id):
    """Add a new document to patient"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['fileName', 'type', 'content']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

        # Create document object
        document = {
            'id': data.get('id') or str(uuid.uuid4()),
            'patientId': patient_id,
            'fileName': data['fileName'],
            'originalName': data.get('originalName', data['fileName']),
            'type': data['type'],
            'content': data['content'],
            'metadata': data.get('metadata', {}),
            'mimeType': data.get('mimeType', 'text/html'),
            'size': data.get('size', len(data['content'])),
            'uploadedAt': data.get('uploadedAt') or data.get('createdAt') or datetime.now().isoformat(),
            'createdBy': data.get('createdBy', 'system'),
            'status': data.get('status', 'completed')
        }

        # Get or initialize custom_data
        custom_data = patient.custom_data_json or {}

        # Add document to documents array
        if 'documents' not in custom_data:
            custom_data['documents'] = []
        custom_data['documents'].append(document)

        # Save back to patient
        patient.custom_data_json = custom_data
        db.session.commit()

        logger.info(f"✅ Document added to patient {patient_id}: {document['fileName']}")

        resp = make_response(jsonify({
            'success': True,
            'data': document,
            'timestamp': datetime.now().isoformat()
        }), 201)
        resp.headers['Location'] = f"/api/patients/{patient_id}/documents/{document['id']}"
        return resp

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding patient document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@documents_bp.route('/patients/<patient_id>/documents/<document_id>', methods=['GET'])
def get_patient_document(patient_id, document_id):
    """Get a specific document"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get documents from custom_data
        if patient.custom_data:
            try:
                custom_data = json.loads(patient.custom_data) if isinstance(patient.custom_data, str) else patient.custom_data
                documents = custom_data.get('documents', [])
                
                # Find specific document
                document = next((d for d in documents if d.get('id') == document_id), None)
                if document:
                    return jsonify({
                        'success': True,
                        'data': document,
                        'timestamp': datetime.now().isoformat()
                    }), 200
            except Exception as e:
                logger.error(f"Error parsing patient custom data: {e}")

        return jsonify({'success': False, 'error': 'Document not found'}), 404

    except Exception as e:
        logger.error(f"Error getting patient document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@documents_bp.route('/patients/<patient_id>/documents/<document_id>', methods=['DELETE'])
def delete_patient_document(patient_id, document_id):
    """Delete a document"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get documents from custom_data
        if patient.custom_data:
            try:
                custom_data = json.loads(patient.custom_data) if isinstance(patient.custom_data, str) else patient.custom_data
                documents = custom_data.get('documents', [])
                
                # Filter out the document to delete
                initial_length = len(documents)
                documents = [d for d in documents if d.get('id') != document_id]
                
                if len(documents) < initial_length:
                    custom_data['documents'] = documents
                    patient.custom_data = json.dumps(custom_data)
                    db.session.commit()
                    
                    logger.info(f"✅ Document deleted from patient {patient_id}: {document_id}")
                    
                    return jsonify({
                        'success': True,
                        'message': 'Document deleted',
                        'timestamp': datetime.now().isoformat()
                    }), 200
            except Exception as e:
                logger.error(f"Error parsing patient custom data: {e}")

        return jsonify({'success': False, 'error': 'Document not found'}), 404

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting patient document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
