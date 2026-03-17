"""
AI-powered Lab Result Trend Analysis Service

Provides:
- Time-series forecasting of lab values using Prophet
- Anomaly detection via Z-score and IQR methods
- Comprehensive patient lab analysis (trend direction, rate of change, threshold prediction)
- Population comparison with percentile ranking
"""

from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats


# ─── Reference Ranges & Population Norms ────────────────────────────────────

REFERENCE_RANGES: dict[str, dict] = {
    "glucose": {
        "unit": "mg/dL",
        "normal_low": 70.0,
        "normal_high": 100.0,
        "critical_low": 50.0,
        "critical_high": 400.0,
        "population_mean": 92.0,
        "population_std": 12.0,
    },
    "hba1c": {
        "unit": "%",
        "normal_low": 4.0,
        "normal_high": 5.6,
        "critical_low": 3.0,
        "critical_high": 15.0,
        "population_mean": 5.2,
        "population_std": 0.5,
    },
    "creatinine": {
        "unit": "mg/dL",
        "normal_low": 0.6,
        "normal_high": 1.2,
        "critical_low": 0.3,
        "critical_high": 10.0,
        "population_mean": 0.9,
        "population_std": 0.2,
    },
    "tsh": {
        "unit": "mIU/L",
        "normal_low": 0.4,
        "normal_high": 4.0,
        "critical_low": 0.01,
        "critical_high": 100.0,
        "population_mean": 2.0,
        "population_std": 1.0,
    },
    "alt": {
        "unit": "U/L",
        "normal_low": 7.0,
        "normal_high": 56.0,
        "critical_low": 0.0,
        "critical_high": 1000.0,
        "population_mean": 25.0,
        "population_std": 12.0,
    },
    "ast": {
        "unit": "U/L",
        "normal_low": 10.0,
        "normal_high": 40.0,
        "critical_low": 0.0,
        "critical_high": 1000.0,
        "population_mean": 22.0,
        "population_std": 8.0,
    },
    "hemoglobin": {
        "unit": "g/dL",
        "normal_low": 12.0,
        "normal_high": 17.5,
        "critical_low": 7.0,
        "critical_high": 20.0,
        "population_mean": 14.5,
        "population_std": 1.5,
    },
    "wbc": {
        "unit": "x10^3/uL",
        "normal_low": 4.5,
        "normal_high": 11.0,
        "critical_low": 2.0,
        "critical_high": 30.0,
        "population_mean": 7.0,
        "population_std": 2.0,
    },
    "platelet": {
        "unit": "x10^3/uL",
        "normal_low": 150.0,
        "normal_high": 400.0,
        "critical_low": 50.0,
        "critical_high": 1000.0,
        "population_mean": 250.0,
        "population_std": 60.0,
    },
    "cholesterol_total": {
        "unit": "mg/dL",
        "normal_low": 0.0,
        "normal_high": 200.0,
        "critical_low": 0.0,
        "critical_high": 500.0,
        "population_mean": 195.0,
        "population_std": 35.0,
    },
    "ldl": {
        "unit": "mg/dL",
        "normal_low": 0.0,
        "normal_high": 100.0,
        "critical_low": 0.0,
        "critical_high": 300.0,
        "population_mean": 110.0,
        "population_std": 30.0,
    },
    "hdl": {
        "unit": "mg/dL",
        "normal_low": 40.0,
        "normal_high": 60.0,
        "critical_low": 20.0,
        "critical_high": 100.0,
        "population_mean": 55.0,
        "population_std": 12.0,
    },
    "potassium": {
        "unit": "mEq/L",
        "normal_low": 3.5,
        "normal_high": 5.0,
        "critical_low": 2.5,
        "critical_high": 6.5,
        "population_mean": 4.2,
        "population_std": 0.4,
    },
    "sodium": {
        "unit": "mEq/L",
        "normal_low": 136.0,
        "normal_high": 145.0,
        "critical_low": 120.0,
        "critical_high": 160.0,
        "population_mean": 140.0,
        "population_std": 2.5,
    },
}

