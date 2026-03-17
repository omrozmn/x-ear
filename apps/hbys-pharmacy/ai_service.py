"""
AI-Powered Stock Consumption Forecasting Service
=================================================
Provides drug consumption forecasting, reorder point calculation,
expiry optimization, anomaly detection, and procurement planning
using Prophet (CPU-only) and scikit-learn.
"""
from datetime import datetime, date, timedelta
from typing import Optional
import logging

import numpy as np
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)

# Suppress Prophet's verbose logging
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)


# ---------------------------------------------------------------------------
# 1. Consumption Forecast
# ---------------------------------------------------------------------------

def forecast_consumption(
    history: list[dict],
    periods: int = 30,
) -> dict:
    """
    Forecast future drug consumption using Prophet.

    Args:
        history: list of {"date": "YYYY-MM-DD", "quantity_used": int}
        periods: number of days to forecast (default 30)

    Returns:
        {
            "forecast": [{"date", "predicted", "lower", "upper"}, ...],
            "total_predicted_consumption": float,
            "average_daily_consumption": float,
            "model_metrics": {"mape": float}
        }
    """
    if len(history) < 14:
        raise ValueError(
            "At least 14 days of history are required for a reliable forecast."
        )

    df = pd.DataFrame(history)
    df["ds"] = pd.to_datetime(df["date"])
    df["y"] = df["quantity_used"].astype(float)
    df = df[["ds", "y"]].sort_values("ds").reset_index(drop=True)

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=len(df) >= 365,
        changepoint_prior_scale=0.05,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=periods)
    prediction = model.predict(future)

    # Only keep the forecast portion (beyond historical data)
    forecast_df = prediction.tail(periods)

    forecast_rows = []
    for _, row in forecast_df.iterrows():
        predicted = max(0.0, float(row["yhat"]))
        lower = max(0.0, float(row["yhat_lower"]))
        upper = max(0.0, float(row["yhat_upper"]))
        forecast_rows.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "predicted": round(predicted, 2),
            "lower": round(lower, 2),
            "upper": round(upper, 2),
        })

    total_predicted = sum(r["predicted"] for r in forecast_rows)
    avg_daily = total_predicted / periods if periods > 0 else 0.0

    # Simple MAPE on in-sample fit
    in_sample = prediction.head(len(df))
    actuals = df["y"].values
    predicted_vals = in_sample["yhat"].values
    mask = actuals > 0
    if mask.sum() > 0:
        mape = float(np.mean(np.abs((actuals[mask] - predicted_vals[mask]) / actuals[mask])) * 100)
    else:
        mape = 0.0

    return {
        "forecast": forecast_rows,
        "total_predicted_consumption": round(total_predicted, 2),
        "average_daily_consumption": round(avg_daily, 2),
        "model_metrics": {"mape": round(mape, 2)},
    }


# ---------------------------------------------------------------------------
# 2. Reorder Point Calculation
# ---------------------------------------------------------------------------

def calculate_reorder_point(
    history: list[dict],
    lead_time_days: int = 7,
    safety_stock_days: int = 3,
    current_stock: Optional[int] = None,
) -> dict:
    """
    Calculate reorder point and quantity based on historical consumption.

    Args:
        history: list of {"date": "YYYY-MM-DD", "quantity_used": int}
        lead_time_days: supplier lead time in days
        safety_stock_days: extra buffer days
        current_stock: current quantity on hand (optional)

    Returns:
        {
            "average_daily_usage": float,
            "reorder_point": int,
            "safety_stock": int,
            "reorder_quantity": int,
            "days_until_stockout": float | None,
        }
    """
    if len(history) < 7:
        raise ValueError("At least 7 days of history are required.")

    df = pd.DataFrame(history)
    df["quantity_used"] = df["quantity_used"].astype(float)

    avg_daily = float(df["quantity_used"].mean())
    std_daily = float(df["quantity_used"].std()) if len(df) > 1 else 0.0

    safety_stock = int(np.ceil(safety_stock_days * avg_daily))
    reorder_point = int(np.ceil(lead_time_days * avg_daily + safety_stock))

    # Economic reorder quantity (simplified: cover 30 days + safety)
    reorder_quantity = int(np.ceil(30 * avg_daily + safety_stock))

    days_until_stockout = None
    if current_stock is not None and avg_daily > 0:
        days_until_stockout = round(current_stock / avg_daily, 1)

    return {
        "average_daily_usage": round(avg_daily, 2),
        "reorder_point": reorder_point,
        "safety_stock": safety_stock,
        "reorder_quantity": reorder_quantity,
        "days_until_stockout": days_until_stockout,
    }


