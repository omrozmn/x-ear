"""Legacy extension compatibility layer.

Reason: The backend runtime is FastAPI-only, but a few scripts still import `extensions.db`.
Expected outcome: This module stays importable without Flask installed, enabling removal of Flask dependencies.
"""

from __future__ import annotations

from models.base import db

__all__ = ["db"]
