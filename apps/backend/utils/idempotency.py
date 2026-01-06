"""Deprecated Flask-only idempotency module.

Reason: Idempotency is implemented as an ASGI middleware in `main.py`.
Expected outcome: importing this module no longer drags Flask into the runtime.
"""

raise RuntimeError(
    "`utils.idempotency` was Flask-only and is no longer supported. "
    "Use the Idempotency-Key middleware in `main.py`."
)