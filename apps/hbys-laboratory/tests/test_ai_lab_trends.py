"""
Tests for AI-powered lab result trend analysis.

Covers:
- Trend prediction with synthetic data
- Anomaly detection (Z-score and IQR)
- Trend classification (stable / increasing / decreasing)
- Critical threshold prediction
- Population comparison / percentile ranking
- Edge cases (insufficient data, various lab types)
"""

import sys
import os
from datetime import datetime, timedelta

import pytest
import numpy as np

# Ensure the parent package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ai_service import (
    predict_lab_trend,
    detect_anomalies,
    analyze_patient_labs,
    compare_with_population,
    REFERENCE_RANGES,
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _make_results(
    start_value: float,
    slope: float,
    n: int = 30,
    noise_std: float = 0.0,
    start_date: str = "2025-01-01",
    interval_days: int = 7,
) -> list[dict]:
    """Generate synthetic lab results with a linear trend + optional noise."""
    base = datetime.fromisoformat(start_date)
    rng = np.random.default_rng(42)
    results = []
    for i in range(n):
        noise = rng.normal(0, noise_std) if noise_std > 0 else 0.0
        results.append(
            {
                "date": (base + timedelta(days=i * interval_days)).isoformat(),
                "value": round(start_value + slope * i + noise, 2),
            }
        )
    return results


# ─── Trend Prediction ──────────────────────────────────────────────────────

class TestPredictLabTrend:
    def test_increasing_glucose_forecast(self):
        """6 months of increasing glucose should yield an upward forecast."""
        results = _make_results(start_value=90, slope=1.5, n=26, noise_std=2.0)
        prediction = predict_lab_trend(results, periods=30)

        assert prediction["data_points"] == 26
        assert prediction["model_used"] in ("prophet", "linear_regression")
        assert len(prediction["forecast"]) == 30

        # First forecasted value should be roughly around last value
        last_val = results[-1]["value"]
        first_pred = prediction["forecast"][0]["predicted"]
        assert abs(first_pred - last_val) < 20  # within reasonable range

        # Forecast should generally trend upward
        preds = [f["predicted"] for f in prediction["forecast"]]
        assert preds[-1] > preds[0]

    def test_forecast_has_confidence_intervals(self):
        results = _make_results(start_value=5.0, slope=0.05, n=12, noise_std=0.1)
        prediction = predict_lab_trend(results, periods=10)

        for point in prediction["forecast"]:
            assert "lower" in point
            assert "upper" in point
            assert "predicted" in point
            assert point["lower"] <= point["predicted"] <= point["upper"]

    def test_forecast_dates_are_future(self):
        results = _make_results(start_value=100, slope=0, n=10)
        prediction = predict_lab_trend(results, periods=5)

        last_historical = datetime.fromisoformat(results[-1]["date"])
        for point in prediction["forecast"]:
            forecast_date = datetime.fromisoformat(point["date"])
            assert forecast_date > last_historical


# ─── Anomaly Detection ─────────────────────────────────────────────────────

class TestDetectAnomalies:
    def test_zscore_detects_outlier(self):
        """Insert one outlier in a normal series; it should be flagged."""
        results = _make_results(start_value=90, slope=0, n=20, noise_std=3.0)
        # Inject a clear outlier
        results[10]["value"] = 200.0

        anomalies = detect_anomalies(results, method="zscore")
        anomaly_values = [a["value"] for a in anomalies]
        assert 200.0 in anomaly_values
        for a in anomalies:
            assert a["is_anomaly"] is True

    def test_iqr_detects_outlier(self):
        results = _make_results(start_value=90, slope=0, n=20, noise_std=2.0)
        results[5]["value"] = 300.0

        anomalies = detect_anomalies(results, method="iqr")
        anomaly_values = [a["value"] for a in anomalies]
        assert 300.0 in anomaly_values

    def test_no_anomalies_in_clean_data(self):
        results = _make_results(start_value=90, slope=0, n=20, noise_std=1.0)
        anomalies = detect_anomalies(results, method="zscore")
        # With very low noise and default threshold of 2.5, no anomalies expected
        assert len(anomalies) == 0

    def test_empty_on_insufficient_data(self):
        results = [{"date": "2025-01-01", "value": 90}]
        anomalies = detect_anomalies(results)
        assert anomalies == []

    def test_invalid_method_raises(self):
        results = _make_results(start_value=90, slope=0, n=10)
        with pytest.raises(ValueError, match="Unknown anomaly detection method"):
            detect_anomalies(results, method="invalid_method")


# ─── Trend Classification ──────────────────────────────────────────────────

class TestTrendClassification:
    def test_stable_trend(self):
        results = _make_results(start_value=90, slope=0, n=20, noise_std=1.0)
        analysis = analyze_patient_labs(results)
        assert analysis["trend_direction"] == "stable"

    def test_increasing_trend(self):
        results = _make_results(start_value=80, slope=2.0, n=20, noise_std=0.5)
        analysis = analyze_patient_labs(results)
        assert analysis["trend_direction"] == "increasing"

    def test_decreasing_trend(self):
        results = _make_results(start_value=120, slope=-2.0, n=20, noise_std=0.5)
        analysis = analyze_patient_labs(results)
        assert analysis["trend_direction"] == "decreasing"


# ─── Critical Threshold Prediction ─────────────────────────────────────────

