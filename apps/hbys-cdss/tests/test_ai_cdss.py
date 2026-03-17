"""
Tests for AI-Powered Clinical Decision Support Engine.
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from ai_service import (
    calculate_safe_dose,
    check_allergy_cross_reactivity,
    score_prescription_safety,
    suggest_alternatives,
    get_dosing_guidelines,
)


# ============================================================================
# FIXTURES - Common patient profiles
# ============================================================================


@pytest.fixture
def normal_adult():
    return {
        "age": 35,
        "weight_kg": 70,
        "height_cm": 175,
        "gender": "male",
        "creatinine": 1.0,
        "gfr": 90,
        "liver_function": "normal",
    }


@pytest.fixture
def elderly_patient():
    return {
        "age": 78,
        "weight_kg": 60,
        "height_cm": 165,
        "gender": "female",
        "creatinine": 1.3,
        "gfr": 55,
        "liver_function": "normal",
    }


@pytest.fixture
def child_patient():
    return {
        "age": 6,
        "weight_kg": 20,
        "height_cm": 115,
        "gender": "male",
        "creatinine": 0.4,
        "gfr": 120,
        "liver_function": "normal",
    }


@pytest.fixture
def renal_impairment_patient():
    return {
        "age": 55,
        "weight_kg": 75,
        "height_cm": 170,
        "gender": "male",
        "creatinine": 4.0,
        "gfr": 25,
        "liver_function": "normal",
    }


@pytest.fixture
def severe_renal_patient():
    return {
        "age": 60,
        "weight_kg": 70,
        "height_cm": 168,
        "gender": "male",
        "creatinine": 6.0,
        "gfr": 12,
        "liver_function": "normal",
    }


@pytest.fixture
def hepatic_impairment_patient():
    return {
        "age": 50,
        "weight_kg": 80,
        "height_cm": 175,
        "gender": "male",
        "creatinine": 1.0,
        "gfr": 85,
        "liver_function": "severe",
    }


@pytest.fixture
def moderate_hepatic_patient():
    return {
        "age": 50,
        "weight_kg": 80,
        "height_cm": 175,
        "gender": "male",
        "creatinine": 1.0,
        "gfr": 85,
        "liver_function": "moderate",
    }


@pytest.fixture
def low_weight_patient():
    return {
        "age": 30,
        "weight_kg": 38,
        "height_cm": 155,
        "gender": "female",
        "creatinine": 0.8,
        "gfr": 90,
        "liver_function": "normal",
    }


@pytest.fixture
def very_elderly_patient():
    return {
        "age": 95,
        "weight_kg": 50,
        "height_cm": 160,
        "gender": "female",
        "creatinine": 1.8,
        "gfr": 30,
        "liver_function": "mild",
    }


# ============================================================================
# DOSE CALCULATION TESTS
# ============================================================================


class TestCalculateSafeDose:
    """Test calculate_safe_dose function."""

    def test_normal_adult_amoxicillin(self, normal_adult):
        """Normal adult should get standard dose."""
        result = calculate_safe_dose("amoxicillin", normal_adult)
        assert result["found"] is True
        assert result["recommended_dose"] == 500
        assert result["max_dose"] == 3000
        assert result["unit"] == "mg"
        assert result["frequency"] is not None

    def test_normal_adult_metformin(self, normal_adult):
        """Normal adult metformin dose."""
        result = calculate_safe_dose("metformin", normal_adult)
        assert result["found"] is True
        assert result["recommended_dose"] == 850
        assert result["max_dose"] == 3000

    def test_elderly_dose_reduction(self, elderly_patient):
        """Elderly patients should get reduced doses for drugs with geriatric factor."""
        result = calculate_safe_dose("metoprolol", elderly_patient)
        assert result["found"] is True
        # Metoprolol has geriatric_factor 0.5
        assert result["recommended_dose"] < 50
        assert any("Yaşlı" in r for r in result["adjustment_reason"])

    def test_child_weight_based_dosing(self, child_patient):
        """Child should get weight-based dose."""
        result = calculate_safe_dose("amoxicillin", child_patient)
        assert result["found"] is True
        # 25 mg/kg * 20 kg = 500
        assert result["recommended_dose"] == 500
        assert any("Pediatrik" in r for r in result["adjustment_reason"])

    def test_child_contraindicated_drug(self, child_patient):
        """Drug contraindicated in children should return 0 dose with warning."""
        result = calculate_safe_dose("ciprofloxacin", child_patient)
        assert result["found"] is True
        assert result["recommended_dose"] == 0
        assert len(result["warnings"]) > 0
        assert any("kontrendike" in w.lower() for w in result["warnings"])

    def test_renal_impairment_dose_adjustment(self, renal_impairment_patient):
        """Renal impairment should reduce dose."""
        result = calculate_safe_dose("amoxicillin", renal_impairment_patient)
        assert result["found"] is True
        # GFR 25, threshold 30 -> factor 0.5
        assert result["recommended_dose"] < 500
        assert any("Renal" in r for r in result["adjustment_reason"])

    def test_metformin_contraindicated_gfr_below_30(self, renal_impairment_patient):
        """Metformin should be contraindicated when GFR < 30."""
        result = calculate_safe_dose("metformin", renal_impairment_patient)
        assert result["found"] is True
        assert result["recommended_dose"] == 0
        assert result["max_dose"] == 0
        assert any("kontrendike" in w.lower() for w in result["warnings"])

    def test_hepatic_dose_adjustment(self, hepatic_impairment_patient):
        """Severe hepatic impairment should cause dose adjustment or contraindication."""
        result = calculate_safe_dose("paracetamol", hepatic_impairment_patient)
        assert result["found"] is True
        # Paracetamol severe hepatic -> contraindicated
        assert result["recommended_dose"] == 0
        assert any("kontrendike" in w.lower() for w in result["warnings"])

    def test_moderate_hepatic_adjustment(self, moderate_hepatic_patient):
        """Moderate hepatic impairment should reduce dose."""
        result = calculate_safe_dose("paracetamol", moderate_hepatic_patient)
        assert result["found"] is True
        assert result["recommended_dose"] < 500  # reduced
        assert any("Hepatik" in r for r in result["adjustment_reason"])

    def test_unknown_drug(self, normal_adult):
        """Unknown drug should return not found."""
        result = calculate_safe_dose("non_existent_drug_xyz", normal_adult)
        assert result["found"] is False
        assert result["recommended_dose"] is None
        assert len(result["warnings"]) > 0

    def test_low_weight_dose_reduction(self, low_weight_patient):
        """Very low weight patient should get reduced dose."""
        result = calculate_safe_dose("metoprolol", low_weight_patient)
        assert result["found"] is True
        # weight 38 kg -> factor = 38/70 ≈ 0.54
        assert result["recommended_dose"] < 50
        assert any("ağırlığı" in r.lower() or "ağırlık" in r.lower() for r in result["adjustment_reason"])

    def test_very_elderly_multiple_adjustments(self, very_elderly_patient):
        """Very elderly with multiple comorbidities should have multiple adjustments."""
        result = calculate_safe_dose("gabapentin", very_elderly_patient)
        assert result["found"] is True
        assert result["recommended_dose"] < 300  # geriatric + renal adjustments
        assert len(result["adjustment_reason"]) >= 1

    def test_turkish_drug_name(self, normal_adult):
        """Should accept Turkish drug names too."""
        result = calculate_safe_dose("Azitromisin", normal_adult)
        assert result["found"] is True
        assert result["recommended_dose"] > 0

    def test_ibuprofen_renal_contraindicated(self, renal_impairment_patient):
        """Ibuprofen should be contraindicated with GFR < 30."""
        result = calculate_safe_dose("ibuprofen", renal_impairment_patient)
        assert result["found"] is True
        assert result["recommended_dose"] == 0
        assert any("kontrendike" in w.lower() for w in result["warnings"])


# ============================================================================
# ALLERGY CROSS-REACTIVITY TESTS
# ============================================================================


class TestAlleryCrossReactivity:
    """Test check_allergy_cross_reactivity function."""

    def test_penicillin_to_cephalosporin_risk(self):
        """Penicillin allergy should show ~10% risk for 1st-gen cephalosporins."""
        result = check_allergy_cross_reactivity(
            known_allergies=["penicillin"],
            new_drug="cephalexin",
        )
        assert result["cross_reactivity_risk"] > 0
        assert result["cross_reactivity_risk"] <= 0.15
        assert len(result["related_allergens"]) > 0

    def test_penicillin_to_3rd_gen_cephalosporin(self):
        """Penicillin allergy should show lower risk for 3rd-gen cephalosporins."""
        result = check_allergy_cross_reactivity(
            known_allergies=["penicillin"],
            new_drug="ceftriaxone",
        )
        assert result["cross_reactivity_risk"] > 0
        assert result["cross_reactivity_risk"] <= 0.05

    def test_nsaid_to_aspirin_cross_reactivity(self):
        """NSAID allergy should show significant aspirin cross-reactivity risk."""
        result = check_allergy_cross_reactivity(
            known_allergies=["ibuprofen"],
            new_drug="aspirin",
        )
        assert result["cross_reactivity_risk"] >= 0.3
        assert len(result["related_allergens"]) > 0

    def test_aspirin_to_nsaid_cross_reactivity(self):
        """Aspirin allergy should show significant NSAID cross-reactivity."""
        result = check_allergy_cross_reactivity(
            known_allergies=["aspirin"],
            new_drug="ibuprofen",
        )
        assert result["cross_reactivity_risk"] >= 0.3

    def test_direct_allergy_match(self):
        """Direct allergy match should return risk 1.0."""
        result = check_allergy_cross_reactivity(
            known_allergies=["amoxicillin"],
            new_drug="amoxicillin",
        )
        assert result["cross_reactivity_risk"] == 1.0
        assert "KONTRENDIKE" in result["recommendation"].upper()

    def test_no_cross_reactivity(self):
        """Unrelated drugs should show no cross-reactivity."""
        result = check_allergy_cross_reactivity(
            known_allergies=["penicillin"],
            new_drug="metformin",
        )
        assert result["cross_reactivity_risk"] == 0.0

    def test_sulfonamid_cross_reactivity(self):
        """Sulfonamide allergy should flag thiazide diuretics."""
        result = check_allergy_cross_reactivity(
            known_allergies=["trimethoprim_sulfamethoxazole"],
            new_drug="hydrochlorothiazide",
        )
        assert result["cross_reactivity_risk"] > 0

    def test_opioid_cross_reactivity(self):
        """Morphine allergy should show risk with other opioids (same group = high risk)."""
        result = check_allergy_cross_reactivity(
            known_allergies=["morphine"],
            new_drug="tramadol",
        )
        assert result["cross_reactivity_risk"] > 0
        assert result["cross_reactivity_risk"] <= 1.0

    def test_macrolide_cross_reactivity(self):
        """Erythromycin allergy should show high risk with azithromycin."""
        result = check_allergy_cross_reactivity(
            known_allergies=["erythromycin"],
            new_drug="azithromycin",
        )
        assert result["cross_reactivity_risk"] > 0

    def test_multiple_known_allergies(self):
        """Should check against all known allergies."""
        result = check_allergy_cross_reactivity(
            known_allergies=["penicillin", "ibuprofen"],
            new_drug="aspirin",
        )
        assert result["cross_reactivity_risk"] >= 0.3

    def test_penisilin_turkish_allergy_name(self):
        """Should recognize Turkish allergy names."""
        result = check_allergy_cross_reactivity(
            known_allergies=["penisilin"],
            new_drug="amoxicillin",
        )
        assert result["cross_reactivity_risk"] > 0


# ============================================================================
# PRESCRIPTION SAFETY SCORING TESTS
# ============================================================================


class TestPrescriptionSafety:
    """Test score_prescription_safety function."""

    def test_single_safe_medication(self, normal_adult):
        """Single safe medication should score high."""
        result = score_prescription_safety(
            medications=[{"name": "paracetamol"}],
            patient=normal_adult,
        )
        assert result["safety_score"] >= 90
        assert isinstance(result["risk_factors"], list)

    def test_polypharmacy_in_elderly(self, elderly_patient):
        """Many drugs in elderly should lower score significantly."""
        meds = [
            {"name": "metoprolol"},
            {"name": "amlodipine"},
            {"name": "atorvastatin"},
            {"name": "omeprazole"},
            {"name": "metformin"},
            {"name": "furosemide"},
            {"name": "warfarin"},
        ]
        result = score_prescription_safety(medications=meds, patient=elderly_patient)
        assert result["safety_score"] < 70
        assert any("polifarmasi" in rf.lower() or "Polifarmasi" in rf for rf in result["risk_factors"])

    def test_drug_interaction_detected(self, normal_adult):
        """Known drug interactions should reduce score."""
        result = score_prescription_safety(
            medications=[{"name": "warfarin"}, {"name": "ibuprofen"}],
            patient=normal_adult,
        )
        assert result["safety_score"] < 85
        assert any("kanama" in rf.lower() for rf in result["risk_factors"])

    def test_renal_contraindication_scoring(self, renal_impairment_patient):
        """Contraindicated drug in renal failure should drastically reduce score."""
        result = score_prescription_safety(
            medications=[{"name": "metformin"}],
            patient=renal_impairment_patient,
        )
        assert result["safety_score"] < 80
        assert any("kontrendike" in rf.lower() for rf in result["risk_factors"])

    def test_allergy_risk_scoring(self, normal_adult):
        """Known allergy cross-reactivity should reduce score."""
        patient = {**normal_adult, "known_allergies": ["penicillin"]}
        result = score_prescription_safety(
            medications=[{"name": "cephalexin"}],
            patient=patient,
        )
        assert result["safety_score"] < 100
        # cross-reactivity risk should be flagged

    def test_serotonin_syndrome_risk(self, normal_adult):
        """SSRI + Tramadol should flag serotonin syndrome risk."""
        result = score_prescription_safety(
            medications=[{"name": "sertraline"}, {"name": "tramadol"}],
            patient=normal_adult,
        )
        assert result["safety_score"] < 85
        assert any("serotonin" in rf.lower() for rf in result["risk_factors"])

    def test_perfect_score_single_safe_drug(self, normal_adult):
        """A single drug with no issues should score 100."""
        result = score_prescription_safety(
            medications=[{"name": "omeprazole"}],
            patient=normal_adult,
        )
        assert result["safety_score"] == 100

    def test_hepatic_failure_risk(self, hepatic_impairment_patient):
        """Drug contraindicated in hepatic failure should reduce score."""
        result = score_prescription_safety(
            medications=[{"name": "metformin"}],
            patient=hepatic_impairment_patient,
        )
        assert result["safety_score"] < 80

    def test_duplicate_class_detection(self, normal_adult):
        """Multiple drugs in same category should be flagged."""
        result = score_prescription_safety(
            medications=[{"name": "ibuprofen"}, {"name": "naproxen"}],
            patient=normal_adult,
        )
        assert any("aynı kategori" in rf.lower() or "Aynı kategori" in rf for rf in result["risk_factors"])


# ============================================================================
# ALTERNATIVE DRUG SUGGESTION TESTS
# ============================================================================


class TestSuggestAlternatives:
    """Test suggest_alternatives function."""

    def test_alternatives_for_contraindicated_drug(self, normal_adult):
        """Should suggest alternatives in the same category."""
        result = suggest_alternatives("ibuprofen", "allergy", normal_adult)
        assert len(result) > 0
        # Should suggest paracetamol or other analgesics
        alt_names = [a["drug_name"] for a in result]
        assert any(
            name in alt_names
            for name in ["paracetamol", "naproxen", "diclofenac", "aspirin"]
        )

    def test_allergy_excludes_same_class(self, normal_adult):
        """When reason is allergy, same-class drugs should be excluded."""
        result = suggest_alternatives("ibuprofen", "allergy", normal_adult)
        # nsaid class drugs should not be in top suggestions (or have lower scores)
        for alt in result:
            if alt["drug_class"] == "nsaid":
                # If same class appears, it should have lower suitability
                assert alt["suitability_score"] < 100

    def test_alternatives_consider_renal_function(self, renal_impairment_patient):
        """Alternatives should consider patient's renal function."""
        result = suggest_alternatives("ibuprofen", "renal", renal_impairment_patient)
        for alt in result:
            # All alternatives should have positive suitability
            assert alt["suitability_score"] > 0

    def test_no_alternatives_for_unknown_drug(self, normal_adult):
        """Unknown drug should return empty list."""
        result = suggest_alternatives("unknown_drug_xyz", "allergy", normal_adult)
        assert result == []

    def test_alternatives_have_turkish_names(self, normal_adult):
        """Alternatives should include Turkish names."""
        result = suggest_alternatives("ibuprofen", "allergy", normal_adult)
        for alt in result:
            assert "drug_name_tr" in alt
            assert alt["drug_name_tr"] != ""

    def test_antibiotic_alternatives(self, normal_adult):
        """Should suggest antibiotic alternatives."""
        result = suggest_alternatives("amoxicillin", "allergy", normal_adult)
        assert len(result) > 0
        # Should not suggest other penicillins when reason is allergy
        for alt in result:
            assert alt["drug_class"] != "penisilin"

    def test_antidiyabetik_alternatives(self, normal_adult):
        """Should suggest diabetes drug alternatives."""
        result = suggest_alternatives("metformin", "renal", normal_adult)
        assert len(result) > 0


