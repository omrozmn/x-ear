"""
Script to auto-apply @idempotent to all write endpoints that are not yet decorated.

Usage: python -m backend.scripts.apply_idempotency_globally

This is a best-effort script that inspects routes registered on the Flask app
and decorates view functions that match configured heuristics (methods contain
POST/PUT/PATCH/DELETE and function isn't already decorated).

Note: This mutates functions at runtime only for the running process and does
not write code. It is intended for bootstrapping and as a migration step to
identify endpoints that should be explicitly decorated in source.
"""

from app import app
from utils.idempotency import idempotent
import logging

logger = logging.getLogger('apply_idempotency')

# Heuristics: apply to routes that use write methods and are not already marked
WRITE_METHODS = set(['POST', 'PUT', 'PATCH', 'DELETE'])

applied = []
skipped = []

for rule in app.url_map.iter_rules():
    methods = set(m.upper() for m in rule.methods if m and m.isalpha())
    if methods & WRITE_METHODS:
        endpoint = rule.endpoint
        view_fn = app.view_functions.get(endpoint)
        if not view_fn:
            continue
        # Skip if function already marked as idempotent
        if getattr(view_fn, '_is_idempotent', False):
            skipped.append((endpoint, rule.rule))
            continue
        # Apply decorator with default method list
        try:
            wrapped = idempotent(methods=['POST', 'PUT', 'PATCH'])(view_fn)
            # Replace the view function in the app
            app.view_functions[endpoint] = wrapped
            applied.append((endpoint, rule.rule))
            logger.info(f"Applied idempotency to endpoint {endpoint} ({rule.rule})")
        except Exception as e:
            logger.exception(f"Failed to apply idempotency to {endpoint}: {e}")

print(f"Applied to {len(applied)} endpoints, skipped {len(skipped)} already-decorated ones")
for e, r in applied[:200]:
    print(f" + {e} -> {r}")
for e, r in skipped[:200]:
    print(f" - skipped {e} -> {r}")
