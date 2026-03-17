"""
Tests for AI Drug Interaction Prediction Service
=================================================
Covers known interactions, safe combinations, multi-drug checks,
confidence scores, Turkish explanations, and edge cases.
"""
import sys
import os

# Ensure the parent package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from ai_service import (
    predict_interaction,
    check_prescription_interactions,
    get_interaction_explanation,
    INTERACTION_TYPES,
    SEVERITY_LEVELS,
)


# =========================================================================
# Known dangerous interactions
# =========================================================================

class TestKnownDangerousInteractions:
    """Test that well-known dangerous drug pairs are detected correctly."""

    def test_warfarin_aspirin_bleeding_risk(self):
        result = predict_interaction("warfarin", "aspirin")
        assert result["interaction_type"] == "bleeding_risk"
        assert result["severity"] == "major"
        assert result["is_known"] is True

    def test_warfarin_aspirin_reverse_order(self):
        """Order should not matter."""
        result = predict_interaction("aspirin", "warfarin")
        assert result["interaction_type"] == "bleeding_risk"
        assert result["severity"] == "major"

    def test_ssri_maoi_serotonin_syndrome(self):
        result = predict_interaction("fluoxetine", "phenelzine")
        assert result["interaction_type"] == "serotonin_syndrome"
        assert result["severity"] == "contraindicated"

    def test_sertraline_maoi(self):
        result = predict_interaction("sertraline", "phenelzine")
        assert result["interaction_type"] == "serotonin_syndrome"
        assert result["severity"] == "contraindicated"

    def test_metformin_contrast_nephrotoxicity(self):
        result = predict_interaction("metformin", "contrast_media")
        assert result["interaction_type"] == "nephrotoxicity"
        assert result["severity"] == "major"

    def test_sildenafil_nitroglycerin_contraindicated(self):
        result = predict_interaction("sildenafil", "nitroglycerin")
        assert result["interaction_type"] == "hypotension"
        assert result["severity"] == "contraindicated"

    def test_benzodiazepine_opioid_cns_depression(self):
        result = predict_interaction("diazepam", "fentanyl")
        assert result["interaction_type"] == "cns_depression"
        assert result["severity"] == "contraindicated"

    def test_ace_inhibitor_arb_contraindicated(self):
        result = predict_interaction("enalapril", "losartan")
        assert result["interaction_type"] == "hyperkalemia"
        assert result["severity"] == "contraindicated"

    def test_dual_nsaid_contraindicated(self):
        result = predict_interaction("ibuprofen", "diclofenac")
        assert result["interaction_type"] == "bleeding_risk"
        assert result["severity"] == "contraindicated"

    def test_simvastatin_clarithromycin(self):
        result = predict_interaction("simvastatin", "clarithromycin")
        assert result["interaction_type"] == "toxicity_increase"
        assert result["severity"] == "contraindicated"

    def test_warfarin_heparin_contraindicated(self):
        result = predict_interaction("warfarin", "heparin")
        assert result["interaction_type"] == "bleeding_risk"
        assert result["severity"] == "contraindicated"

    def test_ace_spironolactone_hyperkalemia(self):
        result = predict_interaction("enalapril", "spironolactone")
        assert result["interaction_type"] == "hyperkalemia"
        assert result["severity"] == "major"

    def test_beta_blocker_verapamil_hypotension(self):
        result = predict_interaction("metoprolol", "verapamil")
        assert result["interaction_type"] == "hypotension"
        assert result["severity"] == "major"

    def test_lithium_nsaid_toxicity(self):
        result = predict_interaction("ibuprofen", "lithium")
        assert result["interaction_type"] == "toxicity_increase"
        assert result["severity"] == "major"

    def test_omeprazole_clopidogrel_reduced_efficacy(self):
        result = predict_interaction("omeprazole", "clopidogrel")
        assert result["interaction_type"] == "reduced_efficacy"
        assert result["severity"] == "major"

    def test_ciprofloxacin_theophylline(self):
        result = predict_interaction("ciprofloxacin", "theophylline")
        assert result["interaction_type"] == "toxicity_increase"
        assert result["severity"] == "major"


# =========================================================================
# Safe combinations
# =========================================================================

