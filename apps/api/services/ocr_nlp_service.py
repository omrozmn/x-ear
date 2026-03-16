"""NLP utilities for Turkish medical document processing.

All functions receive dependencies as explicit arguments -- no hidden state.
"""
import logging
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pattern & term setup
# ---------------------------------------------------------------------------

def add_medical_patterns(nlp):
    """Build and return a spaCy Matcher pre-loaded with medical patterns."""
    if nlp is None:
        return None
    try:
        from spacy.matcher import Matcher
        matcher = Matcher(nlp.vocab)
        matcher.add("TC_NUMBER", [[{"TEXT": {"REGEX": r"\d{11}"}}]])
        matcher.add("MEDICAL_DEVICE", [
            [{"LOWER": "işitme"}, {"LOWER": "cihazı"}],
            [{"LOWER": "isitme"}, {"LOWER": "cihazi"}],
            [{"LOWER": "hearing"}, {"LOWER": "aid"}],
            [{"LOWER": "koklear"}, {"LOWER": "implant"}],
            [{"LOWER": "cochlear"}, {"LOWER": "implant"}],
        ])
        matcher.add("MEDICAL_CONDITION", [
            [{"LOWER": "işitme"}, {"LOWER": "kaybı"}],
            [{"LOWER": "isitme"}, {"LOWER": "kaybi"}],
            [{"LOWER": "hearing"}, {"LOWER": "loss"}],
            [{"LOWER": "sağırlık"}], [{"LOWER": "sagirlik"}],
            [{"LOWER": "tinnitus"}], [{"LOWER": "vertigo"}],
        ])
        matcher.add("PATIENT_NAME", [
            [{"LOWER": "hasta"}, {"LOWER": "adi"}, {"LOWER": "soyadi"},
             {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True, "LENGTH": {">=": 2}}],
            [{"LOWER": "patient"}, {"LOWER": "name"},
             {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True, "LENGTH": {">=": 2}}],
        ])
        matcher.add("DOCTOR_STAFF", [
            [{"LOWER": "dr"}, {"IS_PUNCT": True, "OP": "?"}, {"IS_ALPHA": True}],
            [{"LOWER": "doktor"}, {"IS_ALPHA": True}],
        ])
        return matcher
    except Exception as e:
        logger.warning(f"Failed to add medical patterns: {e}")
        return None


def load_medical_terms() -> dict[str, list[str]]:
    """Return domain-specific medical terminology dictionary.

    Terms include both proper Turkish (with diacritics) and common OCR-stripped
    variants so that fuzzy matching catches both.
    """
    return {
        "hearing_conditions": [
            "işitme kaybı", "isitme kaybi", "işitme azalması", "isitme azalmasi",
            "sağırlık", "sagirlik", "hearing loss",
            "sensörinöral işitme kaybı", "sensorinoral isitme kaybi",
            "iletim tipi işitme kaybı", "karma tip işitme kaybı",
            "presbyküzi", "presbykuzi", "ototoksisite",
        ],
        "devices": [
            "işitme cihazı", "isitme cihazi", "hearing aid", "işitme aleti",
            "BTE", "ITE", "CIC", "RIC", "kulak arkası cihaz", "kulak arkasi cihaz",
            "kulak içi cihaz", "kulak ici cihaz",
            "koklear implant", "cochlear implant",
        ],
        "procedures": [
            "odyometri", "audiometry", "işitme testi", "isitme testi",
            "timpanometri", "ABR", "ameliyat", "surgery",
        ],
    }

# ---------------------------------------------------------------------------
# Entity extraction & classification
# ---------------------------------------------------------------------------

def extract_custom_entities(nlp, matcher, text) -> list[dict]:
    """Extract custom medical entities from *text* using *matcher*."""
    if nlp is None or matcher is None:
        return []
    try:
        doc = nlp(text)
        return [
            {"text": doc[s:e].text, "label": nlp.vocab.strings[mid],
             "start": doc[s:e].start_char, "end": doc[s:e].end_char,
             "confidence": 0.9}
            for mid, s, e in matcher(doc)
        ]
    except Exception as e:
        logger.warning(f"extract_custom_entities error: {e}")
        return []


def classify_document(text) -> dict:
    """Classify medical document type using keyword heuristics.

    Uses diacritical-insensitive matching to handle OCR errors
    (e.g. 'recete' matches even if OCR missed 'reçete').
    """
    from utils.turkish_ocr import strip_turkish_diacritics
    text_stripped = strip_turkish_diacritics(text.lower())
    rules = [
        (["sgk", "sosyal guvenlik", "cihaz raporu"], "sgk_device_report", 0.95),
        (["recete", "prescription", "ilac"], "prescription", 0.90),
        (["odyometri", "audiometry", "isitme testi"], "audiometry_report", 0.88),
        (["rapor", "muayene", "bulgular"], "medical_report", 0.75),
    ]
    for keywords, doc_type, confidence in rules:
        if any(kw in text_stripped for kw in keywords):
            return {"type": doc_type, "confidence": confidence}
    return {"type": "other", "confidence": 0.50}


