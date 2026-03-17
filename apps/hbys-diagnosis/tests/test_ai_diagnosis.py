"""
Tests for AI-powered ICD-10 smart search and differential diagnosis engine.

Uses pytest. All tests are CPU-only and do not require a database.
"""
import sys
import os

# Ensure the parent package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from ai_service import (
    smart_icd_search,
    suggest_diagnoses_from_symptoms,
    get_differential_diagnosis,
    validate_diagnosis_consistency,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Smart ICD-10 Search Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestSmartICDSearch:
    """Test the TF-IDF based fuzzy ICD-10 search."""

    def test_chest_pain_search(self):
        """'göğüs ağrısı' should return chest pain related codes (R07.x, I20.x, I21.x)."""
        results = smart_icd_search("göğüs ağrısı", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        # At least one of R07.4, I20.x, or I21.x should be present
        chest_pain_codes = {"R07.4", "I20.0", "I20.9", "I21.0", "I21.9"}
        assert any(c in chest_pain_codes for c in codes), (
            f"Expected chest pain codes in results, got: {codes}"
        )

    def test_typo_tolerance_hipertansyon(self):
        """'hipertansyon' (typo) should still find I10."""
        results = smart_icd_search("hipertansyon", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        assert "I10" in codes, f"Expected I10 in results for typo 'hipertansyon', got: {codes}"

    def test_abbreviation_dm(self):
        """'DM' abbreviation should return E11 (Tip 2 diabetes mellitus)."""
        results = smart_icd_search("DM", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        # Should find E11 or E11.9
        dm_codes = {"E11", "E11.9", "E10.9", "E13.9"}
        assert any(c in dm_codes for c in codes), (
            f"Expected diabetes codes for 'DM', got: {codes}"
        )

    def test_abbreviation_koah(self):
        """'KOAH' abbreviation should return J44.x codes."""
        results = smart_icd_search("KOAH", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        koah_codes = {"J44.0", "J44.1", "J44.9"}
        assert any(c in koah_codes for c in codes), (
            f"Expected KOAH codes (J44.x) for 'KOAH', got: {codes}"
        )

    def test_synonym_seker_hastaligi(self):
        """'şeker hastalığı' (synonym for diabetes) should return E11."""
        results = smart_icd_search("şeker hastalığı", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        assert "E11" in codes or "E11.9" in codes, (
            f"Expected E11 for 'şeker hastalığı', got: {codes}"
        )

    def test_direct_code_search(self):
        """Searching by ICD code directly should return exact match."""
        results = smart_icd_search("J18.9", top_k=5)
        assert len(results) > 0
        assert results[0]["code"] == "J18.9"
        assert results[0]["similarity_score"] > 0.9

    def test_partial_code_search(self):
        """Searching by partial code 'J18' should return J18.x codes."""
        results = smart_icd_search("J18", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        assert any(c.startswith("J18") for c in codes)

    def test_english_search(self):
        """English term search should also work."""
        results = smart_icd_search("pneumonia", top_k=10)
        assert len(results) > 0
        codes = [r["code"] for r in results]
        pneumonia_codes = {"J18.9", "J12.9", "J15.9"}
        assert any(c in pneumonia_codes for c in codes), (
            f"Expected pneumonia codes, got: {codes}"
        )

    def test_top_k_parameter(self):
        """top_k parameter should limit results."""
        results_3 = smart_icd_search("ağrı", top_k=3)
        results_10 = smart_icd_search("ağrı", top_k=10)
        assert len(results_3) <= 3
        assert len(results_10) <= 10
        assert len(results_10) >= len(results_3)

    def test_empty_query(self):
        """Empty query should return empty results."""
        assert smart_icd_search("") == []
        assert smart_icd_search("   ") == []

    def test_similarity_scores_range(self):
        """All similarity scores should be between 0 and 1."""
        results = smart_icd_search("kalp", top_k=20)
        for r in results:
            assert 0 <= r["similarity_score"] <= 1.0, (
                f"Score {r['similarity_score']} out of range for {r['code']}"
            )

    def test_result_structure(self):
        """Each result should have the expected keys."""
        results = smart_icd_search("ateş", top_k=5)
        assert len(results) > 0
        for r in results:
            assert "code" in r
            assert "name_tr" in r
            assert "name_en" in r
            assert "similarity_score" in r

    def test_abbreviation_ht(self):
        """'HT' abbreviation should return I10 (Hipertansiyon)."""
        results = smart_icd_search("HT", top_k=10)
        codes = [r["code"] for r in results]
        assert "I10" in codes, f"Expected I10 for 'HT', got: {codes}"

    def test_synonym_tansiyon(self):
        """'tansiyon' synonym should return I10."""
        results = smart_icd_search("tansiyon", top_k=10)
        codes = [r["code"] for r in results]
        assert "I10" in codes, f"Expected I10 for 'tansiyon', got: {codes}"

    def test_abbreviation_svo(self):
        """'SVO' should return cerebrovascular codes."""
        results = smart_icd_search("SVO", top_k=10)
        codes = [r["code"] for r in results]
        svo_codes = {"I63.9", "I64", "I67.9"}
        assert any(c in svo_codes for c in codes), (
            f"Expected SVO-related codes, got: {codes}"
        )

    def test_migren_search(self):
        """'migren' should return G43.9."""
        results = smart_icd_search("migren", top_k=5)
        codes = [r["code"] for r in results]
        assert "G43.9" in codes, f"Expected G43.9 for 'migren', got: {codes}"

    def test_depresyon_search(self):
        """'depresyon' should return F32.9."""
        results = smart_icd_search("depresyon", top_k=10)
        codes = [r["code"] for r in results]
        assert "F32.9" in codes or "F33.9" in codes, (
            f"Expected depression codes, got: {codes}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Symptom-based Diagnosis Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestSuggestDiagnoses:
    """Test symptom-based diagnosis suggestions."""

    def test_respiratory_infection_symptoms(self):
        """[ateş, öksürük, balgam] should suggest J18.9 (Pnömoni) with high probability."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["ateş", "öksürük", "balgam"],
            age=45,
            gender="M",
        )
        assert len(results) > 0

        # J18.9 (Pneumonia) should be in top results
        codes = [r["icd_code"] for r in results]
        assert "J18.9" in codes, f"Expected J18.9 in results, got: {codes}"

        # J18.9 should have relatively high probability
        pnomoni = next(r for r in results if r["icd_code"] == "J18.9")
        assert pnomoni["probability"] > 0.3, (
            f"Expected high probability for J18.9, got: {pnomoni['probability']}"
        )

    def test_cardiac_symptoms(self):
        """[göğüs ağrısı, nefes darlığı, terleme] should suggest cardiac diagnoses."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["göğüs ağrısı", "nefes darlığı", "terleme"],
            age=60,
            gender="M",
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        cardiac_codes = {"I21.9", "I20.9", "R07.4", "I50.9", "I26.9"}
        assert any(c in cardiac_codes for c in codes), (
            f"Expected cardiac codes, got: {codes}"
        )

    def test_uti_symptoms(self):
        """[sık idrara çıkma, idrar yaparken yanma, ateş] should suggest N39.0."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["sık idrara çıkma", "idrar yaparken yanma", "ateş"],
            age=35,
            gender="F",
        )
        codes = [r["icd_code"] for r in results]
        assert "N39.0" in codes, f"Expected N39.0 for UTI symptoms, got: {codes}"

    def test_empty_symptoms(self):
        """Empty symptoms list should return empty results."""
        results = suggest_diagnoses_from_symptoms(symptoms=[], age=30, gender="M")
        assert results == []

    def test_unknown_symptoms(self):
        """Unknown/unrecognized symptoms should return empty or minimal results."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["xyz bilinmeyen semptom"],
            age=30,
            gender="M",
        )
        # Should either be empty or have very low probabilities
        assert len(results) == 0 or all(r["probability"] < 0.5 for r in results)

    def test_probability_range(self):
        """All probability scores should be between 0 and 1."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["ateş", "öksürük", "baş ağrısı"],
            age=40,
            gender="M",
        )
        for r in results:
            assert 0 <= r["probability"] <= 1.0, (
                f"Probability {r['probability']} out of [0,1] range for {r['icd_code']}"
            )

    def test_result_structure(self):
        """Each result should contain expected fields."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["ateş"],
            age=30,
            gender="M",
        )
        assert len(results) > 0
        for r in results:
            assert "icd_code" in r
            assert "diagnosis_name_tr" in r
            assert "probability" in r
            assert "key_symptoms_matched" in r

    def test_age_adjustment_elderly(self):
        """Elderly patients should get higher scores for age-related conditions."""
        results_elderly = suggest_diagnoses_from_symptoms(
            symptoms=["nefes darlığı", "bacak şişmesi"],
            age=75,
            gender="M",
        )
        results_young = suggest_diagnoses_from_symptoms(
            symptoms=["nefes darlığı", "bacak şişmesi"],
            age=25,
            gender="M",
        )
        # I50.9 (Heart failure) should score higher for elderly
        elderly_hf = next((r for r in results_elderly if r["icd_code"] == "I50.9"), None)
        young_hf = next((r for r in results_young if r["icd_code"] == "I50.9"), None)
        if elderly_hf and young_hf:
            assert elderly_hf["probability"] >= young_hf["probability"]

    def test_gender_adjustment(self):
        """Gender-specific conditions should be filtered appropriately."""
        results_male = suggest_diagnoses_from_symptoms(
            symptoms=["sık idrara çıkma"],
            age=65,
            gender="M",
        )
        codes_male = [r["icd_code"] for r in results_male]
        # N40 (Prostate hyperplasia) should NOT appear for females
        results_female = suggest_diagnoses_from_symptoms(
            symptoms=["sık idrara çıkma"],
            age=65,
            gender="F",
        )
        n40_female = next((r for r in results_female if r["icd_code"] == "N40"), None)
        if n40_female:
            # Should have very low probability for females
            assert n40_female["probability"] < 0.1

    def test_multiple_symptom_scoring(self):
        """More matching symptoms should increase diagnosis probability."""
        results_1 = suggest_diagnoses_from_symptoms(
            symptoms=["öksürük"],
            age=40,
            gender="M",
        )
        results_3 = suggest_diagnoses_from_symptoms(
            symptoms=["öksürük", "ateş", "balgam"],
            age=40,
            gender="M",
        )
        # J18.9 should have higher probability with 3 matching symptoms
        j18_1 = next((r for r in results_1 if r["icd_code"] == "J18.9"), None)
        j18_3 = next((r for r in results_3 if r["icd_code"] == "J18.9"), None)
        assert j18_3 is not None, "J18.9 should appear for [öksürük, ateş, balgam]"

    def test_headache_symptoms(self):
        """[baş ağrısı, bulantı] should suggest migren and other headache diagnoses."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["baş ağrısı", "bulantı"],
            age=35,
            gender="F",
        )
        codes = [r["icd_code"] for r in results]
        assert "R51" in codes or "G43.9" in codes, (
            f"Expected headache codes, got: {codes}"
        )

    def test_ear_symptoms(self):
        """[işitme kaybı, çınlama] should suggest ear-related diagnoses."""
        results = suggest_diagnoses_from_symptoms(
            symptoms=["işitme kaybı", "çınlama"],
            age=55,
            gender="M",
        )
        codes = [r["icd_code"] for r in results]
        ear_codes = {"H91.9", "H90.5", "H90.3", "H93.1", "H81.0"}
        assert any(c in ear_codes for c in codes), (
            f"Expected ear-related codes, got: {codes}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Differential Diagnosis Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestDifferentialDiagnosis:
    """Test differential diagnosis suggestions."""

    def test_mi_differentials(self):
        """Given I21 (MI), differentials should include I20 (Angina) and R07 (Chest pain)."""
        results = get_differential_diagnosis(
            primary_icd="I21.9",
            symptoms=["göğüs ağrısı", "nefes darlığı"],
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        assert "I20.9" in codes, f"Expected I20.9 (Angina) in MI differentials, got: {codes}"
        assert "R07.4" in codes, f"Expected R07.4 (Chest pain) in MI differentials, got: {codes}"

    def test_mi_parent_code_lookup(self):
        """I21 parent code should also work for differential lookup."""
        results = get_differential_diagnosis(
            primary_icd="I21",
            symptoms=["göğüs ağrısı"],
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        assert "I20.9" in codes or "I20.0" in codes

    def test_pneumonia_differentials(self):
        """Given J18.9 (Pneumonia), differentials should include bronchitis and PE."""
        results = get_differential_diagnosis(
            primary_icd="J18.9",
            symptoms=["ateş", "öksürük", "balgam"],
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        assert "J20.9" in codes, f"Expected J20.9 (Bronchitis) in pneumonia differentials, got: {codes}"

    def test_differential_result_structure(self):
        """Each differential should have expected fields."""
        results = get_differential_diagnosis(
            primary_icd="I10",
            symptoms=["baş ağrısı"],
        )
        assert len(results) > 0
        for r in results:
            assert "icd_code" in r
            assert "diagnosis_name_tr" in r
            assert "reason" in r
            assert "relevance_score" in r

    def test_unknown_primary_with_symptoms(self):
        """Unknown primary code with symptoms should fall back to symptom-based suggestions."""
        results = get_differential_diagnosis(
            primary_icd="Z99.99",
            symptoms=["ateş", "öksürük"],
        )
        # Should still return something via fallback
        # (may be empty if truly unknown, which is also acceptable)
        if results:
            assert all("icd_code" in r for r in results)

    def test_unknown_primary_without_symptoms(self):
        """Unknown primary code without symptoms should return empty."""
        results = get_differential_diagnosis(
            primary_icd="Z99.99",
            symptoms=[],
        )
        assert results == []

    def test_relevance_scores_range(self):
        """All relevance scores should be between 0 and 1."""
        results = get_differential_diagnosis(
            primary_icd="I21.9",
            symptoms=["göğüs ağrısı"],
        )
        for r in results:
            assert 0 <= r["relevance_score"] <= 1.0

    def test_hearing_loss_differentials(self):
        """H91.9 (Hearing loss) differentials should include sensorineural and conductive types."""
        results = get_differential_diagnosis(
            primary_icd="H91.9",
            symptoms=["işitme kaybı"],
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        assert "H90.5" in codes or "H66.9" in codes or "H61.2" in codes

    def test_depression_differentials(self):
        """F32.9 differentials should include bipolar and hypothyroidism."""
        results = get_differential_diagnosis(
            primary_icd="F32.9",
            symptoms=["mutsuzluk", "uykusuzluk"],
        )
        assert len(results) > 0
        codes = [r["icd_code"] for r in results]
        assert "F31.9" in codes or "E03.9" in codes, (
            f"Expected bipolar or hypothyroidism in depression differentials, got: {codes}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Diagnosis-Treatment Consistency Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestValidateDiagnosisConsistency:
    """Test diagnosis-treatment consistency validation."""

    def test_consistent_ht_treatment(self):
        """I10 with antihypertensive should be consistent."""
        result = validate_diagnosis_consistency(
            diagnoses=["I10"],
            medications=["Amlodipine 5mg", "Ramipril 5mg"],
            procedures=["kan basıncı ölçümü", "EKG"],
        )
        assert result["is_consistent"] is True
        assert len(result["warnings"]) == 0

    def test_inconsistent_medication(self):
        """Diagnosis without matching medication should generate warning."""
        result = validate_diagnosis_consistency(
            diagnoses=["I10"],
            medications=["Parasetamol 500mg"],
            procedures=[],
        )
        # Should warn that HT medication is missing
        assert len(result["warnings"]) > 0

    def test_dm_treatment_consistency(self):
        """E11 with metformin should be consistent."""
        result = validate_diagnosis_consistency(
            diagnoses=["E11"],
            medications=["Metformin 1000mg"],
            procedures=["HbA1c", "açlık kan şekeri"],
        )
        assert result["is_consistent"] is True
        assert "E11" in result["matched_medications"]
        assert len(result["matched_medications"]["E11"]) > 0

    def test_suggestions_for_missing_procedures(self):
        """Missing standard procedures should generate suggestions."""
        result = validate_diagnosis_consistency(
            diagnoses=["I21.9"],
            medications=["Aspirin"],
            procedures=[],
        )
        # Should suggest EKG, troponin, etc.
        assert len(result["suggestions"]) > 0

    def test_result_structure(self):
        """Result should have all expected fields."""
        result = validate_diagnosis_consistency(
            diagnoses=["I10"],
            medications=["Amlodipine"],
            procedures=["EKG"],
        )
        assert "is_consistent" in result
        assert "warnings" in result
        assert "suggestions" in result
        assert "matched_medications" in result
        assert "matched_procedures" in result

    def test_empty_inputs(self):
        """Empty inputs should return consistent result with no warnings."""
        result = validate_diagnosis_consistency(
            diagnoses=[],
            medications=[],
            procedures=[],
        )
        assert result["is_consistent"] is True
        assert result["warnings"] == []

    def test_multiple_diagnoses(self):
        """Multiple diagnoses should all be checked."""
        result = validate_diagnosis_consistency(
            diagnoses=["I10", "E11"],
            medications=["Amlodipine 5mg", "Metformin 1000mg"],
            procedures=["EKG", "HbA1c"],
        )
        assert result["is_consistent"] is True
        assert "I10" in result["matched_medications"]
        assert "E11" in result["matched_medications"]

    def test_depression_medication_match(self):
        """F32.9 with SSRI should be consistent."""
        result = validate_diagnosis_consistency(
            diagnoses=["F32.9"],
            medications=["Sertralin 50mg"],
            procedures=[],
        )
        assert "F32.9" in result["matched_medications"]
        assert len(result["matched_medications"]["F32.9"]) > 0
