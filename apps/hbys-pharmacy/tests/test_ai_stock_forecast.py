"""
Tests for AI-powered stock consumption forecasting.
Covers forecasting, reorder points, expiry rotation,
anomaly detection, and procurement planning.
"""
import sys
import os
from datetime import date, timedelta
import math

import pytest

# Allow importing from parent directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ai_service import (
    forecast_consumption,
    calculate_reorder_point,
    optimize_expiry_rotation,
    detect_consumption_anomaly,
    generate_procurement_plan,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_history(daily_usage: int, days: int, start_date: date = None) -> list[dict]:
    """Generate steady-state consumption history."""
    if start_date is None:
        start_date = date.today() - timedelta(days=days)
    return [
        {"date": (start_date + timedelta(days=i)).isoformat(), "quantity_used": daily_usage}
        for i in range(days)
    ]


def _make_seasonal_history(base_usage: int, days: int) -> list[dict]:
    """Generate history with seasonal pattern (higher in winter months)."""
    import math
    start = date.today() - timedelta(days=days)
    history = []
    for i in range(days):
        d = start + timedelta(days=i)
        # Sinusoidal seasonality: peak around January (month=1), trough July
        month_angle = 2 * math.pi * (d.month - 1) / 12
        seasonal_factor = 1.0 + 0.5 * math.cos(month_angle)  # range 0.5 to 1.5
        qty = max(1, int(base_usage * seasonal_factor))
        history.append({"date": d.isoformat(), "quantity_used": qty})
    return history


# ===========================================================================
# Test: Consumption Forecast
# ===========================================================================

class TestForecastConsumption:
    """Tests for forecast_consumption()."""

    def test_steady_daily_usage(self):
        """90 days of 10 units/day should predict ~10/day."""
        history = _make_history(10, 90)
        result = forecast_consumption(history, periods=30)

        assert "forecast" in result
        assert len(result["forecast"]) == 30
        assert result["total_predicted_consumption"] > 0

        avg = result["average_daily_consumption"]
        # With steady data Prophet should predict close to 10
        assert 7 <= avg <= 14, f"Expected ~10/day, got {avg}"

    def test_seasonal_pattern(self):
        """Seasonal data should still produce a valid forecast."""
        history = _make_seasonal_history(base_usage=20, days=365)
        result = forecast_consumption(history, periods=30)

        assert len(result["forecast"]) == 30
        assert result["total_predicted_consumption"] > 0
        # Each row has confidence interval
        row = result["forecast"][0]
        assert "lower" in row
        assert "upper" in row
        assert row["lower"] <= row["predicted"] <= row["upper"]

    def test_forecast_has_model_metrics(self):
        """Result must include model_metrics with MAPE."""
        history = _make_history(15, 60)
        result = forecast_consumption(history, periods=7)
        assert "model_metrics" in result
        assert "mape" in result["model_metrics"]

    def test_insufficient_data_raises(self):
        """Fewer than 14 days should raise ValueError."""
        history = _make_history(10, 5)
        with pytest.raises(ValueError, match="14 days"):
            forecast_consumption(history)

    def test_predictions_non_negative(self):
        """All predicted values must be >= 0."""
        history = _make_history(2, 30)
        result = forecast_consumption(history, periods=14)
        for row in result["forecast"]:
            assert row["predicted"] >= 0
            assert row["lower"] >= 0


# ===========================================================================
# Test: Reorder Point Calculation
# ===========================================================================

class TestReorderPoint:
    """Tests for calculate_reorder_point()."""

    def test_basic_reorder_point(self):
        """lead_time=7, safety=3, usage=10/day -> reorder at ~100."""
        history = _make_history(10, 90)
        result = calculate_reorder_point(history, lead_time_days=7, safety_stock_days=3)

        # reorder_point = lead_time * avg_usage + safety_stock
        # = 7 * 10 + 3 * 10 = 100
        assert result["reorder_point"] == 100
        assert result["safety_stock"] == 30
        assert result["average_daily_usage"] == 10.0

    def test_reorder_quantity_covers_30_days(self):
        """Reorder quantity should cover ~30 days + safety."""
        history = _make_history(10, 90)
        result = calculate_reorder_point(history, lead_time_days=7, safety_stock_days=3)
        # 30 * 10 + 30 (safety) = 330
        assert result["reorder_quantity"] == 330

    def test_stockout_prediction(self):
        """days_until_stockout should be current_stock / avg_daily."""
        history = _make_history(10, 30)
        result = calculate_reorder_point(history, current_stock=50)
        assert result["days_until_stockout"] == 5.0

    def test_stockout_none_without_current_stock(self):
        """days_until_stockout should be None when current_stock not given."""
        history = _make_history(10, 30)
        result = calculate_reorder_point(history)
        assert result["days_until_stockout"] is None

    def test_insufficient_history(self):
        """Fewer than 7 days raises ValueError."""
        history = _make_history(10, 3)
        with pytest.raises(ValueError, match="7 days"):
            calculate_reorder_point(history)