def extract_medical_terms(medical_terms: dict, text: str) -> list[dict]:
    """Find known medical terms in *text* using fuzzy Turkish-aware matching.

    Uses diacritical-insensitive comparison + sliding window fuzzy match
    to tolerate common OCR errors (e.g. 'isitme' matching 'işitme').
    """
    from utils.turkish_ocr import turkish_fuzzy_contains, strip_turkish_diacritics

    found: list[dict] = []
    if not text:
        return found
    text_lower = text.lower()
    text_stripped = strip_turkish_diacritics(text_lower)
    seen_terms: set[str] = set()

    for category, terms in (medical_terms or {}).items():
        for term in terms:
            # Deduplicate: skip if the same canonical term already matched
            canonical = strip_turkish_diacritics(term.lower())
            if canonical in seen_terms:
                continue

            # Fast exact check first (diacritical-insensitive)
            term_stripped = strip_turkish_diacritics(term.lower())
            pos = text_stripped.find(term_stripped)
            if pos != -1:
                seen_terms.add(canonical)
                found.append({"term": term, "category": category,
                              "start": pos, "end": pos + len(term)})
                continue

            # Fuzzy fallback for OCR errors
            if turkish_fuzzy_contains(text_lower, term.lower(), threshold=0.80):
                seen_terms.add(canonical)
                found.append({"term": term, "category": category,
                              "start": -1, "end": -1})
    return found

# ---------------------------------------------------------------------------
# Patient name extraction
# ---------------------------------------------------------------------------

_NAME_PATTERNS = [
    r"HASTA\s+ADI?\s+SOYADI?\s*[:\-]\s*(.+)",
    r"PATIENT\s+NAME\s*[:\-]\s*(.+)",
    r"Hasta Bilgileri\s*[:\-]\s*(.+)",
]
_NAME_CLEAN_RE = re.compile(
    r"[^A-Za-z\u00C7\u011E\u0130\u00D6\u015E\u00DC"
    r"\u00E7\u011F\u0131\u00F6\u015F\u00FC\s\-]")


def extract_patient_name(nlp, matcher, hf_ner, medical_terms,
                         paddleocr_available, ocr_caller, image_path, text):
    """Extract patient name from OCR results or raw text.

    Returns ``{'name': str, 'confidence': float}`` or ``None``.
    """
    ocr_lines = _collect_ocr_lines(text, image_path, paddleocr_available, ocr_caller)
    full_text = "\n".join(ocr_lines)
    return (_try_hf_ner(hf_ner, full_text)
            or _try_spacy_ner(nlp, full_text)
            or _try_regex_patterns(ocr_lines)
            or _try_next_line_heuristic(ocr_lines)
            or _try_matcher(nlp, matcher, full_text))


def _collect_ocr_lines(text, image_path, paddleocr_available, ocr_caller):
    if text and isinstance(text, str):
        return [line for line in text.splitlines() if line.strip()]
    if not (paddleocr_available and image_path and ocr_caller):
        return []
    try:
        raw = ocr_caller(image_path)
        if not raw:
            return []
        from services.ocr_result_normalizer import normalize_ocr_result
        return [e["text"] for e in normalize_ocr_result(raw) if e.get("text")]
    except Exception as e:
        logger.warning(f"extract_patient_name OCR failed: {e}")
        return []


def _try_hf_ner(hf_ner, full_text):
    if not hf_ner:
        return None
    try:
        persons = [e for e in hf_ner(full_text)
                   if e.get("entity_group") in ("PER", "PERSON")]
        if persons:
            best = max(persons, key=lambda e: e.get("score", 0))
            return {"name": best["word"].strip(),
                    "confidence": float(best.get("score", 0.9))}
    except Exception as e:
        logger.warning(f"HF NER failed: {e}")
    return None


def _try_spacy_ner(nlp, full_text):
    if not nlp:
        return None
    try:
        doc = nlp(full_text)
        persons = [ent for ent in getattr(doc, "ents", [])
                   if ent.label_ in ("PER", "PERSON", "Person", "PERSON_NAME")]
        if persons:
            best = max(persons, key=lambda e: len(e.text))
            return {"name": best.text.strip(), "confidence": 0.95}
    except Exception:
        pass
    return None


def _try_regex_patterns(ocr_lines):
    for line in ocr_lines:
        for pattern in _NAME_PATTERNS:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                name = _NAME_CLEAN_RE.sub("", match.group(1)).strip()
                if len(name.split()) >= 2:
                    return {"name": name, "confidence": 0.9}
    return None


def _try_next_line_heuristic(ocr_lines):
    for i, line in enumerate(ocr_lines):
        low = line.lower()
        if "hasta" in low and ("adi" in low or "ad" in low) and "soyad" in low:
            j = i + 1
            while j < len(ocr_lines) and not ocr_lines[j].strip():
                j += 1
            if j < len(ocr_lines):
                candidate = _NAME_CLEAN_RE.sub("", ocr_lines[j]).strip()
                words = candidate.split()
                if len(words) >= 2 and any(w[0].isupper() for w in words if w):
                    return {"name": candidate, "confidence": 0.88}
    return None


def _try_matcher(nlp, matcher, full_text):
    if not (nlp and matcher):
        return None
    try:
        ents = extract_custom_entities(nlp, matcher, full_text)
        matches = [e for e in ents if e.get("label") == "PATIENT_NAME"]
        if matches:
            return {"name": matches[0]["text"],
                    "confidence": matches[0].get("confidence", 0.9)}
    except Exception:
        pass
    return None
