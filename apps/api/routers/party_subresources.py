"""
FastAPI Patient Subresources Router - Migrated from Flask routes/patient_subresources.py
Handles patient devices, hearing tests, notes, ereceipts, and appointments
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import json
import uuid

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from core.models.system import Settings
from schemas.sales import DeviceAssignmentRead, SaleRead
from schemas.party_subresources import PartyNoteRead
from schemas.appointments import AppointmentRead
from middleware.unified_access import UnifiedAccess, require_access
from models.user import ActivityLog

logger = logging.getLogger(__name__)

router = APIRouter(tags=["PartySubresources"])

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# --- Schemas ---

class HearingTestCreate(BaseModel):
    testDate: str
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class HearingTestUpdate(BaseModel):
    testDate: Optional[str] = None
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class PatientNoteCreate(BaseModel):
    content: str
    type: str = "genel"
    category: str = "general"
    isPrivate: bool = False
    createdBy: str = "system"

class PatientNoteUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    noteType: Optional[str] = None
    category: Optional[str] = None
    isPrivate: Optional[bool] = None
    tags: Optional[List[str]] = None

class EReceiptCreate(BaseModel):
    sgkReportId: Optional[str] = None
    number: Optional[str] = None
    doctorName: Optional[str] = None
    date: Optional[str] = None
    materials: Optional[List[dict]] = None
    status: str = "pending"

class EReceiptUpdate(BaseModel):
    materials: Optional[List[dict]] = None
    status: Optional[str] = None
    doctorName: Optional[str] = None

from services.party_service import PartyService

# --- Patient Devices ---

@router.get("/parties/{party_id}/devices", operation_id="listPartyDevices", response_model=ResponseEnvelope[List[DeviceAssignmentRead]])
def get_party_devices(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all devices assigned to a specific party"""
    try:
        service = PartyService(db)
        
        # Get devices
        devices = service.list_device_assignments(party_id, access.tenant_id)
        
        # Get party for meta info
        party = service.get_party(party_id, access.tenant_id)
        
        return ResponseEnvelope(
            data=devices,
            meta={
                'partyId': party_id,
                'partyName': f"{party.first_name} {party.last_name}",
                'deviceCount': len(devices)
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting patient devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# --- Hearing Tests ---

@router.get(
    "/parties/{party_id}/hearing-tests",
    operation_id="listPartyHearingTests",
    response_model=ResponseEnvelope,
)
def list_party_hearing_tests(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get all hearing tests for a party, ordered by test_date desc."""
    from core.models.medical import HearingTest
    import json as json_mod

    try:
        tests = (
            db.query(HearingTest)
            .filter(
                HearingTest.party_id == party_id,
                HearingTest.tenant_id == access.tenant_id,
            )
            .order_by(HearingTest.test_date.desc())
            .all()
        )

        result = []
        for t in tests:
            audiogram_data = {}
            if t.results:
                try:
                    audiogram_data = json_mod.loads(t.results) if isinstance(t.results, str) else t.results
                except (json_mod.JSONDecodeError, TypeError):
                    audiogram_data = {}

            result.append({
                "id": t.id,
                "partyId": t.party_id,
                "testDate": t.test_date.isoformat() if t.test_date else None,
                "testType": t.test_type,
                "conductedBy": t.conducted_by,
                "results": audiogram_data,
                "notes": t.notes,
            })

        return ResponseEnvelope(
            data=result,
            meta={"total": len(result), "partyId": party_id},
        )
    except Exception as e:
        logger.error(f"Error listing hearing tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/parties/{party_id}/hearing-tests/{test_id}",
    operation_id="getPartyHearingTest",
    response_model=ResponseEnvelope,
)
def get_party_hearing_test(
    party_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get a single hearing test by id."""
    from core.models.medical import HearingTest
    import json as json_mod

    test = (
        db.query(HearingTest)
        .filter(
            HearingTest.id == test_id,
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == access.tenant_id,
        )
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Hearing test not found")

    audiogram_data = {}
    if test.results:
        try:
            audiogram_data = json_mod.loads(test.results) if isinstance(test.results, str) else test.results
        except (json_mod.JSONDecodeError, TypeError):
            audiogram_data = {}

    return ResponseEnvelope(
        data={
            "id": test.id,
            "partyId": test.party_id,
            "testDate": test.test_date.isoformat() if test.test_date else None,
            "testType": test.test_type,
            "conductedBy": test.conducted_by,
            "results": audiogram_data,
            "notes": test.notes,
        },
    )


class HearingTestCreate(BaseModel):
    testDate: Optional[str] = None
    testType: str = "audiometry"
    conductedBy: Optional[str] = None
    results: Optional[dict] = None
    notes: Optional[str] = None


@router.post(
    "/parties/{party_id}/hearing-tests",
    operation_id="createPartyHearingTest",
    status_code=201,
    response_model=ResponseEnvelope,
)
def create_party_hearing_test(
    party_id: str,
    body: HearingTestCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Create a new hearing test for a party."""
    from core.models.medical import HearingTest
    from core.models.party import Party
    import json as json_mod
    import uuid

    party = (
        db.query(Party)
        .filter(Party.id == party_id, Party.tenant_id == access.tenant_id)
        .first()
    )
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    test_date = datetime.now(timezone.utc)
    if body.testDate:
        try:
            test_date = datetime.fromisoformat(body.testDate.replace("Z", "+00:00"))
        except ValueError:
            pass

    test_id = f"test-{uuid.uuid4().hex[:12]}"

    hearing_test = HearingTest(
        id=test_id,
        party_id=party_id,
        tenant_id=access.tenant_id,
        test_date=test_date,
        test_type=body.testType,
        conducted_by=body.conductedBy or access.user_id,
        results=json_mod.dumps(body.results) if body.results else None,
        notes=body.notes,
    )
    db.add(hearing_test)

    activity = ActivityLog(
        id=str(uuid.uuid4()),
        tenant_id=access.tenant_id,
        user_id=access.user_id,
        action='hearing_test_created',
        entity_type='party',
        entity_id=party_id,
        details=json.dumps({"title": "İşitme testi eklendi"}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(activity)

    db.commit()
    db.refresh(hearing_test)

    result_data = {}
    if hearing_test.results:
        try:
            result_data = json_mod.loads(hearing_test.results) if isinstance(hearing_test.results, str) else hearing_test.results
        except (json_mod.JSONDecodeError, TypeError):
            result_data = {}

    return ResponseEnvelope(
        data={
            "id": hearing_test.id,
            "partyId": hearing_test.party_id,
            "testDate": hearing_test.test_date.isoformat() if hearing_test.test_date else None,
            "testType": hearing_test.test_type,
            "conductedBy": hearing_test.conducted_by,
            "results": result_data,
            "notes": hearing_test.notes,
        },
    )


class HearingTestUpdate(BaseModel):
    testDate: Optional[str] = None
    testType: Optional[str] = None
    conductedBy: Optional[str] = None
    results: Optional[dict] = None
    notes: Optional[str] = None


@router.put(
    "/parties/{party_id}/hearing-tests/{test_id}",
    operation_id="updatePartyHearingTest",
    response_model=ResponseEnvelope,
)
def update_party_hearing_test(
    party_id: str,
    test_id: str,
    body: HearingTestUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Update a hearing test."""
    from core.models.medical import HearingTest
    import json as json_mod

    test = (
        db.query(HearingTest)
        .filter(
            HearingTest.id == test_id,
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == access.tenant_id,
        )
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Hearing test not found")

    if body.testDate is not None:
        try:
            test.test_date = datetime.fromisoformat(body.testDate.replace("Z", "+00:00"))
        except ValueError:
            pass
    if body.testType is not None:
        test.test_type = body.testType
    if body.conductedBy is not None:
        test.conducted_by = body.conductedBy
    if body.results is not None:
        test.results = json_mod.dumps(body.results)
    if body.notes is not None:
        test.notes = body.notes

    db.commit()
    db.refresh(test)

    result_data = {}
    if test.results:
        try:
            result_data = json_mod.loads(test.results) if isinstance(test.results, str) else test.results
        except (json_mod.JSONDecodeError, TypeError):
            result_data = {}

    return ResponseEnvelope(
        data={
            "id": test.id,
            "partyId": test.party_id,
            "testDate": test.test_date.isoformat() if test.test_date else None,
            "testType": test.test_type,
            "conductedBy": test.conducted_by,
            "results": result_data,
            "notes": test.notes,
        },
    )


@router.delete(
    "/parties/{party_id}/hearing-tests/{test_id}",
    operation_id="deletePartyHearingTest",
    response_model=ResponseEnvelope,
)
def delete_party_hearing_test(
    party_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Delete a hearing test."""
    from core.models.medical import HearingTest

    test = (
        db.query(HearingTest)
        .filter(
            HearingTest.id == test_id,
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == access.tenant_id,
        )
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Hearing test not found")

    db.delete(test)
    db.commit()

    return ResponseEnvelope(data={"deleted": True, "id": test_id})


# --- E-Receipt CRUD ---

@router.get(
    "/parties/{party_id}/ereceipts",
    operation_id="listPartyEReceipts",
    response_model=ResponseEnvelope,
)
def list_party_ereceipts(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get all e-receipts for a party."""
    from core.models.medical import EReceipt

    receipts = (
        db.query(EReceipt)
        .filter(
            EReceipt.party_id == party_id,
            EReceipt.tenant_id == access.tenant_id,
        )
        .order_by(EReceipt.receipt_date.desc())
        .all()
    )

    return ResponseEnvelope(
        data=[r.to_dict() for r in receipts],  # legacy
        meta={"total": len(receipts), "partyId": party_id},
    )


@router.post(
    "/parties/{party_id}/ereceipts",
    operation_id="createPartyEReceipt",
    status_code=201,
    response_model=ResponseEnvelope,
)
def create_party_ereceipt(
    party_id: str,
    body: EReceiptCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Create a new e-receipt for a party."""
    from core.models.medical import EReceipt
    from core.models.party import Party
    import json as json_mod
    import uuid as uuid_mod

    party = (
        db.query(Party)
        .filter(Party.id == party_id, Party.tenant_id == access.tenant_id)
        .first()
    )
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    receipt_date = datetime.now(timezone.utc)
    if body.date:
        try:
            receipt_date = datetime.fromisoformat(body.date.replace("Z", "+00:00"))
        except ValueError:
            pass

    receipt_number = body.number or f"ER-{uuid_mod.uuid4().hex[:8].upper()}"

    ereceipt = EReceipt(
        party_id=party_id,
        tenant_id=access.tenant_id,
        receipt_number=receipt_number,
        receipt_date=receipt_date,
        doctor_name=body.doctorName,
        materials=json_mod.dumps(body.materials) if body.materials else None,
        status=body.status,
    )
    db.add(ereceipt)
    db.commit()
    db.refresh(ereceipt)

    return ResponseEnvelope(data=ereceipt.to_dict())  # legacy


# --- Device Recommendation Engine ---

HEARING_LOSS_LEVELS = [
    {"min": -10, "max": 25, "label": "Normal", "labelTr": "Normal"},
    {"min": 26, "max": 40, "label": "Mild", "labelTr": "Hafif"},
    {"min": 41, "max": 55, "label": "Moderate", "labelTr": "Orta"},
    {"min": 56, "max": 70, "label": "Moderately Severe", "labelTr": "Orta-Ileri"},
    {"min": 71, "max": 90, "label": "Severe", "labelTr": "Ileri"},
    {"min": 91, "max": 120, "label": "Profound", "labelTr": "Cok Ileri"},
]

# ASHA/AAA clinical guidelines: device type suitability per loss level
# max_pta = absolute maximum PTA for this style
# recommended_max = PTA up to which this style is the BEST choice
STYLE_SUITABILITY = {
    "IIC": {"max_pta": 50, "recommended_max": 40, "label": "Kanala Gorunmez"},
    "CIC": {"max_pta": 55, "recommended_max": 50, "label": "Kanal Ici (CIC)"},
    "ITC": {"max_pta": 65, "recommended_max": 55, "label": "Kanal Ici (ITC)"},
    "ITE": {"max_pta": 80, "recommended_max": 70, "label": "Kulak Ici (ITE)"},
    "RIC": {"max_pta": 95, "recommended_max": 80, "label": "Alicili Kanal Ici (RIC)"},
    "BTE": {"max_pta": 120, "recommended_max": 120, "label": "Kulak Arkasi (BTE)"},
}

# Earmold/dome and vent recommendations per hearing loss level
# Based on ASHA, AAA, Audiology Online, Hearing Review best practices
COUPLING_RECOMMENDATIONS = {
    "Normal": {
        "domes": [
            {"type": "open", "labelTr": "Acik Kubbe (Open Dome)", "priority": 1},
        ],
        "earmold": None,
        "vent": {"sizeMm": ">=2", "labelTr": "Acik (Open)", "description": "Acik fitting"},
        "notes": "Normal isitme icin amplifikasyon gerekmez.",
    },
    "Mild": {
        "domes": [
            {"type": "open", "labelTr": "Acik Kubbe (Open Dome)", "priority": 1},
            {"type": "vented", "labelTr": "Ventilli Kubbe (Vented Dome)", "priority": 2},
        ],
        "earmold": {"type": "skeleton", "labelTr": "Iskelet Kalip (opsiyonel)"},
        "vent": {"sizeMm": ">=2", "labelTr": "Buyuk (>=2mm)", "description": "Acik veya buyuk vent"},
        "notes": (
            "Acik kubbe okluzyon etkisini azaltir ve dogal ses kalitesi saglar. "
            "Dusuk frekans isitmesi iyi olan hastalar icin idealdir. "
            "Yuksek frekans egimli kayiplarda acik fitting birinci tercih."
        ),
    },
    "Moderate": {
        "domes": [
            {"type": "closed", "labelTr": "Kapali Kubbe (Closed Dome)", "priority": 1},
            {"type": "power", "labelTr": "Cift Kubbe (Power Dome)", "priority": 2},
        ],
        "earmold": {"type": "canal", "labelTr": "Kanal Kalip veya Yari-Kapali Kalip"},
        "vent": {"sizeMm": "1-2", "labelTr": "Orta (1-2mm)", "description": "Orta boy vent"},
        "notes": (
            "Feedback kontrolu icin daha kapali fitting gerekir. "
            "Dusuk frekans kazanci arttigindan kapali kubbe veya kucuk ventli kalip onerilir. "
            "Duz kayip profilinde ozel kalip tercih edilmeli."
        ),
    },
    "Moderately Severe": {
        "domes": [
            {"type": "power", "labelTr": "Cift Kubbe (Power Dome)", "priority": 1},
            {"type": "closed", "labelTr": "Kapali Kubbe (Closed Dome)", "priority": 2},
        ],
        "earmold": {"type": "canal_or_full", "labelTr": "Kanal veya Tam Kalip (yumusak silikon)"},
        "vent": {"sizeMm": "0.8-1", "labelTr": "Kucuk (0.8-1mm)", "description": "Kucuk vent"},
        "notes": (
            "Yuksek kazanc icin iyi sizdimazlik gerekir. "
            "Ozel kalip feedback'i onler ve daha iyi amplifikasyon saglar. "
            "Kubbe ile yeterli kazanc saglanamiyorsa ozel kalip zorunlu."
        ),
    },
    "Severe": {
        "domes": [],
        "earmold": {"type": "full_shell", "labelTr": "Tam Kalip (yumusak silikon veya akrilik)"},
        "vent": {"sizeMm": "<0.8", "labelTr": "Cok Kucuk (<0.8mm) veya Yok", "description": "Minimal vent veya ventsiz"},
        "notes": (
            "Ozel kalip zorunludur — kubbe ile yeterli kazanc ve feedback kontrolu saglanamaz. "
            "Yumusak silikon kalip konfor ve sizdimazlik dengesi saglar. "
            "Vent en aza indirilmeli veya kaldirilmalidir."
        ),
    },
    "Profound": {
        "domes": [],
        "earmold": {"type": "full_shell_sealed", "labelTr": "Tam Kapali Kalip (yumusak silikon)"},
        "vent": {"sizeMm": "0", "labelTr": "Yok (Ventsiz)", "description": "Vent yok"},
        "notes": (
            "Tam kapali ozel kalip zorunludur. "
            "Vent olmamali — maksimum amplifikasyon ve feedback kontrolu icin. "
            "BTE cihaz ile tam kalip standart uygulamadir."
        ),
    },
}


def _classify_loss(pta: float) -> dict:
    for level in HEARING_LOSS_LEVELS:
        if pta <= level["max"]:
            return level
    return HEARING_LOSS_LEVELS[-1]


def _suitable_styles(pta: float) -> list[dict]:
    """Return device styles with suitability level (recommended/suitable)."""
    result = []
    for s, info in STYLE_SUITABILITY.items():
        if pta <= info["max_pta"]:
            level = "recommended" if pta <= info["recommended_max"] else "suitable"
            result.append({
                "type": s,
                "label": info["label"],
                "suitability": level,
                "suitabilityTr": "Onerilen" if level == "recommended" else "Uygun",
            })
    return result


def _detect_audiogram_config(ear_data: dict) -> dict:
    """Detect audiogram configuration: flat, sloping, reverse, or other."""
    if not ear_data:
        return {"config": "unknown", "configTr": "Belirsiz", "slopeDb": 0}

    low_freqs = ["250", "500"]
    high_freqs = ["2000", "4000"]

    low_vals = [ear_data.get(f) for f in low_freqs]
    low_vals = [v for v in low_vals if v is not None and isinstance(v, (int, float))]
    high_vals = [ear_data.get(f) for f in high_freqs]
    high_vals = [v for v in high_vals if v is not None and isinstance(v, (int, float))]

    if not low_vals or not high_vals:
        return {"config": "unknown", "configTr": "Belirsiz", "slopeDb": 0}

    low_avg = sum(low_vals) / len(low_vals)
    high_avg = sum(high_vals) / len(high_vals)
    slope = round(high_avg - low_avg)

    if slope >= 20:
        return {"config": "sloping", "configTr": "Egimli (Yuksek Frekans)", "slopeDb": slope}
    elif slope >= 10:
        return {"config": "mild_sloping", "configTr": "Hafif Egimli", "slopeDb": slope}
    elif slope <= -20:
        return {"config": "reverse", "configTr": "Ters Egimli (Dusuk Frekans)", "slopeDb": slope}
    elif slope <= -10:
        return {"config": "mild_reverse", "configTr": "Hafif Ters Egimli", "slopeDb": slope}
    else:
        return {"config": "flat", "configTr": "Duz", "slopeDb": slope}


def _get_coupling_recommendation(loss_level_label: str, audiogram_config: str) -> dict:
    """Get dome/earmold/vent recommendation based on loss level and audiogram config."""
    coupling = COUPLING_RECOMMENDATIONS.get(loss_level_label, COUPLING_RECOMMENDATIONS["Moderate"])
    result = {**coupling}

    # Adjust recommendations based on audiogram configuration
    config_note = ""
    if audiogram_config in ("sloping", "mild_sloping"):
        if loss_level_label in ("Mild", "Moderate"):
            config_note = (
                "Egimli kayip profili: Dusuk frekans isitmesi iyi oldugu icin "
                "acik veya ventilli kubbe ile dogal ses kalitesi korunabilir."
            )
            # For sloping loss, open domes can work at slightly higher PTA
            if loss_level_label == "Moderate":
                result["domes"] = [
                    {"type": "vented", "labelTr": "Ventilli Kubbe (Vented Dome)", "priority": 1},
                    {"type": "closed", "labelTr": "Kapali Kubbe (Closed Dome)", "priority": 2},
                ]
                result["vent"] = {"sizeMm": "1.5-2", "labelTr": "Orta-Buyuk (1.5-2mm)", "description": "Daha genis vent mumkun"}

    elif audiogram_config == "flat":
        if loss_level_label in ("Mild", "Moderate"):
            config_note = (
                "Duz kayip profili: Tum frekanslarda kazanc gerektigindan "
                "daha kapali fitting ve ozel kalip onerilir."
            )
            if loss_level_label == "Mild":
                result["domes"] = [
                    {"type": "vented", "labelTr": "Ventilli Kubbe (Vented Dome)", "priority": 1},
                    {"type": "closed", "labelTr": "Kapali Kubbe (Closed Dome)", "priority": 2},
                ]
                result["vent"] = {"sizeMm": "1-2", "labelTr": "Orta (1-2mm)", "description": "Acik kubbe yetersiz kalabilir"}

    elif audiogram_config in ("reverse", "mild_reverse"):
        config_note = (
            "Ters egimli kayip: Dusuk frekanslarda daha fazla kazanc gerektigi icin "
            "kapali fitting zorunludur. Acik kubbe kesinlikle uygun degildir."
        )
        result["domes"] = [d for d in result.get("domes", []) if d["type"] not in ("open", "vented")]
        if not result["domes"]:
            result["domes"] = [
                {"type": "closed", "labelTr": "Kapali Kubbe (Closed Dome)", "priority": 1},
                {"type": "power", "labelTr": "Cift Kubbe (Power Dome)", "priority": 2},
            ]
        result["vent"] = {"sizeMm": "<1", "labelTr": "Kucuk (<1mm)", "description": "Dusuk frekans kazanci icin kapali fitting"}

    if config_note:
        result["configNote"] = config_note

    return result


@router.get(
    "/parties/{party_id}/hearing-tests/{test_id}/recommendations",
    operation_id="getDeviceRecommendations",
    response_model=ResponseEnvelope,
)
def get_device_recommendations(
    party_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Recommend hearing aids from inventory based on audiogram PTA and clinical guidelines."""
    from core.models.medical import HearingTest
    from core.models.inventory import InventoryItem
    import json as json_mod

    test = (
        db.query(HearingTest)
        .filter(
            HearingTest.id == test_id,
            HearingTest.party_id == party_id,
            HearingTest.tenant_id == access.tenant_id,
        )
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Hearing test not found")

    results = {}
    if test.results:
        try:
            results = json_mod.loads(test.results) if isinstance(test.results, str) else test.results
        except (json_mod.JSONDecodeError, TypeError):
            results = {}

    # Calculate PTA for each ear (500, 1000, 2000, 4000 Hz)
    pta_freqs = ["500", "1000", "2000", "4000"]

    def calc_pta(ear_data: dict) -> float | None:
        if not ear_data:
            return None
        vals = [ear_data.get(f) for f in pta_freqs]
        vals = [v for v in vals if v is not None and isinstance(v, (int, float))]
        return round(sum(vals) / len(vals)) if len(vals) >= 3 else None

    right_pta = calc_pta(results.get("rightEar", {}))
    left_pta = calc_pta(results.get("leftEar", {}))

    if right_pta is None and left_pta is None:
        return ResponseEnvelope(
            data={"message": "Yeterli odyogram verisi yok", "recommendations": []},
        )

    # Use the worse ear for recommendation (ensures device covers both)
    worse_pta = max(p for p in [right_pta, left_pta] if p is not None)
    better_pta = min(p for p in [right_pta, left_pta] if p is not None)

    loss_level = _classify_loss(worse_pta)
    suitable = _suitable_styles(worse_pta)

    # Detect audiogram configuration from worse ear
    worse_ear_data = results.get("rightEar", {}) if worse_pta == right_pta else results.get("leftEar", {})
    audiogram_config = _detect_audiogram_config(worse_ear_data)

    # Get coupling (dome/earmold/vent) recommendations
    coupling = _get_coupling_recommendation(loss_level["label"], audiogram_config["config"])

    # Query inventory for in-stock hearing aids with fitting range
    inventory_items = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.tenant_id == access.tenant_id,
            InventoryItem.category == "hearing_aid",
            InventoryItem.available_inventory > 0,
        )
        .all()
    )

    recommendations = []
    for item in inventory_items:
        device_type = (item.device_type or "").upper() if hasattr(item, "device_type") else ""
        # Normalize device type from model/name if not set
        if not device_type:
            name_upper = (item.name or "").upper()
            for style in ["BTE", "RIC", "ITE", "ITC", "CIC", "IIC"]:
                if style in name_upper:
                    device_type = style
                    break

        # Suitable style types for this PTA
        suitable_types = [s["type"] for s in suitable]

        # Check fitting range if available
        has_fitting_range = (
            hasattr(item, "fitting_range_min")
            and hasattr(item, "fitting_range_max")
            and item.fitting_range_min is not None
            and item.fitting_range_max is not None
        )

        if has_fitting_range:
            if worse_pta < item.fitting_range_min or worse_pta > item.fitting_range_max:
                continue
            match_quality = "exact"
        elif device_type in suitable_types:
            match_quality = "style"
        else:
            continue

        # Determine suitability level for this device type
        style_info = next((s for s in suitable if s["type"] == device_type), None)
        suitability = style_info["suitability"] if style_info else "suitable"

        recommendations.append({
            "inventoryId": item.id,
            "name": item.name,
            "brand": item.brand,
            "model": item.model,
            "deviceType": device_type,
            "deviceTypeLabel": STYLE_SUITABILITY.get(device_type, {}).get("label", device_type),
            "maxOutputSpl": getattr(item, "max_output_spl", None),
            "maxGain": getattr(item, "max_gain", None),
            "fittingRangeMin": getattr(item, "fitting_range_min", None),
            "fittingRangeMax": getattr(item, "fitting_range_max", None),
            "price": float(item.price) if item.price else None,
            "availableStock": item.available_inventory,
            "matchQuality": match_quality,
            "suitability": suitability,
            "suitabilityTr": "Onerilen" if suitability == "recommended" else "Uygun",
        })

    # Sort: recommended first, then exact match, then by stock
    recommendations.sort(key=lambda r: (
        0 if r["suitability"] == "recommended" else 1,
        0 if r["matchQuality"] == "exact" else 1,
        -(r["availableStock"] or 0),
    ))

    return ResponseEnvelope(
        data={
            "rightPta": right_pta,
            "leftPta": left_pta,
            "worsePta": worse_pta,
            "betterPta": better_pta,
            "lossLevel": loss_level,
            "audiogramConfig": audiogram_config,
            "suitableStyles": suitable,
            "coupling": coupling,
            "recommendations": recommendations,
            "totalInStock": len(recommendations),
            "guidelines": (
                "ASHA/AAA klinik rehberlerine gore: "
                f"{loss_level['labelTr']} isitme kaybi ({worse_pta} dB PTA) icin "
                f"onerilen cihaz tipleri: "
                f"{', '.join(s['label'] for s in suitable if s['suitability'] == 'recommended')}"
                f"{' | Uygun: ' + ', '.join(s['label'] for s in suitable if s['suitability'] == 'suitable') if any(s['suitability'] == 'suitable' for s in suitable) else ''}."
            ),
        },
    )


# --- NAL-NL2 REM Verification ---

# NAL-NL2 simplified frequency-dependent factors (Ff)
NAL_NL2_FREQ_FACTORS = {
    250: 0.70,
    500: 0.75,
    1000: 0.80,
    1500: 0.80,
    2000: 0.80,
    3000: 0.78,
    4000: 0.75,
    6000: 0.65,
    8000: 0.60,
}

# Standard input level for conversational speech
DEFAULT_INPUT_LEVEL = 65  # dB SPL


def _calc_nal_nl2_targets(
    thresholds: dict[str, float],
    input_level: int = DEFAULT_INPUT_LEVEL,
    experienced: bool = True,
) -> dict[str, dict]:
    """
    Calculate NAL-NL2 prescriptive targets from audiogram thresholds.
    Returns target insertion gain (REIG) and target aided response (REAR) per frequency.
    """
    targets = {}
    # Experience factor: new users get ~3 dB less gain
    exp_factor = 1.0 if experienced else 0.90

    for freq_str, ht in thresholds.items():
        try:
            freq = int(freq_str)
            ht_val = float(ht)
        except (ValueError, TypeError):
            continue

        if ht_val <= 0:
            continue

        ff = NAL_NL2_FREQ_FACTORS.get(freq, 0.75)

        # NAL-NL2 simplified: Target Gain = HT × 0.46 × Ff × experience
        target_gain = round(ht_val * 0.46 * ff * exp_factor, 1)

        # Target REAR = input level + target gain
        target_rear = round(input_level + target_gain, 1)

        targets[str(freq)] = {
            "targetGain": target_gain,
            "targetRear": target_rear,
            "hearingThreshold": ht_val,
            "frequencyFactor": ff,
        }

    return targets


@router.get(
    "/parties/{party_id}/hearing-tests/{test_id}/rem-targets",
    operation_id="getRemTargets",
    response_model=ResponseEnvelope,
)
def get_rem_targets(
    party_id: str,
    test_id: str,
    ear: str = "both",
    input_level: int = DEFAULT_INPUT_LEVEL,
    experienced: bool = True,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Calculate NAL-NL2 prescriptive targets from audiogram for REM verification."""
    from core.models.medical import HearingTest

    test = db.query(HearingTest).filter(
        HearingTest.id == test_id,
        HearingTest.party_id == party_id,
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Isitme testi bulunamadi")

    results = test.results_json or {}
    right_ear = results.get("rightEar", {})
    left_ear = results.get("leftEar", {})

    response_data = {
        "inputLevel": input_level,
        "experienced": experienced,
        "formula": "NAL-NL2",
    }

    if ear in ("both", "right") and right_ear:
        response_data["rightTargets"] = _calc_nal_nl2_targets(
            right_ear, input_level, experienced
        )
    if ear in ("both", "left") and left_ear:
        response_data["leftTargets"] = _calc_nal_nl2_targets(
            left_ear, input_level, experienced
        )

    return ResponseEnvelope(data=response_data)


@router.post(
    "/parties/{party_id}/hearing-tests/{test_id}/rem",
    operation_id="saveRemMeasurement",
    response_model=ResponseEnvelope,
)
async def save_rem_measurement(
    party_id: str,
    test_id: str,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """
    Save Real Ear Measurement (REM) data for a hearing test.
    Stores REAR measurements and compares against NAL-NL2 targets.
    """
    import json as json_mod
    from core.models.medical import HearingTest

    test = db.query(HearingTest).filter(
        HearingTest.id == test_id,
        HearingTest.party_id == party_id,
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Isitme testi bulunamadi")

    body = await request.json()
    rem_data = body.get("rem", {})
    if not rem_data:
        raise HTTPException(status_code=400, detail="REM verisi gerekli")

    # Validate structure
    for ear_key in ("right", "left"):
        ear_rem = rem_data.get(ear_key)
        if ear_rem and "rear" not in ear_rem:
            raise HTTPException(
                status_code=400,
                detail=f"'{ear_key}' icin 'rear' olcumleri gerekli",
            )

    results = test.results_json or {}

    # Calculate targets from audiogram
    input_level = rem_data.get("inputLevel", DEFAULT_INPUT_LEVEL)
    experienced = rem_data.get("experienced", True)

    verification = {}
    for ear_key, threshold_key in [("right", "rightEar"), ("left", "leftEar")]:
        ear_rem = rem_data.get(ear_key)
        if not ear_rem:
            continue

        thresholds = results.get(threshold_key, {})
        if not thresholds:
            continue

        targets = _calc_nal_nl2_targets(thresholds, input_level, experienced)
        rear_measured = ear_rem.get("rear", {})

        freq_results = {}
        pass_count = 0
        total_count = 0
        for freq_str, target_data in targets.items():
            measured = rear_measured.get(freq_str)
            if measured is not None:
                try:
                    measured_val = float(measured)
                except (ValueError, TypeError):
                    continue
                deviation = round(measured_val - target_data["targetRear"], 1)
                passed = abs(deviation) <= 5.0  # ±5 dB tolerance
                freq_results[freq_str] = {
                    "target": target_data["targetRear"],
                    "measured": measured_val,
                    "deviation": deviation,
                    "pass": passed,
                }
                total_count += 1
                if passed:
                    pass_count += 1

        verification[ear_key] = {
            "frequencies": freq_results,
            "passCount": pass_count,
            "totalCount": total_count,
            "overallPass": pass_count == total_count if total_count > 0 else False,
            "passRate": round(pass_count / total_count * 100, 1) if total_count > 0 else 0,
        }

    # Store REM in the test results JSON
    from datetime import datetime
    results["rem"] = {
        "right": rem_data.get("right"),
        "left": rem_data.get("left"),
        "inputLevel": input_level,
        "experienced": experienced,
        "equipment": rem_data.get("equipment"),
        "measuredAt": rem_data.get("measuredAt", datetime.utcnow().isoformat()),
        "verification": verification,
    }

    test.results = json_mod.dumps(results)

    activity = ActivityLog(
        id=str(uuid.uuid4()),
        tenant_id=access.tenant_id,
        user_id=access.user_id,
        action='rem_saved',
        entity_type='party',
        entity_id=party_id,
        details=json.dumps({"title": "REM ölçümü kaydedildi", "test_id": test_id}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(activity)

    db.commit()

    return ResponseEnvelope(
        data={
            "message": "REM olcumu kaydedildi",
            "verification": verification,
            "rem": results["rem"],
        }
    )


@router.get(
    "/parties/{party_id}/hearing-tests/{test_id}/rem",
    operation_id="getRemMeasurement",
    response_model=ResponseEnvelope,
)
def get_rem_measurement(
    party_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get stored REM measurement and verification results for a hearing test."""
    from core.models.medical import HearingTest

    test = db.query(HearingTest).filter(
        HearingTest.id == test_id,
        HearingTest.party_id == party_id,
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Isitme testi bulunamadi")

    results = test.results_json or {}
    rem = results.get("rem")
    if not rem:
        return ResponseEnvelope(data=None)

    return ResponseEnvelope(data=rem)


# --- Party Notes ---

@router.get("/parties/{party_id}/notes", operation_id="listPartyNotes", response_model=ResponseEnvelope[List[PartyNoteRead]])
def get_party_notes(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all notes for a party"""
    try:
        service = PartyService(db)
        notes = service.list_notes(party_id, access.tenant_id)
        
        # Convert to Pydantic schemas
        data = [PartyNoteRead.model_validate(note) for note in notes]
        
        return ResponseEnvelope(
            data=data,
            meta={'total': len(data)}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting party notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/notes", operation_id="createPartyNotes", status_code=201, response_model=ResponseEnvelope[PartyNoteRead])
def create_party_note(
    party_id: str,
    request_data: PatientNoteCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new note for party"""
    try:
        service = PartyService(db)
        data = request_data.model_dump()
        
        # Extract metadata
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('User-Agent', '')
        
        new_note = service.create_note(
            party_id=party_id,
            data=data,
            tenant_id=access.tenant_id,
            user_id=request_data.createdBy, # Preserving original behavior
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        activity = ActivityLog(
            id=str(uuid.uuid4()),
            tenant_id=access.tenant_id,
            user_id=access.user_id,
            action='note_created',
            entity_type='party',
            entity_id=party_id,
            details=json.dumps({"title": "Not eklendi"}),
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        return ResponseEnvelope(data=PartyNoteRead.model_validate(new_note))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/parties/{party_id}/notes/{note_id}", operation_id="updatePartyNote", response_model=ResponseEnvelope[PartyNoteRead])
def update_party_note(
    party_id: str,
    note_id: str,
    request_data: PatientNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a party note"""
    try:
        service = PartyService(db)
        data = request_data.model_dump(exclude_unset=True)
        updated_note = service.update_note(party_id, note_id, data, access.tenant_id)

        activity = ActivityLog(
            id=str(uuid.uuid4()),
            tenant_id=access.tenant_id,
            user_id=access.user_id,
            action='note_updated',
            entity_type='party',
            entity_id=party_id,
            details=json.dumps({"title": "Not güncellendi", "note_id": note_id}),
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        return ResponseEnvelope(data=PartyNoteRead.model_validate(updated_note))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}/notes/{note_id}", operation_id="deletePartyNote", response_model=ResponseEnvelope)
def delete_party_note(
    party_id: str,
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a party note"""
    try:
        service = PartyService(db)
        service.delete_note(party_id, note_id, access.tenant_id)

        activity = ActivityLog(
            id=str(uuid.uuid4()),
            tenant_id=access.tenant_id,
            user_id=access.user_id,
            action='note_deleted',
            entity_type='party',
            entity_id=party_id,
            details=json.dumps({"title": "Not silindi", "note_id": note_id}),
            created_at=datetime.now(timezone.utc),
        )
        db.add(activity)
        db.commit()

        return ResponseEnvelope(message='Note deleted successfully')
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# --- Party Sales (Flask parity) ---

@router.get("/parties/{party_id}/sales", operation_id="listPartySales", response_model=ResponseEnvelope[List[SaleRead]])
def get_party_sales(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all sales for a specific party - Flask parity with _build_full_sale_data"""
    try:
        from core.models.party import Party
        from models.sales import Sale
        # Import the helper function from sales router
        from routers.sales import _build_full_sale_data
        
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all sales for this party - Order by sale_date DESC, then by id DESC for same-day sales
        sales = db.query(Sale).filter_by(party_id=party_id).order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        
        # Use the same helper function as /api/sales/{sale_id} for consistency
        sales_data = []
        for sale in sales:
            try:
                sale_dict = _build_full_sale_data(db, sale)
                sales_data.append(sale_dict)
            except Exception as e:
                logger.warning(f"Error building sale data for {sale.id}: {e}")
                # Fallback to basic sale data
                sales_data.append({
                    'id': sale.id,
                    'partyId': sale.party_id,
                    'status': sale.status,
                    'totalAmount': float(sale.total_amount or 0),
                    'error': 'Failed to load full details'
                })
        
        return ResponseEnvelope(
            data=sales_data,
            meta={
                'partyId': party_id,
                'partyName': f"{party.first_name} {party.last_name}",
                'salesCount': len(sales_data)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting party sales: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Party Appointments ---

@router.get("/parties/{party_id}/appointments", operation_id="listPartyAppointments", response_model=ResponseEnvelope[List[AppointmentRead]])
def get_party_appointments(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all appointments for a specific party"""
    try:
        from core.models.party import Party
        from models.appointment import Appointment
        
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        appointments = db.query(Appointment).filter_by(
            party_id=party_id
        ).order_by(Appointment.date.desc()).all()
        
        return ResponseEnvelope(
            data=[AppointmentRead.model_validate(appt) for appt in appointments],
            meta={
                'total': len(appointments),
                'partyId': party_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# Anamnesis (Hasta Öyküsü) endpoints
# ──────────────────────────────────────────────────────────────────────

DEFAULT_ANAMNESIS_QUESTIONS = [
    {"id": "onset", "question": "Isitme kaybiniz ne zaman basladi?", "category": "isitme_kaybi", "type": "text"},
    {"id": "onset_type", "question": "Isitme kaybiniz ani mi yoksa yavas yavas mi oldu?", "category": "isitme_kaybi", "type": "select",
     "options": ["Ani", "Yavas yavas (ilerleyici)", "Bilmiyorum"]},
    {"id": "affected_ear", "question": "Hangi kulag(lar)inizda isitme kaybi var?", "category": "isitme_kaybi", "type": "select",
     "options": ["Sag kulak", "Sol kulak", "Her iki kulak"]},
    {"id": "family_history", "question": "Ailenizde isitme kaybi olan baska biri var mi?", "category": "oykü", "type": "select",
     "options": ["Evet", "Hayir", "Bilmiyorum"]},
    {"id": "tinnitus", "question": "Kulaklarinizda cinlama veya ugultu (tinnitus) var mi?", "category": "semptom", "type": "select",
     "options": ["Evet, surekli", "Evet, arada sirada", "Hayir"]},
    {"id": "vertigo", "question": "Bas donmesi veya denge probleminiz var mi?", "category": "semptom", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "ear_pain", "question": "Kulak agrisi veya basinci hissediyor musunuz?", "category": "semptom", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "ear_drainage", "question": "Kulaklarinizdan akiniti (sivi gelme) oluyor mu?", "category": "semptom", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "ear_surgery", "question": "Daha once kulak ameliyati gecirdiniz mi?", "category": "tibbi_gecmis", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "ear_infection", "question": "Sik kulak enfeksiyonu/iltihabi gecirdiniz mi?", "category": "tibbi_gecmis", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "noise_exposure", "question": "Gurultulu ortamda calisiyor veya calisdiniz mi?", "category": "risk_faktorleri", "type": "select",
     "options": ["Evet, halen", "Evet, eskiden", "Hayir"]},
    {"id": "ototoxic_meds", "question": "Ototoksik ilac kullandiniz mi? (aminoglikozid, sisplatin vb.)", "category": "tibbi_gecmis", "type": "select",
     "options": ["Evet", "Hayir", "Bilmiyorum"]},
    {"id": "previous_hearing_aid", "question": "Daha once isitme cihazi kullandiniz mi?", "category": "cihaz", "type": "select",
     "options": ["Evet", "Hayir"]},
    {"id": "hearing_difficulty_situations", "question": "Hangi durumlarda isitmekte zorluk cekiyorsunuz?", "category": "isitme_kaybi", "type": "multiselect",
     "options": ["Kalabalik ortamda", "Telefonla konusurken", "TV izlerken", "Toplantilarda", "Disarida/sokakta", "Fisiltili konusmalarda"]},
    {"id": "expectations", "question": "Isitme cihaziyla ilgili beklentileriniz nelerdir?", "category": "beklenti", "type": "text"},
]


class AnamnesisResponse(BaseModel):
    question_id: str
    answer: Optional[str] = None
    answers: Optional[List[str]] = None


class AnamnesisSavePayload(BaseModel):
    responses: List[AnamnesisResponse]
    custom_questions: Optional[List[dict]] = None


@router.get("/parties/{party_id}/anamnesis", operation_id="getPartyAnamnesis")
def get_party_anamnesis(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Get anamnesis data for a patient — uses tenant questions if configured, else defaults"""
    try:
        from core.models.party import Party

        patient = db.get(Party, party_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Party not found")
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")

        custom_data = patient.custom_data_json or {}
        anamnesis = custom_data.get("anamnesis", {})
        saved_responses = anamnesis.get("responses", [])

        response_map = {r.get("questionId"): r for r in saved_responses}

        # Check tenant-level question templates first
        question_templates = DEFAULT_ANAMNESIS_QUESTIONS
        try:
            settings_record = db.get(Settings, 'anamnesis_questions')
            if settings_record and settings_record.settings_data:
                sdata = json.loads(settings_record.settings_data) if isinstance(settings_record.settings_data, str) else settings_record.settings_data
                tenant_qs = sdata.get('questions', [])
                if len(tenant_qs) > 0:
                    question_templates = tenant_qs
        except Exception:
            pass

        questions_with_answers = []
        for q in question_templates:
            entry = {**q}
            saved = response_map.get(q["id"])
            if saved:
                entry["answer"] = saved.get("answer")
                entry["answers"] = saved.get("answers")
            questions_with_answers.append(entry)

        return ResponseEnvelope(data={
            "questions": questions_with_answers,
            "updatedAt": anamnesis.get("updatedAt"),
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting anamnesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/parties/{party_id}/anamnesis", operation_id="savePartyAnamnesis")
async def save_party_anamnesis(
    party_id: str,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Save anamnesis data for a patient"""
    try:
        from core.models.party import Party

        patient = db.get(Party, party_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Party not found")
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")

        body = await request.json()
        responses = body.get("responses", [])
        custom_questions = body.get("customQuestions", [])

        custom_data = patient.custom_data_json or {}
        custom_data["anamnesis"] = {
            "responses": responses,
            "customQuestions": custom_questions,
            "updatedAt": now_utc().isoformat(),
        }
        patient.custom_data_json = custom_data

        # Also log to ActivityLog for timeline
        try:
            from models.user import ActivityLog
            db.add(ActivityLog(
                user_id=access.user_id,
                action="anamnesis_update",
                entity_type="patient",
                entity_id=party_id,
                tenant_id=access.tenant_id,
                message=f"Anamnez guncellendi ({len(responses)} yanit)",
            ))
        except Exception:
            pass

        db.commit()

        return ResponseEnvelope(data={
            "message": "Anamnez kaydedildi",
            "updatedAt": custom_data["anamnesis"]["updatedAt"],
        })

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving anamnesis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