# Gender/age adjustments to population mean (additive) and std (multiplicative)
POPULATION_ADJUSTMENTS: dict[str, dict] = {
    "hemoglobin": {
        "male": {"mean_adj": 1.0, "std_mult": 1.0},
        "female": {"mean_adj": -2.0, "std_mult": 1.0},
    },
    "creatinine": {
        "male": {"mean_adj": 0.1, "std_mult": 1.0},
        "female": {"mean_adj": -0.1, "std_mult": 1.0},
    },
}


# ─── Utility helpers ────────────────────────────────────────────────────────

def _prepare_dataframe(results: list[dict]) -> pd.DataFrame:
    """Convert list of {date, value} dicts to a sorted DataFrame."""
    df = pd.DataFrame(results)
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["value"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def _linear_regression(df: pd.DataFrame) -> tuple[float, float]:
    """Return slope and intercept from OLS on day-index vs value."""
    x = (df["date"] - df["date"].iloc[0]).dt.total_seconds() / 86400.0
    slope, intercept, _, _, _ = stats.linregress(x.values, df["value"].values)
    return slope, intercept


# ─── Predict Lab Trend ──────────────────────────────────────────────────────

def predict_lab_trend(results: list[dict], periods: int = 30) -> dict:
    """
    Predict future lab values from historical results.

    Attempts to use Prophet for time-series forecasting; falls back to linear
    regression + Gaussian noise when Prophet is not available or the dataset
    is too small for it.

    Parameters
    ----------
    results : list[dict]
        Each dict must have ``date`` (ISO string or datetime) and ``value`` (numeric).
    periods : int
        Number of days to forecast into the future.

    Returns
    -------
    dict with keys:
        forecast    - list of {date, predicted, lower, upper}
        model_used  - "prophet" | "linear_regression"
        data_points - number of input observations
    """
    if len(results) < 3:
        return {
            "forecast": [],
            "model_used": "insufficient_data",
            "data_points": len(results),
            "error": "At least 3 data points are required for trend prediction.",
        }

    df = _prepare_dataframe(results)

    # --- Try Prophet first ---------------------------------------------------
    prophet_used = False
    try:
        from prophet import Prophet  # type: ignore

        prophet_df = df.rename(columns={"date": "ds", "value": "y"})[["ds", "y"]]
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=False,
            yearly_seasonality=True if len(df) >= 365 else False,
        )
        model.fit(prophet_df)
        future = model.make_future_dataframe(periods=periods)
        pred = model.predict(future)

        # Only keep forecast rows beyond last historical date
        last_date = df["date"].max()
        forecast_rows = pred[pred["ds"] > last_date]

        forecast = [
            {
                "date": row["ds"].isoformat(),
                "predicted": round(row["yhat"], 4),
                "lower": round(row["yhat_lower"], 4),
                "upper": round(row["yhat_upper"], 4),
            }
            for _, row in forecast_rows.iterrows()
        ]
        prophet_used = True
    except Exception:
        forecast = None

    # --- Fallback: linear regression -----------------------------------------
    if not prophet_used or forecast is None:
        slope, intercept = _linear_regression(df)
        residuals = df["value"].values - (
            intercept
            + slope
            * (df["date"] - df["date"].iloc[0]).dt.total_seconds().values / 86400.0
        )
        std_resid = float(np.std(residuals)) if len(residuals) > 1 else 1.0
        last_date = df["date"].max()
        base_day = (last_date - df["date"].iloc[0]).total_seconds() / 86400.0

        forecast = []
        for d in range(1, periods + 1):
            day = base_day + d
            predicted = intercept + slope * day
            forecast.append(
                {
                    "date": (last_date + timedelta(days=d)).isoformat(),
                    "predicted": round(predicted, 4),
                    "lower": round(predicted - 1.96 * std_resid, 4),
                    "upper": round(predicted + 1.96 * std_resid, 4),
                }
            )

    return {
        "forecast": forecast,
        "model_used": "prophet" if prophet_used else "linear_regression",
        "data_points": len(df),
    }


