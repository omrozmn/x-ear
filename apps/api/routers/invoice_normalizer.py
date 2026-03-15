"""
FastAPI Invoice Normalizer Proxy Router
Proxies requests to the invoice-normalizer microservice (http://localhost:8001)
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
import httpx
import io

from sqlalchemy.orm import Session
from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoice-normalizer", tags=["Invoice Normalizer"])

NORMALIZER_URL = os.getenv("INVOICE_NORMALIZER_URL", "http://localhost:8001")
TIMEOUT = 30.0


async def _proxy_get(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NORMALIZER_URL}{path}", timeout=TIMEOUT)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


async def _proxy_post_json(path: str, data: dict | list) -> dict | list:
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{NORMALIZER_URL}{path}", json=data, timeout=TIMEOUT)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


async def _proxy_put_json(path: str, data: dict | list) -> dict | list:
    async with httpx.AsyncClient() as client:
        resp = await client.put(f"{NORMALIZER_URL}{path}", json=data, timeout=TIMEOUT)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


async def _proxy_delete(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.delete(f"{NORMALIZER_URL}{path}", timeout=TIMEOUT)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


async def _proxy_upload(path: str, file: UploadFile, extra_data: dict | None = None) -> httpx.Response:
    content = await file.read()
    async with httpx.AsyncClient() as client:
        files = {"file": (file.filename, content, file.content_type or "text/csv")}
        resp = await client.post(
            f"{NORMALIZER_URL}{path}",
            files=files,
            data=extra_data or {},
            timeout=TIMEOUT,
        )
        return resp


# ── Health ─────────────────────────────────────────────────────

@router.get("/health", operation_id="invoiceNormalizerHealth")
async def health():
    """Check invoice-normalizer microservice health."""
    try:
        return await _proxy_get("/health")
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}


# ── Templates ─────────────────────────────────────────────────

@router.get("/templates", operation_id="listNormalizerTemplates")
async def list_templates(
    access: UnifiedAccess = Depends(require_access()),
):
    """List all normalizer templates."""
    data = await _proxy_get("/templates")
    return ResponseEnvelope(data=data)


@router.get("/templates/{template_id}", operation_id="getNormalizerTemplate")
async def get_template(
    template_id: str,
    access: UnifiedAccess = Depends(require_access()),
):
    """Get template details."""
    data = await _proxy_get(f"/templates/{template_id}")
    return ResponseEnvelope(data=data)


@router.post("/templates", operation_id="createNormalizerTemplate")
async def create_template(
    name: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access()),
):
    """Create a new normalizer template by uploading a sample file."""
    resp = await _proxy_upload("/templates", file, {"name": name, "description": description})
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return ResponseEnvelope(data=resp.json())


@router.delete("/templates/{template_id}", operation_id="deleteNormalizerTemplate")
async def delete_template(
    template_id: str,
    access: UnifiedAccess = Depends(require_access()),
):
    """Delete a normalizer template."""
    data = await _proxy_delete(f"/templates/{template_id}")
    return ResponseEnvelope(data=data)


# ── Mapping ────────────────────────────────────────────────────

@router.post("/templates/{template_id}/suggest-mapping", operation_id="suggestNormalizerMapping")
async def suggest_mapping(
    template_id: str,
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access()),
):
    """Upload an input file to get AI-suggested column mappings."""
    resp = await _proxy_upload(f"/templates/{template_id}/suggest-mapping", file)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return ResponseEnvelope(data=resp.json())


@router.put("/templates/{template_id}/mappings", operation_id="saveNormalizerMappings")
async def save_mappings(
    template_id: str,
    rules: list[dict],
    access: UnifiedAccess = Depends(require_access()),
):
    """Save confirmed mapping rules."""
    data = await _proxy_put_json(f"/templates/{template_id}/mappings", rules)
    return ResponseEnvelope(data=data)


@router.get("/templates/{template_id}/mappings", operation_id="getNormalizerMappings")
async def get_mappings(
    template_id: str,
    access: UnifiedAccess = Depends(require_access()),
):
    """Get current mapping rules for a template."""
    data = await _proxy_get(f"/templates/{template_id}/mappings")
    return ResponseEnvelope(data=data)


# ── Normalize ──────────────────────────────────────────────────

@router.post("/templates/{template_id}/normalize", operation_id="normalizeWithTemplate")
async def normalize_with_template(
    template_id: str,
    file: UploadFile = File(...),
    separator: str = Query(";"),
    access: UnifiedAccess = Depends(require_access()),
):
    """Normalize a file using a specific template. Returns CSV download."""
    resp = await _proxy_upload(
        f"/templates/{template_id}/normalize?separator={separator}", file
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    cd = resp.headers.get("content-disposition", "attachment; filename=normalized.csv")
    return StreamingResponse(
        io.BytesIO(resp.content),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": cd,
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/normalize", operation_id="normalizeLegacy")
async def normalize_legacy(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access()),
):
    """Legacy normalize using default template."""
    resp = await _proxy_upload("/normalize", file)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return StreamingResponse(
        io.BytesIO(resp.content),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="normalized_invoice.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ── History ────────────────────────────────────────────────────

@router.get("/templates/{template_id}/history", operation_id="getNormalizerHistory")
async def get_history(
    template_id: str,
    limit: int = Query(50, ge=1, le=200),
    access: UnifiedAccess = Depends(require_access()),
):
    """Get normalization history for a template."""
    data = await _proxy_get(f"/templates/{template_id}/history?limit={limit}")
    return ResponseEnvelope(data=data)