# ---------------------------------------------------------------------------
# 3. Expiry Rotation Optimization (FEFO)
# ---------------------------------------------------------------------------

def optimize_expiry_rotation(stock_items: list[dict]) -> list[dict]:
    """
    Prioritize stock items by expiry risk using FEFO (First Expiry First Out).

    Args:
        stock_items: list of {
            "item_id": str,
            "medication_id": str,
            "lot_number": str,
            "quantity_on_hand": int,
            "expiry_date": "YYYY-MM-DD",
            "unit_cost": float  (optional)
        }

    Returns:
        list of items sorted by priority with added fields:
            "days_until_expiry", "risk_level", "priority_score",
            "recommendation"
    """
    if not stock_items:
        return []

    today = date.today()
    results = []

    for item in stock_items:
        exp = item["expiry_date"]
        if isinstance(exp, str):
            exp = datetime.strptime(exp, "%Y-%m-%d").date()

        days_left = (exp - today).days
        quantity = item.get("quantity_on_hand", 0)
        unit_cost = item.get("unit_cost", 0.0)

        # Risk classification
        if days_left <= 0:
            risk_level = "expired"
            priority_score = 100
            recommendation = "Remove from inventory immediately. Consider destruction or return to supplier."
        elif days_left <= 7:
            risk_level = "critical"
            priority_score = 90
            recommendation = "Use immediately or transfer to high-consumption unit."
        elif days_left <= 30:
            risk_level = "high"
            priority_score = 70
            recommendation = "Prioritize for dispensing. Consider discounted distribution."
        elif days_left <= 90:
            risk_level = "medium"
            priority_score = 40
            recommendation = "Monitor closely. Ensure FEFO compliance."
        else:
            risk_level = "low"
            priority_score = 10
            recommendation = "Normal rotation."

        # Adjust priority by financial exposure
        financial_exposure = quantity * unit_cost
        if financial_exposure > 1000 and days_left <= 30:
            priority_score = min(100, priority_score + 10)

        results.append({
            **item,
            "expiry_date": exp.isoformat() if isinstance(exp, date) else exp,
            "days_until_expiry": days_left,
            "risk_level": risk_level,
            "priority_score": priority_score,
            "financial_exposure": round(financial_exposure, 2),
            "recommendation": recommendation,
        })

    # Sort by priority_score descending, then days_until_expiry ascending
    results.sort(key=lambda x: (-x["priority_score"], x["days_until_expiry"]))
    return results


# ---------------------------------------------------------------------------
# 4. Consumption Anomaly Detection
# ---------------------------------------------------------------------------

def detect_consumption_anomaly(history: list[dict]) -> dict:
    """
    Detect unusual consumption patterns (theft, waste, seasonal spike).

    Uses z-score based detection with rolling statistics.

    Args:
        history: list of {"date": "YYYY-MM-DD", "quantity_used": int}

    Returns:
        {
            "has_anomalies": bool,
            "anomalies": [{"date", "quantity_used", "expected", "z_score", "type"}, ...],
            "statistics": {"mean", "std", "median", "min", "max"},
        }
    """
    if len(history) < 14:
        raise ValueError("At least 14 days of history are required for anomaly detection.")

    df = pd.DataFrame(history)
    df["ds"] = pd.to_datetime(df["date"])
    df["y"] = df["quantity_used"].astype(float)
    df = df.sort_values("ds").reset_index(drop=True)

    mean_val = float(df["y"].mean())
    std_val = float(df["y"].std())
    median_val = float(df["y"].median())

    anomalies = []

    if std_val > 0:
        z_threshold = 2.5
        for _, row in df.iterrows():
            z_score = (row["y"] - mean_val) / std_val
            if abs(z_score) >= z_threshold:
                if z_score > 0:
                    anomaly_type = "spike"
                else:
                    anomaly_type = "drop"
                anomalies.append({
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "quantity_used": int(row["y"]),
                    "expected": round(mean_val, 2),
                    "z_score": round(float(z_score), 2),
                    "type": anomaly_type,
                })

    return {
        "has_anomalies": len(anomalies) > 0,
        "anomalies": anomalies,
        "statistics": {
            "mean": round(mean_val, 2),
            "std": round(std_val, 2),
            "median": round(median_val, 2),
            "min": int(df["y"].min()),
            "max": int(df["y"].max()),
        },
    }


