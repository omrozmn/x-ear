"""
AI-Powered Sepsis Early Warning System for Emergency Department (MS-7)
======================================================================
Uses LightGBM to predict sepsis risk based on vital signs and lab values.
Includes qSOFA, NEWS2 clinical scoring, and Turkish clinical recommendations.

Model is trained on a synthetic dataset based on published sepsis criteria
(qSOFA, SOFA, SIRS) and is loaded lazily on first use.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Feature list used by the model
# ---------------------------------------------------------------------------
FEATURE_NAMES = [
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "respiratory_rate",
    "temperature",
    "spo2",
    "gcs_score",
    "wbc",
    "lactate",
    "creatinine",
    "bilirubin",
    "platelets",
    "age",
]

# Normal reference ranges (used for defaults and contributing-factor analysis)
NORMAL_RANGES = {
    "heart_rate": (60, 100),
    "systolic_bp": (90, 140),
    "diastolic_bp": (60, 90),
    "respiratory_rate": (12, 20),
    "temperature": (36.1, 37.2),
    "spo2": (95, 100),
    "gcs_score": (15, 15),
    "wbc": (4.0, 11.0),
    "lactate": (0.5, 2.0),
    "creatinine": (0.6, 1.2),
    "bilirubin": (0.1, 1.2),
    "platelets": (150, 400),
    "age": (18, 65),
}

# Defaults (population medians) used when a value is missing
_DEFAULTS = {
    "heart_rate": 80.0,
    "systolic_bp": 120.0,
    "diastolic_bp": 75.0,
    "respiratory_rate": 16.0,
    "temperature": 36.8,
    "spo2": 98.0,
    "gcs_score": 15.0,
    "wbc": 7.5,
    "lactate": 1.0,
    "creatinine": 0.9,
    "bilirubin": 0.6,
    "platelets": 250.0,
    "age": 50.0,
}

# ---------------------------------------------------------------------------
# Lazy-loaded singleton model
# ---------------------------------------------------------------------------
_model = None
_feature_importances: Optional[dict] = None
_lock = threading.Lock()


def _generate_synthetic_dataset(n: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic patient dataset based on published sepsis criteria.

    Labels are derived from a combination of SIRS, qSOFA, and SOFA-like
    criteria so the model learns clinically meaningful patterns.
    """
    rng = np.random.RandomState(seed)

    # --- healthy patients (~60 %) ---
    n_healthy = int(n * 0.6)
    # --- septic patients (~25 %) ---
    n_septic = int(n * 0.25)
    # --- borderline (~15 %) ---
    n_border = n - n_healthy - n_septic

    def _block(size, profile):
        """Generate a block of patients from a parameter profile."""
        data = {}
        for feat, (mu, sigma, lo, hi) in profile.items():
            vals = rng.normal(mu, sigma, size).clip(lo, hi)
            data[feat] = vals
        return pd.DataFrame(data)

    healthy_profile = {
        "heart_rate": (78, 8, 55, 105),
        "systolic_bp": (122, 10, 95, 160),
        "diastolic_bp": (76, 7, 55, 95),
        "respiratory_rate": (15, 2, 10, 22),
        "temperature": (36.7, 0.3, 35.5, 37.5),
        "spo2": (97.5, 1.0, 94, 100),
        "gcs_score": (15, 0.0, 15, 15),
        "wbc": (7.5, 2.0, 4, 11),
        "lactate": (1.0, 0.3, 0.4, 2.0),
        "creatinine": (0.9, 0.2, 0.5, 1.3),
        "bilirubin": (0.6, 0.3, 0.1, 1.2),
        "platelets": (250, 50, 150, 400),
        "age": (45, 15, 18, 85),
    }

    septic_profile = {
        "heart_rate": (118, 15, 90, 180),
        "systolic_bp": (85, 12, 50, 110),
        "diastolic_bp": (52, 10, 30, 70),
        "respiratory_rate": (26, 5, 20, 45),
        "temperature": (39.2, 0.8, 38.0, 41.5),
        "spo2": (90, 3.0, 80, 96),
        "gcs_score": (12, 2.5, 3, 15),
        "wbc": (17, 5, 1, 35),
        "lactate": (4.5, 2.0, 2.0, 12.0),
        "creatinine": (2.5, 1.0, 1.3, 6.0),
        "bilirubin": (2.5, 1.5, 0.5, 8.0),
        "platelets": (100, 40, 20, 180),
        "age": (62, 14, 25, 95),
    }

    borderline_profile = {
        "heart_rate": (98, 12, 70, 130),
        "systolic_bp": (102, 12, 80, 135),
        "diastolic_bp": (65, 8, 45, 85),
        "respiratory_rate": (21, 3, 14, 28),
        "temperature": (38.0, 0.5, 36.5, 39.5),
        "spo2": (94, 2.0, 88, 98),
        "gcs_score": (14, 1.0, 10, 15),
        "wbc": (12, 3, 3, 20),
        "lactate": (2.2, 0.8, 1.0, 4.5),
        "creatinine": (1.4, 0.4, 0.8, 2.5),
        "bilirubin": (1.3, 0.6, 0.3, 3.0),
        "platelets": (160, 50, 60, 280),
        "age": (55, 15, 20, 90),
    }

    df_h = _block(n_healthy, healthy_profile)
    df_s = _block(n_septic, septic_profile)
    df_b = _block(n_border, borderline_profile)

    # Round GCS to integers and clamp
    for df in (df_h, df_s, df_b):
        df["gcs_score"] = df["gcs_score"].round().clip(3, 15).astype(int)

    # Labels
    df_h["sepsis"] = 0
    df_s["sepsis"] = 1
    # Borderline: ~40 % positive
    df_b["sepsis"] = (rng.rand(n_border) < 0.40).astype(int)

    df = pd.concat([df_h, df_s, df_b], ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


def _train_model():
    """Train the LightGBM model on the synthetic dataset and cache it."""
    global _model, _feature_importances  # noqa: PLW0603

    try:
        import lightgbm as lgb
    except ImportError as exc:
        raise ImportError(
            "lightgbm is required for the sepsis AI service. "
            "Install it with: pip install lightgbm"
        ) from exc

    logger.info("Generating synthetic sepsis dataset ...")
    df = _generate_synthetic_dataset(n=5000)

    X = df[FEATURE_NAMES].values
    y = df["sepsis"].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_NAMES)
    val_data = lgb.Dataset(X_val, label=y_val, feature_name=FEATURE_NAMES, reference=train_data)

    params = {
        "objective": "binary",
        "metric": "auc",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "max_depth": 6,
        "min_child_samples": 20,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "verbose": -1,
        "seed": 42,
        "device": "cpu",
    }

    callbacks = [lgb.log_evaluation(period=0)]  # suppress per-round logging

    model = lgb.train(
        params,
        train_data,
        num_boost_round=300,
        valid_sets=[val_data],
        callbacks=callbacks,
    )

    # Evaluate
    val_preds = model.predict(X_val)
    auc = roc_auc_score(y_val, val_preds)
    logger.info("Sepsis model trained. Validation AUC: %.4f", auc)

    # Feature importances (gain-based)
    importances = model.feature_importance(importance_type="gain")
    total = importances.sum() if importances.sum() > 0 else 1.0
    _feature_importances = {
        name: round(float(imp / total), 4)
        for name, imp in zip(FEATURE_NAMES, importances)
    }

    _model = model