class TestSafeCombinations:
    """Test that unrelated drugs are not flagged from the known database."""

    def test_amlodipine_metformin_not_known(self):
        """Common combo in diabetic patients - not in known interaction DB."""
        result = predict_interaction("amlodipine", "metformin")
        assert result["is_known"] is False
        assert result["severity"] != "contraindicated"

    def test_omeprazole_amoxicillin_not_known(self):
        """Common PPI + antibiotic combo (H. pylori treatment) - not in known DB."""
        result = predict_interaction("omeprazole", "amoxicillin")
        assert result["is_known"] is False
        assert result["severity"] != "contraindicated"

    def test_atorvastatin_amlodipine_not_known(self):
        """Commonly prescribed together - not in known interaction DB."""
        result = predict_interaction("atorvastatin", "amlodipine")
        assert result["is_known"] is False
        assert result["severity"] != "contraindicated"

    def test_levetiracetam_vitamin_d(self):
        """Truly unrelated drugs from different systems."""
        result = predict_interaction("levetiracetam", "vitamin_d")
        assert result["is_known"] is False


# =========================================================================
# Multi-drug prescription checking
# =========================================================================

class TestPrescriptionCheck:
    """Test the check_prescription_interactions function."""

    def test_dangerous_prescription(self):
        """A prescription with multiple interacting drugs."""
        meds = [
            {"name": "warfarin"},
            {"name": "aspirin"},
            {"name": "ibuprofen"},
        ]
        results = check_prescription_interactions(meds)
        assert len(results) > 0
        # All results should be non-none interactions
        for r in results:
            assert r["interaction_type"] != "none"

    def test_prescription_sorted_by_severity(self):
        """Results should be sorted most severe first."""
        meds = [
            {"name": "warfarin"},
            {"name": "aspirin"},
            {"name": "ibuprofen"},
        ]
        results = check_prescription_interactions(meds)
        severity_order = {s: i for i, s in enumerate(SEVERITY_LEVELS)}
        for i in range(len(results) - 1):
            sev_a = severity_order.get(results[i]["severity"], 0)
            sev_b = severity_order.get(results[i + 1]["severity"], 0)
            assert sev_a >= sev_b

    def test_safe_prescription(self):
        """A prescription with supplements - no known interactions."""
        meds = [
            {"name": "vitamin_d"},
            {"name": "calcium"},
            {"name": "magnesium"},
        ]
        results = check_prescription_interactions(meds)
        # None of these should be from the known database
        for r in results:
            assert r["is_known"] is False
            assert r["severity"] != "contraindicated"

    def test_single_medication(self):
        """A single drug should return no interactions."""
        meds = [{"name": "warfarin"}]
        results = check_prescription_interactions(meds)
        assert results == []

    def test_empty_medication_list(self):
        """Empty list should return no interactions."""
        results = check_prescription_interactions([])
        assert results == []

    def test_multi_drug_finds_all_pairs(self):
        """Four interacting drugs should find multiple pairs."""
        meds = [
            {"name": "warfarin"},
            {"name": "aspirin"},
            {"name": "fluoxetine"},
            {"name": "phenelzine"},
        ]
        results = check_prescription_interactions(meds)
        # Should find at least: warfarin+aspirin, fluoxetine+phenelzine, fluoxetine+warfarin, etc.
        assert len(results) >= 3


# =========================================================================
# Confidence scores
# =========================================================================

class TestConfidenceScores:
    """Verify confidence scores are valid."""

    def test_confidence_between_0_and_1_known(self):
        result = predict_interaction("warfarin", "aspirin")
        assert 0.0 <= result["confidence"] <= 1.0

    def test_confidence_between_0_and_1_unknown(self):
        result = predict_interaction("some_novel_drug_xyz", "another_new_drug_abc")
        assert 0.0 <= result["confidence"] <= 1.0

    def test_known_interactions_high_confidence(self):
        """Known interactions should have high confidence."""
        result = predict_interaction("warfarin", "aspirin")
        assert result["confidence"] >= 0.9

    def test_same_drug_full_confidence(self):
        result = predict_interaction("warfarin", "warfarin")
        assert result["confidence"] == 1.0

    def test_confidence_across_multiple_predictions(self):
        """Run multiple predictions and verify all confidences are valid."""
        pairs = [
            ("warfarin", "aspirin"),
            ("fluoxetine", "phenelzine"),
            ("metformin", "contrast_media"),
            ("atorvastatin", "amlodipine"),
            ("unknown_drug1", "unknown_drug2"),
        ]
        for a, b in pairs:
            result = predict_interaction(a, b)
            assert 0.0 <= result["confidence"] <= 1.0, f"Invalid confidence for {a}+{b}: {result['confidence']}"


# =========================================================================
# Turkish explanation generation
# =========================================================================

