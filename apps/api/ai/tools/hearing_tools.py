"""
AI Tools for Hearing Tests, Profiles, and Device Recommendations.

The killer feature: match audiogram results to suitable devices in inventory.
"""

import logging
from typing import Any, Dict

from core.database import SessionLocal
from ai.tools import (
    ToolParameter, ToolCategory, RiskLevel,
    ToolExecutionMode, ToolExecutionResult, register_tool,
)

logger = logging.getLogger(__name__)


@register_tool(
    tool_id="getHearingTests",
    name="Get Hearing Tests",
    description="List hearing tests (audiograms) for a patient",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="party_id", type="string", description="Patient ID", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
    ],
    returns="Hearing test history with audiogram data",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def getHearingTests(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get hearing tests for a patient."""
    party_id = params["party_id"]
    tenant_id = params["tenant_id"]
    try:
        db = SessionLocal()
        from core.models.medical import HearingTest
        tests = db.query(HearingTest).filter(
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == tenant_id,
        ).order_by(HearingTest.test_date.desc()).limit(10).all()
        db.close()

        return ToolExecutionResult(
            tool_id="getHearingTests", success=True, mode=mode,
            result={
                "party_id": party_id,
                "tests": [t.to_dict() for t in tests],
                "total": len(tests),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="getHearingTests", success=False, mode=mode, error=str(e))


@register_tool(
    tool_id="getHearingProfile",
    name="Get Hearing Profile",
    description="Get patient's hearing profile including SGK coverage info",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="party_id", type="string", description="Patient ID", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
    ],
    returns="Hearing profile with SGK info",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def getHearingProfile(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get hearing profile for a patient."""
    party_id = params["party_id"]
    tenant_id = params["tenant_id"]
    try:
        db = SessionLocal()
        from core.models.hearing_profile import HearingProfile
        profile = db.query(HearingProfile).filter(
            HearingProfile.party_id == party_id,
            HearingProfile.tenant_id == tenant_id,
        ).first()
        db.close()

        if not profile:
            return ToolExecutionResult(
                tool_id="getHearingProfile", success=True, mode=mode,
                result={"party_id": party_id, "profile": None, "message": "No hearing profile found"},
            )
        return ToolExecutionResult(
            tool_id="getHearingProfile", success=True, mode=mode,
            result={"party_id": party_id, "profile": profile.to_dict()},
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="getHearingProfile", success=False, mode=mode, error=str(e))


@register_tool(
    tool_id="getDeviceRecommendations",
    name="Get Device Recommendations",
    description="Recommend suitable hearing devices based on patient's latest audiogram and inventory availability",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="party_id", type="string", description="Patient ID", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
    ],
    returns="Recommended devices with reasoning",
    requires_approval=False,
    requires_permissions=["parties.view", "devices.view"],
)
def getDeviceRecommendations(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """
    Recommend hearing devices based on audiogram severity and inventory.

    Logic:
    1. Get latest hearing test → determine severity (mild/moderate/severe/profound)
    2. Get hearing profile → check SGK eligibility
    3. Query inventory → find matching in-stock devices
    4. Rank by suitability + price + SGK coverage
    """
    party_id = params["party_id"]
    tenant_id = params["tenant_id"]

    try:
        db = SessionLocal()
        from core.models.medical import HearingTest
        from core.models.hearing_profile import HearingProfile
        from models.inventory import InventoryItem

        # 1. Get latest hearing test
        latest_test = db.query(HearingTest).filter(
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == tenant_id,
        ).order_by(HearingTest.test_date.desc()).first()

        if not latest_test:
            db.close()
            return ToolExecutionResult(
                tool_id="getDeviceRecommendations", success=True, mode=mode,
                result={"party_id": party_id, "recommendations": [], "message": "No hearing test found. Please conduct an audiometry test first."},
            )

        # Parse audiogram results
        results = latest_test.results_json or {}
        left_ear = results.get("leftEar", {})
        right_ear = results.get("rightEar", {})

        # Calculate average hearing loss (PTA - Pure Tone Average at 500, 1000, 2000, 4000 Hz)
        def calc_pta(ear_data):
            freqs = [500, 1000, 2000, 4000]
            thresholds = []
            for f in freqs:
                val = ear_data.get(str(f)) or ear_data.get(f)
                if val is not None:
                    thresholds.append(float(val))
            return sum(thresholds) / len(thresholds) if thresholds else None

        left_pta = calc_pta(left_ear)
        right_pta = calc_pta(right_ear)
        worse_pta = max(left_pta or 0, right_pta or 0)

        # Classify severity
        if worse_pta <= 25:
            severity = "normal"
            device_types = []
        elif worse_pta <= 40:
            severity = "mild"
            device_types = ["RIC", "BTE", "ITE"]
        elif worse_pta <= 55:
            severity = "moderate"
            device_types = ["RIC", "BTE"]
        elif worse_pta <= 70:
            severity = "moderately_severe"
            device_types = ["BTE", "RIC"]
        elif worse_pta <= 90:
            severity = "severe"
            device_types = ["BTE", "SUPER_POWER"]
        else:
            severity = "profound"
            device_types = ["BTE", "SUPER_POWER", "COCHLEAR"]

        # 2. Check SGK eligibility
        profile = db.query(HearingProfile).filter(
            HearingProfile.party_id == party_id,
            HearingProfile.tenant_id == tenant_id,
        ).first()
        sgk_eligible = False
        if profile:
            sgk_info = profile.sgk_info_json or {}
            sgk_eligible = bool(sgk_info.get("eligible") or sgk_info.get("is_eligible"))

        # 3. Query matching inventory
        available = db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.category == "hearing_aid",
            InventoryItem.available_inventory > 0,
        ).all()
        db.close()

        # 4. Rank devices
        recommendations = []
        for item in available:
            device_type = (item.device_type or "").upper() if hasattr(item, 'device_type') else ""
            score = 0.5  # base score

            # Type match
            if device_type in device_types:
                score += 0.3
            # In stock bonus
            if (item.available_inventory or 0) > 2:
                score += 0.1
            # SGK coverage bonus
            if sgk_eligible and hasattr(item, 'sgk_eligible') and item.sgk_eligible:
                score += 0.1

            recommendations.append({
                "inventoryId": item.id,
                "name": f"{item.brand or ''} {item.model or ''}".strip(),
                "brand": item.brand,
                "model": item.model,
                "type": device_type,
                "stock": item.available_inventory or 0,
                "price": float(item.sale_price or item.list_price or 0) if hasattr(item, 'sale_price') else 0,
                "sgkCoverage": sgk_eligible,
                "score": round(score, 2),
            })

        # Sort by score descending
        recommendations.sort(key=lambda x: x["score"], reverse=True)

        bilateral = left_pta and right_pta and left_pta > 25 and right_pta > 25

        return ToolExecutionResult(
            tool_id="getDeviceRecommendations", success=True, mode=mode,
            result={
                "party_id": party_id,
                "severity": severity,
                "leftPTA": round(left_pta, 1) if left_pta else None,
                "rightPTA": round(right_pta, 1) if right_pta else None,
                "bilateral": bilateral,
                "sgkEligible": sgk_eligible,
                "recommendations": recommendations[:5],
                "total_matching": len(recommendations),
            },
        )
    except Exception as e:
        logger.error(f"Device recommendation failed: {e}")
        return ToolExecutionResult(tool_id="getDeviceRecommendations", success=False, mode=mode, error=str(e))