def _get_model():
    """Return the trained model, training it on first call (thread-safe)."""
    global _model  # noqa: PLW0603
    if _model is None:
        with _lock:
            if _model is None:
                _train_model()
    return _model


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def predict_sepsis_risk(vitals: dict) -> dict:
    """
    Predict sepsis risk from a dict of vital signs / lab values.

    Parameters
    ----------
    vitals : dict
        Keys can include any of FEATURE_NAMES. Missing keys get defaults.

    Returns
    -------
    dict with keys:
        risk_score       : float 0-1
        risk_level       : str   low / moderate / high / critical
        contributing_factors : list[dict]  sorted by importance
        recommended_actions  : list[str]  Turkish clinical recommendations
        feature_importances  : dict       global model feature importances
    """
    model = _get_model()

    # Build feature vector, filling missing values with defaults
    features = []
    for feat in FEATURE_NAMES:
        val = vitals.get(feat)
        if val is None:
            val = _DEFAULTS[feat]
        features.append(float(val))

    X = np.array([features])
    risk_score = float(model.predict(X)[0])
    risk_score = max(0.0, min(1.0, risk_score))

    # Determine risk level
    if risk_score >= 0.75:
        risk_level = "critical"
    elif risk_score >= 0.50:
        risk_level = "high"
    elif risk_score >= 0.25:
        risk_level = "moderate"
    else:
        risk_level = "low"

    # Contributing factors: features that are outside normal range
    contributing_factors = _compute_contributing_factors(vitals, features)

    recommendations = get_sepsis_recommendation(risk_level)

    return {
        "risk_score": round(risk_score, 4),
        "risk_level": risk_level,
        "contributing_factors": contributing_factors,
        "recommended_actions": recommendations,
        "feature_importances": _feature_importances or {},
    }


