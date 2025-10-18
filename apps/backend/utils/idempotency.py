#!/usr/bin/env python3
"""
Idempotency utilities for ensuring API requests with the same Idempotency-Key
only create resources once.
"""

import hashlib
import json
import time
from functools import wraps
from typing import Any, Dict, Optional, Tuple

from flask import request, jsonify, current_app
from extensions import db, redis_client


class IdempotencyStore:
    """Store for idempotency keys and their associated responses."""
    
    def __init__(self, redis_client=None, ttl_seconds=3600):
        self.redis_client = redis_client
        self.ttl_seconds = ttl_seconds
    
    def _get_key(self, idempotency_key: str, endpoint: str, user_id: str = None) -> str:
        """Generate a unique key for storing idempotency data."""
        key_parts = [idempotency_key, endpoint]
        if user_id:
            key_parts.append(user_id)
        return f"idempotency:{':'.join(key_parts)}"
    
    def get_response(self, idempotency_key: str, endpoint: str, user_id: str = None) -> Optional[Dict]:
        """Get stored response for an idempotency key.

        Tries Redis first, then falls back to DB `idempotency_keys` table when Redis
        is not available. Returns None when no stored response found.
        
        NOTE: This method now defensively detects legacy malformed stored shapes
        such as JSON arrays like [payload, 201] (produced by incorrect use of
        `jsonify(payload, 201)`) and repairs them in-place in both Redis and the
        DB so callers always receive a canonical dict: { response, status_code, headers?, created_at? }.
        """
        if self.redis_client:
            key = self._get_key(idempotency_key, endpoint, user_id)
            try:
                current_app.logger.info(f"get_response: checking Redis for key={key}")
                data = self.redis_client.get(key)
                if data:
                    try:
                        parsed = json.loads(data)
                    except Exception as _e:
                        current_app.logger.warning(f"Failed to parse idempotency cached JSON for key={key}: {_e}")
                        parsed = None

                    # If the cached entry exists, normalize any legacy array-shaped
                    # response (e.g. { response: [payload, 201], status_code: 200 })
                    if isinstance(parsed, dict):
                        resp = parsed.get('response')
                        stored_status = parsed.get('status_code')

                        # Detect legacy array-shaped body (JSON array like [payload, status])
                        if isinstance(resp, list) and len(resp) >= 2 and isinstance(resp[-1], int):
                            corrected_payload = resp[0]
                            corrected_status = int(resp[-1])

                            # Update cache entry to canonical shape
                            parsed['response'] = corrected_payload
                            parsed['status_code'] = corrected_status
                            try:
                                # Overwrite Redis cache with corrected canonical entry
                                self.redis_client.setex(key, self.ttl_seconds, json.dumps(parsed))
                            except Exception as _e:
                                current_app.logger.warning(f"Failed to update idempotency Redis cache for key={key}: {_e}")

                            # Also attempt to repair DB fallback so both stores are consistent
                            try:
                                from models.idempotency import IdempotencyKey
                                row = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id).first()
                                if row:
                                    row.response_json = json.dumps(corrected_payload)
                                    row.status_code = corrected_status
                                    db.session.add(row)
                                    db.session.commit()
                                    current_app.logger.info(f'Repaired idempotency DB row for key={idempotency_key} endpoint={endpoint} to status={corrected_status} (via Redis repair)')
                            except Exception as _e:
                                current_app.logger.debug(f"Failed to repair idempotency DB row during Redis repair for key={idempotency_key}: {_e}")

                            return {
                                'response': corrected_payload,
                                'status_code': corrected_status,
                                'headers': parsed.get('headers') if parsed.get('headers') else None,
                                'created_at': None
                            }

                        # Normal cached shape — return as-is
                        return parsed

            except Exception as e:
                current_app.logger.warning(f"Failed to get idempotency response from Redis: {e}")
                # fall through and try DB fallback
        
        # DB fallback when Redis not available or fetch failed
        try:
            from models.idempotency import IdempotencyKey
            # Query by idempotency key + endpoint + user_id
            q = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id)
            row = q.first()
            if row and row.response_json is not None:
                # Load the stored JSON. Older runs may have stored a JSON array
                # like [payload, 201] due to incorrect use of `jsonify(payload, 201)`
                # (which returns a JSON array) while also storing a default 200
                # status_code. Detect that shape and repair the DB row so callers
                # receive the correct payload and status.
                try:
                    stored = json.loads(row.response_json) if row.response_json else None
                except Exception:
                    stored = None

                # Repair case: stored is a list like [payload, status_code]
                if isinstance(stored, list) and len(stored) >= 2 and isinstance(stored[-1], int):
                    corrected_payload = stored[0]
                    corrected_status = stored[-1]
                    try:
                        # Update DB to canonical shape: response_json -> payload, status_code -> corrected
                        row.response_json = json.dumps(corrected_payload)
                        row.status_code = int(corrected_status)
                        db.session.add(row)
                        db.session.commit()
                        current_app.logger.info(f'Repaired idempotency DB row for key={idempotency_key} endpoint={endpoint} to status={corrected_status}')
                    except Exception as _e:
                        current_app.logger.warning(f'Failed to repair idempotency DB row for key={idempotency_key}: {_e}')

                    # Also update Redis cache if available so future reads return canonical shape
                    if self.redis_client:
                        try:
                            cache_key = self._get_key(idempotency_key, endpoint, user_id)
                            redis_value = {
                                'response': corrected_payload,
                                'status_code': int(corrected_status),
                                'headers': json.loads(row.headers_json) if row.headers_json else None,
                                'timestamp': time.time()
                            }
                            self.redis_client.setex(cache_key, self.ttl_seconds, json.dumps(redis_value))
                        except Exception as _e:
                            current_app.logger.debug(f"Failed to update Redis cache for repaired idempotency row key={idempotency_key}: {_e}")

                    return {
                        'response': corrected_payload,
                        'status_code': int(corrected_status),
                        'headers': json.loads(row.headers_json) if row.headers_json else None,
                        'created_at': getattr(row, 'created_at', None)
                    }

                # Normal path: stored payload is already canonical
                try:
                    payload = json.loads(row.response_json) if row.response_json else None
                except Exception:
                    payload = None

                # Warm Redis cache with canonical shape so reads hit cache next time
                if self.redis_client:
                    try:
                        cache_key = self._get_key(idempotency_key, endpoint, user_id)
                        cache_value = {
                            'response': payload,
                            'status_code': row.status_code,
                            'headers': json.loads(row.headers_json) if row.headers_json else None,
                            'timestamp': time.time()
                        }
                        self.redis_client.setex(cache_key, self.ttl_seconds, json.dumps(cache_value))
                    except Exception as _e:
                        current_app.logger.debug(f"Failed to warm Redis cache for idempotency key={idempotency_key}: {_e}")

                return {
                    'response': payload,
                    'status_code': row.status_code,
                    'headers': json.loads(row.headers_json) if row.headers_json else None,
                    'created_at': getattr(row, 'created_at', None)
                }
        except Exception as e:
            current_app.logger.debug(f"DB idempotency lookup failed: {e}")
        return None
    
    def store_response(self, idempotency_key: str, endpoint: str, response_data: Dict, 
                      status_code: int, user_id: str = None) -> bool:
        """Store response for an idempotency key."""
        stored_ok = False

        # Defensive unwrap: tolerate callers who accidentally passed a wrapper
        # like { 'response': <payload>, 'status_code': 201, 'headers': ... }
        # Normalize to payload + status_code so DB gets canonical shape.
        try:
            if isinstance(response_data, dict) and 'response' in response_data and 'status_code' in response_data and isinstance(response_data['status_code'], int):
                try:
                    status_code = int(response_data.get('status_code') or status_code)
                    response_data = response_data.get('response')
                except Exception:
                    pass
        except Exception:
            pass

        # Defensive normalization: some legacy callers accidentally pass a
        # list-shaped response like [payload, status] (e.g. via `jsonify(payload, 201)`).
        # Normalize that shape here to prevent persisting broken entries.
        if isinstance(response_data, list) and len(response_data) >= 2 and isinstance(response_data[-1], int):
            try:
                normalized_payload = response_data[0]
                status_code = int(response_data[-1])
                response_data = normalized_payload
            except Exception:
                # If normalization fails, continue with originals
                pass

        if self.redis_client:
            key = self._get_key(idempotency_key, endpoint, user_id)
            try:
                data = {
                    'response': response_data,
                    'status_code': status_code,
                    'timestamp': time.time()
                }
                self.redis_client.setex(key, self.ttl_seconds, json.dumps(data))
                stored_ok = True
            except Exception as e:
                current_app.logger.warning(f"Failed to store idempotency response to Redis: {e}")
                stored_ok = False
        
        # Always attempt DB fallback storage so responses survive Redis outages
        try:
            from models.idempotency import IdempotencyKey
            # Upsert semantic: try to find existing record
            existing = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id).first()
            headers_json = None
            try:
                headers_json = json.dumps(response_data.get('headers') if isinstance(response_data, dict) and response_data.get('headers') else {})
            except Exception:
                headers_json = None

            if existing:
                existing.response_json = json.dumps(response_data)
                existing.status_code = status_code
                existing.headers_json = headers_json
                existing.processing = False
                db.session.add(existing)
            else:
                new = IdempotencyKey(
                    idempotency_key=idempotency_key,
                    endpoint=endpoint,
                    user_id=user_id,
                    processing=False,
                    status_code=status_code,
                    response_json=json.dumps(response_data),
                    headers_json=headers_json
                )
                db.session.add(new)
            # Debugging: log intent to commit
            try:
                current_app.logger.info(f"store_response: committing idempotency key={idempotency_key} endpoint={endpoint} status={status_code} preview={str(response_data)[:200]}")
            except Exception:
                pass
            db.session.commit()
            # Debugging: log DB commit details
            current_app.logger.warning(f"DB commit successful for idempotency key={idempotency_key} endpoint={endpoint} status={status_code}")
            stored_ok = True
        except Exception as e:
            current_app.logger.warning(f"Failed to store idempotency response to DB: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
        return stored_ok
    
    def is_processing(self, idempotency_key: str, endpoint: str, user_id: str = None) -> bool:
        """Check if a request with this idempotency key is currently being processed."""
        if self.redis_client:
            processing_key = f"processing:{self._get_key(idempotency_key, endpoint, user_id)}"
            try:
                return bool(self.redis_client.get(processing_key))
            except Exception as e:
                current_app.logger.warning(f"Failed to check processing status in Redis: {e}")
        # DB fallback
        try:
            from models.idempotency import IdempotencyKey
            row = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id).first()
            return bool(row and row.processing)
        except Exception as e:
            current_app.logger.debug(f"DB processing check failed: {e}")
        return False
    
    def mark_processing(self, idempotency_key: str, endpoint: str, user_id: str = None) -> bool:
        """Mark a request as currently being processed."""
        if self.redis_client:
            processing_key = f"processing:{self._get_key(idempotency_key, endpoint, user_id)}"
            try:
                # Set with a shorter TTL to avoid stuck processing states
                self.redis_client.setex(processing_key, 300, "1")  # 5 minutes
                return True
            except Exception as e:
                current_app.logger.warning(f"Failed to mark as processing in Redis: {e}")
        # DB fallback
        try:
            from models.idempotency import IdempotencyKey
            existing = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id).first()
            if existing:
                existing.processing = True
                db.session.add(existing)
            else:
                new = IdempotencyKey(
                    idempotency_key=idempotency_key,
                    endpoint=endpoint,
                    user_id=user_id,
                    processing=True
                )
                db.session.add(new)
            db.session.commit()
            return True
        except Exception as e:
            current_app.logger.warning(f"Failed to mark as processing in DB: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
        return False
    
    def unmark_processing(self, idempotency_key: str, endpoint: str, user_id: str = None) -> bool:
        """Remove processing mark for a request."""
        if self.redis_client:
            processing_key = f"processing:{self._get_key(idempotency_key, endpoint, user_id)}"
            try:
                self.redis_client.delete(processing_key)
                return True
            except Exception as e:
                current_app.logger.warning(f"Failed to unmark processing in Redis: {e}")
        # DB fallback
        try:
            from models.idempotency import IdempotencyKey
            existing = IdempotencyKey.query.filter_by(idempotency_key=idempotency_key, endpoint=endpoint, user_id=user_id).first()
            if existing:
                existing.processing = False
                db.session.add(existing)
                db.session.commit()
                return True
        except Exception as e:
            current_app.logger.warning(f"Failed to unmark processing in DB: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
        return False


# Global idempotency store instance
idempotency_store = IdempotencyStore(redis_client, ttl_seconds=3600)


def idempotent(methods=None, user_id_header='X-User-ID'):
    """
    Decorator to make API endpoints idempotent based on Idempotency-Key header.
    
    Args:
        methods: List of HTTP methods to apply idempotency to (default: ['POST'])
        user_id_header: Header name to get user ID from (default: 'X-User-ID')
    """
    if methods is None:
        methods = ['POST']
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Only apply idempotency to specified methods
            if request.method not in methods:
                return f(*args, **kwargs)
            
            # Get idempotency key from header
            idempotency_key = request.headers.get('Idempotency-Key')

            # Compute user scope and endpoint early for reliable logging
            user_id = request.headers.get(user_id_header)
            endpoint = request.endpoint or f"{request.method}:{request.path}"
            try:
                current_app.logger.info(f"idempotent check: idempotency_key={idempotency_key} endpoint={endpoint} user_id={user_id}")
            except Exception:
                pass

            if not idempotency_key:
                # No idempotency key provided, proceed normally
                return f(*args, **kwargs)

            # Validate idempotency key format (should be UUID-like)
            if len(idempotency_key) < 16 or len(idempotency_key) > 128:
                return jsonify({
                    'success': False,
                    'error': 'Invalid Idempotency-Key format. Must be 16-128 characters.'
                }), 400

            # Check if we already have a response for this key
            stored_response = idempotency_store.get_response(idempotency_key, endpoint, user_id)
            if stored_response:
                current_app.logger.info(f"Returning cached response for idempotency key: {idempotency_key} endpoint={endpoint} status={stored_response.get('status_code')}")
                # stored_response['response'] may be canonical or legacy-shaped; ensure
                # we never return a JSON-array body as the 'data' portion. If the
                # stored payload itself looks like [payload, status], repair on the fly
                resp_payload = stored_response.get('response')
                resp_status = stored_response.get('status_code', 200)
                if isinstance(resp_payload, list) and len(resp_payload) >= 2 and isinstance(resp_payload[-1], int):
                    try:
                        corrected_payload = resp_payload[0]
                        corrected_status = int(resp_payload[-1])
                        # Persist the repair back to stores for consistency
                        idempotency_store.store_response(idempotency_key, endpoint, corrected_payload, corrected_status, user_id)
                        # For duplicate requests to creation endpoints, prefer 200
                        return jsonify(corrected_payload), (200 if request.method == 'POST' and corrected_status == 201 else corrected_status)
                    except Exception:
                        # If repair fails, fall back to returning the raw stored values
                        pass

                # If the original stored response indicated a create (201), return
                # 200 for subsequent duplicate requests. This aligns with the test
                # expectations where the first POST to an endpoint returns 201, and
                # duplicates should return 200 with the same payload.
                if resp_status == 201:
                    try:
                        current_app.logger.info(f"Idempotent duplicate detected, returning 200 with cached payload for key={idempotency_key}")
                        return jsonify(resp_payload), 200
                    except Exception:
                        pass

                return jsonify(resp_payload), resp_status

            # No cached response, proceed with the request
            response = f(*args, **kwargs)

            # --- Normalize response BEFORE storing and BEFORE returning to client ---
            # Aim: detect legacy/malformed response bodies (e.g. JSON arrays like [payload, 201]
            # produced by `jsonify(payload, 201)`) and wrapper/envelope shapes so we
            # can persist a canonical payload and status and return the correct HTTP
            # status to the client.
            try:
                raw_json = None
                # If view returned a (body, status) tuple, inspect the body first
                if isinstance(response, tuple):
                    candidate = response[0]
                    if hasattr(candidate, 'get_json'):
                        try:
                            raw_json = candidate.get_json()
                        except Exception:
                            raw_json = None
                else:
                    # Response object
                    if hasattr(response, 'get_json'):
                        try:
                            raw_json = response.get_json()
                        except Exception:
                            raw_json = None

                # If raw_json is legacy list-shaped [payload, status], rebuild proper tuple
                if isinstance(raw_json, list) and len(raw_json) >= 2 and isinstance(raw_json[-1], int):
                    corrected_payload = raw_json[0]
                    corrected_status = int(raw_json[-1])
                    try:
                        current_app.logger.info(f"Normalized malformed list-shaped view response for idempotency key={idempotency_key} endpoint={endpoint} -> status {corrected_status}")
                    except Exception:
                        pass
                    # Replace `response` with a canonical (body, status) tuple to ensure
                    # the client receives the correct HTTP status immediately.
                    response = (jsonify(corrected_payload), corrected_status)
            except Exception as _e:
                current_app.logger.debug(f"Response normalization check failed: {_e}")

            # Extract response details into a normalized payload + status for storage
            try:
                payload_to_store = None
                status_to_store = 200

                if isinstance(response, tuple):
                    body = response[0]
                    status_candidate = response[1] if len(response) > 1 else None

                    # Determine body JSON
                    if hasattr(body, 'get_json'):
                        try:
                            body_json = body.get_json()
                        except Exception:
                            body_json = None
                    elif isinstance(body, dict):
                        body_json = body
                    else:
                        body_json = body

                    # Determine status
                    if isinstance(status_candidate, int):
                        status_to_store = int(status_candidate)
                    elif hasattr(body, 'status_code'):
                        status_to_store = int(getattr(body, 'status_code', 200))
                else:
                    # Flask Response object
                    if hasattr(response, 'get_json'):
                        try:
                            body_json = response.get_json()
                        except Exception:
                            body_json = None
                    elif isinstance(response, dict):
                        body_json = response
                    else:
                        body_json = response
                    status_to_store = int(getattr(response, 'status_code', 200))

                # Unwrap envelope shapes { success, data, ... } -> use data
                if isinstance(body_json, dict) and 'success' in body_json and 'data' in body_json:
                    body_json = body_json.get('data')

                # Unwrap wrapper shapes { response: X, status_code: N } -> use X and adjust status
                if isinstance(body_json, dict) and 'response' in body_json and 'status_code' in body_json:
                    try:
                        inner_status = body_json.get('status_code')
                        if isinstance(inner_status, (int, str)):
                            status_to_store = int(inner_status)
                    except Exception:
                        pass
                    body_json = body_json.get('response')

                # If the resulting body_json is a list-shaped legacy form, normalize it too
                if isinstance(body_json, list) and len(body_json) >= 2 and isinstance(body_json[-1], int):
                    try:
                        status_to_store = int(body_json[-1])
                        body_json = body_json[0]
                    except Exception:
                        pass

                payload_to_store = body_json

                # Log pre-commit preview for debugging
                try:
                    current_app.logger.debug(f"Storing idempotency: key={idempotency_key} endpoint={endpoint} status={status_to_store} payload_preview={str(payload_to_store)[:300]}")
                except Exception:
                    pass

                # Persist canonical payload and status
                idempotency_store.store_response(idempotency_key, endpoint, payload_to_store, status_to_store, user_id)
            except Exception as e:
                current_app.logger.warning(f"Failed to store normalized idempotency response for key={idempotency_key}: {e}")

            # When we rebuilt the response above (list-shaped -> tuple), ensure we return that
            return response
        return decorated_function
    return decorator