# ─── Anomaly Detection ─────────────────────────────────────────────────────

def detect_anomalies(
    results: list[dict],
    method: str = "zscore",
    threshold: float | None = None,
) -> list[dict]:
    """
    Detect anomalous lab results.

    Parameters
    ----------
    results : list[dict]
        Each dict must contain ``date`` and ``value``.
    method : str
        ``"zscore"`` (default) or ``"iqr"``.
    threshold : float | None
        For zscore: number of standard deviations (default 2.5).
        For IQR: multiplier of IQR (default 1.5).

    Returns
    -------
    list[dict] - each anomalous point with date, value, score, and is_anomaly=True.
    """
    if len(results) < 3:
        return []

    df = _prepare_dataframe(results)
    values = df["value"].values
    anomalies: list[dict] = []

    if method == "zscore":
        z_thresh = threshold if threshold is not None else 2.5
        mean = float(np.mean(values))
        std = float(np.std(values, ddof=1)) if len(values) > 1 else 1.0
        if std == 0:
            return []

        for _, row in df.iterrows():
            z = (row["value"] - mean) / std
            if abs(z) > z_thresh:
                anomalies.append(
                    {
                        "date": row["date"].isoformat(),
                        "value": row["value"],
                        "z_score": round(z, 4),
                        "is_anomaly": True,
                    }
                )
    elif method == "iqr":
        iqr_mult = threshold if threshold is not None else 1.5
        q1 = float(np.percentile(values, 25))
        q3 = float(np.percentile(values, 75))
        iqr = q3 - q1
        lower = q1 - iqr_mult * iqr
        upper = q3 + iqr_mult * iqr

        for _, row in df.iterrows():
            if row["value"] < lower or row["value"] > upper:
                anomalies.append(
                    {
                        "date": row["date"].isoformat(),
                        "value": row["value"],
                        "iqr_lower": round(lower, 4),
                        "iqr_upper": round(upper, 4),
                        "is_anomaly": True,
                    }
                )
    else:
        raise ValueError(f"Unknown anomaly detection method: {method}")

    return anomalies


# ─── Comprehensive Patient Lab Analysis ────────────────────────────────────