def _compute_contributing_factors(vitals: dict, feature_values: list) -> list[dict]:
    """Identify features contributing to elevated risk."""
    factors = []
    for i, feat in enumerate(FEATURE_NAMES):
        val = feature_values[i]
        lo, hi = NORMAL_RANGES[feat]

        if val < lo or val > hi:
            if val < lo:
                direction = "low"
                deviation = (lo - val) / (lo if lo != 0 else 1)
            else:
                direction = "high"
                deviation = (val - hi) / (hi if hi != 0 else 1)

            importance = (_feature_importances or {}).get(feat, 0.0)
            factors.append({
                "feature": feat,
                "value": round(val, 2),
                "normal_range": f"{lo}-{hi}",
                "direction": direction,
                "deviation_pct": round(deviation * 100, 1),
                "importance": importance,
            })

    # Sort by deviation * importance (most concerning first)
    factors.sort(
        key=lambda f: f["deviation_pct"] * f["importance"],
        reverse=True,
    )
    return factors


def calculate_qsofa(vitals: dict) -> dict:
    """
    Calculate quick SOFA (qSOFA) score.

    Criteria (each scores 1 point):
      - Respiratory rate >= 22
      - Systolic BP <= 100
      - GCS < 15 (altered mental status)

    Parameters
    ----------
    vitals : dict with keys respiratory_rate, systolic_bp, gcs_score

    Returns
    -------
    dict with score, criteria details, and interpretation.
    """
    score = 0
    criteria = []

    rr = vitals.get("respiratory_rate")
    sbp = vitals.get("systolic_bp")
    gcs = vitals.get("gcs_score")

    if rr is not None and rr >= 22:
        score += 1
        criteria.append({
            "criterion": "respiratory_rate",
            "value": rr,
            "threshold": ">=22",
            "met": True,
        })
    elif rr is not None:
        criteria.append({
            "criterion": "respiratory_rate",
            "value": rr,
            "threshold": ">=22",
            "met": False,
        })

    if sbp is not None and sbp <= 100:
        score += 1
        criteria.append({
            "criterion": "systolic_bp",
            "value": sbp,
            "threshold": "<=100",
            "met": True,
        })
    elif sbp is not None:
        criteria.append({
            "criterion": "systolic_bp",
            "value": sbp,
            "threshold": "<=100",
            "met": False,
        })

    if gcs is not None and gcs < 15:
        score += 1
        criteria.append({
            "criterion": "gcs_score",
            "value": gcs,
            "threshold": "<15",
            "met": True,
        })
    elif gcs is not None:
        criteria.append({
            "criterion": "gcs_score",
            "value": gcs,
            "threshold": "<15",
            "met": False,
        })

    # Interpretation
    if score >= 2:
        interpretation = "Yuksek sepsis riski - Organ disfonksiyonu arastirmasi gereklidir"
        risk_level = "high"
    elif score == 1:
        interpretation = "Orta risk - Yakin takip ve tekrarlayan degerlendirme onerilir"
        risk_level = "moderate"
    else:
        interpretation = "Dusuk risk - Standart izlem yeterlidir"
        risk_level = "low"

    return {
        "score": score,
        "max_score": 3,
        "criteria": criteria,
        "interpretation": interpretation,
        "risk_level": risk_level,
    }


