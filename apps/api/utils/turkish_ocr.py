"""Turkish language OCR post-processing utilities.

Handles:
- Unicode normalization (NFKD) for consistent character representation
- Common PaddleOCR misrecognition corrections for Turkish chars
- Diacritical-insensitive matching for search/comparison
"""
import re
import unicodedata

# Common OCR misrecognitions for Turkish characters and their corrections.
# Scored by context: OCR often drops diacritics (ş→s, ç→c) in medical text.
_TR_OCR_CORRECTIONS: list[tuple[re.Pattern, str]] = [
    # "isitme" → "işitme" (most common OCR error in hearing domain)
    (re.compile(r"\bisitme\b", re.IGNORECASE), "işitme"),
    # "sagirlik" → "sağırlık"
    (re.compile(r"\bsagirlik\b", re.IGNORECASE), "sağırlık"),
    # "ozyometri" / "odyometri" already correct but "odiyometri" variant
    (re.compile(r"\bodiyometri\b", re.IGNORECASE), "odyometri"),
    # "recete" → "reçete"
    (re.compile(r"\brecete\b", re.IGNORECASE), "reçete"),
    # "cihazi" → "cihazı"
    (re.compile(r"\bcihazi\b", re.IGNORECASE), "cihazı"),
    # "kaybi" → "kaybı"
    (re.compile(r"\bkaybi\b", re.IGNORECASE), "kaybı"),
    # "azalmasi" → "azalması"
    (re.compile(r"\bazalmasi\b", re.IGNORECASE), "azalması"),
    # "muayene" is usually correct but "mueyene" sometimes appears
    (re.compile(r"\bmueyene\b", re.IGNORECASE), "muayene"),
    # "doktor" / "doktor" – sometimes "doktur"
    (re.compile(r"\bdoktur\b", re.IGNORECASE), "doktor"),
    # "gürültü" vs "gurultu"
    (re.compile(r"\bgurultu\b", re.IGNORECASE), "gürültü"),
]

# All Turkish special characters for validation
_TR_ALPHABET = set("abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")


def normalize_turkish_unicode(text: str) -> str:
    """Apply NFKC normalization to ensure consistent Turkish character representation.

    NFKC is preferred over NFKD because it composes characters back (e.g. ş stays as
    a single codepoint rather than s + combining cedilla).
    """
    if not text:
        return text
    return unicodedata.normalize("NFKC", text)


def strip_turkish_diacritics(text: str) -> str:
    """Remove Turkish diacritics for search/comparison (lossy).

    ç→c, ğ→g, ı→i, İ→I, ö→o, ş→s, ü→u
    """
    if not text:
        return text
    table = str.maketrans("çğıİöşüÇĞÖŞÜ", "cgiIosuCGOSU")
    return text.translate(table)


def correct_turkish_ocr_errors(text: str) -> str:
    """Apply context-aware corrections for common PaddleOCR Turkish misrecognitions.

    Only corrects well-known medical/hearing domain terms to avoid false positives.
    """
    if not text:
        return text
    result = text
    for pattern, replacement in _TR_OCR_CORRECTIONS:
        result = pattern.sub(replacement, result)
    return result


def post_process_ocr_text(text: str) -> str:
    """Full Turkish OCR post-processing pipeline.

    1. Unicode normalize (NFKC)
    2. Apply known OCR error corrections
    """
    if not text:
        return text
    text = normalize_turkish_unicode(text)
    text = correct_turkish_ocr_errors(text)
    return text


def turkish_fuzzy_contains(haystack: str, needle: str, threshold: float = 0.80) -> bool:
    """Check if needle appears in haystack with fuzzy tolerance for OCR errors.

    Uses diacritical-insensitive comparison first, then Levenshtein ratio
    for remaining mismatches.
    """
    if not haystack or not needle:
        return False

    # Fast path: exact match after stripping diacritics
    hay_stripped = strip_turkish_diacritics(haystack.lower())
    needle_stripped = strip_turkish_diacritics(needle.lower())

    if needle_stripped in hay_stripped:
        return True

    # Sliding window Levenshtein for fuzzy substring match
    needle_len = len(needle_stripped)
    if needle_len == 0:
        return False

    for i in range(len(hay_stripped) - needle_len + 1):
        window = hay_stripped[i : i + needle_len]
        ratio = _quick_ratio(window, needle_stripped)
        if ratio >= threshold:
            return True

    return False


def _quick_ratio(a: str, b: str) -> float:
    """Fast character-level similarity ratio (0.0 to 1.0)."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    matches = sum(1 for ca, cb in zip(a, b) if ca == cb)
    return (2.0 * matches) / (len(a) + len(b))