class TestCriticalThreshold:
    def test_hba1c_trending_toward_critical(self):
        """HbA1c trending up from 6.0 with slope should predict days to critical_high=15."""
        results = _make_results(start_value=6.0, slope=0.1, n=20, noise_std=0.02)
        analysis = analyze_patient_labs(results, test_code="hba1c")

        assert analysis["trend_direction"] == "increasing"
        assert analysis["days_to_critical"] is not None
        assert analysis["days_to_critical"]["direction"] == "high"
        assert analysis["days_to_critical"]["estimated_days"] > 0

    def test_stable_no_critical_prediction(self):
        """Stable values should not predict approaching a critical threshold."""
        results = _make_results(start_value=90, slope=0, n=20, noise_std=1.0)
        analysis = analyze_patient_labs(results, test_code="glucose")
        assert analysis["days_to_critical"] is None

    def test_creatinine_decreasing_toward_critical_low(self):
        results = _make_results(start_value=0.8, slope=-0.01, n=20, noise_std=0.005)
        analysis = analyze_patient_labs(results, test_code="creatinine")

        if analysis["trend_direction"] == "decreasing":
            assert analysis["days_to_critical"] is not None
            assert analysis["days_to_critical"]["direction"] == "low"


# ─── Population Comparison ─────────────────────────────────────────────────

class TestPopulationComparison:
    def test_normal_glucose(self):
        result = compare_with_population(value=92.0, test_code="glucose", age=40, gender="male")
        assert result["is_normal"] is True
        assert result["is_critical"] is False
        # 92 is near the population mean of 92, so percentile should be ~50
        assert 40 < result["percentile"] < 60

    def test_high_glucose_percentile(self):
        result = compare_with_population(value=130.0, test_code="glucose", age=40, gender="male")
        assert result["is_normal"] is False
        assert result["percentile"] > 90

    def test_critical_value(self):
        result = compare_with_population(value=450.0, test_code="glucose", age=50, gender="female")
        assert result["is_critical"] is True
        assert result["percentile"] > 99

    def test_gender_adjustment_hemoglobin(self):
        male = compare_with_population(value=14.0, test_code="hemoglobin", age=40, gender="male")
        female = compare_with_population(value=14.0, test_code="hemoglobin", age=40, gender="female")
        # Same value should have a higher percentile for females (since their mean is lower)
        assert female["percentile"] > male["percentile"]

    def test_age_adjustment(self):
        young = compare_with_population(value=100.0, test_code="glucose", age=30, gender="male")
        old = compare_with_population(value=100.0, test_code="glucose", age=65, gender="male")
        # For older patients the mean is shifted up, so same value => lower percentile
        assert old["percentile"] < young["percentile"]

    def test_unknown_test_code(self):
        result = compare_with_population(value=10.0, test_code="unknown_test", age=40, gender="male")
        assert "error" in result
        assert "known_tests" in result

    def test_tsh_percentile(self):
        result = compare_with_population(value=2.0, test_code="tsh", age=35, gender="female")
        assert result["is_normal"] is True
        assert 40 < result["percentile"] < 60


# ─── Insufficient Data ─────────────────────────────────────────────────────

class TestInsufficientData:
    def test_predict_with_one_point(self):
        results = [{"date": "2025-01-01", "value": 90}]
        prediction = predict_lab_trend(results, periods=10)
        assert prediction["model_used"] == "insufficient_data"
        assert prediction["forecast"] == []
        assert "error" in prediction

    def test_predict_with_two_points(self):
        results = [
            {"date": "2025-01-01", "value": 90},
            {"date": "2025-01-08", "value": 92},
        ]
        prediction = predict_lab_trend(results, periods=5)
        assert prediction["model_used"] == "insufficient_data"
        assert prediction["forecast"] == []

    def test_analyze_with_insufficient_data(self):
        results = [{"date": "2025-01-01", "value": 90}]
        analysis = analyze_patient_labs(results)
        assert analysis["trend_direction"] == "insufficient_data"
        assert "error" in analysis


# ─── Various Lab Types ──────────────────────────────────────────────────────

class TestVariousLabTypes:
    def test_glucose_full_pipeline(self):
        results = _make_results(start_value=95, slope=0.5, n=15, noise_std=3.0)
        analysis = analyze_patient_labs(results, test_code="glucose")
        assert analysis["data_points"] == 15
        assert "trend_direction" in analysis
        assert "forecast_summary" in analysis

    def test_creatinine_analysis(self):
        results = _make_results(start_value=0.9, slope=0.01, n=12, noise_std=0.05)
        analysis = analyze_patient_labs(results, test_code="creatinine")
        assert analysis["data_points"] == 12

    def test_tsh_analysis(self):
        results = _make_results(start_value=2.0, slope=-0.02, n=10, noise_std=0.1)
        analysis = analyze_patient_labs(results, test_code="tsh")
        assert analysis["data_points"] == 10

    def test_population_comparison_all_known_tests(self):
        """Every test in REFERENCE_RANGES should return a valid comparison."""
        for test_code, ref in REFERENCE_RANGES.items():
            mid = (ref["normal_low"] + ref["normal_high"]) / 2
            result = compare_with_population(
                value=mid, test_code=test_code, age=40, gender="male"
            )
            assert "error" not in result
            assert "percentile" in result