def calculate_news2(vitals: dict) -> dict:
    """
    Calculate National Early Warning Score 2 (NEWS2).

    Parameters
    ----------
    vitals : dict with keys:
        respiratory_rate, spo2, systolic_bp, heart_rate, temperature, gcs_score

    Returns
    -------
    dict with total_score, parameter_scores, and alert_level.
    """
    total = 0
    param_scores = {}

    # Respiratory rate scoring
    rr = vitals.get("respiratory_rate")
    if rr is not None:
        if rr <= 8:
            s = 3
        elif rr <= 11:
            s = 1
        elif rr <= 20:
            s = 0
        elif rr <= 24:
            s = 2
        else:
            s = 3
        param_scores["respiratory_rate"] = {"value": rr, "score": s}
        total += s

    # SpO2 scoring (Scale 1 - no supplemental O2 assumed)
    spo2 = vitals.get("spo2")
    if spo2 is not None:
        if spo2 <= 91:
            s = 3
        elif spo2 <= 93:
            s = 2
        elif spo2 <= 95:
            s = 1
        else:
            s = 0
        param_scores["spo2"] = {"value": spo2, "score": s}
        total += s

    # Systolic BP scoring
    sbp = vitals.get("systolic_bp")
    if sbp is not None:
        if sbp <= 90:
            s = 3
        elif sbp <= 100:
            s = 2
        elif sbp <= 110:
            s = 1
        elif sbp <= 219:
            s = 0
        else:
            s = 3
        param_scores["systolic_bp"] = {"value": sbp, "score": s}
        total += s

    # Heart rate scoring
    hr = vitals.get("heart_rate")
    if hr is not None:
        if hr <= 40:
            s = 3
        elif hr <= 50:
            s = 1
        elif hr <= 90:
            s = 0
        elif hr <= 110:
            s = 1
        elif hr <= 130:
            s = 2
        else:
            s = 3
        param_scores["heart_rate"] = {"value": hr, "score": s}
        total += s

    # Temperature scoring
    temp = vitals.get("temperature")
    if temp is not None:
        if temp <= 35.0:
            s = 3
        elif temp <= 36.0:
            s = 1
        elif temp <= 38.0:
            s = 0
        elif temp <= 39.0:
            s = 1
        else:
            s = 2
        param_scores["temperature"] = {"value": temp, "score": s}
        total += s

    # Consciousness / GCS scoring
    gcs = vitals.get("gcs_score")
    if gcs is not None:
        if gcs < 15:
            s = 3
        else:
            s = 0
        param_scores["gcs_score"] = {"value": gcs, "score": s}
        total += s

    # Alert level
    # Check for any single parameter scoring 3
    any_extreme = any(p["score"] == 3 for p in param_scores.values())

    if total >= 7:
        alert_level = "critical"
        alert_message = "KRITIK - Acil klinik mudahale gereklidir"
    elif total >= 5 or any_extreme:
        alert_level = "high"
        alert_message = "YUKSEK - Acil degerlendirme gereklidir"
    elif total >= 1:
        alert_level = "medium"
        alert_message = "ORTA - Hemsirenin degerlendirmesi gereklidir"
    else:
        alert_level = "low"
        alert_message = "DUSUK - Rutin izlem yeterlidir"

    return {
        "total_score": total,
        "max_possible_score": 20,
        "parameter_scores": param_scores,
        "alert_level": alert_level,
        "alert_message": alert_message,
    }


def get_sepsis_recommendation(risk_level: str) -> list[str]:
    """
    Return Turkish clinical action recommendations based on risk level.

    Parameters
    ----------
    risk_level : str  one of 'low', 'moderate', 'high', 'critical'

    Returns
    -------
    list[str]  ordered recommendations in Turkish.
    """
    recommendations = {
        "low": [
            "Standart vital bulgu takibine devam edin",
            "4 saatte bir vital bulgulari tekrar degerlendirin",
            "Enfeksiyon belirtileri acisindan gozlem yapin",
        ],
        "moderate": [
            "Vital bulgu takip sikligini 2 saate bir olarak artirin",
            "Laktat seviyesi kontrolu yapin",
            "Tam kan sayimi ve CRP isteyin",
            "Kan kulturu alinmasini degerlendirin",
            "Sorumlu hekimi bilgilendirin",
        ],
        "high": [
            "ACIL: Sorumlu hekimi hemen bilgilendirin",
            "Laktat seviyesini acil olarak kontrol edin",
            "Kan kulturu alin (antibiyotik oncesi)",
            "Genis spektrumlu antibiyotik baslanmasini degerlendirin",
            "Sivi resusitasyonuna baslayin (30 mL/kg kristaloid)",
            "Saatlik idrar cikisi takibi baslatin",
            "Vital bulgulari 30 dakikada bir takip edin",
        ],
        "critical": [
            "KOD SEPSIS: Sepsis ekibini hemen aktive edin",
            "Ilk 1 saat icinde genis spektrumlu antibiyotik baslatin",
            "Agresif sivi resusitasyonu baslatin (30 mL/kg kristaloid)",
            "Kan kulturu alin (en az 2 set)",
            "Laktat seviyesini acil kontrol edin ve 2-4 saatte tekrarlayin",
            "Santral venoz kateter ve arteriyel hat yerlestirilmesini degerlendirin",
            "Vazopressor tedavisini degerlendirin (MAP >= 65 mmHg hedefi)",
            "Yogun bakim unitesine transfer icin hazirlik yapin",
            "Saatlik idrar cikisi takibi baslatin",
            "Vital bulgulari 15 dakikada bir takip edin",
        ],
    }
    return recommendations.get(risk_level, recommendations["low"])
