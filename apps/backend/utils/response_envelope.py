"""Middleware to enforce a unified JSON response envelope for all API responses.

Ensures responses have the shape:
  { success: boolean, data?: any, error?: any, requestId: string, timestamp: string }

Register this by calling `register_response_envelope(app)` from app initialization.
"""
from flask import request, g, jsonify
from datetime import datetime
import uuid
import json


def register_response_envelope(app):
    @app.before_request
    def inject_request_id():
        # Respect incoming X-Request-ID when present
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        # Store on flask.g to be accessible during response
        g.request_id = request_id

    @app.after_request
    def envelope_response(response):
        try:
            # Only modify JSON responses
            content_type = response.headers.get('Content-Type', '')
            if 'application/json' in content_type.lower():
                # Attempt to parse existing JSON
                raw = response.get_data(as_text=True) or ''
                try:
                    payload = json.loads(raw)
                except Exception:
                    payload = None

                # Repair legacy array-shaped responses created via incorrect
                # `jsonify(payload, status)` usage: a JSON array like [payload,201]
                # was produced while HTTP status stayed 200. Detect that and
                # normalize the outgoing response so clients get the correct
                # HTTP status and payload.
                if isinstance(payload, list) and len(payload) >= 2 and isinstance(payload[-1], int):
                    try:
                        corrected_payload = payload[0]
                        corrected_status = int(payload[-1])
                        # Update the Response object's status to the corrected value
                        response.status_code = corrected_status
                        # Replace payload variable so the envelope logic below
                        # places the corrected payload under 'data' or 'error'.
                        payload = corrected_payload
                        # Also update raw text to the corrected payload to avoid
                        # re-parsing differences later
                        raw = json.dumps(payload)
                    except Exception:
                        # If repair fails, continue to normal processing
                        pass

                # If payload already contains 'success' and 'requestId', assume envelope present
                if isinstance(payload, dict) and ('success' in payload and 'requestId' in payload):
                    response.headers['X-Request-ID'] = g.get('request_id')
                    return response

                # Defensive flattening: if we see an envelope whose `data` is itself
                # an envelope (double-wrapped), normalize to a single envelope by
                # lifting the inner payload up. This avoids producing responses like
                # { success: true, data: { success: true, data: { ... } } } which
                # clients may not unwrap consistently.
                if isinstance(payload, dict) and isinstance(payload.get('data'), dict):
                    inner = payload.get('data')
                    if isinstance(inner, dict) and 'success' in inner:
                        try:
                            flattened = {
                                'success': payload.get('success', inner.get('success')),
                                # Prefer inner.data if present, otherwise fall back to the inner object itself
                                'data': inner.get('data', inner),
                                'requestId': payload.get('requestId') or inner.get('requestId') or g.get('request_id'),
                                'timestamp': payload.get('timestamp') or inner.get('timestamp') or datetime.utcnow().isoformat() + 'Z'
                            }
                            response.set_data(json.dumps(flattened))
                            response.headers['Content-Type'] = 'application/json'
                            response.headers['X-Request-ID'] = flattened['requestId']
                            return response
                        except Exception:
                            # If flattening unexpectedly fails, continue to the normal
                            # envelope logic below so we do not alter the response flow.
                            pass

                # If caller returned the unified envelope shape (has 'success') but
                # omitted 'requestId' or 'timestamp', treat it as already-enveloped and
                # inject missing tracing fields instead of wrapping again. This avoids
                # double-wrapping the response (which produced nested `data` fields).
                if isinstance(payload, dict) and ('success' in payload):
                    try:
                        if 'requestId' not in payload:
                            payload['requestId'] = g.get('request_id')
                        if 'timestamp' not in payload:
                            payload['timestamp'] = datetime.utcnow().isoformat() + 'Z'
                        response.set_data(json.dumps(payload))
                        response.headers['Content-Type'] = 'application/json'
                        response.headers['X-Request-ID'] = g.get('request_id')
                        return response
                    except Exception:
                        # If we fail to mutate the existing payload, fall back to wrapping below
                        pass

                # Build envelope
                envelope = {
                    'success': 200 <= response.status_code < 400,
                    'requestId': g.get('request_id'),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }

                if 200 <= response.status_code < 400:
                    # For success responses, place existing payload under 'data'
                    envelope['data'] = payload if payload is not None else None
                else:
                    # For error responses, place the payload (or status text) under 'error'
                    envelope['error'] = payload if payload is not None else response.status

                response.set_data(json.dumps(envelope))
                response.headers['Content-Type'] = 'application/json'
                response.headers['X-Request-ID'] = g.get('request_id')
                return response
        except Exception as e:
            # Do not break response path on instrumentation errors
            app.logger.debug('response_envelope error: %s', e)
        return response

def success_response(data=None, status_code=200):
    """Helper to return a success response that respects the envelope structure."""
    return jsonify({'success': True, 'data': data}), status_code

def error_response(message, status_code=400):
    """Helper to return an error response that respects the envelope structure."""
    return jsonify({'success': False, 'error': {'message': message}}), status_code
