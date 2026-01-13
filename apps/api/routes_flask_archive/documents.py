"""
Patient Documents API
Handles document storage and retrieval for patients
Stores files locally with MinIO compatibility for future Docker deployment
"""

from flask import Blueprint, request, jsonify, make_response, send_file
from models.base import db
from models.patient import Patient
from datetime import datetime
import json
import logging
import uuid
import os
import base64
from pathlib import Path

logger = logging.getLogger(__name__)

documents_bp = Blueprint('documents', __name__)

# Document storage configuration
STORAGE_BASE_PATH = os.getenv('DOCUMENT_STORAGE_PATH', './storage/documents')
# Ensure storage directory exists
Path(STORAGE_BASE_PATH).mkdir(parents=True, exist_ok=True)


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
    """Add a new document to patient - stores file locally (MinIO-compatible structure)"""
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

        # Generate document ID
        doc_id = data.get('id') or str(uuid.uuid4())
        
        # Create patient-specific directory (MinIO bucket-like structure)
        patient_dir = Path(STORAGE_BASE_PATH) / patient.tenant_id / patient_id
        patient_dir.mkdir(parents=True, exist_ok=True)
        
        # Decode base64 content and save to file
        try:
            file_content = base64.b64decode(data['content'])
        except Exception as e:
            return jsonify({'success': False, 'error': f'Invalid base64 content: {str(e)}'}), 400
        
        # Use original filename or generate safe filename
        file_name = data.get('fileName', f'document_{doc_id}')
        file_path = patient_dir / f"{doc_id}_{file_name}"
        
        # Write file to disk
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Create document metadata (no base64 content stored in DB)
        document = {
            'id': doc_id,
            'patientId': patient_id,
            'fileName': data['fileName'],
            'originalName': data.get('originalName', data['fileName']),
            'type': data['type'],
            'filePath': str(file_path.relative_to(STORAGE_BASE_PATH)),  # Store relative path
            'metadata': data.get('metadata', {}),
            'mimeType': data.get('mimeType', 'application/octet-stream'),
            'size': len(file_content),  # Actual file size
            'uploadedAt': data.get('uploadedAt') or datetime.now().isoformat(),
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

        # Create Activity Log
        try:
            from models.user import ActivityLog
            activity_log = ActivityLog(
                user_id=data.get('createdBy', 'system'),
                action='document_upload',
                entity_type='patient',
                entity_id=patient_id,
                details=f"Document uploaded: {document['fileName']}",
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', '')
            )
            db.session.add(activity_log)
            db.session.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log for document upload: {log_error}")

        logger.info(f"✅ Document saved to disk: {file_path}")

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
    """Get a specific document - returns file for download"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get documents from custom_data
        custom_data = patient.custom_data_json or {}
        documents = custom_data.get('documents', [])
        
        # Find specific document
        document = next((d for d in documents if d.get('id') == document_id), None)
        if not document:
            return jsonify({'success': False, 'error': 'Document not found'}), 404

        # Check if file exists on disk
        file_path = Path(STORAGE_BASE_PATH) / document.get('filePath', '')
        if not file_path.exists():
            logger.error(f"Document file not found on disk: {file_path}")
            return jsonify({'success': False, 'error': 'Document file not found'}), 404

        # Return file for download
        return send_file(
            file_path,
            mimetype=document.get('mimeType', 'application/octet-stream'),
            as_attachment=True,
            download_name=document.get('fileName', 'document')
        )

    except Exception as e:
        logger.error(f"Error getting patient document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@documents_bp.route('/patients/<patient_id>/documents/<document_id>', methods=['DELETE'])
def delete_patient_document(patient_id, document_id):
    """Delete a document - removes file from disk and DB"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get documents from custom_data
        custom_data = patient.custom_data_json or {}
        documents = custom_data.get('documents', [])
        
        # Find the document to delete
        document = next((d for d in documents if d.get('id') == document_id), None)
        if not document:
            return jsonify({'success': False, 'error': 'Document not found'}), 404
        
        # Delete file from disk
        file_path = Path(STORAGE_BASE_PATH) / document.get('filePath', '')
        if file_path.exists():
            try:
                os.remove(file_path)
                logger.info(f"✅ Deleted document file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete file from disk: {e}")
        
        # Remove from documents list
        documents = [d for d in documents if d.get('id') != document_id]
        custom_data['documents'] = documents
        patient.custom_data_json = custom_data
        db.session.commit()

        logger.info(f"✅ Document deleted: {document_id}")

        return jsonify({
            'success': True,
            'message': 'Document deleted successfully',
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting patient document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