# ===========================================================================
# Test: Expiry Rotation (FEFO)
# ===========================================================================

class TestExpiryRotation:
    """Tests for optimize_expiry_rotation()."""

    def test_item_expiring_soon_prioritized(self):
        """Item expiring in 5 days should come before 90-day item."""
        today = date.today()
        items = [
            {
                "item_id": "A",
                "medication_id": "med-1",
                "lot_number": "LOT-A",
                "quantity_on_hand": 100,
                "expiry_date": (today + timedelta(days=90)).isoformat(),
                "unit_cost": 5.0,
            },
            {
                "item_id": "B",
                "medication_id": "med-1",
                "lot_number": "LOT-B",
                "quantity_on_hand": 50,
                "expiry_date": (today + timedelta(days=5)).isoformat(),
                "unit_cost": 5.0,
            },
        ]
        result = optimize_expiry_rotation(items)

        assert result[0]["item_id"] == "B"
        assert result[0]["risk_level"] == "critical"
        assert result[0]["days_until_expiry"] == 5

    def test_expired_item_highest_priority(self):
        """Already expired items get risk_level='expired' and priority 100."""
        today = date.today()
        items = [
            {
                "item_id": "X",
                "medication_id": "med-2",
                "lot_number": "LOT-X",
                "quantity_on_hand": 20,
                "expiry_date": (today - timedelta(days=3)).isoformat(),
                "unit_cost": 10.0,
            },
        ]
        result = optimize_expiry_rotation(items)
        assert result[0]["risk_level"] == "expired"
        assert result[0]["priority_score"] == 100

    def test_empty_list(self):
        """Empty input returns empty list."""
        assert optimize_expiry_rotation([]) == []

    def test_all_risk_levels_exist(self):
        """Verify that different expiry ranges map to correct risk levels."""
        today = date.today()
        items = [
            {"item_id": "E", "medication_id": "m", "lot_number": "L", "quantity_on_hand": 1,
             "expiry_date": (today - timedelta(days=1)).isoformat(), "unit_cost": 1.0},
            {"item_id": "C", "medication_id": "m", "lot_number": "L", "quantity_on_hand": 1,
             "expiry_date": (today + timedelta(days=3)).isoformat(), "unit_cost": 1.0},
            {"item_id": "H", "medication_id": "m", "lot_number": "L", "quantity_on_hand": 1,
             "expiry_date": (today + timedelta(days=20)).isoformat(), "unit_cost": 1.0},
            {"item_id": "M", "medication_id": "m", "lot_number": "L", "quantity_on_hand": 1,
             "expiry_date": (today + timedelta(days=60)).isoformat(), "unit_cost": 1.0},
            {"item_id": "L", "medication_id": "m", "lot_number": "L", "quantity_on_hand": 1,
             "expiry_date": (today + timedelta(days=180)).isoformat(), "unit_cost": 1.0},
        ]
        result = optimize_expiry_rotation(items)
        risk_levels = {r["item_id"]: r["risk_level"] for r in result}
        assert risk_levels["E"] == "expired"
        assert risk_levels["C"] == "critical"
        assert risk_levels["H"] == "high"
        assert risk_levels["M"] == "medium"
        assert risk_levels["L"] == "low"


# ===========================================================================
# Test: Anomaly Detection
# ===========================================================================