class TestTurkishExplanations:
    """Test Turkish language explanation generation."""

    def test_explanation_not_empty(self):
        explanation = get_interaction_explanation("warfarin", "aspirin")
        assert len(explanation) > 0

    def test_explanation_contains_drug_names(self):
        explanation = get_interaction_explanation("warfarin", "aspirin")
        assert "Warfarin" in explanation or "warfarin" in explanation.lower()
        assert "Aspirin" in explanation or "aspirin" in explanation.lower()

    def test_explanation_contains_turkish_text(self):
        """Check for Turkish-specific words."""
        explanation = get_interaction_explanation("warfarin", "aspirin")
        turkish_keywords = ["kanama", "riski", "izlenmeli", "kullanildiginda"]
        assert any(kw in explanation.lower() for kw in turkish_keywords)

    def test_explanation_severity_text(self):
        """Major severity should include severity description."""
        explanation = get_interaction_explanation("warfarin", "aspirin")
        assert "iddet" in explanation or "derecesi" in explanation

    def test_explanation_contraindicated(self):
        explanation = get_interaction_explanation("fluoxetine", "phenelzine")
        assert "kontrendike" in explanation.lower() or "serotonin" in explanation.lower()

    def test_explanation_no_interaction(self):
        explanation = get_interaction_explanation("vitamin_d", "calcium")
        # Should still return a non-empty string
        assert len(explanation) > 0

    def test_explanation_same_drug(self):
        explanation = get_interaction_explanation("warfarin", "warfarin")
        assert "etkilesim" in explanation.lower() or "bulunmamaktadir" in explanation.lower()


# =========================================================================
# Edge cases
# =========================================================================

class TestEdgeCases:
    """Test edge cases and robustness."""

    def test_unknown_drugs(self):
        """Unknown drugs should not crash, should return a valid result."""
        result = predict_interaction("bilinmeyen_ilac_x", "bilinmeyen_ilac_y")
        assert result["interaction_type"] in INTERACTION_TYPES
        assert result["severity"] in SEVERITY_LEVELS
        assert 0.0 <= result["confidence"] <= 1.0

    def test_same_drug_twice(self):
        """Same drug should report no interaction."""
        result = predict_interaction("warfarin", "warfarin")
        assert result["interaction_type"] == "none"
        assert result["severity"] == "none"
        assert result["source"] == "same_drug"

    def test_case_insensitive(self):
        """Drug names should be case-insensitive."""
        r1 = predict_interaction("Warfarin", "Aspirin")
        r2 = predict_interaction("warfarin", "aspirin")
        r3 = predict_interaction("WARFARIN", "ASPIRIN")
        assert r1["interaction_type"] == r2["interaction_type"] == r3["interaction_type"]
        assert r1["severity"] == r2["severity"] == r3["severity"]

    def test_whitespace_handling(self):
        """Whitespace in names should be handled."""
        result = predict_interaction("  warfarin  ", "  aspirin  ")
        assert result["interaction_type"] == "bleeding_risk"

    def test_empty_name_in_prescription(self):
        """Empty names should be filtered out."""
        meds = [
            {"name": "warfarin"},
            {"name": ""},
            {"name": "aspirin"},
        ]
        results = check_prescription_interactions(meds)
        assert len(results) > 0

    def test_missing_name_key(self):
        """Dicts without 'name' key should be handled gracefully."""
        meds = [
            {"name": "warfarin"},
            {"dosage": "500mg"},
            {"name": "aspirin"},
        ]
        results = check_prescription_interactions(meds)
        assert len(results) > 0

    def test_result_structure(self):
        """Verify the result dict has all expected keys."""
        result = predict_interaction("warfarin", "aspirin")
        expected_keys = {"drug_a", "drug_b", "interaction_type", "severity", "confidence", "is_known", "source"}
        assert set(result.keys()) == expected_keys

    def test_interaction_type_valid(self):
        """All predictions should return valid interaction types."""
        result = predict_interaction("metoprolol", "diltiazem")
        assert result["interaction_type"] in INTERACTION_TYPES

    def test_severity_valid(self):
        """All predictions should return valid severity levels."""
        result = predict_interaction("metoprolol", "diltiazem")
        assert result["severity"] in SEVERITY_LEVELS

    def test_symmetry(self):
        """predict_interaction(A,B) should equal predict_interaction(B,A) in type and severity."""
        r1 = predict_interaction("digoxin", "amiodarone")
        r2 = predict_interaction("amiodarone", "digoxin")
        assert r1["interaction_type"] == r2["interaction_type"]
        assert r1["severity"] == r2["severity"]
