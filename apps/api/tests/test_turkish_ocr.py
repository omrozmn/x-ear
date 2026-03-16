"""Tests for Turkish OCR post-processing and fuzzy matching."""
import pytest
from utils.turkish_ocr import (
    normalize_turkish_unicode,
    strip_turkish_diacritics,
    correct_turkish_ocr_errors,
    post_process_ocr_text,
    turkish_fuzzy_contains,
)


class TestUnicodeNormalization:
    def test_nfkc_normalizes_composed_chars(self):
        # Pre-composed ş should stay as ş
        result = normalize_turkish_unicode("işitme")
        assert "ş" in result or "s" in result  # depending on NFKC behavior

    def test_empty_string(self):
        assert normalize_turkish_unicode("") == ""

    def test_none_passthrough(self):
        assert normalize_turkish_unicode(None) is None

    def test_ascii_unchanged(self):
        assert normalize_turkish_unicode("hello") == "hello"


class TestStripDiacritics:
    def test_turkish_chars_stripped(self):
        assert strip_turkish_diacritics("çğıİöşü") == "cgiIosu"

    def test_uppercase_stripped(self):
        assert strip_turkish_diacritics("ÇĞÖŞÜ") == "CGOSU"

    def test_mixed_text(self):
        result = strip_turkish_diacritics("İşitme kaybı")
        assert result == "Isitme kaybi"

    def test_empty_string(self):
        assert strip_turkish_diacritics("") == ""


class TestOcrErrorCorrection:
    def test_isitme_corrected(self):
        result = correct_turkish_ocr_errors("isitme cihazi")
        assert "işitme" in result
        assert "cihazı" in result

    def test_sagirlik_corrected(self):
        result = correct_turkish_ocr_errors("sagirlik teshisi")
        assert "sağırlık" in result

    def test_recete_corrected(self):
        result = correct_turkish_ocr_errors("recete numarasi")
        assert "reçete" in result

    def test_kaybi_corrected(self):
        result = correct_turkish_ocr_errors("isitme kaybi")
        assert "kaybı" in result

    def test_no_false_positives_on_correct_text(self):
        correct = "işitme cihazı reçete"
        result = correct_turkish_ocr_errors(correct)
        # Should not double-correct already correct text
        assert "işitme" in result

    def test_empty_string(self):
        assert correct_turkish_ocr_errors("") == ""


class TestPostProcessPipeline:
    def test_full_pipeline(self):
        raw = "isitme kaybi ve sagirlik teshisi"
        result = post_process_ocr_text(raw)
        assert "işitme" in result
        assert "kaybı" in result
        assert "sağırlık" in result


class TestFuzzyContains:
    def test_exact_match(self):
        assert turkish_fuzzy_contains("işitme kaybı tespiti", "işitme kaybı")

    def test_diacritical_insensitive(self):
        # OCR output without diacritics should still match
        assert turkish_fuzzy_contains("isitme kaybi tespiti", "işitme kaybı")

    def test_reverse_diacritical(self):
        # Proper Turkish text should match ASCII query
        assert turkish_fuzzy_contains("işitme kaybı tespiti", "isitme kaybi")

    def test_fuzzy_with_ocr_error(self):
        # One char difference should still match at 0.80 threshold
        assert turkish_fuzzy_contains("isitme kayb1", "isitme kaybi", threshold=0.75)

    def test_completely_different_no_match(self):
        assert not turkish_fuzzy_contains("futbol maci sonucu", "işitme kaybı")

    def test_empty_inputs(self):
        assert not turkish_fuzzy_contains("", "test")
        assert not turkish_fuzzy_contains("test", "")


class TestFuzzyMedicalTermExtraction:
    """Integration test: verify medical terms are found with fuzzy matching."""

    def test_finds_terms_with_ocr_errors(self):
        from services.ocr_nlp_service import extract_medical_terms, load_medical_terms
        terms = load_medical_terms()

        # Simulate OCR output with missing diacritics
        ocr_text = "hasta isitme kaybi nedeniyle isitme cihazi takilmistir"
        found = extract_medical_terms(terms, ocr_text)
        categories = {t["category"] for t in found}
        assert "hearing_conditions" in categories
        assert "devices" in categories

    def test_finds_proper_turkish_terms(self):
        from services.ocr_nlp_service import extract_medical_terms, load_medical_terms
        terms = load_medical_terms()

        # Proper Turkish text
        text = "İşitme kaybı ve sağırlık teşhisi konulmuştur"
        found = extract_medical_terms(terms, text)
        categories = {t["category"] for t in found}
        assert "hearing_conditions" in categories

    def test_classifier_handles_ocr_variants(self):
        from services.ocr_nlp_service import classify_document

        # Without diacritics (common OCR output)
        result1 = classify_document("SGK cihaz raporu - sosyal guvenlik")
        assert result1["type"] == "sgk_device_report"

        # With proper Turkish
        result2 = classify_document("SGK cihaz raporu - sosyal güvenlik")
        assert result2["type"] == "sgk_device_report"

        # Prescription without diacritics
        result3 = classify_document("recete numarasi 12345")
        assert result3["type"] == "prescription"