# ============================================================================
# DOSING GUIDELINES TESTS (Turkish output)
# ============================================================================


class TestDosingGuidelines:
    """Test get_dosing_guidelines function."""

    def test_known_drug_guidelines(self):
        """Known drug should return complete Turkish guidelines."""
        result = get_dosing_guidelines("amoxicillin")
        assert result["found"] is True
        assert "ilac_adi" in result
        assert "Amoksisilin" in result["ilac_adi"]
        assert "standart_doz" in result
        assert "maksimum_gunluk_doz" in result
        assert "kullanim_sikligi" in result
        assert "uygulama_yolu" in result
        assert "renal_doz_ayari" in result
        assert "hepatik_doz_ayari" in result

    def test_unknown_drug_guidelines(self):
        """Unknown drug should return not found."""
        result = get_dosing_guidelines("fake_drug_xyz")
        assert result["found"] is False

    def test_guidelines_have_turkish_content(self):
        """Guidelines should contain Turkish text."""
        result = get_dosing_guidelines("metformin")
        assert result["found"] is True
        assert "notlar" in result
        assert len(result["notlar"]) > 0
        # Should contain Turkish chars or Turkish medical terms
        assert "Metformin" in result["ilac_adi"]

    def test_guidelines_renal_info(self):
        """Renal adjustment info should be present."""
        result = get_dosing_guidelines("metformin")
        assert result["found"] is True
        assert len(result["renal_doz_ayari"]) > 0
        assert any("GFR" in r for r in result["renal_doz_ayari"])

    def test_guidelines_hepatic_info(self):
        """Hepatic adjustment info should be present."""
        result = get_dosing_guidelines("paracetamol")
        assert result["found"] is True
        assert len(result["hepatik_doz_ayari"]) > 0

    def test_guidelines_contraindications(self):
        """Contraindications should be listed."""
        result = get_dosing_guidelines("warfarin")
        assert result["found"] is True
        assert "kontrendikasyonlar" in result
        assert len(result["kontrendikasyonlar"]) > 0

    def test_guidelines_pediatric_info(self):
        """Pediatric information should be present."""
        result = get_dosing_guidelines("amoxicillin")
        assert result["found"] is True
        assert result["pediatrik_kullanim"] == "Evet"

    def test_guidelines_turkish_name_lookup(self):
        """Should find drug by Turkish name."""
        result = get_dosing_guidelines("Parasetamol (Asetaminofen)")
        assert result["found"] is True


