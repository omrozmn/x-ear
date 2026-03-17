"""Text and image similarity utilities for OCR results.

All functions are standalone and receive dependencies explicitly.
"""

import logging
import re

logger = logging.getLogger(__name__)


def calculate_similarity(nlp, ocr_caller, image_path1=None,
                         image_path2=None, text1=None, text2=None):
    """Calculate similarity between two texts or two OCR-ed images.

    Parameters
    ----------
    nlp : spaCy Language | None
    ocr_caller : callable(image_path) -> raw_result | None
        Runs OCR and returns raw PaddleOCR output.
    image_path1, image_path2 : str | None
    text1, text2 : str | None

    Returns ``{'similarity': float, 'method': str, ...}``.
    """
    try:
        text1 = _resolve_text(text1, image_path1, ocr_caller)
        text2 = _resolve_text(text2, image_path2, ocr_caller)

        if not text1 and not text2:
            return {"similarity": 0.0, "method": "none"}

        if nlp:
            result = _spacy_similarity(nlp, text1, text2)
            if result is not None:
                return result

        return _token_similarity(text1, text2)

    except Exception as e:
        logger.error(f"calculate_similarity failed: {e}")
        return {"similarity": 0.0, "method": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _resolve_text(text, image_path, ocr_caller):
    """Return text directly or by running OCR on *image_path*."""
    if text is not None:
        return text
    if not (image_path and ocr_caller):
        return ""
    try:
        from services.ocr_result_normalizer import normalize_ocr_result
        raw = ocr_caller(image_path)
        entries = normalize_ocr_result(raw)
        return " ".join(e["text"] for e in entries)
    except Exception as e:
        logger.warning(f"OCR for similarity failed: {e}")
        return ""


def _spacy_similarity(nlp, text1, text2):
    """Return a similarity dict via spaCy vectors, or ``None`` on failure."""
    try:
        doc1 = nlp(text1)
        doc2 = nlp(text2)
        sim = max(0.0, min(float(doc1.similarity(doc2)), 1.0))
        return {
            "similarity": sim,
            "method": "spacy",
            "text1_tokens": len(doc1),
            "text2_tokens": len(doc2),
        }
    except Exception as e:
        logger.warning(f"spaCy similarity failed: {e}")
        return None


def _token_similarity(text1, text2):
    """Jaccard + normalised Levenshtein fallback."""
    tokens1 = simple_tokenize(text1)
    tokens2 = simple_tokenize(text2)

    set1 = set(tokens1)
    set2 = set(tokens2)
    union = len(set1 | set2) or 1
    jaccard = len(set1 & set2) / union

    lev = normalized_levenshtein(" ".join(tokens1), " ".join(tokens2))

    similarity = max(0.0, min((jaccard * 0.6) + (lev * 0.4), 1.0))
    return {
        "similarity": similarity,
        "method": "jaccard+levenshtein",
        "jaccard": jaccard,
        "levenshtein": lev,
        "tokens1": len(tokens1),
        "tokens2": len(tokens2),
    }


def simple_tokenize(text: str) -> list[str]:
    """Tokenize *text* into lowercase words (length > 1)."""
    if not text:
        return []
    tokens = re.findall(r"[\w\u011F\u00FC\u015F\u00F6\u00E7\u0131"
                        r"\u0130\u011E\u00DC\u015E\u00D6\u00C7]+",
                        text.lower())
    return [t for t in tokens if len(t) > 1]


def normalized_levenshtein(s1: str, s2: str) -> float:
    """Return normalised similarity (0..1) between two strings."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    try:
        import importlib
        levmod = importlib.import_module("Levenshtein")
        dist = levmod.distance(s1, s2)
        return max(0.0, 1.0 - (dist / max(len(s1), len(s2))))
    except Exception:
        return _levenshtein_ratio(s1, s2)


def _levenshtein_ratio(a: str, b: str) -> float:
    """Pure-Python Levenshtein similarity ratio."""
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if la == 0 or lb == 0:
        return 0.0
    prev = list(range(lb + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * lb
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev = curr
    return max(0.0, 1.0 - (prev[-1] / max(la, lb)))