def analyze_patient_labs(
    results: list[dict],
    test_code: str | None = None,
) -> dict:
    """
    Full analysis of a patient's historical lab results for a single test.

    Returns trend direction, rate of change, anomalies, and predicted time
    to a critical threshold (if trending toward one).

    Parameters
    ----------
    results : list[dict]
        Each dict must have ``date`` and ``value``.
    test_code : str | None
        Lowercase test identifier (e.g. ``"glucose"``). Used to look up
        reference ranges and critical thresholds.

    Returns
    -------
    dict with keys: trend_direction, slope_per_day, mean, std,
                    latest_value, anomalies, days_to_critical, forecast_summary
    """
    if len(results) < 3:
        return {
            "trend_direction": "insufficient_data",
            "data_points": len(results),
            "error": "At least 3 data points are required for analysis.",
        }

    df = _prepare_dataframe(results)
    values = df["value"].values
    slope, intercept = _linear_regression(df)

    # Trend classification using slope significance
    n = len(values)
    mean_val = float(np.mean(values))
    std_val = float(np.std(values, ddof=1)) if n > 1 else 0.0

    # Normalised slope: slope / mean per day -- if |normalised| < 0.001 => stable
    if mean_val != 0:
        normalised_slope = slope / abs(mean_val)
    else:
        normalised_slope = slope

    if abs(normalised_slope) < 0.001:
        trend_direction = "stable"
    elif slope > 0:
        trend_direction = "increasing"
    else:
        trend_direction = "decreasing"

    # Days to critical threshold
    days_to_critical: dict | None = None
    if test_code and test_code.lower() in REFERENCE_RANGES:
        ref = REFERENCE_RANGES[test_code.lower()]
        last_day = (df["date"].iloc[-1] - df["date"].iloc[0]).total_seconds() / 86400.0
        current_projected = intercept + slope * last_day

        if slope > 0 and ref.get("critical_high") is not None:
            crit = ref["critical_high"]
            if current_projected < crit:
                days_needed = (crit - current_projected) / slope
                days_to_critical = {
                    "threshold": crit,
                    "direction": "high",
                    "estimated_days": round(days_needed, 1),
                }
        elif slope < 0 and ref.get("critical_low") is not None:
            crit = ref["critical_low"]
            if current_projected > crit:
                days_needed = (current_projected - crit) / abs(slope)
                days_to_critical = {
                    "threshold": crit,
                    "direction": "low",
                    "estimated_days": round(days_needed, 1),
                }

    # Quick forecast (7 days)
    forecast_result = predict_lab_trend(results, periods=7)

    # Anomalies
    anomaly_list = detect_anomalies(results)

    return {
        "trend_direction": trend_direction,
        "slope_per_day": round(slope, 6),
        "mean": round(mean_val, 4),
        "std": round(std_val, 4),
        "latest_value": float(values[-1]),
        "data_points": n,
        "anomalies": anomaly_list,
        "days_to_critical": days_to_critical,
        "forecast_summary": {
            "model_used": forecast_result["model_used"],
            "next_7_days": forecast_result["forecast"][:7],
        },
    }


# ─── Population Comparison ─────────────────────────────────────────────────

def compare_with_population(
    value: float,
    test_code: str,
    age: int = 40,
    gender: str = "male",
) -> dict:
    """
    Compare a single lab value against population norms for the given test.

    Returns percentile ranking, z-score, and whether the value is within
    the normal reference range.

    Parameters
    ----------
    value : float
    test_code : str
        Lowercase key in REFERENCE_RANGES.
    age : int
    gender : str
        ``"male"`` or ``"female"``.

    Returns
    -------
    dict with percentile, z_score, is_normal, reference_range, etc.
    """
    key = test_code.lower()
    if key not in REFERENCE_RANGES:
        return {
            "error": f"Unknown test code: {test_code}",
            "known_tests": list(REFERENCE_RANGES.keys()),
        }

    ref = REFERENCE_RANGES[key]
    pop_mean = ref["population_mean"]
    pop_std = ref["population_std"]

    # Apply gender adjustments if available
    adj = POPULATION_ADJUSTMENTS.get(key, {}).get(gender.lower(), None)
    if adj:
        pop_mean += adj["mean_adj"]
        pop_std *= adj["std_mult"]

    # Simple age adjustment: slight increase in mean for age > 60 for metabolic markers
    if age > 60 and key in ("glucose", "cholesterol_total", "ldl", "creatinine"):
        pop_mean *= 1.05

    z_score = (value - pop_mean) / pop_std if pop_std > 0 else 0.0
    percentile = float(stats.norm.cdf(z_score) * 100)

    is_normal = ref["normal_low"] <= value <= ref["normal_high"]
    is_critical = value <= ref["critical_low"] or value >= ref["critical_high"]

    return {
        "value": value,
        "test_code": key,
        "unit": ref["unit"],
        "percentile": round(percentile, 2),
        "z_score": round(z_score, 4),
        "is_normal": is_normal,
        "is_critical": is_critical,
        "reference_range": {
            "low": ref["normal_low"],
            "high": ref["normal_high"],
        },
        "population_mean": round(pop_mean, 2),
        "population_std": round(pop_std, 2),
        "gender": gender,
        "age": age,
    }
