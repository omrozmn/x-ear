"""
File validation utilities for upload security.
Validates file content via magic bytes - no external dependencies needed.
"""
import os
import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Magic byte signatures for allowed file types
MAGIC_SIGNATURES: dict[str, list[tuple[bytes, int]]] = {
    "image/jpeg": [(b"\xff\xd8\xff", 0)],
    "image/png": [(b"\x89PNG\r\n\x1a\n", 0)],
    "image/bmp": [(b"BM", 0)],
    "image/tiff": [(b"II\x2a\x00", 0), (b"MM\x00\x2a", 0)],
    "image/webp": [(b"RIFF", 0)],  # RIFF header, further check for WEBP
    "application/pdf": [(b"%PDF", 0)],
}

# Extension to expected MIME type mapping
EXTENSION_MIME_MAP: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".bmp": "image/bmp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".csv": "text/csv",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

# Tabular extensions bypass magic byte check (no reliable magic bytes)
TABULAR_EXTENSIONS = {".csv", ".xls", ".xlsx"}

MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB


def validate_upload_mime(content: bytes, filename: str | None) -> str:
    """Validate uploaded file content via magic bytes and extension.

    Returns the validated MIME type string.
    Raises HTTPException(400) on validation failure.
    """
    if not content:
        raise HTTPException(status_code=400, detail="Dosya bos. Lutfen gecerli bir dosya yukleyin.")

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya boyutu cok buyuk (max {MAX_UPLOAD_SIZE // (1024 * 1024)} MB).",
        )

    ext = _get_extension(filename)

    if ext not in EXTENSION_MIME_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya turu: {ext}. Kabul edilen: {', '.join(sorted(EXTENSION_MIME_MAP.keys()))}",
        )

    # Tabular files: extension check is sufficient
    if ext in TABULAR_EXTENSIONS:
        return EXTENSION_MIME_MAP[ext]

    # Binary files: verify magic bytes
    expected_mime = EXTENSION_MIME_MAP[ext]
    signatures = MAGIC_SIGNATURES.get(expected_mime, [])

    if not signatures:
        logger.warning(f"No magic signature defined for {expected_mime}, accepting by extension")
        return expected_mime

    matched = any(
        len(content) > offset and content[offset : offset + len(sig)] == sig
        for sig, offset in signatures
    )

    if not matched:
        logger.warning(
            f"MIME mismatch: file '{filename}' has extension {ext} "
            f"but magic bytes do not match {expected_mime}"
        )
        raise HTTPException(
            status_code=400,
            detail="Dosya icerigi uzantisiyla uyusmuyor. Lutfen gecerli bir dosya yukleyin.",
        )

    return expected_mime


def _get_extension(filename: str | None) -> str:
    """Extract lowercase extension from filename."""
    if not filename:
        return ".tmp"
    _, ext = os.path.splitext(filename)
    return ext.lower() if ext else ".tmp"
