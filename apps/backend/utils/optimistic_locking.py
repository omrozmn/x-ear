"""
Optimistic Locking Utilities for PUT Endpoints

This module provides decorators and utilities for implementing optimistic locking
in PUT endpoints to prevent concurrent modification conflicts.
"""

from functools import wraps
from flask import request, jsonify
from datetime import datetime
from models.base import db
import logging

logger = logging.getLogger(__name__)

def optimistic_lock(model_class, id_param='id', version_header='If-Match'):
    """
    Decorator for implementing optimistic locking on PUT endpoints.
    
    Args:
        model_class: SQLAlchemy model class to check for conflicts
        id_param: Parameter name for the resource ID (default: 'id')
        version_header: HTTP header containing the expected version (default: 'If-Match')
    
    Usage:
        @app.route('/api/patients/<int:patient_id>', methods=['PUT'])
        @optimistic_lock(Patient, id_param='patient_id')
        def update_patient(patient_id):
            # Your update logic here
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Extract resource ID from kwargs
                resource_id = kwargs.get(id_param)
                if not resource_id:
                    return jsonify({
                        'success': False,
                        'error': f'Missing {id_param} parameter'
                    }), 400
                
                # Get expected version from header
                expected_version = request.headers.get(version_header)
                if not expected_version:
                    logger.warning(f"No {version_header} header provided for optimistic locking")
                    # Continue without version check if header not provided
                    return f(*args, **kwargs)
                
                # Fetch current resource
                resource = model_class.query.get(resource_id)
                if not resource:
                    return jsonify({
                        'success': False,
                        'error': 'Resource not found'
                    }), 404
                
                # Check if resource has updated_at field
                if not hasattr(resource, 'updated_at'):
                    logger.warning(f"Model {model_class.__name__} doesn't have updated_at field")
                    return f(*args, **kwargs)
                
                # Compare versions (using updated_at timestamp as version)
                current_version = resource.updated_at.isoformat() if resource.updated_at else None
                
                if current_version != expected_version:
                    # Conflict detected
                    logger.info(f"Optimistic locking conflict detected for {model_class.__name__} {resource_id}")
                    logger.info(f"Expected version: {expected_version}, Current version: {current_version}")
                    
                    return jsonify({
                        'success': False,
                        'error': 'Conflict detected',
                        'error_code': 'OPTIMISTIC_LOCK_CONFLICT',
                        'message': 'The resource has been modified by another user. Please refresh and try again.',
                        'current_version': current_version,
                        'expected_version': expected_version,
                        'current_data': resource.to_dict() if hasattr(resource, 'to_dict') else None
                    }), 409
                
                # No conflict, proceed with the original function
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error in optimistic locking decorator: {str(e)}")
                # Don't block the request if optimistic locking fails
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def with_transaction(f):
    """
    Decorator to wrap a function in a database transaction.
    Automatically commits on success and rolls back on error.
    
    Usage:
        @with_transaction
        def update_resource():
            # Your database operations here
            pass
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Execute the function
            result = f(*args, **kwargs)
            
            # If function returns a Flask response, check status code
            if hasattr(result, 'status_code'):
                if 200 <= result.status_code < 300:
                    db.session.commit()
                    logger.debug("Transaction committed successfully")
                else:
                    db.session.rollback()
                    logger.debug(f"Transaction rolled back due to error status: {result.status_code}")
            else:
                # For non-Flask responses, assume success
                db.session.commit()
                logger.debug("Transaction committed successfully")
            
            return result
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Transaction rolled back due to exception: {str(e)}")
            
            # Return a standardized error response
            return jsonify({
                'success': False,
                'error': 'Internal server error',
                'message': 'An error occurred while processing your request'
            }), 500
    
    return decorated_function

def get_resource_version(resource):
    """
    Get the version identifier for a resource (using updated_at timestamp).
    
    Args:
        resource: SQLAlchemy model instance
        
    Returns:
        str: Version identifier (ISO format timestamp)
    """
    if hasattr(resource, 'updated_at') and resource.updated_at:
        return resource.updated_at.isoformat()
    return None

def create_conflict_response(resource, expected_version=None, message=None):
    """
    Create a standardized 409 conflict response.
    
    Args:
        resource: The current resource state
        expected_version: The version that was expected
        message: Custom conflict message
        
    Returns:
        tuple: (response_dict, status_code)
    """
    current_version = get_resource_version(resource)
    
    response = {
        'success': False,
        'error': 'Conflict detected',
        'error_code': 'RESOURCE_CONFLICT',
        'message': message or 'The resource has been modified. Please refresh and try again.',
        'current_version': current_version,
        'current_data': resource.to_dict() if hasattr(resource, 'to_dict') else None
    }
    
    if expected_version:
        response['expected_version'] = expected_version
    
    return response, 409