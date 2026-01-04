"""
Response Utilities
------------------
Standardized response helpers for the API.
Ensures consistency across all endpoints in the format:
{
    "success": boolean,
    "data": any,
    "meta": object (optional),
    "error": object (optional)
}
"""

from flask import jsonify

def success_response(data=None, meta=None, message=None, status_code=200):
    """
    Return a standardized success response.
    
    Args:
        data: The main payload (dict, list, or None)
        meta: Optional metadata dictionary (e.g. pagination, scope info)
        message: Optional success message
        status_code: HTTP status code (default 200)
    """
    response = {
        'success': True,
        'data': data
    }
    
    if message:
        response['message'] = message
    
    if meta:
        response['meta'] = meta
        
    return jsonify(response), status_code

def error_response(message, code=None, details=None, status_code=400):
    """
    Return a standardized error response.
    
    Args:
        message: Human readable error message
        code: Machine readable error code (optional)
        details: Additional error details/validation errors (optional)
        status_code: HTTP status code
    """
    error_obj = {
        'message': message
    }
    
    if code:
        error_obj['code'] = code
        
    if details:
        error_obj['details'] = details
        
    return jsonify({
        'success': False,
        'error': error_obj
    }), status_code

def forbidden_response(message="Insufficient permissions"):
    return error_response(message, code="FORBIDDEN", status_code=403)

def not_found_response(message="Resource not found"):
    return error_response(message, code="NOT_FOUND", status_code=404)

def unauthorized_response(message="Unauthorized"):
    return error_response(message, code="UNAUTHORIZED", status_code=401)