# ============================================================================
# EDGE CASE TESTS
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_extremely_low_weight(self):
        """Extremely low weight patient."""
        patient = {
            "age": 25,
            "weight_kg": 30,
            "height_cm": 150,
            "gender": "female",
            "creatinine": 0.8,
            "gfr": 90,
            "liver_function": "normal",
        }
        result = calculate_safe_dose("metoprolol", patient)
        assert result["found"] is True
        assert result["recommended_dose"] < 50
        assert result["recommended_dose"] > 0

    def test_extremely_high_age(self):
        """Very elderly patient (100+ years)."""
        patient = {
            "age": 102,
            "weight_kg": 45,
            "height_cm": 155,
            "gender": "female",
            "creatinine": 2.0,
            "gfr": 20,
            "liver_function": "mild",
        }
        result = calculate_safe_dose("gabapentin", patient)
        assert result["found"] is True
        # Should have multiple adjustments
        assert len(result["adjustment_reason"]) >= 1

    def test_missing_gfr_with_creatinine(self):
        """Should estimate GFR from creatinine if GFR not provided."""
        patient = {
            "age": 50,
            "weight_kg": 80,
            "height_cm": 175,
            "gender": "male",
            "creatinine": 3.0,
            # gfr intentionally omitted
            "liver_function": "normal",
        }
        result = calculate_safe_dose("metformin", patient)
        assert result["found"] is True
        # With creatinine 3.0, estimated GFR should be low
        # Metformin should be contraindicated or dose-adjusted

    def test_missing_patient_data(self):
        """Should handle minimal patient data gracefully."""
        patient = {"age": 40}
        result = calculate_safe_dose("paracetamol", patient)
        assert result["found"] is True
        assert result["recommended_dose"] > 0

    def test_empty_allergy_list(self):
        """Empty allergy list should return no risk."""
        result = check_allergy_cross_reactivity([], "amoxicillin")
        assert result["cross_reactivity_risk"] == 0.0

    def test_empty_medication_list(self, normal_adult):
        """Empty medication list should score perfectly."""
        result = score_prescription_safety([], normal_adult)
        assert result["safety_score"] == 100

    def test_safety_score_clamped(self, renal_impairment_patient):
        """Safety score should never go below 0."""
        # Extreme scenario with many risky medications
        meds = [
            {"name": "warfarin"},
            {"name": "ibuprofen"},
            {"name": "naproxen"},
            {"name": "aspirin"},
            {"name": "metformin"},
            {"name": "sertraline"},
            {"name": "tramadol"},
            {"name": "furosemide"},
            {"name": "enalapril"},
            {"name": "losartan"},
            {"name": "metoprolol"},
            {"name": "amlodipine"},
        ]
        result = score_prescription_safety(
            medications=meds,
            patient={**renal_impairment_patient, "known_allergies": ["penicillin"]},
        )
        assert result["safety_score"] >= 0
        assert result["safety_score"] <= 100

    def test_infant_dosing(self):
        """Infant patient should get appropriate handling."""
        patient = {
            "age": 0,
            "weight_kg": 3.5,
            "height_cm": 50,
            "gender": "male",
            "gfr": 40,
            "liver_function": "normal",
        }
        result = calculate_safe_dose("paracetamol", patient)
        assert result["found"] is True
        # 15 mg/kg * 3.5 = 52.5 mg
        assert result["recommended_dose"] == 52.5

    def test_neonatal_contraindicated_drug(self):
        """Certain drugs should be contraindicated in neonates."""
        patient = {
            "age": 0,
            "weight_kg": 3.0,
            "height_cm": 48,
            "gender": "female",
            "gfr": 40,
            "liver_function": "normal",
        }
        result = calculate_safe_dose("ciprofloxacin", patient)
        assert result["found"] is True
        assert result["recommended_dose"] == 0
