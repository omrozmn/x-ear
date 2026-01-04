from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from schemas.base import ApiError, ResponseEnvelope


def _now_iso_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    request_id = request.headers.get("X-Request-Id") or request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    start = time.monotonic()
    response = await call_next(request)
    duration_ms = int((time.monotonic() - start) * 1000)

    response.headers["X-Request-Id"] = request_id
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    return response


def envelope_success(data=None, *, request_id: str | None = None, meta: dict | None = None, status_code: int = 200) -> JSONResponse:
    payload = ResponseEnvelope(
        data=data,
        meta=meta,
        requestId=request_id,
    ).model_dump(mode="json", by_alias=True)
    return JSONResponse(payload, status_code=status_code)


def envelope_error(message: str, *, request_id: str | None = None, code: str = "INTERNAL_ERROR", status_code: int = 500, details=None) -> JSONResponse:
    payload = ResponseEnvelope(
        success=False,
        error=ApiError(message=message, code=code, details=details).model_dump(by_alias=True),
        requestId=request_id,
    ).model_dump(mode="json", by_alias=True)
    return JSONResponse(payload, status_code=status_code)