# ---------------------------------------------------------------------------
# 5. Procurement Plan Generation
# ---------------------------------------------------------------------------

def generate_procurement_plan(
    items: list[dict],
    budget: float,
) -> dict:
    """
    Generate AI-assisted procurement plan within budget constraints.

    Uses a priority-based greedy allocation strategy.

    Args:
        items: list of {
            "medication_id": str,
            "name": str,
            "current_stock": int,
            "average_daily_usage": float,
            "unit_cost": float,
            "lead_time_days": int,        (optional, default 7)
            "criticality": str,           (optional: "critical" | "essential" | "standard")
        }
        budget: total procurement budget

    Returns:
        {
            "plan": [{"medication_id", "name", "order_quantity", "total_cost",
                       "days_of_stock", "priority"}, ...],
            "total_cost": float,
            "remaining_budget": float,
            "items_not_funded": [...]
        }
    """
    if not items:
        return {
            "plan": [],
            "total_cost": 0.0,
            "remaining_budget": budget,
            "items_not_funded": [],
        }

    # Calculate priority for each item
    scored_items = []
    for item in items:
        avg_usage = item.get("average_daily_usage", 0)
        current = item.get("current_stock", 0)
        unit_cost = item.get("unit_cost", 0)
        lead_time = item.get("lead_time_days", 7)
        criticality = item.get("criticality", "standard")

        # Days of stock remaining
        days_remaining = current / avg_usage if avg_usage > 0 else 999

        # Criticality multiplier
        crit_multiplier = {"critical": 3.0, "essential": 2.0, "standard": 1.0}.get(
            criticality, 1.0
        )

        # Urgency score: higher when stock is low relative to lead time
        if days_remaining <= lead_time:
            urgency = 100 * crit_multiplier
        elif days_remaining <= lead_time * 2:
            urgency = 70 * crit_multiplier
        elif days_remaining <= 30:
            urgency = 40 * crit_multiplier
        else:
            urgency = 10 * crit_multiplier

        # Target: 30 days of stock after delivery
        target_quantity = max(0, int(np.ceil(30 * avg_usage - current)))
        total_cost = target_quantity * unit_cost

        scored_items.append({
            **item,
            "urgency": urgency,
            "target_quantity": target_quantity,
            "target_cost": round(total_cost, 2),
            "days_remaining": round(days_remaining, 1),
        })

    # Sort by urgency descending
    scored_items.sort(key=lambda x: -x["urgency"])

    plan = []
    remaining = budget
    not_funded = []

    for si in scored_items:
        cost = si["target_cost"]
        qty = si["target_quantity"]

        if qty <= 0:
            continue

        if cost <= remaining:
            plan.append({
                "medication_id": si["medication_id"],
                "name": si.get("name", si["medication_id"]),
                "order_quantity": qty,
                "total_cost": cost,
                "days_of_stock": round(qty / si.get("average_daily_usage", 1), 1),
                "priority": "high" if si["urgency"] >= 60 else "medium" if si["urgency"] >= 30 else "low",
            })
            remaining -= cost
        else:
            # Partial allocation: buy what we can afford
            affordable_qty = int(remaining // si.get("unit_cost", 1)) if si.get("unit_cost", 0) > 0 else 0
            if affordable_qty > 0:
                partial_cost = round(affordable_qty * si.get("unit_cost", 0), 2)
                plan.append({
                    "medication_id": si["medication_id"],
                    "name": si.get("name", si["medication_id"]),
                    "order_quantity": affordable_qty,
                    "total_cost": partial_cost,
                    "days_of_stock": round(affordable_qty / si.get("average_daily_usage", 1), 1),
                    "priority": "high" if si["urgency"] >= 60 else "medium" if si["urgency"] >= 30 else "low",
                })
                remaining -= partial_cost

            unfunded_qty = qty - (affordable_qty if affordable_qty > 0 else 0)
            if unfunded_qty > 0:
                not_funded.append({
                    "medication_id": si["medication_id"],
                    "name": si.get("name", si["medication_id"]),
                    "needed_quantity": unfunded_qty,
                    "estimated_cost": round(unfunded_qty * si.get("unit_cost", 0), 2),
                })

    total_spent = budget - remaining
    return {
        "plan": plan,
        "total_cost": round(total_spent, 2),
        "remaining_budget": round(remaining, 2),
        "items_not_funded": not_funded,
    }
