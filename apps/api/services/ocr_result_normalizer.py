"""Normalize raw PaddleOCR results into a uniform list of dicts.

Handles all the different return shapes PaddleOCR can produce:
- list of lists (nested box + (text, confidence) tuples)
- list of dicts with 'text' key
- single dict with 'text' key
- None
"""

import logging
from utils.turkish_ocr import post_process_ocr_text

logger = logging.getLogger(__name__)


def normalize_ocr_result(raw_result) -> list[dict]:
    """Convert a raw PaddleOCR result into a flat list of
    ``{'text': str, 'confidence': float}`` dicts.

    Applies Turkish OCR post-processing (Unicode normalization + diacritical
    error correction) to every extracted text segment.

    Returns an empty list when *raw_result* is ``None`` or empty.
    """
    if raw_result is None:
        return []

    # Already a list of entity dicts (e.g. from external worker)
    if isinstance(raw_result, list) and all(
        isinstance(x, dict) and "text" in x for x in raw_result
    ):
        return [
            {
                "text": post_process_ocr_text(str(x.get("text")).strip()),
                "confidence": _safe_float(x.get("confidence"), 1.0),
            }
            for x in raw_result
        ]

    # Single dict with 'text' key
    if isinstance(raw_result, dict) and "text" in raw_result:
        return [
            {
                "text": post_process_ocr_text(str(raw_result["text"])),
                "confidence": _safe_float(raw_result.get("confidence"), 1.0),
            }
        ]

    # Iterable of heterogeneous items (the most common PaddleOCR shape)
    results: list[dict] = []
    for line in raw_result:
        if isinstance(line, (list, tuple)):
            _parse_nested_line(line, results)
        elif isinstance(line, dict) and "text" in line:
            results.append(
                {
                    "text": post_process_ocr_text(str(line["text"])),
                    "confidence": _safe_float(line.get("confidence"), 1.0),
                }
            )
        else:
            results.append({"text": post_process_ocr_text(str(line)), "confidence": 1.0})

    return results


def _parse_nested_line(line, results: list[dict]) -> None:
    """Parse a single nested line from PaddleOCR output.

    Each *line* is typically a list of ``[box_coords, (text, confidence)]``
    pairs, but several other shapes are tolerated.
    """
    for res in line:
        if isinstance(res, (list, tuple)) and len(res) >= 2:
            text_val, confidence = _extract_text_and_confidence(res[1])
        elif isinstance(res, dict) and "text" in res:
            text_val = res["text"]
            confidence = _safe_float(res.get("confidence"), 1.0)
        else:
            text_val = str(res)
            confidence = 1.0

        results.append(
            {
                "text": post_process_ocr_text(str(text_val).strip()),
                "confidence": _safe_float(confidence, 1.0),
            }
        )


def _extract_text_and_confidence(maybe_text):
    """Return ``(text, confidence)`` from a value that may be a tuple, list,
    or plain string."""
    if isinstance(maybe_text, (list, tuple)) and len(maybe_text) >= 1:
        text_val = maybe_text[0]
        confidence = maybe_text[1] if len(maybe_text) > 1 else 1.0
    else:
        text_val = maybe_text
        confidence = 1.0
    return text_val, confidence


def _safe_float(value, default: float) -> float:
    """Convert *value* to float, returning *default* on ``None`` or error."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
