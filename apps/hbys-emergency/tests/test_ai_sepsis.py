"""
Tests for AI-Powered Sepsis Early Warning System
=================================================
Covers: predict_sepsis_risk, calculate_qsofa, calculate_news2,
        get_sepsis_recommendation, edge cases, and missing data handling.
"""
import sys
import os

# Ensure the parent package is importable when running tests standalone
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from ai_service import (
    predict_sepsis_risk,
    calculate_qsofa,
    calculate_news2,
    get_sepsis_recommendation,
    FEATURE_NAMES,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def healthy_vitals():
    return {
        "heart_rate": 75,
        "systolic_bp": 120,
        "diastolic_bp": 75,
        "respiratory_rate": 14,
        "temperature": 36.7,
        "spo2": 98,
        "gcs_score": 15,
        "wbc": 7.0,
        "lactate": 0.9,
        "creatinine": 0.8,
        "bilirubin": 0.5,
        "platelets": 250,
        "age": 40,
    }


@pytest.fixture
def septic_vitals():
    return {
        "heart_rate": 130,
        "systolic_bp": 75,
        "diastolic_bp": 40,
        "respiratory_rate": 28,
        "temperature": 39.8,
        "spo2": 88,
        "gcs_score": 10,
        "wbc": 22,
        "lactate": 5.5,
        "creatinine": 3.0,
        "bilirubin": 3.5,
        "platelets": 70,
        "age": 68,
    }


@pytest.fixture
def borderline_vitals():
    return {
        "heart_rate": 100,
        "systolic_bp": 100,
        "diastolic_bp": 65,
        "respiratory_rate": 22,
        "temperature": 38.2,
        "spo2": 94,
        "gcs_score": 14,
        "wbc": 13,
        "lactate": 2.2,
        "creatinine": 1.4,
        "bilirubin": 1.4,
        "platelets": 140,
        "age": 55,
    }


# ---------------------------------------------------------------------------
# predict_sepsis_risk tests
# ---------------------------------------------------------------------------

class TestPredictSepsisRisk:
    def test_healthy_patient_low_risk(self, healthy_vitals):
        result = predict_sepsis_risk(healthy_vitals)
        assert result["risk_level"] in ("low", "moderate"), (
            f"Healthy patient should be low/moderate risk, got {result['risk_level']}"
        )
        assert result["risk_score"] < 0.50

    def test_septic_patient_high_risk(self, septic_vitals):
        result = predict_sepsis_risk(septic_vitals)
        assert result["risk_level"] in ("high", "critical"), (
            f"Septic patient should be high/critical risk, got {result['risk_level']}"
        )
        assert result["risk_score"] > 0.50

    def test_borderline_patient(self, borderline_vitals):
        result = predict_sepsis_risk(borderline_vitals)
        # Borderline should be somewhere in the middle
        assert 0.0 <= result["risk_score"] <= 1.0
        assert result["risk_level"] in ("low", "moderate", "high", "critical")

    def test_risk_score_range(self, healthy_vitals):
        result = predict_sepsis_risk(healthy_vitals)
        assert 0.0 <= result["risk_score"] <= 1.0

    def test_risk_score_range_septic(self, septic_vitals):
        result = predict_sepsis_risk(septic_vitals)
        assert 0.0 <= result["risk_score"] <= 1.0

    def test_contributing_factors_returned(self, septic_vitals):
        result = predict_sepsis_risk(septic_vitals)
        assert "contributing_factors" in result
        assert isinstance(result["contributing_factors"], list)
        assert len(result["contributing_factors"]) > 0

    def test_contributing_factors_structure(self, septic_vitals):
        result = predict_sepsis_risk(septic_vitals)
        for factor in result["contributing_factors"]:
            assert "feature" in factor
            assert "value" in factor
            assert "normal_range" in factor
            assert "direction" in factor

    def test_recommended_actions_returned(self, septic_vitals):
        result = predict_sepsis_risk(septic_vitals)
        assert "recommended_actions" in result
        assert isinstance(result["recommended_actions"], list)
        assert len(result["recommended_actions"]) > 0

    def test_feature_importances_returned(self, healthy_vitals):
        result = predict_sepsis_risk(healthy_vitals)
        assert "feature_importances" in result
        assert isinstance(result["feature_importances"], dict)

    def test_healthy_has_fewer_contributing_factors(self, healthy_vitals, septic_vitals):
        healthy_result = predict_sepsis_risk(healthy_vitals)
        septic_result = predict_sepsis_risk(septic_vitals)
        assert len(healthy_result["contributing_factors"]) < len(
            septic_result["contributing_factors"]
        )


# ---------------------------------------------------------------------------
# Missing / partial vital signs
# ---------------------------------------------------------------------------

class TestMissingVitals:
    def test_empty_dict(self):
        """Empty dict should use all defaults and return a valid result."""
        result = predict_sepsis_risk({})
        assert 0.0 <= result["risk_score"] <= 1.0
        assert result["risk_level"] in ("low", "moderate", "high", "critical")

    def test_partial_vitals(self):
        """Providing only a few values should still work."""
        result = predict_sepsis_risk({"heart_rate": 120, "temperature": 39.0})
        assert 0.0 <= result["risk_score"] <= 1.0

    def test_single_vital(self):
        result = predict_sepsis_risk({"lactate": 6.0})
        assert 0.0 <= result["risk_score"] <= 1.0

    def test_unknown_keys_ignored(self, healthy_vitals):
        healthy_vitals["unknown_field"] = 999
        result = predict_sepsis_risk(healthy_vitals)
        assert 0.0 <= result["risk_score"] <= 1.0


# ---------------------------------------------------------------------------
# qSOFA tests
# ---------------------------------------------------------------------------

class TestQSOFA:
    def test_score_zero(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 120, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 0
        assert result["risk_level"] == "low"

    def test_score_one_rr(self):
        vitals = {"respiratory_rate": 24, "systolic_bp": 120, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1

    def test_score_one_sbp(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 95, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1

    def test_score_one_gcs(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 120, "gcs_score": 13}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1

    def test_score_two_high_risk(self):
        vitals = {"respiratory_rate": 24, "systolic_bp": 90, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 2
        assert result["risk_level"] == "high"

    def test_score_three(self):
        vitals = {"respiratory_rate": 25, "systolic_bp": 85, "gcs_score": 12}
        result = calculate_qsofa(vitals)
        assert result["score"] == 3
        assert result["risk_level"] == "high"

    def test_exact_thresholds_rr_22(self):
        vitals = {"respiratory_rate": 22, "systolic_bp": 120, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1  # RR >= 22 meets criteria

    def test_exact_threshold_sbp_100(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 100, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1  # SBP <= 100 meets criteria

    def test_gcs_exactly_15_no_point(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 120, "gcs_score": 15}
        result = calculate_qsofa(vitals)
        assert result["score"] == 0

    def test_gcs_14_scores_point(self):
        vitals = {"respiratory_rate": 16, "systolic_bp": 120, "gcs_score": 14}
        result = calculate_qsofa(vitals)
        assert result["score"] == 1

    def test_max_score_is_3(self):
        result = calculate_qsofa({
            "respiratory_rate": 30, "systolic_bp": 80, "gcs_score": 10,
        })
        assert result["max_score"] == 3

    def test_criteria_details(self):
        vitals = {"respiratory_rate": 24, "systolic_bp": 90, "gcs_score": 12}
        result = calculate_qsofa(vitals)
        assert len(result["criteria"]) == 3
        for c in result["criteria"]:
            assert c["met"] is True

    def test_partial_vitals(self):
        """Missing values should not contribute to score."""
        result = calculate_qsofa({"respiratory_rate": 24})
        assert result["score"] == 1  # only RR counted


# ---------------------------------------------------------------------------
# NEWS2 tests
# ---------------------------------------------------------------------------

class TestNEWS2:
    def test_normal_vitals_low_score(self):
        vitals = {
            "respiratory_rate": 16,
            "spo2": 98,
            "systolic_bp": 120,
            "heart_rate": 75,
            "temperature": 36.8,
            "gcs_score": 15,
        }
        result = calculate_news2(vitals)
        assert result["total_score"] == 0
        assert result["alert_level"] == "low"

    def test_critical_vitals_high_score(self):
        vitals = {
            "respiratory_rate": 30,
            "spo2": 88,
            "systolic_bp": 85,
            "heart_rate": 135,
            "temperature": 34.5,
            "gcs_score": 10,
        }
        result = calculate_news2(vitals)
        assert result["total_score"] >= 7
        assert result["alert_level"] == "critical"

    def test_single_extreme_triggers_high(self):
        """A single parameter scoring 3 should trigger at least high alert."""
        vitals = {
            "respiratory_rate": 16,
            "spo2": 98,
            "systolic_bp": 120,
            "heart_rate": 75,
            "temperature": 36.8,
            "gcs_score": 12,  # scores 3
        }
        result = calculate_news2(vitals)
        assert result["alert_level"] in ("high", "critical")

    def test_parameter_scores_present(self):
        vitals = {"respiratory_rate": 16, "heart_rate": 75}
        result = calculate_news2(vitals)
        assert "respiratory_rate" in result["parameter_scores"]
        assert "heart_rate" in result["parameter_scores"]

    def test_empty_vitals(self):
        result = calculate_news2({})
        assert result["total_score"] == 0
        assert result["alert_level"] == "low"

    def test_rr_scoring_boundaries(self):
        # RR 8 -> score 3
        r = calculate_news2({"respiratory_rate": 8})
        assert r["parameter_scores"]["respiratory_rate"]["score"] == 3
        # RR 9 -> score 1
        r = calculate_news2({"respiratory_rate": 9})
        assert r["parameter_scores"]["respiratory_rate"]["score"] == 1
        # RR 15 -> score 0
        r = calculate_news2({"respiratory_rate": 15})
        assert r["parameter_scores"]["respiratory_rate"]["score"] == 0
        # RR 22 -> score 2
        r = calculate_news2({"respiratory_rate": 22})
        assert r["parameter_scores"]["respiratory_rate"]["score"] == 2
        # RR 26 -> score 3
        r = calculate_news2({"respiratory_rate": 26})
        assert r["parameter_scores"]["respiratory_rate"]["score"] == 3

    def test_max_possible_score(self):
        result = calculate_news2({"respiratory_rate": 16})
        assert result["max_possible_score"] == 20

    def test_alert_message_in_turkish(self):
        vitals = {"respiratory_rate": 30, "spo2": 88, "systolic_bp": 85,
                  "heart_rate": 135, "temperature": 34.5, "gcs_score": 10}
        result = calculate_news2(vitals)
        assert "KRITIK" in result["alert_message"] or "YUKSEK" in result["alert_message"]


# ---------------------------------------------------------------------------
# Turkish recommendations
# ---------------------------------------------------------------------------

class TestRecommendations:
    def test_low_recommendations(self):
        recs = get_sepsis_recommendation("low")
        assert isinstance(recs, list)
        assert len(recs) >= 1
        # Should contain Turkish text
        assert any("takib" in r or "izlem" in r or "degerlendirin" in r for r in recs)

    def test_moderate_recommendations(self):
        recs = get_sepsis_recommendation("moderate")
        assert len(recs) > len(get_sepsis_recommendation("low"))

    def test_high_recommendations(self):
        recs = get_sepsis_recommendation("high")
        assert any("ACIL" in r for r in recs)

    def test_critical_recommendations(self):
        recs = get_sepsis_recommendation("critical")
        assert any("KOD SEPSIS" in r or "sepsis" in r.lower() for r in recs)
        assert len(recs) >= 5

    def test_unknown_level_returns_low(self):
        recs = get_sepsis_recommendation("unknown")
        assert recs == get_sepsis_recommendation("low")

    def test_recommendations_are_strings(self):
        for level in ("low", "moderate", "high", "critical"):
            recs = get_sepsis_recommendation(level)
            for r in recs:
                assert isinstance(r, str)
