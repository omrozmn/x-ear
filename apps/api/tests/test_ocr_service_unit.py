"""Unit tests for OCR service modules: normalizer, classifier, similarity."""
import pytest
from services.ocr_result_normalizer import normalize_ocr_result
from services.ocr_nlp_service import classify_document, extract_medical_terms, load_medical_terms
from services.ocr_similarity_service import (
    calculate_similarity,
    simple_tokenize,
    normalized_levenshtein,
)


class TestOcrResultNormalizer:
    def test_none_returns_empty(self):
        assert normalize_ocr_result(None) == []

    def test_list_of_dicts_with_text(self):
        raw = [{"text": "hello", "confidence": 0.9}, {"text": "world", "confidence": 0.8}]
        result = normalize_ocr_result(raw)
        assert len(result) == 2
        assert result[0]["text"] == "hello"
        assert result[0]["confidence"] == 0.9

    def test_single_dict_with_text(self):
        raw = {"text": "single line", "confidence": 0.95}
        result = normalize_ocr_result(raw)
        assert len(result) == 1
        assert result[0]["text"] == "single line"

    def test_nested_paddle_format(self):
        raw = [[[[[0, 0], [100, 0], [100, 30], [0, 30]], ("detected text", 0.88)]]]
        result = normalize_ocr_result(raw)
        assert len(result) >= 1
        assert any("detected text" in r["text"] for r in result)

    def test_empty_list_returns_empty(self):
        assert normalize_ocr_result([]) == []

    def test_string_fallback(self):
        raw = [["just a string"]]
        result = normalize_ocr_result(raw)
        assert len(result) >= 1


class TestDocumentClassifier:
    def test_sgk_report_detected(self):
        text = "SGK Cihaz Raporu - Sosyal Guvenlik Kurumu"
        result = classify_document(text)
        assert result["type"] == "sgk_device_report"
        assert result["confidence"] >= 0.9

    def test_prescription_detected(self):
        text = "Recete No: 12345 - Ilac: Amoksisilin"
        result = classify_document(text)
        assert result["type"] == "prescription"

    def test_audiometry_detected(self):
        text = "Odyometri testi sonuclari - isitme testi"
        result = classify_document(text)
        assert result["type"] == "audiometry_report"

    def test_generic_report(self):
        text = "Muayene raporu - bulgular ve tedavi"
        result = classify_document(text)
        assert result["type"] == "medical_report"

    def test_unknown_text(self):
        text = "random unrelated content about weather"
        result = classify_document(text)
        assert result["type"] == "other"


class TestMedicalTermExtraction:
    def test_finds_hearing_condition(self):
        terms = load_medical_terms()
        text = "Hasta isitme kaybi ve tinnitus teshisi almistir"
        found = extract_medical_terms(terms, text)
        categories = [t["category"] for t in found]
        assert "hearing_conditions" in categories

    def test_finds_device(self):
        terms = load_medical_terms()
        text = "BTE tipi isitme cihazi uygulanmistir"
        found = extract_medical_terms(terms, text)
        categories = [t["category"] for t in found]
        assert "devices" in categories

    def test_empty_text(self):
        terms = load_medical_terms()
        assert extract_medical_terms(terms, "") == []


class TestSimilarityService:
    def test_identical_texts_high_similarity(self):
        result = calculate_similarity(
            nlp=None, ocr_caller=None,
            text1="isitme cihazi raporu", text2="isitme cihazi raporu",
        )
        assert result["similarity"] >= 0.99

    def test_different_texts_low_similarity(self):
        result = calculate_similarity(
            nlp=None, ocr_caller=None,
            text1="isitme cihazi raporu", text2="futbol maci sonuclari",
        )
        assert result["similarity"] < 0.5

    def test_partially_similar_texts(self):
        result = calculate_similarity(
            nlp=None, ocr_caller=None,
            text1="isitme cihazi sol kulak",
            text2="isitme cihazi sag kulak",
        )
        assert 0.3 < result["similarity"] < 0.95

    def test_both_empty_returns_zero(self):
        result = calculate_similarity(nlp=None, ocr_caller=None, text1="", text2="")
        assert result["similarity"] == 0.0

    def test_one_empty_returns_low(self):
        result = calculate_similarity(nlp=None, ocr_caller=None, text1="hello", text2="")
        assert result["similarity"] < 0.3


class TestTokenizer:
    def test_basic_tokenize(self):
        tokens = simple_tokenize("Merhaba Dunya 123")
        assert "merhaba" in tokens
        assert "dunya" in tokens

    def test_turkish_chars(self):
        tokens = simple_tokenize("isitme kaybi tedavisi")
        assert len(tokens) >= 2

    def test_empty_returns_empty(self):
        assert simple_tokenize("") == []
        assert simple_tokenize(None) == []


class TestLevenshtein:
    def test_identical_strings(self):
        assert normalized_levenshtein("hello", "hello") == 1.0

    def test_completely_different(self):
        result = normalized_levenshtein("abc", "xyz")
        assert result < 0.5

    def test_empty_strings(self):
        assert normalized_levenshtein("", "") == 1.0

    def test_one_empty(self):
        assert normalized_levenshtein("hello", "") == 0.0