class TestAnomalyDetection:
    """Tests for detect_consumption_anomaly()."""

    def test_sudden_spike_detected(self):
        """A 5x spike in an otherwise steady series should be flagged."""
        history = _make_history(10, 60)
        # Inject a 5x spike on day 30
        history[30]["quantity_used"] = 50
        result = detect_consumption_anomaly(history)

        assert result["has_anomalies"] is True
        spike_dates = [a["date"] for a in result["anomalies"]]
        assert history[30]["date"] in spike_dates

        spike = next(a for a in result["anomalies"] if a["date"] == history[30]["date"])
        assert spike["type"] == "spike"
        assert spike["z_score"] > 2.5

    def test_no_anomaly_in_steady_data(self):
        """Perfectly steady data should have no anomalies."""
        history = _make_history(10, 60)
        result = detect_consumption_anomaly(history)
        assert result["has_anomalies"] is False
        assert result["anomalies"] == []

    def test_statistics_returned(self):
        """Result must contain statistics dict."""
        history = _make_history(10, 30)
        result = detect_consumption_anomaly(history)
        stats = result["statistics"]
        assert stats["mean"] == 10.0
        assert stats["min"] == 10
        assert stats["max"] == 10

    def test_insufficient_data_raises(self):
        """Fewer than 14 days raises ValueError."""
        history = _make_history(10, 5)
        with pytest.raises(ValueError, match="14 days"):
            detect_consumption_anomaly(history)


# ===========================================================================
# Test: Procurement Plan
# ===========================================================================

class TestProcurementPlan:
    """Tests for generate_procurement_plan()."""

    def test_budget_constraint_respected(self):
        """Total cost must not exceed the given budget."""
        items = [
            {
                "medication_id": "med-1",
                "name": "Amoxicillin",
                "current_stock": 10,
                "average_daily_usage": 5.0,
                "unit_cost": 2.0,
                "lead_time_days": 7,
                "criticality": "essential",
            },
            {
                "medication_id": "med-2",
                "name": "Ibuprofen",
                "current_stock": 200,
                "average_daily_usage": 8.0,
                "unit_cost": 1.0,
                "lead_time_days": 5,
                "criticality": "standard",
            },
        ]
        budget = 100.0
        result = generate_procurement_plan(items, budget)

        assert result["total_cost"] <= budget
        assert result["remaining_budget"] >= 0
        assert result["total_cost"] + result["remaining_budget"] == pytest.approx(budget, abs=0.01)

    def test_critical_items_prioritized(self):
        """Critical items should appear before standard items in the plan."""
        items = [
            {
                "medication_id": "std-1",
                "name": "Vitamin C",
                "current_stock": 5,
                "average_daily_usage": 3.0,
                "unit_cost": 1.0,
                "criticality": "standard",
            },
            {
                "medication_id": "crit-1",
                "name": "Insulin",
                "current_stock": 2,
                "average_daily_usage": 5.0,
                "unit_cost": 10.0,
                "criticality": "critical",
            },
        ]
        result = generate_procurement_plan(items, budget=5000.0)
        if len(result["plan"]) >= 2:
            # Critical item should come first
            assert result["plan"][0]["medication_id"] == "crit-1"

    def test_empty_items(self):
        """Empty item list returns empty plan."""
        result = generate_procurement_plan([], budget=1000.0)
        assert result["plan"] == []
        assert result["total_cost"] == 0.0
        assert result["remaining_budget"] == 1000.0

    def test_partial_allocation(self):
        """When budget is tight, items should get partial quantities."""
        items = [
            {
                "medication_id": "med-1",
                "name": "Expensive Drug",
                "current_stock": 0,
                "average_daily_usage": 10.0,
                "unit_cost": 50.0,
                "criticality": "critical",
            },
        ]
        # Need 300 units * $50 = $15000 but budget is only $1000
        budget = 1000.0
        result = generate_procurement_plan(items, budget)

        assert result["total_cost"] <= budget
        # Should have funded some quantity
        if result["plan"]:
            assert result["plan"][0]["order_quantity"] > 0
        # Should have unfunded remainder
        assert len(result["items_not_funded"]) > 0

    def test_plan_entries_have_required_fields(self):
        """Each plan entry must have all required fields."""
        items = [
            {
                "medication_id": "med-1",
                "name": "Paracetamol",
                "current_stock": 20,
                "average_daily_usage": 5.0,
                "unit_cost": 0.5,
                "criticality": "essential",
            },
        ]
        result = generate_procurement_plan(items, budget=500.0)
        for entry in result["plan"]:
            assert "medication_id" in entry
            assert "name" in entry
            assert "order_quantity" in entry
            assert "total_cost" in entry
            assert "days_of_stock" in entry
            assert "priority" in entry
